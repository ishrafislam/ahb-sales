<template>
  <div class="flex flex-col h-screen p-2 lg:p-3 gap-2 lg:gap-3 dark:text-gray-100">
    <!-- Header band: title + product lookup panel -->
    <div class="flex items-center gap-3">
      <h1 class="text-xl lg:text-2xl font-bold tracking-wide">
        {{ BUSINESS_NAME }}
      </h1>
      <div
        class="bg-white dark:bg-gray-900 shadow-sm border border-gray-200 dark:border-gray-700 p-2 flex flex-col gap-1.5 min-w-[20rem]"
      >
        <div class="flex items-center gap-2">
          <label class="text-xs whitespace-nowrap w-24">{{ t("v2_product_id") }}:</label>
          <input
            type="text"
            :value="ld(selectedProductIdText)"
            disabled
            :class="[inputClass, 'text-right disabled:opacity-70 disabled:cursor-not-allowed']"
          />
        </div>
        <div class="flex items-center gap-2">
          <label class="text-xs whitespace-nowrap w-24">{{ t("v2_stock_qty") }}:</label>
          <input
            type="text"
            :value="ld(selectedProductStockText)"
            disabled
            :class="[inputClass, 'text-right disabled:opacity-70 disabled:cursor-not-allowed']"
          />
        </div>
      </div>
    </div>

    <!-- Info band: date/customer-id, last bill, search -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-2 lg:gap-3">
      <div
        class="lg:col-span-3 bg-white dark:bg-gray-900 shadow-sm border border-gray-200 dark:border-gray-700 p-2 flex flex-col gap-1.5"
      >
        <div class="flex items-center gap-2">
          <label class="text-xs whitespace-nowrap flex-1">{{ t("v2_date") }}:</label>
          <input type="text" :value="todayText" :class="[inputClass, 'max-w-[9rem] text-right']" />
        </div>
        <div class="flex items-center gap-2">
          <label class="text-xs whitespace-nowrap flex-1">{{ t("v2_customer_id") }}:</label>
          <!-- The caret opens the slot list; focus alone only selects the id
               so the next one typed replaces it -->
          <div class="relative flex-1 min-w-0 max-w-[9rem]">
            <input
              ref="customerIdInput"
              :value="ld(customerId)"
              type="text"
              :class="[inputClass, 'w-full pr-6 text-right']"
              @focus="onCustomerIdFocus"
              @input="onCustomerIdInput"
              @blur="closeCustomerSlots"
              @keydown.down.prevent="moveCustomerHighlight(1)"
              @keydown.up.prevent="moveCustomerHighlight(-1)"
              @keydown.esc.prevent="closeCustomerSlots"
              @keydown.enter="onCustomerIdEnter"
            />
            <button
              type="button"
              class="absolute inset-y-0 right-0 px-1.5 text-[0.6rem] leading-none text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
              :aria-label="t('v2_customer_id')"
              data-role="customer-slots-toggle"
              @mousedown.prevent
              @click="toggleCustomerSlots"
            >
              ▼
            </button>
          </div>
          <SlotDropdown
            :open="customerSlotsOpen"
            :options="customerSlotOptions"
            :highlight="customerHighlight"
            :anchor="customerIdInput"
            @select="selectCustomerSlot"
          />
        </div>
      </div>

      <div
        class="lg:col-span-4 bg-white dark:bg-gray-900 shadow-sm border border-gray-200 dark:border-gray-700 p-2 flex flex-col gap-1.5"
      >
        <div class="flex items-center gap-2">
          <label class="text-xs whitespace-nowrap w-32">{{ t("v2_last_bill_date") }}:</label>
          <input
            type="text"
            :value="ld(lastBillDateText)"
            disabled
            :class="[inputClass, 'text-right disabled:opacity-70 disabled:cursor-not-allowed']"
          />
        </div>
        <div class="flex items-center gap-2">
          <label class="text-xs whitespace-nowrap w-32">{{ t("v2_last_bill") }}:</label>
          <input
            type="text"
            :value="ld(lastBillText)"
            disabled
            :class="[inputClass, 'text-right disabled:opacity-70 disabled:cursor-not-allowed']"
          />
        </div>
      </div>

      <div
        class="lg:col-span-5 bg-white dark:bg-gray-900 shadow-sm border border-gray-200 dark:border-gray-700 p-2 flex flex-col gap-1.5"
      >
        <!-- Name search: type to get suggestions, pick one, then Search opens
             that record's details in its own window -->
        <div class="flex items-center gap-2">
          <label class="text-xs whitespace-nowrap w-24">{{ t("v2_customer_name") }}:</label>
          <input
            ref="customerNameInput"
            v-model="customerNameQuery"
            type="text"
            :class="inputClass"
            data-role="customer-name-search"
            @input="onCustomerNameInput"
            @blur="customerNameOpen = false"
            @keydown.down.prevent="moveNameHighlight('customer', 1)"
            @keydown.up.prevent="moveNameHighlight('customer', -1)"
            @keydown.esc.prevent="customerNameOpen = false"
            @keydown.enter.prevent="onCustomerNameEnter"
          />
          <SlotDropdown
            :open="customerNameOpen"
            :options="customerNameOptions"
            :highlight="customerNameHighlight"
            :anchor="customerNameInput"
            name-only
            fit-anchor
            @select="pickCustomerName"
          />
          <button
            type="button"
            :class="[buttonClass, 'px-4 h-8 text-xs disabled:opacity-70 disabled:cursor-not-allowed']"
            :disabled="pickedCustomerId === null"
            data-role="customer-name-search-button"
            @click="openCustomerDetails"
          >
            {{ t("v2_search") }}
          </button>
        </div>
        <div class="flex items-center gap-2">
          <label class="text-xs whitespace-nowrap w-24">{{ t("v2_product_name") }}:</label>
          <input
            ref="productNameInput"
            v-model="productNameQuery"
            type="text"
            :class="inputClass"
            data-role="product-name-search"
            @input="onProductNameInput"
            @blur="productNameOpen = false"
            @keydown.down.prevent="moveNameHighlight('product', 1)"
            @keydown.up.prevent="moveNameHighlight('product', -1)"
            @keydown.esc.prevent="productNameOpen = false"
            @keydown.enter.prevent="onProductNameEnter"
          />
          <SlotDropdown
            :open="productNameOpen"
            :options="productNameOptions"
            :highlight="productNameHighlight"
            :anchor="productNameInput"
            name-only
            fit-anchor
            @select="pickProductName"
          />
          <button
            type="button"
            :class="[buttonClass, 'px-4 h-8 text-xs disabled:opacity-70 disabled:cursor-not-allowed']"
            :disabled="pickedProductId === null"
            data-role="product-name-search-button"
            @click="openProductDetails"
          >
            {{ t("v2_search") }}
          </button>
        </div>
      </div>
    </div>

    <!-- Main band -->
    <div class="flex-grow grid grid-cols-1 lg:grid-cols-12 gap-2 lg:gap-3 min-h-0">
      <!-- Left column -->
      <div class="lg:col-span-3 flex flex-col gap-2 lg:gap-3 min-h-0">
        <div
          class="shrink-0 bg-white dark:bg-gray-900 shadow-sm border border-gray-200 dark:border-gray-700 p-2 flex flex-col gap-1.5"
        >
          <!-- Name and address save straight from here: Enter, or leaving the
               field. Receivable stays read-only — it can only be set when the
               customer is created. -->
          <div class="flex items-center gap-2">
            <label class="text-xs whitespace-nowrap w-14">{{ t("v2_customer") }}:</label>
            <input
              id="customer-name"
              v-model="customerNameText"
              type="text"
              :class="[inputClass, 'text-right']"
              @keydown.enter.prevent="commitCustomer"
              @blur="commitCustomer"
            />
          </div>
          <div class="flex items-center gap-2">
            <label class="text-xs whitespace-nowrap w-14">{{ t("v2_address") }}:</label>
            <input
              id="customer-address"
              v-model="customerAddressText"
              type="text"
              :class="[inputClass, 'text-right']"
              @keydown.enter.prevent="commitCustomer"
              @blur="commitCustomer"
            />
          </div>
          <div class="flex items-center gap-2">
            <label class="text-xs whitespace-nowrap w-14">{{ t("v2_receivable") }}:</label>
            <input
              type="text"
              :value="ld(customerReceivableText)"
              disabled
              :class="[inputClass, 'text-right disabled:opacity-70 disabled:cursor-not-allowed']"
            />
          </div>
          <p
            v-if="customerError"
            class="text-xs text-red-600 dark:text-red-400"
          >
            {{ customerError }}
          </p>
        </div>

        <!-- The customer card above stays put; only the button cards scroll -->
        <div class="flex-1 min-h-0 overflow-y-auto flex flex-col gap-2 lg:gap-3">
          <div
            class="bg-white dark:bg-gray-900 shadow-sm border border-gray-200 dark:border-gray-700 p-2 grid grid-cols-3 gap-1.5"
          >
            <button
              v-for="btn in printButtons"
              :key="btn.key"
              type="button"
              :class="[buttonClass, 'min-h-[3rem] px-1 py-1']"
              :disabled="btn.enabled ? !btn.enabled.value : false"
              @click="btn.handler?.()"
            >
              {{ t(btn.key) }}
            </button>
          </div>

          <div
            class="bg-white dark:bg-gray-900 shadow-sm border border-gray-200 dark:border-gray-700 p-2 grid grid-cols-2 gap-1.5"
          >
            <button
              v-for="btn in actionButtons"
              :key="btn.key"
              type="button"
              :class="[buttonClass, 'min-h-[2.25rem] px-1 py-1']"
              @click="onActionClick(btn)"
            >
              {{ t(btn.key) }}
            </button>
          </div>

          <div
            class="bg-white dark:bg-gray-900 shadow-sm border border-gray-200 dark:border-gray-700 p-2 grid grid-cols-2 gap-1.5"
          >
            <button
              v-for="btn in reportButtons"
              :key="btn.key"
              type="button"
              :class="[buttonClass, 'min-h-[2.25rem] px-1 py-1']"
              @click="onReportClick(btn)"
            >
              {{ t(btn.key) }}
            </button>
            <button
              type="button"
              :class="[buttonClass, 'min-h-[2.25rem] px-1 py-1 col-span-2']"
              @click="openPaymentReport"
            >
              {{ t("v2_daily_payment_report") }}
            </button>
          </div>
        </div>
      </div>

      <!-- Center column: product list + totals -->
      <div class="lg:col-span-6 flex flex-col gap-2 min-h-0">
        <div class="flex flex-col flex-grow min-h-0">
          <span class="text-xs mb-1">{{ t("v2_product_list") }}:</span>
          <ProductEntryTable
            ref="entryTable"
            v-model:rows="entryRows"
            :locked="posted"
            @product-selected="onProductSelected"
          />
        </div>

        <div class="flex flex-col gap-1.5">
          <div class="flex items-center gap-2">
            <label class="text-xs whitespace-nowrap flex-1">{{ t("v2_grand_total") }}:</label>
            <input
              type="text"
              :value="ld(grandTotalText)"
              disabled
              :class="[inputClass, 'max-w-[55%] text-right disabled:opacity-70 disabled:cursor-not-allowed']"
            />
          </div>
          <div class="flex items-center gap-2">
            <label class="text-xs whitespace-nowrap flex-1">{{ t("v2_discount") }}:</label>
            <input
              ref="discountInput"
              :value="ld(discountText)"
              type="text"
              inputmode="decimal"
              @input="discountText = toLatinDigits(($event.target as HTMLInputElement).value)"
              :disabled="posted"
              :class="[inputClass, 'max-w-[55%] text-right disabled:opacity-70 disabled:cursor-not-allowed']"
              @keydown.enter.prevent="onDiscountEnter"
              @blur="onDiscountBlur"
            />
          </div>
          <div class="flex items-center gap-2">
            <label class="text-xs whitespace-nowrap flex-1">{{ t("v2_bill") }}:</label>
            <input
              type="text"
              :value="ld(billText)"
              disabled
              :class="[inputClass, 'max-w-[55%] text-right disabled:opacity-70 disabled:cursor-not-allowed']"
            />
          </div>
          <div class="flex items-center gap-2">
            <label class="text-xs whitespace-nowrap flex-1">{{ t("v2_deposit") }}:</label>
            <input
              type="text"
              :value="ld(paidTotalText)"
              disabled
              :class="[inputClass, 'max-w-[55%] text-right disabled:opacity-70 disabled:cursor-not-allowed']"
            />
          </div>
        </div>
      </div>

      <!-- Right column: customer status + action buttons -->
      <div class="lg:col-span-3 flex flex-col gap-2 min-h-0">
        <div class="flex flex-col flex-grow min-h-0">
          <span class="text-xs mb-1 text-right">{{ t("v2_customer_status") }}:</span>
          <CustomerStatusPanel
            v-model:comment="comment"
            :status="postedStatus"
            :locked="posted"
          />
        </div>
        <p
          v-if="postError"
          class="text-xs text-red-600 dark:text-red-400"
        >
          {{ postError }}
        </p>
        <div class="grid grid-cols-2 gap-2">
          <button
            type="button"
            :class="[buttonClass, 'h-9 disabled:opacity-70 disabled:cursor-not-allowed']"
            :disabled="posted"
            @click="onPostData"
          >
            {{ t("v2_post_data") }}
          </button>
          <button
            type="button"
            :class="[buttonClass, 'h-9 disabled:opacity-70 disabled:cursor-not-allowed']"
            :disabled="mode !== 'posted'"
            @click="onEdit"
          >
            {{ t("v2_edit") }}
          </button>
        </div>
        <button
          type="button"
          :class="[buttonClass, 'h-9 w-full disabled:opacity-70 disabled:cursor-not-allowed']"
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
import SlotDropdown from "../components/dashboard/SlotDropdown.vue";
import { toSlots, filterSlots, type SlotOption } from "../components/dashboard/slotOptions";
import { matchByName } from "../utils/fuzzy";
import {
  localizeDigits as ld,
  parseNumber,
  toLatinDigits,
} from "../utils/numerals";
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
import { buildCustomerListDocument } from "../print/customerList";
import { buildProductListDocument } from "../print/productList";

