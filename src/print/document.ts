/**
 * Print document model shared by the preview window and the real print job.
 *
 * Deliberately free of Electron and DOM APIs so it can be unit tested and
 * imported from either process.
 */
import {
  A4_HEIGHT_MM,
  A4_WIDTH_MM,
  MAX_MARGIN_MM,
  MAX_PREVIEW_PAGES,
  MIN_MARGIN_MM,
} from "../constants/business";

/** Page margins in millimetres. */
export type PrintMargins = {
  top: number;
  bottom: number;
  left: number;
  right: number;
};

export type PrintDocument = {
  title: string;
  /** The caller's markup, without <html>/<head>/<body> wrappers. */
  bodyHtml: string;
  /** The caller's CSS, scoped to its own markup. */
  styleCss?: string;
  pageSize?: "A4";
  orientation?: "portrait" | "landscape";
  margins?: Partial<PrintMargins>;
};

export type PrintJob = {
  doc: PrintDocument;
  margins: PrintMargins;
};

export const DEFAULT_MARGINS: PrintMargins = {
  top: 12,
  bottom: 12,
  left: 12,
  right: 12,
};

const FONT_STACK =
  'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Noto Sans", "Noto Sans Bengali", Ubuntu, Cantarell, "Helvetica Neue", Arial, sans-serif';

function clampMargin(value: unknown, fallback: number): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(MAX_MARGIN_MM, Math.max(MIN_MARGIN_MM, n));
}

export function normalizeMargins(m?: Partial<PrintMargins>): PrintMargins {
  return {
    top: clampMargin(m?.top, DEFAULT_MARGINS.top),
    bottom: clampMargin(m?.bottom, DEFAULT_MARGINS.bottom),
    left: clampMargin(m?.left, DEFAULT_MARGINS.left),
    right: clampMargin(m?.right, DEFAULT_MARGINS.right),
  };
}

/** CSS pixels per millimetre at the 96dpi CSS reference resolution. */
export function mmToPx(mm: number): number {
  return (mm * 96) / 25.4;
}

export function pageSizeMm(doc: Pick<PrintDocument, "orientation">): {
  width: number;
  height: number;
} {
  return doc.orientation === "landscape"
    ? { width: A4_HEIGHT_MM, height: A4_WIDTH_MM }
    : { width: A4_WIDTH_MM, height: A4_HEIGHT_MM };
}

/** The area left for content once the margins are taken out. */
export function pageContentSizeMm(
  doc: Pick<PrintDocument, "orientation">,
  margins: PrintMargins
): { width: number; height: number } {
  const page = pageSizeMm(doc);
  return {
    width: Math.max(0, page.width - margins.left - margins.right),
    height: Math.max(0, page.height - margins.top - margins.bottom),
  };
}

/** How many sheets a document of this height needs. Always at least one. */
export function pageCountFor(
  contentHeightPx: number,
  pageHeightPx: number
): number {
  if (!Number.isFinite(contentHeightPx) || contentHeightPx <= 0) return 1;
  if (!Number.isFinite(pageHeightPx) || pageHeightPx <= 0) return 1;
  const pages = Math.ceil(contentHeightPx / pageHeightPx);
  return Math.min(MAX_PREVIEW_PAGES, Math.max(1, pages));
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Build the full print document. The margins become body padding rather than
 * `@page` margins so that the preview and the paper agree, and so the print
 * call can ask the printer for no margins of its own.
 */
export function composePrintHtml(
  doc: PrintDocument,
  margins: PrintMargins
): string {
  const m = normalizeMargins(margins);
  const orientation = doc.orientation === "landscape" ? "landscape" : "portrait";
  const page = pageSizeMm(doc);
  const base = `
    @page { size: A4 ${orientation}; margin: 0; }
    html, body { margin: 0; }
    * { box-sizing: border-box; }
    body {
      width: ${page.width}mm;
      padding: ${m.top}mm ${m.right}mm ${m.bottom}mm ${m.left}mm;
      font-family: ${FONT_STACK};
      font-size: 12px;
      color: #000;
      background: #fff;
    }
    table { width: 100%; border-collapse: collapse; }
    tr, .avoid-break { break-inside: avoid; page-break-inside: avoid; }
  `;
  const extra = doc.styleCss ? `<style>${doc.styleCss}</style>` : "";
  return [
    "<!DOCTYPE html>",
    '<html><head><meta charset="utf-8" />',
    `<title>${escapeHtml(doc.title)}</title>`,
    `<style>${base}</style>`,
    extra,
    "</head><body>",
    doc.bodyHtml,
    "</body></html>",
  ].join("");
}
