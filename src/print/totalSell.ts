import type { TotalSellReport } from "../main/data";
import { t } from "../i18n";
import type { PrintDocument } from "./document";

/**
 * The total-sell report as a print document: one table per day, laid two
 * across the page. Page size and margins stay the print module's business.
 */
export function buildTotalSellDocument(
  report: TotalSellReport,
  range: { fromText: string; toText: string }
): PrintDocument {
  const title = t("v2_total_sell");

  const daysHtml = report.days
    .map((day) => {
      const rows = day.rows
        .map(
          (r) => `<tr>
            <td>${r.productId}</td>
            <td>${r.productNameBn ?? ""}</td>
            <td>${r.quantity}</td>
          </tr>`
        )
        .join("");
      return `<section class="day">
        <h2>${day.date}</h2>
        <table>
          <thead>
            <tr>
              <th>${t("item_id")}</th>
              <th>${t("item_name")}</th>
              <th>${t("amount")}</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
          <tfoot>
            <tr>
              <td colspan="2">${t("total")}</td>
              <td>${day.totalQuantity}</td>
            </tr>
          </tfoot>
        </table>
      </section>`;
    })
    .join("");

  const bodyHtml = `
    <h1>${title}</h1>
    <div class="meta">${t("from")} ${range.fromText} ${t("to")} ${range.toText}</div>
    ${
      report.days.length
        ? `<div class="days">${daysHtml}</div>`
        : `<div class="empty">${t("no_records")}</div>`
    }
  `;

  // Two days per row rather than a newspaper column flow: the preview
  // renders the document continuously and slices it into sheets, and CSS
  // multi-column balances across the whole document, so a column layout
  // would disagree with the printed pages past the first sheet.
  const styleCss = `
    h1 { font-size: 18px; margin: 0 0 4px; }
    .meta { font-size: 12px; color: #555; margin-bottom: 10px; }
    .empty { font-size: 12px; color: #6b7280; text-align: center; padding: 8mm 0; }
    .days { display: grid; grid-template-columns: 1fr 1fr; gap: 6mm; align-items: start; }
    .day { break-inside: avoid; page-break-inside: avoid; }
    .day h2 { font-size: 12px; margin: 0 0 2px; }
    .day table { width: 100%; border-collapse: collapse; font-size: 10px; }
    .day th, .day td { border: 1px solid #999; padding: 2px 4px; text-align: center; }
    .day th { background: #f3f4f6; }
    .day tfoot td { font-weight: 600; }
  `;

  return { title, bodyHtml, styleCss };
}