const emit = defineEmits<{
  (e: "navigate", view: string, opts?: { customerId?: number }): void;
}>();

const customerId = ref("000");
const customerIdInput = ref<HTMLInputElement | null>(null);
const lastBillDateText = ref("");
const lastBillText = ref("");

const customerNameText = ref("");
const customerAddressText = ref("");
// Not shown on the dashboard; kept for the receipt header
const customerPhoneText = ref("");
const customerReceivableText = ref("");

// What the file holds for the two editable fields, so a commit can tell a real
// edit from a plain re-focus and can restore them if a save is refused
const savedCustomerName = ref("");
const savedCustomerAddress = ref("");
const customerExists = ref(false);
const customerError = ref("");
let savingCustomer = false;

function setCustomerInfo(
  customer: {
    nameBn: string;
    address?: string;
    phone?: string;
    outstanding: number;
  } | null
) {
  customerNameText.value = customer?.nameBn ?? "";
  customerAddressText.value = customer?.address ?? "";
  customerPhoneText.value = customer?.phone ?? "";
  customerReceivableText.value = customer
    ? customer.outstanding.toFixed(2)
    : "";
  savedCustomerName.value = customerNameText.value;
  savedCustomerAddress.value = customerAddressText.value;
  customerExists.value = customer !== null;
  customerError.value = "";
}

