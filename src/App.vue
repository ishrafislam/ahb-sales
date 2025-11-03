<template>
  <div class="min-h-screen">
    <div v-if="!loaded" class="min-h-screen grid place-items-center">
      <div class="text-center space-y-4 px-4">
        <h2 class="text-4xl font-bold">ABDUL HAMID & BROTHERS</h2>
        <div class="flex flex-col gap-3 w-full max-w-xs mx-auto">
          <button
            class="h-10 rounded bg-blue-600 text-white font-semibold hover:bg-blue-700"
            @click="newFile"
          >
            {{ t("new_file") }}
          </button>
          <button
            class="h-10 rounded bg-gray-200 text-gray-900 font-semibold hover:bg-gray-300"
            @click="openFile"
          >
            {{ t("open_file") }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="loaded">
      <Dashboard @navigate="onNavigate" />
    </div>

    <!-- Modals -->
    <BaseModal
      v-if="showCustomers"
      :title="t('customers_title')"
      :max-width="'4xl'"
      @close="closeModals"
    >
      <CustomersModal />
    </BaseModal>
    <BaseModal
      v-if="showProducts"
      :title="t('products_title')"
      :max-width="'5xl'"
      @close="closeModals"
    >
      <ProductsModal />
    </BaseModal>
    <BaseModal
      v-if="showSalesHistory"
      :title="t('product_sales_history_title')"
      @close="closeModals"
    >
      <ProductSalesHistory @navigate="onNavigate" />
    </BaseModal>
    <BaseModal
      v-if="showPurchaseHistory"
      :title="t('product_purchase_history_title')"
      @close="closeModals"
    >
      <ProductPurchaseHistory @navigate="onNavigate" />
    </BaseModal>
    <BaseModal
      v-if="showCustomerHistory"
      :title="t('customer_history_title')"
      :max-width="'5xl'"
      @close="closeModals"
    >
      <CustomerHistory @navigate="onNavigate" />
    </BaseModal>
    <BaseModal
      v-if="showPurchaseEntry"
      :title="t('product_purchase_title')"
      @close="closeModals"
    >
      <ProductPurchaseModal />
    </BaseModal>
    <BaseModal
      v-if="showReportMoneyCustomer"
      :title="t('report_money_customer_title')"
      :max-width="'5xl'"
      @close="closeModals"
    >
      <ReportMoneyCustomer />
    </BaseModal>
    <BaseModal
      v-if="showReportMoneyDayWise"
      :title="t('report_money_daywise_title')"
      :max-width="'5xl'"
      @close="closeModals"
    >
      <ReportMoneyDayWise />
    </BaseModal>
    <BaseModal
      v-if="showReportDailyPayment"
      :title="t('report_daily_payment_title')"
      :max-width="'4xl'"
      @close="closeModals"
    >
      <ReportDailyPayment />
    </BaseModal>
    <BaseModal
      v-if="showSettings"
      :title="t('settings_title')"
      @close="closeModals"
    >
      <SettingsModal />
    </BaseModal>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { initI18n, t } from "./i18n";
import ProductsModal from "./views/ProductsModal.vue";
import CustomersModal from "./views/CustomersModal.vue";
import Dashboard from "./views/Dashboard.vue";
import ProductSalesHistory from "./views/ProductSalesHistory.vue";
import ProductPurchaseHistory from "./views/ProductPurchaseHistory.vue";
import CustomerHistory from "./views/CustomerHistory.vue";
import BaseModal from "./components/BaseModal.vue";
import ProductPurchaseModal from "./views/ProductPurchaseModal.vue";
import ReportMoneyCustomer from "./views/ReportMoneyCustomer.vue";
import ReportMoneyDayWise from "./views/ReportMoneyDayWise.vue";
import ReportDailyPayment from "./views/ReportDailyPayment.vue";
import SettingsModal from "./views/SettingsModal.vue";

const lang = ref<"bn" | "en">("bn");
// Modal flags
const showCustomers = ref(false);
const showProducts = ref(false);
const showSalesHistory = ref(false);
const showPurchaseHistory = ref(false);
const showCustomerHistory = ref(false);
const showPurchaseEntry = ref(false);
const showReportMoneyCustomer = ref(false);
const showReportMoneyDayWise = ref(false);
const showReportDailyPayment = ref(false);
const showSettings = ref(false);
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
  void initI18n();
  syncLang();
  window.ahb.onLanguageChanged((l) => {
    lang.value = l;
  });
  window.ahb.onDocumentChanged(() => {
    loaded.value = true;
  });
  // Open settings when triggered from application menu (guard for tests)
  if (typeof (window.ahb as any).onOpenSettings === "function") {
    (window.ahb as any).onOpenSettings(() => {
      closeModals();
      showSettings.value = true;
    });
  }
});

function closeModals() {
  showCustomers.value = false;
  showProducts.value = false;
  showSalesHistory.value = false;
  showPurchaseHistory.value = false;
  showCustomerHistory.value = false;
  showPurchaseEntry.value = false;
  showReportMoneyCustomer.value = false;
  showReportMoneyDayWise.value = false;
  showReportDailyPayment.value = false;
  showSettings.value = false;
}

function onNavigate(
  page:
    | "dashboard"
    | "products"
    | "customers"
    | "product-sales-history"
    | "product-purchase-history"
    | "customer-history"
    | "purchase-entry"
    | "reports"
    | "report-money-customer"
    | "report-money-daywise"
    | "report-daily-payment"
    | "settings"
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
  if (page === "purchase-entry") {
    closeModals();
    showPurchaseEntry.value = true;
    return;
  }
  if (page === "report-money-customer") {
    closeModals();
    showReportMoneyCustomer.value = true;
    return;
  }
  if (page === "report-money-daywise") {
    closeModals();
    showReportMoneyDayWise.value = true;
    return;
  }
  if (page === "report-daily-payment") {
    closeModals();
    showReportDailyPayment.value = true;
    return;
  }
  if (page === "settings") {
    closeModals();
    showSettings.value = true;
    return;
  }
  if (page === "customer-history") {
    closeModals();
    showCustomerHistory.value = true;
  }
}

// Title is derived from lang via computed
</script>
