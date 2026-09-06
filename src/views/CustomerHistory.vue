<template>
  <div class="flex flex-col flex-1 min-h-0">
    <!-- Top bar: ID lookup + customer info -->
    <div
      class="flex items-start justify-end gap-6 p-4 border-b border-gray-200 dark:border-gray-700"
    >
      <div class="flex items-center gap-2 mt-1">
        <label
          class="text-sm font-medium"
          for="customer-history-id"
        >{{ t("id") }}:</label>
        <input
          id="customer-history-id"
          ref="idInputRef"
          :value="ld(customerId)"
        @input="customerId = toLatinDigits(($event.target as HTMLInputElement).value)"
          type="text"
          inputmode="numeric"
          class="w-28 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 text-sm text-right dark:text-gray-100"
          @keyup.enter="onLoadCustomer"
        >
      </div>
      <div
        class="grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-2 border border-gray-300 dark:border-gray-600 rounded-lg p-3 w-80"
      >
        <label class="text-sm">{{ t("name") }}:</label>
        <input
          type="text"
          disabled
          :value="customer?.nameBn ?? ''"
          class="bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm text-right dark:text-gray-100"
        >
        <label class="text-sm">{{ t("address") }}:</label>
        <input
          type="text"
          disabled
          :value="customer?.address ?? ''"
          class="bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm text-right dark:text-gray-100"
        >
        <label class="text-sm">{{ t("v2_receivable") }}:</label>
        <input
          type="text"
          disabled
          :value="customer ? money(customer.outstanding) : ''"
          class="bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm text-right dark:text-gray-100"
        >
      </div>
    </div>

    <!-- Invoice table -->
    <div class="flex-grow overflow-y-auto">
      <table class="w-full text-sm text-left">
        <thead
          class="text-xs uppercase bg-gray-50 dark:bg-gray-900 dark:text-gray-100 sticky top-0 border-b border-gray-200 dark:border-gray-700"
        >
          <tr>
            <th class="px-3 py-2">
              {{ t("date") }}
            </th>
            <th class="px-3 py-2 text-right">
              {{ t("total_price") }}
            </th>
            <th class="px-3 py-2 text-right">
              {{ t("discount") }}
            </th>
            <th class="px-3 py-2 text-right">
              {{ t("bill") }}
            </th>
            <th class="px-3 py-2 text-right">
              {{ t("paid") }}
            </th>
            <th class="px-3 py-2 text-right">
              {{ t("due") }}
            </th>
            <th class="px-3 py-2 text-right">
              {{ t("previous_due") }}
            </th>
            <th class="px-3 py-2 text-right">
              {{ t("current_due") }}
            </th>
            <th class="px-3 py-2">
              {{ t("comment") }}
            </th>
            <th class="px-3 py-2 text-right">
              {{ t("actions") }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="row in rows"
            :key="row.id"
            class="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            <td class="px-3 py-2 font-medium whitespace-nowrap">
              {{ formatDate(row.date) }}
            </td>
            <td class="px-3 py-2 text-right">
              {{ money(row.subtotal) }}
            </td>
            <td class="px-3 py-2 text-right">
              {{ money(row.discount) }}
            </td>
            <td class="px-3 py-2 text-right">
              {{ money(row.net) }}
            </td>
            <td class="px-3 py-2 text-right text-green-600">
              {{ money(row.paid) }}
            </td>
            <td class="px-3 py-2 text-right text-red-600">
              {{ money(row.due) }}
            </td>
            <td class="px-3 py-2 text-right">
              {{ money(row.previousDue) }}
            </td>
            <td class="px-3 py-2 text-right font-semibold">
              {{ money(row.currentDue) }}
            </td>
            <td class="px-3 py-2">
              {{ row.notes || "" }}
            </td>
            <td class="px-3 py-2 text-right">
              <button
                class="bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 py-1 px-2 rounded-md text-xs font-semibold hover:bg-gray-100 dark:hover:bg-gray-800 dark:text-gray-100"
                @click="onPrint(row.id)"
              >
                {{ t("print") }}
              </button>
            </td>
          </tr>
          <tr v-if="!rows.length">
            <td
              class="px-4 py-3 text-center text-gray-500 dark:text-gray-400"
              colspan="10"
            >
              {{ t("no_invoices") }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: "AhbCustomerHistoryView" });
