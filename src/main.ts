import {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  Menu,
  type MenuItemConstructorOptions,
} from "electron";
// Load environment variables from .env (dev convenience)
import * as dotenv from "dotenv";
try {
  dotenv.config();
} catch (e) {
  // Non-fatal in production packaging where dotenv may be absent
  if (process.env.NODE_ENV !== "production") {
    console.debug("dotenv load skipped or failed:", (e as Error)?.message);
  }
}
import path from "node:path";
import fs from "node:fs";
import started from "electron-squirrel-startup";
import {
  createEmptyDocument,
  decryptJSON,
  encryptJSON,
  type AhbDocument,
} from "./main/crypto";
import { getLanguage, setLanguage, dict } from "./main/i18n";
import {
  initData,
  addProduct,
  updateProduct,
  listProducts,
  addCustomer,
  updateCustomer,
  listCustomers,
  type AhbDataV1,
  postInvoice,
  listInvoicesByCustomer,
  listProductSales,
  listProductPurchases,
  postPurchase,
  reportMoneyTransactionsCustomerRange,
  reportMoneyTransactionsDayWise,
  reportDailyPayments,
} from "./main/data";

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    // Set a comfortable initial size and enforce a sensible minimum
    width: 1280,
    height: 720,
    minWidth: 1280,
    minHeight: 720,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
  });

  // and load the index.html of the app.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`)
    );
  }

  // Open the DevTools.
  mainWindow.webContents.openDevTools();
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on("ready", () => {
  createWindow();
  buildMenu();
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.

// -----------------------
// Phase 0: File + i18n
// -----------------------

let currentFilePath: string | null = null;
let currentDoc: AhbDocument = createEmptyDocument();
let isDirty = false;
// Ensure data container exists
if (!currentDoc.data || typeof currentDoc.data !== "object") {
  (currentDoc as AhbDocument).data = initData();
}

function broadcastFileInfo() {
  notifyAll("app:file-info", { path: currentFilePath, isDirty });
}

function notifyAll(channel: string, ...args: unknown[]) {
  BrowserWindow.getAllWindows().forEach((w) =>
    w.webContents.send(channel, ...args)
  );
}

async function handleNewFile() {
  const res = await dialog.showSaveDialog({
    defaultPath: "untitled.ahbs",
    filters: [{ name: "AHB Sales Files", extensions: ["ahbs"] }],
  });
  if (res.canceled || !res.filePath) return;
  currentFilePath = res.filePath.endsWith(".ahbs")
    ? res.filePath
    : `${res.filePath}.ahbs`;
  currentDoc = createEmptyDocument();
  // backfill data container if missing
  if (!currentDoc.data || typeof currentDoc.data !== "object") {
    (currentDoc as AhbDocument).data = initData();
  }
  writeCurrentTo(currentFilePath);
  notifyAll("app:document-changed");
  isDirty = false;
  buildMenu();
  broadcastFileInfo();
}

async function handleOpenFile() {
  const res = await dialog.showOpenDialog({
    properties: ["openFile"],
    filters: [{ name: "AHB Sales Files", extensions: ["ahbs"] }],
  });
  if (res.canceled || res.filePaths.length === 0) return;
  const filePath = res.filePaths[0];
  try {
    const buf = fs.readFileSync(filePath);
    const parsed = decryptJSON(buf) as AhbDocument;
    currentDoc = parsed;
    // backfill data container if missing
    if (!currentDoc.data || typeof currentDoc.data !== "object") {
      (currentDoc as AhbDocument).data = initData();
    }
    currentFilePath = filePath;
    notifyAll("app:document-changed");
    isDirty = false;
    buildMenu();
    broadcastFileInfo();
  } catch (err) {
    console.error("Failed to open/decrypt file:", err);
    await dialog.showMessageBox({
      type: "error",
      title: "Cannot open file",
      message:
        "This file could not be opened. It may be corrupted, not an AHB Sales file, or encrypted with a different key.",
      detail: `${(err as Error).message}`,
    });
  }
}

function writeCurrentTo(pathToWrite: string) {
  currentDoc.meta.updatedAt = new Date().toISOString();
  const enc = encryptJSON(currentDoc);
  fs.writeFileSync(pathToWrite, enc);
}

async function handleSaveFile() {
  if (!currentFilePath) {
    await handleSaveFileAs();
    return;
  }
  writeCurrentTo(currentFilePath);
  isDirty = false;
  buildMenu();
  broadcastFileInfo();
}

async function handleSaveFileAs() {
  const res = await dialog.showSaveDialog({
    defaultPath: currentFilePath ?? "untitled.ahbs",
    filters: [{ name: "AHB Sales Files", extensions: ["ahbs"] }],
  });
  if (res.canceled || !res.filePath) return;
  currentFilePath = res.filePath.endsWith(".ahbs")
    ? res.filePath
    : `${res.filePath}.ahbs`;
  writeCurrentTo(currentFilePath);
  notifyAll("app:document-changed");
  isDirty = false;
  buildMenu();
  broadcastFileInfo();
}

// IPC wiring
ipcMain.handle("app:new-file", async () => newFileFlow());
ipcMain.handle("app:open-file", async () => openFileFlow());
ipcMain.handle("app:save-file", async () => handleSaveFile());
ipcMain.handle("app:save-file-as", async () => handleSaveFileAs());
ipcMain.handle("app:get-file-info", async () => ({
  path: currentFilePath,
  isDirty,
}));
ipcMain.handle("app:get-language", async () => getLanguage());
ipcMain.handle("app:set-language", async (_e, lang: "bn" | "en") => {
  setLanguage(lang);
  notifyAll("app:language-changed", lang);
  buildMenu();
});

// -----------------------
// App settings (printing presets)
// -----------------------
type PrintSettings = {
  paperSize: "A4" | "A5" | "Letter";
  orientation: "portrait" | "landscape";
  marginMm: number; // uniform margin in mm
  // Stored only; not actively enforced with window.print()
  printerDevice?: string;
};

const defaultPrintSettings: PrintSettings = {
  paperSize: "A4",
  orientation: "portrait",
  marginMm: 12,
};

function getSettingsPath() {
  // Store under userData directory
  const dir = app.getPath("userData");
  return path.join(dir, "settings.json");
}

function loadPrintSettings(): PrintSettings {
  try {
    const p = getSettingsPath();
    if (!fs.existsSync(p)) return defaultPrintSettings;
    const raw = fs.readFileSync(p, "utf-8");
    const parsed = JSON.parse(raw);
    return {
      ...defaultPrintSettings,
      ...parsed.print,
    } as PrintSettings;
  } catch {
    return defaultPrintSettings;
  }
}

function savePrintSettings(next: PrintSettings) {
  try {
    const p = getSettingsPath();
    const payload = { print: next };
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, JSON.stringify(payload, null, 2), "utf-8");
  } catch (e) {
    console.error("Failed to save settings:", e);
  }
}

ipcMain.handle("settings:get-print", async () => {
  return loadPrintSettings();
});
ipcMain.handle(
  "settings:set-print",
  async (_e, settings: Partial<PrintSettings>) => {
    const cur = loadPrintSettings();
    const next = { ...cur, ...settings } as PrintSettings;
    savePrintSettings(next);
    return next;
  }
);

// Phase 1: IPC for products/customers
ipcMain.handle(
  "data:list-products",
  async (_e, opts?: boolean | { activeOnly?: boolean }) => {
    const data = currentDoc.data as AhbDataV1;
    const activeOnly = typeof opts === "boolean" ? opts : opts?.activeOnly;
    return listProducts(data, { activeOnly });
  }
);
ipcMain.handle(
  "data:add-product",
  async (_e, p: Parameters<typeof addProduct>[1]) => {
    const data = currentDoc.data as AhbDataV1;
    const prod = addProduct(data, p);
    notifyAll("data:changed", { kind: "product", action: "add", id: prod.id });
    isDirty = true;
    broadcastFileInfo();
    return prod;
  }
);

// Phase 2: invoices
ipcMain.handle(
  "data:post-invoice",
  async (_e, payload: Parameters<typeof postInvoice>[1]) => {
    const data = currentDoc.data as AhbDataV1;
    const inv = postInvoice(data, payload);
    notifyAll("data:changed", { kind: "invoice", action: "post", id: inv.no });
    // Notify product stock changes
    inv.lines.forEach((ln) =>
      notifyAll("data:changed", {
        kind: "product",
        action: "stock-updated",
        id: ln.productId,
      })
    );
    // Notify customer outstanding update
    notifyAll("data:changed", {
      kind: "customer",
      action: "update",
      id: inv.customerId,
    });
    isDirty = true;
    broadcastFileInfo();
    return inv;
  }
);

// Phase 3: listing endpoints
ipcMain.handle(
  "data:list-invoices-by-customer",
  async (_e, customerId: number) => {
    const data = currentDoc.data as AhbDataV1;
    return listInvoicesByCustomer(data, customerId);
  }
);
ipcMain.handle("data:list-product-sales", async (_e, productId: number) => {
  const data = currentDoc.data as AhbDataV1;
  return listProductSales(data, productId);
});
ipcMain.handle("data:list-product-purchases", async (_e, productId: number) => {
  const data = currentDoc.data as AhbDataV1;
  return listProductPurchases(data, productId);
});

// Phase 3: post purchase (stock increment)
ipcMain.handle(
  "data:post-purchase",
  async (_e, payload: Parameters<typeof postPurchase>[1]) => {
    const data = currentDoc.data as AhbDataV1;
    const purchase = postPurchase(data, payload);
    notifyAll("data:changed", {
      kind: "purchase",
      action: "post",
      id: purchase.productId,
    });
    // notify product stock update
    notifyAll("data:changed", {
      kind: "product",
      action: "stock-updated",
      id: purchase.productId,
    });
    isDirty = true;
    broadcastFileInfo();
    return purchase;
  }
);

// Phase 4: Reports IPC
ipcMain.handle(
  "report:money-customer-range",
  async (_e, from: string, to: string) => {
    const data = currentDoc.data as AhbDataV1;
    return reportMoneyTransactionsCustomerRange(data, from, to);
  }
);

ipcMain.handle("report:money-daywise", async (_e, from: string, to: string) => {
  const data = currentDoc.data as AhbDataV1;
  return reportMoneyTransactionsDayWise(data, from, to);
});

ipcMain.handle("report:daily-payment", async (_e, date: string) => {
  const data = currentDoc.data as AhbDataV1;
  return reportDailyPayments(data, date);
});

// -----------------------
// App Menu (File + Language)
// -----------------------
function buildMenu() {
  const lang = getLanguage();
  const d = dict[lang];
  const template: MenuItemConstructorOptions[] = [
    {
      label: d.menu_file,
      submenu: [
        {
          label: d.menu_new,
          click: (): void => {
            void newFileFlow();
          },
        },
        {
          label: d.menu_open,
          click: (): void => {
            void openFileFlow();
          },
        },
        {
          label: d.menu_save,
          enabled: Boolean(currentFilePath),
          click: (): void => {
            void handleSaveFile();
          },
        },
        {
          label: d.menu_save_as,
          enabled: Boolean(currentFilePath),
          click: (): void => {
            void handleSaveFileAs();
          },
        },
        { type: "separator" },
        {
          label: d.menu_close,
          enabled: Boolean(currentFilePath),
          accelerator: process.platform === "darwin" ? "Cmd+W" : "Ctrl+W",
          click: (): void => {
            void closeFileFlow();
          },
        },
        {
          label: d.menu_quit ?? "Quit",
          accelerator: process.platform === "darwin" ? "Cmd+Q" : "Alt+F4",
          click: (): void => {
            void quitAppFlow();
          },
        },
      ],
    },
    {
      label: d.settings ?? "Settings",
      submenu: [
        {
          label: `${d.print} ${d.settings_title ?? d.settings ?? "Settings"}`,
          click: (): void => {
            notifyAll("app:open-settings");
          },
        },
        {
          label: d.menu_language ?? "Language",
          submenu: [
            {
              label: "বাংলা",
              type: "radio",
              checked: lang === "bn",
              click: (): void => {
                setLanguage("bn");
                notifyAll("app:language-changed", "bn");
                buildMenu();
              },
            },
            {
              label: "English",
              type: "radio",
              checked: lang === "en",
              click: (): void => {
                setLanguage("en");
                notifyAll("app:language-changed", "en");
                buildMenu();
              },
            },
          ],
        },
      ],
    },
  ];
  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

async function askToSaveChanges(): Promise<"save" | "dont" | "cancel"> {
  if (!isDirty) return "dont";
  const result = await dialog.showMessageBox({
    type: "question",
    buttons: ["Save", "Don't Save", "Cancel"],
    defaultId: 0,
    cancelId: 2,
    title: "Unsaved changes",
    message: "You have unsaved changes. Do you want to save them?",
  });
  return result.response === 0
    ? "save"
    : result.response === 1
      ? "dont"
      : "cancel";
}

async function saveCurrentPossiblyAs(): Promise<boolean> {
  if (currentFilePath) {
    await handleSaveFile();
    return true;
  }
  await handleSaveFileAs();
  return Boolean(currentFilePath);
}

async function newFileFlow(): Promise<void> {
  if (isDirty) {
    const decision = await askToSaveChanges();
    if (decision === "cancel") return;
    if (decision === "save") {
      const ok = await saveCurrentPossiblyAs();
      if (!ok) return; // user canceled save-as
    }
  }
  await handleNewFile();
}

async function openFileFlow(): Promise<void> {
  if (isDirty) {
    const decision = await askToSaveChanges();
    if (decision === "cancel") return;
    if (decision === "save") {
      const ok = await saveCurrentPossiblyAs();
      if (!ok) return;
    }
  }
  await handleOpenFile();
}

async function closeFileFlow(): Promise<void> {
  if (!currentFilePath) return; // nothing to close
  if (isDirty) {
    const decision = await askToSaveChanges();
    if (decision === "cancel") return;
    if (decision === "save") {
      const ok = await saveCurrentPossiblyAs();
      if (!ok) return;
    }
  }
  // Reset current document and state
  currentFilePath = null;
  currentDoc = createEmptyDocument();
  if (!currentDoc.data || typeof currentDoc.data !== "object") {
    (currentDoc as AhbDocument).data = initData();
  }
  isDirty = false;
  notifyAll("app:document-closed");
  buildMenu();
  broadcastFileInfo();
}

async function quitAppFlow(): Promise<void> {
  if (isDirty) {
    const decision = await askToSaveChanges();
    if (decision === "cancel") return;
    if (decision === "save") {
      const ok = await saveCurrentPossiblyAs();
      if (!ok) return;
    }
  }
  app.quit();
}
ipcMain.handle(
  "data:update-product",
  async (_e, id: number, patch: Parameters<typeof updateProduct>[2]) => {
    const data = currentDoc.data as AhbDataV1;
    const prod = updateProduct(data, id, patch);
    notifyAll("data:changed", { kind: "product", action: "update", id });
    isDirty = true;
    broadcastFileInfo();
    return prod;
  }
);

ipcMain.handle(
  "data:list-customers",
  async (_e, opts?: boolean | { activeOnly?: boolean }) => {
    const data = currentDoc.data as AhbDataV1;
    const activeOnly = typeof opts === "boolean" ? opts : opts?.activeOnly;
    return listCustomers(data, { activeOnly });
  }
);
ipcMain.handle(
  "data:add-customer",
  async (_e, c: Parameters<typeof addCustomer>[1]) => {
    const data = currentDoc.data as AhbDataV1;
    const cust = addCustomer(data, c);
    notifyAll("data:changed", { kind: "customer", action: "add", id: cust.id });
    isDirty = true;
    broadcastFileInfo();
    return cust;
  }
);
ipcMain.handle(
  "data:update-customer",
  async (_e, id: number, patch: Parameters<typeof updateCustomer>[2]) => {
    const data = currentDoc.data as AhbDataV1;
    const cust = updateCustomer(data, id, patch);
    notifyAll("data:changed", { kind: "customer", action: "update", id });
    isDirty = true;
    broadcastFileInfo();
    return cust;
  }
);
