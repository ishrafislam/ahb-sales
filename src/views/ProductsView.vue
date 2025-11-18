<template>
  <div class="space-y-4">
    <h3 class="text-xl font-semibold">
      {{ t("products_title") }}
    </h3>

    <form class="grid grid-cols-7 gap-2 items-end" @submit.prevent="onAdd">
      <label class="col-span-1 text-sm">
        {{ t("id") }}
        <input
          v-model.number="form.id"
          class="mt-1 w-full border rounded px-2 py-1"
          type="number"
          min="1"
          :max="MAX_PRODUCT_ID"
          required
        />
      </label>
      <label class="col-span-2 text-sm">
        {{ t("name") }}
        <input
          v-model="form.nameBn"
          class="mt-1 w-full border rounded px-2 py-1"
          required
        />
      </label>
      <label class="col-span-1 text-sm">
        {{ t("unit") }}
        <input
          v-model="form.unit"
          class="mt-1 w-full border rounded px-2 py-1"
        />
      </label>
      <label class="col-span-1 text-sm">
        {{ t("price") }}
        <input
          v-model.number="form.price"
          class="mt-1 w-full border rounded px-2 py-1"
          type="number"
          step="0.01"
        />
      </label>
      <label class="col-span-1 text-sm">
        {{ t("stock") }}
        <input
          v-model.number="form.stock"
          class="mt-1 w-full border rounded px-2 py-1"
          type="number"
          step="1"
        />
      </label>
      <div class="col-span-6">
        <button
          class="px-3 py-1.5 bg-teal-600 text-white rounded hover:bg-teal-700"
        >
          {{ t("add") }}
        </button>
        <span v-if="error" class="text-sm text-red-600 ml-2">
          {{ error }}
        </span>
      </div>
    </form>

    <table class="min-w-full border text-sm">
      <thead>
        <tr class="bg-gray-100">
          <th class="border px-2 py-1 text-left">
            {{ t("id") }}
          </th>
          <th class="border px-2 py-1 text-left">
            {{ t("name") }}
          </th>
          <th class="border px-2 py-1 text-left">
            {{ t("unit") }}
          </th>
          <th class="border px-2 py-1 text-right">
            {{ t("price") }}
          </th>
          <th class="border px-2 py-1 text-right">
            {{ t("stock") }}
          </th>
          <th class="border px-2 py-1 text-center">
            {{ t("active") }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="p in products" :key="p.id">
          <td class="border px-2 py-1">
            {{ p.id }}
          </td>
          <td class="border px-2 py-1">
            {{ p.nameBn }}
          </td>
          <td class="border px-2 py-1">
            {{ p.unit }}
          </td>
          <td class="border px-2 py-1 text-right">
            {{ p.price.toFixed(2) }}
          </td>
          <td class="border px-2 py-1 text-right">
            {{ p.stock }}
          </td>
          <td class="border px-2 py-1 text-center">
            {{ p.active ? "✓" : "✗" }}
          </td>
        </tr>
        <tr v-if="products.length === 0">
          <td class="border px-2 py-2 text-center" colspan="6">
            {{ t("no_products") }}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";
import { t } from "../i18n";
import { MAX_PRODUCT_ID } from "../constants/business";

type Product = {
  id: number;
  nameBn: string;
  unit: string;
  price: number;
  stock: number;
  active: boolean;
};

const products = ref<Product[]>([]);
const error = ref("");

const form = ref<{
  id: number | null;
  nameBn: string;
  unit: string;
  price: number;
  stock: number;
}>({
  id: null,
  nameBn: "",
  unit: "unit",
  price: 0,
  stock: 0,
});

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
}

async function onAdd() {
  error.value = "";
  try {
    if (form.value.id == null) throw new Error("ID required");
    await window.ahb.addProduct({
      id: form.value.id,
      nameBn: form.value.nameBn,
      unit: form.value.unit,
      price: form.value.price,
      stock: form.value.stock,
    });
    await load();
    form.value = {
      id: null,
      nameBn: "",
      unit: "unit",
      price: 0,
      stock: 0,
    };
  } catch (e) {
    error.value = (e as Error).message;
  }
}

let off: null | (() => void) = null;
onMounted(() => {
  load();
  off = window.ahb.onDataChanged((payload) => {
    if (payload.kind === "product") {
      load();
    }
  });
});
onUnmounted(() => {
  if (off) off();
});
</script>
