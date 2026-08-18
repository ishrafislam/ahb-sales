import type { Invoice } from "../main/data";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { BUSINESS_PHONES, PRINT_WINDOW_DELAY } from "../constants/business";
import { t, currentLang } from "../i18n";
import {
  composePrintHtml,
  DEFAULT_MARGINS,
  type PrintDocument,
} from "./document";
import { toBengaliDigits } from "./format";

function fmt(n: number): string {
  return Number.isFinite(n) ? n.toFixed(2) : "0.00";
}

function fmtReceiptDate(
  isoOrYmd: string,
  { shortYear = false, bengali = false } = {}
): string {
  const ymd = isoOrYmd.slice(0, 10); // "YYYY-MM-DD"
  const [y, m, d] = ymd.split("-");
  const year = shortYear ? y.slice(2) : y;
  const s = `${d}/${m}/${year}`;
  return bengali ? toBengaliDigits(s) : s;
}

export type ProductInfo = { name: string; unit: string };

export type InvoiceDocumentOptions = {
  businessName?: string;
  customerName: string;
  products: Record<number, ProductInfo>;
  previousDueDate?: string;
};

/**
 * The receipt as a print document. Page size, page margins and the outer
 * body are the print module's business (see ./document.ts) — this only
 * describes the receipt itself, so it can go to the preview window or
 * straight to a printer without the markup existing twice.
 */
export function buildInvoiceDocument(
  inv: Invoice,
  opts: InvoiceDocumentOptions
): PrintDocument {
  const isBn = currentLang.value === "bn";
  const fontFamily = isBn
    ? "'Noto Sans Bengali', 'SolaimanLipi', 'Siyam Rupali', Arial, sans-serif"
    : "'Courier New', Courier, monospace";

  const linesHtml = inv.lines
    .map((ln) => {
      const info = opts.products[ln.productId];
      const name = info?.name ?? String(ln.productId);
      const unit = info?.unit ?? "";
      const qtyUnit = `${ln.quantity} ${unit}`.trim();
      return `<tr>
        <td>${name}</td>
        <td style="text-align:center">${qtyUnit}</td>
        <td style="text-align:right">${fmt(ln.lineTotal)}</td>
      </tr>`;
    })
    .join("");

  const prevDateStr = opts.previousDueDate
    ? ` (${fmtReceiptDate(opts.previousDueDate, { bengali: isBn })})`
    : "";

  const grandTotal = inv.totals.net + inv.previousDue;

  // The receipt keeps its narrow column but sits at the top-left of the
  // content box, so the margins the user sets are what position it.
  const styleCss = `
    .receipt { width: 72mm; font-family: ${fontFamily}; font-size: 10px; }
    .receipt h1 { font-size: 13px; margin: 0 0 2px; text-align: center; }
    .receipt .addr { font-size: 9px; text-align: center; margin: 1px 0; }
    .receipt hr { border: none; border-top: 1px solid #000; margin: 3px 0; }
    .receipt .meta-row { display: flex; justify-content: space-between; font-size: 10px; margin: 2px 0; }
    .receipt table { width: 100%; border-collapse: collapse; font-size: 10px; }
    .receipt td { padding: 1px 1px; vertical-align: top; }
    .receipt .sum td { padding: 1px 0; border-bottom: 1px dashed #000; }
    .receipt .sum .val { text-align: right; font-weight: 600; white-space: nowrap; }
    .receipt .notes { margin-top: 6px; font-size: 9px; }
  `;

  const bodyHtml = `
    <div class="receipt">
      <h1>${opts.businessName ?? t("business_name")}</h1>
      <div class="addr">${t("business_address")}</div>
      <div class="addr">${t("phone_label")} : ${BUSINESS_PHONES[0]}</div>
      <div class="addr">${BUSINESS_PHONES[1]}</div>
      <hr />

      <div class="meta-row">
        <span>${isBn ? toBengaliDigits(String(inv.customerId ?? inv.no)) : (inv.customerId ?? inv.no)}–${inv.customerId != null ? ` ${opts.customerName}` : ""}</span>
        <span>${fmtReceiptDate(inv.date, { shortYear: true, bengali: isBn })}</span>
      </div>
      <hr />

      <table>
        <tbody>${linesHtml || `<tr><td colspan="3" style="text-align:center;color:#6b7280">${t("no_items")}</td></tr>`}</tbody>
      </table>
      <hr />

      <table class="sum">
        <tr><td>${t("bill")} :</td><td class="val">${fmt(inv.totals.subtotal)}</td></tr>
        <tr><td>${t("discount")} :</td><td class="val">${fmt(inv.discount)}</td></tr>
        <tr><td>${t("net_bill")} :</td><td class="val">${fmt(inv.totals.net)}</td></tr>
        <tr><td>${t("previous_due")} :${prevDateStr}</td><td class="val">${fmt(inv.previousDue)}</td></tr>
        <tr><td>${t("grand_total")} :</td><td class="val">${fmt(grandTotal)}</td></tr>
        <tr><td>${t("deposit")} (${fmtReceiptDate(inv.date, { bengali: isBn })}) :</td><td class="val">${fmt(inv.paid)}</td></tr>
        <tr><td>${t("current_due")} :</td><td class="val">${fmt(inv.currentDue)}</td></tr>
      </table>

      ${inv.notes ? `<div class="notes">${t("notes")}: ${inv.notes}</div>` : ""}
    </div>
  `;

  return {
    title: `${t("invoice_no")} ${inv.no}`,
    bodyHtml,
    styleCss,
  };
}

/**
 * Print the receipt without a preview. Used by the customer history window's
 * per-row Print button.
 */
export function printInvoice(inv: Invoice, opts: InvoiceDocumentOptions) {
  const html = composePrintHtml(
    buildInvoiceDocument(inv, opts),
    DEFAULT_MARGINS
  );

  const w = window.open("", "_blank");
  if (!w) return;
  w.document.open();
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => {
    w.print();
    w.close();
  }, PRINT_WINDOW_DELAY);
}
