export function formatGermanDate(dateString: string): string {
  // dateString: YYYY-MM-DD
  const [y, m, d] = dateString.split("-").map((x) => parseInt(x, 10));
  const date = new Date(Date.UTC(y, m - 1, d, 12, 0, 0)); // midday UTC to avoid TZ edge cases

  return new Intl.DateTimeFormat("de-DE", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric"
  }).format(date);
}
