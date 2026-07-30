import { defineStore } from "pinia";
import { ref } from "vue";

/**
 * Store for managing modal navigation state
 */
export const useModalStore = defineStore("modal", () => {
  // Modal visibility flags
  const showSalesHistory = ref(false);
  const showReportMoneyCustomer = ref(false);
  const showReportMoneyDayWise = ref(false);
  const showReportDailyPayment = ref(false);
  const showSettings = ref(false);
  const showAbout = ref(false);

  /**
   * Check if any modal is currently open
   */
  const isAnyModalOpen = () =>
    showSalesHistory.value ||
    showReportMoneyCustomer.value ||
    showReportMoneyDayWise.value ||
    showReportDailyPayment.value ||
    showSettings.value ||
    showAbout.value;

  /**
   * Close all modals
   */
  const closeAll = () => {
    showSalesHistory.value = false;
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
      | "product-sales-history"
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
      case "product-sales-history":
        showSalesHistory.value = true;
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
    showSalesHistory,
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
