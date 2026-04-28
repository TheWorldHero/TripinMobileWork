package com.tripin.api.service;

import com.tripin.api.support.DbSupport;
import com.tripin.api.support.JsonSupport;
import com.tripin.api.web.Requests.CreateMediaAssetRequest;
import com.tripin.api.web.Requests.MarkMediaReadyRequest;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class MediaService {
  private final DbSupport db;
  private final JsonSupport json;
  private final UserService userService;
  private final String defaultBucket;

  public MediaService(
      DbSupport db,
      JsonSupport json,
      UserService userService,
      @Value("${DEFAULT_MEDIA_BUCKET:tripin-media}") String defaultBucket) {
    this.db = db;
    this.json = json;
    this.userService = userService;
    this.defaultBucket = defaultBucket;
  }

  public Map<String, Object> create(String userId, CreateMediaAssetRequest request) {
    if (request == null
        || isBlank(request.originalName())
        || isBlank(request.mimeType())
        || request.bytes() == null
        || request.bytes() <= 0) {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST, "originalName, mimeType and bytes are required");
    }

    userService.ensureExists(userId);
    String mediaId = json.newId("media");
    String storageKey =
        userId
            + "/"
            + Instant.now().toString().substring(0, 10)
            + "/"
            + System.currentTimeMillis()
            + "-"
            + request.originalName();

    Map<String, Object> params = new LinkedHashMap<>();
    params.put("id", mediaId);
    params.put("ownerId", userId);
    params.put("tripId", request.tripId());
    params.put("tripPointId", request.tripPointId());
    params.put("bucket", defaultBucket);
    params.put("storageKey", storageKey);
    params.put("originalName", request.originalName());
    params.put("mimeType", request.mimeType());
    params.put("bytes", request.bytes());
    params.put("width", request.width());
    params.put("height", request.height());
    params.put("takenAt", request.takenAt());
    params.put("exifLatitude", request.exifLatitude());
    params.put("exifLongitude", request.exifLongitude());
    params.put("caption", request.caption());

    db.update(
        """
        insert into "MediaAsset" (
          id, "ownerId", "tripId", "tripPointId", bucket, "storageKey", "originalName",
          "mimeType", bytes, width, height, "takenAt", "exifLatitude", "exifLongitude",
          caption, status
        )
        values (
          :id, :ownerId, :tripId, :tripPointId, :bucket, :storageKey, :originalName,
          :mimeType, :bytes, :width, :height, cast(:takenAt as timestamptz),
          :exifLatitude, :exifLongitude, :caption, 'PENDING'
        )
        """,
        params);

    return getOne(userId, mediaId);
  }

  public Map<String, Object> markReady(
      String userId, String mediaAssetId, MarkMediaReadyRequest request) {
    getOwnedRow(userId, mediaAssetId);

    Map<String, Object> params = new LinkedHashMap<>();
    params.put("id", mediaAssetId);
    params.put("ownerId", userId);
    params.put("storageKey", request == null ? null : request.storageKey());

    db.update(
        """
        update "MediaAsset"
        set
          status = 'READY',
          "storageKey" = coalesce(:storageKey, "storageKey"),
          "updatedAt" = now()
        where id = :id and "ownerId" = :ownerId
        """,
        params);

    return getOne(userId, mediaAssetId);
  }

  public Map<String, Object> getOne(String userId, String mediaAssetId) {
    Map<String, Object> row = getOwnedRow(userId, mediaAssetId);
    return toMedia(row);
  }

  public Map<String, Object> toMedia(Map<String, Object> row) {
    Map<String, Object> media = new LinkedHashMap<>();
    media.put("id", row.get("id"));
    media.put("originalName", row.get("original_name"));
    media.put("caption", row.get("caption"));
    media.put("takenAt", json.instantValue(row.get("taken_at")));
    media.put("storageKey", row.get("storage_key"));
    media.put("bucket", row.get("bucket"));
    media.put("status", row.get("status"));
    media.put("mimeType", row.get("mime_type"));
    media.put("width", json.intValue(row.get("width")));
    media.put("height", json.intValue(row.get("height")));
    media.put("exifLatitude", json.doubleValue(row.get("exif_latitude")));
    media.put("exifLongitude", json.doubleValue(row.get("exif_longitude")));
    return media;
  }

  private Map<String, Object> getOwnedRow(String userId, String mediaAssetId) {
    Map<String, Object> row =
        db.first(
            """
            select
              id,
              "originalName" as original_name,
              caption,
              "takenAt" as taken_at,
              "storageKey" as storage_key,
              bucket,
              status,
              "mimeType" as mime_type,
              width,
              height,
              "exifLatitude" as exif_latitude,
              "exifLongitude" as exif_longitude
            from "MediaAsset"
            where id = :id and "ownerId" = :ownerId
            """,
            Map.of("id", mediaAssetId, "ownerId", userId));

    if (row == null) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Media asset not found");
    }

    return row;
  }

  private boolean isBlank(String value) {
    return value == null || value.isBlank();
  }
}
