<template>
  <!-- eslint-disable -->
  <div class="flex flex-col md:flex-row gap-4">
    <!-- Sidebar: report selection -->
    <aside class="w-full md:w-60 flex-shrink-0">
      <div
        class="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md p-3"
      >
        <h3 class="text-sm font-semibold mb-2">Reports</h3>
        <ul class="space-y-1 text-sm">
          <li>
            <button
              class="w-full text-left px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
              :class="
                selected === 'money-customer'
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                  : ''
              "
              @click="select('money-customer')"
            >
              Money Transaction — Customer Based
            </button>
          </li>
          <li>
            <button
              class="w-full text-left px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
              :class="
                selected === 'money-daywise'
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                  : ''
              "
              @click="select('money-daywise')"
            >
              Money Transaction — Day Wise
            </button>
          </li>
          <li>
            <button
              class="w-full text-left px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
              :class="
                selected === 'daily-payment'
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                  : ''
              "
              @click="select('daily-payment')"
            >
              Daily Payment Report
            </button>
          </li>
        </ul>
      </div>
    </aside>

    <!-- Main section: controls + preview -->
    <section class="flex-1">
      <!-- Controls -->
      <div
        class="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md p-3 mb-3"
      >
        <!-- money-customer controls -->
        <div
          v-if="selected === 'money-customer'"
          class="flex flex-wrap items-end gap-2"
        >
          <div class="flex flex-col">
            <label class="text-xs text-gray-600 dark:text-gray-300">From</label>
            <input
              v-model="from"
              type="date"
              class="bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1 text-sm dark:text-gray-100"
            />
          </div>
          <div class="flex flex-col">
            <label class="text-xs text-gray-600 dark:text-gray-300">To</label>
            <input
              v-model="to"
              type="date"
              class="bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1 text-sm dark:text-gray-100"
            />
          </div>
          <button
            class="ml-auto btn btn-primary"
            @click="loadMoneyCustomer"
          >
            Fetch
          </button>
          <button
            class="btn"
            :disabled="rows.length === 0"
            @click="printMoneyCustomer"
          >
            Print
          </button>
        </div>
        <!-- money-daywise controls -->
        <div
          v-else-if="selected === 'money-daywise'"
          class="flex flex-wrap items-end gap-2"
        >
          <div class="flex flex-col">
            <label class="text-xs text-gray-600 dark:text-gray-300">From</label>
            <input
              v-model="from"
              type="date"
              class="bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1 text-sm dark:text-gray-100"
            />
          </div>
          <div class="flex flex-col">
            <label class="text-xs text-gray-600 dark:text-gray-300">To</label>
            <input
              v-model="to"
              type="date"
              class="bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1 text-sm dark:text-gray-100"
            />
          </div>
          <button
            class="ml-auto btn btn-primary"
            @click="loadMoneyDayWise"
          >
            Fetch
          </button>
          <button
            class="btn"
            :disabled="days.length === 0"
            @click="printMoneyDayWise"
          >
            Print
          </button>
        </div>
        <!-- daily-payment controls -->
        <div
          v-else-if="selected === 'daily-payment'"
          class="flex flex-wrap items-end gap-2"
        >
          <div class="flex flex-col">
            <label class="text-xs text-gray-600 dark:text-gray-300">Date</label>
            <input
              v-model="dailyDate"
              type="date"
              class="bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1 text-sm dark:text-gray-100"
            />
          </div>
          <button
            class="ml-auto btn btn-primary"
            @click="loadDailyPayments"
          >
            Fetch
          </button>
          <button
            class="btn"
            :disabled="dailyRows.length === 0"
            @click="printDailyPayments"
          >
            Print
          </button>
        </div>
        <div
          v-else
          class="text-sm text-gray-500 dark:text-gray-400"
        >
          Select a report to begin.
        </div>
      </div>

      <!-- Preview: money-customer -->
      <div
        v-if="selected === 'money-customer'"
        class="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md p-3 overflow-auto"
      >
        <table class="w-full text-sm">
          <thead>
            <tr class="text-left border-b border-gray-200 dark:border-gray-700">
              <th class="p-2">Date</th>
              <th class="p-2">Customer Name</th>
              <th class="p-2 text-right">Net Bill</th>
              <th class="p-2 text-right">Paid</th>
              <th class="p-2 text-right">Due</th>
              <th class="p-2 text-right">Previous Due</th>
              <th class="p-2 text-right">Total Due</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(r, i) in rows"
              :key="i"
              class="border-b border-gray-100 dark:border-gray-800"
            >
              <td class="p-2">{{ r.date }}</td>
              <td class="p-2">
                {{
                  r.customerName ??
                  (r.customerId === 0 ? t("walk_in") : r.customerId)
                }}
              </td>
              <td class="p-2 text-right">{{ fmt(r.netBill) }}</td>
              <td class="p-2 text-right">{{ fmt(r.paid) }}</td>
              <td class="p-2 text-right">{{ fmt(r.due) }}</td>
              <td class="p-2 text-right">{{ fmt(r.previousDue) }}</td>
              <td class="p-2 text-right">{{ fmt(r.totalDue) }}</td>
            </tr>
            <tr v-if="rows.length === 0">
              <td
                class="p-2 text-center text-gray-500 dark:text-gray-400"
                colspan="7"
              >
                No records
              </td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <td
                class="p-2 font-semibold dark:text-gray-100"
                colspan="2"
              >
                Totals
              </td>
              <td class="p-2 text-right font-semibold dark:text-gray-100">
                {{ fmt(totals.netBill) }}
              </td>
              <td class="p-2 text-right font-semibold dark:text-gray-100">
                {{ fmt(totals.paid) }}
              </td>
              <td class="p-2 text-right font-semibold dark:text-gray-100">
                {{ fmt(totals.due) }}
              </td>
              <td
                class="p-2"
                colspan="2"
              ></td>
            </tr>
          </tfoot>
        </table>
      </div>

      <!-- Preview: money-daywise -->
      <div
        v-else-if="selected === 'money-daywise'"
        class="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md p-3 space-y-6 overflow-auto"
      >
        <div
          v-for="(day, idx) in days"
          :key="idx"
          class="border border-gray-200 dark:border-gray-700 rounded-md"
        >
          <div
            class="flex items-center justify-between bg-gray-50 dark:bg-gray-800 px-3 py-2 border-b border-gray-200 dark:border-gray-700"
          >
            <div class="font-semibold">Date: {{ day.date }}</div>
            <div
              class="text-sm text-gray-700 dark:text-gray-300 flex flex-wrap gap-4"
            >
              <span
                >Bill: <strong>{{ fmt(day.totals.bill) }}</strong></span
              >
              <span
                >Discount: <strong>{{ fmt(day.totals.discount) }}</strong></span
              >
              <span
                >Net: <strong>{{ fmt(day.totals.netBill) }}</strong></span
              >
              <span
                >Paid: <strong>{{ fmt(day.totals.paid) }}</strong></span
              >
              <span
                >Due: <strong>{{ fmt(day.totals.due) }}</strong></span
              >
            </div>
          </div>
          <div class="overflow-auto">
            <table class="w-full text-sm">
              <thead>
                <tr
                  class="text-left border-b border-gray-200 dark:border-gray-700"
                >
                  <th class="p-2">Customer</th>
                  <th class="p-2 text-right">Bill</th>
                  <th class="p-2 text-right">Discount</th>
                  <th class="p-2 text-right">Net Bill</th>
                  <th class="p-2 text-right">Paid</th>
                  <th class="p-2 text-right">Due</th>
                  <th class="p-2 text-right">Previous Due</th>
                  <th class="p-2 text-right">Total Due</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(r, i) in day.rows"
                  :key="i"
                  class="border-b border-gray-100 dark:border-gray-800"
                >
                  <td class="p-2">
                    {{
                      r.customerName ??
                      (r.customerId === 0 ? t("walk_in") : r.customerId)
                    }}
                  </td>
                  <td class="p-2 text-right">{{ fmt(r.bill) }}</td>
                  <td class="p-2 text-right">{{ fmt(r.discount) }}</td>
                  <td class="p-2 text-right">{{ fmt(r.netBill) }}</td>
                  <td class="p-2 text-right">{{ fmt(r.paid) }}</td>
                  <td class="p-2 text-right">{{ fmt(r.due) }}</td>
                  <td class="p-2 text-right">{{ fmt(r.previousDue) }}</td>
                  <td class="p-2 text-right">{{ fmt(r.totalDue) }}</td>
                </tr>
                <tr v-if="day.rows.length === 0">
                  <td
                    class="p-2 text-center text-gray-500 dark:text-gray-400"
                    colspan="8"
                  >
                    No records
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <div
          v-if="days.length === 0"
          class="text-center text-sm text-gray-500 dark:text-gray-400"
        >
          No days found in range
        </div>
      </div>

      <!-- Preview: daily-payment -->
      <div
        v-else-if="selected === 'daily-payment'"
        class="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md p-3 overflow-auto"
      >
        <table class="w-full text-sm">
          <thead>
            <tr class="text-left border-b border-gray-200 dark:border-gray-700">
              <th class="p-2">Customer</th>
              <th class="p-2 text-right">Paid</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(r, i) in dailyRows"
              :key="i"
              class="border-b border-gray-100 dark:border-gray-800"
            >
              <td class="p-2">
                {{
                  r.customerName ??
                  (r.customerId === 0 ? t("walk_in") : r.customerId)
                }}
              </td>
              <td class="p-2 text-right">{{ fmt(r.paid) }}</td>
            </tr>
            <tr v-if="dailyRows.length === 0">
              <td
                class="p-2 text-center text-gray-500 dark:text-gray-400"
                colspan="2"
              >
                No records
              </td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <td class="p-2 font-semibold dark:text-gray-100">Totals</td>
              <td class="p-2 text-right font-semibold dark:text-gray-100">
                {{ fmt(dailyTotals.paid) }}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  </div>
  <div
    v-if="showError"
    class="fixed bottom-4 right-4 bg-red-600 text-white px-4 py-2 rounded shadow-lg dark:shadow-black/40"
  >
    {{ errorMessage }}
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { t } from "../i18n";
import { todayYmd } from "../utils/date";