/**
 * Save the customer's name and address, on Enter or on leaving the field.
 * Typing into an id with no record behind it creates the customer there — the
 * same slot a sale would have created, just named up front.
 */
async function commitCustomer() {
  if (savingCustomer) return;
  const id = parseCustomerId();
  if (id === undefined) return;
  const nameBn = customerNameText.value.trim();
  const address = customerAddressText.value.trim();
  // Unchanged: a re-focus, or the blur that Enter itself caused
  if (
    nameBn === savedCustomerName.value &&
    address === savedCustomerAddress.value
  ) {
    return;
  }
  // Nothing typed and nothing on file: do not create an empty customer
  if (!customerExists.value && !nameBn && !address) return;

  savingCustomer = true;
  customerError.value = "";
  try {
    if (customerExists.value) {
      await window.ahb.updateCustomer(id, {
        nameBn,
        address: address || undefined,
      });
    } else {
      await window.ahb.addCustomer({
        id,
        nameBn,
        address: address || undefined,
      });
      customerExists.value = true;
    }
    savedCustomerName.value = nameBn;
    savedCustomerAddress.value = address;
    customerNameText.value = nameBn;
    customerAddressText.value = address;
  } catch (e) {
    customerError.value = e instanceof Error ? e.message : String(e);
    customerNameText.value = savedCustomerName.value;
    customerAddressText.value = savedCustomerAddress.value;
  } finally {
    savingCustomer = false;
  }
}

