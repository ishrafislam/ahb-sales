/**
 * Parsing and calendar arithmetic for the typed DD/MM/YYYY range inputs.
 *
 * Kept apart from ./date.ts, which formats dates the app already holds; this
 * deals with what the user types and with stepping by a calendar unit.
 */

export type ShiftUnit = "day" | "week" | "month" | "year";

const DDMMYYYY = /^(\d{2})\/(\d{2})\/(\d{4})$/;

/**
 * Strict DD/MM/YYYY parse. Rejects anything the calendar disagrees with, so
 * 31/02/2026 fails rather than rolling into March.
 */
export function parseDdMmYyyy(text: string): Date | null {
  const m = DDMMYYYY.exec(text.trim());
  if (!m) return null;
  const day = Number(m[1]);
  const month = Number(m[2]);
  const year = Number(m[3]);
  if (month < 1 || month > 12 || day < 1) return null;
  const d = new Date(year, month - 1, day);
  // A rolled-over date is not the date that was typed
  if (
    d.getFullYear() !== year ||
    d.getMonth() !== month - 1 ||
    d.getDate() !== day
  ) {
    return null;
  }
  return d;
}

export function formatDdMmYyyy(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/**
 * Step by a calendar unit. Months and years clamp rather than roll over —
 * 31/01 back a month lands on the last day of February, not on 03/03.
 */
export function shiftDate(d: Date, unit: ShiftUnit, delta: number): Date {
  if (unit === "day") {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate() + delta);
  }
  if (unit === "week") {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate() + delta * 7);
  }

  const monthDelta = unit === "month" ? delta : delta * 12;
  const target = d.getMonth() + monthDelta;
  const year = d.getFullYear() + Math.floor(target / 12);
  const month = ((target % 12) + 12) % 12;
  const day = Math.min(d.getDate(), daysInMonth(year, month));
  return new Date(year, month, day);
}
