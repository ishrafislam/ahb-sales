<template>
  <div class="flex-grow panel min-h-0 overflow-y-auto">
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
            selectedKeys.has(row.key)
              ? 'bg-blue-50 dark:bg-blue-950'
              : 'bg-white dark:bg-gray-900'
          "
        >
          <td :class="[cellBorderClass, 'p-0 w-8 h-px']">
            <button
              type="button"
              :disabled="!row.product"
              class="row-selector block w-full h-full text-center text-xs bg-gray-50 dark:bg-gray-800 disabled:cursor-not-allowed"
              @click="selectRow(row, $event)"
              @mousedown="startDrag(idx, $event)"
              @mouseenter="extendDrag(idx)"
              @keydown.delete.prevent="deleteSelected"
            >
              {{ selectedKeys.has(row.key) ? "►" : "" }}
            </button>
          </td>
          <td :class="[cellBorderClass, 'px-2 py-1']">
            <div class="relative">
              <input
                :ref="(el) => setCellRef(row.key, 'id', el)"
                :value="ld(row.idText)"
                type="text"
                inputmode="numeric"
                @input="row.idText = toLatinDigits(($event.target as HTMLInputElement).value)"
                :readonly="locked"
                :class="[cellInputClass, 'pr-5 disabled:opacity-70 disabled:cursor-not-allowed', locked ? lockedInputClass : '']"
                @keydown.enter.prevent="onIdEnter(idx)"
                @keydown="onCellKeydown($event, idx, 'id')"
                @focus="onIdCellFocus(idx)"
                @blur="onIdBlur(idx)"
              >
              <!-- Opening the list is a deliberate click: focus happens on
                   every arrow-key step through the rows -->
              <button
                type="button"
                :disabled="locked"
                class="absolute inset-y-0 right-0 px-1 text-[0.6rem] leading-none text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 disabled:opacity-70"
                :aria-label="t('id')"
                data-role="slots-toggle"
                @mousedown.prevent
                @click="void toggleSlots(idx)"
              >
                ▼
              </button>
            </div>
          </td>
          <td :class="[cellBorderClass, 'px-2 py-1']">
            {{ row.product?.nameBn ?? "" }}
          </td>
          <td :class="[cellBorderClass, 'px-2 py-1']">
            <input
              :ref="(el) => setCellRef(row.key, 'amount', el)"
              :value="ld(row.amountText)"
              type="text"
              inputmode="decimal"
              @input="row.amountText = toLatinDigits(($event.target as HTMLInputElement).value)"
              :readonly="locked"
              :class="[cellInputClass, 'text-right disabled:opacity-70 disabled:cursor-not-allowed', locked ? lockedInputClass : '']"
              @keydown.enter.prevent="onAmountEnter(idx)"
              @keydown="onCellKeydown($event, idx, 'amount')"
              @focus="onCellFocus(idx)"
              @blur="onAmountBlur(idx)"
            >
          </td>
          <td :class="[cellBorderClass, 'px-2 py-1']">
            {{ row.product?.unit ?? "" }}
          </td>
          <td :class="[cellBorderClass, 'px-2 py-1']">
            <input
              :ref="(el) => setCellRef(row.key, 'price', el)"
              :value="ld(row.priceText)"
              type="text"
              inputmode="decimal"
              @input="row.priceText = toLatinDigits(($event.target as HTMLInputElement).value)"
              :disabled="!row.product"
              :readonly="locked"
              :class="[cellInputClass, 'text-right disabled:opacity-70 disabled:cursor-not-allowed', locked ? lockedInputClass : '']"
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
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue";
import { t } from "../../i18n";
import SlotDropdown from "./SlotDropdown.vue";
import { toSlots, filterSlots, type SlotOption } from "./slotOptions";
import { MIN_PRODUCT_ID, MAX_PRODUCT_ID } from "../../constants/business";
import { rowsToTsv, type SheetRow } from "./selectionClipboard";
import {
  localizeDigits as ld,
  parseInteger,
  parseNumber,
  toLatinDigits,
} from "../../utils/numerals";

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

type Col = "id" | "amount" | "price";

