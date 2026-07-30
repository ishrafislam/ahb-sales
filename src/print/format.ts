import { currentLang } from "../i18n";

function locale(): string {
  return currentLang.value === "bn" ? "bn-BD" : "en-US";
}

/**
 * "Monday, June 1, 2026" from a report's DD-MM-YYYY, in the app's language.
 * Falls back to the raw string if it ever fails to parse.
 */
export function longDate(ddMmYyyy: string): string {
  const [d, m, y] = ddMmYyyy.split("-").map(Number);
  if (!d || !m || !y) return ddMmYyyy;
  const date = new Date(y, m - 1, d);
  if (Number.isNaN(date.getTime())) return ddMmYyyy;
  return date.toLocaleDateString(locale(), {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/** "8,220.00", in Bengali digits when the app is in Bengali. */
export function money(n: number): string {
  const value = Number.isFinite(n) ? n : 0;
  return value.toLocaleString(locale(), {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
