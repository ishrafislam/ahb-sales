<template>
  <div class="flex flex-1 min-h-0">
    <!-- Left list: products 1..1000 -->
    <div
      class="w-[30%] border-r border-gray-200 dark:border-gray-700 flex flex-col"
    >
      <div ref="leftListRef" class="flex-grow overflow-y-auto">
        <ul>
          <li
            v-for="id in idList"
            :key="id"
            class="px-4 py-3 border-b border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
            :class="{
              'bg-blue-100': selectedId === id,
              'dark:bg-blue-950': selectedId === id,
            }"
            :data-id="id"
            @click="onSelectProduct(id)"
          >
            <div class="flex items-center">
              <div
                class="font-medium text-sm w-10 text-gray-700 dark:text-gray-100"
              >
                {{ id }}
              </div>
              <div class="text-sm text-gray-600 dark:text-gray-300 ml-4">
                {{ productsById.get(id)?.nameBn || "" }}
              </div>
            </div>
          </li>
        </ul>
      </div>
    </div>

    <!-- Right table: purchase lines -->
    <div class="w-[70%] p-6 flex flex-col overflow-hidden">
      <div class="flex-grow overflow-x-auto">
        <table
          class="w-full text-left text-sm text-gray-900 dark:text-gray-100"
        >
          <thead
            class="bg-gray-50 border-b border-gray-200 dark:bg-gray-800 dark:border-gray-700"
          >
            <tr>
              <th class="p-2 text-gray-700 dark:text-gray-200">
                {{ t("date") }}
              </th>
              <th class="p-2 text-center text-gray-700 dark:text-gray-200">
                {{ t("quantity") }}
              </th>
              <th class="p-2 text-gray-700 dark:text-gray-200">
                {{ t("unit") }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in rows"
              :key="row.date + '-' + row.productId + '-' + row.quantity"
              class="border-t border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              <td class="p-2">
                {{ formatDate(row.date) }}
              </td>
              <td class="p-2 text-center">
                {{ row.quantity }}
              </td>
              <td class="p-2">
                {{ row.unit }}
              </td>
            </tr>
            <tr v-if="!rows.length">
              <td
                class="p-2 text-center text-gray-500 dark:text-gray-400"
                colspan="3"
              >
                {{ t("no_purchases") }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: "AhbProductPurchaseHistoryView" });
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from "vue";
import { t } from "../i18n";

type Prod = { id: number; nameBn: string };

const products = ref<Prod[]>([]);
const selectedId = ref<number>(1);
const idList = computed(() => Array.from({ length: 1000 }, (_, i) => i + 1));
const productsById = computed(() => {
  const m = new Map<number, Prod>();
  for (const p of products.value) m.set(p.id, p);
  return m;
});
const rows = ref<Awaited<ReturnType<typeof window.ahb.listProductPurchases>>>(
  []
);
function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("en-GB");
  } catch {
    return iso;
  }
}

function onSelectProduct(id: number) {
  selectedId.value = id;
  void loadPurchases();
  void scrollSelectedIntoView();
}

async function loadProducts() {
  const list = await window.ahb.listProducts({ activeOnly: false });
  products.value = list.map((p) => ({ id: p.id, nameBn: p.nameBn }));
}
async function loadPurchases() {
  rows.value = await window.ahb.listProductPurchases(selectedId.value);
}

let off: null | (() => void) = null;
onMounted(async () => {
  await loadProducts();
  await loadPurchases();
  await scrollSelectedIntoView();
  off = window.ahb.onDataChanged((p) => {
    if (p.kind === "product" || p.kind === "purchase") {
      void loadProducts();
      void loadPurchases();
      void scrollSelectedIntoView();
    }
  });
});
onUnmounted(() => {
  if (off) off();
});

const leftListRef = ref<HTMLElement | null>(null);
async function scrollSelectedIntoView() {
  await nextTick();
  const container = leftListRef.value;
  if (!container) return;
  const el = container.querySelector(
    `[data-id="${selectedId.value}"]`
  ) as HTMLElement | null;
  if (el) el.scrollIntoView({ block: "nearest" });
}

watch(selectedId, () => {
  void scrollSelectedIntoView();
});
</script>