const rows = defineModel<EntryRow[]>("rows", { required: true });
const props = withDefaults(defineProps<{ locked?: boolean }>(), {
  locked: false,
});
const emit = defineEmits<{
  (
    e: "product-selected",
    payload: { id: number; stock: number } | null
  ): void;
  // ArrowLeft off the ID column: the grid's left edge, so the caret goes back
  // to whatever the parent keeps there — the Customer ID box.
  (e: "leave-left"): void;
}>();

// Stock shown in the header is the projection after this sale: stored stock
// minus whatever this row has yet to take off the shelf. A row restored from a
// posted invoice is already inside the stored stock, so only a change to its
// amount projects. Display only — real stock changes when the invoice is
// posted.
function projectedStock(row: EntryRow): number {
  const amount = parseNumber(row.amountText);
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

// Excel-style row selection via the left gutter column: click picks one row,
// Ctrl+click adds another, dragging down the gutter takes a run of them.
// Delete removes them from the draft (the invoice itself is only updated on
// Post Data), Ctrl+C puts them on the clipboard.
const selectedKeys = ref<Set<number>>(new Set());

function selectableRow(idx: number): EntryRow | undefined {
  const row = rows.value[idx];
  return row?.product ? row : undefined;
}

/**
 * Click picks this row alone, and clicking the only selected row clears it.
 * Ctrl (or Cmd) keeps what is already picked and toggles this one.
 */
function selectRow(row: EntryRow, e?: MouseEvent) {
  if (!row.product) return;
  const current = selectedKeys.value;
  let next: Set<number>;
  if (e && (e.ctrlKey || e.metaKey)) {
    next = new Set(current);
    if (next.has(row.key)) next.delete(row.key);
    else next.add(row.key);
  } else if (current.size === 1 && current.has(row.key)) {
    // Clicking the one picked row is how it is put back
    next = new Set();
  } else {
    next = new Set([row.key]);
  }
  selectedKeys.value = next;
  // Show the row's projected stock in the header while it is picked
  if (next.has(row.key)) emitSelected(row);
}

// Dragging the gutter: the row the press started on anchors a range that
// follows the pointer until the button comes back up anywhere on screen.
let dragAnchor: number | null = null;
let dragBase: Set<number> | null = null;

function startDrag(idx: number, e: MouseEvent) {
  if (!selectableRow(idx)) return;
  dragAnchor = idx;
  dragBase = e.ctrlKey || e.metaKey ? new Set(selectedKeys.value) : new Set();
  window.addEventListener("mouseup", endDrag);
}

function extendDrag(idx: number) {
  if (dragAnchor === null) return;
  const [from, to] =
    dragAnchor <= idx ? [dragAnchor, idx] : [idx, dragAnchor];
  const next = new Set(dragBase ?? []);
  for (let i = from; i <= to; i++) {
    const row = selectableRow(i);
    if (row) next.add(row.key);
  }
  selectedKeys.value = next;
}

function endDrag() {
  dragAnchor = null;
  dragBase = null;
  window.removeEventListener("mouseup", endDrag);
}

function deleteSelected() {
  if (props.locked || selectedKeys.value.size === 0) return;
  const doomed = rows.value
    .map((r, i) => (selectedKeys.value.has(r.key) ? i : -1))
    .filter((i) => i !== -1);
  selectedKeys.value = new Set();
  if (doomed.length === 0) return;
  // Back to front, so the indexes ahead of each splice stay put
  for (const idx of [...doomed].reverse()) rows.value.splice(idx, 1);
  if (rows.value.length === 0) rows.value.push(makeRow());
  // Entry carries on where the first deleted row was
  void focusCell(Math.min(doomed[0]!, rows.value.length - 1), "id");
}

/** The picked rows as they go on the clipboard: id, name, quantity, unit. */
function selectedSheetRows(): SheetRow[] {
  return rows.value.flatMap((row) =>
    row.product && selectedKeys.value.has(row.key)
      ? [
          {
            id: row.product.id,
            name: row.product.nameBn,
            quantity: parseNumber(row.amountText) || 0,
            unit: row.product.unit,
          },
        ]
      : []
  );
}

async function copySelection() {
  const picked = selectedSheetRows();
  if (picked.length === 0) return;
  try {
    await window.ahb.writeClipboardText(rowsToTsv(picked));
  } catch {
    // A clipboard that will not take the rows is not worth an error line
  }
}

// Ctrl+C anywhere in the window copies the picked rows — except inside a cell,
// where it still means "copy the text I have highlighted".
function onDocumentKeydown(e: KeyboardEvent) {
  if (e.key !== "c" || !(e.ctrlKey || e.metaKey)) return;
  const target = e.target as HTMLElement | null;
  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
    return;
  }
  if (selectedKeys.value.size === 0) return;
  e.preventDefault();
  void copySelection();
}

