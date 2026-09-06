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
            @click="void select(id)"
          >
            <div
              class="w-14 shrink-0 px-3 py-2 text-sm text-center border-r border-gray-200 dark:border-gray-700 dark:text-gray-100"
            >
              {{ ld(id) }}
            </div>
            <div
              class="px-3 py-2 text-sm truncate text-gray-700 dark:text-gray-200"
            >
              {{ customersById.get(id)?.nameBn || "" }}
            </div>
          </li>
        </ul>
      </div>
    </div>

    <!-- Right: detail form -->
    <div class="flex-1 min-w-0 p-6 flex flex-col gap-4 overflow-y-auto panel panel-green border-0 shadow-none">
      <div>
        <label :class="labelClass" for="customer-id">{{
          t("v2_customer_id")
        }}</label>
        <input
          id="customer-id"
          :value="ld(selectedId)"
          :class="fieldClass"
          type="text"
          readonly
        />
      </div>

      <div>
        <label :class="labelClass" for="customer-name">{{
          t("v2_customer_name")
        }}</label>
        <input
          id="customer-name"
          ref="nameInput"
          v-model="form.nameBn"
          :class="fieldClass"
          type="text"
          :readonly="!editing"
        />
      </div>

      <div>
        <label :class="labelClass" for="customer-address">{{
          t("address")
        }}</label>
        <input
          id="customer-address"
          v-model="form.address"
          :class="fieldClass"
          type="text"
          :readonly="!editing"
        />
      </div>

      <div>
        <label :class="labelClass" for="customer-phone">{{ t("phone") }}</label>
        <input
          id="customer-phone"
          v-model="form.phone"
          :class="fieldClass"
          type="text"
          maxlength="50"
          :readonly="!editing"
        />
      </div>

      <div>
        <label :class="labelClass" for="customer-outstanding">{{
          t("outstanding")
        }}</label>
        <input
          id="customer-outstanding"
          :value="outstandingText"
          :class="[fieldClass, 'text-right font-medium', outstandingClass]"
          type="text"
          readonly
        />
      </div>

      <div>
        <label :class="labelClass">{{ t("status") }}</label>
        <div class="flex items-center gap-6">
          <label class="flex items-center">
            <input
              v-model="statusRadio"
              class="h-4 w-4 text-blue-600"
              type="radio"
              value="active"
              :disabled="!editing"
            />
            <span class="ml-2 text-sm">{{ t("active") }}</span>
          </label>
          <label class="flex items-center">
            <input
              v-model="statusRadio"
              class="h-4 w-4 text-blue-600"
              type="radio"
              value="inactive"
              :disabled="!editing"
            />
            <span class="ml-2 text-sm">{{ t("inactive") }}</span>
          </label>
        </div>
      </div>

      <p v-if="error" class="text-sm text-red-600 dark:text-red-400">
        {{ error }}
      </p>

      <div class="mt-auto flex justify-end gap-3 pt-4">
        <button
          v-if="!editing"
          type="button"
          :class="buttonClass"
          @click="startEdit"
        >
          {{ t("edit") }}
        </button>
        <button
          v-else
          type="button"
          :class="primaryButtonClass"
          :disabled="!canSave"
          @click="void save()"
        >
          {{ t("save") }}
        </button>
        <button type="button" :class="buttonClass" @click="void close()">
          {{ t("close") }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: "AhbCustomers" });
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from "vue";
import { t } from "../i18n";
import { localizeDigits as ld } from "../utils/numerals";
import { MAX_CUSTOMER_ID } from "../constants/business";

interface CustomerRow {
  id: number;
  nameBn: string;
  address?: string;
  phone?: string;
  outstanding: number;
  active: boolean;
}

const customers = ref<CustomerRow[]>([]);
const selectedId = ref<number>(1);
const editing = ref(false);
const error = ref("");
const nameInput = ref<HTMLInputElement | null>(null);

