<template>
  <div class="flex-1">
    <div
      class="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md p-3 mb-3"
    >
      <div class="flex flex-wrap items-end gap-2">
        <div class="flex flex-col">
          <label class="text-xs text-gray-600 dark:text-gray-300">
            {{ t("from") }}
          </label>
          <input
            v-model="from"
            type="date"
            class="bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1 text-sm dark:text-gray-100"
          />
        </div>
        <div class="flex flex-col">
          <label class="text-xs text-gray-600 dark:text-gray-300">
            {{ t("to") }}
          </label>
          <input
            v-model="to"
            type="date"
            class="bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1 text-sm dark:text-gray-100"
          />
        </div>
        <button class="ml-auto btn btn-primary" @click="load">
          {{ t("fetch") }}
        </button>
        <button class="btn" :disabled="days.length === 0" @click="printReport">
          {{ t("print") }}
        </button>
      </div>
    </div>
    <div
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
          <div class="font-semibold">{{ t("date") }}: {{ day.date }}</div>
          <div class="text-sm text-gray-700 dark:text-gray-300 flex gap-4">
            <span>
              {{ t("bill") }}: <strong>{{ fmt(day.totals.bill) }}</strong>
            </span>
            <span>
              {{ t("discount") }}:
              <strong>{{ fmt(day.totals.discount) }}</strong>
            </span>
            <span>
              {{ t("net") }}: <strong>{{ fmt(day.totals.netBill) }}</strong>
            </span>
            <span>
              {{ t("paid") }}: <strong>{{ fmt(day.totals.paid) }}</strong>
            </span>
            <span>
              {{ t("due") }}: <strong>{{ fmt(day.totals.due) }}</strong>
            </span>
          </div>
        </div>
        <div class="overflow-auto">
          <table class="w-full text-sm">
            <thead>
              <tr
                class="text-left border-b border-gray-200 dark:border-gray-700"
              >
                <th
                  class="p-2 sticky top-0 bg-white dark:bg-gray-900 z-10 dark:text-gray-100"
                >
                  {{ t("customer") }}
                </th>
                <th
                  class="p-2 text-right sticky top-0 bg-white dark:bg-gray-900 z-10 dark:text-gray-100"
                >
                  {{ t("bill") }}
                </th>
                <th
                  class="p-2 text-right sticky top-0 bg-white dark:bg-gray-900 z-10 dark:text-gray-100"
                >
                  {{ t("discount") }}
                </th>
                <th
                  class="p-2 text-right sticky top-0 bg-white dark:bg-gray-900 z-10 dark:text-gray-100"
                >
                  {{ t("net_bill") }}
                </th>
                <th
                  class="p-2 text-right sticky top-0 bg-white dark:bg-gray-900 z-10 dark:text-gray-100"
                >
                  {{ t("paid") }}
                </th>
                <th
                  class="p-2 text-right sticky top-0 bg-white dark:bg-gray-900 z-10 dark:text-gray-100"
                >
                  {{ t("due") }}
                </th>
                <th
                  class="p-2 text-right sticky top-0 bg-white dark:bg-gray-900 z-10 dark:text-gray-100"
                >
                  {{ t("previous_due") }}
                </th>
                <th
                  class="p-2 text-right sticky top-0 bg-white dark:bg-gray-900 z-10 dark:text-gray-100"
                >
                  {{ t("total_due") }}
                </th>
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
                <td class="p-2 text-right">
                  {{ fmt(r.bill) }}
                </td>
                <td class="p-2 text-right">
                  {{ fmt(r.discount) }}
                </td>
                <td class="p-2 text-right">
                  {{ fmt(r.netBill) }}
                </td>
                <td class="p-2 text-right">
                  {{ fmt(r.paid) }}
                </td>
                <td class="p-2 text-right">
                  {{ fmt(r.due) }}
                </td>
                <td class="p-2 text-right">
                  {{ fmt(r.previousDue) }}
                </td>
                <td class="p-2 text-right">
                  {{ fmt(r.totalDue) }}
                </td>
              </tr>
              <tr v-if="day.rows.length === 0">
                <td
                  class="p-2 text-center text-gray-500 dark:text-gray-400"
                  colspan="8"
                >
                  {{ t("no_records") }}
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
        {{ t("no_days_found") }}
      </div>
    </div>
  </div>

  <!-- Error toast -->
  <div
    v-if="showError"
    class="fixed bottom-4 right-4 bg-red-600 text-white px-4 py-2 rounded shadow-lg"
  >
    {{ errorMessage }}
  </div>
