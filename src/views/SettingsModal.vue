<template>
  <div class="space-y-3">
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
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { t } from "../i18n";
import { setTheme } from "../theme";

const themeSource = ref<"system" | "light" | "dark">("system");

async function load() {
  try {
    const theme = await window.ahb.getTheme();
    themeSource.value = theme.source as "system" | "light" | "dark";
  } catch {
    // ignore
  }
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
</script>
