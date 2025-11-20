import { defineStore } from "pinia";
import { ref } from "vue";

/**
 * Store for application-wide state (language, updates, etc.)
 */
export const useAppStore = defineStore("app", () => {
  const lang = ref<"bn" | "en">("bn");

  // Update toast state
  const showUpdateToast = ref(false);
  const updateToastText = ref("");
  const canRestartForUpdate = ref(false);

  const setLanguage = (language: "bn" | "en") => {
    lang.value = language;
  };

  const showUpdateMessage = (message: string, canRestart = false) => {
    updateToastText.value = message;
    canRestartForUpdate.value = canRestart;
    showUpdateToast.value = true;
  };

  const hideUpdateToast = () => {
    showUpdateToast.value = false;
  };

  return {
    // State
    lang,
    showUpdateToast,
    updateToastText,
    canRestartForUpdate,
    // Actions
    setLanguage,
    showUpdateMessage,
    hideUpdateToast,
  };
});