// Selection state
const selected = ref<"money-customer" | "money-daywise" | "daily-payment">(
  "money-customer"
);
function select(key: "money-customer" | "money-daywise" | "daily-payment") {
  selected.value = key;
}

// Date helpers
const from = ref<string>(todayYmd());
const to = ref<string>(todayYmd());
const dailyDate = ref<string>(todayYmd());

// Money Customer report
type MoneyCustomerRow = {
  date: string;
  customerId: number;
  customerName?: string;
  netBill: number;
  paid: number;
  due: number;
  previousDue: number;
  totalDue: number;
};
const rows = ref<MoneyCustomerRow[]>([]);
const totals = ref<{ netBill: number; paid: number; due: number }>({
  netBill: 0,
  paid: 0,
  due: 0,
});

// Day Wise report
type DayWiseRow = {
  customerId: number;
  customerName?: string;
  bill: number;
  discount: number;
  netBill: number;
  paid: number;
  due: number;
  previousDue: number;
  totalDue: number;
};
type DayWiseDay = {
  date: string;
  rows: DayWiseRow[];
  totals: {
    bill: number;
    discount: number;
    netBill: number;
    paid: number;
    due: number;
  };
};
const days = ref<DayWiseDay[]>([]);

// Daily payment report
type DailyRow = { customerId: number; customerName?: string; paid: number };
const dailyRows = ref<DailyRow[]>([]);
const dailyTotals = ref<{ paid: number }>({ paid: 0 });

