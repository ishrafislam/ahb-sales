<template>
  <div class="space-y-3">
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div>
        <label class="block text-xs text-gray-600 dark:text-gray-300 mb-1">
          {{ t("theme") }}
        </label>
        <select
          v-model="themeSource"
          class="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1 text-sm dark:text-gray-100"
          @change="onThemeSourceChange"
        >
          <option value="system">
            {{ t("theme_system") }}
          </option>
          <option value="light">
            {{ t("theme_light") }}
          </option>
          <option value="dark">
            {{ t("theme_dark") }}
          </option>
        </select>
      </div>
      <div>
        <label class="block text-xs text-gray-600 dark:text-gray-300 mb-1">
          {{ t("paper_size") }}
        </label>
        <select
          v-model="paperSize"
          class="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1 text-sm dark:text-gray-100"
        >
          <option value="A4">
            {{ t("a4") }}
          </option>
          <option value="A5">
            {{ t("a5") }}
          </option>
          <option value="Letter">
            {{ t("letter") }}
          </option>
        </select>
      </div>
      <div>
        <label class="block text-xs text-gray-600 dark:text-gray-300 mb-1">
          {{ t("orientation") }}
        </label>
        <select
          v-model="orientation"
          class="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1 text-sm dark:text-gray-100"
        >
          <option value="portrait">
            {{ t("portrait") }}
          </option>
          <option value="landscape">
            {{ t("landscape") }}
          </option>
        </select>
      </div>
      <div>
        <label class="block text-xs text-gray-600 dark:text-gray-300 mb-1">
          {{ t("margin_mm") }}
        </label>
        <input
          v-model.number="marginMm"
          type="number"
          min="0"
          class="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1 text-sm dark:text-gray-100"
        />
      </div>
      <div>
        <label class="block text-xs text-gray-600 dark:text-gray-300 mb-1">
          {{ t("printer_name") }}
        </label>
        <input
          v-model="printerDevice"
          type="text"
          :placeholder="t('optional')"
          class="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1 text-sm dark:text-gray-100"
        />
        <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {{ t("printer_note") }}
        </p>
      </div>
    </div>
    <div class="pt-2 flex gap-2 justify-end">
      <button class="btn" @click="resetDefaults">
        {{ t("reset") }}
      </button>
      <button class="btn btn-primary" @click="save">
        {{ t("save") }}
      </button>
    </div>

    <!-- Toasts -->
    <div
      v-if="showSuccess"
      class="fixed bottom-4 right-4 bg-green-600 text-white px-3 py-2 rounded shadow"
    >
      {{ t("saved") }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { t } from "../i18n";
import { setTheme } from "../theme";
import { TOAST_DURATION_UPDATE_SHORT } from "../constants/business";

const paperSize = ref<"A4" | "A5" | "Letter">("A4");
const orientation = ref<"portrait" | "landscape">("portrait");
const marginMm = ref<number>(12);
const printerDevice = ref<string>("");
const themeSource = ref<"system" | "light" | "dark">("system");

async function load() {
  const s = await window.ahb.getPrintSettings();
  paperSize.value = s.paperSize;
  orientation.value = s.orientation;
  marginMm.value = s.marginMm;
  printerDevice.value = s.printerDevice ?? "";
  try {
    const theme = await window.ahb.getTheme();
    themeSource.value = theme.source as "system" | "light" | "dark";
  } catch {
    // ignore
  }
}
function resetDefaults() {
  paperSize.value = "A4";
  orientation.value = "portrait";
  marginMm.value = 12;
  printerDevice.value = "";
  themeSource.value = "system";
  void onThemeSourceChange();
}
async function save() {
  await window.ahb.setPrintSettings({
    paperSize: paperSize.value,
    orientation: orientation.value,
    marginMm: marginMm.value,
    printerDevice: printerDevice.value || undefined,
  });
  showSuccess.value = true;
  setTimeout(() => (showSuccess.value = false), TOAST_DURATION_UPDATE_SHORT);
}

async function onThemeSourceChange() {
  try {
    await setTheme(themeSource.value);
  } catch {
    // ignore
  }
}

onMounted(() => {
  void load();
});

const showSuccess = ref(false);
</script>
