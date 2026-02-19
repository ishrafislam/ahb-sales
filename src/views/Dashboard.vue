<template>
  <!-- eslint-disable -->
  <div class="flex flex-col h-screen p-3 lg:p-4 gap-3 lg:gap-4">
    <!-- Body -->
    <div
      class="flex-grow grid grid-cols-1 lg:grid-cols-4 gap-3 lg:gap-4 min-h-0"
    >
      <!-- Left column -->
      <div
        class="lg:col-span-1 flex flex-col gap-3 lg:gap-4 min-h-0 overflow-y-auto"
      >
        <FileInfoPanel
          :file-name-display="fileNameDisplay"
          :file-dirty="fileDirty"
        />

        <CustomerSearch
          v-model="customerQuery"
          :selected-customer="selectedCustomer"
          :filtered-customers="filteredCustomers"
          :dropdown-open="customerDropdownOpen"
          :highlight-index="customerHighlight"
          :placeholder="t('search_customer_placeholder')"
          :clear-label="t('clear')"
          :empty-slot-label="t('empty_slot')"
          @focus="customerDropdownOpen = true"
          @input="customerDropdownOpen = true"
          @keydown-down="moveCustomerHighlight(1)"
          @keydown-up="moveCustomerHighlight(-1)"
          @keydown-enter="confirmCustomerSelection()"
          @keydown-esc="customerDropdownOpen = false"
          @clear="clearCustomerSelection"
          @select="onSelectCustomer"
        />

        <InvoiceSummary
          :has-items="receipt.length > 0"
          :allow-partial-payment="!!selectedCustomer"
          :subtotal-text="subtotalText"
          :discount="discount"
          :net-text="netText"
          :paid="paid"
          :due-text="dueText"
          :previous-due-text="previousDueText"
          :net-due-text="netDueText"
          :notes="notes"
          :can-complete="canComplete"
          :labels="{
            totalPrice: t('total_price'),
            discount: t('discount'),
            bill: t('bill'),
            paid: t('paid'),
            due: t('due'),
            previousDue: t('previous_due'),
            netDue: t('net_due'),
            comment: t('comment'),
            complete: t('complete'),
            addProductsPrompt: t('summary_add_products_prompt'),
          }"
          @update:discount="discount = $event"
          @update:paid="paid = $event"
          @update:notes="notes = $event"
          @complete="complete"
        />

        <button
          v-if="selectedCustomer && (selectedCustomer.outstanding ?? 0) > 0"
          class="w-full bg-blue-600 text-white py-2 px-3 rounded-md text-sm font-semibold hover:bg-blue-700 transition-colors"
          @click="showMakePayment = true; makePaymentAmount = 0"
        >
          {{ t('make_payment') }}
        </button>

        <QuickActions
          :actions="quickActionsData"
          @navigate="navigate"
        />
      </div>

      <!-- Right column -->
      <div
        class="lg:col-span-3 bg-white dark:bg-gray-900 dark:text-gray-100 p-4 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col min-h-0"
      >
        <CustomerInfoBanner
          :customer="selectedCustomer"
          :last-bill-text="lastBillText"
          :labels="{
            title: t('customer_info'),
            id: t('id'),
            name: t('name'),
            lastBill: t('last_bill'),
            due: t('due'),
            selectCustomerPrompt: t('search_customer_placeholder'),
          }"
        />

        <ReceiptTable
          :rows="receiptRows"
          :labels="{
            productName: t('product_name'),
            quantity: t('quantity'),
            unit: t('unit'),
            unitPrice: t('unit_price'),
            total: t('total'),
            actions: t('actions'),
            decrease: t('decrease'),
            increase: t('increase'),
            remove: t('remove'),
            oversellWarning: t('oversell_warning'),
            noItems: t('no_items'),
          }"
          @quantity-input="onQuantityInput"
          @adjust-quantity="adjustQuantity"
          @remove-row="removeReceiptRow"
          @rate-input="onRateInput"
        />

        <ProductSearch
          v-model="productQuery"
          :filtered-products="filteredProducts"
          :dropdown-open="productDropdownOpen"
          :highlight-index="productHighlight"
          :placeholder="t('search_products_placeholder')"
          :id-label="t('id')"
          @focus="productDropdownOpen = true"
          @input="productDropdownOpen = true"
          @keydown-down="moveProductHighlight(1)"
          @keydown-up="moveProductHighlight(-1)"
          @keydown-enter="confirmProductSelection()"
          @keydown-esc="productDropdownOpen = false"
          @select="onSelectProduct"
        />

        <!-- Success toast -->
        <div
          v-if="showSuccess"
          class="fixed bottom-4 right-4 bg-green-600 dark:bg-green-700 text-white px-4 py-2 rounded shadow-lg"
        >
          {{ successMessage }}
        </div>
        <div
          v-if="showError"
          class="fixed bottom-4 right-4 bg-red-600 dark:bg-red-700 text-white px-4 py-2 rounded shadow-lg"
        >
          {{ errorMessage }}
        </div>
      </div>
    </div>

    <!-- Confirm negative stock modal -->
    <ConfirmModal
      v-if="showConfirmNegative"
      :title="t('confirm_title')"
      :message="t('confirm_negative_stock', { count: confirmOversCount })"
      :confirmLabel="t('confirm')"
      :cancelLabel="t('cancel')"
      @confirm="onConfirmNegative"
      @cancel="onCancelNegative"
    />

    <!-- Make Payment modal -->
    <div
      v-if="showMakePayment"
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
    >
      <div class="bg-white dark:bg-gray-900 rounded-md shadow-lg p-6 w-80">
        <h2 class="text-base font-semibold mb-3 dark:text-gray-100">
          {{ t('make_payment_title') }}
        </h2>
        <p class="text-sm text-gray-600 dark:text-gray-300 mb-3">
          {{ t('net_due') }}: {{ formatMoney(selectedCustomer?.outstanding ?? 0) }}
        </p>
        <input
          v-model.number="makePaymentAmount"
          type="number"
          min="0.01"
          step="0.01"
          :max="selectedCustomer?.outstanding ?? 0"
          :placeholder="t('payment_amount')"
          class="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1 text-sm mb-4 dark:text-gray-100"
        />
        <div class="flex gap-2">
          <button
            class="flex-1 bg-green-600 text-white py-1.5 rounded text-sm font-semibold hover:bg-green-700 disabled:opacity-50"
            :disabled="!makePaymentAmount || makePaymentAmount <= 0"
            @click="confirmMakePayment"
          >
            {{ t('confirm') }}
          </button>
          <button
            class="flex-1 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 py-1.5 rounded text-sm"
            @click="showMakePayment = false"
          >
            {{ t('cancel') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: "AhbDashboardView" });
