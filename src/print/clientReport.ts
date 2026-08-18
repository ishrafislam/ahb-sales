import type { ClientLedgerReport } from "../main/data";
import { t } from "../i18n";
import { toDDMMYYYY } from "../utils/date";
import type { PrintDocument } from "./document";
import { esc, ledgerAmounts, longDate, money, round2, shortDate } from "./format";

/** The range the report covers, as the YYYY-MM-DD the query ran on. */
export type ReportRangeYmd = { from: string; to: string };

/**
 * The money transaction report as a print document: a block per client, their
 * ledger for the range closed by a total row that names them and the due they
 * stand at. Full page width — the row is too wide to split the page in two.
 */
export function buildClientReportDocument(
  report: ClientLedgerReport,
  range: ReportRangeYmd
): PrintDocument {
  const title = t("money_transaction_report");

  const clientsHtml = report.clients
    .map((client) => {
      const rowsHtml = client.rows
        .map((r) => {
          const { difference } = ledgerAmounts(r);
          return `<tr>
            <td class="date">${shortDate(r.date)}</td>
            <td class="amt">${money(r.bill)}</td>
            <td class="amt">${money(r.discount)}</td>
            <td class="amt">${money(r.netBill)}</td>
            <td class="amt">${money(r.paid)}</td>
            <td class="amt">${money(difference)}</td>
          </tr>`;
        })
        .join("");

      const totals = client.rows.reduce(
        (acc, r) => ({
          bill: round2(acc.bill + r.bill),
          discount: round2(acc.discount + r.discount),
          netBill: round2(acc.netBill + r.netBill),
          paid: round2(acc.paid + r.paid),
          difference: round2(acc.difference + ledgerAmounts(r).difference),
        }),
        { bill: 0, discount: 0, netBill: 0, paid: 0, difference: 0 }
      );

      return `<section class="client">
        <table>
          <colgroup>
            <col class="c-date" />
            <col class="c-total" />
            <col class="c-discount" />
            <col class="c-bill" />
            <col class="c-deposit" />
            <col class="c-difference" />
          </colgroup>
          <thead>
            <tr>
              <th class="date">${t("date")}</th>
              <th class="amt">${t("total_amount")}</th>
              <th class="amt">${t("discount")}</th>
              <th class="amt">${t("bill")}</th>
              <th class="amt">${t("deposit")}</th>
              <th class="amt">${t("difference")}</th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
          <tfoot>
            <tr>
              <td class="who">${client.customerId} ${esc(client.customerName ?? "")}</td>
              <td class="amt">${money(totals.bill)}</td>
              <td class="amt">${money(totals.discount)}</td>
              <td class="amt">${money(totals.netBill)}</td>
              <td class="amt">${money(totals.paid)}</td>
              <td class="amt">${money(totals.difference)}</td>
            </tr>
            <tr class="due">
              <td colspan="4"></td>
              <td class="lbl">${t("current_due")}</td>
              <td class="amt">${money(client.currentDue)}</td>
            </tr>
          </tfoot>
        </table>
      </section>`;
    })
    .join("");

  const bodyHtml = `
    <h1>${title} :</h1>
    <p class="range">
      ${t("between")} : ${longDate(toDDMMYYYY(range.from))}
      ${t("and")} ${longDate(toDDMMYYYY(range.to))}
    </p>
    ${
      report.clients.length
        ? `<div class="clients">${clientsHtml}</div>`
        : `<div class="empty">${t("no_records")}</div>`
    }
  `;

  // A client's table breaks freely across pages. A continued table carries no
  // repeated header: the print module suppresses that so the preview and the
  // paper fragment alike.
  const styleCss = `
    h1 { font-size: 18px; margin: 0 0 4px; }
    .range { font-size: 11px; margin: 0 0 6mm; padding-bottom: 3px; border-bottom: 1px solid #999; }
    .empty { font-size: 12px; color: #6b7280; text-align: center; padding: 8mm 0; }
    .client { margin-bottom: 6mm; }
    .client table { width: 100%; table-layout: fixed; border-collapse: collapse; font-size: 9px; }
    .client th, .client td { border: none; border-bottom: 1px solid #999; padding: 3px 4px; overflow-wrap: break-word; }
    .client th { font-weight: 600; }
    /* Without a heading above it, the header row is what a client starts
       with, so it must not be left alone at the foot of a page */
    .client thead { break-after: avoid; page-break-after: avoid; }
    .client tfoot td { font-weight: 600; }
    .client tfoot .due td { border-bottom: none; font-weight: 400; }
    /* The due line belongs to the total row above it: a page boundary must
       take both or neither, never strand the due on its own */
    .client tfoot .due { break-before: avoid; page-break-before: avoid; }
    .client .c-date { width: 16%; }
    .client .c-total { width: 17%; }
    .client .c-discount { width: 15%; }
    .client .c-bill { width: 17%; }
    .client .c-deposit { width: 17%; }
    .client .c-difference { width: 18%; }
    .client .date { text-align: left; }
    .client .who { text-align: left; }
    .client .lbl { text-align: right; }
    .client .amt { text-align: right; }
  `;

  return { title, bodyHtml, styleCss };
}