// Customer ID dropdown: every slot 1..MAX_CUSTOMER_ID, saved records merged in
const customerSlots = ref<SlotOption[]>([]);
const customerSlotsOpen = ref(false);
const customerHighlight = ref(-1);
let customerSlotsLoaded = false;

const customerSlotOptions = computed(() =>
  filterSlots(customerSlots.value, customerId.value)
);

async function loadCustomerSlots() {
  // A dropdown that cannot be filled is not worth breaking the field over
  let customers: Awaited<ReturnType<typeof window.ahb.listCustomers>> = [];
  try {
    customers = await window.ahb.listCustomers();
  } catch {
    return;
  }
  customerSlots.value = toSlots(
    customers.map((c) => ({
      id: c.id,
      primary: c.nameBn,
      secondary: c.address,
    })),
    MAX_CUSTOMER_ID
  );
  customerSlotsLoaded = true;
}

async function openCustomerSlots() {
  customerHighlight.value = -1;
  customerSlotsOpen.value = true;
  if (!customerSlotsLoaded) await loadCustomerSlots();
}

// Whatever is in there is about to be replaced by the next id typed
function onCustomerIdFocus() {
  customerIdInput.value?.select();
}

function toggleCustomerSlots() {
  if (customerSlotsOpen.value) {
    closeCustomerSlots();
    return;
  }
  customerIdInput.value?.focus();
  void openCustomerSlots();
}

