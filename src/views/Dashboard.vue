<template>
  <div class="flex flex-col h-screen p-2 lg:p-3 gap-2 lg:gap-3 dark:text-gray-100">
    <!-- Header band: title + product lookup panel -->
    <div class="flex items-center gap-3">
      <h1 class="text-xl lg:text-2xl font-bold tracking-wide">
        {{ t("business_name") }}
      </h1>
      <div
        class="panel panel-blue p-2 flex flex-col gap-1.5 min-w-[20rem]"
      >
        <div class="flex items-center gap-2">
          <label class="text-xs whitespace-nowrap w-24">{{ t("v2_product_id") }}:</label>
          <input
            type="text"
            :value="ld(selectedProductIdText)"
            readonly
            :class="[inputClass, 'text-right disabled:opacity-70 disabled:cursor-not-allowed read-only:opacity-70 read-only:cursor-default']"
          />
        </div>
        <div class="flex items-center gap-2">
          <label class="text-xs whitespace-nowrap w-24">{{ t("v2_stock_qty") }}:</label>
          <input
            type="text"
            :value="ld(selectedProductStockText)"
            readonly
            :class="[inputClass, 'text-right disabled:opacity-70 disabled:cursor-not-allowed read-only:opacity-70 read-only:cursor-default']"
          />
        </div>
      </div>
    </div>

    <!-- Info band: date/customer-id, last bill, search -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-2 lg:gap-3">
      <div
        class="lg:col-span-3 panel panel-blue p-2 flex flex-col gap-1.5"
      >
        <div class="flex items-center gap-2">
          <label class="text-xs whitespace-nowrap flex-1">{{ t("v2_date") }}:</label>
          <!-- Typed DD/MM/YY, with the calendar button for browsing back -->
          <div class="relative flex-1 min-w-0 max-w-[9rem]">
            <input
              type="text"
              :value="ld(dateText)"
              :class="[inputClass, 'w-full pr-6 text-right']"
              data-role="working-date"
              @input="dateText = toLatinDigits(($event.target as HTMLInputElement).value)"
              @keydown.enter.prevent="commitDateText"
              @blur="commitDateText"
            />
            <button
              type="button"
              class="absolute inset-y-0 right-0 px-1.5 text-[0.7rem] leading-none text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
              :aria-label="t('v2_date')"
              data-role="date-picker-toggle"
              @mousedown.prevent
              @click="openDatePicker"
            >
              📅
            </button>
            <!-- The native picker itself: driven by the button, never shown -->
            <input
              ref="datePicker"
              type="date"
              class="sr-only absolute inset-y-0 right-0 w-0"
              tabindex="-1"
              aria-hidden="true"
              @change="onDatePicked"
            />
          </div>
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
              @blur="onCustomerIdBlur"
              @keydown.down.prevent="moveCustomerHighlight(1)"
              @keydown.up.prevent="moveCustomerHighlight(-1)"
              @keydown.esc.prevent="closeCustomerSlots"
              @keydown.right.prevent="focusFirstProduct"
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
        class="lg:col-span-4 panel panel-green p-2 flex flex-col gap-1.5"
      >
        <div class="flex items-center gap-2">
          <label class="text-xs whitespace-nowrap w-32">{{ t("v2_last_bill_date") }}:</label>
          <input
            type="text"
            :value="ld(lastBillDateText)"
            readonly
            :class="[inputClass, 'text-right disabled:opacity-70 disabled:cursor-not-allowed read-only:opacity-70 read-only:cursor-default']"
          />
        </div>
        <div class="flex items-center gap-2">
          <label class="text-xs whitespace-nowrap w-32">{{ t("v2_last_bill") }}:</label>
          <input
            type="text"
            :value="ld(lastBillText)"
            readonly
            :class="[inputClass, 'text-right disabled:opacity-70 disabled:cursor-not-allowed read-only:opacity-70 read-only:cursor-default']"
          />
        </div>
      </div>

      <div
        class="lg:col-span-5 panel panel-amber p-2 flex flex-col gap-1.5"
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
            :class="[buttonClass, 'btn-amber px-4 h-8']"
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
            :class="[buttonClass, 'btn-amber px-4 h-8']"
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
          class="shrink-0 panel panel-green p-2 flex flex-col gap-1.5"
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
              readonly
              :class="[inputClass, 'text-right disabled:opacity-70 disabled:cursor-not-allowed read-only:opacity-70 read-only:cursor-default']"
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
            class="panel panel-green p-2 grid grid-cols-3 gap-1.5"
          >
            <button
              v-for="btn in printButtons"
              :key="btn.key"
              type="button"
              :class="[buttonClass, 'btn-green min-h-[3rem] px-1 py-1']"
              :disabled="btn.enabled ? !btn.enabled.value : false"
              @click="btn.handler?.()"
            >
              {{ t(btn.key) }}
            </button>
          </div>

          <div
            class="panel panel-amber p-2 grid grid-cols-2 gap-1.5"
          >
            <button
              v-for="btn in actionButtons"
              :key="btn.key"
              type="button"
              :class="[buttonClass, 'btn-amber min-h-[2.25rem] px-1 py-1']"
              @click="onActionClick(btn)"
            >
              {{ t(btn.key) }}
            </button>
          </div>

          <div
            class="panel panel-amber p-2 grid grid-cols-2 gap-1.5"
          >
            <button
              v-for="btn in reportButtons"
              :key="btn.key"
              type="button"
              :class="[buttonClass, 'btn-amber min-h-[2.25rem] px-1 py-1']"
              @click="onReportClick(btn)"
            >
              {{ t(btn.key) }}
            </button>
            <button
              type="button"
              :class="[buttonClass, 'btn-amber min-h-[2.25rem] px-1 py-1 col-span-2']"
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
            :locked="entryLocked"
            @product-selected="onProductSelected"
            @leave-left="focusCustomerId"
          />
        </div>

        <div class="panel panel-blue p-2 flex flex-col gap-1.5">
          <div class="flex items-center gap-2">
            <label class="text-xs whitespace-nowrap flex-1">{{ t("v2_grand_total") }}:</label>
            <input
              type="text"
              :value="ld(grandTotalText)"
              readonly
              :class="[inputClass, 'max-w-[55%] text-right disabled:opacity-70 disabled:cursor-not-allowed read-only:opacity-70 read-only:cursor-default']"
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
              :readonly="entryLocked"
              :class="[inputClass, 'max-w-[55%] text-right disabled:opacity-70 disabled:cursor-not-allowed read-only:opacity-70 read-only:cursor-default']"
              @keydown.enter.prevent="onDiscountEnter"
              @blur="onDiscountBlur"
            />
          </div>
          <div class="flex items-center gap-2">
            <label class="text-xs whitespace-nowrap flex-1">{{ t("v2_bill") }}:</label>
            <input
              type="text"
              :value="ld(billText)"
              readonly
              :class="[inputClass, 'max-w-[55%] text-right disabled:opacity-70 disabled:cursor-not-allowed read-only:opacity-70 read-only:cursor-default']"
            />
          </div>
          <div class="flex items-center gap-2">
            <label class="text-xs whitespace-nowrap flex-1">{{ t("v2_deposit") }}:</label>
            <input
              type="text"
              :value="ld(paidTotalText)"
              readonly
              :class="[inputClass, 'max-w-[55%] text-right disabled:opacity-70 disabled:cursor-not-allowed read-only:opacity-70 read-only:cursor-default']"
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
            :locked="entryLocked"
          />
        </div>
        <p
          v-if="mode === 'archive'"
          class="text-xs text-gray-500 dark:text-gray-400"
        >
          {{ t("v2_no_invoice_for_date") }}
        </p>
        <p
          v-if="postError"
          class="text-xs text-red-600 dark:text-red-400"
        >
          {{ postError }}
        </p>
        <div class="grid grid-cols-2 gap-2">
          <button
            type="button"
            :class="[buttonClass, 'btn-blue h-9']"
            :disabled="!canPost"
            @click="onPostData"
          >
            {{ t("v2_post_data") }}
          </button>
          <button
            type="button"
            :class="[buttonClass, 'btn-blue h-9']"
            :disabled="!canAmendInvoice"
            :title="posted && !canEditInvoice ? t('v2_older_invoice_locked') : undefined"
            @click="onEdit"
          >
            {{ t("v2_edit") }}
          </button>
        </div>
        <button
          type="button"
          :class="[buttonClass, 'btn-blue h-9 w-full']"
          :disabled="!canAmendInvoice"
          :title="posted && !canEditInvoice ? t('v2_older_invoice_locked') : undefined"
          @click="onPayment"
        >
          {{ t("v2_payment") }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue";
import { t } from "../i18n";
import type { Invoice, InvoiceDraft, InvoiceDraftLine } from "../main/data";
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

// The id as it stood when it was last committed. While the box still reads
// that, the dropdown is a browse list rather than a search: the customer is
// settled, so opening it means looking for a different one.
const committedCustomerId = ref<string | null>(null);

const customerSlotOptions = computed(() =>
  customerId.value === committedCustomerId.value
    ? customerSlots.value
    : filterSlots(customerSlots.value, customerId.value)
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

// ArrowLeft off the entry grid's ID column: the caret comes back here, ready
// for the next customer, the same way it arrives on mount
function focusCustomerId() {
  customerIdInput.value?.focus();
  customerIdInput.value?.select();
}

// The other half of that walk: ArrowRight goes into the grid's first ID cell.
// The dropdown is dismissed first — the caret is leaving the box it belongs to.
function focusFirstProduct() {
  closeCustomerSlots();
  entryTable.value?.focusFirstRow();
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
  // Typing is searching again
  committedCustomerId.value = null;
}

// Leaving the box settles whatever is in it, so the next open browses
function onCustomerIdBlur() {
  closeCustomerSlots();
  committedCustomerId.value = customerId.value;
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
  committedCustomerId.value = customerId.value;
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
  committedCustomerId.value = customerId.value;
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
// "archive" → an earlier day with nothing billed to this customer: nothing to
// show and nothing to enter, since a sale is only ever posted onto today.
const mode = ref<"entry" | "posted" | "editing" | "archive">("entry");
const posted = computed(() => mode.value === "posted");
// The grid takes input in the two entry modes only
const entryLocked = computed(
  () => mode.value !== "entry" && mode.value !== "editing"
);
// The loaded invoice is the customer's latest, so the domain will accept an
// edit or a payment against it
const canEditInvoice = ref(true);
const canPost = computed(() => viewingToday.value && !entryLocked.value);
const canAmendInvoice = computed(() => posted.value && canEditInvoice.value);
const postedInvoiceId = ref<string | null>(null);
const postedStatus = ref<PostedStatus | null>(null);
const postError = ref("");
const comment = ref("");
let posting = false;

function onEdit() {
  if (!canAmendInvoice.value) return;
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
  if (!canAmendInvoice.value || postedInvoiceId.value === null) return;
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

// ---------------------------------------------------------------------------
// Drafts: what has been entered for a customer before Post Data. Products,
// quantities and rates are stored as typed; no invoice number, no stock
// movement and no dues — all of that still happens once, at Post Data. This
// is what lets a clerk leave one customer half-billed, serve another, and
// come back.
// ---------------------------------------------------------------------------
const DRAFT_SAVE_DELAY_MS = 400;
let draftTimer: ReturnType<typeof setTimeout> | null = null;
// The customer the rows on screen belong to. Not parseCustomerId(): by the
// time a switch reaches loadLastBill the id box already holds the new one,
// and the pending draft belongs to the old customer.
let draftCustomerId: number | null = null;
// Loading rows programmatically (and posting) must not write a draft back
let suppressDraftSave = false;

function draftLines(): InvoiceDraftLine[] {
  return entryRows.value.flatMap((row) => {
    // The trailing empty row has no product, so it is never stored
    if (!row.product) return [];
    const quantity = parseNumber(row.amountText);
    return [
      {
        productId: row.product.id,
        quantity: Number.isFinite(quantity) && quantity >= 0 ? quantity : null,
        rate: row.price,
      },
    ];
  });
}

/** Write the current rows out as the draft, cancelling any pending save. */
async function saveDraftNow() {
  if (draftTimer !== null) {
    clearTimeout(draftTimer);
    draftTimer = null;
  }
  // A posted invoice is the record itself, and an earlier day is history:
  // neither is something to draft
  if (mode.value === "posted" || mode.value === "archive") return;
  const id = draftCustomerId;
  if (id === null) return;
  try {
    await window.ahb.saveInvoiceDraft({
      customerId: id,
      // An unposted edit stays attached to the invoice it is editing
      invoiceId:
        mode.value === "editing" && postedInvoiceId.value !== null
          ? postedInvoiceId.value
          : undefined,
      lines: draftLines(),
      discount: discount.value,
      notes: comment.value.trim() || undefined,
    });
  } catch {
    /* a draft that cannot be saved must not interrupt entry */
  }
}

function scheduleDraftSave() {
  if (suppressDraftSave) return;
  if (draftTimer !== null) clearTimeout(draftTimer);
  draftTimer = setTimeout(() => {
    draftTimer = null;
    void saveDraftNow();
  }, DRAFT_SAVE_DELAY_MS);
}

watch([entryRows, discount, comment], scheduleDraftSave, { deep: true });

function cancelDraftSave() {
  if (draftTimer !== null) {
    clearTimeout(draftTimer);
    draftTimer = null;
  }
}

/** Restore a customer's unposted entry, in editing mode if it edits an invoice. */
async function loadDraft(draft: InvoiceDraft) {
  let invoice: Invoice | null = null;
  if (draft.invoiceId) {
    try {
      invoice = await window.ahb.getInvoiceById(draft.invoiceId);
    } catch {
      invoice = null;
    }
  }
  const rows = await Promise.all(
    draft.lines.map((line) =>
      buildEntryRow({
        productId: line.productId,
        quantity: line.quantity,
        rate: line.rate,
        // The stored stock already accounts for whatever the invoice posted
        appliedQty: invoice?.lines.find(
          (l) => l.productId === line.productId
        )?.quantity,
      })
    )
  );
  entryRows.value = rows;
  discount.value = draft.discount;
  discountText.value = draft.discount > 0 ? draft.discount.toFixed(2) : "";
  comment.value = draft.notes ?? "";
  if (invoice) {
    postedInvoiceId.value = invoice.id;
    applyInvoiceToStatus(invoice);
    mode.value = "editing";
  } else {
    mode.value = "entry";
  }
  // The table has to see the restored rows before it appends to them
  await nextTick();
  // Appends the trailing empty row and puts the caret in it
  entryTable.value?.resumeEntry();
}

async function onPostData() {
  // A sale is only ever posted onto today: an earlier day is read-only
  if (!canPost.value || posting) return;
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
    // What was just posted is the customer's latest by definition
    canEditInvoice.value = true;
    // The money lives on the invoice now; the draft has done its job
    cancelDraftSave();
    try {
      await window.ahb.deleteInvoiceDraft(custId);
    } catch {
      /* a draft that cannot be deleted is harmless: posting is what counts */
    }
  } catch (e) {
    postError.value = e instanceof Error ? e.message : String(e);
  } finally {
    posting = false;
  }
}

let unsubscribeDataChanged: (() => void) | null = null;
let unsubscribeSelectPrintClosed: (() => void) | null = null;

onMounted(async () => {
  unsubscribeDataChanged =
    window.ahb.onDataChanged?.((payload) => void onDataChanged(payload)) ??
    null;
  // The picking sheet has been closed: the rows it was built from are no
  // longer a pending job, so the grid stops showing them as picked.
  unsubscribeSelectPrintClosed =
    window.ahb.onSelectPrintClosed?.(() =>
      entryTable.value?.clearSelection()
    ) ?? null;
  await nextTick();
  customerIdInput.value?.focus();
  customerIdInput.value?.select();
});

onUnmounted(() => {
  unsubscribeDataChanged?.();
  unsubscribeSelectPrintClosed?.();
  // Leaving the dashboard must not lose the last keystroke
  void saveDraftNow();
});

async function loadLastBill() {
  // However the id arrived, it counts as settled now
  committedCustomerId.value = customerId.value;
  // Flush what is on screen before the id box's new value takes over
  await saveDraftNow();
  const id = parseCustomerId();
  if (id === undefined) {
    lastBillDateText.value = "—";
    lastBillText.value = "—";
    setCustomerInfo(null);
    draftCustomerId = null;
    customerIdInput.value?.select();
    return;
  }
  // The invoice billed to this customer on the selected day, if any
  let dayInvoice: Invoice | null = null;
  // Dues are chained through each invoice's stored previousDue, so the domain
  // only lets a customer's latest invoice be edited or paid against.
  let isLatest = false;
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
      dayInvoice =
        invoices.find((i) => ymdOfLocal(i.date) === selectedDate.value) ?? null;
      isLatest = dayInvoice !== null && dayInvoice.no === latest.no;
    }
  } catch {
    lastBillDateText.value = "—";
    lastBillText.value = "—";
    setCustomerInfo(null);
  }
  // An entry left unposted for this customer outranks the posted invoice:
  // it is the newer intent, and it may itself be an edit of that invoice.
  // Drafts belong to entry in progress, which only happens on today's date.
  let draft: InvoiceDraft | null = null;
  if (viewingToday.value) {
    try {
      draft = await window.ahb.getInvoiceDraft(id);
    } catch {
      draft = null;
    }
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
  // Only meaningful once an invoice is loaded; entry always posts a new one
  canEditInvoice.value = dayInvoice ? isLatest : true;
  // No draft is written while an earlier day is being browsed
  draftCustomerId = viewingToday.value ? id : null;
  suppressDraftSave = true;
  try {
    if (draft) {
      await loadDraft(draft);
    } else if (dayInvoice) {
      // The day's invoice loads into the locked posted state, exactly as
      // right after Post Data: on the latest one Edit unlocks it and Payment
      // applies to it; an older one is there to be read and reprinted.
      await loadPostedInvoice(dayInvoice);
      // Entry mode lands on the first ID cell; a loaded invoice does the same,
      // so the header opens on the first line's product and stock
      entryTable.value?.focusFirstRow();
    } else if (viewingToday.value) {
      // Start product entry: focus moves into the first row's ID cell
      entryTable.value?.startEntry();
    } else {
      // An earlier day with nothing billed: there is nothing to enter, since
      // a sale is only ever posted onto today
      entryRows.value = [];
      mode.value = "archive";
    }
  } finally {
    // Let the row watcher run on the loaded rows before it counts as an edit
    await nextTick();
    suppressDraftSave = false;
  }
}

let loadedRowKey = -1;

/**
 * One entry row rebuilt from a stored line — a posted invoice's or a draft's.
 * A draft line may still be half-typed, so quantity and rate come in nullable:
 * a missing quantity leaves the cell empty and a missing rate falls back to
 * the product's catalogue price, exactly as typing the id would have.
 */
async function buildEntryRow(line: {
  productId: number;
  quantity: number | null;
  rate: number | null;
  unit?: string;
  description?: string;
  appliedQty?: number;
}): Promise<EntryRow> {
  let product: {
    nameBn: string;
    stock: number;
    unit: string;
    price: number;
  } | null = null;
  try {
    product = await window.ahb.getProductById(line.productId);
  } catch {
    product = null;
  }
  const rate = line.rate ?? product?.price ?? 0;
  return {
    key: loadedRowKey--,
    idText: String(line.productId),
    product: {
      id: line.productId,
      nameBn: product?.nameBn ?? line.description ?? "",
      unit: line.unit ?? product?.unit ?? "",
      price: rate,
      stock: product?.stock ?? 0,
    },
    amountText: line.quantity === null ? "" : String(line.quantity),
    appliedQty: line.appliedQty,
    priceText: rate.toFixed(2),
    price: rate,
  };
}

async function loadPostedInvoice(inv: Invoice) {
  const rows = await Promise.all(
    inv.lines.map((line) =>
      buildEntryRow({
        productId: line.productId,
        quantity: line.quantity,
        rate: line.rate,
        unit: line.unit,
        description: line.description,
        // Already posted, so the stored stock has this quantity in it
        appliedQty: line.quantity,
      })
    )
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

// The shape; the tint comes from the group the button belongs to
const buttonClass = "btn-tinted";

// Only Single Print is wired so far; the other two carry no handler yet.
const printButtons: Array<{
  key: string;
  handler?: () => void;
  enabled?: { value: boolean };
}> = [
  { key: "v2_single_print", handler: () => void onSinglePrint(), enabled: posted },
  { key: "v2_direct_print" },
  {
    key: "v2_select_print",
    handler: () => void window.ahb.openSelectPrintWindow(),
  },
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
  // Drops a stale row selection without opening anything
  { key: "v2_refresh", handler: () => entryTable.value?.clearSelection() },
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

// ---------------------------------------------------------------------------
// The working date. Today for a new sale; an earlier day loads whatever was
// billed to the selected customer then — one invoice per customer per day, so
// a date and an id name exactly one receipt.
// ---------------------------------------------------------------------------
function todayYmd(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** An invoice's day as the user sees it: local, not the ISO string's UTC. */
function ymdOfLocal(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function ymdToText(ymd: string): string {
  const [y = "", m = "", d = ""] = ymd.split("-");
  return `${d}/${m}/${y.slice(2)}`;
}

const selectedDate = ref(todayYmd());
const dateText = ref(ymdToText(selectedDate.value));
const datePicker = ref<HTMLInputElement | null>(null);
const viewingToday = computed(() => selectedDate.value === todayYmd());

/** "DD/MM/YY" back to "YYYY-MM-DD"; null when it is not a real date. */
function parseDateText(text: string): string | null {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/.exec(
    toLatinDigits(text).trim()
  );
  if (!m) return null;
  const [, dd = "", mm = "", yy = ""] = m;
  const year = yy.length === 2 ? 2000 + Number(yy) : Number(yy);
  const month = Number(mm);
  const day = Number(dd);
  const d = new Date(year, month - 1, day);
  // Rejects 31/02 and friends: the Date rolls them over
  if (
    d.getFullYear() !== year ||
    d.getMonth() !== month - 1 ||
    d.getDate() !== day
  ) {
    return null;
  }
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${year}-${pad(month)}-${pad(day)}`;
}

/** Move to a day and reload whatever the current customer has on it. */
function setSelectedDate(ymd: string) {
  if (ymd === selectedDate.value) {
    dateText.value = ymdToText(selectedDate.value);
    return;
  }
  selectedDate.value = ymd;
  dateText.value = ymdToText(ymd);
  void loadLastBill();
}

// A date that cannot be read is not a date: the box goes back to the day it
// is actually showing rather than silently loading something else.
function commitDateText() {
  const ymd = parseDateText(dateText.value);
  if (!ymd) {
    dateText.value = ymdToText(selectedDate.value);
    return;
  }
  setSelectedDate(ymd);
}

function openDatePicker() {
  const el = datePicker.value;
  if (!el) return;
  el.value = selectedDate.value;
  // Chromium opens the calendar here; the text box stays the keyboard path
  if (typeof el.showPicker === "function") el.showPicker();
  else el.click();
}

function onDatePicked(e: Event) {
  const value = (e.target as HTMLInputElement).value;
  if (value) setSelectedDate(value);
}
</script>
