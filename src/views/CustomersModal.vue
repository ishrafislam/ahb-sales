<template>
  <!-- eslint-disable -->
  <div class="flex flex-1 min-h-0">
    <!-- Left list -->
    <div
      class="w-[30%] border-r border-gray-200 dark:border-gray-700 flex flex-col"
    >
      <div
        ref="leftListRef"
        class="flex-grow overflow-y-auto"
      >
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
                {{ customersById.get(id)?.nameBn || "" }}
              </div>
            </div>
          </li>
        </ul>
      </div>
    </div>

    <!-- Right details -->
    <div class="w-[70%] p-6 flex flex-row overflow-hidden">
      <div class="flex-grow pr-2 overflow-hidden">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div class="flex flex-col space-y-4">
            <div>
              <label
                for="customer-id"
                class="block text-sm font-medium text-gray-600 dark:text-gray-300"
              >
                {{ t("id") }}
              </label>
              <input
                id="customer-id"
                :value="displayId"
                class="mt-1 block w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md py-2 px-3 sm:text-sm dark:text-gray-100"
                type="text"
                readonly
              />
            </div>
            <div>
              <label
                for="customer-name"
                class="block text-sm font-medium text-gray-600 dark:text-gray-300"
              >
                {{ t("name") }}
              </label>
              <input
                id="customer-name"
                v-model="form.nameBn"
                class="mt-1 block w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md py-2 px-3 sm:text-sm dark:text-gray-100"
                type="text"
              />
            </div>
            <div>
              <label
                for="customer-address"
                class="block text-sm font-medium text-gray-600 dark:text-gray-300"
              >
                {{ t("address") }}
              </label>
              <textarea
                id="customer-address"
                v-model="form.address"
                class="mt-1 block w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md py-2 px-3 sm:text-sm dark:text-gray-100"
                rows="2"
              ></textarea>
            </div>
            <div>
              <label
                for="customer-phone"
                class="block text-sm font-medium text-gray-600 dark:text-gray-300"
              >
                {{ t("phone") }}
              </label>
              <input
                id="customer-phone"
                v-model="form.phone"
                class="mt-1 block w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md py-2 px-3 sm:text-sm dark:text-gray-100"
                type="text"
                maxlength="50"
              />
            </div>
            <div v-if="!exists">
              <label
                for="customer-outstanding"
                class="block text-sm font-medium text-gray-600 dark:text-gray-300"
              >
                {{ t("initial_due") }}
              </label>
              <input
                id="customer-outstanding"
                v-model.number="form.outstanding"
                class="mt-1 block w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md py-2 px-3 sm:text-sm dark:text-gray-100"
                type="number"
                min="0"
                step="1.0"
              />
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
          <div class="flex flex-col space-y-2 justify-center">
            <button
              class="w-full text-center bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 py-2 px-4 rounded-md text-sm font-semibold hover:bg-blue-200 dark:hover:bg-blue-900"
              @click="first"
            >
              {{ t("first") }}
            </button>
            <button
              class="w-full text-center bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 py-2 px-4 rounded-md text-sm font-semibold hover:bg-blue-200 dark:hover:bg-blue-900"
              @click="previous"
            >
              {{ t("previous") }}
            </button>
            <button
              class="w-full text-center bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 py-2 px-4 rounded-md text-sm font-semibold hover:bg-blue-200 dark:hover:bg-blue-900"
              @click="next"
            >
              {{ t("next") }}
            </button>
            <button
              class="w-full text-center bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 py-2 px-4 rounded-md text-sm font-semibold hover:bg-blue-200 dark:hover:bg-blue-900"
              @click="last"
            >
              {{ t("last") }}
            </button>
            <button
              class="w-full text-center bg-green-600 text-white py-2 px-4 rounded-md text-sm font-semibold hover:bg-green-700 mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from "vue";
import { t } from "../i18n";
import { MAX_CUSTOMER_ID } from "../constants/business";

interface CustomerRow {
  id: number;
  nameBn: string;
  address?: string;
  phone?: string;
  active: boolean;
}

const customers = ref<CustomerRow[]>([]);
const selectedId = ref<number>(1);

const form = ref({
  nameBn: "",
  address: "",
  phone: "",
  outstanding: 0,
  active: true,
});

const idList = computed(() =>
  Array.from({ length: MAX_CUSTOMER_ID }, (_, i) => i + 1)
);
const customersById = computed(() => {
  const m = new Map<number, CustomerRow>();
  for (const c of customers.value) m.set(c.id, c);
  return m;
});

const exists = computed(() => customersById.value.has(selectedId.value));
const statusRadio = computed({
  get: () => (form.value.active ? "active" : "inactive"),
  set: (v: string) => {
    form.value.active = v === "active";
  },
});

const displayId = computed(() => String(selectedId.value));

function syncFromSelected() {
  const c = customersById.value.get(selectedId.value);
  if (c) {
    form.value.nameBn = c.nameBn || "";
    form.value.address = c.address || "";
    form.value.phone = c.phone || "";
    form.value.outstanding = 0;
    form.value.active = !!c.active;
  } else {
    form.value.nameBn = "";
    form.value.address = "";
    form.value.phone = "";
    form.value.outstanding = 0;
    form.value.active = true;
  }
}

function select(id: number) {
  selectedId.value = id;
  syncFromSelected();
  void scrollSelectedIntoView();
}

async function load() {
  const prevSelected = selectedId.value;
  const list = await window.ahb.listCustomers({ activeOnly: false });
  customers.value = list.map((c) => ({
    id: c.id,
    nameBn: c.nameBn,
    address: c.address,
    phone: c.phone,
    active: c.active !== false,
  }));
  // Preserve selection if still valid; otherwise, fall back to first existing (if any)
  if (!customersById.value.has(prevSelected)) {
    if (customers.value.length) {
      selectedId.value = Math.min(
        MAX_CUSTOMER_ID,
        Math.max(1, customers.value[0].id)
      );
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
  select(MAX_CUSTOMER_ID);
}
function previous() {
  select(Math.max(1, selectedId.value - 1));
}
function next() {
  select(Math.min(MAX_CUSTOMER_ID, selectedId.value + 1));
}

const canAdd = computed(() => form.value.nameBn.trim().length > 0);
const isDirty = computed(() => {
  const c = customersById.value.get(selectedId.value);
  if (!c) return false;
  return (
    (c.nameBn || "") !== form.value.nameBn ||
    (c.address || "") !== form.value.address ||
    (c.phone || "") !== form.value.phone ||
    !!c.active !== !!form.value.active
  );
});

async function add() {
  if (exists.value || !canAdd.value) return;
  await window.ahb.addCustomer({
    id: selectedId.value,
    nameBn: form.value.nameBn,
    address: form.value.address,
    phone: form.value.phone,
    outstanding: form.value.outstanding,
    active: form.value.active,
  });
  await load();
}

async function update() {
  if (!exists.value || !isDirty.value) return;
  await window.ahb.updateCustomer(selectedId.value, {
    nameBn: form.value.nameBn,
    address: form.value.address,
    phone: form.value.phone,
    active: form.value.active,
  });
  await load();
}

let off: null | (() => void) = null;
onMounted(() => {
  load();
  void scrollSelectedIntoView();
  off = window.ahb.onDataChanged((payload) => {
    if (payload.kind === "customer") {
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
