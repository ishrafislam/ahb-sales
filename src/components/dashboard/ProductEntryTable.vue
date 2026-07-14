<template>
  <div class="flex-grow bg-white dark:bg-gray-900 shadow-sm border border-gray-200 dark:border-gray-700 min-h-0 overflow-y-auto">
    <table class="w-full text-sm text-left">
      <thead
        class="text-xs uppercase bg-gray-50 dark:bg-gray-900 dark:text-gray-100 sticky top-0 border-b border-gray-200 dark:border-gray-700"
      >
        <tr>
          <th class="px-2 py-2 w-20">
            {{ t("id") }}
          </th>
          <th class="px-2 py-2">
            {{ t("name") }}
          </th>
          <th class="px-2 py-2 w-24 text-right">
            {{ t("qty") }}
          </th>
          <th class="px-2 py-2 w-20">
            {{ t("unit") }}
          </th>
          <th class="px-2 py-2 w-24 text-right">
            {{ t("price") }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="(row, idx) in rows"
          :key="row.key"
          class="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700"
        >
          <td class="px-2 py-1">
            <input
              :ref="(el) => setCellRef(idx, 'id', el)"
              v-model="row.idText"
              type="text"
              inputmode="numeric"
              :disabled="locked"
              :class="[cellInputClass, 'disabled:opacity-70 disabled:cursor-not-allowed']"
              @keydown.enter.prevent="onIdEnter(idx)"
              @keydown="onCellKeydown($event, idx, 'id')"
              @focus="onCellFocus(idx)"
            >
          </td>
          <td class="px-2 py-1">
            {{ row.product?.nameBn ?? "" }}
          </td>
          <td class="px-2 py-1">
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
          <td class="px-2 py-1">
            {{ row.product?.unit ?? "" }}
          </td>
          <td class="px-2 py-1">
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
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: "AhbProductEntryTable" });
import { nextTick } from "vue";
import { t } from "../../i18n";
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
  priceText: string;
  // Price used for totals; priceText is only a draft until committed
  // with Enter (or reset on blur).
  price: number | null;
};

type Col = "id" | "amount";

const rows = defineModel<EntryRow[]>("rows", { required: true });
withDefaults(defineProps<{ locked?: boolean }>(), { locked: false });
const emit = defineEmits<{
  (
    e: "product-selected",
    payload: { id: number; stock: number } | null
  ): void;
}>();

// Header info follows the focused row: fires on any focus (click, arrow
// navigation, programmatic moves), null for rows without a loaded product.
function onCellFocus(idx: number) {
  const product = rows.value[idx]?.product;
  emit("product-selected", product ? { id: product.id, stock: product.stock } : null);
}

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
  const id = Number.parseInt(row.idText, 10);
  if (Number.isNaN(id) || id < MIN_PRODUCT_ID || id > MAX_PRODUCT_ID) {
    void focusCell(idx, "id");
    return;
  }
  // Same product already in another row: jump to its amount instead
  const existingIdx = rows.value.findIndex(
    (r, i) => i !== idx && r.product?.id === id
  );
  if (existingIdx !== -1) {
    row.idText = row.product ? String(row.product.id) : "";
    void focusCell(existingIdx, "amount");
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

function onAmountEnter(idx: number) {
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
  void focusCell(idx + 1, "id");
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
  rows.value = [makeRow()];
  void focusCell(0, "id");
}

defineExpose({ startEntry });

const cellInputClass =
  "w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 px-2 py-1 text-sm dark:text-gray-100";
</script>
