<template>
  <div
    class="bg-white dark:bg-gray-900 dark:text-gray-100 p-3 rounded-md shadow-sm border border-gray-200 dark:border-gray-700"
  >
    <div class="flex items-center justify-between text-sm">
      <span
        class="truncate"
        :title="fileNameDisplay"
        >{{ fileNameDisplay }}</span
      >
      <span
        class="inline-flex items-center gap-1"
        :class="fileDirty ? 'text-orange-500' : 'text-green-600'"
        :title="statusLabel"
        :aria-label="statusLabel"
        role="img"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          class="w-5 h-5"
        >
          <path
            fill-rule="evenodd"
            d="M16.704 5.29a1 1 0 0 1 .006 1.414l-7.5 7.5a1 1 0 0 1-1.414 0l-3-3a1 1 0 1 1 1.414-1.414l2.293 2.293 6.793-6.793a1 1 0 0 1 1.408 0z"
            clip-rule="evenodd"
          />
        </svg>
        <span
          v-if="!fileDirty"
          class="text-xs font-medium"
          >{{ t("file_saved") }}</span
        >
        <span
          v-if="fileDirty"
          class="text-xs font-medium"
          >{{ t("file_unsaved") }}</span
        >
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: "FileInfoPanel" });
import { computed } from "vue";
import { t } from "../../i18n";

const props = defineProps<{
  fileNameDisplay: string;
  fileDirty: boolean;
}>();

const statusLabel = computed(() =>
  props.fileDirty ? t("file_unsaved_changes") : t("file_saved")
);
</script>
