/**
 * Date utility functions for consistent date formatting across the application
 */

/**
 * Get current date/time as ISO string
 * @returns ISO 8601 date-time string (e.g., "2024-11-18T10:30:00.000Z")
 */
export function nowIso(): string {
  return new Date().toISOString();
}

/**
 * Format Date object to YYYY-MM-DD format
 * @param date - Date object to format
 * @returns Date string in YYYY-MM-DD format (e.g., "2024-11-18")
 */
export function toYmd(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * Get today's date in YYYY-MM-DD format
 * @returns Today's date as YYYY-MM-DD string
 */
export function todayYmd(): string {
  return toYmd(new Date());
}

/**
 * Format ISO date string to DD-MM-YYYY format
 * @param iso - ISO date string
 * @returns Formatted date string in DD-MM-YYYY format, or original string if parsing fails
 */
export function formatDate(iso: string): string {
  try {
    const date = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, "0");
    const d = pad(date.getDate());
    const m = pad(date.getMonth() + 1);
    const y = date.getFullYear();
    return `${d}-${m}-${y}`;
  } catch {
    return iso;
  }
}

/**
 * Format Date object to DD-MM-YYYY format
 * @param date - Date object to format
 * @returns Formatted date string in DD-MM-YYYY format
 */
export function formatDateOnly(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const d = pad(date.getDate());
  const m = pad(date.getMonth() + 1);
  const y = date.getFullYear();
  return `${d}-${m}-${y}`;
}

/**
 * Convert Date to ISO date string (YYYY-MM-DD)
 * @param date - Date object
 * @returns ISO date string without time component
 */
export function dateToIso(date: Date): string {
  return date.toISOString();
}

/**
 * Convert ISO or YYYY-MM-DD string to DD-MM-YYYY format
 * @param isoOrYmd - ISO date string or YYYY-MM-DD string
 * @returns Date string in DD-MM-YYYY format
 */
export function toDDMMYYYY(isoOrYmd: string): string {
  const ymd = isoOrYmd.includes("T") ? isoOrYmd.slice(0, 10) : isoOrYmd;
  const [y, m, d] = ymd.split("-");
  return `${d}-${m}-${y}`;
}
