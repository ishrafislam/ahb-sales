<template>
  <div
    v-if="customer"
    class="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg mb-4"
  >
    <h3 class="text-base font-semibold mb-2 text-blue-700 dark:text-blue-300">
      {{ labels.title }}
    </h3>
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-2 text-sm">
      <div>
        <span class="text-gray-600 dark:text-gray-300"> {{ labels.id }}: </span>
        <span class="font-medium ml-1">
          {{ customer.id ?? "—" }}
        </span>
      </div>
      <div>
        <span class="text-gray-600 dark:text-gray-300">
          {{ labels.name }}:
        </span>
        <span class="font-medium ml-1">
          {{ customer.nameBn ?? "—" }}
        </span>
      </div>
      <div>
        <span class="text-gray-600 dark:text-gray-300">
          {{ labels.lastBill }}:
        </span>
        <span class="font-medium ml-1"> {{ lastBillText }} </span>
      </div>
      <div>
        <span class="text-gray-600 dark:text-gray-300">
          {{ labels.due }}:
        </span>
        <span class="font-medium text-red-600 ml-1">
          {{ formatMoney(Number(customer.outstanding || 0)) }}
        </span>
      </div>
    </div>
  </div>
  <div
    v-else
    class="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg mb-4"
  >
    <div class="text-sm text-gray-500 dark:text-gray-400">
      {{ labels.selectCustomerPrompt }}
    </div>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: "CustomerInfoBanner" });

type Customer = {
  id: number;
  nameBn: string;
  outstanding?: number;
};

defineProps<{
  customer: Customer | null;
  lastBillText: string;
  labels: {
    title: string;
    id: string;
    name: string;
    lastBill: string;
    due: string;
    selectCustomerPrompt: string;
  };
}>();

const formatMoney = (n: number) => (Number.isFinite(n) ? n.toFixed(2) : "0.00");
</script>
