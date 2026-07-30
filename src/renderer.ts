/**
 * This file will automatically be loaded by vite and run in the "renderer" context.
 * To learn more about the differences between the "main" and the "renderer" context in
 * Electron, visit:
 *
 * https://electronjs.org/docs/tutorial/process-model
 *
 * By default, Node.js integration in this file is disabled. When enabling Node.js integration
 * in a renderer process, please be aware of potential security implications. You can read
 * more about security risks here:
 *
 * https://electronjs.org/docs/tutorial/security
 *
 * To enable Node.js integration in this file, open up `main.ts` and enable the `nodeIntegration`
 * flag:
 *
 * ```
 *  // Create the browser window.
 *  mainWindow = new BrowserWindow({
 *    width: 800,
 *    height: 600,
 *    webPreferences: {
 *      nodeIntegration: true
 *    }
 *  });
 * ```
 */

import "./index.css";
import { initTheme } from "./theme";
import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import CustomerHistoryWindow from "./CustomerHistoryWindow.vue";
import PaymentWindow from "./PaymentWindow.vue";
import EditPaymentWindow from "./EditPaymentWindow.vue";
import CustomersWindow from "./CustomersWindow.vue";
import ProductsWindow from "./ProductsWindow.vue";
import PurchaseEntryWindow from "./PurchaseEntryWindow.vue";

void initTheme();
const pinia = createPinia();
const mount = document.createElement("div");
document.body.appendChild(mount);
const hash = window.location.hash;
const root = hash.startsWith("#customer-history")
  ? CustomerHistoryWindow
  : hash.startsWith("#customers")
    ? CustomersWindow
    : hash.startsWith("#products")
      ? ProductsWindow
      : hash.startsWith("#purchase-entry")
        ? PurchaseEntryWindow
        : hash.startsWith("#edit-payment")
          ? EditPaymentWindow
          : hash.startsWith("#payment")
            ? PaymentWindow
            : App;
createApp(root).use(pinia).mount(mount);
