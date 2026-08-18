<template>
  <div
    class="h-screen flex flex-col bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-100 transition-colors"
  >
    <PurchaseEntry />
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: "AhbPurchaseEntryWindow" });
import { onMounted, watchEffect } from "vue";
import { t, initI18n } from "./i18n";
import PurchaseEntry from "./views/PurchaseEntry.vue";

onMounted(() => {
  void initI18n();
});

watchEffect(() => {
  document.title = t("purchase_entry_title");
});
</script>
