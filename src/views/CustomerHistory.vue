<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <h3 class="text-xl font-semibold">Customer History</h3>
      <button
        class="px-3 py-1.5 bg-gray-200 rounded hover:bg-gray-300"
        @click="goBack"
      >
        Back to Dashboard
      </button>
    </div>
    <div class="bg-white p-4 rounded border">
      <p class="text-gray-600">
        Placeholder UI only. Customer history logic will be implemented in a
        later phase.
      </p>
      <div class="overflow-x-auto mt-3">
        <table class="w-full text-left text-sm">
          <thead>
            <tr>
              <th class="p-2">Date</th>
              <th class="p-2">Customer</th>
              <th class="p-2">Action</th>
              <th class="p-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="p-2">—</td>
              <td class="p-2">—</td>
              <td class="p-2">—</td>
              <td class="p-2 text-right">—</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: "AhbCustomerHistoryView" });

const emit = defineEmits<{ (e: "navigate", page: "dashboard"): void }>();
function goBack() {
  emit("navigate", "dashboard");
}
</script>
