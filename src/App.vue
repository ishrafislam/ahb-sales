<template>
  <div class="p-4 space-y-3 min-h-screen">
    <!-- <div class="flex flex-wrap gap-2">
      <select
        v-if="loaded"
        v-model="lang"
        class="px-2 py-1 border rounded"
        @change="onLangChange"
      >
        <option value="bn">বাংলা</option>
        <option value="en">English</option>
      </select>
    </div> -->

    <!-- Initial full-screen file selection (styled) -->
    <div v-if="!loaded" class="min-h-screen grid place-items-center">
      <div class="text-center space-y-4 px-4">
        <h2 class="text-4xl font-bold">ABDUL HAMID & BROTHERS</h2>
        <div class="flex flex-col gap-3 w-full max-w-xs mx-auto">
          <button
            class="h-10 rounded bg-blue-600 text-white font-semibold hover:bg-blue-700"
            @click="newFile"
          >
            New File
          </button>
          <button
            class="h-10 rounded bg-gray-200 text-gray-900 font-semibold hover:bg-gray-300"
            @click="openFile"
          >
            Open File
          </button>
        </div>
      </div>
    </div>

    <div v-if="loaded" class="pt-2">
      <Dashboard @navigate="onNavigate" />
    </div>

    <!-- Modals -->
    <BaseModal
      v-if="showCustomers"
      title="Customers"
      :max-width="'4xl'"
      @close="closeModals"
    >
      <CustomersModal />
    </BaseModal>
    <BaseModal
      v-if="showProducts"
      title="Products"
      :max-width="'5xl'"
      @close="closeModals"
    >
      <ProductsModal />
    </BaseModal>
    <BaseModal
      v-if="showSalesHistory"
      title="Product Sales History"
      @close="closeModals"
    >
      <ProductSalesHistory @navigate="onNavigate" />
    </BaseModal>
    <BaseModal
      v-if="showPurchaseHistory"
      title="Product Purchase History"
      @close="closeModals"
    >
      <ProductPurchaseHistory @navigate="onNavigate" />
    </BaseModal>
    <BaseModal
      v-if="showCustomerHistory"
      title="Customer History"
      @close="closeModals"
    >
      <CustomerHistory @navigate="onNavigate" />
    </BaseModal>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import ProductsModal from "./views/ProductsModal.vue";
import CustomersModal from "./views/CustomersModal.vue";
import Dashboard from "./views/Dashboard.vue";
import ProductSalesHistory from "./views/ProductSalesHistory.vue";
import ProductPurchaseHistory from "./views/ProductPurchaseHistory.vue";
import CustomerHistory from "./views/CustomerHistory.vue";
import BaseModal from "./components/BaseModal.vue";

const lang = ref<"bn" | "en">("bn");
// Modal flags
const showCustomers = ref(false);
const showProducts = ref(false);
const showSalesHistory = ref(false);
const showPurchaseHistory = ref(false);
const showCustomerHistory = ref(false);
const loaded = ref(false);

// simple i18n removed from template usage; kept title only

async function syncLang() {
  const l = await window.ahb.getLanguage();
  lang.value = l;
}

function newFile() {
  window.ahb.newFile();
}
function openFile() {
  window.ahb.openFile();
}
// Save actions available within Dashboard itself

onMounted(() => {
  syncLang();
  window.ahb.onLanguageChanged((l) => {
    lang.value = l;
  });
  window.ahb.onDocumentChanged(() => {
    loaded.value = true;
  });
});

function closeModals() {
  showCustomers.value = false;
  showProducts.value = false;
  showSalesHistory.value = false;
  showPurchaseHistory.value = false;
  showCustomerHistory.value = false;
}

function onNavigate(
  page:
    | "dashboard"
    | "products"
    | "customers"
    | "product-sales-history"
    | "product-purchase-history"
    | "customer-history"
    | string
) {
  if (page === "dashboard") {
    closeModals();
    return;
  }
  if (page === "products") {
    closeModals();
    showProducts.value = true;
    return;
  }
  if (page === "customers") {
    closeModals();
    showCustomers.value = true;
    return;
  }
  if (page === "product-sales-history") {
    closeModals();
    showSalesHistory.value = true;
    return;
  }
  if (page === "product-purchase-history") {
    closeModals();
    showPurchaseHistory.value = true;
    return;
  }
  if (page === "customer-history") {
    closeModals();
    showCustomerHistory.value = true;
  }
}

// Title is derived from lang via computed
</script>
