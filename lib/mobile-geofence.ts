type Coordinate = {
  latitude: number;
  longitude: number;
};

export function haversineDistanceMeters(a: Coordinate, b: Coordinate) {
  const earthRadiusMeters = 6371000;
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

  const deltaLatitude = toRadians(b.latitude - a.latitude);
  const deltaLongitude = toRadians(b.longitude - a.longitude);

  const startLatitude = toRadians(a.latitude);
  const endLatitude = toRadians(b.latitude);

  const haversineTerm =
    Math.sin(deltaLatitude / 2) * Math.sin(deltaLatitude / 2) +
    Math.cos(startLatitude) * Math.cos(endLatitude) *
      Math.sin(deltaLongitude / 2) * Math.sin(deltaLongitude / 2);

  return 2 * earthRadiusMeters * Math.atan2(Math.sqrt(haversineTerm), Math.sqrt(1 - haversineTerm));
}

export function normalizeCoordinate(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function resolveTargetCoordinate(
  points: Array<{ target_latitude?: number | null; target_longitude?: number | null }>,
) {
  for (const point of points) {
    const latitude = normalizeCoordinate(point.target_latitude);
    const longitude = normalizeCoordinate(point.target_longitude);

    if (latitude !== null && longitude !== null) {
      return { latitude, longitude };
    }
  }

  return null;
}
