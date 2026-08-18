import type { MoneyTxnDayWise } from "../main/data";
import { t } from "../i18n";
import type { PrintDocument } from "./document";
import { digits, esc, longDate, money, round2 } from "./format";

/**
 * The daily payment report as a print document: one table per day listing the
 * customers who deposited that day and what they deposited, with the day's
 * total underneath. Three narrow columns, so the page splits in two and the
 * days flow down the left half before continuing down the right.
 */
export function buildPaymentReportDocument(
  report: MoneyTxnDayWise
): PrintDocument {
  const title = t("v2_daily_payment_report");
  const currency = t("currency_taka");

  // The domain hands days back newest first; a ledger reads forwards. A day
  // whose customers all bought on credit has nothing to show, so it is left
  // out rather than printed empty.
  const days = [...report.days]
    .reverse()
    .map((day) => ({
      date: day.date,
      // The photo's order: by customer id, not by name
      rows: day.rows
        .filter((r) => r.paid > 0)
        .sort((a, b) => a.customerId - b.customerId),
    }))
    .filter((day) => day.rows.length > 0);

  const daysHtml = days
    .map((day) => {
      const rowsHtml = day.rows
        .map(
          (r) => `<tr>
            <td class="cid">${digits(r.customerId)}</td>
            <td class="name">${esc(r.customerName ?? "")}</td>
            <td class="amt">${money(r.paid)}</td>
          </tr>`
        )
        .join("");

      // Totalled off the rows printed rather than off day.totals.paid, which
      // counts the whole day whatever this sheet shows.
      const total = day.rows.reduce((s, r) => round2(s + r.paid), 0);

      return `<section class="day">
        <h2>${longDate(day.date)}</h2>
        <table>
          <colgroup>
            <col class="c-cid" />
            <col class="c-name" />
            <col class="c-amt" />
          </colgroup>
          <thead>
            <tr>
              <th class="cid"></th>
              <th class="name">${t("v2_customer_name")}</th>
              <th class="amt">${t("deposit")}</th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
          <tfoot>
            <tr>
              <td class="cid"></td>
              <td class="lbl">${t("total_deposit")}</td>
              <td class="amt">${currency} ${money(total)}</td>
            </tr>
          </tfoot>
        </table>
      </section>`;
    })
    .join("");

  const bodyHtml = `
    <h1>${title} :</h1>
    ${
      days.length
        ? `<div class="days">${daysHtml}</div>`
        : `<div class="empty">${t("no_records")}</div>`
    }
  `;

  // The heading belongs to the page rather than the left half, so it spans
  // both columns. Widths live on the colgroup, which is where
  // `table-layout: fixed` reads them from.
  //
  // A day's heading is pinned to the rows below it and its total to the rows
  // above it; the rows themselves break freely at a column boundary. The
  // header band is pinned too — without that the paper strands a day's
  // heading and column titles at the foot of a column with every row of that
  // day in the next one. A
  // continued table carries no repeated header or footer — the print module
  // suppresses both, so the preview and the paper fragment alike.
  const styleCss = `
    h1 { font-size: 18px; margin: 0 0 8px; column-span: all; }
    .empty { font-size: 12px; color: #6b7280; text-align: center; padding: 8mm 0; }
    .day { margin-bottom: 6mm; }
    .day h2 { font-size: 11px; font-weight: 600; text-align: right; margin: 0 0 2px; break-after: avoid; page-break-after: avoid; }
    .day table { width: 100%; table-layout: fixed; border-collapse: collapse; font-size: 10px; }
    .day th, .day td { border: none; padding: 2px 4px; overflow-wrap: break-word; }
    .day th { font-weight: 600; white-space: nowrap; border-top: 1px solid #999; border-bottom: 1px solid #999; }
    .day thead { break-after: avoid; page-break-after: avoid; }
    .day tfoot tr { break-before: avoid; page-break-before: avoid; }
    .day tfoot td { font-weight: 600; border-top: 1px solid #999; padding-top: 3px; }
    .day .c-cid { width: 18%; }
    .day .c-name { width: 52%; }
    .day .c-amt { width: 30%; }
    .day .cid { text-align: right; padding-right: 6px; }
    .day .name { text-align: left; }
    .day .lbl { text-align: right; white-space: nowrap; }
    .day .amt { text-align: right; white-space: nowrap; }
  `;

  return { title, bodyHtml, styleCss, columns: 2 };
}
