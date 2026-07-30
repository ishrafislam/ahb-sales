<template>
  <div
    class="h-screen flex flex-col bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-100 transition-colors"
  >
    <TotalSellRange />
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: "AhbTotalSellRangeWindow" });
import { onMounted, watchEffect } from "vue";
import { t, initI18n } from "./i18n";
import TotalSellRange from "./views/TotalSellRange.vue";

onMounted(() => {
  void initI18n();
});

watchEffect(() => {
  document.title = t("total_sell_title");
});
</script>
