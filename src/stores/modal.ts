import { defineStore } from "pinia";
import { ref } from "vue";

/**
 * Store for managing modal navigation state
 */
export const useModalStore = defineStore("modal", () => {
  // Modal visibility flags
  const showReportDailyPayment = ref(false);
  const showSettings = ref(false);
  const showAbout = ref(false);

  /**
   * Check if any modal is currently open
   */
  const isAnyModalOpen = () =>
    showReportDailyPayment.value ||
    showSettings.value ||
    showAbout.value;

  /**
   * Close all modals
   */
  const closeAll = () => {
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
      | "report-daily-payment"
      | "settings"
  ) => {
    closeAll();

    switch (page) {
      case "dashboard":
        // All modals already closed
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
    showReportDailyPayment,
    showSettings,
    showAbout,
    // Actions
    closeAll,
    navigateTo,
    isAnyModalOpen,
  };
});
