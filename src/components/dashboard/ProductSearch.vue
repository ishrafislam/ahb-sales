<template>
  <div
    class="border-t border-gray-200 dark:border-gray-700 mt-4 pt-4 flex items-center gap-2"
  >
    <div class="relative flex-grow">
      <input
        id="search-product"
        v-model="localQuery"
        name="search-product"
        type="text"
        :placeholder="placeholder"
        class="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md pl-3 pr-2 py-2 text-sm dark:text-gray-100"
        @focus="emit('focus')"
        @input="emit('input', localQuery)"
        @keydown.down.prevent="emit('keydown-down')"
        @keydown.up.prevent="emit('keydown-up')"
        @keydown.enter.prevent="emit('keydown-enter')"
        @keydown.esc.prevent="emit('keydown-esc')"
      />
      <div
        v-if="dropdownOpen && filteredProducts.length"
        class="absolute bottom-full left-0 w-full mb-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-10 max-h-60 overflow-y-auto"
      >
        <ul class="text-sm">
          <li
            v-for="(p, idx) in filteredProducts"
            :key="p.id"
            class="px-4 py-2 cursor-pointer dark:hover:bg-gray-800"
            :class="
              idx === highlightIndex
                ? 'bg-gray-100 dark:bg-gray-700'
                : 'hover:bg-gray-50'
            "
            @click="emit('select', p)"
          >
            <div class="flex justify-between">
              <span class="font-medium">{{ p.nameBn }}</span>
              <span class="text-gray-500 dark:text-gray-400"
                >{{ idLabel }}: {{ p.id }}</span
              >
            </div>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: "ProductSearch" });
import { ref, watch } from "vue";

type Product = {
  id: number;
  nameBn: string;
  unit: string;
  price: number;
  stock: number;
  active: boolean;
};

const props = defineProps<{
  modelValue: string;
  filteredProducts: Product[];
  dropdownOpen: boolean;
  highlightIndex: number;
  placeholder: string;
  idLabel: string;
}>();

const emit = defineEmits<{
  (e: "update:modelValue", value: string): void;
  (e: "focus"): void;
  (e: "input", value: string): void;
  (e: "keydown-down"): void;
  (e: "keydown-up"): void;
  (e: "keydown-enter"): void;
  (e: "keydown-esc"): void;
  (e: "select", product: Product): void;
}>();

const localQuery = ref(props.modelValue);

watch(
  () => props.modelValue,
  (newVal) => {
    localQuery.value = newVal;
  }
);

watch(localQuery, (newVal) => {
  emit("update:modelValue", newVal);
});
</script>