import { ref, computed, onMounted, onUnmounted, watch } from "vue";
import { t } from "../i18n";
import { printInvoice } from "../print/invoice";
import { BUSINESS_NAME, MAX_CUSTOMER_ID, TOAST_DURATION_SUCCESS, TOAST_DURATION_ERROR } from "../constants/business";
import ConfirmModal from "../components/ConfirmModal.vue";
import FileInfoPanel from "../components/dashboard/FileInfoPanel.vue";
import CustomerSearch from "../components/dashboard/CustomerSearch.vue";
import InvoiceSummary from "../components/dashboard/InvoiceSummary.vue";
import QuickActions from "../components/dashboard/QuickActions.vue";
import CustomerInfoBanner from "../components/dashboard/CustomerInfoBanner.vue";
import ReceiptTable from "../components/dashboard/ReceiptTable.vue";
import ProductSearch from "../components/dashboard/ProductSearch.vue";

type Prod = {
  id: number;
  nameBn: string;
  unit: string;
  price: number;
  stock: number;
  active: boolean;
};

type Cust = {
  id: number;
  nameBn: string;
  outstanding: number;
};

const emit = defineEmits<{
  (
    e: "navigate",
    page:
      | "dashboard"
      | "products"
      | "customers"
      | "product-sales-history"
      | "product-purchase-history"
      | "customer-history"
      | "purchase-entry"
      | "report-money-customer"
      | "report-money-daywise"
      | "report-daily-payment"
      | "settings"
  ): void;
}>();

