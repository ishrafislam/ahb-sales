<template>
  <div class="p-4 text-sm">
    <div class="space-y-2">
      <div class="flex items-center justify-between">
        <span class="text-gray-600">{{ t("name") }}</span>
        <span class="font-medium">{{ appName }}</span>
      </div>
      <div class="flex items-center justify-between">
        <span class="text-gray-600">{{ t("version") }}</span>
        <span class="font-medium">{{ version }}</span>
      </div>
      <!-- <div class="flex items-center justify-between">
        <span class="text-gray-600">{{ t('electron') }}</span>
        <span class="font-medium">{{ runtime.versions.electron }}</span>
      </div>
      <div class="flex items-center justify-between">
        <span class="text-gray-600">{{ t('chrome') }}</span>
        <span class="font-medium">{{ runtime.versions.chrome }}</span>
      </div>
      <div class="flex items-center justify-between">
        <span class="text-gray-600">{{ t('node') }}</span>
        <span class="font-medium">{{ runtime.versions.node }}</span>
      </div> -->
      <!-- eslint-disable-next-line vue/max-attributes-per-line -->
      <div v-if="runtime.buildDate" class="flex items-center justify-between">
        <span class="text-gray-600">{{ t("build_date") }}</span>
        <span class="font-medium">{{ buildDateText }}</span>
      </div>
      <!-- eslint-disable-next-line vue/max-attributes-per-line -->
      <!-- <div v-if="runtime.commitSha" class="flex items-center justify-between">
        <span class="text-gray-600">{{ t("commit_sha") }}</span>
        <span class="font-medium font-mono">{{ runtime.commitSha }}</span>
      </div> -->
    </div>
    <div class="mt-5 flex items-center justify-between">
      <p class="text-gray-500">© {{ todayText }} Abdul Hamid & Brothers</p>
      <button
        class="bg-blue-600 hover:bg-blue-700 text-white rounded px-3 py-1 text-sm"
        @click="onCheckForUpdates"
      >
        {{ t("check_updates") }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { t } from "../i18n";

const appName = ref("");
const version = ref("");
const runtime = ref<{
  versions: { electron: string; chrome: string; node: string };
  buildDate?: string;
  commitSha?: string;
}>({ versions: { electron: "-", chrome: "-", node: "-" } });

onMounted(async () => {
  try {
    if (typeof (window.ahb as any).getAppName === "function") {
      appName.value = await (window.ahb as any).getAppName();
    }
    if (typeof (window.ahb as any).getAppVersion === "function") {
      version.value = await (window.ahb as any).getAppVersion();
    }
    if (typeof (window.ahb as any).getRuntimeInfo === "function") {
      runtime.value = await (window.ahb as any).getRuntimeInfo();
    }
  } catch {
    // ignore
  }
});

async function onCheckForUpdates() {
  try {
    if (typeof (window.ahb as any).checkForUpdates === "function") {
      await (window.ahb as any).checkForUpdates();
    }
  } catch {
    // ignore; App.vue shows toasts for updater events
  }
}

const todayText = computed(() => formatDateOnly(new Date()));
const buildDateText = computed(() => {
  if (!runtime.value.buildDate) return "";
  const d = new Date(runtime.value.buildDate);
  return isNaN(d.getTime())
    ? String(runtime.value.buildDate)
    : formatDateOnly(d);
});

function formatDateOnly(d: Date): string {
  // Use en-GB to get DD/MM/YYYY then replace separators
  const s = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
  return s.replaceAll("/", "-");
}
</script>
