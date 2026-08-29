<template>
  <div class="flex flex-1 min-h-0 flex-col p-6 gap-4">
    <div class="flex items-end justify-between gap-4">
      <div class="flex flex-col gap-1">
        <label :class="labelClass" for="sheet-date">{{ t("date") }}</label>
        <input
          id="sheet-date"
          :value="ld(dateText)"
          :class="[fieldClass, 'w-40']"
          type="text"
          readonly
        >
      </div>
      <div class="flex flex-col gap-1">
        <label :class="labelClass" for="sheet-godown">{{ t("v2_godown") }}</label>
        <input
          id="sheet-godown"
          :value="ld(godown)"
          :class="[fieldClass, 'w-28 text-right']"
          type="text"
          inputmode="numeric"
          @input="godown = toLatinDigits(($event.target as HTMLInputElement).value)"
        >
      </div>
    </div>

    <HistoryTable
      :columns="[t('id'), t('name'), t('qty'), t('unit')]"
      :rows="sheetCells"
      :empty-text="t('no_records')"
    />

    <div class="mt-auto flex justify-end gap-3 pt-2">
      <button
        type="button"
        :class="buttonClass"
        :disabled="rows.length === 0"
        @click="print"
      >
        {{ t("print") }}
      </button>
      <button type="button" :class="buttonClass" @click="close">
        {{ t("close") }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: "AhbSelectPrint" });
import { computed, onMounted, onUnmounted, ref } from "vue";
import { t } from "../i18n";
import HistoryTable from "../components/HistoryTable.vue";
import {
  tsvToRows,
  type SheetRow,
} from "../components/dashboard/selectionClipboard";
import { buildSelectPrintDocument } from "../print/selectPrint";
import {
  fmtDate,
  localizeDigits as ld,
  toLatinDigits,
} from "../utils/numerals";

// The sheet is always for the day it is printed on
const today = new Date().toISOString();
const dateText = fmtDate(today);

const godown = ref("0");
const rows = ref<SheetRow[]>([]);

const sheetCells = computed(() =>
  rows.value.map((r) => [ld(r.id), r.name, ld(r.quantity), r.unit])
);

/**
 * Rows arrive by paste, from the dashboard's grid or from anything else that
 * writes the same four tab-separated columns. Each paste adds to the list, so
 * a sheet can be built from several invoices.
 */
function onPaste(e: ClipboardEvent) {
  const text = e.clipboardData?.getData("text/plain");
  if (text === undefined) return;
  e.preventDefault();
  append(text);
}

// Some Electron paths deliver Ctrl+V without a clipboard payload; the main
// process can always read it.
async function onKeydown(e: KeyboardEvent) {
  if (e.key !== "v" || !(e.ctrlKey || e.metaKey)) return;
  if (e.defaultPrevented) return;
  try {
    append(await window.ahb.readClipboardText());
  } catch {
    // Nothing to paste is not an error worth showing
  }
}

function append(text: string) {
  const pasted = tsvToRows(text);
  if (pasted.length) rows.value = [...rows.value, ...pasted];
}

function print() {
  if (rows.value.length === 0) return;
  void window.ahb.openPrintPreview(
    buildSelectPrintDocument({
      date: today,
      godown: godown.value,
      rows: rows.value,
    })
  );
}

function close() {
  window.close();
}

onMounted(() => {
  document.addEventListener("paste", onPaste);
  document.addEventListener("keydown", onKeydown);
});
onUnmounted(() => {
  document.removeEventListener("paste", onPaste);
  document.removeEventListener("keydown", onKeydown);
});

const labelClass =
  "block text-sm font-medium text-gray-600 dark:text-gray-300";

const fieldClass =
  "block bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md py-2 px-3 text-sm dark:text-gray-100 disabled:opacity-70 disabled:cursor-not-allowed read-only:opacity-70 read-only:cursor-default";

const buttonClass =
  "min-w-[7rem] bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors rounded-md py-2 px-4 text-sm dark:text-gray-100 disabled:opacity-70 disabled:cursor-not-allowed";
</script>