function navigate(page: Parameters<typeof emit>[1]) {
  emit("navigate", page);
}

// Draft receipt state
const customers = ref<Cust[]>([]);
const products = ref<Prod[]>([]);

const selectedCustomer = ref<Cust | null>(null);

const customerQuery = ref("");
const productQuery = ref("");
const customerDropdownOpen = ref(false);
const productDropdownOpen = ref(false);
// Walk-in is implied when no customer is selected; no toggle needed.

const allSlots = computed<Cust[]>(() => {
  const byId = new Map<number, Cust>();
  for (const c of customers.value) byId.set(c.id, c);
  return Array.from({ length: MAX_CUSTOMER_ID }, (_, i) => {
    const id = i + 1;
    const cust = byId.get(id);
    return { id, nameBn: cust?.nameBn ?? "", outstanding: cust?.outstanding ?? 0 };
  });
});

const filteredCustomers = computed<Cust[]>(() => {
  const q = customerQuery.value.trim().toLowerCase();
  if (!q) return allSlots.value.slice(0, 30);
  if (/^\d+$/.test(q))
    return allSlots.value.filter((s) => String(s.id).includes(q)).slice(0, 20);
  // Text: only match named customers
  return allSlots.value
    .filter((s) => s.nameBn && s.nameBn.toLowerCase().includes(q))
    .slice(0, 20);
});

const filteredProducts = computed(() => {
  const q = productQuery.value.trim().toLowerCase();
  if (!q) return products.value.slice(0, 20);
  return products.value
    .filter(
      (p) => String(p.id).includes(q) || p.nameBn.toLowerCase().includes(q)
    )
    .slice(0, 50);
});

type ReceiptRow = {
  productId: number;
  nameBn: string;
  unit: string;
  rate: number;
  quantity: number;
  lineTotal: number;
};
const receipt = ref<ReceiptRow[]>([]);
const discount = ref(0);
const paid = ref(0);
const notes = ref("");
const lastBillText = ref("—");
const fileNameDisplay = ref("—");
const fileDirty = ref(false);

// Quick actions data for component
const quickActionsData = computed(() => [
  {
    page: "customer-history" as const,
    label: t("customer_history_title"),
    className:
      "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900",
  },
  {
    page: "purchase-entry" as const,
    label: t("product_purchase_title"),
    className:
      "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900",
  },
  {
    page: "customers" as const,
    label: t("customers_title"),
    className:
      "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900",
  },
  {
    page: "products" as const,
    label: t("products_title"),
    className:
      "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900",
  },
  {
    page: "product-sales-history" as const,
    label: t("product_sales_history_title"),
    className:
      "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900",
  },
  {
    page: "product-purchase-history" as const,
    label: t("product_purchase_history_title"),
    className:
      "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900",
  },
  {
    page: "report-money-customer" as const,
    label: t("report_money_customer_title"),
    className:
      "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-900",
  },
  {
    page: "report-money-daywise" as const,
    label: t("report_money_daywise_title"),
    className:
      "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-900",
  },
  {
    page: "report-daily-payment" as const,
    label: t("report_daily_payment_title"),
    className:
      "col-span-2 w-full bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-900",
  },
]);

// Receipt rows with oversell flag for table component
const receiptRows = computed(() =>
  receipt.value.map((r) => ({
    ...r,
    isOversell: isOversell(r),
  }))
);

const ceil2 = (n: number) => Math.ceil(n * 100) / 100;
const formatMoney = (n: number) => (Number.isFinite(n) ? n.toFixed(2) : "0.00");

