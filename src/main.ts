import { app, BrowserWindow, ipcMain, nativeTheme } from "electron";
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
import started from "electron-squirrel-startup";
import { getLanguage, setLanguage } from "./main/i18n";
import { FileService } from "./main/services/FileService";
import { SettingsService } from "./main/services/SettingsService";
import { MenuService } from "./main/services/MenuService";
import { UpdateService } from "./main/services/UpdateService";
import { DataService } from "./main/services/DataService";

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

// Initialize services
const fileService = new FileService();
const settingsService = new SettingsService();
const menuService = new MenuService(fileService, settingsService);
const updateService = new UpdateService();
const dataService = new DataService(fileService, menuService);

// Rebuild indexes when document changes
fileService.onDataChanged(() => {
  dataService.rebuildIndex();
});

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    // Set a comfortable initial size and enforce a sensible minimum
    width: 1280,
    height: 720,
    minWidth: 1280,
    minHeight: 720,
    title: app.getName(),
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

  // Only open DevTools in development (Vite dev server present or not packaged)
  // Skip DevTools in test environment
  const isTest = process.env.NODE_ENV === "test";
  if (!isTest && (!app.isPackaged || MAIN_WINDOW_VITE_DEV_SERVER_URL)) {
    mainWindow.webContents.openDevTools();
  }
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on("ready", () => {
  // Ensure app name reflects productName in dev and prod
  try {
    app.setName("Abdul Hamid & Brothers - Sales");
  } catch (e) {
    // Non-fatal in environments where setName is restricted
    console.debug("setName skipped:", (e as Error).message);
  }

  // Initialize auto-updates (no-op in dev unless forced)
  updateService.initAutoUpdates();
  // Apply persisted theme source
  try {
    const s = settingsService.loadSettings();
    if (s.themeSource) nativeTheme.themeSource = s.themeSource;
  } catch {
    // ignore
  }
  // Setup native theme listener
  settingsService.setupNativeThemeListener();
  createWindow();
  menuService.buildMenu();
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
// IPC Handlers
// -----------------------

// File operations
ipcMain.handle("app:new-file", async () => fileService.newFileFlow());
ipcMain.handle("app:open-file", async () => fileService.openFileFlow());
ipcMain.handle("app:save-file", async () => {
  await fileService.handleSaveFile();
  menuService.buildMenu();
});
ipcMain.handle("app:save-file-as", async () => {
  await fileService.handleSaveFileAs();
  menuService.buildMenu();
});
ipcMain.handle("app:get-file-info", async () => fileService.getFileInfo());

// Language
ipcMain.handle("app:get-language", async () => getLanguage());
ipcMain.handle("app:set-language", async (_e, lang: "bn" | "en") => {
  setLanguage(lang);
  BrowserWindow.getAllWindows().forEach((w) =>
    w.webContents.send("app:language-changed", lang)
  );
  menuService.buildMenu();
});

// Settings
ipcMain.handle("settings:get-print", async () =>
  settingsService.getPrintSettings()
);
ipcMain.handle("settings:set-print", async (_e, settings) => {
  return settingsService.setPrintSettings(settings);
});

ipcMain.handle("settings:get-theme", async () => settingsService.getTheme());
ipcMain.handle("settings:set-theme", async (_e, source) => {
  const result = settingsService.setTheme(source);
  menuService.buildMenu();
  return result;
});

// Data operations - Products
ipcMain.handle(
  "data:list-products",
  async (_e, opts?: boolean | { activeOnly?: boolean }) => {
    return dataService.listProducts(opts);
  }
);
ipcMain.handle("data:add-product", async (_e, p) => {
  return dataService.addProduct(p);
});
ipcMain.handle("data:update-product", async (_e, id, patch) => {
  return dataService.updateProduct(id, patch);
});

// Data operations - Customers
ipcMain.handle(
  "data:list-customers",
  async (_e, opts?: boolean | { activeOnly?: boolean }) => {
    return dataService.listCustomers(opts);
  }
);
ipcMain.handle("data:add-customer", async (_e, c) => {
  return dataService.addCustomer(c);
});
ipcMain.handle("data:update-customer", async (_e, id, patch) => {
  return dataService.updateCustomer(id, patch);
});

// Data operations - Invoices
ipcMain.handle("data:post-invoice", async (_e, payload) => {
  return dataService.postInvoice(payload);
});

ipcMain.handle(
  "data:list-invoices-by-customer",
  async (_e, customerId: number) => {
    return dataService.listInvoicesByCustomer(customerId);
  }
);
ipcMain.handle("data:list-product-sales", async (_e, productId: number) => {
  return dataService.listProductSales(productId);
});
ipcMain.handle("data:list-product-purchases", async (_e, productId: number) => {
  return dataService.listProductPurchases(productId);
});

// Data operations - Purchases
ipcMain.handle("data:post-purchase", async (_e, payload) => {
  return dataService.postPurchase(payload);
});

// Reports
ipcMain.handle(
  "report:money-customer-range",
  async (_e, from: string, to: string) => {
    return dataService.reportMoneyTransactionsCustomerRange(from, to);
  }
);

ipcMain.handle("report:money-daywise", async (_e, from: string, to: string) => {
  return dataService.reportMoneyTransactionsDayWise(from, to);
});

ipcMain.handle("report:daily-payment", async (_e, date: string) => {
  return dataService.reportDailyPayments(date);
});

// Updates
ipcMain.handle("app:check-for-updates", async () =>
  updateService.checkForUpdates()
);
ipcMain.handle("app:get-version", async () => app.getVersion());
ipcMain.handle("app:get-name", async () => app.getName());
ipcMain.handle("app:get-runtime-info", async () => {
  return {
    versions: {
      electron: process.versions.electron,
      chrome: process.versions.chrome,
      node: process.versions.node,
    },
    buildDate: process.env.BUILD_DATE || "dev",
    commitSha: process.env.COMMIT_SHA || process.env.GITHUB_SHA || undefined,
  } as const;
});
ipcMain.handle("app:restart-and-install", async () =>
  updateService.restartAndInstall()
);
