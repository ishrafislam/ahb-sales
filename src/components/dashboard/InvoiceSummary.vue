<template>
  <div
    class="bg-white dark:bg-gray-900 dark:text-gray-100 p-3 rounded-md shadow-sm border border-gray-200 dark:border-gray-700"
  >
    <template v-if="hasItems">
      <div class="space-y-1.5 text-sm">
        <div class="flex justify-between items-center pr-1">
          <span class="text-gray-600 dark:text-gray-300">
            {{ labels.totalPrice }}
          </span>
          <span class="font-semibold"> {{ subtotalText }} </span>
        </div>
        <div class="flex justify-between items-center">
          <span class="text-gray-600 dark:text-gray-300">
            {{ labels.discount }}
          </span>
          <input
            :value="discount"
            type="number"
            min="0"
            class="w-20 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md px-1 py-0 text-right font-semibold text-sm no-spinner dark:text-gray-100"
            @input="
              emit(
                'update:discount',
                Number(($event.target as HTMLInputElement).value)
              )
            "
          />
        </div>
        <div class="flex justify-between items-center pr-1">
          <span class="text-gray-600 dark:text-gray-300">
            {{ labels.bill }}
          </span>
          <span class="font-semibold"> {{ netText }} </span>
        </div>
        <div
          class="flex justify-between items-center mt-2 pt-2 border-t border-gray-200 dark:border-gray-700"
        >
          <span class="text-gray-600 dark:text-gray-300">
            {{ labels.paid }}
          </span>
          <input
            :value="paid"
            class="w-20 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md px-1 py-0 text-right font-semibold text-sm no-spinner dark:text-gray-100"
            type="number"
            min="0"
            :disabled="!hasCustomer"
            @input="
              emit(
                'update:paid',
                Number(($event.target as HTMLInputElement).value)
              )
            "
          />
        </div>
        <div class="flex justify-between items-center pr-1">
          <span class="text-gray-600"> {{ labels.due }} </span>
          <span class="font-semibold text-red-600"> {{ dueText }} </span>
        </div>
        <div
          class="flex justify-between items-center mt-2 pt-2 border-t border-gray-200 pr-1"
        >
          <span class="text-gray-600 dark:text-gray-300">
            {{ labels.previousDue }}
          </span>
          <span class="font-semibold"> {{ previousDueText }} </span>
        </div>
        <div class="flex justify-between items-center pr-1">
          <span class="text-red-600">
            {{ labels.netDue }}
          </span>
          <span class="font-bold text-red-600">
            {{ netDueText }}
          </span>
        </div>
        <div class="flex justify-between items-center">
          <textarea
            :value="notes"
            :placeholder="labels.comment"
            rows="2"
            class="flex-grow bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1 text-sm dark:text-gray-100"
            @input="
              emit('update:notes', ($event.target as HTMLTextAreaElement).value)
            "
          />
        </div>
        <div class="mt-2 flex items-end gap-2">
          <button
            class="flex-grow inline-flex items-center justify-center gap-2 bg-green-600 text-white py-2 px-3 mt-2 rounded-md text-sm font-semibold hover:bg-green-700 transition-colors flex-shrink-0"
            :disabled="!canComplete"
            @click="emit('complete')"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              class="w-4 h-4"
              aria-hidden="true"
            >
              <path
                fill-rule="evenodd"
                d="M16.704 5.29a1 1 0 0 1 .006 1.414l-7.5 7.5a1 1 0 0 1-1.414 0l-3-3a1 1 0 1 1 1.414-1.414l2.293 2.293 6.793-6.793a1 1 0 0 1 1.408 0z"
                clip-rule="evenodd"
              />
            </svg>
            <span>{{ labels.complete }}</span>
          </button>
        </div>
      </div>
    </template>
    <template v-else>
      <div class="text-sm text-gray-600">
        {{ labels.addProductsPrompt }}
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: "InvoiceSummary" });

defineProps<{
  hasItems: boolean;
  hasCustomer: boolean;
  subtotalText: string;
  discount: number;
  netText: string;
  paid: number;
  dueText: string;
  previousDueText: string;
  netDueText: string;
  notes: string;
  canComplete: boolean;
  labels: {
    totalPrice: string;
    discount: string;
    bill: string;
    paid: string;
    due: string;
    previousDue: string;
    netDue: string;
    comment: string;
    complete: string;
    addProductsPrompt: string;
  };
}>();

const emit = defineEmits<{
  (e: "update:discount", value: number): void;
  (e: "update:paid", value: number): void;
  (e: "update:notes", value: string): void;
  (e: "complete"): void;
}>();
</script>