function recomputeRow(idx: number) {
  const row = receipt.value[idx];
  if (!row) return;
  if (row.quantity < 1) row.quantity = 1;
  row.lineTotal = ceil2(row.quantity * row.rate);
}

const subtotal = computed(() =>
  ceil2(receipt.value.reduce((s, r) => s + r.lineTotal, 0))
);
const subtotalText = computed(() => formatMoney(subtotal.value));
const net = computed(() => {
  const d = Number(discount.value || 0);
  const sub = subtotal.value;
  const clamped = Math.max(0, Math.min(d, sub));
  return ceil2(sub - clamped);
});
const netText = computed(() => formatMoney(net.value));
const previousDue = computed(() =>
  Number(selectedCustomer.value?.outstanding || 0)
);
const previousDueText = computed(() => formatMoney(previousDue.value));
const due = computed(() => {
  const p = Number(paid.value || 0);
  const n = net.value;
  const clamped = Math.max(0, Math.min(p, previousDue.value + n));
  return ceil2(Math.max(0, n - clamped));
});
const dueText = computed(() => formatMoney(due.value));
const netDue = computed(() => ceil2(previousDue.value + due.value));
const netDueText = computed(() => formatMoney(netDue.value));

const canComplete = computed(() => {
  if (receipt.value.length === 0) return false;
  if (discount.value > subtotal.value) return false;
  if (paid.value < 0) return false;
  if (!selectedCustomer.value) {
    // No slot at all: walk-in must be fully paid
    return Math.abs(net.value - paid.value) < 0.005;
  }
  // Any slot (empty or real): partial payment allowed
  return paid.value <= previousDue.value + net.value;
});

async function complete() {
  if (receipt.value.length === 0) return;
  // If any line exceeds current stock, show non-blocking confirm modal
  const overs = receipt.value.filter((r) => isOversell(r)).length;
  if (overs > 0) {
    confirmOversCount.value = overs;
    showConfirmNegative.value = true;
    return;
  }
  await doPostInvoice();
}

async function doPostInvoice() {
  try {
    const slot = selectedCustomer.value;
    // Auto-create a bare customer record for empty slots
    if (slot && !customers.value.some((c) => c.id === slot.id)) {
      await window.ahb.addCustomer({ id: slot.id, nameBn: "" });
      await loadCustomers();
    }
    const payload = {
      date: new Date().toISOString(),
      customerId: slot ? slot.id : null,
      discount: Number(discount.value || 0),
      paid: Number(paid.value || 0),
      notes: notes.value,
      lines: receipt.value.map((r) => ({
        productId: r.productId,
        quantity: r.quantity,
        rate: r.rate,
      })),
    };
    const inv = await window.ahb.postInvoice(payload as unknown);
    showSuccess.value = true;
    successMessage.value = t("receipt_saved", { no: inv.no });
    setTimeout(() => (showSuccess.value = false), TOAST_DURATION_SUCCESS);
    try {
      const productsMap: Record<number, { name: string; unit: string }> = {};
      for (const r of receipt.value) {
        productsMap[r.productId] = { name: r.nameBn, unit: r.unit };
      }
      printInvoice(inv as unknown as import("../main/data").Invoice, {
        businessName: BUSINESS_NAME,
        customerName: slot?.nameBn || t("walk_in"),
        products: productsMap,
      });
    } catch (err) {
      console.error("print failed", err);
    }
    // Update selectedCustomer outstanding from fresh data
    if (slot) {
      await loadCustomers();
      const updated = customers.value.find((c) => c.id === slot.id);
      if (updated && selectedCustomer.value) {
        selectedCustomer.value = { ...selectedCustomer.value, outstanding: updated.outstanding };
      }
    }
    // Reset draft
    receipt.value = [];
    discount.value = 0;
    paid.value = 0;
    notes.value = "";
    // Reset customer selection after completing invoice
    clearCustomerSelection();
  } catch (e) {
    showError.value = true;
    errorMessage.value = (e as Error).message;
    setTimeout(() => (showError.value = false), TOAST_DURATION_ERROR);
  }
}

