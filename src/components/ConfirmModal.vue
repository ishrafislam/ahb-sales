<template>
  <!-- eslint-disable -->
  <div
    class="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4"
    role="dialog"
    aria-modal="true"
  >
    <div
      class="w-full max-w-sm rounded-md bg-white shadow-lg border border-gray-200"
    >
      <div class="px-4 py-3 border-b border-gray-200">
        <h3 class="text-base font-semibold">{{ title }}</h3>
      </div>
      <div class="px-4 py-3 text-sm text-gray-700">
        <slot>
          {{ message }}
        </slot>
      </div>
      <div class="px-4 py-3 flex justify-end gap-2 border-t border-gray-200">
        <button class="btn" @click="$emit('cancel')">
          {{ cancelLabel || "Cancel" }}
        </button>
        <button class="btn btn-primary" @click="$emit('confirm')">
          {{ confirmLabel || "Confirm" }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  title?: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const props = defineProps<Props>();
// Declare events
defineEmits<{ (e: "confirm"): void; (e: "cancel"): void }>();
</script>
