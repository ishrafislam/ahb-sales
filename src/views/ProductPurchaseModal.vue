<template>
  <!-- eslint-disable -->
  <div class="flex flex-1 min-h-0 w-[700px] max-w-full">
    <!-- Left list -->
    <div class="w-[30%] border-r border-gray-200 flex flex-col">
      <div ref="leftListRef" class="flex-grow overflow-y-auto">
        <ul>
          <li
            v-for="id in idList"
            :key="id"
            class="px-4 py-3 border-b border-gray-200 cursor-pointer hover:bg-gray-100"
            :class="{ 'bg-blue-100': id === selectedId }"
            :data-id="id"
            @click="select(id)"
          >
            <div class="flex items-center">
              <div class="font-medium text-sm w-10">
                {{ id }}
              </div>
              <div class="text-sm text-gray-600 ml-4">
                {{ productsById.get(id)?.nameBn || "" }}
              </div>
            </div>
          </li>
        </ul>
      </div>
    </div>

    <!-- Right form -->
    <div class="w-[70%] p-6 flex flex-col overflow-hidden">
      <form class="space-y-4" @submit.prevent="submit">
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-600">
              {{ t("product_id") }}
            </label>
            <input
              :value="String(selectedId)"
              class="mt-1 block w-full bg-gray-50 border border-gray-300 rounded-md py-2 px-3 sm:text-sm"
              type="text"
              readonly
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-600">
              {{ t("product_name") }}
            </label>
            <input
              :value="selected?.nameBn || ''"
              class="mt-1 block w-full bg-gray-50 border border-gray-300 rounded-md py-2 px-3 sm:text-sm"
              type="text"
              readonly
            />
          </div>
        </div>

        <div class="grid grid-cols-[1fr_auto] gap-3 items-end">
          <div>
            <label class="block text-sm font-medium text-gray-600">
              {{ t("quantity") }}
            </label>
            <input
              v-model.number="quantity"
              class="w-full bg-gray-50 border border-gray-300 rounded-md px-3 py-2 text-sm"
              type="number"
              min="1"
              :disabled="!exists"
            />
          </div>
          <div class="pb-2 text-sm text-gray-700">
            <span class="inline-block mt-6">
              {{ unitLabel }}
            </span>
          </div>
        </div>

        <div class="flex justify-end gap-2">
          <button
            class="bg-green-600 text-white py-2 px-4 rounded-md text-sm font-semibold hover:bg-green-700 disabled:opacity-50"
            :disabled="!canSubmit"
            type="submit"
          >
            {{ t("add_to_stock") }}
          </button>
        </div>

        <p v-if="!exists" class="text-red-600 text-sm">
          {{ t("no_product_found") }}
        </p>
      </form>
    </div>
  </div>
  <!-- Success toast -->
  <div
    v-if="showSuccess"
    class="fixed bottom-4 right-4 bg-green-600 text-white px-4 py-2 rounded shadow-lg"
  >
    {{ successMessage }}
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: "AhbProductPurchaseModal" });
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from "vue";
import { t } from "../i18n";

type Prod = { id: number; nameBn: string; unit: string };

const products = ref<Prod[]>([]);
const selectedId = ref<number>(1);
const quantity = ref<number>(1);

const idList = computed(() => Array.from({ length: 1000 }, (_, i) => i + 1));
const productsById = computed(() => {
  const m = new Map<number, Prod>();
  for (const p of products.value) m.set(p.id, p);
  return m;
});
const selected = computed(
  () => productsById.value.get(selectedId.value) || null
);
const exists = computed(() => productsById.value.has(selectedId.value));
const unitLabel = computed(() =>
  selected.value ? selected.value.unit : "unit"
);
const canSubmit = computed(
  () => exists.value && Number.isFinite(quantity.value) && quantity.value > 0
);

function select(id: number) {
  selectedId.value = id;
}

async function loadProducts() {
  const list = await window.ahb.listProducts({ activeOnly: false });
  products.value = list.map((p) => ({
    id: p.id,
    nameBn: p.nameBn,
    unit: p.unit,
  }));
}

async function submit() {
  if (!canSubmit.value || !selected.value) return;
  await window.ahb.postPurchase({
    productId: selected.value.id,
    quantity: quantity.value,
  });
  // Success toast
  showSuccess.value = true;
  successMessage.value = t("added_to_stock", {
    qty: quantity.value,
    unit: unitLabel.value,
    id: selected.value.id,
  });
  setTimeout(() => (showSuccess.value = false), 2500);
  // reset qty but keep selection
  quantity.value = 1;
}

// Scroll selected item into view (left list)
const leftListRef = ref<HTMLElement | null>(null);
async function scrollSelectedIntoView() {
  await nextTick();
  const el = leftListRef.value?.querySelector(
    `[data-id="${selectedId.value}"]`
  ) as HTMLElement | null;
  if (el && typeof el.scrollIntoView === "function") {
    el.scrollIntoView({ block: "nearest" });
  }
}

let off: null | (() => void) = null;
onMounted(async () => {
  await loadProducts();
  await scrollSelectedIntoView();
  off = window.ahb.onDataChanged((p) => {
    if (p.kind === "product" || p.kind === "purchase") {
      void loadProducts().then(() => scrollSelectedIntoView());
    }
  });
});
onUnmounted(() => {
  if (off) off();
});

watch(selectedId, () => {
  void scrollSelectedIntoView();
});

const showSuccess = ref(false);
const successMessage = ref("");
</script>
