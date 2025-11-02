<template>
  <div class="space-y-3">
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div>
        <label class="block text-xs text-gray-600 mb-1">
          {{ t("paper_size") }}
        </label>
        <select
          v-model="paperSize"
          class="w-full bg-gray-50 border border-gray-300 rounded-md px-2 py-1 text-sm"
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
        <label class="block text-xs text-gray-600 mb-1">
          {{ t("orientation") }}
        </label>
        <select
          v-model="orientation"
          class="w-full bg-gray-50 border border-gray-300 rounded-md px-2 py-1 text-sm"
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
        <label class="block text-xs text-gray-600 mb-1">
          {{ t("margin_mm") }}
        </label>
        <input
          v-model.number="marginMm"
          type="number"
          min="0"
          class="w-full bg-gray-50 border border-gray-300 rounded-md px-2 py-1 text-sm"
        />
      </div>
      <div>
        <label class="block text-xs text-gray-600 mb-1">
          {{ t("printer_name") }}
        </label>
        <input
          v-model="printerDevice"
          type="text"
          :placeholder="t('optional')"
          class="w-full bg-gray-50 border border-gray-300 rounded-md px-2 py-1 text-sm"
        />
        <p class="text-xs text-gray-500 mt-1">
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

const paperSize = ref<"A4" | "A5" | "Letter">("A4");
const orientation = ref<"portrait" | "landscape">("portrait");
const marginMm = ref<number>(12);
const printerDevice = ref<string>("");

async function load() {
  const s = await window.ahb.getPrintSettings();
  paperSize.value = s.paperSize;
  orientation.value = s.orientation;
  marginMm.value = s.marginMm;
  printerDevice.value = s.printerDevice ?? "";
}
function resetDefaults() {
  paperSize.value = "A4";
  orientation.value = "portrait";
  marginMm.value = 12;
  printerDevice.value = "";
}
async function save() {
  await window.ahb.setPrintSettings({
    paperSize: paperSize.value,
    orientation: orientation.value,
    marginMm: marginMm.value,
    printerDevice: printerDevice.value || undefined,
  });
  showSuccess.value = true;
  setTimeout(() => (showSuccess.value = false), 2000);
}

onMounted(() => {
  void load();
});

const showSuccess = ref(false);
</script>
