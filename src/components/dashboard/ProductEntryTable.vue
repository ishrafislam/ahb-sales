<template>
  <div class="flex-grow bg-white dark:bg-gray-900 shadow-sm border border-gray-200 dark:border-gray-700 min-h-0 overflow-y-auto">
    <table class="w-full text-sm text-left border-collapse">
      <thead
        class="text-xs uppercase bg-gray-50 dark:bg-gray-900 dark:text-gray-100 sticky top-0"
      >
        <tr>
          <th :class="[cellBorderClass, 'w-8']"></th>
          <th :class="[cellBorderClass, 'px-2 py-2 w-20']">
            {{ t("id") }}
          </th>
          <th :class="[cellBorderClass, 'px-2 py-2']">
            {{ t("name") }}
          </th>
          <th :class="[cellBorderClass, 'px-2 py-2 w-24 text-right']">
            {{ t("qty") }}
          </th>
          <th :class="[cellBorderClass, 'px-2 py-2 w-20']">
            {{ t("unit") }}
          </th>
          <th :class="[cellBorderClass, 'px-2 py-2 w-24 text-right']">
            {{ t("price") }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="(row, idx) in rows"
          :key="row.key"
          :class="
            row.key === selectedKey
              ? 'bg-blue-50 dark:bg-blue-950'
              : 'bg-white dark:bg-gray-900'
          "
        >
          <td :class="[cellBorderClass, 'p-0 w-8 h-px']">
            <button
              type="button"
              :disabled="locked || !row.product"
              class="row-selector block w-full h-full text-center text-xs bg-gray-50 dark:bg-gray-800 disabled:cursor-not-allowed"
              @click="selectRow(row)"
              @keydown.delete.prevent="deleteSelected"
            >
              {{ row.key === selectedKey ? "►" : "" }}
            </button>
          </td>
          <td :class="[cellBorderClass, 'px-2 py-1']">
            <input
              :ref="(el) => setCellRef(idx, 'id', el)"
              v-model="row.idText"
              type="text"
              inputmode="numeric"
              :disabled="locked"
              :class="[cellInputClass, 'disabled:opacity-70 disabled:cursor-not-allowed']"
              @keydown.enter.prevent="onIdEnter(idx)"
              @keydown="onCellKeydown($event, idx, 'id')"
              @focus="onIdCellFocus(idx)"
              @input="openSlots"
              @blur="closeSlots"
            >
          </td>
          <td :class="[cellBorderClass, 'px-2 py-1']">
            {{ row.product?.nameBn ?? "" }}
          </td>
          <td :class="[cellBorderClass, 'px-2 py-1']">
            <input
              :ref="(el) => setCellRef(idx, 'amount', el)"
              v-model="row.amountText"
              type="text"
              inputmode="decimal"
              :disabled="locked"
              :class="[cellInputClass, 'text-right disabled:opacity-70 disabled:cursor-not-allowed']"
              @keydown.enter.prevent="onAmountEnter(idx)"
              @keydown="onCellKeydown($event, idx, 'amount')"
              @focus="onCellFocus(idx)"
            >
          </td>
          <td :class="[cellBorderClass, 'px-2 py-1']">
            {{ row.product?.unit ?? "" }}
          </td>
          <td :class="[cellBorderClass, 'px-2 py-1']">
            <input
              v-model="row.priceText"
              type="text"
              inputmode="decimal"
              :disabled="locked || !row.product"
              :class="[cellInputClass, 'text-right disabled:opacity-70 disabled:cursor-not-allowed']"
              @keydown.enter.prevent="onPriceEnter(idx)"
              @blur="onPriceBlur(idx)"
              @focus="onCellFocus(idx)"
            >
          </td>
        </tr>
      </tbody>
    </table>
    <SlotDropdown
      :open="slotsOpen"
      :options="slotOptions"
      :highlight="-1"
      :anchor="slotAnchor"
      @select="selectSlot"
    />
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: "AhbProductEntryTable" });
import { computed, nextTick, ref, watch } from "vue";
import { t } from "../../i18n";
import SlotDropdown from "./SlotDropdown.vue";
import { toSlots, filterSlots, type SlotOption } from "./slotOptions";
import { MIN_PRODUCT_ID, MAX_PRODUCT_ID } from "../../constants/business";

export type EntryRow = {
  key: number;
  idText: string;
  product: {
    id: number;
    nameBn: string;
    unit: string;
    price: number;
    stock: number;
  } | null;
  amountText: string;
  /**
   * How much of this line the stored stock already accounts for: the posted
   * invoice's quantity on a restored row, absent on a draft. Only the
   * difference between the entered amount and this has yet to leave the shelf.
   */
  appliedQty?: number;
  priceText: string;
  // Price used for totals; priceText is only a draft until committed
  // with Enter (or reset on blur).
  price: number | null;
};

