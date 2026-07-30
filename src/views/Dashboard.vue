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
            <input
              type="text"
              :value="customerNameText"
              disabled
              :class="[inputClass, 'text-right disabled:opacity-70 disabled:cursor-not-allowed']"
            />
          </div>
          <div class="flex items-center gap-2">
            <label class="text-sm whitespace-nowrap w-16">{{ t("v2_address") }}:</label>
            <input
              type="text"
              :value="customerAddressText"
              disabled
              :class="[inputClass, 'text-right disabled:opacity-70 disabled:cursor-not-allowed']"
            />
          </div>
          <div class="flex items-center gap-2">
            <label class="text-sm whitespace-nowrap w-16">{{ t("v2_receivable") }}:</label>
            <input
              type="text"
              :value="customerReceivableText"
              disabled
              :class="[inputClass, 'text-right disabled:opacity-70 disabled:cursor-not-allowed']"
            />
          </div>
        </div>

        <div
          class="bg-white dark:bg-gray-900 shadow-sm border border-gray-200 dark:border-gray-700 p-3 grid grid-cols-3 gap-2"
        >
          <button
            v-for="btn in printButtons"
            :key="btn.key"
            type="button"
            :class="[buttonClass, 'min-h-[3.5rem] px-1 py-1']"
            :disabled="btn.enabled ? !btn.enabled.value : false"
            @click="btn.handler?.()"
          >
            {{ t(btn.key) }}
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
            @click="onReportClick(btn)"
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
            :locked="posted"
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
            <input
              ref="discountInput"
              v-model="discountText"
              type="text"
              inputmode="decimal"
              :disabled="posted"
              :class="[inputClass, 'max-w-[55%] text-right disabled:opacity-70 disabled:cursor-not-allowed']"
              @keydown.enter.prevent="onDiscountEnter"
              @blur="onDiscountBlur"
            />
          </div>
          <div class="flex items-center gap-2">
            <label class="text-sm whitespace-nowrap flex-1">{{ t("v2_bill") }}:</label>
            <input
              type="text"
              :value="billText"
              disabled
              :class="[inputClass, 'max-w-[55%] text-right disabled:opacity-70 disabled:cursor-not-allowed']"
            />
          </div>
          <div class="flex items-center gap-2">
            <label class="text-sm whitespace-nowrap flex-1">{{ t("v2_deposit") }}:</label>
            <input
              type="text"
              :value="paidTotalText"
              disabled
              :class="[inputClass, 'max-w-[55%] text-right disabled:opacity-70 disabled:cursor-not-allowed']"
            />
          </div>
        </div>
      </div>

      <!-- Right column: customer status + action buttons -->
      <div class="lg:col-span-3 flex flex-col gap-3 min-h-0">
        <div class="flex flex-col flex-grow min-h-0">
          <span class="text-sm mb-1 text-right">{{ t("v2_customer_status") }}:</span>
          <CustomerStatusPanel
            v-model:comment="comment"
            :status="postedStatus"
            :locked="posted"
          />
        </div>
        <p
          v-if="postError"
          class="text-sm text-red-600 dark:text-red-400"
        >
          {{ postError }}
        </p>
        <div class="grid grid-cols-2 gap-2">
          <button
            type="button"
            :class="[buttonClass, 'h-10 disabled:opacity-70 disabled:cursor-not-allowed']"
            :disabled="posted"
            @click="onPostData"
          >
            {{ t("v2_post_data") }}
          </button>
          <button
            type="button"
            :class="[buttonClass, 'h-10 disabled:opacity-70 disabled:cursor-not-allowed']"
            :disabled="mode !== 'posted'"
            @click="onEdit"
          >
            {{ t("v2_edit") }}
          </button>
        </div>
        <button
          type="button"
          :class="[buttonClass, 'h-10 w-full disabled:opacity-70 disabled:cursor-not-allowed']"
          :disabled="mode !== 'posted'"
          @click="onPayment"
        >
          {{ t("v2_payment") }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref } from "vue";
