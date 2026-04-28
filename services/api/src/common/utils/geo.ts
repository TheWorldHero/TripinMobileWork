export function haversineInKm(
  latitudeA?: number | null,
  longitudeA?: number | null,
  latitudeB?: number | null,
  longitudeB?: number | null,
) {
  if (
    latitudeA === null ||
    latitudeA === undefined ||
    longitudeA === null ||
    longitudeA === undefined ||
    latitudeB === null ||
    latitudeB === undefined ||
    longitudeB === null ||
    longitudeB === undefined
  ) {
    return null;
  }

  const earthRadiusKm = 6371;
  const toRadians = (value: number) => (value * Math.PI) / 180;

  const dLat = toRadians(latitudeB - latitudeA);
  const dLng = toRadians(longitudeB - longitudeA);
  const lat1 = toRadians(latitudeA);
  const lat2 = toRadians(latitudeB);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) *
      Math.cos(lat2) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadiusKm * c;
}