function closeCustomerSlots() {
  customerSlotsOpen.value = false;
  customerHighlight.value = -1;
}

// Typing re-filters an open list; it never opens one — that is the caret's
// job. The old highlight no longer points at the same row afterwards.
// The box shows the app's numerals; the model behind it is always Latin
function onCustomerIdInput(e: Event) {
  customerId.value = toLatinDigits((e.target as HTMLInputElement).value);
  customerHighlight.value = -1;
}

function moveCustomerHighlight(step: number) {
  if (!customerSlotsOpen.value) {
    void openCustomerSlots();
    return;
  }
  const count = customerSlotOptions.value.length;
  if (!count) return;
  const next = customerHighlight.value + step;
  customerHighlight.value = next < 0 ? count - 1 : next >= count ? 0 : next;
}

function selectCustomerSlot(option: SlotOption) {
  customerId.value = String(option.id);
  closeCustomerSlots();
  void loadLastBill();
}

// Enter picks the highlighted slot; with nothing highlighted it loads whatever
// was typed, exactly as before the dropdown existed
function onCustomerIdEnter() {
  const option = customerSlotOptions.value[customerHighlight.value];
  if (customerSlotsOpen.value && option) {
    selectCustomerSlot(option);
    return;
  }
  closeCustomerSlots();
  void loadLastBill();
}

// Name search boxes: suggestions from the saved records, and a picked id that
// the Search button opens a details window for. Editing the text after picking
// clears the id, so Search never opens a record the box no longer names.
type NameRecord = {
  id: number;
  nameBn: string;
  secondary?: string;
  active: boolean;
};