function onSelectCustomer(c: Cust) {
  selectedCustomer.value = c;
  customerQuery.value = c.nameBn ? `${c.id} - ${c.nameBn}` : String(c.id);
  customerDropdownOpen.value = false;
  void loadLastBillForCustomer(c.id);
}
function clearCustomerSelection() {
  selectedCustomer.value = null;
  customerQuery.value = "";
  customerDropdownOpen.value = false;
  lastBillText.value = "—";
}
// removed: selectFirstCustomerMatch (search is live on keypress)

function onSelectProduct(p: Prod) {
  const idx = receipt.value.findIndex((r) => r.productId === p.id);
  if (idx >= 0) {
    const item = receipt.value[idx]!;
    item.quantity += 1;
    recomputeRow(idx);
  } else {
    receipt.value.push({
      productId: p.id,
      nameBn: p.nameBn,
      unit: p.unit,
      rate: Number(p.price || 0),
      quantity: 1,
      lineTotal: ceil2(Number(p.price || 0) * 1),
    });
  }
  productDropdownOpen.value = false;
  productQuery.value = "";
}
// removed: addFirstProductMatch (select from dropdown to add)

function onQuantityInput(idx: number, evt: Event) {
  const input = evt.target as HTMLInputElement;
  const val = Math.max(1, Math.floor(Number(input.value || 1)));
  const item = receipt.value[idx];
  if (item) {
    item.quantity = val;
    recomputeRow(idx);
  }
}

function onRateInput(idx: number, evt: Event) {
  const input = evt.target as HTMLInputElement;
  const val = Math.max(1, Number(input.value || 1));
  const item = receipt.value[idx];
  if (item) {
    item.rate = val;
    recomputeRow(idx);
  }
}

function adjustQuantity(idx: number, delta: number) {
  const row = receipt.value[idx];
  if (!row) return;
  row.quantity = Math.max(1, Number(row.quantity || 1) + delta);
  recomputeRow(idx);
}

function removeReceiptRow(idx: number) {
  if (idx >= 0 && idx < receipt.value.length) {
    receipt.value.splice(idx, 1);
  }
}

// (Removed older window.confirm-based complete() implementation)

async function loadCustomers() {
  const list = await window.ahb.listCustomers();
  customers.value = list.map((c) => ({
    id: c.id,
    nameBn: c.nameBn,
    outstanding: Number(c.outstanding || 0),
  }));
}
async function loadProducts() {
  const list = await window.ahb.listProducts({ activeOnly: true });
  products.value = list.map((p) => ({
    id: p.id,
    nameBn: p.nameBn,
    unit: p.unit,
    price: Number(p.price || 0),
    stock: Number(p.stock || 0),
    active: p.active !== false,
  }));
}

let off: null | (() => void) = null;
onMounted(async () => {
  await Promise.all([loadCustomers(), loadProducts()]);
  off = window.ahb.onDataChanged((payload) => {
    if (payload.kind === "product") {
      loadProducts();
    }
    if (payload.kind === "customer") {
      loadCustomers();
    }
  });
  // Click-away to close dropdowns
  window.addEventListener("click", onGlobalClick);
  // Initialize file info and subscribe to updates
  try {
    const info = await window.ahb.getFileInfo();
    updateFileInfo(info);
  } catch {
    console.debug("file info init failed");
  }
  // Subscribe if available (tests may stub a minimal API)
  if (typeof (window.ahb as any).onFileInfo === "function") {
    offFileInfo = (window.ahb as any).onFileInfo(updateFileInfo);
  }
});
onUnmounted(() => {
  if (off) off();
  if (offFileInfo) offFileInfo();
  window.removeEventListener("click", onGlobalClick);
});

function onGlobalClick(evt: MouseEvent) {
  const target = evt.target as HTMLElement;
  // If clicks are outside the search containers, close dropdowns
  if (!target.closest("#customer-search-container")) customerDropdownOpen.value = false;
  if (!target.closest("#product-search-container")) productDropdownOpen.value = false;
}

