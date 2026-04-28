package com.tripin.api.support;

import java.util.Collections;
import java.util.List;
import java.util.Map;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Component;

@Component
public class DbSupport {
  private final NamedParameterJdbcTemplate jdbc;

  public DbSupport(NamedParameterJdbcTemplate jdbc) {
    this.jdbc = jdbc;
  }

  public List<Map<String, Object>> list(String sql, Map<String, ?> params) {
    return jdbc.queryForList(sql, params == null ? Collections.emptyMap() : params);
  }

  public Map<String, Object> first(String sql, Map<String, ?> params) {
    List<Map<String, Object>> rows = list(sql, params);
    return rows.isEmpty() ? null : rows.getFirst();
  }

  public String string(String sql, Map<String, ?> params) {
    try {
      return jdbc.queryForObject(sql, params, String.class);
    } catch (EmptyResultDataAccessException exception) {
      return null;
    }
  }

  public Integer integer(String sql, Map<String, ?> params) {
    try {
      return jdbc.queryForObject(sql, params, Integer.class);
    } catch (EmptyResultDataAccessException exception) {
      return null;
    }
  }

  public Long longValue(String sql, Map<String, ?> params) {
    try {
      return jdbc.queryForObject(sql, params, Long.class);
    } catch (EmptyResultDataAccessException exception) {
      return null;
    }
  }

  public int update(String sql, Map<String, ?> params) {
    return jdbc.update(sql, params == null ? Collections.emptyMap() : params);
  }
}
