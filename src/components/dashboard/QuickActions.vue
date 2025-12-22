<template>
  <div
    class="bg-white dark:bg-gray-900 dark:text-gray-100 p-4 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 mt-auto"
  >
    <div class="grid grid-cols-2 gap-2">
      <button
        v-for="action in actions"
        :key="action.page"
        class="py-1.5 px-3 rounded-md text-sm font-semibold transition-colors"
        :class="action.className"
        @click="emit('navigate', action.page)"
      >
        {{ action.label }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: "QuickActions" });

type NavigationPage =
  | "customer-history"
  | "purchase-entry"
  | "customers"
  | "products"
  | "product-sales-history"
  | "product-purchase-history"
  | "report-money-customer"
  | "report-money-daywise"
  | "report-daily-payment";

type Action = {
  page: NavigationPage;
  label: string;
  className: string;
  colSpan?: number;
};

defineProps<{
  actions: Action[];
}>();

const emit = defineEmits<{
  (e: "navigate", page: NavigationPage): void;
}>();
</script>
