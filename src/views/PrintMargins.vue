<template>
  <div class="flex flex-1 min-h-0 flex-col p-6 gap-4">
    <p class="text-sm text-gray-600 dark:text-gray-300">
      {{ t("margins_hint") }}
    </p>

    <div class="grid grid-cols-2 gap-4">
      <div v-for="side in sides" :key="side.key">
        <label :class="labelClass" :for="`margin-${side.key}`">
          {{ t(side.labelKey) }}
        </label>
        <input
          :id="`margin-${side.key}`"
          v-model="form[side.key]"
          :class="[fieldClass, 'text-right no-spinner']"
          type="number"
          :min="MIN_MARGIN_IN"
          :max="MAX_MARGIN_IN"
          :step="MARGIN_STEP_IN"
          @input="onInput"
        />
      </div>
    </div>

    <p v-if="error" class="text-sm text-red-600 dark:text-red-400">
      {{ error }}
    </p>

    <div class="mt-auto flex justify-end gap-3 pt-2">
      <button
        type="button"
        :class="buttonClass"
        :disabled="!valid || printing"
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
defineOptions({ name: "AhbPrintMargins" });
import { ref, computed, onMounted, onUnmounted } from "vue";
import { t } from "../i18n";
import { normalizeMargins, type PrintMargins } from "../print/document";
import {
  MIN_MARGIN_IN,
  MAX_MARGIN_IN,
  MARGIN_STEP_IN,
} from "../constants/business";

const jobId = window.location.hash.replace(/^#/, "").split("/")[1] || "";

const sides = [
  { key: "top", labelKey: "margin_top" },
  { key: "bottom", labelKey: "margin_bottom" },
  { key: "left", labelKey: "margin_left" },
  { key: "right", labelKey: "margin_right" },
] as const;

type Side = (typeof sides)[number]["key"];

const form = ref<Record<Side, string | number>>({
  top: 0.5,
  bottom: 0.5,
  left: 0.5,
  right: 0.5,
});
const error = ref("");
const printing = ref(false);

function inRange(v: string | number) {
  const n = Number(v);
  return (
    String(v).trim() !== "" &&
    Number.isFinite(n) &&
    n >= MIN_MARGIN_IN &&
    n <= MAX_MARGIN_IN
  );
}

const valid = computed(() => sides.every((s) => inRange(form.value[s.key])));

const margins = computed<PrintMargins>(() => ({
  top: Number(form.value.top),
  bottom: Number(form.value.bottom),
  left: Number(form.value.left),
  right: Number(form.value.right),
}));

// The preview redraws from this, so it lands as the user types
let pending: ReturnType<typeof setTimeout> | null = null;
function onInput() {
  if (!valid.value) return;
  if (pending) clearTimeout(pending);
  pending = setTimeout(() => {
    void window.ahb.setPrintMargins(jobId, margins.value);
  }, 150);
}

async function print() {
  if (!valid.value || printing.value) return;
  error.value = "";
  printing.value = true;
  try {
    const res = await window.ahb.runPrint(jobId, margins.value);
    if (res?.success) {
      close();
      return;
    }
    error.value = t("print_failed", { reason: res?.reason || "" });
  } catch (e) {
    error.value = t("print_failed", {
      reason: e instanceof Error ? e.message : String(e),
    });
  } finally {
    printing.value = false;
  }
}

function close() {
  window.close();
}

onMounted(async () => {
  const job = await window.ahb.getPrintJob(jobId);
  const m = normalizeMargins(job?.margins);
  form.value = { top: m.top, bottom: m.bottom, left: m.left, right: m.right };
});
onUnmounted(() => {
  if (pending) clearTimeout(pending);
});

const labelClass =
  "block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1";

const fieldClass =
  "block w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md py-2 px-3 text-sm dark:text-gray-100 disabled:opacity-70 disabled:cursor-not-allowed";

const buttonClass =
  "min-w-[7rem] bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors rounded-md py-2 px-4 text-sm dark:text-gray-100 disabled:opacity-70 disabled:cursor-not-allowed";
</script>
