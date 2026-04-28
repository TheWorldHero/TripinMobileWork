package com.tripin.api.support;

public final class GeoSupport {
  private static final double EARTH_RADIUS_KM = 6371.0;

  private GeoSupport() {}

  public static Double haversineInKm(Double latitudeA, Double longitudeA, Double latitudeB, Double longitudeB) {
    if (latitudeA == null || longitudeA == null || latitudeB == null || longitudeB == null) {
      return null;
    }

    double latDistance = Math.toRadians(latitudeB - latitudeA);
    double lngDistance = Math.toRadians(longitudeB - longitudeA);

    double a =
        Math.sin(latDistance / 2) * Math.sin(latDistance / 2)
            + Math.cos(Math.toRadians(latitudeA))
                * Math.cos(Math.toRadians(latitudeB))
                * Math.sin(lngDistance / 2)
                * Math.sin(lngDistance / 2);
    double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return EARTH_RADIUS_KM * c;
  }
}
