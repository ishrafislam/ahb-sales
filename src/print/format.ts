import { currentLang } from "../i18n";
import {
  fmtMoney,
  fmtQuantity,
  localizeDigits,
  toBengaliDigits,
} from "../utils/numerals";

export { toBengaliDigits };

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

/**
 * "27/06/2026" from a report's DD-MM-YYYY, for a ledger column where the long
 * form would not fit. Day first in both languages — en-GB rather than en-US,
 * matching how the app formats dates elsewhere.
 */
export function shortDate(ddMmYyyy: string): string {
  const [d, m, y] = ddMmYyyy.split("-").map(Number);
  if (!d || !m || !y) return ddMmYyyy;
  const date = new Date(y, m - 1, d);
  if (Number.isNaN(date.getTime())) return ddMmYyyy;
  return date.toLocaleDateString(currentLang.value === "bn" ? "bn-BD" : "en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/** "8,220.00", in Bengali digits when the app is in Bengali. */
export const money = fmtMoney;

/**
 * An id or other bare figure: transliterated in Bengali but never grouped,
 * since "১,০০০" would read as a thousand rather than as slot 1000.
 */
export const digits = localizeDigits;

/** "6", "1,500", "2.5" — a count rather than an amount, so no forced decimals. */
export const quantity = fmtQuantity;

/** Customer and product names are user input, so they go through this. */
export function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// A difference is signed, and ceiling would be asymmetric across zero
export const round2 = (n: number) => Math.round(n * 100) / 100;

export type LedgerRow = {
  netBill: number;
  paid: number;
  previousDue: number;
  hasInvoice: boolean;
};

/**
 * What is owed after a line of trade: the bill left unpaid, added to what was
 * owed before it. The next due is blank for a standalone deposit, which
 * carries no previous-due snapshot to add to.
 */
export function ledgerAmounts(row: LedgerRow): {
  difference: number;
  nextDue: number | undefined;
} {
  const difference = round2(row.netBill - row.paid);
  return {
    difference,
    nextDue: row.hasInvoice ? round2(row.previousDue + difference) : undefined,
  };
}
