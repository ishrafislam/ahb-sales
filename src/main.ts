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

// -----------------------
// Per-window context
// -----------------------

interface WindowContext {
  win: BrowserWindow;
  fileService: FileService;
  dataService: DataService;
}

const contexts = new Map<number, WindowContext>();

function getCtx(sender: Electron.WebContents): WindowContext {
  const ctx = contexts.get(sender.id);
  if (!ctx) throw new Error("No context for window " + sender.id);
  return ctx;
}

// -----------------------
// Shared services (created once)
// -----------------------

const settingsService = new SettingsService();
const updateService = new UpdateService();

const menuService = new MenuService(
  () => {
    const fw = BrowserWindow.getFocusedWindow();
    return fw ? (contexts.get(fw.webContents.id)?.fileService ?? null) : null;
  },
  settingsService,
  () => void createWindow()
);

// -----------------------
// Window factory
// -----------------------

async function createWindow(filePath?: string): Promise<void> {
  const win = new BrowserWindow({
    width: 1280,
    height: 720,
    minWidth: 1280,
    minHeight: 720,
    title: app.getName(),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
  });

  const fileService = new FileService(win);
  const dataService = new DataService(fileService, menuService);

  fileService.onDataChanged(() => {
    dataService.rebuildIndex();
    menuService.buildMenu();
  });

  // Capture id before any possibility of destruction
  const webContentsId = win.webContents.id;

  const ctx: WindowContext = { win, fileService, dataService };
  contexts.set(webContentsId, ctx);

  // Intercept window close: prompt to save if dirty
  win.on("close", (e) => {
    if (!fileService.getIsDirty()) return;
    e.preventDefault();
    void fileService.askToSaveChanges().then(async (decision) => {
      if (decision === "cancel") return;
      if (decision === "save") await fileService.saveCurrentPossiblyAs();
      win.destroy(); // bypasses the 'close' event
    });
  });

  win.on("closed", () => {
    contexts.delete(webContentsId);
  });

  // Rebuild menu to reflect this window's state when focused
  win.on("focus", () => menuService.buildMenu());

  // Load renderer
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    await win.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    await win.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`)
    );
  }

  // Only open DevTools in development (Vite dev server present or not packaged)
  // Skip DevTools in test environment
  const isTest = process.env.NODE_ENV === "test";
  if (!isTest && (!app.isPackaged || MAIN_WINDOW_VITE_DEV_SERVER_URL)) {
    win.webContents.openDevTools();
  }

  // If a file path was supplied (double-click / CLI), open it now
  if (filePath) {
    await fileService.openFileByPath(filePath);
  }

  menuService.buildMenu();
}

// -----------------------
// Customer history window (child of a main window, shares its context)
// -----------------------

const historyWindows = new Map<number, BrowserWindow>();

async function openCustomerHistoryWindow(
  sender: Electron.WebContents,
  customerId?: number
): Promise<void> {
  const parentCtx = getCtx(sender);
  const parentId = sender.id;

  const existing = historyWindows.get(parentId);
  if (existing && !existing.isDestroyed()) {
    existing.restore();
    existing.focus();
    if (customerId !== undefined) {
      existing.webContents.send("history:load-customer", customerId);
    }
    return;
  }

  const win = new BrowserWindow({
    width: 1100,
    height: 700,
    minWidth: 900,
    minHeight: 600,
    parent: parentCtx.win,
    title: app.getName(),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
  });

  const webContentsId = win.webContents.id;

  // Share the parent's file/data services so all data IPC routed by
  // sender id operates on the same open document.
  contexts.set(webContentsId, {
    win,
    fileService: parentCtx.fileService,
    dataService: parentCtx.dataService,
  });
  parentCtx.fileService.attachWindow(win);
  historyWindows.set(parentId, win);

  win.on("closed", () => {
    contexts.delete(webContentsId);
    historyWindows.delete(parentId);
    parentCtx.fileService.detachWindow(win);
  });

  const hash =
    customerId !== undefined
      ? `customer-history/${customerId}`
      : "customer-history";
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    await win.loadURL(`${MAIN_WINDOW_VITE_DEV_SERVER_URL}#${hash}`);
  } else {
    await win.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
      { hash }
    );
  }
}

// -----------------------
// Payment window (child of a main window, shares its context)
// -----------------------

