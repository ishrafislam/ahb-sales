<template>
  <div
    class="h-screen flex flex-col gap-4 p-4 bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-100 transition-colors"
  >
    <div class="flex items-center gap-3">
      <label class="text-sm whitespace-nowrap w-32 shrink-0">{{ t("v2_date") }}:</label>
      <input
        :value="dateText"
        type="text"
        disabled
        class="flex-1 px-2 py-1 border rounded bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-right disabled:opacity-70 disabled:cursor-not-allowed"
      />
    </div>
    <div class="flex items-center gap-3">
      <label class="text-sm whitespace-nowrap w-32 shrink-0">{{
        t("v2_customer")
      }}:</label>
      <input
        :value="customerText"
        type="text"
        disabled
        class="flex-1 px-2 py-1 border rounded bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-right disabled:opacity-70 disabled:cursor-not-allowed"
      />
    </div>
    <div class="flex items-center gap-3">
      <label class="text-sm whitespace-nowrap w-32 shrink-0">{{
        t("v2_deposit")
      }}:</label>
      <input
        ref="amountInput"
        v-model="amountText"
        type="text"
        :disabled="!hasPayment"
        class="flex-1 px-2 py-1 border rounded bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-right disabled:opacity-70 disabled:cursor-not-allowed"
        @keydown.enter.prevent="onOkay"
      />
    </div>
    <div class="flex items-start gap-3 flex-1">
      <label class="text-sm whitespace-nowrap w-32 shrink-0 pt-1">{{
        t("comment")
      }}:</label>
      <textarea
        v-model="notes"
        :disabled="!hasPayment"
        class="flex-1 h-full px-2 py-1 border rounded bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 resize-none disabled:opacity-70 disabled:cursor-not-allowed"
      ></textarea>
    </div>
    <p v-if="error" class="text-sm text-red-600 dark:text-red-400">
      {{ error }}
    </p>
    <div class="grid grid-cols-2 gap-3">
      <button
        class="px-3 py-2 border rounded border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-70 disabled:cursor-not-allowed"
        :disabled="!hasPayment || saving"
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
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: "AhbEditPaymentWindow" });
import { onMounted, ref, watchEffect } from "vue";
import { t, initI18n } from "./i18n";

const amountInput = ref<HTMLInputElement | null>(null);
const dateText = ref("");
const customerText = ref("");
const amountText = ref("");
const notes = ref("");
const hasPayment = ref(false);
const error = ref("");
let saving = false;

function invoiceIdFromHash(): string {
  const hash = window.location.hash.replace(/^#/, "");
  const [, id] = hash.split("/");
  return id ?? "";
}

onMounted(async () => {
  void initI18n();
  try {
    const inv = await window.ahb.getInvoiceById(invoiceIdFromHash());
    const payment = inv?.payments?.[0];
    if (inv && payment) {
      const d = new Date(payment.date);
      const dd = String(d.getDate()).padStart(2, "0");
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      dateText.value = `${dd}/${mm}/${d.getFullYear()}`;
      customerText.value = inv.customerId !== null ? String(inv.customerId) : "";
      amountText.value = payment.amount.toFixed(2);
      notes.value = payment.notes ?? "";
      hasPayment.value = true;
      amountInput.value?.focus();
      amountInput.value?.select();
    } else {
      error.value = t("no_payment_to_edit");
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : String(err);
  }
});

watchEffect(() => {
  document.title = t("v2_edit_previous_payment");
});

async function onOkay() {
  if (!hasPayment.value || saving) return;
  const amount = Number.parseFloat(amountText.value);
  if (!Number.isFinite(amount) || amount <= 0) {
    error.value = t("payment_amount_invalid");
    return;
  }
  saving = true;
  error.value = "";
  try {
    await window.ahb.updateInvoicePayment(invoiceIdFromHash(), {
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
