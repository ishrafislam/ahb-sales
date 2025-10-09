// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
import { contextBridge, ipcRenderer } from "electron";

type AppAPI = {
  // File operations
  newFile: () => Promise<void>;
  openFile: () => Promise<void>;
  saveFile: () => Promise<void>;
  saveFileAs: () => Promise<void>;
  // Language operations
  getLanguage: () => Promise<"bn" | "en">;
  setLanguage: (lang: "bn" | "en") => Promise<void>;
  onLanguageChanged: (cb: (lang: "bn" | "en") => void) => () => void;
  // Document notification
  onDocumentChanged: (cb: () => void) => () => void;
  // Data operations (Phase 1)
  listProducts: (
    opts?: boolean | { activeOnly?: boolean }
  ) => Promise<unknown[]>;
  addProduct: (p: unknown) => Promise<unknown>;
  updateProduct: (id: number, patch: unknown) => Promise<unknown>;
  listCustomers: (
    opts?: boolean | { activeOnly?: boolean }
  ) => Promise<unknown[]>;
  addCustomer: (c: unknown) => Promise<unknown>;
  updateCustomer: (id: number, patch: unknown) => Promise<unknown>;
  onDataChanged: (
    cb: (payload: { kind: string; action: string; id: number }) => void
  ) => () => void;
};

const api: AppAPI = {
  newFile: () => ipcRenderer.invoke("app:new-file"),
  openFile: () => ipcRenderer.invoke("app:open-file"),
  saveFile: () => ipcRenderer.invoke("app:save-file"),
  saveFileAs: () => ipcRenderer.invoke("app:save-file-as"),
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
  onDataChanged: (cb) => {
    const listener = (
      _: unknown,
      payload: { kind: string; action: string; id: number }
    ) => cb(payload);
    ipcRenderer.on("data:changed", listener);
    return () => ipcRenderer.removeListener("data:changed", listener);
  },
};

declare global {
  interface Window {
    ahb: AppAPI;
  }
}

contextBridge.exposeInMainWorld("ahb", api);
