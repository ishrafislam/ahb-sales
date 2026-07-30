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

    <!-- Right: detail form -->
    <div class="flex-1 min-w-0 p-6 flex flex-col gap-4 overflow-y-auto">
      <div class="grid grid-cols-2 gap-4">
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
          <label :class="labelClass" for="item-name">{{
            t("item_name")
          }}</label>
          <input
            id="item-name"
            ref="nameInput"
            v-model="form.nameBn"
            :class="fieldClass"
            type="text"
            :disabled="!unlocked"
          />
        </div>
      </div>

      <div>
        <label :class="labelClass" for="item-details">{{
          t("item_details")
        }}</label>
        <textarea
          id="item-details"
          v-model="form.description"
          :class="fieldClass"
          rows="2"
          :disabled="!unlocked"
        ></textarea>
      </div>

      <div class="grid grid-cols-2 gap-4">
        <div>
          <label :class="labelClass" for="item-price">{{
            t("unit_price")
          }}</label>
          <input
            id="item-price"
            v-model="form.price"
            :class="[fieldClass, 'text-right no-spinner']"
            type="number"
            step="0.01"
            :disabled="!unlocked"
          />
        </div>
        <div>
          <label :class="labelClass" for="item-unit">{{ t("unit") }}</label>
          <input
            id="item-unit"
            v-model="form.unit"
            :class="fieldClass"
            type="text"
            :disabled="!unlocked"
          />
        </div>
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
          <label :class="labelClass">{{ t("status") }}</label>
          <div class="flex items-center gap-6 py-2">
            <label class="flex items-center">
              <input
                v-model="statusRadio"
                class="h-4 w-4 text-blue-600"
                type="radio"
                value="active"
                :disabled="!unlocked"
              />
              <span class="ml-2 text-sm">{{ t("active") }}</span>
            </label>
            <label class="flex items-center">
              <input
                v-model="statusRadio"
                class="h-4 w-4 text-blue-600"
                type="radio"
                value="inactive"
                :disabled="!unlocked"
              />
              <span class="ml-2 text-sm">{{ t("inactive") }}</span>
            </label>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-4">
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

      <p v-if="error" class="text-sm text-red-600 dark:text-red-400">
        {{ error }}
      </p>

      <div class="mt-auto flex justify-end gap-3 pt-4">
        <button
          type="button"
          :class="buttonClass"
          :disabled="!exists"
          @click="openPurchaseEntry"
        >
          {{ t("purchase_entry") }}
        </button>
        <button
          v-if="!exists"
          type="button"
          :class="buttonClass"
          :disabled="!canSave"
          @click="save"
        >
          {{ t("add") }}
        </button>
        <button
          v-else-if="!editing"
          type="button"
          :class="buttonClass"
          @click="startEdit"
        >
          {{ t("edit") }}
        </button>
        <button
          v-else
          type="button"
          :class="buttonClass"
          :disabled="!canSave"
          @click="save"
        >
          {{ t("save") }}
        </button>
        <button type="button" :class="buttonClass" @click="close">
          {{ t("close") }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: "AhbProducts" });
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from "vue";
import { t } from "../i18n";
import { MAX_PRODUCT_ID } from "../constants/business";

interface ProductRow {
  id: number;
  nameBn: string;
  description?: string;
  unit: string;
  price: number;
  stock: number;
  active: boolean;
}

const products = ref<ProductRow[]>([]);
const selectedId = ref<number>(1);
const editing = ref(false);
const error = ref("");
const nameInput = ref<HTMLInputElement | null>(null);
const lastPurchaseDateText = ref("");
const lastPurchaseQtyText = ref("");

const form = ref({
  nameBn: "",
  description: "",
  unit: "unit",
  price: 0,
  active: true,
});

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

// An empty slot is an add form: editable from the moment it is selected.
// An existing item stays locked until Edit is pressed.
const unlocked = computed(() => editing.value || !exists.value);

const statusRadio = computed({
  get: () => (form.value.active ? "active" : "inactive"),
  set: (v: string) => {
    form.value.active = v === "active";
  },
});

// Stock is never edited here: it moves through purchases and sales only
const stockText = computed(() => String(selected.value?.stock ?? 0));

const canSave = computed(() => form.value.nameBn.trim().length > 0);

function syncFromSelected() {
  const p = selected.value;
  form.value.nameBn = p?.nameBn || "";
  form.value.description = p?.description || "";
  form.value.unit = p?.unit || "unit";
  form.value.price = Number(p?.price ?? 0);
  form.value.active = p ? !!p.active : true;
}

function select(id: number) {
  if (id === selectedId.value) return;
  selectedId.value = id;
  // Switching rows discards an in-progress edit
  editing.value = false;
  error.value = "";
  syncFromSelected();
  void loadLastPurchase(id);
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
    price: Number(p.price || 0),
    stock: Number(p.stock || 0),
    active: p.active !== false,
  }));
  if (!editing.value) syncFromSelected();
}

async function loadLastPurchase(id: number) {
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
  const latest = list?.[0];
  if (!latest) return;
  lastPurchaseDateText.value = new Date(latest.date).toLocaleDateString("en-GB");
  lastPurchaseQtyText.value = String(latest.quantity);
}

async function startEdit() {
  editing.value = true;
  error.value = "";
  await nextTick();
  nameInput.value?.focus();
  nameInput.value?.select();
}

async function save() {
  if (!canSave.value) return;
  error.value = "";
  const patch = {
    nameBn: form.value.nameBn.trim(),
    description: form.value.description.trim(),
    unit: form.value.unit.trim() || "unit",
    price: Number(form.value.price || 0),
    active: form.value.active,
  };
  try {
    if (exists.value) {
      await window.ahb.updateProduct(selectedId.value, patch);
    } else {
      // Stock starts at 0 and grows through purchase entry
      await window.ahb.addProduct({ id: selectedId.value, ...patch });
    }
    editing.value = false;
    await load();
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e);
  }
}

// Opens on the item being shown here
function openPurchaseEntry() {
  void window.ahb.openPurchaseEntryWindow(selectedId.value);
}

function close() {
  window.close();
}

let off: null | (() => void) = null;
onMounted(async () => {
  await load();
  await loadLastPurchase(selectedId.value);
  await scrollSelectedIntoView();
  // Arrow keys work straight away, without clicking the list first
  leftListRef.value?.focus();
  off = window.ahb.onDataChanged((payload) => {
    if (payload.kind === "product" || payload.kind === "purchase") {
      void load();
      void loadLastPurchase(selectedId.value);
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