import { t } from "../i18n";
import type { Invoice } from "../main/data";
import ProductEntryTable, {
  type EntryRow,
} from "../components/dashboard/ProductEntryTable.vue";
import CustomerStatusPanel, {
  type PostedStatus,
} from "../components/dashboard/CustomerStatusPanel.vue";
import {
  BUSINESS_NAME,
  MIN_CUSTOMER_ID,
  MAX_CUSTOMER_ID,
} from "../constants/business";
import {
  buildInvoiceDocument,
  type ProductInfo,
} from "../print/invoice";

const emit = defineEmits<{
  (e: "navigate", view: string, opts?: { customerId?: number }): void;
}>();

const customerId = ref("000");
const customerIdInput = ref<HTMLInputElement | null>(null);
const lastBillDateText = ref("");
const lastBillText = ref("");

const customerNameText = ref("");
const customerAddressText = ref("");
const customerReceivableText = ref("");

function setCustomerInfo(
  customer: { nameBn: string; address?: string; outstanding: number } | null
) {
  customerNameText.value = customer?.nameBn ?? "";
  customerAddressText.value = customer?.address ?? "";
  customerReceivableText.value = customer
    ? customer.outstanding.toFixed(2)
    : "";
}

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

// Discount is a draft until committed with Enter (same pattern as the
// price cells); the bill is always derived from the committed value.
const discountInput = ref<HTMLInputElement | null>(null);
const discountText = ref("");
const discount = ref(0);

function onDiscountEnter() {
  const d = Number.parseFloat(discountText.value);
  if (!Number.isFinite(d) || d < 0 || d > grandTotal.value) {
    discountText.value = discount.value > 0 ? discount.value.toFixed(2) : "";
  } else {
    discount.value = d;
    discountText.value = d.toFixed(2);
  }
  discountInput.value?.select();
}

function onDiscountBlur() {
  discountText.value = discount.value > 0 ? discount.value.toFixed(2) : "";
}

const bill = computed(() =>
  ceil2(Math.max(0, grandTotal.value - discount.value))
);
const billText = computed(() =>
  entryRows.value.some((r) => r.product) ? bill.value.toFixed(2) : ""
);

// Deposit (জমা): read-only running total of payments made against the
// posted invoice — payments are added only through the payment window.
const paidTotal = ref(0);
const paidTotalText = computed(() => paidTotal.value.toFixed(2));

// Posting: "entry" → fresh form; "posted" → locked, invoice saved;
// "editing" → unlocked again, Post Data updates the same invoice.
const mode = ref<"entry" | "posted" | "editing">("entry");
const posted = computed(() => mode.value === "posted");
const postedInvoiceId = ref<string | null>(null);
const postedStatus = ref<PostedStatus | null>(null);
const postError = ref("");
const comment = ref("");
let posting = false;

function onEdit() {
  if (mode.value !== "posted") return;
  mode.value = "editing";
  entryTable.value?.resumeEntry();
}

function applyInvoiceToStatus(inv: Invoice) {
  postedStatus.value = {
    totalPrice: inv.totals.subtotal,
    discount: inv.discount,
    bill: inv.totals.net,
    deposit: inv.paid,
    difference: ceil2(Math.max(0, inv.totals.net - inv.paid)),
    previousDue: inv.previousDue,
    nextDue: inv.currentDue,
  };
  paidTotal.value = inv.paid;
}

function onPayment() {
  if (mode.value !== "posted" || postedInvoiceId.value === null) return;
  void window.ahb.openPaymentWindow(postedInvoiceId.value);
}

// Payments recorded in the payment window arrive as data-changed events;
// refresh the deposit/status/receivable fields from the updated invoice.
async function onDataChanged(payload: {
  kind: string;
  action: string;
  id: number;
}) {
  if (payload.kind !== "invoice" || payload.action !== "payment") return;
  const invoiceId = postedInvoiceId.value;
  if (invoiceId === null) return;
  const inv = await window.ahb.getInvoiceById(invoiceId);
  if (!inv || postedInvoiceId.value !== invoiceId) return;
  applyInvoiceToStatus(inv);
  customerReceivableText.value = inv.currentDue.toFixed(2);
}

