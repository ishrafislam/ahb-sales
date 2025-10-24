<template>
  <div class="flex flex-1 min-h-0">
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

    <!-- Right details -->
    <div class="w-[70%] p-6 flex flex-col overflow-hidden">
      <div class="flex-grow pr-2 overflow-hidden">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-x-8">
          <div class="flex flex-col space-y-4">
            <div>
              <label
                for="item-id"
                class="block text-sm font-medium text-gray-600"
              >
                Item ID
              </label>
              <input
                id="item-id"
                :value="displayId"
                class="mt-1 block w-full bg-gray-50 border border-gray-300 rounded-md py-2 px-3 sm:text-sm"
                type="text"
                readonly
              />
            </div>
            <div>
              <label
                for="item-name"
                class="block text-sm font-medium text-gray-600"
              >
                Item Name
              </label>
              <input
                id="item-name"
                v-model="form.nameBn"
                class="mt-1 block w-full bg-gray-50 border border-gray-300 rounded-md py-2 px-3 sm:text-sm"
                type="text"
              />
            </div>
            <div>
              <label
                for="description"
                class="block text-sm font-medium text-gray-600"
              >
                Description
              </label>
              <textarea
                id="description"
                v-model="form.description"
                class="mt-1 block w-full bg-gray-50 border border-gray-300 rounded-md py-2 px-3 sm:text-sm"
                rows="2"
              />
            </div>
            <div>
              <label
                for="unit-price"
                class="block text-sm font-medium text-gray-600"
              >
                Unit Price
              </label>
              <input
                id="unit-price"
                v-model.number="form.price"
                class="mt-1 block w-full bg-gray-50 border border-gray-300 rounded-md py-2 px-3 sm:text-sm"
                type="number"
              />
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label
                  for="stock"
                  class="block text-sm font-medium text-gray-600"
                >
                  Stock
                </label>
                <input
                  id="stock"
                  v-model.number="form.stock"
                  class="mt-1 block w-full bg-gray-50 border border-gray-300 rounded-md py-2 px-3 sm:text-sm"
                  type="number"
                />
              </div>
              <div>
                <label
                  for="unit"
                  class="block text-sm font-medium text-gray-600"
                >
                  Unit
                </label>
                <input
                  id="unit"
                  v-model="form.unit"
                  class="mt-1 block w-full bg-gray-50 border border-gray-300 rounded-md py-2 px-3 sm:text-sm"
                  type="text"
                />
              </div>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-600">
                Status
              </label>
              <div class="mt-2 flex items-center space-x-4">
                <label class="flex items-center">
                  <input
                    v-model="statusRadio"
                    class="h-4 w-4 text-blue-600"
                    type="radio"
                    value="active"
                  />
                  <span class="ml-2 text-sm">Active</span>
                </label>
                <label class="flex items-center">
                  <input
                    v-model="statusRadio"
                    class="h-4 w-4 text-blue-600"
                    type="radio"
                    value="inactive"
                  />
                  <span class="ml-2 text-sm">Inactive</span>
                </label>
              </div>
            </div>
          </div>
          <div class="flex flex-col space-y-2 justify-start pt-6">
            <button
              class="w-full text-center bg-gray-200 text-gray-900 py-2 px-4 rounded-md text-sm font-semibold hover:bg-gray-300"
              @click="first"
            >
              First
            </button>
            <button
              class="w-full text-center bg-gray-200 text-gray-900 py-2 px-4 rounded-md text-sm font-semibold hover:bg-gray-300"
              @click="previous"
            >
              Previous
            </button>
            <button
              class="w-full text-center bg-gray-200 text-gray-900 py-2 px-4 rounded-md text-sm font-semibold hover:bg-gray-300"
              @click="next"
            >
              Next
            </button>
            <button
              class="w-full text-center bg-gray-200 text-gray-900 py-2 px-4 rounded-md text-sm font-semibold hover:bg-gray-300"
              @click="last"
            >
              Last
            </button>
            <button
              class="w-full text-center bg-green-600 text-white py-2 px-4 rounded-md text-sm font-semibold hover:bg-green-700 mt-4"
              :disabled="exists || !canAdd"
              @click="add"
            >
              Add
            </button>
            <button
              class="w-full text-center bg-blue-600 text-white py-2 px-4 rounded-md text-sm font-semibold hover:bg-blue-700"
              :disabled="!exists || !isDirty"
              @click="update"
            >
              Update
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from "vue";

interface ProductRow {
  id: number;
  nameBn: string;
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
    form.value.description = "";
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
  const list = await window.ahb.listProducts({ activeOnly: false });
  products.value = list.map((p) => ({
    id: p.id,
    nameBn: p.nameBn,
    unit: p.unit,
    price: Number(p.price || 0),
    stock: Number(p.stock || 0),
    active: p.active !== false,
  }));
  // Initialize selection to first existing or 1
  if (products.value.length) {
    selectedId.value = Math.min(1000, Math.max(1, products.value[0].id));
  } else {
    selectedId.value = 1;
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
    (p.unit || "unit") !== form.value.unit ||
    Number(p.price || 0) !== Number(form.value.price || 0) ||
    Number(p.stock || 0) !== Number(form.value.stock || 0) ||
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
    stock: form.value.stock,
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
