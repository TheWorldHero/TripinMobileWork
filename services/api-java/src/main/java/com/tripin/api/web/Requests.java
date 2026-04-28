package com.tripin.api.web;

import java.util.List;

public final class Requests {
  private Requests() {}

  public record CreateUserRequest(
      String id, String username, String displayName, String avatarUrl, String bio) {}

  public record UpdateUserRequest(String username, String displayName, String avatarUrl, String bio) {}

  public record RegisterRequest(
      String email,
      String username,
      String displayName,
      String password,
      String avatarUrl,
      String bio) {}

  public record LoginRequest(String identifier, String password) {}

  public record CreateMediaAssetRequest(
      String originalName,
      String mimeType,
      Integer bytes,
      Integer width,
      Integer height,
      String takenAt,
      Double exifLatitude,
      Double exifLongitude,
      String caption,
      String tripId,
      String tripPointId) {}

  public record MarkMediaReadyRequest(String storageKey) {}

  public record CreateTripRequest(
      String title,
      String summary,
      String kind,
      String visibility,
      String cityName,
      String provinceName,
      String countryCode,
      String startedAt,
      String endedAt,
      String coverMediaId) {}

  public record CreatePointRequest(
      List<String> mediaAssetIds, String title, String note, String capturedAt) {}

  public record ConfirmPointLocationRequest(
      String placeId, Double latitude, Double longitude, String checkInAt) {}

  public record CreateLineRequest(String title, String summary, String visibility) {}

  public record AttachPointsRequest(List<String> pointIds) {}

  public record ReorderLinePointsRequest(List<String> pointIds) {}

  public record CreateTripPointRequest(
      String startedAt,
      String endedAt,
      String placeId,
      String customPlaceName,
      String title,
      String note,
      Double latitude,
      Double longitude,
      String sourceType,
      Integer sequence,
      List<String> mediaAssetIds) {}

  public record AutoAssembleTripRequest(List<String> mediaAssetIds, Integer timeGapMinutes, Integer distanceGapKm) {}

  public record PublishTripRequest(String title, String summary, String visibility, String coverMediaId) {}

  public record ReorderTripPointsRequest(List<String> pointIds) {}

  public record CreateCommentRequest(String content) {}

  public record CreatePlaceRequest(
      String provider,
      String providerId,
      String name,
      String shortName,
      String formattedAddress,
      String provinceName,
      String cityName,
      String districtName,
      String countryCode,
      Double latitude,
      Double longitude) {}

  public record DevSeedRequest(Boolean reset) {}
}
