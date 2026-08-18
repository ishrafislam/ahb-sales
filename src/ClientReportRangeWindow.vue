<template>
  <div
    class="h-screen flex flex-col bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-100 transition-colors"
  >
    <ReportRange report="client-report" :customer-id="customerId" />
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: "AhbClientReportRangeWindow" });
import { onMounted, watchEffect } from "vue";
import { t, initI18n } from "./i18n";
import ReportRange from "./views/ReportRange.vue";

// "#client-report/225" narrows to one client; a bare "#client-report" is
// every client
const idPart = window.location.hash.replace(/^#/, "").split("/")[1];
const parsed = Number(idPart);
const customerId = Number.isInteger(parsed) ? parsed : undefined;

onMounted(() => {
  void initI18n();
});

watchEffect(() => {
  document.title = t("v2_client_report");
});
</script>
