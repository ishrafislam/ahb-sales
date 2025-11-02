<template>
  <!-- eslint-disable -->
  <div class="flex flex-col h-screen overflow-hidden p-3 lg:p-4 gap-3 lg:gap-4">
    <!-- Header -->
    <div class="flex justify-between items-center mb-1">
      <div class="flex items-center gap-4">
        <h2 class="text-xl font-bold">ABDUL HAMID AND BROTHERS</h2>
        <div class="flex items-center gap-2">
          <button
            class="bg-white border border-gray-300 py-1.5 px-3 rounded-md text-sm font-semibold hover:bg-gray-100 transition-colors"
            @click="openFile"
          >
            {{ t("menu_open") }}
          </button>
          <button
            class="bg-white border border-gray-300 py-1.5 px-3 rounded-md text-sm font-semibold hover:bg-gray-100 transition-colors"
            @click="saveFile"
          >
            {{ t("menu_save") }}
          </button>
          <button
            class="bg-white border border-gray-300 py-1.5 px-3 rounded-md text-sm font-semibold hover:bg-gray-100 transition-colors"
            @click="saveFileAs"
          >
            {{ t("menu_save_as") }}
          </button>
        </div>
      </div>
      <div class="flex items-center gap-3">
        <button
          class="bg-white border border-gray-300 py-1.5 px-3 rounded-md text-sm font-semibold hover:bg-gray-100 transition-colors"
          @click="navigate('settings')"
        >
          {{ t("settings") }}
        </button>
        <div class="flex items-center gap-2 text-sm text-gray-600">
          <span> {{ t("date_label") }}: </span>
          <span>
            {{ today }}
          </span>
        </div>
      </div>
    </div>

    <!-- Body -->
    <div
      class="flex-grow grid grid-cols-1 lg:grid-cols-3 gap-3 lg:gap-4 min-h-0"
    >
      <!-- Left column -->
      <div
        class="lg:col-span-1 flex flex-col gap-3 lg:gap-4 min-h-0 overflow-hidden"
      >
        <!-- Search Customer -->
        <div
          class="bg-white p-4 rounded-md shadow-sm border border-gray-200 relative"
        >
          <h3 class="text-base font-semibold mb-3">
            {{ t("search_customer") }}
          </h3>
          <div class="flex items-center gap-2">
            <input
              id="search-customer"
              v-model="customerQuery"
              name="search-customer"
              type="text"
              :placeholder="t('search_customer_placeholder')"
              class="w-full bg-gray-50 border border-gray-300 rounded-md pl-3 pr-2 py-1.5 text-sm"
              @focus="customerDropdownOpen = true"
              @input="customerDropdownOpen = true"
              @keydown.down.prevent="moveCustomerHighlight(1)"
              @keydown.up.prevent="moveCustomerHighlight(-1)"
              @keydown.enter.prevent="confirmCustomerSelection()"
              @keydown.esc.prevent="customerDropdownOpen = false"
            />
            <button
              class="bg-blue-600 text-white py-1.5 px-3 rounded-md text-sm font-semibold hover:bg-blue-700 transition-colors"
              @click="selectFirstCustomerMatch"
            >
              {{ t("search") }}
            </button>
          </div>
          <div
            v-if="customerDropdownOpen && filteredCustomers.length"
            class="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-md shadow-lg z-10 max-h-64 overflow-auto"
          >
            <ul class="divide-y divide-gray-200">
              <li
                v-for="(c, idx) in filteredCustomers"
                :key="c.id"
                class="p-3 cursor-pointer"
                :class="
                  idx === customerHighlight ? 'bg-gray-100' : 'hover:bg-gray-50'
                "
                @click="onSelectCustomer(c)"
              >
                <div class="flex justify-between items-center">
                  <span class="font-medium text-sm">{{ c.nameBn }}</span>
                  <span class="text-xs text-gray-500">{{ c.id }}</span>
                </div>
              </li>
            </ul>
          </div>
        </div>

        <!-- Quick Actions -->
        <div class="bg-white p-4 rounded-md shadow-sm border border-gray-200">
          <div class="grid grid-cols-2 gap-2">
            <button
              class="bg-blue-100 text-blue-700 py-1.5 px-3 rounded-md text-sm font-semibold hover:bg-blue-200 transition-colors"
              @click="navigate('customer-history')"
            >
              {{ t("customer_history_title") }}
            </button>
            <button
              class="bg-blue-100 text-blue-700 py-1.5 px-3 rounded-md text-sm font-semibold hover:bg-blue-200 transition-colors"
              @click="navigate('purchase-entry')"
            >
              {{ t("product_purchase_title") }}
            </button>
            <button
              class="bg-blue-100 text-blue-700 py-1.5 px-3 rounded-md text-sm font-semibold hover:bg-blue-200 transition-colors"
              @click="navigate('customers')"
            >
              {{ t("customers_title") }}
            </button>
            <button
              class="bg-blue-100 text-blue-700 py-1.5 px-3 rounded-md text-sm font-semibold hover:bg-blue-200 transition-colors"
              @click="navigate('products')"
            >
              {{ t("products_title") }}
            </button>
            <button
              class="bg-blue-100 text-blue-700 py-1.5 px-3 rounded-md text-sm font-semibold hover:bg-blue-200 transition-colors"
              @click="navigate('product-sales-history')"
            >
              {{ t("product_sales_history_title") }}
            </button>
            <button
              class="bg-blue-100 text-blue-700 py-1.5 px-3 rounded-md text-sm font-semibold hover:bg-blue-200 transition-colors"
              @click="navigate('product-purchase-history')"
            >
              {{ t("product_purchase_history_title") }}
            </button>
            <button
              class="bg-purple-100 text-purple-700 py-1.5 px-3 rounded-md text-sm font-semibold hover:bg-purple-200 transition-colors"
              @click="navigate('report-money-customer')"
            >
              {{ t("report_money_customer_title") }}
            </button>
            <button
              class="bg-purple-100 text-purple-700 py-1.5 px-3 rounded-md text-sm font-semibold hover:bg-purple-200 transition-colors"
              @click="navigate('report-money-daywise')"
            >
              {{ t("report_money_daywise_title") }}
            </button>
            <button
              class="bg-purple-100 text-purple-700 py-1.5 px-3 rounded-md text-sm font-semibold hover:bg-purple-200 transition-colors"
              @click="navigate('report-daily-payment')"
            >
              {{ t("report_daily_payment_title") }}
            </button>
          </div>
        </div>

        <!-- Summary card -->
        <div
          class="mt-auto bg-white p-3 rounded-md shadow-sm border border-gray-200"
        >
          <div class="space-y-1.5 text-sm">
            <div class="flex justify-between items-center">
              <span class="text-gray-600"> {{ t("total_price") }} </span>
              <span class="font-semibold"> {{ subtotalText }} </span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-gray-600"> {{ t("discount") }} </span>
              <input
                v-model.number="discount"
                type="number"
                min="0"
                class="w-20 bg-gray-50 border border-gray-300 rounded-md px-1 py-0 text-right font-semibold text-sm"
              />
            </div>
            <div class="flex justify-between items-center">
              <span class="text-gray-600"> {{ t("bill") }} </span>
              <span class="font-semibold"> {{ netText }} </span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-gray-600"> {{ t("paid") }} </span>
              <input
                v-model.number="paid"
                class="w-20 bg-gray-50 border border-gray-300 rounded-md px-1 py-0 text-right font-semibold text-sm"
                type="number"
                min="0"
              />
            </div>
            <div class="flex justify-between items-center">
              <span class="text-gray-600"> {{ t("due") }} </span>
              <span class="font-semibold text-red-600"> {{ dueText }} </span>
            </div>
            <div
              class="flex justify-between items-center mt-2 pt-2 border-t border-gray-200"
            >
              <span class="text-gray-600"> {{ t("previous_due") }} </span>
              <span class="font-semibold"> {{ previousDueText }} </span>
            </div>
            <div
              class="flex justify-between items-center p-2 bg-red-100 rounded-md"
            >
              <span class="font-bold text-base text-red-600">
                {{ t("net_due") }}
              </span>
              <span class="font-bold text-lg text-red-600">
                {{ netDueText }}
              </span>
            </div>
            <div class="mt-2 flex items-end gap-2">
              <textarea
                v-model="notes"
                :placeholder="t('comment')"
                rows="2"
                class="flex-grow bg-gray-50 border border-gray-300 rounded-md px-2 py-1 text-sm"
              />
              <button
                class="bg-green-600 text-white py-2 px-3 rounded-md text-sm font-semibold hover:bg-green-700 transition-colors flex-shrink-0"
                :disabled="!canComplete"
                @click="complete"
              >
                {{ t("complete") }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Right column -->
      <div
        class="lg:col-span-2 bg-white p-4 rounded-md shadow-sm border border-gray-200 flex flex-col min-h-0"
      >
        <div class="bg-blue-50 p-3 rounded-lg mb-4">
          <h3 class="text-base font-semibold mb-2 text-blue-700">
            {{ t("customer_info") }}
          </h3>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-2 text-sm">
            <div>
              <span class="text-gray-600"> {{ t("id") }}: </span>
              <span class="font-medium ml-1">
                {{ selectedCustomer?.id ?? "—" }}
              </span>
            </div>
            <div>
              <span class="text-gray-600"> {{ t("name") }}: </span>
              <span class="font-medium ml-1">
                {{ selectedCustomer?.nameBn ?? "—" }}
              </span>
            </div>
            <div>
              <span class="text-gray-600"> {{ t("last_bill") }}: </span>
              <span class="font-medium ml-1"> — </span>
            </div>
            <div>
              <span class="text-gray-600"> {{ t("due") }}: </span>
              <span class="font-medium text-red-600 ml-1">
                {{ formatMoney(Number(selectedCustomer?.outstanding || 0)) }}
              </span>
            </div>
          </div>
        </div>

        <div class="flex-grow min-h-0 overflow-auto">
          <table class="w-full text-left text-sm">
            <thead class="border-b border-gray-200">
              <tr>
                <th class="p-2 text-xs font-semibold text-gray-600 text-center">
                  #
                </th>
                <th class="p-2 text-xs font-semibold text-gray-600">
                  {{ t("product_name") }}
                </th>
                <th class="p-2 text-xs font-semibold text-gray-600 text-center">
                  {{ t("quantity") }}
                </th>
                <th class="p-2 text-xs font-semibold text-gray-600 text-center">
                  {{ t("unit") }}
                </th>
                <th class="p-2 text-xs font-semibold text-gray-600 text-right">
                  {{ t("unit_price") }}
                </th>
                <th class="p-2 text-xs font-semibold text-gray-600 text-right">
                  {{ t("total") }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(row, idx) in receipt"
                :key="row.productId"
                class="border-b border-gray-200"
                :class="{ 'bg-red-50': isOversell(row) }"
              >
                <td class="p-2 text-center">
                  {{ idx + 1 }}
                </td>
                <td class="p-2">
                  <div class="flex items-center gap-2">
                    <span>{{ row.nameBn }}</span>
                    <span
                      v-if="isOversell(row)"
                      class="inline-flex items-center gap-1 text-red-700 text-xs font-medium"
                      :title="t('oversell_warning')"
                      aria-live="polite"
                    >
                      <span aria-hidden="true">⚠️</span>
                      <span class="sr-only">{{ t("oversell_warning") }}</span>
                    </span>
                  </div>
                </td>
                <td class="p-2 text-center">
                  <input
                    class="w-16 bg-gray-50 border border-gray-300 rounded-md px-1 py-0.5 text-center text-sm"
                    type="number"
                    min="1"
                    :value="row.quantity"
                    @input="onQuantityInput(idx, $event)"
                  />
                </td>
                <td class="p-2 text-center">
                  {{ row.unit }}
                </td>
                <td class="p-2 text-right">
                  {{ formatMoney(row.rate) }}
                </td>
                <td class="p-2 text-right">
                  {{ formatMoney(row.lineTotal) }}
                </td>
              </tr>
              <tr v-if="receipt.length === 0">
                <td class="p-2 text-center text-gray-500" colspan="6">
                  {{ t("no_items") }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="border-t border-gray-200 mt-4 pt-4 flex items-center gap-2">
          <div class="relative flex-grow">
            <input
              id="search-product"
              v-model="productQuery"
              name="search-product"
              type="text"
              :placeholder="t('search_products_placeholder')"
              class="w-full bg-gray-50 border border-gray-300 rounded-md pl-3 pr-2 py-2 text-sm"
              @focus="productDropdownOpen = true"
              @input="productDropdownOpen = true"
              @keydown.down.prevent="moveProductHighlight(1)"
              @keydown.up.prevent="moveProductHighlight(-1)"
              @keydown.enter.prevent="confirmProductSelection()"
              @keydown.esc.prevent="productDropdownOpen = false"
            />
            <div
              v-if="productDropdownOpen && filteredProducts.length"
              class="absolute bottom-full left-0 w-full mb-1 bg-white border border-gray-200 rounded-md shadow-lg z-10 max-h-60 overflow-y-auto"
            >
              <ul class="text-sm">
                <li
                  v-for="(p, idx) in filteredProducts"
                  :key="p.id"
                  class="px-4 py-2 cursor-pointer"
                  :class="
                    idx === productHighlight
                      ? 'bg-gray-100'
                      : 'hover:bg-gray-50'
                  "
                  @click="onSelectProduct(p)"
                >
                  <div class="flex justify-between">
                    <span class="font-medium">{{ p.nameBn }}</span>
                    <span class="text-gray-500">{{ t("id") }}: {{ p.id }}</span>
                  </div>
                </li>
              </ul>
            </div>
          </div>
          <button
            class="bg-green-600 text-white py-2 px-4 rounded-md text-sm font-semibold hover:bg-green-700 transition-colors"
            @click="addFirstProductMatch"
          >
            {{ t("add") }}
          </button>
        </div>

        <!-- Success toast -->
        <div
          v-if="showSuccess"
          class="fixed bottom-4 right-4 bg-green-600 text-white px-4 py-2 rounded shadow-lg"
        >
          {{ successMessage }}
        </div>
        <div
          v-if="showError"
          class="fixed bottom-4 right-4 bg-red-600 text-white px-4 py-2 rounded shadow-lg"
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
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: "AhbDashboardView" });
import { ref, computed, onMounted, onUnmounted, watch } from "vue";
import { printInvoice } from "../print/invoice";
import { t } from "../i18n";
import { BUSINESS_NAME } from "../constants/business";
import ConfirmModal from "../components/ConfirmModal.vue";

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
  outstanding?: number;
};

