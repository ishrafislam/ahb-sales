<template>
  <div class="p-4 space-y-3">
    <div class="flex flex-wrap gap-2">
      <button
        class="px-3 py-1.5 bg-teal-600 text-white rounded hover:bg-teal-700"
        @click="newFile"
      >
        {{ t("menu_new") }}
      </button>
      <button
        class="px-3 py-1.5 bg-teal-600 text-white rounded hover:bg-teal-700"
        @click="openFile"
      >
        {{ t("menu_open") }}
      </button>
      <button
        class="px-3 py-1.5 bg-teal-600 text-white rounded hover:bg-teal-700"
        @click="saveFile"
      >
        {{ t("menu_save") }}
      </button>
      <button
        class="px-3 py-1.5 bg-teal-600 text-white rounded hover:bg-teal-700"
        @click="saveFileAs"
      >
        {{ t("menu_save_as") }}
      </button>
      <select
        v-model="lang"
        class="px-2 py-1 border rounded"
        @change="onLangChange"
      >
        <option value="bn">বাংলা</option>
        <option value="en">English</option>
      </select>
    </div>
    <h2 class="text-2xl font-semibold">
      {{ appTitle }}
    </h2>
    <p id="status">
      {{ status }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from "vue";

const lang = ref<"bn" | "en">("bn");
const appTitle = computed(() =>
  lang.value === "bn" ? "এএইচবি সেলস" : "AHB Sales"
);
const status = ref("Ready");

function t(key: string) {
  if (lang.value === "bn") {
    const bn: Record<string, string> = {
      app_title: "এএইচবি সেলস",
      menu_new: "নতুন",
      menu_open: "ওপেন",
      menu_save: "সেভ",
      menu_save_as: "সেভ অ্যাজ",
    };
    return bn[key] ?? key;
  }
  const en: Record<string, string> = {
    app_title: "AHB Sales",
    menu_new: "New",
    menu_open: "Open",
    menu_save: "Save",
    menu_save_as: "Save As",
  };
  return en[key] ?? key;
}

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
  });
});

// Title is derived from lang via computed
</script>
