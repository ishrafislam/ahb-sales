<template>
  <div class="flex flex-col h-screen p-3 lg:p-4 gap-3 lg:gap-4 dark:text-gray-100">
    <!-- Header band: title + product lookup panel -->
    <div class="flex items-center justify-between gap-4">
      <h1 class="text-2xl lg:text-3xl font-bold tracking-wide">
        {{ BUSINESS_NAME }}
      </h1>
      <div
        class="bg-white dark:bg-gray-900 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-3 flex flex-col gap-2 min-w-[20rem]"
      >
        <div class="flex items-center gap-2">
          <label class="text-sm whitespace-nowrap w-28">{{ t("v2_product_id") }}:</label>
          <input type="text" :class="inputClass" />
        </div>
        <div class="flex items-center gap-2">
          <label class="text-sm whitespace-nowrap w-28">{{ t("v2_stock_qty") }}:</label>
          <input type="text" :class="inputClass" />
        </div>
      </div>
    </div>

    <!-- Info band: date/customer-id, last bill, search -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-3 lg:gap-4">
      <div
        class="lg:col-span-3 bg-white dark:bg-gray-900 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-3 flex flex-col gap-2"
      >
        <div class="flex items-center gap-2">
          <label class="text-sm whitespace-nowrap flex-1">{{ t("v2_date") }}:</label>
          <input type="text" :value="todayText" :class="[inputClass, 'max-w-[9rem] text-right']" />
        </div>
        <div class="flex items-center gap-2">
          <label class="text-sm whitespace-nowrap flex-1">{{ t("v2_customer_id") }}:</label>
          <input type="text" value="000" :class="[inputClass, 'max-w-[9rem] text-right']" />
        </div>
      </div>

      <div
        class="lg:col-span-4 bg-white dark:bg-gray-900 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-3 flex flex-col gap-2"
      >
        <div class="flex items-center gap-2">
          <label class="text-sm whitespace-nowrap w-36">{{ t("v2_last_bill_date") }}:</label>
          <input type="text" :class="inputClass" />
        </div>
        <div class="flex items-center gap-2">
          <label class="text-sm whitespace-nowrap w-36">{{ t("v2_last_bill") }}:</label>
          <input type="text" :class="inputClass" />
        </div>
      </div>

      <div
        class="lg:col-span-5 bg-white dark:bg-gray-900 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-3 flex flex-col gap-2"
      >
        <div class="flex items-center gap-2">
          <label class="text-sm whitespace-nowrap w-28">{{ t("v2_customer_name") }}:</label>
          <input type="text" :class="inputClass" />
          <button type="button" :class="[buttonClass, 'px-6 h-9 text-sm']">
            {{ t("v2_search") }}
          </button>
        </div>
        <div class="flex items-center gap-2">
          <label class="text-sm whitespace-nowrap w-28">{{ t("v2_product_name") }}:</label>
          <input type="text" :class="inputClass" />
          <button type="button" :class="[buttonClass, 'px-6 h-9 text-sm']">
            {{ t("v2_search") }}
          </button>
        </div>
      </div>
    </div>

    <!-- Main band -->
    <div class="flex-grow grid grid-cols-1 lg:grid-cols-12 gap-3 lg:gap-4 min-h-0">
      <!-- Left column -->
      <div class="lg:col-span-3 flex flex-col gap-3 lg:gap-4 min-h-0 overflow-y-auto">
        <div
          class="bg-white dark:bg-gray-900 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-3 flex flex-col gap-2"
        >
          <div class="flex items-center gap-2">
            <label class="text-sm whitespace-nowrap w-16">{{ t("v2_customer") }}:</label>
            <input type="text" :class="inputClass" />
          </div>
          <div class="flex items-center gap-2">
            <label class="text-sm whitespace-nowrap w-16">{{ t("v2_address") }}:</label>
            <input type="text" :class="inputClass" />
          </div>
          <div class="flex items-center gap-2">
            <label class="text-sm whitespace-nowrap w-16">{{ t("v2_receivable") }}:</label>
            <input type="text" :class="inputClass" />
          </div>
        </div>

        <div
          class="bg-white dark:bg-gray-900 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-3 grid grid-cols-3 gap-2"
        >
          <button v-for="n in 3" :key="n" type="button" :class="[buttonClass, 'h-14']" />
        </div>

        <div
          class="bg-white dark:bg-gray-900 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-3 grid grid-cols-2 gap-2"
        >
          <button v-for="n in 6" :key="n" type="button" :class="[buttonClass, 'h-10']" />
        </div>

        <div
          class="bg-white dark:bg-gray-900 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-3 grid grid-cols-2 gap-2"
        >
          <button v-for="n in 6" :key="n" type="button" :class="[buttonClass, 'h-10']" />
          <button type="button" :class="[buttonClass, 'h-10 col-span-2']" />
        </div>
      </div>

      <!-- Center column: product list + totals -->
      <div class="lg:col-span-6 flex flex-col gap-3 min-h-0">
        <div class="flex flex-col flex-grow min-h-0">
          <span class="text-sm mb-1">{{ t("v2_product_list") }}:</span>
          <div
            class="flex-grow bg-white dark:bg-gray-900 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 min-h-0 overflow-y-auto"
          />
        </div>

        <div class="flex flex-col gap-2">
          <div class="flex items-center gap-2">
            <label class="text-sm whitespace-nowrap flex-1">{{ t("v2_grand_total") }}:</label>
            <input type="text" :class="[inputClass, 'max-w-[55%]']" />
          </div>
          <div class="flex items-center gap-2">
            <label class="text-sm whitespace-nowrap flex-1">{{ t("v2_discount") }}:</label>
            <input type="text" :class="[inputClass, 'max-w-[55%]']" />
          </div>
          <div class="flex items-center gap-2">
            <label class="text-sm whitespace-nowrap flex-1">{{ t("v2_bill") }}:</label>
            <input type="text" :class="[inputClass, 'max-w-[55%]']" />
          </div>
          <div class="flex items-center gap-2">
            <label class="text-sm whitespace-nowrap flex-1">{{ t("v2_deposit") }}:</label>
            <input type="text" :class="[inputClass, 'max-w-[55%]']" />
          </div>
        </div>
      </div>

      <!-- Right column: customer status + action buttons -->
      <div class="lg:col-span-3 flex flex-col gap-3 min-h-0">
        <div class="flex flex-col flex-grow min-h-0">
          <span class="text-sm mb-1 text-right">{{ t("v2_customer_status") }}:</span>
          <div
            class="flex-grow bg-white dark:bg-gray-900 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 min-h-0 overflow-y-auto"
          />
        </div>
        <div class="grid grid-cols-2 gap-2">
          <button type="button" :class="[buttonClass, 'h-10']" />
          <button type="button" :class="[buttonClass, 'h-10']" />
        </div>
        <button type="button" :class="[buttonClass, 'h-10 w-full']" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { t } from "../i18n";
import { BUSINESS_NAME } from "../constants/business";

defineEmits<{ (e: "navigate", view: string): void }>();

const inputClass =
  "flex-1 min-w-0 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1.5 text-sm dark:text-gray-100";

const buttonClass =
  "bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors";

const todayText = computed(() => {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = String(d.getFullYear() % 100).padStart(2, "0");
  return `${dd}/${mm}/${yy}`;
});
</script>