async function onPostData() {
  if (posted.value || posting) return;
  postError.value = "";
  const custId = parseCustomerId();
  if (custId === undefined) return;
  const lines = entryRows.value.flatMap((row) => {
    if (!row.product || row.price === null) return [];
    const quantity = Number.parseFloat(row.amountText);
    if (!Number.isFinite(quantity) || quantity <= 0) return [];
    return [{ productId: row.product.id, quantity, rate: row.price }];
  });
  if (!lines.length) return;
  posting = true;
  try {
    const payload = {
      customerId: custId,
      // Selling to an empty slot creates the customer at that id
      createMissingCustomer: true,
      lines,
      discount: discount.value,
      // Payments are only added via the payment window; edits carry the
      // invoice's accumulated paid total forward.
      paid: mode.value === "editing" ? paidTotal.value : 0,
      notes: comment.value.trim() || undefined,
    };
    const inv =
      mode.value === "editing" && postedInvoiceId.value !== null
        ? await window.ahb.updateInvoice(postedInvoiceId.value, payload)
        : await window.ahb.postInvoice(payload);
    applyInvoiceToStatus(inv);
    customerReceivableText.value = inv.currentDue.toFixed(2);
    comment.value = inv.notes ?? "";
    postedInvoiceId.value = inv.id;
    // Hide incomplete rows (e.g. the auto-appended trailing empty row)
    entryRows.value = entryRows.value.filter((row) => {
      if (!row.product) return false;
      const quantity = Number.parseFloat(row.amountText);
      return Number.isFinite(quantity) && quantity > 0;
    });
    mode.value = "posted";
  } catch (e) {
    postError.value = e instanceof Error ? e.message : String(e);
  } finally {
    posting = false;
  }
}

let unsubscribeDataChanged: (() => void) | null = null;

onMounted(async () => {
  unsubscribeDataChanged =
    window.ahb.onDataChanged?.((payload) => void onDataChanged(payload)) ??
    null;
  await nextTick();
  customerIdInput.value?.focus();
  customerIdInput.value?.select();
});

onUnmounted(() => {
  unsubscribeDataChanged?.();
});

async function loadLastBill() {
  const id = parseCustomerId();
  if (id === undefined) {
    lastBillDateText.value = "—";
    lastBillText.value = "—";
    setCustomerInfo(null);
    customerIdInput.value?.select();
    return;
  }
  let todayInvoice: Invoice | null = null;
  try {
    const [invoices, customer] = await Promise.all([
      window.ahb.listInvoicesByCustomer(id),
      window.ahb.getCustomerById(id),
    ]);
    setCustomerInfo(customer);
    if (!invoices || invoices.length === 0) {
      lastBillDateText.value = "—";
      lastBillText.value = "—";
    } else {
      const latest = invoices[0]!;
      lastBillDateText.value = new Date(latest.date).toLocaleDateString("en-GB");
      lastBillText.value = latest.totals.net.toFixed(2);
      if (isToday(latest.date)) todayInvoice = latest;
    }
  } catch {
    lastBillDateText.value = "—";
    lastBillText.value = "—";
    setCustomerInfo(null);
  }
  selectedProductIdText.value = "";
  selectedProductStockText.value = "";
  discount.value = 0;
  discountText.value = "";
  paidTotal.value = 0;
  mode.value = "entry";
  postedInvoiceId.value = null;
  postedStatus.value = null;
  postError.value = "";
  comment.value = "";
  if (todayInvoice) {
    // An invoice from today loads into the locked posted state, exactly
    // as right after Post Data: Edit unlocks it, Payment applies to it.
    await loadPostedInvoice(todayInvoice);
  } else {
    // Start product entry: focus moves into the first row's ID cell
    entryTable.value?.startEntry();
  }
}

