<template>
  <div class="space-y-3">
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div>
        <label class="block text-xs text-gray-600 mb-1">Paper size</label>
        <select
          v-model="paperSize"
          class="w-full bg-gray-50 border border-gray-300 rounded-md px-2 py-1 text-sm"
        >
          <option value="A4">A4</option>
          <option value="A5">A5</option>
          <option value="Letter">Letter</option>
        </select>
      </div>
      <div>
        <label class="block text-xs text-gray-600 mb-1">Orientation</label>
        <select
          v-model="orientation"
          class="w-full bg-gray-50 border border-gray-300 rounded-md px-2 py-1 text-sm"
        >
          <option value="portrait">Portrait</option>
          <option value="landscape">Landscape</option>
        </select>
      </div>
      <div>
        <label class="block text-xs text-gray-600 mb-1">Margin (mm)</label>
        <input
          v-model.number="marginMm"
          type="number"
          min="0"
          class="w-full bg-gray-50 border border-gray-300 rounded-md px-2 py-1 text-sm"
        />
      </div>
      <div>
        <label class="block text-xs text-gray-600 mb-1">Printer (name)</label>
        <input
          v-model="printerDevice"
          type="text"
          placeholder="Optional"
          class="w-full bg-gray-50 border border-gray-300 rounded-md px-2 py-1 text-sm"
        />
        <p class="text-xs text-gray-500 mt-1">
          Stored only. Selecting printer programmatically is supported when
          printing from main process.
        </p>
      </div>
    </div>
    <div class="pt-2 flex gap-2 justify-end">
      <button
        class="bg-gray-200 text-gray-900 px-3 py-1.5 rounded-md text-sm font-semibold hover:bg-gray-300"
        @click="resetDefaults"
      >
        Reset
      </button>
      <button
        class="bg-blue-600 text-white px-3 py-1.5 rounded-md text-sm font-semibold hover:bg-blue-700"
        @click="save"
      >
        Save
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";

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
  alert("Saved");
}

onMounted(() => {
  void load();
});
</script>
