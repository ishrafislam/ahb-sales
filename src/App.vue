<template>
  <!-- eslint-disable -->
  <div
    class="min-h-screen bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-100 transition-colors"
  >
    <div
      v-if="!fileStore.loaded"
      class="min-h-screen grid place-items-center"
    >
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

    <div v-if="fileStore.loaded">
      <Dashboard @navigate="onNavigate" />
    </div>

    <!-- Modals -->
    <BaseModal
      v-if="modalStore.showCustomers"
      :title="t('customers_title')"
      :max-width="'4xl'"
      @close="modalStore.closeAll"
    >
      <CustomersModal />
    </BaseModal>
    <BaseModal
      v-if="modalStore.showProducts"
      :title="t('products_title')"
      :max-width="'5xl'"
      @close="modalStore.closeAll"
    >
      <ProductsModal />
    </BaseModal>
    <BaseModal
      v-if="modalStore.showSalesHistory"
      :title="t('product_sales_history_title')"
      @close="modalStore.closeAll"
    >
      <ProductSalesHistory @navigate="onNavigate" />
    </BaseModal>
    <BaseModal
      v-if="modalStore.showPurchaseHistory"
      :title="t('product_purchase_history_title')"
      @close="modalStore.closeAll"
    >
      <ProductPurchaseHistory @navigate="onNavigate" />
    </BaseModal>
    <BaseModal
      v-if="modalStore.showCustomerHistory"
      :title="t('customer_history_title')"
      :max-width="'5xl'"
      @close="modalStore.closeAll"
    >
      <CustomerHistory @navigate="onNavigate" />
    </BaseModal>
    <BaseModal
      v-if="modalStore.showPurchaseEntry"
      :title="t('product_purchase_title')"
      @close="modalStore.closeAll"
    >
      <ProductPurchaseModal />
    </BaseModal>
    <BaseModal
      v-if="modalStore.showReportMoneyCustomer"
      :title="t('report_money_customer_title')"
      :max-width="'5xl'"
      @close="modalStore.closeAll"
    >
      <ReportMoneyCustomer />
    </BaseModal>
    <BaseModal
      v-if="modalStore.showReportMoneyDayWise"
      :title="t('report_money_daywise_title')"
      :max-width="'5xl'"
      @close="modalStore.closeAll"
    >
      <ReportMoneyDayWise />
    </BaseModal>
    <BaseModal
      v-if="modalStore.showReportDailyPayment"
      :title="t('report_daily_payment_title')"
      :max-width="'4xl'"
      @close="modalStore.closeAll"
    >
      <ReportDailyPayment />
    </BaseModal>
    <BaseModal
      v-if="modalStore.showAbout"
      :title="t('about_app')"
      :max-width="'md'"
      @close="modalStore.closeAll"
    >
      <AboutModal />
    </BaseModal>

    <BaseModal
      v-if="modalStore.showSettings"
      :title="t('settings_title')"
      @close="modalStore.closeAll"
    >
      <SettingsModal />
    </BaseModal>

    <!-- Update toast -->
    <div
      v-if="appStore.showUpdateToast"
      class="fixed bottom-4 right-4 bg-gray-900 text-white dark:bg-gray-800 px-4 py-2 rounded shadow-lg flex items-center gap-3"
    >
      <span>{{ appStore.updateToastText }}</span>
      <button
        v-if="appStore.canRestartForUpdate"
        class="bg-green-600 hover:bg-green-700 text-white rounded px-3 py-1 text-sm"
        @click="restartForUpdate"
      >
        {{ t("restart_to_update") }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from "vue";
import { t, initI18n } from "./i18n";
import {
  TOAST_DURATION_UPDATE_SHORT,
  TOAST_DURATION_UPDATE_LONG,
} from "./constants/business";
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
import { useKeyboardShortcuts } from "./composables/useKeyboardShortcuts";
import { useModalStore } from "./stores/modal";
import { useFileStore } from "./stores/file";
import { useAppStore } from "./stores/app";

// Initialize stores
const modalStore = useModalStore();
const fileStore = useFileStore();
const appStore = useAppStore();

// simple i18n removed from template usage; kept title only

async function syncLang() {
  const l = await window.ahb.getLanguage();
  appStore.setLanguage(l);
}

function newFile() {
  window.ahb.newFile();
}
function openFile() {
  window.ahb.openFile();
}
async function saveFile() {
  await window.ahb.saveFile();
}
async function saveFileAs() {
  await window.ahb.saveFileAs();
}

// Setup global keyboard shortcuts
useKeyboardShortcuts([
  {
    key: "n",
    ctrl: true,
    handler: () => {
      newFile();
    },
    description: "New File",
  },
  {
    key: "o",
    ctrl: true,
    handler: () => {
      openFile();
    },
    description: "Open File",
  },
  {
    key: "s",
    ctrl: true,
    shift: true,
    handler: () => {
      if (fileStore.loaded) {
        saveFileAs();
      }
    },
    description: "Save File As",
  },
  {
    key: "s",
    ctrl: true,
    handler: () => {
      if (fileStore.loaded) {
        saveFile();
      }
    },
    description: "Save File",
  },
  {
    key: "Escape",
    handler: () => {
      // Close any open modal
      if (modalStore.isAnyModalOpen()) {
        modalStore.closeAll();
      }
    },
    description: "Close Modal",
  },
]);

onMounted(() => {
  void initI18n();
  syncLang();
  window.ahb.onLanguageChanged((l) => {
    appStore.setLanguage(l);
  });
  window.ahb.onDocumentChanged(() => {
    fileStore.setLoaded(true);
  });
  // Ensure we reflect an already-open file after reload (e.g., wake/HMR)
  void (async () => {
    try {
      const info = await window.ahb.getFileInfo();
      fileStore.updateFileInfo(info);
    } catch {
      // ignore
    }
  })();
  // Track file open/close to keep `loaded` in sync
  if (typeof (window.ahb as any).onFileInfo === "function") {
    (window.ahb as any).onFileInfo(
      (info: { path: string | null; isDirty: boolean }) => {
        fileStore.updateFileInfo(info);
      }
    );
  }
  // Open settings when triggered from application menu (guard for tests)
  if (typeof (window.ahb as any).onOpenSettings === "function") {
    (window.ahb as any).onOpenSettings(() => {
      modalStore.navigateTo("settings");
    });
  }
  if (typeof (window.ahb as any).onOpenAbout === "function") {
    (window.ahb as any).onOpenAbout(() => {
      modalStore.closeAll();
      modalStore.showAbout = true;
    });
  }
  // Subscribe to updater events if available
  if (typeof (window.ahb as any).onUpdateEvent === "function") {
    (window.ahb as any).onUpdateEvent(
      (ev: { kind: string; data?: unknown }) => {
        if (ev.kind === "checking") {
          appStore.showUpdateMessage(t("update_checking"), false);
          setTimeout(() => appStore.hideUpdateToast(), 2000);
        } else if (ev.kind === "available") {
          appStore.showUpdateMessage(t("update_downloading"), false);
        } else if (ev.kind === "not-available") {
          appStore.showUpdateMessage(t("update_current"), false);
          setTimeout(() => appStore.hideUpdateToast(), 2000);
        } else if (ev.kind === "downloaded") {
          appStore.showUpdateMessage(t("update_downloaded"), true);
        } else if (ev.kind === "error") {
          appStore.showUpdateMessage(
            t("update_failed", { error: String(ev.data || "") }),
            false
          );
          setTimeout(() => appStore.hideUpdateToast(), 4000);
        }
      }
    );
  }
});

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
    modalStore.closeAll();
    return;
  }
  if (page === "products") {
    modalStore.navigateTo("products");
    return;
  }
  if (page === "customers") {
    modalStore.navigateTo("customers");
    return;
  }
  if (page === "product-sales-history") {
    modalStore.navigateTo("product-sales-history");
    return;
  }
  if (page === "product-purchase-history") {
    modalStore.navigateTo("product-purchase-history");
    return;
  }
  if (page === "purchase-entry") {
    modalStore.navigateTo("purchase-entry");
    return;
  }
  if (page === "report-money-customer") {
    modalStore.navigateTo("report-money-customer");
    return;
  }
  if (page === "report-money-daywise") {
    modalStore.navigateTo("report-money-daywise");
    return;
  }
  if (page === "report-daily-payment") {
    modalStore.navigateTo("report-daily-payment");
    return;
  }
  if (page === "settings") {
    modalStore.navigateTo("settings");
    return;
  }
  if (page === "customer-history") {
    modalStore.navigateTo("customer-history");
  }
}

function restartForUpdate() {
  if (typeof (window.ahb as any).restartAndInstall === "function") {
    (window.ahb as any).restartAndInstall();
  }
}

// Title is derived from lang via computed
</script>
