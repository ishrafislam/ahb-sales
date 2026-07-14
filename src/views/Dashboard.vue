<template>
  <div class="flex flex-col h-screen p-3 lg:p-4 gap-3 lg:gap-4 dark:text-gray-100">
    <!-- Header band: title + product lookup panel -->
    <div class="flex items-center gap-4">
      <h1 class="text-2xl lg:text-3xl font-bold tracking-wide">
        {{ BUSINESS_NAME }}
      </h1>
      <div
        class="bg-white dark:bg-gray-900 shadow-sm border border-gray-200 dark:border-gray-700 p-3 flex flex-col gap-2 min-w-[20rem]"
      >
        <div class="flex items-center gap-2">
          <label class="text-sm whitespace-nowrap w-28">{{ t("v2_product_id") }}:</label>
          <input
            type="text"
            :value="selectedProductIdText"
            disabled
            :class="[inputClass, 'text-right disabled:opacity-70 disabled:cursor-not-allowed']"
          />
        </div>
        <div class="flex items-center gap-2">
          <label class="text-sm whitespace-nowrap w-28">{{ t("v2_stock_qty") }}:</label>
          <input
            type="text"
            :value="selectedProductStockText"
            disabled
            :class="[inputClass, 'text-right disabled:opacity-70 disabled:cursor-not-allowed']"
          />
        </div>
      </div>
    </div>

    <!-- Info band: date/customer-id, last bill, search -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-3 lg:gap-4">
      <div
        class="lg:col-span-3 bg-white dark:bg-gray-900 shadow-sm border border-gray-200 dark:border-gray-700 p-3 flex flex-col gap-2"
      >
        <div class="flex items-center gap-2">
          <label class="text-sm whitespace-nowrap flex-1">{{ t("v2_date") }}:</label>
          <input type="text" :value="todayText" :class="[inputClass, 'max-w-[9rem] text-right']" />
        </div>
        <div class="flex items-center gap-2">
          <label class="text-sm whitespace-nowrap flex-1">{{ t("v2_customer_id") }}:</label>
          <input
            ref="customerIdInput"
            v-model="customerId"
            type="text"
            :class="[inputClass, 'max-w-[9rem] text-right']"
            @keydown.enter="loadLastBill"
          />
        </div>
      </div>

      <div
        class="lg:col-span-4 bg-white dark:bg-gray-900 shadow-sm border border-gray-200 dark:border-gray-700 p-3 flex flex-col gap-2"
      >
        <div class="flex items-center gap-2">
          <label class="text-sm whitespace-nowrap w-36">{{ t("v2_last_bill_date") }}:</label>
          <input
            type="text"
            :value="lastBillDateText"
            disabled
            :class="[inputClass, 'text-right disabled:opacity-70 disabled:cursor-not-allowed']"
          />
        </div>
        <div class="flex items-center gap-2">
          <label class="text-sm whitespace-nowrap w-36">{{ t("v2_last_bill") }}:</label>
          <input
            type="text"
            :value="lastBillText"
            disabled
            :class="[inputClass, 'text-right disabled:opacity-70 disabled:cursor-not-allowed']"
          />
        </div>
      </div>

      <div
        class="lg:col-span-5 bg-white dark:bg-gray-900 shadow-sm border border-gray-200 dark:border-gray-700 p-3 flex flex-col gap-2"
      >
        <div class="flex items-center gap-2">
          <label class="text-sm whitespace-nowrap w-28">{{ t("v2_customer_name") }}:</label>
          <input type="text" :class="inputClass" />
          <button type="button" :class="[buttonClass, 'px-6 h-9 text-sm']">
            {{ t("v2_search") }}
          </button>
        </div>
        <div class="flex items-center gap-2">
          <label class="text-sm whitespace-nowrap w-28">{{ t("v2_product_name") }}:</label>
          <input type="text" :class="inputClass" />
          <button type="button" :class="[buttonClass, 'px-6 h-9 text-sm']">
            {{ t("v2_search") }}
          </button>
        </div>
      </div>
    </div>

    <!-- Main band -->
    <div class="flex-grow grid grid-cols-1 lg:grid-cols-12 gap-3 lg:gap-4 min-h-0">
      <!-- Left column -->
      <div class="lg:col-span-3 flex flex-col gap-3 lg:gap-4 min-h-0 overflow-y-auto">
        <div
          class="bg-white dark:bg-gray-900 shadow-sm border border-gray-200 dark:border-gray-700 p-3 flex flex-col gap-2"
        >
          <div class="flex items-center gap-2">
            <label class="text-sm whitespace-nowrap w-16">{{ t("v2_customer") }}:</label>
            <input type="text" :class="inputClass" />
          </div>
          <div class="flex items-center gap-2">
            <label class="text-sm whitespace-nowrap w-16">{{ t("v2_address") }}:</label>
            <input type="text" :class="inputClass" />
          </div>
          <div class="flex items-center gap-2">
            <label class="text-sm whitespace-nowrap w-16">{{ t("v2_receivable") }}:</label>
            <input type="text" :class="inputClass" />
          </div>
        </div>

        <div
          class="bg-white dark:bg-gray-900 shadow-sm border border-gray-200 dark:border-gray-700 p-3 grid grid-cols-3 gap-2"
        >
          <button
            v-for="key in printButtons"
            :key="key"
            type="button"
            :class="[buttonClass, 'min-h-[3.5rem] px-1 py-1']"
          >
            {{ t(key) }}
          </button>
        </div>

        <div
          class="bg-white dark:bg-gray-900 shadow-sm border border-gray-200 dark:border-gray-700 p-3 grid grid-cols-2 gap-2"
        >
          <button
            v-for="btn in actionButtons"
            :key="btn.key"
            type="button"
            :class="[buttonClass, 'min-h-[2.5rem] px-1 py-1']"
            @click="onActionClick(btn)"
          >
            {{ t(btn.key) }}
          </button>
        </div>

        <div
          class="bg-white dark:bg-gray-900 shadow-sm border border-gray-200 dark:border-gray-700 p-3 grid grid-cols-2 gap-2"
        >
          <button
            v-for="btn in reportButtons"
            :key="btn.key"
            type="button"
            :class="[buttonClass, 'min-h-[2.5rem] px-1 py-1']"
            @click="btn.page && emit('navigate', btn.page)"
          >
            {{ t(btn.key) }}
          </button>
          <button
            type="button"
            :class="[buttonClass, 'min-h-[2.5rem] px-1 py-1 col-span-2']"
            @click="emit('navigate', 'report-daily-payment')"
          >
            {{ t("v2_daily_payment_report") }}
          </button>
        </div>
      </div>

      <!-- Center column: product list + totals -->
      <div class="lg:col-span-6 flex flex-col gap-3 min-h-0">
        <div class="flex flex-col flex-grow min-h-0">
          <span class="text-sm mb-1">{{ t("v2_product_list") }}:</span>
          <ProductEntryTable
            ref="entryTable"
            v-model:rows="entryRows"
            @product-selected="onProductSelected"
          />
        </div>

        <div class="flex flex-col gap-2">
          <div class="flex items-center gap-2">
            <label class="text-sm whitespace-nowrap flex-1">{{ t("v2_grand_total") }}:</label>
            <input
              type="text"
              :value="grandTotalText"
              disabled
              :class="[inputClass, 'max-w-[55%] text-right disabled:opacity-70 disabled:cursor-not-allowed']"
            />
          </div>
          <div class="flex items-center gap-2">
            <label class="text-sm whitespace-nowrap flex-1">{{ t("v2_discount") }}:</label>
            <input type="text" :class="[inputClass, 'max-w-[55%]']" />
          </div>
          <div class="flex items-center gap-2">
            <label class="text-sm whitespace-nowrap flex-1">{{ t("v2_bill") }}:</label>
            <input type="text" :class="[inputClass, 'max-w-[55%]']" />
          </div>
          <div class="flex items-center gap-2">
            <label class="text-sm whitespace-nowrap flex-1">{{ t("v2_deposit") }}:</label>
            <input type="text" :class="[inputClass, 'max-w-[55%]']" />
          </div>
        </div>
      </div>

      <!-- Right column: customer status + action buttons -->
      <div class="lg:col-span-3 flex flex-col gap-3 min-h-0">
        <div class="flex flex-col flex-grow min-h-0">
          <span class="text-sm mb-1 text-right">{{ t("v2_customer_status") }}:</span>
          <div
            class="flex-grow bg-white dark:bg-gray-900 shadow-sm border border-gray-200 dark:border-gray-700 min-h-0 overflow-y-auto"
          />
        </div>
        <div class="grid grid-cols-2 gap-2">
          <button type="button" :class="[buttonClass, 'h-10']">
            {{ t("v2_post_data") }}
          </button>
          <button type="button" :class="[buttonClass, 'h-10']">
            {{ t("v2_edit") }}
          </button>
        </div>
        <button type="button" :class="[buttonClass, 'h-10 w-full']">
          {{ t("v2_payment") }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from "vue";
import { t } from "../i18n";
import ProductEntryTable, {
  type EntryRow,
} from "../components/dashboard/ProductEntryTable.vue";
import {
  BUSINESS_NAME,
  MIN_CUSTOMER_ID,
  MAX_CUSTOMER_ID,
} from "../constants/business";

const emit = defineEmits<{
  (e: "navigate", view: string, opts?: { customerId?: number }): void;
}>();

const customerId = ref("000");
const customerIdInput = ref<HTMLInputElement | null>(null);
const lastBillDateText = ref("");
const lastBillText = ref("");

const entryTable = ref<InstanceType<typeof ProductEntryTable> | null>(null);
const entryRows = ref<EntryRow[]>([]);
const selectedProductIdText = ref("");
const selectedProductStockText = ref("");

function onProductSelected(payload: { id: number; stock: number } | null) {
  selectedProductIdText.value = payload ? String(payload.id) : "";
  selectedProductStockText.value = payload ? String(payload.stock) : "";
}

const ceil2 = (n: number) => Math.ceil(n * 100) / 100;
const grandTotal = computed(() =>
  entryRows.value.reduce((sum, row) => {
    if (!row.product) return sum;
    const amount = Number.parseFloat(row.amountText);
    if (!Number.isFinite(amount) || amount <= 0) return sum;
    if (row.price === null) return sum;
    return sum + ceil2(amount * row.price);
  }, 0)
);
const grandTotalText = computed(() =>
  entryRows.value.some((r) => r.product) ? grandTotal.value.toFixed(2) : ""
);

onMounted(async () => {
  await nextTick();
  customerIdInput.value?.focus();
  customerIdInput.value?.select();
});

async function loadLastBill() {
  const id = parseCustomerId();
  if (id === undefined) {
    lastBillDateText.value = "—";
    lastBillText.value = "—";
    customerIdInput.value?.select();
    return;
  }
  try {
    const invoices = await window.ahb.listInvoicesByCustomer(id);
    if (!invoices || invoices.length === 0) {
      lastBillDateText.value = "—";
      lastBillText.value = "—";
    } else {
      const latest = invoices[0]!;
      lastBillDateText.value = new Date(latest.date).toLocaleDateString("en-GB");
      lastBillText.value = latest.totals.net.toFixed(2);
    }
  } catch {
    lastBillDateText.value = "—";
    lastBillText.value = "—";
  }
  // Start product entry: focus moves into the first row's ID cell
  selectedProductIdText.value = "";
  selectedProductStockText.value = "";
  entryTable.value?.startEntry();
}

const inputClass =
  "flex-1 min-w-0 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 px-2 py-1.5 text-sm dark:text-gray-100";

const buttonClass =
  "bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-sm leading-tight dark:text-gray-100";

const printButtons = ["v2_single_print", "v2_direct_print", "v2_select_print"];

function parseCustomerId(): number | undefined {
  const id = Number.parseInt(customerId.value, 10);
  if (Number.isNaN(id) || id < MIN_CUSTOMER_ID || id > MAX_CUSTOMER_ID) {
    return undefined;
  }
  return id;
}

function onActionClick(btn: { key: string; page?: string }) {
  if (!btn.page) return;
  const id = btn.page === "customer-history" ? parseCustomerId() : undefined;
  if (id !== undefined) {
    emit("navigate", btn.page, { customerId: id });
  } else {
    emit("navigate", btn.page);
  }
}

const actionButtons: { key: string; page?: string }[] = [
  { key: "v2_history", page: "customer-history" },
  // TODO(revamp/v2): action undecided
  { key: "v2_refresh" },
  { key: "v2_cust_form", page: "customers" },
  { key: "v2_item_form", page: "products" },
  { key: "v2_cust_list", page: "customers" },
  { key: "v2_item_list", page: "products" },
];

const reportButtons: { key: string; page?: string }[] = [
  { key: "v2_item_purchase_history", page: "product-purchase-history" },
  { key: "v2_item_sale_history", page: "product-sales-history" },
  { key: "v2_purchase_entry", page: "purchase-entry" },
  // TODO(revamp/v2): target undecided
  { key: "v2_total_sell" },
  { key: "v2_daily_report", page: "report-money-daywise" },
  { key: "v2_client_report", page: "report-money-customer" },
];

const todayText = computed(() => {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = String(d.getFullYear() % 100).padStart(2, "0");
  return `${dd}/${mm}/${yy}`;
});
</script>