const today = computed(() => new Date().toLocaleDateString("en-GB"));

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
function openFile() {
  window.ahb.openFile();
}
function saveFile() {
  window.ahb.saveFile();
}
function saveFileAs() {
  window.ahb.saveFileAs();
}

// Draft receipt state
const customers = ref<Cust[]>([]);
const products = ref<Prod[]>([]);

const selectedCustomer = ref<Cust | null>(null);

const customerQuery = ref("");
const productQuery = ref("");
const customerDropdownOpen = ref(false);
const productDropdownOpen = ref(false);

const filteredCustomers = computed(() => {
  const q = customerQuery.value.trim().toLowerCase();
  if (!q) return customers.value.slice(0, 20);
  return customers.value
    .filter(
      (c) => String(c.id).includes(q) || c.nameBn.toLowerCase().includes(q)
    )
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

const canComplete = computed(
  () =>
    !!selectedCustomer.value &&
    receipt.value.length > 0 &&
    discount.value <= subtotal.value &&
    paid.value >= 0 &&
    paid.value <= previousDue.value + net.value
);

async function complete() {
  if (!selectedCustomer.value || receipt.value.length === 0) return;
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
    const payload = {
      date: new Date().toISOString(),
      customerId: selectedCustomer.value!.id,
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
    setTimeout(() => (showSuccess.value = false), 2500);
    try {
      const productsMap: Record<number, { name: string; unit: string }> = {};
      for (const r of receipt.value) {
        productsMap[r.productId] = { name: r.nameBn, unit: r.unit };
      }
      printInvoice(inv as unknown as import("../main/data").Invoice, {
        businessName: BUSINESS_NAME,
        customerName: selectedCustomer.value!.nameBn,
        products: productsMap,
      });
    } catch (err) {
      console.error("print failed", err);
    }
    // Reset draft
    receipt.value = [];
    discount.value = 0;
    paid.value = 0;
    notes.value = "";
  } catch (e) {
    showError.value = true;
    errorMessage.value = (e as Error).message;
    setTimeout(() => (showError.value = false), 3000);
  }
}

function onSelectCustomer(c: Cust) {
  selectedCustomer.value = c;
  customerQuery.value = `${c.id} - ${c.nameBn}`;
  customerDropdownOpen.value = false;
}
function selectFirstCustomerMatch() {
  if (filteredCustomers.value.length)
    onSelectCustomer(filteredCustomers.value[0]);
}

function onSelectProduct(p: Prod) {
  const idx = receipt.value.findIndex((r) => r.productId === p.id);
  if (idx >= 0) {
    receipt.value[idx].quantity += 1;
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
function addFirstProductMatch() {
  if (filteredProducts.value.length) onSelectProduct(filteredProducts.value[0]);
}

function onQuantityInput(idx: number, evt: Event) {
  const input = evt.target as HTMLInputElement;
  const val = Math.max(1, Math.floor(Number(input.value || 1)));
  receipt.value[idx].quantity = val;
  recomputeRow(idx);
}

// (Removed older window.confirm-based complete() implementation)

async function loadCustomers() {
  const list = await window.ahb.listCustomers({ activeOnly: true });
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
});
onUnmounted(() => {
  if (off) off();
  window.removeEventListener("click", onGlobalClick);
});

function onGlobalClick(evt: MouseEvent) {
  const target = evt.target as HTMLElement;
  // If clicks are outside the inputs, close dropdowns
  if (!target.closest("#search-customer")) customerDropdownOpen.value = false;
  if (!target.closest("#search-product")) productDropdownOpen.value = false;
}

// Toast states
const showSuccess = ref(false);
const successMessage = ref("");
const showError = ref(false);
const errorMessage = ref("");

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
</script>