// Toast states
const showSuccess = ref(false);
const successMessage = ref("");
const showError = ref(false);
const errorMessage = ref("");

let offFileInfo: null | (() => void) = null;
function updateFileInfo(info: { path: string | null; isDirty: boolean }) {
  fileDirty.value = Boolean(info.isDirty);
  fileNameDisplay.value = friendlyName(info.path);
}
function friendlyName(p: string | null): string {
  if (!p) return "—";
  const parts = p.split(/[\\/]/);
  return parts[parts.length - 1] || p;
}

// Keyboard navigation for search dropdowns
const customerHighlight = ref(0);
const productHighlight = ref(0);
watch(
  () => customerQuery.value,
  () => (customerHighlight.value = 0)
);
watch(
  () => productQuery.value,
  () => (productHighlight.value = 0)
);
function moveCustomerHighlight(delta: number) {
  customerDropdownOpen.value = true;
  const len = filteredCustomers.value.length;
  if (!len) return;
  customerHighlight.value = (customerHighlight.value + delta + len) % len;
}
function confirmCustomerSelection() {
  const c =
    filteredCustomers.value[customerHighlight.value] ||
    filteredCustomers.value[0];
  if (c) onSelectCustomer(c);
}
function moveProductHighlight(delta: number) {
  productDropdownOpen.value = true;
  const len = filteredProducts.value.length;
  if (!len) return;
  productHighlight.value = (productHighlight.value + delta + len) % len;
}
function confirmProductSelection() {
  const p =
    filteredProducts.value[productHighlight.value] || filteredProducts.value[0];
  if (p) onSelectProduct(p);
}

// Negative stock detection
const productStock = computed(() => {
  const m = new Map<number, number>();
  for (const p of products.value) m.set(p.id, Number(p.stock || 0));
  return m;
});
function isOversell(row: ReceiptRow): boolean {
  const stk = productStock.value.get(row.productId) ?? 0;
  return row.quantity > stk;
}

// Make Payment modal state
const showMakePayment = ref(false);
const makePaymentAmount = ref(0);

async function confirmMakePayment() {
  const slot = selectedCustomer.value;
  if (!slot || !makePaymentAmount.value) return;
  try {
    await window.ahb.recordPayment(slot.id, makePaymentAmount.value);
    showMakePayment.value = false;
    makePaymentAmount.value = 0;
    await loadCustomers();
    const updated = customers.value.find((c) => c.id === slot.id);
    if (updated) selectedCustomer.value = { ...slot, outstanding: updated.outstanding };
    showSuccess.value = true;
    successMessage.value = t("payment_recorded");
    setTimeout(() => (showSuccess.value = false), TOAST_DURATION_SUCCESS);
  } catch (e) {
    showError.value = true;
    errorMessage.value = (e as Error).message;
    setTimeout(() => (showError.value = false), TOAST_DURATION_ERROR);
  }
}

// Confirm modal state & handlers
const showConfirmNegative = ref(false);
const confirmOversCount = ref(0);
function onConfirmNegative() {
  showConfirmNegative.value = false;
  void doPostInvoice();
}
function onCancelNegative() {
  showConfirmNegative.value = false;
}

// Auto-fill paid when no slot selected (walk-in) to enforce full payment UX
watch(
  () => [selectedCustomer.value, net.value],
  () => {
    if (!selectedCustomer.value) {
      paid.value = net.value;
    }
  }
);

async function loadLastBillForCustomer(customerId: number) {
  try {
    const invoices = await window.ahb.listInvoicesByCustomer(customerId);
    if (!invoices || invoices.length === 0) {
      lastBillText.value = "—";
      return;
    }
    let latest = invoices[0]!;
    for (const inv of invoices) {
      if (inv.date > latest.date) latest = inv;
    }
    const d = new Date(latest.date);
    lastBillText.value = d.toLocaleDateString("en-GB");
  } catch {
    lastBillText.value = "—";
  }
}
</script>
