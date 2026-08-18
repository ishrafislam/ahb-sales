<template>
  <div
    class="h-screen flex flex-col bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-100 transition-colors"
  >
    <SalesHistory />
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: "AhbSalesHistoryWindow" });
import { onMounted, watchEffect } from "vue";
import { t, initI18n } from "./i18n";
import SalesHistory from "./views/SalesHistory.vue";

onMounted(() => {
  void initI18n();
});

watchEffect(() => {
  document.title = t("product_sales_history_title");
});
</script>