import { ref, computed, onMounted, onUnmounted, nextTick } from "vue";
import { t } from "../i18n";
import {
  localizeDigits as ld,
  parseInteger,
  toLatinDigits,
} from "../utils/numerals";
import { printInvoice } from "../print/invoice";
import { MIN_CUSTOMER_ID, MAX_CUSTOMER_ID } from "../constants/business";
import { formatDate } from "../utils/date";
import type { Customer } from "../main/data";

const customerId = ref("");
const idInputRef = ref<HTMLInputElement | null>(null);
const customer = ref<Customer | null>(null);
const loadedId = ref<number | null>(null);
const products = ref<Array<{ id: number; nameBn: string; unit: string }>>([]);
const invoices = ref<
  Awaited<ReturnType<typeof window.ahb.listInvoicesByCustomer>>
>([]);

const ceil2 = (n: number) => Math.ceil(n * 100) / 100;
const rows = computed(() =>
  invoices.value.map((inv) => ({
    id: inv.id,
    date: inv.date,
    subtotal: inv.totals.subtotal,
    discount: inv.discount,
    net: inv.totals.net,
    paid: inv.paid,
    due: ceil2(Math.max(0, inv.totals.net - inv.paid)),
    previousDue: inv.previousDue,
    currentDue: inv.currentDue,
    notes: inv.notes,
  }))
);

function money(n: number) {
  if (!Number.isFinite(n)) return ld("0.00");
  return ld(
    n.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

async function onLoadCustomer() {
  const id = parseInteger(customerId.value);
  if (Number.isNaN(id) || id < MIN_CUSTOMER_ID || id > MAX_CUSTOMER_ID) {
    loadedId.value = null;
    customer.value = null;
    invoices.value = [];
    idInputRef.value?.select();
    return;
  }
  loadedId.value = id;
  await refreshCustomerData();
  idInputRef.value?.select();
}

async function refreshCustomerData() {
  if (loadedId.value === null) return;
  const id = loadedId.value;
  const [cust, invs] = await Promise.all([
    window.ahb.getCustomerById(id),
    window.ahb.listInvoicesByCustomer(id),
  ]);
  customer.value = cust;
  invoices.value = invs;
}

async function loadProducts() {
  const list = await window.ahb.listProducts({ activeOnly: false });
  products.value = list.map((p) => ({
    id: p.id,
    nameBn: p.nameBn,
    unit: p.unit,
  }));
}

let off: null | (() => void) = null;
let offLoadCustomer: null | (() => void) = null;
onMounted(async () => {
  await loadProducts();
  await nextTick();
  idInputRef.value?.focus();
  off = window.ahb.onDataChanged((p) => {
    if (p.kind === "invoice" || p.kind === "customer") {
      void refreshCustomerData();
    }
    if (p.kind === "product") {
      void loadProducts();
    }
  });
  offLoadCustomer = window.ahb.onLoadHistoryCustomer((id) => {
    customerId.value = String(id);
    void onLoadCustomer();
  });
  // Preloaded customer passed via URL hash (#customer-history/{id})
  const match = /^#customer-history\/(\d+)$/.exec(window.location.hash);
  if (match) {
    customerId.value = match[1]!;
    void onLoadCustomer();
  }
});
onUnmounted(() => {
  if (off) off();
  if (offLoadCustomer) offLoadCustomer();
});

function onPrint(id: string) {
  const inv = invoices.value.find((i) => i.id === id);
  if (!inv) return;
  const custName = customer.value?.nameBn ?? String(inv.customerId);
  const prodMap: Record<number, { name: string; unit: string }> = {};
  for (const p of products.value)
    prodMap[p.id] = { name: p.nameBn, unit: p.unit };
  // invoices.value is sorted descending by inv.no (most recent first)
  const prevInv = invoices.value.find((i) => i.no < inv.no);
  printInvoice(inv as unknown as import("../main/data").Invoice, {
    customerName: custName,
    customerPhone: customer.value?.phone,
    customerAddress: customer.value?.address,
    products: prodMap,
    previousDueDate: prevInv?.date,
  });
}
</script>
