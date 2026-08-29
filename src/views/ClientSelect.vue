<template>
  <div class="flex flex-1 min-h-0 flex-col p-6 gap-4">
    <button type="button" :class="buttonClass" @click="openFor(undefined)">
      {{ t("all_clients") }}
    </button>

    <div class="flex flex-col gap-1">
      <label :class="labelClass" for="client-id">{{ t("customer_id") }}</label>
      <input
        id="client-id"
        ref="idInput"
        :value="ld(idText)"
        @input="idText = toLatinDigits(($event.target as HTMLInputElement).value)"
        :class="[fieldClass, 'text-right']"
        type="text"
        inputmode="numeric"
        @keydown.enter="selected"
      />
      <p
        v-if="status"
        class="text-sm"
        :class="
          customer
            ? 'text-gray-600 dark:text-gray-300'
            : 'text-red-600 dark:text-red-400'
        "
        data-role="lookup"
      >
        {{ status }}
      </p>
    </div>

    <button
      type="button"
      :class="buttonClass"
      :disabled="!customer"
      @click="selected"
    >
      {{ t("selected_client") }}
    </button>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: "AhbClientSelect" });
import { ref, computed, watch, onMounted } from "vue";
import { t } from "../i18n";
import {
  localizeDigits as ld,
  parseNumber,
  toLatinDigits,
} from "../utils/numerals";
import { MIN_CUSTOMER_ID, MAX_CUSTOMER_ID } from "../constants/business";
import type { Customer } from "../main/data";

const idText = ref("");
const customer = ref<Customer | null>(null);
const idInput = ref<HTMLInputElement | null>(null);
const running = ref(false);

const customerId = computed(() => {
  const n = parseNumber(idText.value.trim());
  if (!Number.isInteger(n)) return null;
  if (n < MIN_CUSTOMER_ID || n > MAX_CUSTOMER_ID) return null;
  return n;
});

const status = computed(() => {
  if (!idText.value.trim()) return "";
  if (customer.value) return customer.value.nameBn;
  return t("customer_not_found");
});

// Look the id up as it is typed, so Selected Client only ever opens a report
// for a client who exists
let lookup = 0;
watch(customerId, async (id) => {
  const seq = ++lookup;
  if (id === null) {
    customer.value = null;
    return;
  }
  const found = await window.ahb.getCustomerById(id);
  // A slower earlier lookup must not overwrite a later answer
  if (seq === lookup) customer.value = found;
});

async function openFor(id: number | undefined) {
  if (running.value) return;
  running.value = true;
  try {
    await window.ahb.openClientReportWindow(id);
    window.close();
  } finally {
    running.value = false;
  }
}

function selected() {
  if (!customer.value) return;
  void openFor(customer.value.id);
}

onMounted(() => {
  idInput.value?.focus();
});

const labelClass = "text-sm font-medium text-gray-600 dark:text-gray-300";

const fieldClass =
  "bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md py-2 px-3 text-sm dark:text-gray-100";

const buttonClass =
  "bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors rounded-md py-3 px-4 text-sm dark:text-gray-100 disabled:opacity-70 disabled:cursor-not-allowed";
</script>
