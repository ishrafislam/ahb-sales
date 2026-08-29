<template>
  <div
    class="h-screen flex flex-col bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-100 transition-colors"
  >
    <RecordDetails />
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: "AhbRecordDetailsWindow" });
import { onMounted, watchEffect } from "vue";
import { t, initI18n } from "./i18n";
import RecordDetails from "./views/RecordDetails.vue";

const isProduct = window.location.hash.split("/")[1] === "product";

onMounted(() => {
  void initI18n();
});

watchEffect(() => {
  document.title = t(isProduct ? "product_details" : "customer_details");
});
</script>
