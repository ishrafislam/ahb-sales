<template>
  <div
    class="h-screen flex flex-col bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-100 transition-colors"
  >
    <PrintPreview />
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: "AhbPrintPreviewWindow" });
import { onMounted, watchEffect } from "vue";
import { t, initI18n } from "./i18n";
import PrintPreview from "./views/PrintPreview.vue";

onMounted(() => {
  void initI18n();
});

watchEffect(() => {
  document.title = t("print_preview_title");
});
</script>
