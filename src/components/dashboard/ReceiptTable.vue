<template>
  <div class="flex-grow min-h-0 overflow-auto">
    <table class="w-full text-left text-sm">
      <thead class="border-b border-gray-200 dark:border-gray-700">
        <tr>
          <th
            class="p-2 text-xs font-semibold text-gray-600 dark:text-gray-300 text-center"
          >
            #
          </th>
          <th
            class="p-2 text-xs font-semibold text-gray-600 dark:text-gray-300"
          >
            {{ labels.productName }}
          </th>
          <th
            class="p-2 text-xs font-semibold text-gray-600 dark:text-gray-300 text-center"
          >
            {{ labels.quantity }}
          </th>
          <th
            class="p-2 text-xs font-semibold text-gray-600 dark:text-gray-300 text-center"
          >
            {{ labels.unit }}
          </th>
          <th
            class="p-2 text-xs font-semibold text-gray-600 dark:text-gray-300 text-right"
          >
            {{ labels.unitPrice }}
          </th>
          <th
            class="p-2 text-xs font-semibold text-gray-600 dark:text-gray-300 text-right"
          >
            {{ labels.total }}
          </th>
          <th
            class="p-2 text-xs font-semibold text-gray-600 dark:text-gray-300 text-center"
          >
            {{ labels.actions }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="(row, idx) in rows"
          :key="row.productId"
          class="border-b border-gray-200 dark:border-gray-700"
          :class="{ 'bg-red-50 dark:bg-red-950': row.isOversell }"
        >
          <td class="p-2 text-center">
            {{ idx + 1 }}
          </td>
          <td class="p-2">
            <div class="flex items-center gap-2">
              <span>{{ row.nameBn }}</span>
              <span
                v-if="row.isOversell"
                class="inline-flex items-center gap-1 text-red-700 text-xs font-medium"
                :title="labels.oversellWarning"
                aria-live="polite"
              >
                <span aria-hidden="true">⚠️</span>
                <span class="sr-only">{{ labels.oversellWarning }}</span>
              </span>
            </div>
          </td>
          <td class="p-2 text-center">
            <div class="inline-flex items-center gap-1">
              <button
                type="button"
                class="inline-flex items-center justify-center w-6 h-6 rounded border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                :aria-label="labels.decrease"
                :title="labels.decrease"
                @click="emit('adjust-quantity', idx, -1)"
              >
                <span aria-hidden="true">−</span>
                <span class="sr-only">{{ labels.decrease }}</span>
              </button>
              <input
                class="w-16 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md px-1 py-0.5 text-center text-sm no-spinner dark:text-gray-100"
                type="number"
                min="1"
                :value="row.quantity"
                @input="emit('quantity-input', idx, $event)"
              />
              <button
                type="button"
                class="inline-flex items-center justify-center w-6 h-6 rounded border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                :aria-label="labels.increase"
                :title="labels.increase"
                @click="emit('adjust-quantity', idx, 1)"
              >
                <span aria-hidden="true">+</span>
                <span class="sr-only">{{ labels.increase }}</span>
              </button>
            </div>
          </td>
          <td class="p-2 text-center">
            {{ row.unit }}
          </td>
          <td class="p-2 text-right">
            <input
              class="w-20 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md px-1 py-0.5 text-right text-sm no-spinner dark:text-gray-100"
              type="number"
              min="1"
              step="1"
              :value="row.rate"
              @change="emit('rate-input', idx, $event)"
            />
          </td>
          <td class="p-2 text-right">
            {{ formatMoney(row.lineTotal) }}
          </td>
          <td class="p-2 text-center">
            <button
              type="button"
              class="inline-flex items-center justify-center w-6 h-6 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              :aria-label="labels.remove"
              :title="labels.remove"
              @click="emit('remove-row', idx)"
            >
              <span aria-hidden="true">×</span>
              <span class="sr-only">{{ labels.remove }}</span>
            </button>
          </td>
        </tr>
        <tr v-if="rows.length === 0">
          <td
            class="p-2 text-center text-gray-500 dark:text-gray-400"
            colspan="7"
          >
            {{ labels.noItems }}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: "ReceiptTable" });

type ReceiptRow = {
  productId: number;
  nameBn: string;
  unit: string;
  rate: number;
  quantity: number;
  lineTotal: number;
  isOversell: boolean;
};

defineProps<{
  rows: ReceiptRow[];
  labels: {
    productName: string;
    quantity: string;
    unit: string;
    unitPrice: string;
    total: string;
    actions: string;
    decrease: string;
    increase: string;
    remove: string;
    oversellWarning: string;
    noItems: string;
  };
}>();

const emit = defineEmits<{
  (e: "quantity-input", idx: number, event: Event): void;
  (e: "adjust-quantity", idx: number, delta: number): void;
  (e: "remove-row", idx: number): void;
  (e: "rate-input", idx: number, event: Event): void;
}>();

const formatMoney = (n: number) => (Number.isFinite(n) ? n.toFixed(2) : "0.00");
</script>
