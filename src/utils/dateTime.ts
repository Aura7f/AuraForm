/** Converts an ISO timestamp into the value format used by <input type="datetime-local">. */
export const toDateTimeLocalValue = (isoValue?: string | null): string => {
  if (!isoValue) return '';

  const date = new Date(isoValue);
  if (Number.isNaN(date.getTime())) return '';

  const localTime = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localTime.toISOString().slice(0, 16);
};

/** Converts a datetime-local input value into a UTC ISO timestamp. */
export const fromDateTimeLocalValue = (value: string): string | null => {
  if (!value) return null;

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};
