<template>
  <div class="p-4 space-y-3">
    <div class="flex flex-wrap gap-2">
      <button
        class="px-3 py-1.5 bg-teal-600 text-white rounded hover:bg-teal-700"
        @click="openFile"
      >
        Open Existing file
      </button>
      <button
        class="px-3 py-1.5 bg-teal-600 text-white rounded hover:bg-teal-700"
        @click="newFile"
      >
        New file
      </button>
      <select
        v-if="loaded"
        v-model="lang"
        class="px-2 py-1 border rounded"
        @change="onLangChange"
      >
        <option value="bn">
          বাংলা
        </option>
        <option value="en">
          English
        </option>
      </select>
    </div>
    <h2 class="text-2xl font-semibold">
      {{ appTitle }}
    </h2>
    <p id="status">
      {{ status }}
    </p>

    <div
      v-if="loaded"
      class="border-b mt-2"
    >
      <nav class="flex gap-2">
        <button
          :class="[
            'px-3 py-1.5 rounded-t',
            currentTab === 'products' ? 'bg-teal-600 text-white' : 'bg-gray-200'
          ]"
          @click="currentTab = 'products'"
        >
          Products
        </button>
        <button
          :class="[
            'px-3 py-1.5 rounded-t',
            currentTab === 'customers' ? 'bg-teal-600 text-white' : 'bg-gray-200'
          ]"
          @click="currentTab = 'customers'"
        >
          Customers
        </button>
        <button
          class="ml-auto px-3 py-1.5 bg-gray-200 rounded hover:bg-gray-300"
          @click="saveFile"
        >
          Save
        </button>
        <button
          class="px-3 py-1.5 bg-gray-200 rounded hover:bg-gray-300"
          @click="saveFileAs"
        >
          Save As
        </button>
      </nav>
    </div>

    <div
      v-if="loaded"
      class="pt-2"
    >
      <ProductsView v-if="currentTab === 'products'" />
      <CustomersView v-else />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import ProductsView from "./views/ProductsView.vue";
import CustomersView from "./views/CustomersView.vue";

const lang = ref<"bn" | "en">("bn");
const appTitle = computed(() =>
  lang.value === "bn" ? "এএইচবি সেলস" : "AHB Sales"
);
const status = ref("Ready");
const currentTab = ref<'products' | 'customers'>("products");
const loaded = ref(false)

// simple i18n removed from template usage; kept title only

async function syncLang() {
  const l = await window.ahb.getLanguage();
  lang.value = l;
}

function onLangChange() {
  window.ahb.setLanguage(lang.value);
}

function newFile() {
  window.ahb.newFile();
}
function openFile() {
  window.ahb.openFile();
}
function saveFile() {
  window.ahb.saveFile();
}
function saveFileAs() {
  window.ahb.saveFileAs();
}

onMounted(() => {
  syncLang();
  window.ahb.onLanguageChanged((l) => {
    lang.value = l;
  });
  window.ahb.onDocumentChanged(() => {
    status.value = "Document loaded/changed";
    loaded.value = true
  });
});

// Title is derived from lang via computed
</script>
