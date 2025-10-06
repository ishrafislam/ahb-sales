<template>
  <div class="space-y-4">
    <h3 class="text-xl font-semibold">
      Customers
    </h3>

    <form
      class="grid grid-cols-6 gap-2 items-end"
      @submit.prevent="onAdd"
    >
      <label class="col-span-1 text-sm">ID
        <input
          v-model.number="form.id"
          class="mt-1 w-full border rounded px-2 py-1"
          type="number"
          min="1"
          required
        >
      </label>
      <label class="col-span-2 text-sm">Name (BN)
        <input
          v-model="form.nameBn"
          class="mt-1 w-full border rounded px-2 py-1"
          required
        >
      </label>
      <label class="col-span-2 text-sm">Address
        <input
          v-model="form.address"
          class="mt-1 w-full border rounded px-2 py-1"
        >
      </label>
      <label class="col-span-1 text-sm">Outstanding
        <input
          v-model.number="form.outstanding"
          class="mt-1 w-full border rounded px-2 py-1"
          type="number"
          step="0.01"
        >
      </label>
      <div class="col-span-6">
        <button class="px-3 py-1.5 bg-teal-600 text-white rounded hover:bg-teal-700">
          Add
        </button>
        <span
          v-if="error"
          class="text-sm text-red-600 ml-2"
        >
          {{ error }}
        </span>
      </div>
    </form>

    <table class="min-w-full border text-sm">
      <thead>
        <tr class="bg-gray-100">
          <th class="border px-2 py-1 text-left">
            ID
          </th>
          <th class="border px-2 py-1 text-left">
            Name
          </th>
          <th class="border px-2 py-1 text-left">
            Address
          </th>
          <th class="border px-2 py-1 text-right">
            Outstanding
          </th>
          <th class="border px-2 py-1 text-center">
            Active
          </th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="c in customers"
          :key="c.id"
        >
          <td class="border px-2 py-1">
            {{ c.id }}
          </td>
          <td class="border px-2 py-1">
            {{ c.nameBn }}
          </td>
          <td class="border px-2 py-1">
            {{ c.address || '' }}
          </td>
          <td class="border px-2 py-1 text-right">
            {{ c.outstanding.toFixed(2) }}
          </td>
          <td class="border px-2 py-1 text-center">
            {{ c.active ? '✓' : '✗' }}
          </td>
        </tr>
        <tr v-if="customers.length === 0">
          <td
            class="border px-2 py-2 text-center"
            colspan="5"
          >
            No customers
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

type Customer = { id: number; nameBn: string; address?: string; outstanding: number; active: boolean }

const customers = ref<Customer[]>([])
const error = ref('')

const form = ref<{ id: number | null; nameBn: string; address?: string; outstanding: number }>({
  id: null,
  nameBn: '',
  address: '',
  outstanding: 0,
})

async function load() {
  const list = await window.ahb.listCustomers(false)
  customers.value = (list as any[]).map(c => ({
    id: c.id,
    nameBn: c.nameBn,
    address: c.address,
    outstanding: Number(c.outstanding || 0),
    active: c.active !== false,
  }))
}

async function onAdd() {
  error.value = ''
  try {
    if (form.value.id == null) throw new Error('ID required')
    await window.ahb.addCustomer({
      id: form.value.id,
      nameBn: form.value.nameBn,
      address: form.value.address,
      outstanding: form.value.outstanding,
    })
    await load()
    form.value = { id: null, nameBn: '', address: '', outstanding: 0 }
  } catch (e) {
    error.value = (e as Error).message
  }
}

let off: null | (() => void) = null
onMounted(() => {
  load()
  off = window.ahb.onDataChanged((payload) => {
    if (payload.kind === 'customer') {
      load()
    }
  })
})
onUnmounted(() => {
  if (off) off()
})
</script>
