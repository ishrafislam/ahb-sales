import type { MoneyTxnDayWise } from "../main/data";
import { t } from "../i18n";
import type { PrintDocument } from "./document";
import { esc, ledgerAmounts, longDate, money, round2 } from "./format";

/**
 * The daily report as a print document: one table per day, customer by
 * customer, with the day's totals underneath. Full page width — the row is
 * too wide to split the page in two.
 */
export function buildDailyReportDocument(
  report: MoneyTxnDayWise
): PrintDocument {
  const title = t("v2_daily_report");
  const blank = "";

  // The domain hands days back newest first; a ledger reads forwards
  const days = [...report.days].reverse();

  const daysHtml = days
    .map((day) => {
      // The photo's order: by customer id, not by name
      const rows = [...day.rows].sort((a, b) => a.customerId - b.customerId);

      const rowsHtml = rows
        .map((r) => {
          const { difference, nextDue } = ledgerAmounts(r);
          return `<tr>
            <td class="cid">${r.customerId}</td>
            <td class="name">${esc(r.customerName ?? "")}</td>
            <td class="amt">${money(r.bill)}</td>
            <td class="amt">${money(r.discount)}</td>
            <td class="amt">${money(r.netBill)}</td>
            <td class="amt">${money(r.paid)}</td>
            <td class="amt">${money(difference)}</td>
            <td class="amt">${r.hasInvoice ? money(r.previousDue) : blank}</td>
            <td class="amt">${nextDue === undefined ? blank : money(nextDue)}</td>
          </tr>`;
        })
        .join("");

      const totalDifference = rows.reduce(
        (s, r) => round2(s + ledgerAmounts(r).difference),
        0
      );

      return `<section class="day">
        <h2>${t("date")} : ${longDate(day.date)}</h2>
        <table>
          <colgroup>
            <col class="c-cid" />
            <col class="c-name" />
            <col class="c-total" />
            <col class="c-discount" />
            <col class="c-bill" />
            <col class="c-deposit" />
            <col class="c-difference" />
            <col class="c-prev" />
            <col class="c-next" />
          </colgroup>
          <thead>
            <tr>
              <th class="cid"></th>
              <th class="name">${t("customer_name")}</th>
              <th class="amt">${t("total_amount")}</th>
              <th class="amt">${t("discount")}</th>
              <th class="amt">${t("bill")}</th>
              <th class="amt">${t("deposit")}</th>
              <th class="amt">${t("difference")}</th>
              <th class="amt">${t("previous_due")}</th>
              <th class="amt">${t("next_due")}</th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
          <tfoot>
            <tr>
              <td class="cid"></td>
              <td class="name">${t("total")} :</td>
              <td class="amt">${money(day.totals.bill)}</td>
              <td class="amt">${money(day.totals.discount)}</td>
              <td class="amt">${money(day.totals.netBill)}</td>
              <td class="amt">${money(day.totals.paid)}</td>
              <td class="amt">${money(totalDifference)}</td>
              <td class="amt"></td>
              <td class="amt"></td>
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

  // Nine columns across one page, so the type is a shade smaller than the
  // total-sell report's. A day's table breaks freely across pages; only its
  // heading is pinned to the rows below it. A continued table carries no
  // repeated header: the print module suppresses that so the preview and the
  // paper fragment alike.
  const styleCss = `
    h1 { font-size: 18px; margin: 0 0 8px; }
    .empty { font-size: 12px; color: #6b7280; text-align: center; padding: 8mm 0; }
    .day { margin-bottom: 6mm; }
    .day h2 { font-size: 12px; font-weight: 600; margin: 0 0 2px; break-after: avoid; page-break-after: avoid; }
    .day table { width: 100%; table-layout: fixed; border-collapse: collapse; font-size: 9px; }
    .day th, .day td { border: none; border-bottom: 1px solid #999; padding: 3px 4px; overflow-wrap: break-word; }
    .day th { font-weight: 600; }
    .day tfoot td { font-weight: 600; }
    .day .c-cid { width: 6%; }
    .day .c-name { width: 22%; }
    .day .c-total { width: 11%; }
    .day .c-discount { width: 9%; }
    .day .c-bill { width: 11%; }
    .day .c-deposit { width: 11%; }
    .day .c-difference { width: 10%; }
    .day .c-prev { width: 10%; }
    .day .c-next { width: 10%; }
    .day .cid { text-align: right; padding-right: 6px; }
    .day .name { text-align: left; }
    .day .amt { text-align: right; }
  `;

  return { title, bodyHtml, styleCss };
}
