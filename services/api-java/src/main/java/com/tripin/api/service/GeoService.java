package com.tripin.api.service;

import com.tripin.api.support.DbSupport;
import com.tripin.api.support.JsonSupport;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

/**
 * LBS 附近发现：按坐标查询附近的已发布帖子，按距离升序。
 *
 * <p>两条等价实现，按 {@code TRIPIN_GEO_POSTGIS} 选择：
 *
 * <ul>
 *   <li><b>Haversine（默认，可移植）</b>：先用 (latitude,longitude) 复合索引做 bbox 范围过滤，
 *       再用 Haversine 公式精确排序——任意 Postgres 可用，本地可压测。
 *   <li><b>PostGIS</b>：geography + GiST 索引 + {@code ST_DWithin} 范围 + {@code <->} 最近邻排序，
 *       生产环境（postgis 镜像）启用。
 * </ul>
 */
@Service
public class GeoService {
  private static final double EARTH_RADIUS_KM = 6371.0;
  private static final double KM_PER_DEG_LAT = 111.0;

  private final DbSupport db;
  private final JsonSupport json;
  private final boolean usePostgis;

  public GeoService(
      DbSupport db, JsonSupport json, @Value("${TRIPIN_GEO_POSTGIS:false}") boolean usePostgis) {
    this.db = db;
    this.json = json;
    this.usePostgis = usePostgis;
  }

  public List<Map<String, Object>> nearby(Double lat, Double lng, Double rawRadiusKm, Integer rawLimit) {
    if (lat == null || lng == null || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "valid lat/lng are required");
    }
    double radiusKm = rawRadiusKm == null || rawRadiusKm <= 0 ? 5.0 : Math.min(rawRadiusKm, 200.0);
    int limit = rawLimit == null ? 20 : Math.max(1, Math.min(100, rawLimit));
    return usePostgis
        ? nearbyPostgis(lat, lng, radiusKm, limit)
        : nearbyHaversine(lat, lng, radiusKm, limit);
  }

  private List<Map<String, Object>> nearbyHaversine(double lat, double lng, double radiusKm, int limit) {
    double latDelta = radiusKm / KM_PER_DEG_LAT;
    double lngDelta = radiusKm / (KM_PER_DEG_LAT * Math.max(0.01, Math.cos(Math.toRadians(lat))));

    Map<String, Object> params = new LinkedHashMap<>();
    params.put("lat", lat);
    params.put("lng", lng);
    params.put("latMin", lat - latDelta);
    params.put("latMax", lat + latDelta);
    params.put("lngMin", lng - lngDelta);
    params.put("lngMax", lng + lngDelta);
    params.put("limit", limit);

    return db
        .list(
            """
            select
              p.id, p.title, p."cityName" as city_name, p.latitude, p.longitude,
              (:earth * acos(least(1.0,
                 cos(radians(:lat)) * cos(radians(p.latitude))
                   * cos(radians(p.longitude) - radians(:lng))
                 + sin(radians(:lat)) * sin(radians(p.latitude))))) as distance_km
            from "Post" p
            where p.status = cast('ACTIVE' as "PostStatus")
              and p.visibility = cast('PUBLIC' as "Visibility")
              and p.latitude between :latMin and :latMax
              and p.longitude between :lngMin and :lngMax
            order by distance_km asc
            limit :limit
            """,
            withEarth(params))
        .stream()
        .map(this::toResult)
        .toList();
  }

  private List<Map<String, Object>> nearbyPostgis(double lat, double lng, double radiusKm, int limit) {
    Map<String, Object> params = new LinkedHashMap<>();
    params.put("lat", lat);
    params.put("lng", lng);
    params.put("meters", radiusKm * 1000.0);
    params.put("limit", limit);

    return db
        .list(
            """
            select
              p.id, p.title, p."cityName" as city_name, p.latitude, p.longitude,
              ST_Distance(p."geog", ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography) / 1000.0
                as distance_km
            from "Post" p
            where p.status = cast('ACTIVE' as "PostStatus")
              and p.visibility = cast('PUBLIC' as "Visibility")
              and p."geog" is not null
              and ST_DWithin(
                    p."geog", ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography, :meters)
            order by p."geog" <-> ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography
            limit :limit
            """,
            params)
        .stream()
        .map(this::toResult)
        .toList();
  }

  private Map<String, Object> withEarth(Map<String, Object> params) {
    params.put("earth", EARTH_RADIUS_KM);
    return params;
  }

  private Map<String, Object> toResult(Map<String, Object> row) {
    Map<String, Object> result = new LinkedHashMap<>();
    result.put("id", row.get("id"));
    result.put("title", row.get("title"));
    result.put("cityName", row.get("city_name"));
    result.put("latitude", json.doubleValue(row.get("latitude")));
    result.put("longitude", json.doubleValue(row.get("longitude")));
    Double distance = json.doubleValue(row.get("distance_km"));
    result.put("distanceKm", distance == null ? null : Math.round(distance * 100.0) / 100.0);
    return result;
  }
}
