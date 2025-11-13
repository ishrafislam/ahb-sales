<template>
  <!-- eslint-disable -->
  <div
    class="min-h-screen bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-100 transition-colors"
  >
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
      v-if="showAbout"
      :title="t('about_app')"
      :max-width="'md'"
      @close="closeModals"
    >
      <AboutModal />
    </BaseModal>

    <BaseModal
      v-if="showSettings"
      :title="t('settings_title')"
      @close="closeModals"
    >
      <SettingsModal />
    </BaseModal>

    <!-- Update toast -->
    <div
      v-if="showUpdateToast"
      class="fixed bottom-4 right-4 bg-gray-900 text-white dark:bg-gray-800 px-4 py-2 rounded shadow-lg flex items-center gap-3"
    >
      <span>{{ updateToastText }}</span>
      <button
        v-if="canRestartForUpdate"
        class="bg-green-600 hover:bg-green-700 text-white rounded px-3 py-1 text-sm"
        @click="restartForUpdate"
      >
        {{ t("restart_to_update") }}
      </button>
    </div>
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
import AboutModal from "./views/AboutModal.vue";

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
const showAbout = ref(false);
const loaded = ref(false);
// Update toast state
const showUpdateToast = ref(false);
const updateToastText = ref("");
const canRestartForUpdate = ref(false);

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
  // Ensure we reflect an already-open file after reload (e.g., wake/HMR)
  void (async () => {
    try {
      const info = await window.ahb.getFileInfo();
      loaded.value = Boolean(info?.path);
    } catch {
      // ignore
    }
  })();
  // Track file open/close to keep `loaded` in sync
  if (typeof (window.ahb as any).onFileInfo === "function") {
    (window.ahb as any).onFileInfo(
      (info: { path: string | null; isDirty: boolean }) => {
        loaded.value = Boolean(info?.path);
      }
    );
  }
  // Open settings when triggered from application menu (guard for tests)
  if (typeof (window.ahb as any).onOpenSettings === "function") {
    (window.ahb as any).onOpenSettings(() => {
      closeModals();
      showSettings.value = true;
    });
  }
  if (typeof (window.ahb as any).onOpenAbout === "function") {
    (window.ahb as any).onOpenAbout(() => {
      closeModals();
      showAbout.value = true;
    });
  }
  // Subscribe to updater events if available
  if (typeof (window.ahb as any).onUpdateEvent === "function") {
    (window.ahb as any).onUpdateEvent(
      (ev: { kind: string; data?: unknown }) => {
        if (ev.kind === "checking") {
          updateToastText.value = t("update_checking");
          canRestartForUpdate.value = false;
          showUpdateToast.value = true;
          setTimeout(() => (showUpdateToast.value = false), 2000);
        } else if (ev.kind === "available") {
          updateToastText.value = t("update_downloading");
          canRestartForUpdate.value = false;
          showUpdateToast.value = true;
        } else if (ev.kind === "not-available") {
          updateToastText.value = t("update_current");
          canRestartForUpdate.value = false;
          showUpdateToast.value = true;
          setTimeout(() => (showUpdateToast.value = false), 2000);
        } else if (ev.kind === "downloaded") {
          updateToastText.value = t("update_downloaded");
          canRestartForUpdate.value = true;
          showUpdateToast.value = true;
        } else if (ev.kind === "error") {
          updateToastText.value = t("update_failed", {
            error: String(ev.data || ""),
          });
          canRestartForUpdate.value = false;
          showUpdateToast.value = true;
          setTimeout(() => (showUpdateToast.value = false), 4000);
        }
      }
    );
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
  showAbout.value = false;
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

function restartForUpdate() {
  if (typeof (window.ahb as any).restartAndInstall === "function") {
    (window.ahb as any).restartAndInstall();
  }
}

// Title is derived from lang via computed
</script>