type Col = "id" | "amount";

const rows = defineModel<EntryRow[]>("rows", { required: true });
const props = withDefaults(defineProps<{ locked?: boolean }>(), {
  locked: false,
});
const emit = defineEmits<{
  (
    e: "product-selected",
    payload: { id: number; stock: number } | null
  ): void;
}>();

// Stock shown in the header is the projection after this sale: stored stock
// minus whatever this row has yet to take off the shelf. A row restored from a
// posted invoice is already inside the stored stock, so only a change to its
// amount projects. Display only — real stock changes when the invoice is
// posted.
function projectedStock(row: EntryRow): number {
  const amount = Number.parseFloat(row.amountText);
  const sold = Number.isFinite(amount) && amount > 0 ? amount : 0;
  const pending = sold - (row.appliedQty ?? 0);
  return Math.round((row.product!.stock - pending) * 100) / 100;
}

// Row the header is currently following, so a stock change arriving from
// another window can refresh it in place
const followedKey = ref<number | null>(null);

function emitSelected(row: EntryRow | undefined) {
  followedKey.value = row?.product ? row.key : null;
  emit(
    "product-selected",
    row?.product ? { id: row.product.id, stock: projectedStock(row) } : null
  );
}

/**
 * A purchase posted in another window changed this product's stock. Refresh
 * every row holding it, and the header if it is following one of them.
 */
function refreshProductStock(id: number, stock: number) {
  for (const row of rows.value) {
    if (row.product?.id === id) row.product.stock = stock;
  }
  const followed = rows.value.find((r) => r.key === followedKey.value);
  if (followed?.product?.id === id) emitSelected(followed);
}

// Header info follows the focused row: fires on any focus (click, arrow
// navigation, programmatic moves), null for rows without a loaded product.
function onCellFocus(idx: number) {
  emitSelected(rows.value[idx]);
}

// Excel-style row selection via the left gutter column: click selects,
// Delete removes the row from the draft (the invoice itself is only
// updated on Post Data).
const selectedKey = ref<number | null>(null);

// Clicking an already-selected row's gutter deselects it (toggle); rows
// without a loaded product (the fresh entry row) cannot be selected.
function selectRow(row: EntryRow) {
  if (!row.product) return;
  const selecting = selectedKey.value !== row.key;
  selectedKey.value = selecting ? row.key : null;
  // Show the selected product's projected stock in the header
  if (selecting) emitSelected(row);
}

function deleteSelected() {
  if (props.locked || selectedKey.value === null) return;
  const idx = rows.value.findIndex((r) => r.key === selectedKey.value);
  selectedKey.value = null;
  if (idx === -1) return;
  rows.value.splice(idx, 1);
  if (rows.value.length === 0) {
    rows.value.push(makeRow());
    void focusCell(0, "id");
  }
}

// Selection can become stale when rows are replaced (new customer,
// posting prunes rows) or the grid locks
watch(
  rows,
  () => {
    if (
      selectedKey.value !== null &&
      !rows.value.some((r) => r.key === selectedKey.value)
    ) {
      selectedKey.value = null;
    }
  },
  { deep: true }
);
watch(
  () => props.locked,
  (locked) => {
    if (locked) selectedKey.value = null;
  }
);

let nextKey = 1;
function makeRow(): EntryRow {
  return {
    key: nextKey++,
    idText: "",
    product: null,
    amountText: "",
    priceText: "",
    price: null,
  };
}

const cellRefs = new Map<string, HTMLInputElement>();
function setCellRef(idx: number, col: Col, el: unknown) {
  const key = `${idx}:${col}`;
  if (el) cellRefs.set(key, el as HTMLInputElement);
  else cellRefs.delete(key);
}

async function focusCell(idx: number, col: Col) {
  await nextTick();
  const el = cellRefs.get(`${idx}:${col}`);
  if (!el) return;
  el.focus();
  el.select();
}

async function onIdEnter(idx: number) {
  const row = rows.value[idx];
  if (!row) return;
  closeSlots();
  const id = Number.parseInt(row.idText, 10);
  if (Number.isNaN(id) || id < MIN_PRODUCT_ID || id > MAX_PRODUCT_ID) {
    void focusCell(idx, "id");
    return;
  }
  const product = await window.ahb.getProductById(id);
  if (!product) {
    void focusCell(idx, "id");
    return;
  }
  row.product = {
    id: product.id,
    nameBn: product.nameBn,
    unit: product.unit,
    price: product.price,
    stock: product.stock,
  };
  row.idText = String(product.id);
  row.priceText = product.price.toFixed(2);
  row.price = product.price;
  void focusCell(idx, "amount");
}