const paymentWindows = new Map<number, BrowserWindow>();
const editPaymentWindows = new Map<number, BrowserWindow>();

// Small fixed-size child window sharing the parent's file/data services so
// all data IPC routed by sender id operates on the same open document.
async function openSmallChildWindow(
  sender: Electron.WebContents,
  registry: Map<number, BrowserWindow>,
  hash: string,
  height: number
): Promise<void> {
  const parentCtx = getCtx(sender);
  const parentId = sender.id;

  const existing = registry.get(parentId);
  if (existing && !existing.isDestroyed()) {
    existing.restore();
    existing.focus();
    return;
  }

  // Anchor to the top-level window: when one small window opens another
  // (payment → edit payment) the opener may close right away, and a child
  // window would be destroyed with its parent.
  const topLevelParent = parentCtx.win.getParentWindow() ?? parentCtx.win;
  const win = new BrowserWindow({
    width: 420,
    height,
    resizable: false,
    minimizable: false,
    maximizable: false,
    parent: topLevelParent,
    title: app.getName(),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
  });

  const webContentsId = win.webContents.id;

  contexts.set(webContentsId, {
    win,
    fileService: parentCtx.fileService,
    dataService: parentCtx.dataService,
  });
  parentCtx.fileService.attachWindow(win);
  registry.set(parentId, win);

  win.on("closed", () => {
    contexts.delete(webContentsId);
    registry.delete(parentId);
    parentCtx.fileService.detachWindow(win);
  });

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    await win.loadURL(`${MAIN_WINDOW_VITE_DEV_SERVER_URL}#${hash}`);
  } else {
    await win.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
      { hash }
    );
  }
}

async function openPaymentWindow(
  sender: Electron.WebContents,
  invoiceId: string
): Promise<void> {
  await openSmallChildWindow(
    sender,
    paymentWindows,
    `payment/${invoiceId}`,
    480
  );
}

async function openEditPaymentWindow(
  sender: Electron.WebContents,
  invoiceId: string
): Promise<void> {
  await openSmallChildWindow(
    sender,
    editPaymentWindows,
    `edit-payment/${invoiceId}`,
    520
  );
}

// -----------------------
// File-path parsing helper
// -----------------------

function getFilePathFromArgs(argv: string[]): string | undefined {
  return argv.find((a) => a.endsWith(".ahbs") && !a.startsWith("-"));
}

// -----------------------
// Single-instance lock
// -----------------------

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", (_event, argv) => {
    const filePath = getFilePathFromArgs(argv);
    if (filePath) {
      void createWindow(filePath);
    } else {
      // No file — focus an existing window
      const existing = BrowserWindow.getAllWindows()[0];
      if (existing) {
        existing.restore();
        existing.focus();
      }
    }
  });
}

// -----------------------
// macOS open-file event (before ready)
// -----------------------

let pendingOpenFilePath: string | undefined;
app.on("open-file", (event, filePath) => {
  event.preventDefault();
  if (app.isReady()) {
    void createWindow(filePath);
  } else {
    pendingOpenFilePath = filePath;
  }
});

// -----------------------
// App lifecycle
// -----------------------

app.on("ready", async () => {
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

  const filePath = pendingOpenFilePath ?? getFilePathFromArgs(process.argv);
  await createWindow(filePath);
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
    void createWindow();
  }
});

// -----------------------
// IPC Handlers
// -----------------------

// File operations — routed to the sender's window context
ipcMain.handle("app:new-file", async (e) => getCtx(e.sender).fileService.newFileFlow());
ipcMain.handle("app:open-file", async (e) => getCtx(e.sender).fileService.openFileFlow());
ipcMain.handle("app:save-file", async (e) => {
  await getCtx(e.sender).fileService.handleSaveFile();
  menuService.buildMenu();
});
ipcMain.handle("app:save-file-as", async (e) => {
  await getCtx(e.sender).fileService.handleSaveFileAs();
  menuService.buildMenu();
});
ipcMain.handle("app:get-file-info", async (e) => getCtx(e.sender).fileService.getFileInfo());

// Language (global)
ipcMain.handle("app:get-language", async () => getLanguage());
ipcMain.handle("app:set-language", async (_e, lang: "bn" | "en") => {
  setLanguage(lang);
  BrowserWindow.getAllWindows().forEach((w) =>
    w.webContents.send("app:language-changed", lang)
  );
  menuService.buildMenu();
});

