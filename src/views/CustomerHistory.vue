<template>
  <div class="flex flex-1 min-h-0">
    <!-- Left list: customers -->
    <div class="w-[25%] border-r border-gray-200 flex flex-col">
      <div ref="leftListRef" class="flex-grow overflow-y-auto">
        <ul>
          <li
            v-for="id in idList"
            :key="id"
            class="px-3 py-2 border-b border-gray-200 cursor-pointer hover:bg-gray-100"
            :class="{ 'bg-blue-100': selectedId === id }"
            :data-id="id"
            @click="onSelectCustomer(id)"
          >
            <div class="flex items-center">
              <div class="font-medium text-sm text-right w-10">
                {{ id }}
              </div>
              <div class="text-sm text-gray-600 ml-4">
                {{ customersById.get(id)?.nameBn || "" }}
              </div>
            </div>
          </li>
        </ul>
      </div>
    </div>

    <!-- Right pane: invoice table -->
    <div class="w-[75%] flex flex-col overflow-hidden">
      <div class="flex-grow overflow-y-auto">
        <table class="w-full text-sm text-left">
          <thead class="text-xs uppercase bg-gray-50 sticky top-0">
            <tr>
              <th class="px-3 py-2">
                {{ t("date") }}
              </th>
              <th class="px-3 py-2 text-right">
                {{ t("total_price") }}
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
              class="bg-white border-b hover:bg-gray-50"
            >
              <td class="px-3 py-2 font-medium whitespace-nowrap">
                {{ formatDate(row.date) }}
              </td>
              <td class="px-3 py-2 text-right">
                {{ money(row.subtotal) }}
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
                  class="bg-white border border-gray-300 py-1 px-2 rounded-md text-xs font-semibold hover:bg-gray-100"
                  @click="onPrint(row.id)"
                >
                  {{ t("print") }}
                </button>
              </td>
            </tr>
            <tr v-if="!rows.length">
              <td class="px-4 py-3 text-center text-gray-500" colspan="8">
                {{ t("no_invoices") }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: "AhbCustomerHistoryView" });
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from "vue";
import { t } from "../i18n";
import { printInvoice } from "../print/invoice";
import { BUSINESS_NAME } from "../constants/business";

type Cust = { id: number; nameBn: string };

const customers = ref<Cust[]>([]);
const products = ref<Array<{ id: number; nameBn: string; unit: string }>>([]);
const selectedId = ref<number>(1);
const invoices = ref<
  Awaited<ReturnType<typeof window.ahb.listInvoicesByCustomer>>
>([]);

const ceil2 = (n: number) => Math.ceil(n * 100) / 100;
const rows = computed(() =>
  invoices.value.map((inv) => ({
    id: inv.id,
    date: inv.date,
    subtotal: inv.totals.subtotal,
    net: inv.totals.net,
    paid: inv.paid,
    due: ceil2(Math.max(0, inv.totals.net - inv.paid)),
    previousDue: inv.previousDue,
    currentDue: inv.currentDue,
    notes: inv.notes,
  }))
);

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("en-GB");
  } catch {
    return iso;
  }
}
function money(n: number) {
  if (!Number.isFinite(n)) return "0.00";
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function onSelectCustomer(id: number) {
  selectedId.value = id;
  void loadInvoices();
  void scrollSelectedIntoView();
}

const idList = computed(() => Array.from({ length: 1000 }, (_, i) => i + 1));
const customersById = computed(() => {
  const m = new Map<number, Cust>();
  for (const c of customers.value) m.set(c.id, c);
  return m;
});

async function loadCustomers() {
  const list = await window.ahb.listCustomers({ activeOnly: false });
  customers.value = list.map((c) => ({ id: c.id, nameBn: c.nameBn }));
  // Ensure selectedId stays in range
  if (selectedId.value < 1 || selectedId.value > 1000) selectedId.value = 1;
  await scrollSelectedIntoView();
}
async function loadInvoices() {
  invoices.value = await window.ahb.listInvoicesByCustomer(selectedId.value);
}
async function loadProducts() {
  const list = await window.ahb.listProducts({ activeOnly: false });
  products.value = list.map((p) => ({
    id: p.id,
    nameBn: p.nameBn,
    unit: p.unit,
  }));
}

const leftListRef = ref<HTMLElement | null>(null);
async function scrollSelectedIntoView() {
  await nextTick();
  const container = leftListRef.value;
  if (!container) return;
  const el = container.querySelector(
    `[data-id="${selectedId.value}"]`
  ) as HTMLElement | null;
  if (el) {
    el.scrollIntoView({ block: "nearest" });
  }
}

let off: null | (() => void) = null;
onMounted(async () => {
  await Promise.all([loadCustomers(), loadInvoices(), loadProducts()]);
  await scrollSelectedIntoView();
  off = window.ahb.onDataChanged((p) => {
    if (p.kind === "invoice" || p.kind === "customer") {
      void loadCustomers();
      void loadInvoices();
      void loadProducts();
      void scrollSelectedIntoView();
    }
    if (p.kind === "product") {
      void loadProducts();
    }
  });
});
onUnmounted(() => {
  if (off) off();
});

watch(selectedId, () => {
  void scrollSelectedIntoView();
});

function onPrint(id: string) {
  const inv = invoices.value.find((i) => i.id === id);
  if (!inv) return;
  const custName =
    customersById.value.get(inv.customerId)?.nameBn ?? String(inv.customerId);
  const prodMap: Record<number, { name: string; unit: string }> = {};
  for (const p of products.value)
    prodMap[p.id] = { name: p.nameBn, unit: p.unit };
  printInvoice(inv as unknown as import("../main/data").Invoice, {
    businessName: BUSINESS_NAME,
    customerName: custName,
    products: prodMap,
  });
}
</script>
