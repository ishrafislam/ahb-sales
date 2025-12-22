import { defineStore } from "pinia";
import { ref } from "vue";

/**
 * Store for managing modal navigation state
 */
export const useModalStore = defineStore("modal", () => {
  // Modal visibility flags
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

  /**
   * Check if any modal is currently open
   */
  const isAnyModalOpen = () =>
    showCustomers.value ||
    showProducts.value ||
    showSalesHistory.value ||
    showPurchaseHistory.value ||
    showCustomerHistory.value ||
    showPurchaseEntry.value ||
    showReportMoneyCustomer.value ||
    showReportMoneyDayWise.value ||
    showReportDailyPayment.value ||
    showSettings.value ||
    showAbout.value;

  /**
   * Close all modals
   */
  const closeAll = () => {
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
  };

  /**
   * Navigate to a specific page/modal
   */
  const navigateTo = (
    page:
      | "dashboard"
      | "products"
      | "customers"
      | "product-sales-history"
      | "product-purchase-history"
      | "customer-history"
      | "purchase-entry"
      | "report-money-customer"
      | "report-money-daywise"
      | "report-daily-payment"
      | "settings"
  ) => {
    closeAll();

    switch (page) {
      case "dashboard":
        // All modals already closed
        break;
      case "products":
        showProducts.value = true;
        break;
      case "customers":
        showCustomers.value = true;
        break;
      case "product-sales-history":
        showSalesHistory.value = true;
        break;
      case "product-purchase-history":
        showPurchaseHistory.value = true;
        break;
      case "customer-history":
        showCustomerHistory.value = true;
        break;
      case "purchase-entry":
        showPurchaseEntry.value = true;
        break;
      case "report-money-customer":
        showReportMoneyCustomer.value = true;
        break;
      case "report-money-daywise":
        showReportMoneyDayWise.value = true;
        break;
      case "report-daily-payment":
        showReportDailyPayment.value = true;
        break;
      case "settings":
        showSettings.value = true;
        break;
    }
  };

  return {
    // State
    showCustomers,
    showProducts,
    showSalesHistory,
    showPurchaseHistory,
    showCustomerHistory,
    showPurchaseEntry,
    showReportMoneyCustomer,
    showReportMoneyDayWise,
    showReportDailyPayment,
    showSettings,
    showAbout,
    // Actions
    closeAll,
    navigateTo,
    isAnyModalOpen,
  };
});
