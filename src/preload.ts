// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
import { contextBridge, ipcRenderer } from "electron";
import type { Product, Customer, Invoice } from "./main/data";
import type {
  PrintDocument,
  PrintJob,
  PrintMargins,
} from "./print/document";

type AppAPI = {
  // File operations
  newFile: () => Promise<void>;
  openFile: () => Promise<void>;
  saveFileAs: () => Promise<void>;
  getFileInfo: () => Promise<{ path: string | null; isDirty: boolean }>;
  onFileInfo: (
    cb: (info: { path: string | null; isDirty: boolean }) => void
  ) => () => void;
  // Language operations
  getLanguage: () => Promise<"bn" | "en">;
  setLanguage: (lang: "bn" | "en") => Promise<void>;
  onLanguageChanged: (cb: (lang: "bn" | "en") => void) => () => void;
  // Document notification
  onDocumentChanged: (cb: () => void) => () => void;
  // Data operations (Phase 1)
  listProducts: (
    opts?: boolean | { activeOnly?: boolean }
  ) => Promise<Product[]>;
  getProductById: (id: number) => Promise<Product | null>;
  addProduct: (p: unknown) => Promise<unknown>;
  updateProduct: (id: number, patch: unknown) => Promise<unknown>;
  listCustomers: (
    opts?: boolean | { activeOnly?: boolean }
  ) => Promise<Customer[]>;
  getCustomerById: (id: number) => Promise<Customer | null>;
  addCustomer: (c: unknown) => Promise<unknown>;
  updateCustomer: (id: number, patch: unknown) => Promise<unknown>;
  // Phase 2: Invoices
  postInvoice: (payload: unknown) => Promise<Invoice>;
  updateInvoice: (id: string, payload: unknown) => Promise<Invoice>;
  getInvoiceById: (id: string) => Promise<Invoice | null>;
  addInvoicePayment: (
    id: string,
    payload: { amount: number; notes?: string }
  ) => Promise<Invoice>;
  updateInvoicePayment: (
    id: string,
    payload: { amount: number; notes?: string }
  ) => Promise<Invoice>;
  // Phase 3: History/listings
  listInvoicesByCustomer: (customerId: number) => Promise<Invoice[]>;
  listProductSales: (
    productId: number
  ) => Promise<import("./main/data").ProductSaleLine[]>;
  listProductPurchases: (
    productId: number
  ) => Promise<import("./main/data").ProductPurchaseLine[]>;
  // Phase 3: Purchase entry
  postPurchase: (payload: unknown) => Promise<import("./main/data").Purchase>;
  updatePurchase: (
    id: string,
    payload: unknown
  ) => Promise<import("./main/data").Purchase>;
  // Payments
  recordPayment: (customerId: number, amount: number) => Promise<void>;
  // Phase 4: Reports
  reportMoneyTransactionsCustomerRange: (
    from: string,
    to: string
  ) => Promise<import("./main/data").MoneyTxnCustomerRange>;
  reportMoneyTransactionsDayWise: (
    from: string,
    to: string
  ) => Promise<import("./main/data").MoneyTxnDayWise>;
  reportDailyPayments: (
    date: string
  ) => Promise<import("./main/data").DailyPaymentReport>;
  reportTotalSell: (
    from: string,
    to: string
  ) => Promise<import("./main/data").TotalSellReport>;
  reportClientLedger: (
    from: string,
    to: string,
    customerId?: number
  ) => Promise<import("./main/data").ClientLedgerReport>;
  onDataChanged: (
    cb: (payload: { kind: string; action: string; id: number }) => void
  ) => () => void;
  // App control
  openCustomerHistory: (customerId?: number) => Promise<void>;
  openPaymentWindow: (invoiceId: string) => Promise<void>;
  openEditPaymentWindow: (invoiceId: string) => Promise<void>;
  openCustomersWindow: () => Promise<void>;
  openProductsWindow: () => Promise<void>;
  openPurchaseEntryWindow: (productId?: number) => Promise<void>;
  openPurchaseHistoryWindow: (productId?: number) => Promise<void>;
  openSalesHistoryWindow: (productId?: number) => Promise<void>;
  openTotalSellWindow: () => Promise<void>;
  openDailyReportWindow: () => Promise<void>;
  openPaymentReportWindow: () => Promise<void>;
  openClientSelectWindow: () => Promise<void>;
  openSelectPrintWindow: () => Promise<void>;
  writeClipboardText: (text: string) => Promise<void>;
  readClipboardText: () => Promise<string>;
  openRecordDetailsWindow: (
    kind: "customer" | "product",
    id: number
  ) => Promise<void>;
  openClientReportWindow: (customerId?: number) => Promise<void>;
  // Printing
  openPrintPreview: (doc: PrintDocument) => Promise<string>;
  getPrintJob: (id: string) => Promise<PrintJob | null>;
  setPrintMargins: (
    id: string,
    margins: PrintMargins
  ) => Promise<PrintMargins | null>;
  onPrintMarginsChanged: (
    cb: (payload: { id: string; margins: PrintMargins }) => void
  ) => () => void;
  openPrintMargins: (jobId: string) => Promise<void>;
  runPrint: (
    id: string,
    margins: PrintMargins
  ) => Promise<{ success: boolean; reason?: string }>;
  onLoadHistoryCustomer: (cb: (id: number) => void) => () => void;
  onOpenSettings: (cb: () => void) => () => void;
  onOpenAbout: (cb: () => void) => () => void;
  getAppVersion: () => Promise<string>;
  getAppName: () => Promise<string>;
  getRuntimeInfo: () => Promise<{
    versions: { electron: string; chrome: string; node: string };
    buildDate?: string;
    commitSha?: string;
  }>;
  // Updates
  checkForUpdates: () => Promise<boolean>;
  restartAndInstall: () => Promise<boolean>;
  onUpdateEvent: (
    cb: (payload: { kind: string; data?: unknown }) => void
  ) => () => void;
  // Theme
  getTheme: () => Promise<{ source: string; effective: string }>;
  setTheme: (
    source: "system" | "light" | "dark"
  ) => Promise<{ source: string; effective: string }>;
  onThemeChanged: (
    cb: (payload: { source: string; effective: string }) => void
  ) => () => void;
};