const customerNameInput = ref<HTMLInputElement | null>(null);
const productNameInput = ref<HTMLInputElement | null>(null);
const customerNameQuery = ref("");
const productNameQuery = ref("");
const customerNameOpen = ref(false);
const productNameOpen = ref(false);
const customerNameHighlight = ref(-1);
const productNameHighlight = ref(-1);
const pickedCustomerId = ref<number | null>(null);
const pickedProductId = ref<number | null>(null);
const customerRecords = ref<NameRecord[]>([]);
const productRecords = ref<NameRecord[]>([]);
let customerRecordsLoaded = false;
let productRecordsLoaded = false;

// Inactive records are searchable too — the details window says so
async function loadCustomerRecords() {
  try {
    const customers = await window.ahb.listCustomers({ activeOnly: false });
    customerRecords.value = customers.map((c) => ({
      id: c.id,
      nameBn: c.nameBn,
      secondary: c.address,
      active: c.active,
    }));
    customerRecordsLoaded = true;
  } catch {
    /* a search box that cannot load is simply empty */
  }
}

async function loadProductRecords() {
  try {
    const products = await window.ahb.listProducts({ activeOnly: false });
    productRecords.value = products.map((p) => ({
      id: p.id,
      nameBn: p.nameBn,
      secondary: p.description,
      active: p.active,
    }));
    productRecordsLoaded = true;
  } catch {
    /* as above */
  }
}

// The panel shows names and nothing else; a close spelling is offered the same
// way an exact one is
function toNameOptions(records: NameRecord[], query: string): SlotOption[] {
  return matchByName(records, query, (r) => r.nameBn).map(({ item }) => ({
    id: item.id,
    primary: item.nameBn,
  }));
}

const customerNameOptions = computed(() =>
  toNameOptions(customerRecords.value, customerNameQuery.value)
);
const productNameOptions = computed(() =>
  toNameOptions(productRecords.value, productNameQuery.value)
);

function onCustomerNameInput() {
  pickedCustomerId.value = null;
  customerNameHighlight.value = -1;
  customerNameOpen.value = true;
  if (!customerRecordsLoaded) void loadCustomerRecords();
}

function onProductNameInput() {
  pickedProductId.value = null;
  productNameHighlight.value = -1;
  productNameOpen.value = true;
  if (!productRecordsLoaded) void loadProductRecords();
}

function moveNameHighlight(kind: "customer" | "product", step: number) {
  const open = kind === "customer" ? customerNameOpen : productNameOpen;
  const highlight =
    kind === "customer" ? customerNameHighlight : productNameHighlight;
  const count = (
    kind === "customer" ? customerNameOptions : productNameOptions
  ).value.length;
  if (!open.value || !count) return;
  const next = highlight.value + step;
  highlight.value = next < 0 ? count - 1 : next >= count ? 0 : next;
}

function pickCustomerName(option: SlotOption) {
  const record = customerRecords.value.find((r) => r.id === option.id);
  customerNameQuery.value = record?.nameBn ?? "";
  pickedCustomerId.value = option.id;
  customerNameOpen.value = false;
  customerNameHighlight.value = -1;
}

function pickProductName(option: SlotOption) {
  const record = productRecords.value.find((r) => r.id === option.id);
  productNameQuery.value = record?.nameBn ?? "";
  pickedProductId.value = option.id;
  productNameOpen.value = false;
  productNameHighlight.value = -1;
}

function onCustomerNameEnter() {
  const option = customerNameOptions.value[customerNameHighlight.value];
  if (customerNameOpen.value && option) pickCustomerName(option);
}

function onProductNameEnter() {
  const option = productNameOptions.value[productNameHighlight.value];
  if (productNameOpen.value && option) pickProductName(option);
}

function openCustomerDetails() {
  if (pickedCustomerId.value === null) return;
  void window.ahb.openRecordDetailsWindow("customer", pickedCustomerId.value);
}

