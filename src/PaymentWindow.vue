<template>
  <div
    class="h-screen flex flex-col gap-4 p-4 bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-100 transition-colors"
  >
    <div class="flex items-center gap-3">
      <label class="text-sm whitespace-nowrap w-20">{{
        t("payment_amount")
      }}:</label>
      <input
        ref="amountInput"
        v-model="amountText"
        type="text"
        class="flex-1 px-2 py-1 border rounded bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-right"
        @keydown.enter.prevent="onOkay"
      />
    </div>
    <div class="flex items-start gap-3 flex-1">
      <label class="text-sm whitespace-nowrap w-20 pt-1">{{
        t("comment")
      }}:</label>
      <textarea
        v-model="notes"
        class="flex-1 h-full px-2 py-1 border rounded bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 resize-none"
      ></textarea>
    </div>
    <p v-if="error" class="text-sm text-red-600 dark:text-red-400">
      {{ error }}
    </p>
    <div class="grid grid-cols-2 gap-3">
      <button
        class="px-3 py-2 border rounded border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700"
        :disabled="saving"
        @click="onOkay"
      >
        {{ t("okay") }}
      </button>
      <button
        class="px-3 py-2 border rounded border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700"
        @click="onCancel"
      >
        {{ t("cancel") }}
      </button>
    </div>
    <button
      class="px-3 py-2 border rounded border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700"
    >
      {{ t("v2_edit_previous_payment") }}
    </button>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: "AhbPaymentWindow" });
import { onMounted, ref, watchEffect } from "vue";
import { t, initI18n } from "./i18n";

const amountInput = ref<HTMLInputElement | null>(null);
const amountText = ref("");
const notes = ref("");
const error = ref("");
let saving = false;

function invoiceIdFromHash(): string {
  const hash = window.location.hash.replace(/^#/, "");
  const [, id] = hash.split("/");
  return id ?? "";
}

onMounted(() => {
  void initI18n();
  amountInput.value?.focus();
});

watchEffect(() => {
  document.title = t("make_payment_title");
});

async function onOkay() {
  if (saving) return;
  const amount = Number.parseFloat(amountText.value);
  if (!Number.isFinite(amount) || amount <= 0) {
    error.value = t("payment_amount_invalid");
    return;
  }
  saving = true;
  error.value = "";
  try {
    await window.ahb.addInvoicePayment(invoiceIdFromHash(), {
      amount,
      notes: notes.value.trim() || undefined,
    });
    window.close();
  } catch (err) {
    error.value = err instanceof Error ? err.message : String(err);
  } finally {
    saving = false;
  }
}

function onCancel() {
  window.close();
}
</script>