const api: AppAPI = {
  newFile: () => ipcRenderer.invoke("app:new-file"),
  openFile: () => ipcRenderer.invoke("app:open-file"),
  saveFileAs: () => ipcRenderer.invoke("app:save-file-as"),
  getFileInfo: () => ipcRenderer.invoke("app:get-file-info"),
  onFileInfo: (cb) => {
    const listener = (
      _: unknown,
      info: { path: string | null; isDirty: boolean }
    ) => cb(info);
    ipcRenderer.on("app:file-info", listener);
    return () => ipcRenderer.removeListener("app:file-info", listener);
  },
  getLanguage: () => ipcRenderer.invoke("app:get-language"),
  setLanguage: (lang) => ipcRenderer.invoke("app:set-language", lang),
  onLanguageChanged: (cb) => {
    const listener = (_: unknown, lang: "bn" | "en") => cb(lang);
    ipcRenderer.on("app:language-changed", listener);
    return () => ipcRenderer.removeListener("app:language-changed", listener);
  },
  onDocumentChanged: (cb) => {
    const listener = () => cb();
    ipcRenderer.on("app:document-changed", listener);
    return () => ipcRenderer.removeListener("app:document-changed", listener);
  },
  listProducts: (opts) => ipcRenderer.invoke("data:list-products", opts),
  getProductById: (id) => ipcRenderer.invoke("data:get-product", id),
  addProduct: (p) => ipcRenderer.invoke("data:add-product", p),
  updateProduct: (id, patch) =>
    ipcRenderer.invoke("data:update-product", id, patch),
  listCustomers: (opts) => ipcRenderer.invoke("data:list-customers", opts),
  getCustomerById: (id) => ipcRenderer.invoke("data:get-customer", id),
  addCustomer: (c) => ipcRenderer.invoke("data:add-customer", c),
  updateCustomer: (id, patch) =>
    ipcRenderer.invoke("data:update-customer", id, patch),
  postInvoice: (payload) => ipcRenderer.invoke("data:post-invoice", payload),
  updateInvoice: (id, payload) =>
    ipcRenderer.invoke("data:update-invoice", id, payload),
  getInvoiceById: (id) => ipcRenderer.invoke("data:get-invoice", id),
  addInvoicePayment: (id, payload) =>
    ipcRenderer.invoke("data:add-invoice-payment", id, payload),
  updateInvoicePayment: (id, payload) =>
    ipcRenderer.invoke("data:update-invoice-payment", id, payload),
  listInvoicesByCustomer: (customerId) =>
    ipcRenderer.invoke("data:list-invoices-by-customer", customerId),
  listProductSales: (productId) =>
    ipcRenderer.invoke("data:list-product-sales", productId),
  listProductPurchases: (productId) =>
    ipcRenderer.invoke("data:list-product-purchases", productId),
  postPurchase: (payload) => ipcRenderer.invoke("data:post-purchase", payload),
  updatePurchase: (id, payload) =>
    ipcRenderer.invoke("data:update-purchase", id, payload),
  recordPayment: (customerId, amount) =>
    ipcRenderer.invoke("data:record-payment", customerId, amount),
  reportMoneyTransactionsCustomerRange: (from, to) =>
    ipcRenderer.invoke("report:money-customer-range", from, to),
  reportMoneyTransactionsDayWise: (from, to) =>
    ipcRenderer.invoke("report:money-daywise", from, to),
  reportDailyPayments: (date) =>
    ipcRenderer.invoke("report:daily-payment", date),
  reportTotalSell: (from, to) =>
    ipcRenderer.invoke("report:total-sell", from, to),
  reportClientLedger: (from, to, customerId) =>
    ipcRenderer.invoke("report:client-ledger", from, to, customerId),
  onDataChanged: (cb) => {
    const listener = (
      _: unknown,
      payload: { kind: string; action: string; id: number }
    ) => cb(payload);
    ipcRenderer.on("data:changed", listener);
    return () => ipcRenderer.removeListener("data:changed", listener);
  },
  openCustomerHistory: (customerId) =>
    ipcRenderer.invoke("window:open-customer-history", customerId),
  openPaymentWindow: (invoiceId) =>
    ipcRenderer.invoke("window:open-payment", invoiceId),
  openEditPaymentWindow: (invoiceId) =>
    ipcRenderer.invoke("window:open-edit-payment", invoiceId),
  openCustomersWindow: () => ipcRenderer.invoke("window:open-customers"),
  openProductsWindow: () => ipcRenderer.invoke("window:open-products"),
  openPurchaseEntryWindow: (productId) =>
    ipcRenderer.invoke("window:open-purchase-entry", productId),
  openPurchaseHistoryWindow: (productId) =>
    ipcRenderer.invoke("window:open-purchase-history", productId),
  openSalesHistoryWindow: (productId) =>
    ipcRenderer.invoke("window:open-sales-history", productId),
  openTotalSellWindow: () => ipcRenderer.invoke("window:open-total-sell"),
  openDailyReportWindow: () => ipcRenderer.invoke("window:open-daily-report"),
  openPaymentReportWindow: () =>
    ipcRenderer.invoke("window:open-payment-report"),
  openClientSelectWindow: () => ipcRenderer.invoke("window:open-client-select"),
  openSelectPrintWindow: () => ipcRenderer.invoke("window:open-select-print"),
  writeClipboardText: (text) => ipcRenderer.invoke("clipboard:write", text),
  readClipboardText: () => ipcRenderer.invoke("clipboard:read"),
  openRecordDetailsWindow: (kind, id) =>
    ipcRenderer.invoke("window:open-record-details", kind, id),
  openClientReportWindow: (customerId) =>
    ipcRenderer.invoke("window:open-client-report", customerId),
  openPrintPreview: (doc) => ipcRenderer.invoke("print:create-job", doc),
  getPrintJob: (id) => ipcRenderer.invoke("print:get-job", id),
  setPrintMargins: (id, margins) =>
    ipcRenderer.invoke("print:set-margins", id, margins),
  onPrintMarginsChanged: (cb) => {
    const listener = (
      _: unknown,
      payload: { id: string; margins: PrintMargins }
    ) => cb(payload);
    ipcRenderer.on("print:margins-changed", listener);
    return () =>
      ipcRenderer.removeListener("print:margins-changed", listener);
  },
  openPrintMargins: (jobId) =>
    ipcRenderer.invoke("window:open-print-margins", jobId),
  runPrint: (id, margins) => ipcRenderer.invoke("print:run", id, margins),
  onLoadHistoryCustomer: (cb) => {
    const listener = (_: unknown, id: number) => cb(id);
    ipcRenderer.on("history:load-customer", listener);
    return () =>
      ipcRenderer.removeListener("history:load-customer", listener);
  },
  onOpenSettings: (cb) => {
    const listener = () => cb();
    ipcRenderer.on("app:open-settings", listener);
    return () => ipcRenderer.removeListener("app:open-settings", listener);
  },
  onOpenAbout: (cb) => {
    const listener = () => cb();
    ipcRenderer.on("app:open-about", listener);
    return () => ipcRenderer.removeListener("app:open-about", listener);
  },
  getAppVersion: () => ipcRenderer.invoke("app:get-version"),
  getAppName: () => ipcRenderer.invoke("app:get-name"),
  getRuntimeInfo: () => ipcRenderer.invoke("app:get-runtime-info"),
  checkForUpdates: () => ipcRenderer.invoke("app:check-for-updates"),
  restartAndInstall: () => ipcRenderer.invoke("app:restart-and-install"),
  onUpdateEvent: (cb) => {
    const wrap = (kind: string) => (_: unknown, data?: unknown) =>
      cb({ kind, data });
    const pairs: Array<[string, ReturnType<typeof wrap>]> = [
      ["update:checking", wrap("checking")],
      ["update:available", wrap("available")],
      ["update:not-available", wrap("not-available")],
      ["update:error", wrap("error")],
      ["update:downloaded", wrap("downloaded")],
    ];
    for (const [ch, fn] of pairs) ipcRenderer.on(ch, fn);
    return () => {
      for (const [ch, fn] of pairs) ipcRenderer.removeListener(ch, fn);
    };
  },
  getTheme: () => ipcRenderer.invoke("settings:get-theme"),
  setTheme: (source) => ipcRenderer.invoke("settings:set-theme", source),
  onThemeChanged: (cb) => {
    const listener = (
      _: unknown,
      payload: { source: string; effective: string }
    ) => cb(payload);
    ipcRenderer.on("app:theme-changed", listener);
    return () => ipcRenderer.removeListener("app:theme-changed", listener);
  },
};

declare global {
  interface Window {
    ahb: AppAPI;
  }
}

contextBridge.exposeInMainWorld("ahb", api);
