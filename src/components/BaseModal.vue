<template>
  <div
    class="fixed inset-0 z-50"
    role="dialog"
    aria-modal="true"
    @keydown.esc="onClose"
  >
    <div
      class="absolute inset-0 bg-black/40"
      @click="onClose"
    />
    <div class="relative h-full w-full flex items-center justify-center p-4">
      <div
        ref="modalContent"
        class="w-full bg-white dark:bg-gray-900 dark:text-gray-100 rounded shadow-lg border dark:border-gray-700"
        :class="maxWidthClass"
        tabindex="-1"
      >
        <div
          class="flex items-center justify-between p-3 border-b dark:border-gray-700"
        >
          <h3 class="text-lg font-semibold">
            {{ title }}
          </h3>
          <button
            class="px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
            aria-label="Close"
            @click="onClose"
          >
            ✕
          </button>
        </div>
        <div class="max-h-[85vh] overflow-auto flex flex-col">
          <slot />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
defineOptions({ name: "AhbBaseModal" });

const props = defineProps<{
  title: string;
  // Tailwind width key: limits to a safe subset to ensure classes are kept in build
  maxWidth?: "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "5xl";
}>();
const emit = defineEmits<{ (e: "close"): void }>();

const modalContent = ref<HTMLElement | null>(null);

const maxWidthClass = computed(() => {
  switch (props.maxWidth) {
    // case "md":
    //   return "max-w-md";
    case "lg":
      return "max-w-lg";
    case "xl":
      return "max-w-xl";
    case "2xl":
      return "max-w-2xl";
    case "3xl":
      return "max-w-3xl";
    case "5xl":
      return "max-w-5xl";
    case "4xl":
    default:
      return "max-w-4xl";
  }
});

function onClose() {
  emit("close");
}

// Focus trap and initial focus
onMounted(() => {
  if (modalContent.value) {
    // Focus the modal container on mount
    modalContent.value.focus();

    // Setup focus trap
    const focusableElements = modalContent.value.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstFocusable = focusableElements[0] as HTMLElement;
    const lastFocusable = focusableElements[
      focusableElements.length - 1
    ] as HTMLElement;

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;

      if (e.shiftKey) {
        // Shift+Tab
        if (document.activeElement === firstFocusable) {
          e.preventDefault();
          lastFocusable?.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastFocusable) {
          e.preventDefault();
          firstFocusable?.focus();
        }
      }
    };

    modalContent.value.addEventListener("keydown", handleTab);

    // Focus first input/button if available
    const firstInput = modalContent.value.querySelector(
      "input, button"
    ) as HTMLElement;
    if (firstInput) {
      setTimeout(() => firstInput.focus(), 50);
    }
  }
});
</script>
