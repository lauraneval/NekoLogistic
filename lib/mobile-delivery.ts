export type GeoPoint = {
  latitude: number;
  longitude: number;
};

export function normalizeCoordinate(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function addHoursIso(isoDate: string, hours: number) {
  const date = new Date(isoDate);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  date.setHours(date.getHours() + hours);
  return date.toISOString();
}

export function estimateRouteDistanceKm(stops: Array<{ created_at: string } & GeoPoint>) {
  if (stops.length < 2) {
    return 0;
  }

  const orderedStops = [...stops].sort((left, right) => {
    return new Date(left.created_at).getTime() - new Date(right.created_at).getTime();
  });

  let distanceMeters = 0;

  for (let index = 1; index < orderedStops.length; index += 1) {
    const previous = orderedStops[index - 1];
    const current = orderedStops[index];
    const deltaLatitude = ((current.latitude - previous.latitude) * Math.PI) / 180;
    const deltaLongitude = ((current.longitude - previous.longitude) * Math.PI) / 180;
    const startLatitude = (previous.latitude * Math.PI) / 180;
    const endLatitude = (current.latitude * Math.PI) / 180;
    const haversineTerm =
      Math.sin(deltaLatitude / 2) * Math.sin(deltaLatitude / 2) +
      Math.cos(startLatitude) * Math.cos(endLatitude) *
        Math.sin(deltaLongitude / 2) * Math.sin(deltaLongitude / 2);

    distanceMeters += 2 * 6371000 * Math.atan2(Math.sqrt(haversineTerm), Math.sqrt(1 - haversineTerm));
  }

  return distanceMeters / 1000;
}
