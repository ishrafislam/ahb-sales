<template>
  <div class="flex-1">
    <div class="bg-white border border-gray-200 rounded-md p-3 mb-3">
      <div class="flex flex-wrap items-end gap-2">
        <div class="flex flex-col">
          <label class="text-xs text-gray-600"> Date </label>
          <input
            v-model="date"
            type="date"
            class="bg-gray-50 border border-gray-300 rounded-md px-2 py-1 text-sm"
          />
        </div>
        <button
          class="ml-auto bg-blue-600 text-white px-3 py-1.5 rounded-md text-sm font-semibold hover:bg-blue-700"
          @click="load"
        >
          Fetch
        </button>
        <button
          class="bg-gray-200 text-gray-800 px-3 py-1.5 rounded-md text-sm font-semibold hover:bg-gray-300"
          :disabled="rows.length === 0"
          @click="printReport"
        >
          Print
        </button>
      </div>
    </div>
    <div class="bg-white border border-gray-200 rounded-md p-3 overflow-auto">
      <table class="w-full text-sm">
        <thead>
          <tr class="text-left border-b border-gray-200">
            <th class="p-2 sticky top-0 bg-white z-10">Customer</th>
            <th class="p-2 text-right sticky top-0 bg-white z-10">Paid</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(r, i) in rows" :key="i" class="border-b border-gray-100">
            <td class="p-2">
              {{ r.customerName ?? r.customerId }}
            </td>
            <td class="p-2 text-right">
              {{ fmt(r.paid) }}
            </td>
          </tr>
          <tr v-if="rows.length === 0">
            <td class="p-2 text-center text-gray-500" colspan="2">
              No records
            </td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <td class="p-2 font-semibold">Totals</td>
            <td class="p-2 text-right font-semibold">
              {{ fmt(totals.paid) }}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  </div>
</template>
<script setup lang="ts">
import { ref, onMounted } from "vue";

type DailyRow = { customerId: number; customerName?: string; paid: number };

const todayYmd = () => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const date = ref<string>(todayYmd());
const rows = ref<DailyRow[]>([]);
const totals = ref<{ paid: number }>({ paid: 0 });
function fmt(n: number) {
  return Number.isFinite(n) ? n.toFixed(2) : "0.00";
}
async function load() {
  try {
    const rep = await window.ahb.reportDailyPayments(date.value);
    rows.value = rep.rows;
    totals.value = rep.totals;
  } catch (err: any) {
    alert(
      "Failed to load daily payments: " +
        (err && err.message ? err.message : String(err))
    );
  }
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
      table { width: 100%; border-collapse: collapse; font-size: 12px; }
      th, td { border: 1px solid #e5e7eb; padding: 6px 8px; }
      th { background: #f8fafc; text-align: left; }
      tfoot td { font-weight: 600; }
      @media print { body { padding: 0; } }
    </style>
  `;
  const head = `<head><meta charset="utf-8" />${style}<title>Daily Payment Report</title></head>`;
  const rowsHtml = rows.value
    .map(
      (r) => `<tr>
    <td>${r.customerName ?? r.customerId}</td>
    <td style="text-align:right">${fmt(r.paid)}</td>
  </tr>`
    )
    .join("");
  const body = `
  <body>
    <h1>Daily Payment Report</h1>
    <div class="meta">Date ${date.value}</div>
    <table>
      <thead>
        <tr>
          <th>Customer</th>
          <th style="text-align:right">Paid</th>
        </tr>
      </thead>
      <tbody>${rowsHtml || `<tr><td colspan="2" style="text-align:center;color:#6b7280">No records</td></tr>`}</tbody>
      <tfoot>
        <tr>
          <td>Totals</td>
          <td style="text-align:right">${fmt(totals.value.paid)}</td>
        </tr>
      </tfoot>
    </table>
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
</script>
