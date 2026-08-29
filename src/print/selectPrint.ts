import { t } from "../i18n";
import type { PrintDocument } from "./document";
import { digits, esc, quantity } from "./format";
import { fmtDate } from "../utils/numerals";
import type { SheetRow } from "../components/dashboard/selectionClipboard";

export type SelectPrintInput = {
  /** ISO timestamp; the sheet only ever shows the day. */
  date: string;
  /** The godown as it was typed, "0" until it is changed. */
  godown: string;
  rows: SheetRow[];
};

/**
 * The picking sheet: a day, a godown, and the items to pull off its shelves.
 *
 * No money on this page — it goes to the store, not the customer, so it
 * carries only what someone has to find and count.
 */
export function buildSelectPrintDocument(
  input: SelectPrintInput
): PrintDocument {
  const title = t("v2_select_print");

  const rowsHtml = input.rows
    .map(
      (r) => `<tr>
        <td class="id">${digits(r.id)}</td>
        <td class="name">${esc(r.name ?? "")}</td>
        <td class="qty">${quantity(Number(r.quantity) || 0)}</td>
        <td class="unit">${esc(r.unit ?? "")}</td>
      </tr>`
    )
    .join("");

  const bodyHtml = `
    <div class="head">
      <span>${t("date")} : ${fmtDate(input.date)}</span>
      <span>${t("v2_godown")} : ${digits(input.godown || "0")}</span>
    </div>
    ${
      input.rows.length
        ? `<table>
            <colgroup>
              <col class="c-id" />
              <col class="c-name" />
              <col class="c-qty" />
              <col class="c-unit" />
            </colgroup>
            <thead>
              <tr>
                <th class="id">${t("id")}</th>
                <th class="name">${t("name")}</th>
                <th class="qty">${t("qty")}</th>
                <th class="unit">${t("unit")}</th>
              </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
          </table>`
        : `<div class="empty">${t("no_records")}</div>`
    }
  `;

  // Quantity ranges right against its unit, the way the item roll sets them,
  // so the figures line up however long the unit reads.
  const styleCss = `
    .head { display: flex; justify-content: space-between; font-size: 12px; font-weight: 600; margin: 0 0 8px; }
    .empty { font-size: 12px; color: #6b7280; text-align: center; padding: 8mm 0; }
    table { width: 100%; table-layout: fixed; border-collapse: collapse; font-size: 11px; }
    th, td { border: none; padding: 3px 4px; overflow-wrap: break-word; }
    th { font-weight: 600; white-space: nowrap; border-top: 1px solid #999; border-bottom: 1px solid #999; }
    .c-id { width: 15%; }
    .c-name { width: 50%; }
    .c-qty { width: 15%; }
    .c-unit { width: 20%; }
    .id { text-align: left; }
    .name { text-align: left; }
    .qty { text-align: right; white-space: nowrap; padding-right: 2px; }
    .unit { text-align: left; white-space: nowrap; padding-left: 2px; }
  `;

  return { title, bodyHtml, styleCss };
}
