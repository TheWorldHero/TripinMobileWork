package com.tripin.api.support;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.postgresql.util.PGobject;
import org.springframework.stereotype.Component;

@Component
public class JsonSupport {
  private static final TypeReference<List<Map<String, Object>>> LIST_OF_MAPS = new TypeReference<>() {};
  private static final TypeReference<List<String>> LIST_OF_STRINGS = new TypeReference<>() {};

  private final ObjectMapper objectMapper;

  public JsonSupport(ObjectMapper objectMapper) {
    this.objectMapper = objectMapper;
  }

  public String toJson(Object value) {
    try {
      return objectMapper.writeValueAsString(value);
    } catch (JsonProcessingException exception) {
      throw new IllegalStateException("Failed to encode JSON", exception);
    }
  }

  public List<Map<String, Object>> parseListOfMaps(Object rawValue) {
    if (rawValue == null) {
      return Collections.emptyList();
    }

    String json = asJsonString(rawValue);
    if (json == null || json.isBlank()) {
      return Collections.emptyList();
    }

    try {
      return objectMapper.readValue(json, LIST_OF_MAPS);
    } catch (JsonProcessingException exception) {
      throw new IllegalStateException("Failed to decode JSON list", exception);
    }
  }

  public List<String> parseStringList(Object rawValue) {
    if (rawValue == null) {
      return Collections.emptyList();
    }

    String json = asJsonString(rawValue);
    if (json == null || json.isBlank()) {
      return Collections.emptyList();
    }

    try {
      return objectMapper.readValue(json, LIST_OF_STRINGS);
    } catch (JsonProcessingException exception) {
      throw new IllegalStateException("Failed to decode JSON string list", exception);
    }
  }

  public Map<String, Object> parseObjectMap(Object rawValue) {
    if (rawValue == null) {
      return Collections.emptyMap();
    }

    String json = asJsonString(rawValue);
    if (json == null || json.isBlank()) {
      return Collections.emptyMap();
    }

    try {
      JsonNode node = objectMapper.readTree(json);
      return objectMapper.convertValue(node, new TypeReference<LinkedHashMap<String, Object>>() {});
    } catch (JsonProcessingException exception) {
      throw new IllegalStateException("Failed to decode JSON object", exception);
    }
  }

  public String asJsonString(Object rawValue) {
    if (rawValue == null) {
      return null;
    }
    if (rawValue instanceof PGobject pgObject) {
      return pgObject.getValue();
    }
    return String.valueOf(rawValue);
  }

  public String stringValue(Object value) {
    return value == null ? null : String.valueOf(value);
  }

  public Integer intValue(Object value) {
    if (value == null) {
      return null;
    }
    if (value instanceof Number number) {
      return number.intValue();
    }
    return Integer.parseInt(String.valueOf(value));
  }

  public Long longValue(Object value) {
    if (value == null) {
      return null;
    }
    if (value instanceof Number number) {
      return number.longValue();
    }
    return Long.parseLong(String.valueOf(value));
  }

  public Double doubleValue(Object value) {
    if (value == null) {
      return null;
    }
    if (value instanceof BigDecimal decimal) {
      return decimal.doubleValue();
    }
    if (value instanceof Number number) {
      return number.doubleValue();
    }
    return Double.parseDouble(String.valueOf(value));
  }

  public Instant instantValue(Object value) {
    if (value == null) {
      return null;
    }
    if (value instanceof Instant instant) {
      return instant;
    }
    if (value instanceof Timestamp timestamp) {
      return timestamp.toInstant();
    }
    return Instant.parse(String.valueOf(value));
  }

  public String newId(String prefix) {
    return prefix + "-" + UUID.randomUUID().toString().replace("-", "");
  }
}