function openProductDetails() {
  if (pickedProductId.value === null) return;
  void window.ahb.openRecordDetailsWindow("product", pickedProductId.value);
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
    const amount = parseNumber(row.amountText);
    if (!Number.isFinite(amount) || amount < 0) return sum;
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
  const d = parseNumber(discountText.value);
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
// refresh the deposit/status/receivable fields from the updated invoice. A
// purchase posted elsewhere arrives the same way and moves a product's stock
// under any row already holding it.
async function onDataChanged(payload: {
  kind: string;
  action: string;
  id: number;
}) {
  if (payload.kind === "product") {
    void entryTable.value?.reloadSlots();
    if (productRecordsLoaded) void loadProductRecords();
    if (payload.action !== "stock-updated") return;
    const product = await window.ahb.getProductById(payload.id);
    if (product) entryTable.value?.refreshProductStock(payload.id, product.stock);
    return;
  }
  if (payload.kind === "customer") {
    if (customerSlotsLoaded) await loadCustomerSlots();
    if (customerRecordsLoaded) await loadCustomerRecords();
    return;
  }
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
    const quantity = parseNumber(row.amountText);
    // A quantity of 0 is a real line: the item is named, nothing is charged
    if (!Number.isFinite(quantity) || quantity < 0) return [];
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
      const quantity = parseNumber(row.amountText);
      if (!Number.isFinite(quantity) || quantity < 0) return false;
      // The sale has left the shelf now: carry the row's cached stock forward
      // by whatever this post moved, and mark the quantity as accounted for so
      // the header stops projecting it.
      const moved = quantity - (row.appliedQty ?? 0);
      row.product.stock = Math.round((row.product.stock - moved) * 100) / 100;
      row.appliedQty = quantity;
      return true;
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
    // Entry mode lands on the first ID cell; a loaded invoice does the same,
    // so the header opens on the first line's product and stock
    entryTable.value?.focusFirstRow();
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
        // Already posted, so the stored stock has this quantity in it
        appliedQty: line.quantity,
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
  "flex-1 min-w-0 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 px-2 py-1 text-xs dark:text-gray-100";

const buttonClass =
  "bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-xs leading-tight dark:text-gray-100";

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
      customerPhone: customerPhoneText.value || undefined,
      customerAddress: customerAddressText.value || undefined,
      products,
      previousDueDate,
    })
  );
}

function parseCustomerId(): number | undefined {
  const id = Number.parseInt(toLatinDigits(customerId.value), 10);
  if (Number.isNaN(id) || id < MIN_CUSTOMER_ID || id > MAX_CUSTOMER_ID) {
    return undefined;
  }
  return id;
}

async function openCustomerList() {
  const customers = await window.ahb.listCustomers();
  await window.ahb.openPrintPreview(buildCustomerListDocument(customers));
}

function openPaymentReport() {
  void window.ahb.openPaymentReportWindow();
}

async function openProductList() {
  const products = await window.ahb.listProducts();
  await window.ahb.openPrintPreview(buildProductListDocument(products));
}

// Most of these navigate; the two list buttons print instead
function onActionClick(btn: {
  key: string;
  page?: string;
  handler?: () => void;
}) {
  if (btn.handler) {
    btn.handler();
    return;
  }
  if (!btn.page) return;
  const id = btn.page === "customer-history" ? parseCustomerId() : undefined;
  if (id !== undefined) {
    emit("navigate", btn.page, { customerId: id });
  } else {
    emit("navigate", btn.page);
  }
}

const actionButtons: {
  key: string;
  page?: string;
  handler?: () => void;
}[] = [
  { key: "v2_history", page: "customer-history" },
  // TODO(revamp/v2): action undecided
  { key: "v2_refresh" },
  { key: "v2_cust_form", page: "customers" },
  { key: "v2_item_form", page: "products" },
  { key: "v2_cust_list", handler: () => void openCustomerList() },
  { key: "v2_item_list", handler: () => void openProductList() },
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
  {
    key: "v2_daily_report",
    handler: () => void window.ahb.openDailyReportWindow(),
  },
  {
    key: "v2_client_report",
    handler: () => void window.ahb.openClientSelectWindow(),
  },
];

const todayText = computed(() => {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = String(d.getFullYear() % 100).padStart(2, "0");
  return `${dd}/${mm}/${yy}`;
});
</script>
