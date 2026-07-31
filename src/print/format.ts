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

export function toBengaliDigits(s: string): string {
  return s.replace(/[0-9]/g, (d) => "০১২৩৪৫৬৭৮৯"[+d]!);
}

/**
 * "8,220.00", in Bengali digits when the app is in Bengali.
 *
 * The grouping is always Western three-digit, transliterated afterwards
 * rather than formatted with the bn-BD locale, which would group by lakh —
 * "১,০১,০১৩.০০" where the ledgers this replaces read "১০১,০১৩.০০".
 */
export function money(n: number): string {
  const value = Number.isFinite(n) ? n : 0;
  const s = value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return currentLang.value === "bn" ? toBengaliDigits(s) : s;
}

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
