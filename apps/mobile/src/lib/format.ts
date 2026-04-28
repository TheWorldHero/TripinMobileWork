export function formatDateTime(value?: string | null) {
  if (!value) {
    return '未设置时间';
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
    return '还没有时间范围';
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

export function formatCoordinates(latitude?: number | null, longitude?: number | null) {
  if (latitude === null || latitude === undefined || longitude === null || longitude === undefined) {
    return '未设置坐标';
  }

  return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
}

export function toDateTimeLocalInput(value: string) {
  return value.slice(0, 16);
}
