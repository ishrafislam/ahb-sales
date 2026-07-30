<template>
  <div class="flex flex-1 min-h-0">
    <!-- Left: slot list -->
    <div
      class="w-[26%] border-r border-gray-200 dark:border-gray-700 flex flex-col min-h-0"
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

    <!-- Middle: item details, read-only -->
    <div class="w-[32%] shrink-0 p-6 flex flex-col gap-4 overflow-y-auto">
      <div>
        <label :class="labelClass" for="item-id">{{ t("item_id") }}</label>
        <input
          id="item-id"
          :value="String(selectedId)"
          :class="fieldClass"
          type="text"
          disabled
        />
      </div>

      <div>
        <label :class="labelClass" for="item-name">{{ t("item_name") }}</label>
        <input
          id="item-name"
          :value="selected?.nameBn || ''"
          :class="fieldClass"
          type="text"
          disabled
        />
      </div>

      <div>
        <label :class="labelClass" for="item-details">{{
          t("item_details")
        }}</label>
        <textarea
          id="item-details"
          :value="selected?.description || ''"
          :class="fieldClass"
          rows="2"
          disabled
        ></textarea>
      </div>

      <div class="grid grid-cols-2 gap-4">
        <div>
          <label :class="labelClass" for="item-stock">{{ t("stock") }}</label>
          <input
            id="item-stock"
            :value="stockText"
            :class="[fieldClass, 'text-right']"
            type="text"
            disabled
          />
        </div>
        <div>
          <label :class="labelClass" for="item-unit">{{ t("unit") }}</label>
          <input
            id="item-unit"
            :value="selected?.unit || ''"
            :class="fieldClass"
            type="text"
            disabled
          />
        </div>
      </div>

      <div>
        <label :class="labelClass" for="item-last-purchase-date">{{
          t("last_purchase_date")
        }}</label>
        <input
          id="item-last-purchase-date"
          :value="lastPurchaseDateText"
          :class="fieldClass"
          type="text"
          disabled
        />
      </div>

      <div>
        <label :class="labelClass" for="item-last-purchase-amount">{{
          t("last_purchase_amount")
        }}</label>
        <input
          id="item-last-purchase-amount"
          :value="lastPurchaseQtyText"
          :class="[fieldClass, 'text-right']"
          type="text"
          disabled
        />
      </div>
    </div>

    <!-- Right: purchase history + stock entry -->
    <div class="flex-1 min-w-0 p-6 flex flex-col gap-4 min-h-0">
      <PurchaseHistoryTable :rows="purchases" />

      <div class="grid grid-cols-2 gap-4">
        <div>
          <label :class="labelClass" for="purchase-date">{{ t("date") }}</label>
          <input
            id="purchase-date"
            :value="todayText"
            :class="[fieldClass, 'text-right']"
            type="text"
            disabled
          />
        </div>
        <div>
          <label :class="labelClass" for="purchase-amount">{{
            t("amount")
          }}</label>
          <input
            id="purchase-amount"
            v-model="amountText"
            :class="[fieldClass, 'text-right no-spinner']"
            type="number"
            min="0"
            step="0.01"
            :disabled="!exists"
          />
        </div>
      </div>

      <p v-if="error" class="text-sm text-red-600 dark:text-red-400">
        {{ error }}
      </p>

      <div class="mt-auto flex justify-end gap-3 pt-2">
        <button
          type="button"
          :class="buttonClass"
          :disabled="!canUpdate"
          @click="update"
        >
          {{ t("update") }}
        </button>
        <button type="button" :class="buttonClass" @click="close">
          {{ t("close") }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: "AhbPurchaseEntry" });
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from "vue";
import { t } from "../i18n";
import PurchaseHistoryTable from "../components/PurchaseHistoryTable.vue";
import { MAX_PRODUCT_ID, MAX_PURCHASE_QUANTITY } from "../constants/business";

interface ProductRow {
  id: number;
  nameBn: string;
  description?: string;
  unit: string;
  stock: number;
}

interface PurchaseRow {
  date: string;
  unit: string;
  quantity: number;
}

const products = ref<ProductRow[]>([]);
const purchases = ref<PurchaseRow[]>([]);
// A number input hands back a number, an empty box an empty string
const amountText = ref<string | number>("");
const error = ref("");
const lastPurchaseDateText = ref("");
const lastPurchaseQtyText = ref("");

// Opened either bare or as `#purchase-entry/<productId>` from the item form
function initialSelectedId(): number {
  const [, raw] = window.location.hash.replace(/^#/, "").split("/");
  const id = Number(raw);
  if (!Number.isInteger(id) || id < 1 || id > MAX_PRODUCT_ID) return 1;
  return id;
}
const selectedId = ref<number>(initialSelectedId());

// Purchases are always stamped with the current date by the main process
const todayText = new Date().toLocaleDateString("en-GB");

const idList = computed(() =>
  Array.from({ length: MAX_PRODUCT_ID }, (_, i) => i + 1)
);
const productsById = computed(() => {
  const m = new Map<number, ProductRow>();
  for (const p of products.value) m.set(p.id, p);
  return m;
});

const exists = computed(() => productsById.value.has(selectedId.value));
const selected = computed(() => productsById.value.get(selectedId.value));
const stockText = computed(() =>
  selected.value ? String(selected.value.stock) : ""
);

const amountValue = computed(() => Number(amountText.value));
const canUpdate = computed(
  () =>
    exists.value &&
    Number.isFinite(amountValue.value) &&
    amountValue.value > 0 &&
    amountValue.value <= MAX_PURCHASE_QUANTITY
);

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB");
}

function select(id: number) {
  if (id === selectedId.value) return;
  selectedId.value = id;
  // A typed amount belongs to the item it was typed for
  amountText.value = "";
  error.value = "";
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
  products.value = list.map((p) => ({
    id: p.id,
    nameBn: p.nameBn,
    description: p.description,
    unit: p.unit,
    stock: Number(p.stock || 0),
  }));
}

// One fetch feeds both the table and the last-purchase fields
async function loadPurchases(id: number) {
  purchases.value = [];
  lastPurchaseDateText.value = "";
  lastPurchaseQtyText.value = "";
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
  const latest = purchases.value[0];
  if (!latest) return;
  lastPurchaseDateText.value = formatDate(latest.date);
  lastPurchaseQtyText.value = String(latest.quantity);
}

async function update() {
  if (!canUpdate.value) return;
  error.value = "";
  try {
    await window.ahb.postPurchase({
      productId: selectedId.value,
      quantity: amountValue.value,
    });
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e);
    return;
  }
  // Ready for the next entry; Update disables itself again
  amountText.value = "";
  await load();
  await loadPurchases(selectedId.value);
}

function close() {
  window.close();
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

const labelClass =
  "block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1";

const fieldClass =
  "block w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md py-2 px-3 text-sm dark:text-gray-100 disabled:opacity-70 disabled:cursor-not-allowed";

const buttonClass =
  "min-w-[7rem] bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors rounded-md py-2 px-4 text-sm dark:text-gray-100 disabled:opacity-70 disabled:cursor-not-allowed";
</script>
