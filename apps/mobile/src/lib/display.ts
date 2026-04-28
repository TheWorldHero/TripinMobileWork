export function formatDateTime(value?: string | null) {
  if (!value) {
    return 'No time yet';
  }

  const date = new Date(value);
  return new Intl.DateTimeFormat('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function formatDateRange(start?: string | null, end?: string | null) {
  if (!start && !end) {
    return 'No time range yet';
  }

  if (start && !end) {
    return formatDateTime(start);
  }

  if (!start && end) {
    return formatDateTime(end);
  }

  const startDate = new Date(start as string);
  const endDate = new Date(end as string);

  const sameDay =
    startDate.getFullYear() === endDate.getFullYear() &&
    startDate.getMonth() === endDate.getMonth() &&
    startDate.getDate() === endDate.getDate();

  if (sameDay) {
    return `${new Intl.DateTimeFormat('zh-CN', {
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(startDate)} - ${new Intl.DateTimeFormat('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(endDate)}`;
  }

  return `${formatDateTime(start)} - ${formatDateTime(end)}`;
}

function parseCoordinate(value?: number | string | null) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const numericValue = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numericValue) ? numericValue : null;
}

export function formatCoordinates(latitude?: number | string | null, longitude?: number | string | null) {
  const parsedLatitude = parseCoordinate(latitude);
  const parsedLongitude = parseCoordinate(longitude);

  if (parsedLatitude === null || parsedLongitude === null) {
    return 'No coordinates yet';
  }

  return `${parsedLatitude.toFixed(4)}, ${parsedLongitude.toFixed(4)}`;
}

export function formatCount(value: number, label: string) {
  return `${value} ${label}`;
}

export function toDateTimeLocalInput(value: string) {
  return value.slice(0, 16);
}
