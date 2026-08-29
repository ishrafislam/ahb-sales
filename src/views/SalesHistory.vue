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
              {{ ld(id) }}
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

    <!-- Right: sale history -->
    <div class="flex-1 min-w-0 p-6 flex flex-col min-h-0">
      <HistoryTable
        :columns="[t('date'), t('customer_id'), t('customer_name'), t('amount')]"
        :rows="saleCells"
        :empty-text="t('no_sales')"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: "AhbSalesHistory" });
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from "vue";
import { t } from "../i18n";
import HistoryTable from "../components/HistoryTable.vue";
import { localizeDigits as ld } from "../utils/numerals";
import { MAX_PRODUCT_ID } from "../constants/business";

interface ProductRow {
  id: number;
  nameBn: string;
}

interface SaleRow {
  date: string;
  customerId: number;
  customerNameBn?: string;
  quantity: number;
}

const products = ref<ProductRow[]>([]);
const sales = ref<SaleRow[]>([]);

// Opened either bare or as `#sales-history/<productId>`
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

// A customer created from an empty slot has an id but no name yet
const saleCells = computed(() =>
  sales.value.map((s) => [
    ld(formatDate(s.date)),
    ld(s.customerId),
    s.customerNameBn || "",
    ld(s.quantity),
  ])
);

function select(id: number) {
  if (id === selectedId.value) return;
  selectedId.value = id;
  void loadSales(id);
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

async function loadSales(id: number) {
  sales.value = [];
  let list;
  try {
    list = await window.ahb.listProductSales(id);
  } catch {
    return;
  }
  // Arrow keys can move the selection on before this resolves
  if (id !== selectedId.value) return;
  sales.value = (list || []).map((s) => ({
    date: s.date,
    customerId: s.customerId,
    customerNameBn: s.customerNameBn,
    quantity: s.quantity,
  }));
}

let off: null | (() => void) = null;
onMounted(async () => {
  await load();
  await loadSales(selectedId.value);
  await scrollSelectedIntoView();
  // Arrow keys work straight away, without clicking the list first
  leftListRef.value?.focus();
  off = window.ahb.onDataChanged((payload) => {
    if (payload.kind === "invoice" || payload.kind === "product") {
      void load();
      void loadSales(selectedId.value);
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
