package com.tripin.api.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tripin.api.support.DbSupport;
import com.tripin.api.support.JsonSupport;
import com.tripin.api.web.Requests.CreatePlaceRequest;
import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class PlacesService {
  private final DbSupport db;
  private final JsonSupport json;
  private final ObjectMapper objectMapper;
  private final HttpClient httpClient = HttpClient.newHttpClient();
  private final String amapKey;
  private final String stadiaKey;

  public PlacesService(
      DbSupport db,
      JsonSupport json,
      ObjectMapper objectMapper,
      @Value("${AMAP_WEB_SERVICE_KEY:}") String amapKey,
      @Value("${STADIA_MAPS_API_KEY:}") String stadiaKey) {
    this.db = db;
    this.json = json;
    this.objectMapper = objectMapper;
    this.amapKey = amapKey == null ? "" : amapKey.trim();
    this.stadiaKey = stadiaKey == null ? "" : stadiaKey.trim();
  }

  public Map<String, Object> upsert(CreatePlaceRequest request) {
    if (request == null || isBlank(request.name())) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "name is required");
    }

    String placeId = json.newId("place");
    String provider = defaultValue(request.provider(), "MANUAL");
    Map<String, Object> params = new LinkedHashMap<>();
    params.put("id", placeId);
    params.put("provider", provider);
    params.put("providerId", request.providerId());
    params.put("name", request.name());
    params.put("shortName", request.shortName());
    params.put("formattedAddress", request.formattedAddress());
    params.put("provinceName", request.provinceName());
    params.put("cityName", request.cityName());
    params.put("districtName", request.districtName());
    params.put("countryCode", defaultValue(request.countryCode(), "CN"));
    params.put("latitude", request.latitude());
    params.put("longitude", request.longitude());

    if (!isBlank(request.providerId())) {
      db.update(
          """
          insert into "Place" (
            id, provider, "providerId", name, "shortName", "formattedAddress", "provinceName",
            "cityName", "districtName", "countryCode", latitude, longitude
          )
          values (
            :id, cast(:provider as "PlaceProvider"), :providerId, :name, :shortName,
            :formattedAddress, :provinceName, :cityName, :districtName, :countryCode,
            :latitude, :longitude
          )
          on conflict (provider, "providerId") do update set
            name = excluded.name,
            "shortName" = excluded."shortName",
            "formattedAddress" = excluded."formattedAddress",
            "provinceName" = excluded."provinceName",
            "cityName" = excluded."cityName",
            "districtName" = excluded."districtName",
            "countryCode" = excluded."countryCode",
            latitude = excluded.latitude,
            longitude = excluded.longitude,
            "updatedAt" = now()
          """,
          params);

      Map<String, Object> row =
          db.first(
              """
              select id from "Place"
              where provider = cast(:provider as "PlaceProvider") and "providerId" = :providerId
              """,
              Map.of("provider", provider, "providerId", request.providerId()));
      return mapPlace(loadPlace(json.stringValue(row.get("id"))), "local");
    }

    db.update(
        """
        insert into "Place" (
          id, provider, name, "shortName", "formattedAddress", "provinceName",
          "cityName", "districtName", "countryCode", latitude, longitude
        )
        values (
          :id, cast(:provider as "PlaceProvider"), :name, :shortName, :formattedAddress,
          :provinceName, :cityName, :districtName, :countryCode, :latitude, :longitude
        )
        """,
        params);
    return mapPlace(loadPlace(placeId), "local");
  }

  public List<Map<String, Object>> search(
      String keyword, String cityName, Double latitude, Double longitude, Boolean cityLimit, Integer rawLimit) {
    if (isBlank(keyword)) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "keyword is required");
    }

    int limit = clamp(rawLimit, 10, 1, 20);
    List<Map<String, Object>> merged = new ArrayList<>();
    merged.addAll(searchAmap(keyword, cityName, latitude, longitude, cityLimit, limit, false));
    merged.addAll(searchLocal(keyword, cityName, limit));
    return dedupePlaces(merged, limit);
  }

  public List<Map<String, Object>> suggest(
      String keyword, String cityName, Double latitude, Double longitude, Boolean cityLimit, Integer rawLimit) {
    if (isBlank(keyword)) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "keyword is required");
    }

    int limit = clamp(rawLimit, 10, 1, 20);
    List<Map<String, Object>> merged = new ArrayList<>();
    merged.addAll(searchAmap(keyword, cityName, latitude, longitude, cityLimit, limit, true));
    merged.addAll(searchLocal(keyword, cityName, limit));
    return dedupePlaces(merged, limit);
  }

  public Map<String, Object> reverseGeocode(Double latitude, Double longitude, Integer rawRadius) {
    if (latitude == null || longitude == null) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "latitude and longitude are required");
    }

    if (amapKey.isBlank()) {
      Map<String, Object> response = new LinkedHashMap<>();
      response.put("amapConfigured", false);
      response.put("formattedAddress", null);
      response.put("recommendedPlace", null);
      response.put("nearbyPlaces", List.of());
      return response;
    }

    int radius = clamp(rawRadius, 500, 0, 3000);
    JsonNode payload =
        fetchAmapJson(
            "https://restapi.amap.com/v3/geocode/regeo?key="
                + encode(amapKey)
                + "&location="
                + encode(longitude + "," + latitude)
                + "&radius="
                + radius
                + "&extensions=all&output=JSON");

    JsonNode regeocode = payload.path("regeocode");
    JsonNode component = regeocode.path("addressComponent");
    List<Map<String, Object>> nearbyPlaces = new ArrayList<>();
    for (JsonNode poi : regeocode.path("pois")) {
      Map<String, Object> mapped = mapAmapPoi(poi, "amap");
      if (mapped != null) {
        nearbyPlaces.add(mapped);
      }
    }

    Map<String, Object> response = new LinkedHashMap<>();
    response.put("amapConfigured", true);
    response.put("formattedAddress", nullableText(regeocode.path("formatted_address")));
    response.put("provinceName", nullableText(component.path("province")));
    response.put("cityName", cityText(component.path("city")));
    response.put("districtName", nullableText(component.path("district")));
    response.put(
        "recommendedPlace",
        nearbyPlaces.isEmpty()
            ? buildRecommendedPlace(
                regeocode,
                component,
                nullableText(regeocode.path("formatted_address")),
                latitude,
                longitude)
            : normalizeRecommendedPlace(nearbyPlaces.getFirst(), nullableText(regeocode.path("formatted_address"))));
    response.put("nearbyPlaces", nearbyPlaces.stream().limit(8).toList());
    return response;
  }

  public Map<String, Object> providerStatus() {
    return Map.of("amapConfigured", !amapKey.isBlank());
  }

  /**
   * IP-based geolocation. Used as a fallback for clients without GMS
   * (FusedLocationProvider) so they at least get a city-level position.
   * AMap returns a bounding rectangle for the resolved city; we use its
   * center as the latitude/longitude.
   */
  public Map<String, Object> ipLocation(String clientIp) {
    Map<String, Object> result = new LinkedHashMap<>();
    result.put("amapConfigured", !amapKey.isBlank());
    result.put("ip", clientIp);
    result.put("latitude", null);
    result.put("longitude", null);
    result.put("provinceName", null);
    result.put("cityName", null);
    result.put("districtName", null);
    result.put("formattedAddress", null);
    result.put("source", "amap-ip");

    if (amapKey.isBlank()) {
      return result;
    }

    StringBuilder url = new StringBuilder("https://restapi.amap.com/v3/ip?key=").append(encode(amapKey));
    // Pass the client IP only when it's a public-looking address. Loopback /
    // private ranges trigger AMap's "non-China IP" code, so let AMap fall back
    // to its own auto-detect (usually returns the request's source IP).
    if (clientIp != null && !clientIp.isBlank() && !isPrivateIp(clientIp)) {
      url.append("&ip=").append(encode(clientIp));
    }

    JsonNode payload;
    try {
      payload = fetchAmapJson(url.toString());
    } catch (Exception ignore) {
      return result;
    }

    String province = textOrNull(payload.path("province"));
    String city = textOrNull(payload.path("city"));
    String adcode = textOrNull(payload.path("adcode"));
    String rectangle = textOrNull(payload.path("rectangle"));

    result.put("provinceName", province);
    result.put("cityName", city);
    if (adcode != null) {
      result.put("adcode", adcode);
    }

    if (rectangle != null) {
      // AMap rectangle = "lng1,lat1;lng2,lat2" — diagonal bounds. Center is the
      // midpoint, which is roughly the city/area center for instant-record use.
      String[] corners = rectangle.split(";");
      if (corners.length == 2) {
        try {
          String[] sw = corners[0].split(",");
          String[] ne = corners[1].split(",");
          double lng1 = Double.parseDouble(sw[0]);
          double lat1 = Double.parseDouble(sw[1]);
          double lng2 = Double.parseDouble(ne[0]);
          double lat2 = Double.parseDouble(ne[1]);
          result.put("latitude", (lat1 + lat2) / 2.0);
          result.put("longitude", (lng1 + lng2) / 2.0);
        } catch (NumberFormatException | ArrayIndexOutOfBoundsException ignore) {
          // Leave nulls.
        }
      }
    }

    if (province != null || city != null) {
      String formatted = (province == null ? "" : province) + (city == null || city.equals(province) ? "" : city);
      result.put("formattedAddress", formatted.isBlank() ? null : formatted);
    }

    return result;
  }

  private static String textOrNull(JsonNode node) {
    if (node == null || node.isMissingNode() || node.isNull()) return null;
    String text = node.asText();
    return text == null || text.isBlank() ? null : text;
  }

  private static boolean isPrivateIp(String ip) {
    if (ip == null) return true;
    String trimmed = ip.trim();
    if (trimmed.isEmpty()) return true;
    if (trimmed.equals("127.0.0.1") || trimmed.equalsIgnoreCase("::1") || trimmed.equalsIgnoreCase("localhost")) return true;
    if (trimmed.startsWith("10.")) return true;
    if (trimmed.startsWith("192.168.")) return true;
    // 172.16.0.0 – 172.31.255.255
    if (trimmed.startsWith("172.")) {
      String[] parts = trimmed.split("\\.");
      if (parts.length >= 2) {
        try {
          int second = Integer.parseInt(parts[1]);
          if (second >= 16 && second <= 31) return true;
        } catch (NumberFormatException ignore) {
          // fall through
        }
      }
    }
    return false;
  }

  public byte[] staticMap(String route, String focus, Integer rawWidth, Integer rawHeight, Boolean traffic) {
    return staticMap(route, focus, rawWidth, rawHeight, traffic, null, null, null, null, null, null);
  }

  public byte[] staticMap(
      String route,
      String focus,
      Integer rawWidth,
      Integer rawHeight,
      Boolean traffic,
      Double centerLng,
      Double centerLat,
      Integer zoom,
      Boolean hideMarkers,
      Boolean hidePaths,
      String provider) {
    int width = clamp(rawWidth, 720, 160, 1024);
    int height = clamp(rawHeight, 420, 160, 1024);

    if ("stadia".equalsIgnoreCase(provider)) {
      if (stadiaKey.isBlank()) {
        return "STADIA_MAPS_API_KEY is not configured yet.".getBytes(StandardCharsets.UTF_8);
      }
      double lng = centerLng != null ? centerLng : 116.397428;
      double lat = centerLat != null ? centerLat : 39.90923;
      int z = zoom != null ? clamp(zoom, 12, 3, 18) : 12;
      String stadiaUrl =
          "https://tiles.stadiamaps.com/static/stamen_watercolor.png"
              + "?center=" + lat + "," + lng
              + "&zoom=" + z
              + "&size=" + width + "x" + height
              + "&api_key=" + encode(stadiaKey);
      return fetchBinary(stadiaUrl);
    }

    if (amapKey.isBlank()) {
      return "AMAP_WEB_SERVICE_KEY is not configured yet.".getBytes(StandardCharsets.UTF_8);
    }
    StringBuilder url =
        new StringBuilder(
            "https://restapi.amap.com/v3/staticmap?key="
                + encode(amapKey)
                + "&size="
                + width
                + "*"
                + height
                + "&scale=2&traffic="
                + ((traffic != null && traffic) ? "1" : "0"));

    if (!isBlank(route)) {
      List<String> routePoints = List.of(route.split("\\|"));
      String encodedRoute = String.join(";", routePoints);
      if (!Boolean.TRUE.equals(hidePaths)) {
        url.append("&paths=").append(encode("8,0x11443f,0.95,,:".concat(encodedRoute)));
      }

      if (!Boolean.TRUE.equals(hideMarkers)) {
        List<String> markers = new ArrayList<>();
        String start = routePoints.getFirst();
        String end = routePoints.getLast();
        markers.add("large,0x173f39,S:" + start);
        if (routePoints.size() > 2) {
          markers.add("small,0x11443f,:" + String.join(";", routePoints.subList(1, routePoints.size() - 1)));
        }
        if (routePoints.size() > 1) {
          markers.add("large,0xD9B67D,E:" + end);
        }
        url.append("&markers=").append(encode(String.join("|", markers)));
      }

      if (centerLng != null && centerLat != null && zoom != null) {
        url.append("&location=").append(centerLng).append(",").append(centerLat);
        url.append("&zoom=").append(clamp(zoom, 12, 3, 18));
      }
    } else if (!isBlank(focus)) {
      url.append("&location=").append(encode(focus));
      url.append("&zoom=15");
      url.append("&markers=").append(encode("large,0x173f39,A:" + focus));
    } else {
      url.append("&location=116.397428,39.90923&zoom=11");
    }

    return fetchBinary(url.toString());
  }

  private List<Map<String, Object>> searchLocal(String keyword, String cityName, int limit) {
    Map<String, Object> params = new LinkedHashMap<>();
    params.put("keyword", keyword);
    params.put("limit", limit);
    StringBuilder sql =
        new StringBuilder(
            """
            select
              id,
              provider,
              "providerId" as provider_id,
              name,
              "shortName" as short_name,
              "formattedAddress" as formatted_address,
              "provinceName" as province_name,
              "cityName" as city_name,
              "districtName" as district_name,
              "countryCode" as country_code,
              latitude,
              longitude
            from "Place"
            where name ilike '%' || :keyword || '%'
            """);

    if (!isBlank(cityName)) {
      sql.append(" and \"cityName\" ilike :cityName");
      params.put("cityName", cityName);
    }

    sql.append(" order by \"updatedAt\" desc limit :limit");

    return db.list(sql.toString(), params).stream().map(row -> mapPlace(row, "local")).toList();
  }

  private List<Map<String, Object>> searchAmap(
      String keyword,
      String cityName,
      Double latitude,
      Double longitude,
      Boolean cityLimit,
      int limit,
      boolean suggest) {
    if (amapKey.isBlank()) {
      return List.of();
    }

    StringBuilder url = new StringBuilder();
    if (suggest) {
      url.append("https://restapi.amap.com/v3/assistant/inputtips?key=").append(encode(amapKey));
      url.append("&keywords=").append(encode(keyword));
      url.append("&datatype=poi&output=JSON");
    } else {
      url.append("https://restapi.amap.com/v3/place/text?key=").append(encode(amapKey));
      url.append("&keywords=").append(encode(keyword));
      url.append("&offset=").append(limit).append("&page=1&extensions=base&output=JSON");
    }

    if (!isBlank(cityName)) {
      url.append("&city=").append(encode(cityName));
    }
    if (cityLimit != null && cityLimit) {
      url.append("&citylimit=true");
    }
    if (suggest && latitude != null && longitude != null) {
      url.append("&location=").append(encode(longitude + "," + latitude));
    }

    JsonNode payload = fetchAmapJson(url.toString());
    List<Map<String, Object>> results = new ArrayList<>();
    JsonNode array = suggest ? payload.path("tips") : payload.path("pois");
    for (JsonNode item : array) {
      Map<String, Object> mapped = suggest ? mapAmapTip(item, cityName) : mapAmapPoi(item, "amap");
      if (mapped != null) {
        results.add(mapped);
      }
    }
    return results;
  }

  private Map<String, Object> loadPlace(String placeId) {
    Map<String, Object> row =
        db.first(
            """
            select
              id,
              provider,
              "providerId" as provider_id,
              name,
              "shortName" as short_name,
              "formattedAddress" as formatted_address,
              "provinceName" as province_name,
              "cityName" as city_name,
              "districtName" as district_name,
              "countryCode" as country_code,
              latitude,
              longitude
            from "Place"
            where id = :id
            """,
            Map.of("id", placeId));
    if (row == null) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Place not found");
    }
    return row;
  }

  private Map<String, Object> mapPlace(Map<String, Object> row, String source) {
    Map<String, Object> result = new LinkedHashMap<>();
    result.put("id", row.get("id"));
    result.put("provider", row.get("provider"));
    result.put("providerId", row.get("provider_id"));
    result.put("name", row.get("name"));
    result.put("shortName", row.get("short_name"));
    result.put("formattedAddress", row.get("formatted_address"));
    result.put("provinceName", row.get("province_name"));
    result.put("cityName", row.get("city_name"));
    result.put("districtName", row.get("district_name"));
    result.put("countryCode", row.get("country_code"));
    result.put("latitude", json.doubleValue(row.get("latitude")));
    result.put("longitude", json.doubleValue(row.get("longitude")));
    result.put("source", source);
    return result;
  }

  private Map<String, Object> mapAmapPoi(JsonNode poi, String source) {
    if (poi.path("name").asText("").isBlank()) {
      return null;
    }
    Map<String, Object> result = new LinkedHashMap<>();
    result.put("provider", "AMAP");
    result.put("providerId", blankToNull(poi.path("id").asText()));
    result.put("name", poi.path("name").asText());
    result.put(
        "formattedAddress",
        joinAddress(
            nullableText(poi.path("pname")),
            cityText(poi.path("cityname")),
            nullableText(poi.path("adname")),
            nullableText(poi.path("address"))));
    result.put("provinceName", nullableText(poi.path("pname")));
    result.put("cityName", cityText(poi.path("cityname")));
    result.put("districtName", nullableText(poi.path("adname")));
    result.put("countryCode", "CN");
    Double[] coordinate = parseCoordinate(poi.path("location").asText(null));
    result.put("latitude", coordinate == null ? null : coordinate[0]);
    result.put("longitude", coordinate == null ? null : coordinate[1]);
    result.put("source", source);
    return result;
  }

  private Map<String, Object> mapAmapTip(JsonNode tip, String fallbackCityName) {
    if (tip.path("name").asText("").isBlank()) {
      return null;
    }
    Map<String, Object> result = new LinkedHashMap<>();
    result.put("provider", "AMAP");
    result.put("providerId", blankToNull(tip.path("id").asText()));
    result.put("name", tip.path("name").asText());
    result.put(
        "formattedAddress",
        joinAddress(nullableText(tip.path("district")), nullableText(tip.path("address"))));
    result.put("cityName", fallbackCityName);
    result.put("districtName", nullableText(tip.path("district")));
    result.put("countryCode", "CN");
    Double[] coordinate = parseCoordinate(tip.path("location").asText(null));
    result.put("latitude", coordinate == null ? null : coordinate[0]);
    result.put("longitude", coordinate == null ? null : coordinate[1]);
    result.put("source", "amap");
    return result;
  }

  private Map<String, Object> normalizeRecommendedPlace(
      Map<String, Object> place, String formattedAddress) {
    Map<String, Object> result = new LinkedHashMap<>();
    result.put("provider", place.get("provider"));
    result.put("providerId", place.get("providerId"));
    result.put("name", place.get("name"));
    result.put("shortName", place.getOrDefault("shortName", place.get("name")));
    result.put("formattedAddress", formattedAddress != null ? formattedAddress : place.get("formattedAddress"));
    result.put("provinceName", place.get("provinceName"));
    result.put("cityName", place.get("cityName"));
    result.put("districtName", place.get("districtName"));
    result.put("countryCode", place.get("countryCode"));
    result.put("latitude", place.get("latitude"));
    result.put("longitude", place.get("longitude"));
    result.put("source", place.get("source"));
    return result;
  }

  private Map<String, Object> buildRecommendedPlace(
      JsonNode regeocode,
      JsonNode component,
      String formattedAddress,
      Double latitude,
      Double longitude) {
    Map<String, Object> result = new LinkedHashMap<>();
    result.put("provider", "AMAP");
    result.put("providerId", null);
    result.put("name", formattedAddress);
    result.put("shortName", formattedAddress);
    result.put("formattedAddress", formattedAddress);
    result.put("provinceName", nullableText(component.path("province")));
    result.put("cityName", cityText(component.path("city")));
    result.put("districtName", nullableText(component.path("district")));
    result.put("countryCode", "CN");
    result.put("latitude", latitude);
    result.put("longitude", longitude);
    result.put("source", "amap");
    return result;
  }

  private List<Map<String, Object>> dedupePlaces(List<Map<String, Object>> rawPlaces, int limit) {
    LinkedHashMap<String, Map<String, Object>> deduped = new LinkedHashMap<>();
    for (Map<String, Object> place : rawPlaces) {
      String key =
          "AMAP".equals(place.get("provider")) && place.get("providerId") != null
              ? "amap:" + place.get("providerId")
              : place.get("name")
                  + ":"
                  + Objects.toString(place.get("latitude"), "na")
                  + ":"
                  + Objects.toString(place.get("longitude"), "na");
      deduped.putIfAbsent(key, place);
      if (deduped.size() >= limit) {
        break;
      }
    }
    return new ArrayList<>(deduped.values());
  }

  private JsonNode fetchAmapJson(String url) {
    try {
      HttpResponse<String> response =
          httpClient.send(
              HttpRequest.newBuilder(URI.create(url)).GET().build(),
              HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
      if (response.statusCode() >= 400) {
        throw new ResponseStatusException(
            HttpStatus.BAD_GATEWAY, "AMap request failed with " + response.statusCode());
      }

      JsonNode payload = objectMapper.readTree(response.body());
      if (!"1".equals(payload.path("status").asText())) {
        throw new ResponseStatusException(
            HttpStatus.BAD_GATEWAY, "AMap request failed: " + payload.path("info").asText());
      }
      return payload;
    } catch (IOException | InterruptedException exception) {
      Thread.currentThread().interrupt();
      throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "AMap request failed");
    }
  }

  private byte[] fetchBinary(String url) {
    try {
      HttpResponse<byte[]> response =
          httpClient.send(
              HttpRequest.newBuilder(URI.create(url)).GET().build(),
              HttpResponse.BodyHandlers.ofByteArray());
      if (response.statusCode() >= 400) {
        throw new ResponseStatusException(
            HttpStatus.BAD_GATEWAY, "AMap static map request failed with " + response.statusCode());
      }
      return response.body();
    } catch (IOException | InterruptedException exception) {
      Thread.currentThread().interrupt();
      throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "AMap static map request failed");
    }
  }

  private int clamp(Integer value, int defaultValue, int min, int max) {
    if (value == null) {
      return defaultValue;
    }
    return Math.max(min, Math.min(max, value));
  }

  private String joinAddress(String... parts) {
    List<String> resolved = new ArrayList<>();
    for (String part : parts) {
      if (part != null && !part.isBlank()) {
        resolved.add(part);
      }
    }
    return resolved.isEmpty() ? null : String.join(" ", resolved);
  }

  private String encode(String value) {
    return URLEncoder.encode(value, StandardCharsets.UTF_8);
  }

  private String nullableText(JsonNode node) {
    if (node == null || node.isMissingNode() || node.isNull()) {
      return null;
    }
    String text = node.asText();
    return text == null || text.isBlank() || "[]".equals(text) ? null : text;
  }

  private String cityText(JsonNode node) {
    if (node == null || node.isMissingNode() || node.isNull()) {
      return null;
    }
    if (node.isArray()) {
      List<String> cities = new ArrayList<>();
      for (JsonNode city : node) {
        String text = nullableText(city);
        if (text != null) {
          cities.add(text);
        }
      }
      return cities.isEmpty() ? null : String.join("/", cities);
    }
    return nullableText(node);
  }

  private Double[] parseCoordinate(String raw) {
    if (raw == null || raw.isBlank()) {
      return null;
    }
    String[] parts = raw.split(",");
    if (parts.length != 2) {
      return null;
    }
    return new Double[] {Double.parseDouble(parts[1]), Double.parseDouble(parts[0])};
  }

  private String defaultValue(String value, String defaultValue) {
    return isBlank(value) ? defaultValue : value;
  }

  private String blankToNull(String value) {
    return isBlank(value) ? null : value;
  }

  private boolean isBlank(String value) {
    return value == null || value.isBlank();
  }
}
