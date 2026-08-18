import type { Product } from "../main/data";
import { t } from "../i18n";
import type { PrintDocument } from "./document";
import { digits, esc, quantity } from "./format";

/**
 * The product roll as a print document: id, name and the stock each product
 * stands at, poured down the left half of the page and continued down the
 * right. The order is the one the caller hands over.
 */
export function buildProductListDocument(products: Product[]): PrintDocument {
  const title = t("v2_product_list");

  const rowsHtml = products
    .map(
      (p) => `<tr>
        <td class="id">${digits(p.id)}</td>
        <td class="name">${esc(p.nameBn ?? "")}</td>
        <td class="stock">${quantity(Number(p.stock) || 0)}</td>
        <td class="unit">${esc(p.unit ?? "")}</td>
      </tr>`
    )
    .join("");

  const bodyHtml = `
    <h1>${title} :</h1>
    ${
      products.length
        ? `<table>
            <colgroup>
              <col class="c-id" />
              <col class="c-name" />
              <col class="c-stock" />
              <col class="c-unit" />
            </colgroup>
            <thead>
              <tr>
                <th class="id">${t("id")}</th>
                <th class="name">${t("name")}</th>
                <th class="stock"></th>
                <th class="unit">${t("current_stock")}</th>
              </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
          </table>`
        : `<div class="empty">${t("no_records")}</div>`
    }
  `;

  // The stock ranges right and its unit ranges left, so the figures end on a
  // common vertical however long the unit reads. Only the unit column is
  // headed — the figures share that heading rather than carrying one of their
  // own. Widths live on the colgroup, which is where `table-layout: fixed`
  // reads them from.
  //
  // Rows carry no rules — only the header band does, as in the reference.
  const styleCss = `
    h1 { font-size: 18px; margin: 0 0 8px; column-span: all; }
    .empty { font-size: 12px; color: #6b7280; text-align: center; padding: 8mm 0; }
    table { width: 100%; table-layout: fixed; border-collapse: collapse; font-size: 10px; }
    th, td { border: none; padding: 2px 4px; overflow-wrap: break-word; }
    th { font-weight: 600; white-space: nowrap; border-top: 1px solid #999; border-bottom: 1px solid #999; }
    .c-id { width: 15%; }
    .c-name { width: 45%; }
    .c-stock { width: 15%; }
    .c-unit { width: 25%; }
    .id { text-align: left; }
    .name { text-align: left; }
    .stock { text-align: right; white-space: nowrap; padding-right: 2px; }
    .unit { text-align: left; white-space: nowrap; padding-left: 2px; }
  `;

  return { title, bodyHtml, styleCss, columns: 2 };
}
