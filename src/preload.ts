// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
import { contextBridge, ipcRenderer } from "electron";
import type { Product, Customer, Invoice } from "./main/data";

type AppAPI = {
  // File operations
  newFile: () => Promise<void>;
  openFile: () => Promise<void>;
  saveFile: () => Promise<void>;
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
  addProduct: (p: unknown) => Promise<unknown>;
  updateProduct: (id: number, patch: unknown) => Promise<unknown>;
  listCustomers: (
    opts?: boolean | { activeOnly?: boolean }
  ) => Promise<Customer[]>;
  addCustomer: (c: unknown) => Promise<unknown>;
  updateCustomer: (id: number, patch: unknown) => Promise<unknown>;
  // Phase 2: Invoices
  postInvoice: (payload: unknown) => Promise<Invoice>;
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
  // Settings
  getPrintSettings: () => Promise<{
    paperSize: "A4" | "A5" | "Letter";
    orientation: "portrait" | "landscape";
    marginMm: number;
    printerDevice?: string;
  }>;
  setPrintSettings: (
    s: Partial<{
      paperSize: "A4" | "A5" | "Letter";
      orientation: "portrait" | "landscape";
      marginMm: number;
      printerDevice?: string;
    }>
  ) => Promise<{
    paperSize: "A4" | "A5" | "Letter";
    orientation: "portrait" | "landscape";
    marginMm: number;
    printerDevice?: string;
  }>;
  onDataChanged: (
    cb: (payload: { kind: string; action: string; id: number }) => void
  ) => () => void;
  // App control
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
  downloadUpdate: () => Promise<boolean>;
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
  saveFile: () => ipcRenderer.invoke("app:save-file"),
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
  addProduct: (p) => ipcRenderer.invoke("data:add-product", p),
  updateProduct: (id, patch) =>
    ipcRenderer.invoke("data:update-product", id, patch),
  listCustomers: (opts) => ipcRenderer.invoke("data:list-customers", opts),
  addCustomer: (c) => ipcRenderer.invoke("data:add-customer", c),
  updateCustomer: (id, patch) =>
    ipcRenderer.invoke("data:update-customer", id, patch),
  postInvoice: (payload) => ipcRenderer.invoke("data:post-invoice", payload),
  listInvoicesByCustomer: (customerId) =>
    ipcRenderer.invoke("data:list-invoices-by-customer", customerId),
  listProductSales: (productId) =>
    ipcRenderer.invoke("data:list-product-sales", productId),
  listProductPurchases: (productId) =>
    ipcRenderer.invoke("data:list-product-purchases", productId),
  postPurchase: (payload) => ipcRenderer.invoke("data:post-purchase", payload),
  reportMoneyTransactionsCustomerRange: (from, to) =>
    ipcRenderer.invoke("report:money-customer-range", from, to),
  reportMoneyTransactionsDayWise: (from, to) =>
    ipcRenderer.invoke("report:money-daywise", from, to),
  reportDailyPayments: (date) =>
    ipcRenderer.invoke("report:daily-payment", date),
  getPrintSettings: () => ipcRenderer.invoke("settings:get-print"),
  setPrintSettings: (s) => ipcRenderer.invoke("settings:set-print", s),
  onDataChanged: (cb) => {
    const listener = (
      _: unknown,
      payload: { kind: string; action: string; id: number }
    ) => cb(payload);
    ipcRenderer.on("data:changed", listener);
    return () => ipcRenderer.removeListener("data:changed", listener);
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
  downloadUpdate: () => ipcRenderer.invoke("app:download-update"),
  onUpdateEvent: (cb) => {
    const wrap = (kind: string) => (_: unknown, data?: unknown) =>
      cb({ kind, data });
    const pairs: Array<[string, ReturnType<typeof wrap>]> = [
      ["update:checking", wrap("checking")],
      ["update:available", wrap("available")],
      ["update:available", wrap("available")],
      ["update:not-available", wrap("not-available")],
      ["update:error", wrap("error")],
      ["update:downloaded", wrap("downloaded")],
      ["update:progress", wrap("progress")],
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
