/**
 * Bengali numerals, one place for the whole app.
 *
 * Everything the user reads is transliterated when the language is Bengali;
 * everything the user types is read back as Latin, so parsing, arithmetic and
 * the stored data never see a Bengali digit.
 *
 * Grouping stays Western three-digit even in Bengali. `bn-BD` groups by lakh —
 * "১,০১,০১৩.০০" where the ledgers this app replaces read "১০১,০১৩.০০" — so the
 * number is formatted in `en-US` and transliterated afterwards.
 */
import { currentLang } from "../i18n";

const BENGALI_ZERO = "০".codePointAt(0)!;

export function toBengaliDigits(s: string): string {
  return s.replace(/[0-9]/g, (d) => "০১২৩৪৫৬৭৮৯"[+d]!);
}

/** Bengali numerals read the same as Latin ones as far as parsing goes. */
export function toLatinDigits(s: string): string {
  return s.replace(/[০-৯]/g, (d) => String(d.codePointAt(0)! - BENGALI_ZERO));
}

/** Transliterated only when the app is in Bengali. */
export function localizeDigits(value: string | number): string {
  const s = String(value ?? "");
  return currentLang.value === "bn" ? toBengaliDigits(s) : s;
}

/** Anything the user typed, Bengali digits included. NaN if it is not a number. */
export function parseNumber(value: string | number): number {
  if (typeof value === "number") return value;
  return Number.parseFloat(toLatinDigits(String(value ?? "")).trim());
}

/** Same, for a whole number: ids and slots. */
export function parseInteger(value: string | number): number {
  if (typeof value === "number") return Math.trunc(value);
  return Number.parseInt(toLatinDigits(String(value ?? "")).trim(), 10);
}

/** "11,650.00" / "১১,৬৫০.০০" — an amount of money, always two decimals. */
export function fmtMoney(n: number): string {
  const value = Number.isFinite(n) ? n : 0;
  return localizeDigits(
    value.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

/** "6", "1,500", "2.5" — a count rather than an amount, so no forced decimals. */
export function fmtQuantity(n: number): string {
  const value = Number.isFinite(n) ? n : 0;
  return localizeDigits(
    value.toLocaleString("en-US", { maximumFractionDigits: 2 })
  );
}

/** "30/07/2026" / "৩০/০৭/২০২৬" — day first in both languages. */
export function fmtDate(iso: string | Date): string {
  const d = iso instanceof Date ? iso : new Date(iso);
  if (Number.isNaN(d.getTime())) return typeof iso === "string" ? iso : "";
  return localizeDigits(d.toLocaleDateString("en-GB"));
}
