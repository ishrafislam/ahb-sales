<template>
  <div class="flex flex-1 min-h-0 flex-col p-6 gap-4">
    <div class="flex items-center gap-3">
      <label :class="labelClass" for="range-start">{{ t("start_date") }}</label>
      <input
        id="range-start"
        :value="ld(startText)"
        @input="startText = toLatinDigits(($event.target as HTMLInputElement).value)"
        :class="[fieldClass, 'text-right']"
        type="text"
        inputmode="numeric"
        placeholder="DD/MM/YYYY"
        @focus="focusedField = 'start'"
        @blur="focusedField = null"
      />
    </div>

    <div class="flex items-center gap-3">
      <label :class="labelClass" for="range-end">{{ t("end_date") }}</label>
      <input
        id="range-end"
        :value="ld(endText)"
        @input="endText = toLatinDigits(($event.target as HTMLInputElement).value)"
        :class="[fieldClass, 'text-right']"
        type="text"
        inputmode="numeric"
        placeholder="DD/MM/YYYY"
        @focus="focusedField = 'end'"
        @blur="focusedField = null"
      />
    </div>

    <!-- mousedown.prevent throughout: a plain click blurs the focused input
         before the handler runs, which would lose the "only the focused
         field steps" rule and the caret with it. -->
    <div class="grid grid-cols-2 gap-3">
      <button
        type="button"
        :class="buttonClass"
        @mousedown.prevent
        @click="setBoth(shiftDate(new Date(), 'day', -1))"
      >
        {{ t("yesterday") }}
      </button>
      <button
        type="button"
        :class="buttonClass"
        @mousedown.prevent
        @click="setBoth(new Date())"
      >
        {{ t("today") }}
      </button>
    </div>

    <div class="flex items-center justify-between gap-2">
      <div class="flex gap-1">
        <button
          v-for="s in backSteps"
          :key="s.label"
          type="button"
          :class="stepClass"
          @mousedown.prevent
          @click="step(s.unit, -1)"
        >
          {{ s.label }}
        </button>
      </div>
      <div class="flex gap-1">
        <button
          v-for="s in forwardSteps"
          :key="s.label"
          type="button"
          :class="stepClass"
          @mousedown.prevent
          @click="step(s.unit, 1)"
        >
          {{ s.label }}
        </button>
      </div>
    </div>

    <p v-if="error" class="text-sm text-red-600 dark:text-red-400">
      {{ error }}
    </p>

    <div class="mt-auto grid grid-cols-2 gap-3 pt-2">
      <button
        type="button"
        :class="buttonClass"
        :disabled="!!error || running"
        @click="okay"
      >
        {{ t("okay") }}
      </button>
      <button type="button" :class="buttonClass" @click="cancel">
        {{ t("cancel") }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: "AhbReportRange" });
import { ref, computed } from "vue";
import { t } from "../i18n";
import {
  localizeDigits as ld,
  toLatinDigits,
} from "../utils/numerals";
import {
  formatDdMmYyyy,
  parseDdMmYyyy,
  shiftDate,
  type ShiftUnit,
} from "../utils/dateRange";
import { toYmd } from "../utils/date";
import { buildTotalSellDocument } from "../print/totalSell";
import { buildDailyReportDocument } from "../print/dailyReport";
import { buildClientReportDocument } from "../print/clientReport";
import { buildPaymentReportDocument } from "../print/paymentReport";

// The window is the same for every ranged report; only what Okay builds
// differs. The client report also carries which client was picked, or none
// for all of them.
const props = defineProps<{
  report: "total-sell" | "daily-report" | "client-report" | "payment-report";
  customerId?: number;
}>();

const startText = ref(formatDdMmYyyy(new Date()));
const endText = ref(formatDdMmYyyy(new Date()));
const focusedField = ref<"start" | "end" | null>(null);
const running = ref(false);

const backSteps: { label: string; unit: ShiftUnit }[] = [
  { label: "<Y", unit: "year" },
  { label: "<M", unit: "month" },
  { label: "<W", unit: "week" },
  { label: "<D", unit: "day" },
];
const forwardSteps: { label: string; unit: ShiftUnit }[] = [
  { label: "D>", unit: "day" },
  { label: "W>", unit: "week" },
  { label: "M>", unit: "month" },
  { label: "Y>", unit: "year" },
];

const startDate = computed(() => parseDdMmYyyy(startText.value));
const endDate = computed(() => parseDdMmYyyy(endText.value));

const error = computed(() => {
  if (!startDate.value || !endDate.value) return t("invalid_date");
  if (startDate.value > endDate.value) return t("end_before_start");
  return "";
});

function setBoth(d: Date) {
  const text = formatDdMmYyyy(d);
  startText.value = text;
  endText.value = text;
}

// Both dates move together unless one field has the caret, in which case
// only that one does
function step(unit: ShiftUnit, delta: number) {
  const apply = (text: string) => {
    const d = parseDdMmYyyy(text);
    return d ? formatDdMmYyyy(shiftDate(d, unit, delta)) : text;
  };
  if (focusedField.value !== "end") startText.value = apply(startText.value);
  if (focusedField.value !== "start") endText.value = apply(endText.value);
}

async function buildDoc(from: string, to: string) {
  if (props.report === "total-sell") {
    return buildTotalSellDocument(await window.ahb.reportTotalSell(from, to));
  }
  if (props.report === "daily-report") {
    return buildDailyReportDocument(
      await window.ahb.reportMoneyTransactionsDayWise(from, to)
    );
  }
  if (props.report === "payment-report") {
    return buildPaymentReportDocument(
      await window.ahb.reportMoneyTransactionsDayWise(from, to)
    );
  }
  return buildClientReportDocument(
    await window.ahb.reportClientLedger(from, to, props.customerId),
    { from, to }
  );
}

async function okay() {
  if (error.value || running.value) return;
  running.value = true;
  try {
    const from = toYmd(startDate.value!);
    const to = toYmd(endDate.value!);
    await window.ahb.openPrintPreview(await buildDoc(from, to));
    window.close();
  } finally {
    running.value = false;
  }
}

function cancel() {
  window.close();
}

const labelClass =
  "w-24 shrink-0 text-sm font-medium text-gray-600 dark:text-gray-300";

const fieldClass =
  "flex-1 min-w-0 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md py-2 px-3 text-sm dark:text-gray-100";

const buttonClass =
  "bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors rounded-md py-2 px-4 text-sm dark:text-gray-100 disabled:opacity-70 disabled:cursor-not-allowed";

const stepClass =
  "w-11 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors rounded-md py-2 text-sm dark:text-gray-100";
</script>
