import type { TotalSellReport } from "../main/data";
import { t } from "../i18n";
import type { PrintDocument } from "./document";
import { longDate } from "./format";

/**
 * The total-sell report as a print document: one table per day, poured down
 * the left column then the right. Page size, margins and the column flow
 * itself stay the print module's business.
 */
export function buildTotalSellDocument(
  report: TotalSellReport
): PrintDocument {
  const title = t("v2_total_sell");

  const daysHtml = report.days
    .map((day) => {
      const rows = day.rows
        .map(
          (r) => `<tr>
            <td class="id">${r.productId}</td>
            <td class="name">${r.productNameBn ?? ""}</td>
            <td class="qty">${r.quantity}</td>
            <td class="unit">${r.unit ?? ""}</td>
          </tr>`
        )
        .join("");
      return `<section class="day">
        <h2>${t("date")} : ${longDate(day.date)}</h2>
        <table>
          <colgroup>
            <col class="c-id" />
            <col class="c-name" />
            <col class="c-qty" />
            <col class="c-unit" />
          </colgroup>
          <thead>
            <tr>
              <th class="id">${t("item_id")}</th>
              <th class="name">${t("item_name")}</th>
              <th class="amount" colspan="2">${t("amount")}</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </section>`;
    })
    .join("");

  const bodyHtml = `
    <h1>${title} :</h1>
    ${
      report.days.length
        ? `<div class="days">${daysHtml}</div>`
        : `<div class="empty">${t("no_records")}</div>`
    }
  `;

  // A day's table is free to break across a column or page boundary — only
  // its heading is pinned to the rows below it.
  //
  // Amount is one centred header over two equal cells: the number ranges
  // right and the unit ranges left, so the digits line up on a common
  // vertical no matter how long the unit reads. The widths live on the
  // colgroup because under `table-layout: fixed` a colspan header cell would
  // otherwise decide how that band is divided.
  const styleCss = `
    h1 { font-size: 18px; margin: 0 0 8px; column-span: all; }
    .empty { font-size: 12px; color: #6b7280; text-align: center; padding: 8mm 0; }
    .day { margin-bottom: 6mm; }
    .day h2 { font-size: 12px; font-weight: 600; margin: 0 0 2px; break-after: avoid; page-break-after: avoid; }
    .day table { width: 100%; table-layout: fixed; border-collapse: collapse; font-size: 10px; }
    .day th, .day td { border: none; border-bottom: 1px solid #999; padding: 3px 4px; overflow-wrap: break-word; }
    .day th { font-weight: 600; }
    .day .c-id { width: 16%; }
    .day .c-name { width: 44%; }
    .day .c-qty { width: 20%; }
    .day .c-unit { width: 20%; }
    .day .id { text-align: left; }
    .day .name { text-align: left; }
    .day .amount { text-align: center; }
    .day .qty { text-align: right; white-space: nowrap; padding-right: 2px; }
    .day .unit { text-align: left; white-space: nowrap; padding-left: 2px; }
  `;

  return { title, bodyHtml, styleCss, columns: 2 };
}