onMounted(() => {
  document.addEventListener("keydown", onDocumentKeydown);
});
onUnmounted(() => {
  document.removeEventListener("keydown", onDocumentKeydown);
  endDrag();
});

// Selection can become stale when rows are replaced (new customer, posting
// prunes rows)
watch(
  rows,
  () => {
    const live = new Set(rows.value.map((r) => r.key));
    if ([...selectedKeys.value].every((k) => live.has(k))) return;
    selectedKeys.value = new Set(
      [...selectedKeys.value].filter((k) => live.has(k))
    );
  },
  { deep: true }
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

// Keyed by the row's own key rather than its position: rows are keyed in the
// template, so deleting one re-runs the surviving rows' ref callbacks at their
// new positions — and the departing row's `null` callback, arriving after
// them, would drop an entry that now belongs to a row still on screen.
const cellRefs = new Map<string, HTMLInputElement>();
function setCellRef(rowKey: number, col: Col, el: unknown) {
  const key = `${rowKey}:${col}`;
  if (el) cellRefs.set(key, el as HTMLInputElement);
  else cellRefs.delete(key);
}

function cellEl(idx: number, col: Col): HTMLInputElement | undefined {
  const row = rows.value[idx];
  return row ? cellRefs.get(`${row.key}:${col}`) : undefined;
}

async function focusCell(idx: number, col: Col) {
  await nextTick();
  const el = cellEl(idx, col);
  if (!el) return;
  el.focus();
  el.select();
}

/**
 * Load the product the ID cell names. Shared by Enter and blur, so neither
 * moves focus from here — that is the caller's business.
 *
 * The row below is added as soon as the product lands rather than waiting for
 * the amount, so the next product can be typed straight away.
 */
async function commitId(idx: number): Promise<boolean> {
  if (props.locked) return false;
  const row = rows.value[idx];
  if (!row) return false;
  const id = parseInteger(row.idText);
  if (Number.isNaN(id) || id < MIN_PRODUCT_ID || id > MAX_PRODUCT_ID) {
    return false;
  }
  // Re-committing the id the row already holds would fetch the catalog price
  // back over a hand-edited one
  if (row.product?.id === id) {
    row.idText = String(id);
    return true;
  }
  const product = await window.ahb.getProductById(id);
  // The row can be spliced away while the lookup is in flight
  if (rows.value[idx] !== row) return false;
  if (!product) return false;
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
  emitSelected(row);
  if (idx === rows.value.length - 1) rows.value.push(makeRow());
  return true;
}

async function onIdEnter(idx: number) {
  closeSlots();
  const ok = await commitId(idx);
  void focusCell(idx, ok ? "amount" : "id");
}

/**
 * Leaving the cell commits it too. An id that names nothing clears back to
 * whatever the row already had — blur never pulls focus, so the user is not
 * held in a cell they are trying to leave.
 */
async function onIdBlur(idx: number) {
  closeSlots();
  const row = rows.value[idx];
  if (!row || !row.idText.trim()) return;
  if (await commitId(idx)) return;
  const current = rows.value[idx];
  if (!current) return;
  current.idText = current.product ? String(current.product.id) : "";
}

/**
 * Enter and blur commit the amount the same way.
 *
 * Zero is a quantity like any other: the item is named on the receipt with
 * nothing charged for it, so the row's price goes to 0 with it. Coming back
 * off zero restores the catalog price — but only if the price is still the 0
 * this put there, never over one the user typed.
 */
function commitAmount(idx: number): boolean {
  if (props.locked) return false;
  const row = rows.value[idx];
  if (!row) return false;
  const amount = parseNumber(row.amountText);
  if (!Number.isFinite(amount) || amount < 0) return false;
  if (amount === 0) {
    row.price = 0;
    row.priceText = "0.00";
  } else if (row.price === 0 && row.product) {
    row.price = row.product.price;
    row.priceText = row.product.price.toFixed(2);
  }
  return true;
}

async function onAmountEnter(idx: number) {
  const row = rows.value[idx];
  if (!row) return;
  if (!commitAmount(idx)) {
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

// A negative or unreadable amount is not worth keeping around; the header
// follows the cell back to the unsold figure.
function onAmountBlur(idx: number) {
  if (props.locked) return;
  const row = rows.value[idx];
  if (!row) return;
  if (!commitAmount(idx)) row.amountText = "";
  emitSelected(row);
}

// Enter and blur commit the same way; a price that is not a number at all
// falls back to the one already committed.
function commitPrice(idx: number) {
  if (props.locked) return;
  const row = rows.value[idx];
  if (!row || !row.product) return;
  const price = parseNumber(row.priceText);
  if (!Number.isFinite(price) || price < 0) {
    row.priceText = row.price !== null ? row.price.toFixed(2) : "";
  } else {
    row.price = price;
    row.priceText = price.toFixed(2);
  }
}

/**
 * Enter walks down the price column, so a round of price corrections is one
 * pass. A row with no product has a disabled price cell, so entry falls back
 * to its ID cell.
 */
function onPriceEnter(idx: number) {
  commitPrice(idx);
  const next = rows.value[idx + 1];
  if (next) {
    void focusCell(idx + 1, next.product ? "price" : "id");
    return;
  }
  const el = document.activeElement;
  if (el instanceof HTMLInputElement) el.select();
}

function onPriceBlur(idx: number) {
  commitPrice(idx);
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
  } else if (e.key === "ArrowLeft" && col === "id") {
    // Nothing to the left inside the grid: hand the caret back
    e.preventDefault();
    if (slotsOpen.value) closeSlots();
    emit("leave-left");
  } else if (e.key === "ArrowRight" && col === "id") {
    e.preventDefault();
    void focusCell(idx, "amount");
  }
}

function startEntry() {
  selectedKeys.value = new Set();
  rows.value = [makeRow()];
  void focusCell(0, "id");
}

// Re-entering edit mode on a posted invoice: the trailing empty row was
// pruned at post time, so append a fresh one for new products.
function resumeEntry() {
  selectedKeys.value = new Set();
  rows.value.push(makeRow());
  void focusCell(rows.value.length - 1, "id");
}

// ID dropdown: every slot 1..MAX_PRODUCT_ID, saved products merged in
const slots = ref<SlotOption[]>([]);
const slotsOpen = ref(false);
const slotRow = ref<number | null>(null);
let slotsLoaded = false;

const slotAnchor = computed(() =>
  slotRow.value === null ? null : (cellEl(slotRow.value, "id") ?? null)
);

const slotOptions = computed(() => {
  const row = slotRow.value === null ? undefined : rows.value[slotRow.value];
  if (!row) return slots.value;
  // A row already holding the product its id names is settled: opening the
  // list there is a request for a different product, not a search for this
  // one, so offer them all. Typing puts the text out of step again.
  const typed = toLatinDigits(row.idText).trim();
  if (row.product && String(row.product.id) === typed) return slots.value;
  return filterSlots(slots.value, row.idText);
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
  closeSlots();
}

async function toggleSlots(idx: number) {
  if (slotsOpen.value && slotRow.value === idx) {
    closeSlots();
    return;
  }
  slotRow.value = idx;
  // Open only once the cell has focus: focusing it fires onIdCellFocus, which
  // closes the panel — opening first would shut it again a tick later.
  await focusCell(idx, "id");
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

/**
 * Put the cursor on the first row's ID cell. Used when a posted invoice is
 * loaded: the rows are read-only, but walking them is how the header shows
 * each product's stock.
 */
function focusFirstRow() {
  void focusCell(0, "id");
}

/** Drop the row selection: the job it was picked for is over. */
function clearSelection() {
  selectedKeys.value = new Set();
}

defineExpose({
  clearSelection,
  startEntry,
  resumeEntry,
  focusFirstRow,
  refreshProductStock,
  reloadSlots,
});

const cellInputClass =
  "w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 px-1.5 py-0.5 text-xs dark:text-gray-100";

const cellBorderClass = "border border-gray-300 dark:border-gray-600";

// A posted invoice reads like a locked one, but its cells still take focus so
// the rows can be walked and the header can follow them
const lockedInputClass = "opacity-70 cursor-default";
</script>
