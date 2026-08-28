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
import PurchaseHistoryWindow from "./PurchaseHistoryWindow.vue";
import SalesHistoryWindow from "./SalesHistoryWindow.vue";
import PrintPreviewWindow from "./PrintPreviewWindow.vue";
import PrintMarginsWindow from "./PrintMarginsWindow.vue";
import TotalSellRangeWindow from "./TotalSellRangeWindow.vue";
import DailyReportRangeWindow from "./DailyReportRangeWindow.vue";
import ClientSelectWindow from "./ClientSelectWindow.vue";
import ClientReportRangeWindow from "./ClientReportRangeWindow.vue";
import PaymentReportRangeWindow from "./PaymentReportRangeWindow.vue";
import RecordDetailsWindow from "./RecordDetailsWindow.vue";

void initTheme();
const pinia = createPinia();
const mount = document.createElement("div");
document.body.appendChild(mount);
const hash = window.location.hash;
// Longest-matching prefixes first: "#payment" would otherwise swallow
// "#edit-payment" and so on.
const routes = [
  ["#customer-history", CustomerHistoryWindow],
  ["#record-details", RecordDetailsWindow],
  ["#customers", CustomersWindow],
  ["#products", ProductsWindow],
  ["#purchase-entry", PurchaseEntryWindow],
  ["#purchase-history", PurchaseHistoryWindow],
  ["#sales-history", SalesHistoryWindow],
  ["#print-preview", PrintPreviewWindow],
  ["#print-margins", PrintMarginsWindow],
  ["#total-sell", TotalSellRangeWindow],
  ["#daily-report", DailyReportRangeWindow],
  ["#client-select", ClientSelectWindow],
  ["#client-report", ClientReportRangeWindow],
  ["#edit-payment", EditPaymentWindow],
  ["#payment-report", PaymentReportRangeWindow],
  ["#payment", PaymentWindow],
] as const;
const root = routes.find(([prefix]) => hash.startsWith(prefix))?.[1] ?? App;
createApp(root).use(pinia).mount(mount);
