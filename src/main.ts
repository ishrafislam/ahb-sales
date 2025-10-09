import { app, BrowserWindow, dialog, ipcMain } from "electron";
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
import { getLanguage, setLanguage } from "./main/i18n";
import {
  initData,
  addProduct,
  updateProduct,
  listProducts,
  addCustomer,
  updateCustomer,
  listCustomers,
  type AhbDataV1,
} from "./main/data";

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
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
app.on("ready", createWindow);

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
// Ensure data container exists
if (!currentDoc.data || typeof currentDoc.data !== "object") {
  (currentDoc as AhbDocument).data = initData();
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
}

// IPC wiring
ipcMain.handle("app:new-file", async () => handleNewFile());
ipcMain.handle("app:open-file", async () => handleOpenFile());
ipcMain.handle("app:save-file", async () => handleSaveFile());
ipcMain.handle("app:save-file-as", async () => handleSaveFileAs());
ipcMain.handle("app:get-language", async () => getLanguage());
ipcMain.handle("app:set-language", async (_e, lang: "bn" | "en") => {
  setLanguage(lang);
  notifyAll("app:language-changed", lang);
});

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
    if (currentFilePath) {
      writeCurrentTo(currentFilePath);
    }
    return prod;
  }
);
ipcMain.handle(
  "data:update-product",
  async (_e, id: number, patch: Parameters<typeof updateProduct>[2]) => {
    const data = currentDoc.data as AhbDataV1;
    const prod = updateProduct(data, id, patch);
    notifyAll("data:changed", { kind: "product", action: "update", id });
    if (currentFilePath) {
      writeCurrentTo(currentFilePath);
    }
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
    if (currentFilePath) {
      writeCurrentTo(currentFilePath);
    }
    return cust;
  }
);
ipcMain.handle(
  "data:update-customer",
  async (_e, id: number, patch: Parameters<typeof updateCustomer>[2]) => {
    const data = currentDoc.data as AhbDataV1;
    const cust = updateCustomer(data, id, patch);
    notifyAll("data:changed", { kind: "customer", action: "update", id });
    if (currentFilePath) {
      writeCurrentTo(currentFilePath);
    }
    return cust;
  }
);
