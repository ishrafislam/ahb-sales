import { defineStore } from "pinia";
import { ref } from "vue";

/**
 * Store for managing modal navigation state
 */
export const useModalStore = defineStore("modal", () => {
  // Modal visibility flags
  const showSettings = ref(false);
  const showAbout = ref(false);

  /**
   * Check if any modal is currently open
   */
  const isAnyModalOpen = () => showSettings.value || showAbout.value;

  /**
   * Close all modals
   */
  const closeAll = () => {
    showSettings.value = false;
    showAbout.value = false;
  };

  /**
   * Navigate to a specific page/modal
   */
  const navigateTo = (page: "dashboard" | "settings") => {
    closeAll();

    switch (page) {
      case "dashboard":
        // All modals already closed
        break;
      case "settings":
        showSettings.value = true;
        break;
    }
  };

  return {
    // State
    showSettings,
    showAbout,
    // Actions
    closeAll,
    navigateTo,
    isAnyModalOpen,
  };
});
