<template>
  <!-- eslint-disable -->
  <div class="flex flex-1 min-h-0">
    <!-- Left list -->
    <div
      class="w-[30%] border-r border-gray-200 dark:border-gray-700 flex flex-col"
    >
      <div ref="leftListRef" class="flex-grow overflow-y-auto">
        <ul>
          <li
            v-for="id in idList"
            :key="id"
            class="px-4 py-3 border-b border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
            :class="{ 'bg-blue-100 dark:bg-blue-950': id === selectedId }"
            :data-id="id"
            @click="select(id)"
          >
            <div class="flex items-center">
              <div class="font-medium text-sm w-10 dark:text-gray-100">
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

    <!-- Right details -->
    <div class="w-[70%] p-6 flex flex-col overflow-hidden">
      <div class="flex-grow pr-2 overflow-hidden">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-x-8">
          <div class="flex flex-col space-y-4">
            <div>
              <label
                for="item-id"
                class="block text-sm font-medium text-gray-600 dark:text-gray-300"
              >
                {{ t("item_id") }}
              </label>
              <input
                id="item-id"
                :value="displayId"
                class="mt-1 block w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md py-2 px-3 sm:text-sm dark:text-gray-100"
                type="text"
                readonly
              />
            </div>
            <div>
              <label
                for="item-name"
                class="block text-sm font-medium text-gray-600 dark:text-gray-300"
              >
                {{ t("item_name") }}
              </label>
              <input
                id="item-name"
                v-model="form.nameBn"
                class="mt-1 block w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md py-2 px-3 sm:text-sm dark:text-gray-100"
                type="text"
              />
            </div>
            <div>
              <label
                for="description"
                class="block text-sm font-medium text-gray-600 dark:text-gray-300"
              >
                {{ t("description") }}
              </label>
              <textarea
                id="description"
                v-model="form.description"
                class="mt-1 block w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md py-2 px-3 sm:text-sm dark:text-gray-100"
                rows="2"
              ></textarea>
            </div>
            <div>
              <label
                for="unit-price"
                class="block text-sm font-medium text-gray-600 dark:text-gray-300"
              >
                {{ t("unit_price") }}
              </label>
              <input
                id="unit-price"
                v-model.number="form.price"
                class="mt-1 block w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md py-2 px-3 sm:text-sm dark:text-gray-100"
                type="number"
              />
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label
                  for="stock"
                  class="block text-sm font-medium text-gray-600 dark:text-gray-300"
                >
                  {{ t("stock") }}
                </label>
                <input
                  id="stock"
                  v-model.number="form.stock"
                  class="mt-1 block w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md py-2 px-3 sm:text-sm dark:text-gray-100 disabled:opacity-60 disabled:cursor-not-allowed"
                  type="number"
                  :disabled="exists"
                />
                <p
                  v-if="exists"
                  class="mt-1 text-xs text-gray-500 dark:text-gray-400"
                >
                  {{ t("stock_managed_note") }}
                </p>
              </div>
              <div>
                <label
                  for="unit"
                  class="block text-sm font-medium text-gray-600 dark:text-gray-300"
                >
                  {{ t("unit") }}
                </label>
                <input
                  id="unit"
                  v-model="form.unit"
                  class="mt-1 block w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md py-2 px-3 sm:text-sm dark:text-gray-100"
                  type="text"
                />
              </div>
            </div>
            <div>
              <label
                class="block text-sm font-medium text-gray-600 dark:text-gray-300"
              >
                {{ t("status") }}
              </label>
              <div class="mt-2 flex items-center space-x-4">
                <label class="flex items-center">
                  <input
                    v-model="statusRadio"
                    class="h-4 w-4 text-blue-600"
                    type="radio"
                    value="active"
                  />
                  <span class="ml-2 text-sm">{{ t("active") }}</span>
                </label>
                <label class="flex items-center">
                  <input
                    v-model="statusRadio"
                    class="h-4 w-4 text-blue-600"
                    type="radio"
                    value="inactive"
                  />
                  <span class="ml-2 text-sm">{{ t("inactive") }}</span>
                </label>
              </div>
            </div>
          </div>
          <div class="flex flex-col space-y-2 justify-start pt-6">
            <button
              class="w-full text-center bg-gray-200 text-gray-900 dark:bg-gray-700 dark:text-gray-100 py-2 px-4 rounded-md text-sm font-semibold hover:bg-gray-300 dark:hover:bg-gray-600"
              @click="first"
            >
              {{ t("first") }}
            </button>
            <button
              class="w-full text-center bg-gray-200 text-gray-900 dark:bg-gray-700 dark:text-gray-100 py-2 px-4 rounded-md text-sm font-semibold hover:bg-gray-300 dark:hover:bg-gray-600"
              @click="previous"
            >
              {{ t("previous") }}
            </button>
            <button
              class="w-full text-center bg-gray-200 text-gray-900 dark:bg-gray-700 dark:text-gray-100 py-2 px-4 rounded-md text-sm font-semibold hover:bg-gray-300 dark:hover:bg-gray-600"
              @click="next"
            >
              {{ t("next") }}
            </button>
            <button
              class="w-full text-center bg-gray-200 text-gray-900 dark:bg-gray-700 dark:text-gray-100 py-2 px-4 rounded-md text-sm font-semibold hover:bg-gray-300 dark:hover:bg-gray-600"
              @click="last"
            >
              {{ t("last") }}
            </button>
            <button
              class="w-full text-center bg-green-600 text-white py-2 px-4 rounded-md text-sm font-semibold hover:bg-green-700 mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
              :disabled="exists || !canAdd"
              @click="add"
            >
              {{ t("add") }}
            </button>
            <button
              class="w-full text-center bg-blue-600 text-white py-2 px-4 rounded-md text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              :disabled="!exists || !isDirty"
              @click="update"
            >
              {{ t("update") }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from "vue";
import { t } from "../i18n";

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

const form = ref({
  nameBn: "",
  description: "",
  unit: "unit",
  price: 0,
  stock: 0,
  active: true,
});

const idList = computed(() => Array.from({ length: 1000 }, (_, i) => i + 1));
const productsById = computed(() => {
  const m = new Map<number, ProductRow>();
  for (const p of products.value) m.set(p.id, p);
  return m;
});

const exists = computed(() => productsById.value.has(selectedId.value));
const statusRadio = computed({
  get: () => (form.value.active ? "active" : "inactive"),
  set: (v: string) => {
    form.value.active = v === "active";
  },
});

const displayId = computed(() => String(selectedId.value));

function syncFromSelected() {
  const p = productsById.value.get(selectedId.value);
  if (p) {
    form.value.nameBn = p.nameBn || "";
    form.value.unit = p.unit || "unit";
    form.value.price = Number(p.price || 0);
    form.value.stock = Number(p.stock || 0);
    form.value.active = !!p.active;
    form.value.description = p.description || "";
  } else {
    form.value.nameBn = "";
    form.value.unit = "unit";
    form.value.price = 0;
    form.value.stock = 0;
    form.value.active = true;
    form.value.description = "";
  }
}

function select(id: number) {
  selectedId.value = id;
  syncFromSelected();
  void scrollSelectedIntoView();
}

async function load() {
  const prevSelected = selectedId.value;
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
  // Preserve selection if still valid; otherwise, fall back to first existing (if any)
  if (!productsById.value.has(prevSelected)) {
    if (products.value.length) {
      selectedId.value = Math.min(1000, Math.max(1, products.value[0].id));
    } else {
      selectedId.value = prevSelected;
    }
  }
  syncFromSelected();
  await scrollSelectedIntoView();
}

function first() {
  select(1);
}
function last() {
  select(1000);
}
function previous() {
  select(Math.max(1, selectedId.value - 1));
}
function next() {
  select(Math.min(1000, selectedId.value + 1));
}

const canAdd = computed(() => form.value.nameBn.trim().length > 0);
const isDirty = computed(() => {
  const p = productsById.value.get(selectedId.value);
  if (!p) return false;
  return (
    (p.nameBn || "") !== form.value.nameBn ||
    (p.description || "") !== form.value.description ||
    (p.unit || "unit") !== form.value.unit ||
    Number(p.price || 0) !== Number(form.value.price || 0) ||
    // Stock is not editable for existing products; ignore in dirty check
    !!p.active !== !!form.value.active
  );
});

async function add() {
  if (exists.value || !canAdd.value) return;
  await window.ahb.addProduct({
    id: selectedId.value,
    nameBn: form.value.nameBn,
    description: form.value.description,
    unit: form.value.unit,
    price: form.value.price,
    stock: form.value.stock,
    active: form.value.active,
  });
  await load();
}

async function update() {
  if (!exists.value || !isDirty.value) return;
  await window.ahb.updateProduct(selectedId.value, {
    nameBn: form.value.nameBn,
    description: form.value.description,
    unit: form.value.unit,
    price: form.value.price,
    active: form.value.active,
  });
  await load();
}

let off: null | (() => void) = null;
onMounted(() => {
  load();
  void scrollSelectedIntoView();
  off = window.ahb.onDataChanged((payload) => {
    if (payload.kind === "product") {
      load();
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
