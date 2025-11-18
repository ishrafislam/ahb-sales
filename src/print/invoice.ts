import type { Invoice } from "../main/data";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { BUSINESS_NAME, PRINT_WINDOW_DELAY } from "../constants/business";
import { toDDMMYYYY } from "../utils/date";

function fmt(n: number): string {
  return Number.isFinite(n) ? n.toFixed(2) : "0.00";
}

export type ProductInfo = { name: string; unit: string };

export function printInvoice(
  inv: Invoice,
  opts: {
    businessName?: string;
    customerName: string;
    products: Record<number, ProductInfo>;
  }
) {
  const business = opts.businessName ?? BUSINESS_NAME;
  const date = toDDMMYYYY(inv.date);
  const linesHtml = inv.lines
    .map((ln) => {
      const info = opts.products[ln.productId];
      const name = info?.name ?? String(ln.productId);
      const unit = info?.unit ?? ln.unit ?? "";
      return `<tr>
        <td style="text-align:center">${ln.sn}</td>
        <td>${name}</td>
        <td style="text-align:center">${ln.quantity}</td>
        <td style="text-align:center">${unit}</td>
        <td style="text-align:right">${fmt(ln.rate)}</td>
        <td style="text-align:right">${fmt(ln.lineTotal)}</td>
      </tr>`;
    })
    .join("");

  const style = `
    <style>
      * { box-sizing: border-box; }
      body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Noto Sans, Ubuntu, Cantarell, Helvetica Neue, Arial, "Apple Color Emoji", "Segoe UI Emoji"; padding: 16px; }
      h1 { font-size: 20px; margin: 0 0 6px; text-align: center; }
      .meta { display:flex; justify-content: space-between; margin: 8px 0 12px; font-size: 12px; }
      table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 6px; }
      th, td { border: 1px solid #e5e7eb; padding: 6px 8px; }
      th { background: #f8fafc; text-align: left; }
      .sum { width: 280px; margin-left: auto; }
      .sum table { width: 100%; }
      .sum td { border: none; padding: 4px 0; }
      .sum .label { color: #374151; }
      .sum .val { text-align: right; font-weight: 600; }
      .notes { margin-top: 8px; font-size: 12px; color: #374151; }
      .footer { margin-top: 24px; display:flex; justify-content: space-between; font-size: 12px; }
      @media print { body { padding: 0; } }
    </style>
  `;
  const head = `<head><meta charset="utf-8" />${style}<title>Invoice #${inv.no}</title></head>`;
  const body = `
    <body>
      <h1>${business}</h1>
      <div class="meta">
        <div><strong>Invoice #</strong> ${inv.no}</div>
        <div><strong>Date</strong> ${date}</div>
        <div><strong>Customer</strong> ${opts.customerName}</div>
      </div>
      <table>
        <thead>
          <tr>
            <th style="text-align:center">#</th>
            <th>Product</th>
            <th style="text-align:center">Qty</th>
            <th style="text-align:center">Unit</th>
            <th style="text-align:right">Rate</th>
            <th style="text-align:right">Total</th>
          </tr>
        </thead>
        <tbody>${linesHtml || `<tr><td colspan="6" style="text-align:center;color:#6b7280">No items</td></tr>`}</tbody>
      </table>
      <div class="sum">
        <table>
          <tr><td class="label">Subtotal</td><td class="val">${fmt(inv.totals.subtotal)}</td></tr>
          <tr><td class="label">Discount</td><td class="val">${fmt(inv.discount)}</td></tr>
          <tr><td class="label">Net</td><td class="val">${fmt(inv.totals.net)}</td></tr>
          <tr><td class="label">Paid</td><td class="val">${fmt(inv.paid)}</td></tr>
          <tr><td class="label">Due</td><td class="val">${fmt(Math.max(0, inv.totals.net - inv.paid))}</td></tr>
          <tr><td class="label">Previous Due</td><td class="val">${fmt(inv.previousDue)}</td></tr>
          <tr><td class="label">Current Due</td><td class="val">${fmt(inv.currentDue)}</td></tr>
        </table>
      </div>
      ${inv.notes ? `<div class="notes"><strong>Notes:</strong> ${inv.notes}</div>` : ""}
      <div class="footer">
        <div>Signature (Issuer)</div>
        <div>Signature (Receiver)</div>
      </div>
    </body>
  `;

  const w = window.open("", "_blank");
  if (!w) return;
  w.document.open();
  w.document.write(`<html>${head}${body}</html>`);
  w.document.close();
  w.focus();
  setTimeout(() => {
    w.print();
    w.close();
  }, PRINT_WINDOW_DELAY);
}
