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
              :class="cellInputClass"
              @keydown.enter.prevent="onIdEnter(idx)"
              @keydown="onCellKeydown($event, idx, 'id')"
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
              :class="[cellInputClass, 'text-right']"
              @keydown.enter.prevent="onAmountEnter(idx)"
              @keydown="onCellKeydown($event, idx, 'amount')"
            >
          </td>
          <td class="px-2 py-1">
            {{ row.product?.unit ?? "" }}
          </td>
          <td class="px-2 py-1 text-right">
            {{ row.product ? money(row.product.price) : "" }}
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
  product: { id: number; nameBn: string; unit: string; price: number } | null;
  amountText: string;
};

type Col = "id" | "amount";

const rows = defineModel<EntryRow[]>("rows", { required: true });

let nextKey = 1;
function makeRow(): EntryRow {
  return { key: nextKey++, idText: "", product: null, amountText: "" };
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

function money(n: number) {
  if (!Number.isFinite(n)) return "0.00";
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
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
  };
  row.idText = String(product.id);
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