async function onAmountEnter(idx: number) {
  const row = rows.value[idx];
  if (!row) return;
  const amount = Number.parseFloat(row.amountText);
  if (!Number.isFinite(amount) || amount <= 0) {
    void focusCell(idx, "amount");
    return;
  }
  if (idx === rows.value.length - 1) {
    rows.value.push(makeRow());
  }
  await focusCell(idx + 1, "id");
  // The next row's focus emitted null; keep the just-entered product's
  // projected stock visible in the header instead.
  if (row.product) emitSelected(row);
}

// The edited price only takes effect on Enter; an abandoned draft
// (blur without Enter) resets to the committed price.
function onPriceEnter(idx: number) {
  const row = rows.value[idx];
  if (!row || !row.product) return;
  const price = Number.parseFloat(row.priceText);
  if (!Number.isFinite(price) || price < 0) {
    row.priceText = row.price !== null ? row.price.toFixed(2) : "";
  } else {
    row.price = price;
    row.priceText = price.toFixed(2);
  }
  const el = document.activeElement;
  if (el instanceof HTMLInputElement) el.select();
}

function onPriceBlur(idx: number) {
  const row = rows.value[idx];
  if (!row) return;
  row.priceText = row.price !== null ? row.price.toFixed(2) : "";
}

// Arrow navigation covers the ID and Amount columns; the Price cell is
// deliberately excluded — it is only reached by clicking it directly.
function onCellKeydown(e: KeyboardEvent, idx: number, col: Col) {
  // The dropdown never takes the arrows: they walk the entry rows, open list
  // or not. Esc dismisses the panel, and a slot is picked by clicking it or by
  // typing its id.
  if (col === "id" && slotsOpen.value && e.key === "Escape") {
    e.preventDefault();
    closeSlots();
    return;
  }
  if (e.key === "ArrowUp" && idx > 0) {
    e.preventDefault();
    void focusCell(idx - 1, col);
  } else if (e.key === "ArrowDown" && idx < rows.value.length - 1) {
    e.preventDefault();
    void focusCell(idx + 1, col);
  } else if (e.key === "ArrowLeft" && col === "amount") {
    e.preventDefault();
    void focusCell(idx, "id");
  } else if (e.key === "ArrowRight" && col === "id") {
    e.preventDefault();
    void focusCell(idx, "amount");
  }
}

function startEntry() {
  selectedKey.value = null;
  rows.value = [makeRow()];
  void focusCell(0, "id");
}

// Re-entering edit mode on a posted invoice: the trailing empty row was
// pruned at post time, so append a fresh one for new products.
function resumeEntry() {
  selectedKey.value = null;
  rows.value.push(makeRow());
  void focusCell(rows.value.length - 1, "id");
}

// ID dropdown: every slot 1..MAX_PRODUCT_ID, saved products merged in
const slots = ref<SlotOption[]>([]);
const slotsOpen = ref(false);
const slotRow = ref<number | null>(null);
let slotsLoaded = false;

const slotAnchor = computed(() =>
  slotRow.value === null
    ? null
    : (cellRefs.get(`${slotRow.value}:id`) ?? null)
);

const slotOptions = computed(() => {
  const row = slotRow.value === null ? undefined : rows.value[slotRow.value];
  return filterSlots(slots.value, row?.idText ?? "");
});

async function loadSlots() {
  // A dropdown that cannot be filled is not worth breaking the cell over
  let products: Awaited<ReturnType<typeof window.ahb.listProducts>> = [];
  try {
    products = await window.ahb.listProducts();
  } catch {
    return;
  }
  slots.value = toSlots(
    products.map((p) => ({
      id: p.id,
      primary: p.nameBn,
      secondary: p.description,
    })),
    MAX_PRODUCT_ID
  );
  slotsLoaded = true;
}

/** A product added or restocked elsewhere should show up without a restart. */
async function reloadSlots() {
  if (slotsLoaded) await loadSlots();
}

function onIdCellFocus(idx: number) {
  onCellFocus(idx);
  slotRow.value = idx;
  openSlots();
}

function openSlots() {
  slotsOpen.value = true;
  if (!slotsLoaded) void loadSlots();
}

function closeSlots() {
  slotsOpen.value = false;
}

function selectSlot(option: SlotOption) {
  const idx = slotRow.value;
  if (idx === null) return;
  const row = rows.value[idx];
  if (!row) return;
  row.idText = String(option.id);
  closeSlots();
  void onIdEnter(idx);
}

defineExpose({ startEntry, resumeEntry, refreshProductStock, reloadSlots });

const cellInputClass =
  "w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 px-1.5 py-0.5 text-xs dark:text-gray-100";

const cellBorderClass = "border border-gray-300 dark:border-gray-600";
</script>