function isToday(iso: string): boolean {
  const d = new Date(iso);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

let loadedRowKey = -1;
async function loadPostedInvoice(inv: Invoice) {
  const rows = await Promise.all(
    inv.lines.map(async (line): Promise<EntryRow> => {
      let product: { nameBn: string; stock: number } | null = null;
      try {
        product = await window.ahb.getProductById(line.productId);
      } catch {
        product = null;
      }
      return {
        key: loadedRowKey--,
        idText: String(line.productId),
        product: {
          id: line.productId,
          nameBn: product?.nameBn ?? line.description ?? "",
          unit: line.unit,
          price: line.rate,
          stock: product?.stock ?? 0,
        },
        amountText: String(line.quantity),
        priceText: line.rate.toFixed(2),
        price: line.rate,
      };
    })
  );
  entryRows.value = rows;
  discount.value = inv.discount;
  discountText.value = inv.discount > 0 ? inv.discount.toFixed(2) : "";
  comment.value = inv.notes ?? "";
  postedInvoiceId.value = inv.id;
  applyInvoiceToStatus(inv);
  mode.value = "posted";
}

const inputClass =
  "flex-1 min-w-0 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 px-2 py-1.5 text-sm dark:text-gray-100";

const buttonClass =
  "bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-sm leading-tight dark:text-gray-100";

// Only Single Print is wired so far; the other two carry no handler yet.
const printButtons: Array<{
  key: string;
  handler?: () => void;
  enabled?: { value: boolean };
}> = [
  { key: "v2_single_print", handler: () => void onSinglePrint(), enabled: posted },
  { key: "v2_direct_print" },
  { key: "v2_select_print" },
];

/** Send the posted invoice's receipt to the print preview window. */
async function onSinglePrint() {
  if (mode.value !== "posted" || postedInvoiceId.value === null) return;
  const inv = await window.ahb.getInvoiceById(postedInvoiceId.value);
  if (!inv) return;

  // Names and units for the receipt lines: the entry rows already hold the
  // products that were posted, and anything missing is fetched by id.
  const products: Record<number, ProductInfo> = {};
  for (const row of entryRows.value) {
    if (row.product) {
      products[row.product.id] = {
        name: row.product.nameBn,
        unit: row.product.unit,
      };
    }
  }
  for (const ln of inv.lines) {
    if (products[ln.productId]) continue;
    const p = await window.ahb.getProductById(ln.productId);
    if (p) products[ln.productId] = { name: p.nameBn, unit: p.unit };
  }

  // The receipt dates the previous due from the customer's prior invoice.
  // listInvoicesByCustomer comes back newest-first by invoice number.
  let previousDueDate: string | undefined;
  if (inv.customerId != null) {
    const list = await window.ahb.listInvoicesByCustomer(inv.customerId);
    previousDueDate = list.find((i) => i.no < inv.no)?.date;
  }

  void window.ahb.openPrintPreview(
    buildInvoiceDocument(inv, {
      businessName: BUSINESS_NAME,
      customerName: customerNameText.value || String(inv.customerId ?? ""),
      products,
      previousDueDate,
    })
  );
}

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

// Most of these navigate; Total Sell opens its own window instead
function onReportClick(btn: { page?: string; handler?: () => void }) {
  if (btn.handler) {
    btn.handler();
    return;
  }
  if (btn.page) emit("navigate", btn.page);
}

const reportButtons: {
  key: string;
  page?: string;
  handler?: () => void;
}[] = [
  { key: "v2_item_purchase_history", page: "product-purchase-history" },
  { key: "v2_item_sale_history", page: "product-sales-history" },
  { key: "v2_purchase_entry", page: "purchase-entry" },
  {
    key: "v2_total_sell",
    handler: () => void window.ahb.openTotalSellWindow(),
  },
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
