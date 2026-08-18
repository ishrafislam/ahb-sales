<template>
  <div
    class="h-screen flex flex-col bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-100 transition-colors"
  >
    <PrintMargins />
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: "AhbPrintMarginsWindow" });
import { onMounted, watchEffect } from "vue";
import { t, initI18n } from "./i18n";
import PrintMargins from "./views/PrintMargins.vue";

onMounted(() => {
  void initI18n();
});

watchEffect(() => {
  document.title = t("page_margins_title");
});
</script>
