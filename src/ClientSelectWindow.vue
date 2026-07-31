<template>
  <div
    class="h-screen flex flex-col bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-100 transition-colors"
  >
    <ClientSelect />
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: "AhbClientSelectWindow" });
import { onMounted, watchEffect } from "vue";
import { t, initI18n } from "./i18n";
import ClientSelect from "./views/ClientSelect.vue";

onMounted(() => {
  void initI18n();
});

watchEffect(() => {
  document.title = t("v2_client_report");
});
</script>