// Error state
const showError = ref(false);
const errorMessage = ref("");

// Utilities
function fmt(n: number) {
  return Number.isFinite(n) ? n.toFixed(2) : "0.00";
}

// Loaders
async function loadMoneyCustomer() {
  try {
    const rep = await window.ahb.reportMoneyTransactionsCustomerRange(
      from.value,
      to.value
    );
    rows.value = rep.rows;
    totals.value = rep.totals;
  } catch (e) {
    handleError(e);
  }
}
async function loadMoneyDayWise() {
  try {
    const rep = await window.ahb.reportMoneyTransactionsDayWise(
      from.value,
      to.value
    );
    days.value = rep.days;
  } catch (e) {
    handleError(e);
  }
}
async function loadDailyPayments() {
  try {
    const rep = await window.ahb.reportDailyPayments(dailyDate.value);
    dailyRows.value = rep.rows;
    dailyTotals.value = rep.totals;
  } catch (e) {
    handleError(e);
  }
}
function handleError(e: unknown) {
  showError.value = true;
  errorMessage.value = (e as Error).message || String(e);
  setTimeout(() => (showError.value = false), 3000);
}

onMounted(() => {
  void loadMoneyCustomer();
});

// Printers
function printMoneyCustomer() {
  const w = window.open("", "_blank");
  if (!w) return;
  const style = `<style>*{box-sizing:border-box;}body{font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Noto Sans,Ubuntu,Cantarell,Helvetica Neue,Arial,"Apple Color Emoji","Segoe UI Emoji";padding:16px;}h1{font-size:18px;margin:0 0 8px}.meta{font-size:12px;color:#555;margin-bottom:12px}table{width:100%;border-collapse:collapse;font-size:12px}th,td{border:1px solid #e5e7eb;padding:6px 8px}th{background:#f8fafc;text-align:left}tfoot td{font-weight:600}@media print{body{padding:0}}</style>`;
  const head = `<head><meta charset="utf-8"/>${style}<title>Money Transaction — Customer Based</title></head>`;
  const rowsHtml = rows.value
    .map((r) => {
      const name =
        r.customerName ??
        (r.customerId === 0 ? t("walk_in") : String(r.customerId));
      return `<tr><td>${r.date}</td><td>${name}</td><td style="text-align:right">${fmt(r.netBill)}</td><td style="text-align:right">${fmt(r.paid)}</td><td style="text-align:right">${fmt(r.due)}</td><td style="text-align:right">${fmt(r.previousDue)}</td><td style="text-align:right">${fmt(r.totalDue)}</td></tr>`;
    })
    .join("");
  const body = `<body><h1>Money Transaction — Customer Based</h1><div class="meta">From ${from.value} To ${to.value}</div><table><thead><tr><th>Date</th><th>Customer Name</th><th style="text-align:right">Net Bill</th><th style="text-align:right">Paid</th><th style="text-align:right">Due</th><th style="text-align:right">Previous Due</th><th style="text-align:right">Total Due</th></tr></thead><tbody>${rowsHtml || `<tr><td colspan="7" style="text-align:center;color:#6b7280">No records</td></tr>`}</tbody><tfoot><tr><td colspan="2">Totals</td><td style="text-align:right">${fmt(totals.value.netBill)}</td><td style="text-align:right">${fmt(totals.value.paid)}</td><td style="text-align:right">${fmt(totals.value.due)}</td><td colspan="2"></td></tr></tfoot></table></body>`;
  w.document.open();
  w.document.write(`<html>${head}${body}</html>`);
  w.document.close();
  w.focus();
  setTimeout(() => {
    w.print();
    w.close();
  }, 100);
}
function printMoneyDayWise() {
  const w = window.open("", "_blank");
  if (!w) return;
  const style = `<style>*{box-sizing:border-box;}body{font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Noto Sans,Ubuntu,Cantarell,Helvetica Neue,Arial,"Apple Color Emoji","Segoe UI Emoji";padding:16px;}h1{font-size:18px;margin:0 0 8px}.meta{font-size:12px;color:#555;margin-bottom:12px}table{width:100%;border-collapse:collapse;font-size:12px;margin-top:8px}th,td{border:1px solid #e5e7eb;padding:6px 8px}th{background:#f8fafc;text-align:left}.day-header{display:flex;justify-content:space-between;align-items:center;background:#f3f4f6;padding:6px 8px;border:1px solid #e5e7eb;border-bottom:none;margin-top:12px}.totals{font-size:12px;color:#111827;display:flex;gap:16px}.no-records{text-align:center;color:#6b7280}@media print{body{padding:0}}</style>`;
  const head = `<head><meta charset="utf-8"/>${style}<title>Money Transaction — Day Wise</title></head>`;
  const daySections = days.value
    .map((day) => {
      const rowsHtml = day.rows
        .map((r) => {
          const name =
            r.customerName ??
            (r.customerId === 0 ? t("walk_in") : String(r.customerId));
          return `<tr><td>${name}</td><td style="text-align:right">${fmt(r.bill)}</td><td style="text-align:right">${fmt(r.discount)}</td><td style="text-align:right">${fmt(r.netBill)}</td><td style="text-align:right">${fmt(r.paid)}</td><td style="text-align:right">${fmt(r.due)}</td><td style="text-align:right">${fmt(r.previousDue)}</td><td style="text-align:right">${fmt(r.totalDue)}</td></tr>`;
        })
        .join("");
      return `<div class="day"><div class="day-header"><div><strong>Date:</strong> ${day.date}</div><div class="totals"><span>Bill: <strong>${fmt(day.totals.bill)}</strong></span><span>Discount: <strong>${fmt(day.totals.discount)}</strong></span><span>Net: <strong>${fmt(day.totals.netBill)}</strong></span><span>Paid: <strong>${fmt(day.totals.paid)}</strong></span><span>Due: <strong>${fmt(day.totals.due)}</strong></span></div></div><table><thead><tr><th>Customer</th><th style="text-align:right">Bill</th><th style="text-align:right">Discount</th><th style="text-align:right">Net Bill</th><th style="text-align:right">Paid</th><th style="text-align:right">Due</th><th style="text-align:right">Previous Due</th><th style="text-align:right">Total Due</th></tr></thead><tbody>${rowsHtml || `<tr><td class="no-records" colspan="8">No records</td></tr>`}</tbody></table></div>`;
    })
    .join("");
  const body = `<body><h1>Money Transaction — Day Wise</h1><div class="meta">From ${from.value} To ${to.value}</div>${daySections || `<div class="no-records">No days found in range</div>`}</body>`;
  w.document.open();
  w.document.write(`<html>${head}${body}</html>`);
  w.document.close();
  w.focus();
  setTimeout(() => {
    w.print();
    w.close();
  }, 100);
}
function printDailyPayments() {
  const w = window.open("", "_blank");
  if (!w) return;
  const style = `<style>*{box-sizing:border-box;}body{font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Noto Sans,Ubuntu,Cantarell,Helvetica Neue,Arial,"Apple Color Emoji","Segoe UI Emoji";padding:16px;}h1{font-size:18px;margin:0 0 8px}.meta{font-size:12px;color:#555;margin-bottom:12px}table{width:100%;border-collapse:collapse;font-size:12px}th,td{border:1px solid #e5e7eb;padding:6px 8px}th{background:#f8fafc;text-align:left}tfoot td{font-weight:600}@media print{body{padding:0}}</style>`;
  const head = `<head><meta charset="utf-8"/>${style}<title>Daily Payment Report</title></head>`;
  const rowsHtml = dailyRows.value
    .map((r) => {
      const name =
        r.customerName ??
        (r.customerId === 0 ? t("walk_in") : String(r.customerId));
      return `<tr><td>${name}</td><td style="text-align:right">${fmt(r.paid)}</td></tr>`;
    })
    .join("");
  const body = `<body><h1>Daily Payment Report</h1><div class="meta">Date ${dailyDate.value}</div><table><thead><tr><th>Customer</th><th style="text-align:right">Paid</th></tr></thead><tbody>${rowsHtml || `<tr><td colspan="2" style="text-align:center;color:#6b7280">No records</td></tr>`}</tbody><tfoot><tr><td>Totals</td><td style="text-align:right">${fmt(dailyTotals.value.paid)}</td></tr></tfoot></table></body>`;
  w.document.open();
  w.document.write(`<html>${head}${body}</html>`);
  w.document.close();
  w.focus();
  setTimeout(() => {
    w.print();
    w.close();
  }, 100);
}
</script>
