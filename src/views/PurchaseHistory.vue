<template>
  <div class="flex flex-1 min-h-0">
    <!-- Left: slot list -->
    <div
      class="w-[32%] border-r border-gray-200 dark:border-gray-700 flex flex-col min-h-0"
    >
      <div
        ref="leftListRef"
        class="flex-grow scrollbar-always focus:outline-none"
        tabindex="0"
        @keydown.down.prevent="move(1)"
        @keydown.up.prevent="move(-1)"
      >
        <ul>
          <li
            v-for="id in idList"
            :key="id"
            class="flex items-center border-b border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
            :class="{ 'bg-blue-100 dark:bg-blue-950': id === selectedId }"
            :data-id="id"
            @click="select(id)"
          >
            <div
              class="w-14 shrink-0 px-3 py-2 text-sm text-center border-r border-gray-200 dark:border-gray-700 dark:text-gray-100"
            >
              {{ id }}
            </div>
            <div
              class="px-3 py-2 text-sm truncate text-gray-700 dark:text-gray-200"
            >
              {{ productsById.get(id)?.nameBn || "" }}
            </div>
          </li>
        </ul>
      </div>
    </div>

    <!-- Right: purchase history -->
    <div class="flex-1 min-w-0 p-6 flex flex-col min-h-0">
      <HistoryTable
        :columns="[t('date'), t('amount'), t('unit')]"
        :rows="purchaseCells"
        :empty-text="t('no_purchases')"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: "AhbPurchaseHistory" });
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from "vue";
import { t } from "../i18n";
import HistoryTable from "../components/HistoryTable.vue";
import { MAX_PRODUCT_ID } from "../constants/business";

interface ProductRow {
  id: number;
  nameBn: string;
}

interface PurchaseRow {
  date: string;
  unit: string;
  quantity: number;
}

const products = ref<ProductRow[]>([]);
const purchases = ref<PurchaseRow[]>([]);

// Opened either bare or as `#purchase-history/<productId>`
function initialSelectedId(): number {
  const [, raw] = window.location.hash.replace(/^#/, "").split("/");
  const id = Number(raw);
  if (!Number.isInteger(id) || id < 1 || id > MAX_PRODUCT_ID) return 1;
  return id;
}
const selectedId = ref<number>(initialSelectedId());

const idList = computed(() =>
  Array.from({ length: MAX_PRODUCT_ID }, (_, i) => i + 1)
);
const productsById = computed(() => {
  const m = new Map<number, ProductRow>();
  for (const p of products.value) m.set(p.id, p);
  return m;
});

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB");
}

const purchaseCells = computed(() =>
  purchases.value.map((p) => [
    formatDate(p.date),
    String(p.quantity),
    p.unit,
  ])
);

function select(id: number) {
  if (id === selectedId.value) return;
  selectedId.value = id;
  void loadPurchases(id);
  void scrollSelectedIntoView();
}

// Arrow keys traverse the list while it has focus (clicking a row focuses
// the container, since it is tabbable)
function move(delta: number) {
  const next = selectedId.value + delta;
  if (next < 1 || next > MAX_PRODUCT_ID) return;
  select(next);
}

async function load() {
  const list = await window.ahb.listProducts({ activeOnly: false });
  products.value = list.map((p) => ({ id: p.id, nameBn: p.nameBn }));
}

async function loadPurchases(id: number) {
  purchases.value = [];
  let list;
  try {
    list = await window.ahb.listProductPurchases(id);
  } catch {
    return;
  }
  // Arrow keys can move the selection on before this resolves
  if (id !== selectedId.value) return;
  purchases.value = (list || []).map((p) => ({
    date: p.date,
    unit: p.unit,
    quantity: p.quantity,
  }));
}

let off: null | (() => void) = null;
onMounted(async () => {
  await load();
  await loadPurchases(selectedId.value);
  await scrollSelectedIntoView();
  // Arrow keys work straight away, without clicking the list first
  leftListRef.value?.focus();
  off = window.ahb.onDataChanged((payload) => {
    if (payload.kind === "product" || payload.kind === "purchase") {
      void load();
      void loadPurchases(selectedId.value);
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
  if (el && typeof el.scrollIntoView === "function") {
    el.scrollIntoView({ block: "nearest" });
  }
}

watch(selectedId, () => {
  void scrollSelectedIntoView();
});
</script>