// Settings (global)
ipcMain.handle("settings:get-theme", async () => settingsService.getTheme());
ipcMain.handle("settings:set-theme", async (_e, source) => {
  const result = settingsService.setTheme(source);
  menuService.buildMenu();
  return result;
});

// Data operations — routed to the sender's window context
ipcMain.handle(
  "data:list-products",
  async (e, opts?: boolean | { activeOnly?: boolean }) => {
    return getCtx(e.sender).dataService.listProducts(opts);
  }
);
ipcMain.handle("data:get-product", async (e, id: number) => {
  return getCtx(e.sender).dataService.getProductById(id) ?? null;
});
ipcMain.handle("data:add-product", async (e, p) => {
  return getCtx(e.sender).dataService.addProduct(p);
});
ipcMain.handle("data:update-product", async (e, id, patch) => {
  return getCtx(e.sender).dataService.updateProduct(id, patch);
});

ipcMain.handle(
  "data:list-customers",
  async (e, opts?: boolean | { activeOnly?: boolean }) => {
    return getCtx(e.sender).dataService.listCustomers(opts);
  }
);
ipcMain.handle("data:get-customer", async (e, id: number) => {
  return getCtx(e.sender).dataService.getCustomerById(id) ?? null;
});
ipcMain.handle("data:add-customer", async (e, c) => {
  return getCtx(e.sender).dataService.addCustomer(c);
});
ipcMain.handle("data:update-customer", async (e, id, patch) => {
  return getCtx(e.sender).dataService.updateCustomer(id, patch);
});

ipcMain.handle(
  "data:record-payment",
  async (e, customerId: number, amount: number) => {
    return getCtx(e.sender).dataService.recordPayment(customerId, amount);
  }
);

ipcMain.handle("data:post-invoice", async (e, payload) => {
  return getCtx(e.sender).dataService.postInvoice(payload);
});

ipcMain.handle("data:update-invoice", async (e, id: string, payload) => {
  return getCtx(e.sender).dataService.updateInvoice(id, payload);
});

ipcMain.handle("data:get-invoice", async (e, id: string) => {
  return getCtx(e.sender).dataService.getInvoiceById(id);
});

ipcMain.handle("data:add-invoice-payment", async (e, id: string, payload) => {
  return getCtx(e.sender).dataService.addInvoicePayment(id, payload);
});

ipcMain.handle(
  "data:update-invoice-payment",
  async (e, id: string, payload) => {
    return getCtx(e.sender).dataService.updateInvoicePayment(id, payload);
  }
);

ipcMain.handle(
  "data:list-invoices-by-customer",
  async (e, customerId: number) => {
    return getCtx(e.sender).dataService.listInvoicesByCustomer(customerId);
  }
);
ipcMain.handle("data:list-product-sales", async (e, productId: number) => {
  return getCtx(e.sender).dataService.listProductSales(productId);
});
ipcMain.handle("data:list-product-purchases", async (e, productId: number) => {
  return getCtx(e.sender).dataService.listProductPurchases(productId);
});

ipcMain.handle("data:post-purchase", async (e, payload) => {
  return getCtx(e.sender).dataService.postPurchase(payload);
});

// Reports — routed to the sender's window context
ipcMain.handle(
  "report:money-customer-range",
  async (e, from: string, to: string) => {
    return getCtx(e.sender).dataService.reportMoneyTransactionsCustomerRange(from, to);
  }
);

ipcMain.handle("report:money-daywise", async (e, from: string, to: string) => {
  return getCtx(e.sender).dataService.reportMoneyTransactionsDayWise(from, to);
});

ipcMain.handle("report:daily-payment", async (e, date: string) => {
  return getCtx(e.sender).dataService.reportDailyPayments(date);
});

// Window control
ipcMain.handle(
  "window:open-customer-history",
  async (e, customerId?: number) => {
    await openCustomerHistoryWindow(e.sender, customerId);
  }
);

ipcMain.handle("window:open-payment", async (e, invoiceId: string) => {
  await openPaymentWindow(e.sender, invoiceId);
});

ipcMain.handle("window:open-edit-payment", async (e, invoiceId: string) => {
  await openEditPaymentWindow(e.sender, invoiceId);
});

// Updates & app info (global)
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
