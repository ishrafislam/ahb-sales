<template>
  <div class="flex flex-1 min-h-0 flex-col p-6 gap-4">
    <p v-if="notFound" class="text-sm text-gray-600 dark:text-gray-300">
      {{ kind === "customer" ? t("customer_not_found") : t("item_not_found") }}
    </p>

    <dl v-else class="flex flex-col gap-2 text-sm">
      <div
        v-for="field in fields"
        :key="field.key"
        class="flex items-baseline gap-3"
        data-role="record-field"
      >
        <dt class="w-40 shrink-0 text-gray-600 dark:text-gray-300">
          {{ t(field.key) }}:
        </dt>
        <dd class="flex-1 min-w-0 break-words dark:text-gray-100">
          {{ field.value }}
        </dd>
      </div>
    </dl>

    <div class="mt-auto flex justify-end pt-4">
      <button type="button" :class="buttonClass" @click="close">
        {{ t("close") }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: "AhbRecordDetails" });
import { ref, computed, onMounted } from "vue";
import { t } from "../i18n";
import { localizeDigits as ld } from "../utils/numerals";
import type { Customer, Product } from "../main/data";

// #record-details/<kind>/<id>
const [, rawKind, rawId] = window.location.hash.replace(/^#/, "").split("/");
const kind = rawKind === "product" ? "product" : "customer";
const recordId = Number(rawId);

const customer = ref<Customer | null>(null);
const product = ref<Product | null>(null);
const loaded = ref(false);

const notFound = computed(
  () => loaded.value && !customer.value && !product.value
);

// A field the record does not carry reads as a dash rather than a blank line
const dash = (v: string | undefined) => (v && v.trim() ? v : "—");
const statusText = (active: boolean) => (active ? t("active") : t("inactive"));

const fields = computed<Array<{ key: string; value: string }>>(() => {
  const c = customer.value;
  if (c) {
    return [
      { key: "v2_customer_id", value: ld(c.id) },
      { key: "v2_customer_name", value: dash(c.nameBn) },
      { key: "address", value: dash(c.address) },
      { key: "phone", value: dash(c.phone) },
      { key: "outstanding", value: ld(c.outstanding.toFixed(2)) },
      { key: "status", value: statusText(c.active) },
    ];
  }
  const p = product.value;
  if (!p) return [];
  return [
    { key: "item_id", value: ld(p.id) },
    { key: "item_name", value: dash(p.nameBn) },
    { key: "item_details", value: dash(p.description) },
    { key: "unit", value: dash(p.unit) },
    { key: "unit_price", value: ld(p.price.toFixed(2)) },
    { key: "stock", value: ld(p.stock) },
    { key: "status", value: statusText(p.active) },
  ];
});

function close() {
  window.close();
}

onMounted(async () => {
  if (Number.isInteger(recordId)) {
    if (kind === "customer") {
      customer.value = await window.ahb.getCustomerById(recordId);
    } else {
      product.value = await window.ahb.getProductById(recordId);
    }
  }
  loaded.value = true;
});

const buttonClass =
  "min-w-[7rem] bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors rounded-md py-2 px-4 text-sm dark:text-gray-100";
</script>
