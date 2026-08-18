import type { Customer } from "../main/data";
import { t } from "../i18n";
import type { PrintDocument } from "./document";
import { digits, esc, money } from "./format";

/**
 * The customer roll as a print document: id, name and the due each customer
 * stands at, poured down the left half of the page and continued down the
 * right. The order is the one the caller hands over.
 */
export function buildCustomerListDocument(
  customers: Customer[]
): PrintDocument {
  const title = t("customer_list");
  const currency = t("currency_taka");

  const rowsHtml = customers
    .map((c) => {
      const due = Number(c.outstanding) || 0;
      return `<tr>
        <td class="id">${digits(c.id)}</td>
        <td class="name">${esc(c.nameBn ?? "")}</td>
        <td class="due">${due < 0 ? "-" : ""}${currency} ${money(Math.abs(due))}</td>
      </tr>`;
    })
    .join("");

  const bodyHtml = `
    <h1>${title} :</h1>
    ${
      customers.length
        ? `<table>
            <colgroup>
              <col class="c-id" />
              <col class="c-name" />
              <col class="c-due" />
            </colgroup>
            <thead>
              <tr>
                <th class="id">${t("id")}</th>
                <th class="name">${t("name")}</th>
                <th class="due">${t("due")}</th>
              </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
          </table>`
        : `<div class="empty">${t("no_records")}</div>`
    }
  `;

  // The due ranges right, sign and all, so the figures end on a common
  // vertical. Widths live on the colgroup rather than the cells, which is
  // where `table-layout: fixed` reads them from.
  //
  // Rows carry no rules — only the header band does, as in the reference.
  const styleCss = `
    h1 { font-size: 18px; margin: 0 0 8px; column-span: all; }
    .empty { font-size: 12px; color: #6b7280; text-align: center; padding: 8mm 0; }
    table { width: 100%; table-layout: fixed; border-collapse: collapse; font-size: 10px; }
    th, td { border: none; padding: 2px 4px; overflow-wrap: break-word; }
    th { font-weight: 600; white-space: nowrap; border-top: 1px solid #999; border-bottom: 1px solid #999; }
    .c-id { width: 15%; }
    .c-name { width: 49%; }
    .c-due { width: 36%; }
    .id { text-align: left; }
    .name { text-align: left; }
    .due { text-align: right; white-space: nowrap; }
  `;

  return { title, bodyHtml, styleCss, columns: 2 };
}
