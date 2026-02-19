<template>
  <div
    id="customer-search-container"
    class="bg-white dark:bg-gray-900 dark:text-gray-100 p-4 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 relative"
  >
    <div class="relative w-full">
      <input
        id="search-customer"
        v-model="localQuery"
        name="search-customer"
        type="text"
        :placeholder="placeholder"
        class="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md pl-3 pr-8 py-1.5 text-sm dark:text-gray-100"
        @focus="emit('focus')"
        @input="emit('input', localQuery)"
        @keydown.down.prevent="emit('keydown-down')"
        @keydown.up.prevent="emit('keydown-up')"
        @keydown.enter.prevent="emit('keydown-enter')"
        @keydown.esc.prevent="emit('keydown-esc')"
      />
      <button
        v-if="selectedCustomer || localQuery"
        type="button"
        class="absolute inset-y-0 right-2 my-auto flex items-center text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
        :aria-label="clearLabel"
        @click="emit('clear')"
      >
        <span aria-hidden="true">×</span>
        <span class="sr-only">{{ clearLabel }}</span>
      </button>
    </div>
    <div
      v-if="dropdownOpen && filteredCustomers.length"
      class="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md shadow-lg z-10 max-h-64 overflow-auto"
    >
      <ul ref="listRef" class="divide-y divide-gray-200 dark:divide-gray-700">
        <li
          v-for="(c, idx) in filteredCustomers"
          :key="c.id"
          class="p-3 cursor-pointer dark:hover:bg-gray-800"
          :class="
            idx === highlightIndex
              ? 'bg-gray-100 dark:bg-gray-700'
              : 'hover:bg-gray-50'
          "
          @click="emit('select', c)"
        >
          <div class="flex justify-between items-center">
            <span v-if="c.nameBn" class="font-medium text-sm">{{ c.nameBn }}</span>
            <span v-else class="text-xs text-gray-400 dark:text-gray-500 italic">
              {{ emptySlotLabel }}
            </span>
            <span class="text-xs text-gray-500 dark:text-gray-400">{{
              c.id
            }}</span>
          </div>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: "CustomerSearch" });
import { ref, watch, nextTick } from "vue";

type Customer = {
  id: number;
  nameBn: string;
  outstanding?: number;
};

const props = defineProps<{
  modelValue: string;
  selectedCustomer: Customer | null;
  filteredCustomers: Customer[];
  dropdownOpen: boolean;
  highlightIndex: number;
  placeholder: string;
  clearLabel: string;
  emptySlotLabel: string;
}>();

const emit = defineEmits<{
  (e: "update:modelValue", value: string): void;
  (e: "focus"): void;
  (e: "input", value: string): void;
  (e: "keydown-down"): void;
  (e: "keydown-up"): void;
  (e: "keydown-enter"): void;
  (e: "keydown-esc"): void;
  (e: "clear"): void;
  (e: "select", customer: Customer): void;
}>();

const localQuery = ref(props.modelValue);
const listRef = ref<HTMLUListElement | null>(null);

watch(
  () => props.modelValue,
  (newVal) => {
    localQuery.value = newVal;
  }
);

watch(localQuery, (newVal) => {
  emit("update:modelValue", newVal);
});

watch(
  () => props.highlightIndex,
  async (idx) => {
    await nextTick();
    (listRef.value?.children[idx] as HTMLElement | undefined)?.scrollIntoView({ block: "nearest" });
  }
);
</script>