</template>
<script setup lang="ts">
import { ref, onMounted } from "vue";
import { t } from "../i18n";

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

const todayYmd = () => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const from = ref<string>(todayYmd());
const to = ref<string>(todayYmd());
const days = ref<DayWiseDay[]>([]);
function fmt(n: number) {
  return Number.isFinite(n) ? n.toFixed(2) : "0.00";
}
async function load() {
  try {
    const rep = await window.ahb.reportMoneyTransactionsDayWise(
      from.value,
      to.value
    );
    days.value = rep.days;
  } catch (err: unknown) {
    loading.value = false;
    const msg = err instanceof Error ? err.message : String(err);
    showError.value = true;
    errorMessage.value = msg;
    setTimeout(() => (showError.value = false), 3000);
  }
async function printReport() {
  const s = await window.ahb.getPrintSettings();
  const page = `@page { size: ${s.paperSize} ${s.orientation}; margin: ${s.marginMm}mm; }`;
  const style = `
    <style>
      ${page}
      * { box-sizing: border-box; }
      body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Noto Sans, Ubuntu, Cantarell, Helvetica Neue, Arial, "Apple Color Emoji", "Segoe UI Emoji"; padding: 16px; }
      h1 { font-size: 18px; margin: 0 0 8px; }
      .meta { font-size: 12px; color: #555; margin-bottom: 12px; }
      table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 8px; }
      th, td { border: 1px solid #e5e7eb; padding: 6px 8px; }
      th { background: #f8fafc; text-align: left; }
      .day-header { display:flex; justify-content: space-between; align-items: center; background: #f3f4f6; padding: 6px 8px; border: 1px solid #e5e7eb; border-bottom: none; margin-top: 12px; }
      .totals { font-size: 12px; color: #111827; display: flex; gap: 16px; }
      .no-records { text-align:center; color:#6b7280; }
      @media print { body { padding: 0; } }
    </style>
  `;
  const head = `<head><meta charset="utf-8" />${style}<title>Money Transaction — Day Wise</title></head>`;
  const daySections = days.value
    .map((day) => {
      const rowsHtml = day.rows
        .map(
          (r) => `
      <tr>
        <td>${r.customerName ?? (r.customerId === 0 ? t("walk_in") : String(r.customerId))}</td>
        <td style="text-align:right">${fmt(r.bill)}</td>
        <td style="text-align:right">${fmt(r.discount)}</td>
        <td style="text-align:right">${fmt(r.netBill)}</td>
        <td style="text-align:right">${fmt(r.paid)}</td>
        <td style="text-align:right">${fmt(r.due)}</td>
        <td style="text-align:right">${fmt(r.previousDue)}</td>
        <td style="text-align:right">${fmt(r.totalDue)}</td>
      </tr>
    `
        )
        .join("");
      return `
      <div class="day">
        <div class="day-header">
          <div><strong>Date:</strong> ${day.date}</div>
          <div class="totals">
            <span>Bill: <strong>${fmt(day.totals.bill)}</strong></span>
            <span>Discount: <strong>${fmt(day.totals.discount)}</strong></span>
            <span>Net: <strong>${fmt(day.totals.netBill)}</strong></span>
            <span>Paid: <strong>${fmt(day.totals.paid)}</strong></span>
            <span>Due: <strong>${fmt(day.totals.due)}</strong></span>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Customer</th>
              <th style="text-align:right">Bill</th>
              <th style="text-align:right">Discount</th>
              <th style="text-align:right">Net Bill</th>
              <th style="text-align:right">Paid</th>
              <th style="text-align:right">Due</th>
              <th style="text-align:right">Previous Due</th>
              <th style="text-align:right">Total Due</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml || `<tr><td class="no-records" colspan="8">No records</td></tr>`}
          </tbody>
        </table>
      </div>
    `;
    })
    .join("");
  const body = `
  <body>
    <h1>Money Transaction — Day Wise</h1>
    <div class="meta">From ${from.value} To ${to.value}</div>
    ${daySections || `<div class="no-records">No days found in range</div>`}
  </body>`;
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.open();
  w.document.write(`<html>${head}${body}</html>`);
  w.document.close();
  w.focus();
  setTimeout(() => {
    w.print();
    w.close();
  }, 100);
}

onMounted(() => {
  void load();
});

const showError = ref(false);
const errorMessage = ref("");
</script>
