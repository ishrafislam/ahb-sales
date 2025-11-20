import { defineStore } from "pinia";
import { ref, computed } from "vue";

/**
 * Store for file information and state
 */
export const useFileStore = defineStore("file", () => {
  const loaded = ref(false);
  const filePath = ref<string | null>(null);
  const isDirty = ref(false);

  const fileName = computed(() => {
    if (!filePath.value) return "—";
    const parts = filePath.value.split(/[\\/]/);
    return parts[parts.length - 1] || filePath.value;
  });

  const updateFileInfo = (info: { path: string | null; isDirty: boolean }) => {
    filePath.value = info.path;
    isDirty.value = info.isDirty;
    loaded.value = Boolean(info.path);
  };

  const setLoaded = (value: boolean) => {
    loaded.value = value;
  };

  return {
    // State
    loaded,
    filePath,
    isDirty,
    // Computed
    fileName,
    // Actions
    updateFileInfo,
    setLoaded,
  };
});