const form = ref({
  nameBn: "",
  address: "",
  phone: "",
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
const selected = computed(() => customersById.value.get(selectedId.value));

const statusRadio = computed({
  get: () => (form.value.active ? "active" : "inactive"),
  set: (v: string) => {
    form.value.active = v === "active";
  },
});

// Outstanding is display-only: positive means the customer owes (red),
// negative means they paid extra and hold credit (green), 0 stays neutral.
// The colour carries the direction, so the amount is always shown unsigned.
const outstanding = computed(() => selected.value?.outstanding ?? 0);
const outstandingText = computed(
  () =>
    `${t("currency_taka")} ${ld(Math.abs(outstanding.value).toFixed(2))}`
);
const outstandingClass = computed(() => {
  if (outstanding.value > 0) return "text-red-600 dark:text-red-400";
  if (outstanding.value < 0) return "text-green-600 dark:text-green-400";
  return "";
});

const canSave = computed(() => form.value.nameBn.trim().length > 0);

function syncFromSelected() {
  const c = selected.value;
  form.value.nameBn = c?.nameBn || "";
  form.value.address = c?.address || "";
  form.value.phone = c?.phone || "";
  form.value.active = c ? !!c.active : true;
}

async function select(id: number) {
  if (id === selectedId.value) return;
  // Leaving a slot saves what is in the form, exactly as Save would have. A
  // refused save keeps the slot, the edit and its error where they are.
  if (!(await flushPendingEdit())) return;
  selectedId.value = id;
  editing.value = false;
  error.value = "";
  syncFromSelected();
  void scrollSelectedIntoView();
}

// Arrow keys traverse the list while it has focus (clicking a row focuses
// the container, since it is tabbable)
function move(delta: number) {
  const next = selectedId.value + delta;
  if (next < 1 || next > MAX_CUSTOMER_ID) return;
  void select(next);
}

async function load() {
  const list = await window.ahb.listCustomers({ activeOnly: false });
  customers.value = list.map((c) => ({
    id: c.id,
    nameBn: c.nameBn,
    address: c.address,
    phone: c.phone,
    outstanding: c.outstanding ?? 0,
    active: c.active !== false,
  }));
  if (!editing.value) syncFromSelected();
}

async function startEdit() {
  editing.value = true;
  error.value = "";
  await nextTick();
  nameInput.value?.focus();
  nameInput.value?.select();
}

function buildPatch() {
  return {
    nameBn: form.value.nameBn.trim(),
    address: form.value.address.trim(),
    phone: form.value.phone.trim(),
    active: form.value.active,
  };
}

/**
 * Is there an edit worth writing? A record with no name is not a record, and
 * an Edit that changed nothing must not rewrite the row and bump its
 * updatedAt — the same test the dashboard's own name/address commit makes.
 */
function isDirty(): boolean {
  if (!editing.value && exists.value) return false;
  if (!canSave.value) return false;
  const stored = selected.value;
  if (!stored) return true; // a new record typed into an empty slot
  const p = buildPatch();
  return (
    p.nameBn !== (stored.nameBn ?? "") ||
    p.address !== (stored.address ?? "") ||
    p.phone !== (stored.phone ?? "") ||
    p.active !== stored.active
  );
}

/** Write a pending edit out; false means it was refused and nothing moved. */
async function flushPendingEdit(): Promise<boolean> {
  if (!isDirty()) return true;
  return save();
}

/** True when the record was written, or there was nothing to write. */
async function save(): Promise<boolean> {
  if (!canSave.value) return true;
  error.value = "";
  const patch = buildPatch();
  try {
    if (exists.value) {
      await window.ahb.updateCustomer(selectedId.value, patch);
    } else {
      await window.ahb.addCustomer({ id: selectedId.value, ...patch });
    }
    editing.value = false;
    await load();
    return true;
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e);
    return false;
  }
}

async function close() {
  // Closing loses an edit the same way switching slots did; flush first
  if (!(await flushPendingEdit())) return;
  window.close();
}

// The window's own close button never reaches close(). The save cannot be
// awaited here, but the IPC call is dispatched before the window goes and the
// main process holds the data.
function onBeforeUnload() {
  if (isDirty()) void save();
}

let off: null | (() => void) = null;
onMounted(async () => {
  await load();
  await scrollSelectedIntoView();
  // Arrow keys work straight away, without clicking the list first
  leftListRef.value?.focus();
  off = window.ahb.onDataChanged((payload) => {
    if (payload.kind === "customer") void load();
  });
  window.addEventListener("beforeunload", onBeforeUnload);
});
onUnmounted(() => {
  if (off) off();
  window.removeEventListener("beforeunload", onBeforeUnload);
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
  "block w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md py-2 px-3 text-sm dark:text-gray-100 disabled:opacity-70 disabled:cursor-not-allowed read-only:opacity-70 read-only:cursor-default";

const buttonClass =
  "min-w-[7rem] btn-tinted btn-neutral rounded-md py-2 px-4 text-sm";

// The confirming action of the window carries the blue tint
const primaryButtonClass = buttonClass.replace("btn-neutral", "btn-blue");
</script>
