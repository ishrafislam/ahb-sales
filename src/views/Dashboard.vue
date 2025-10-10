<template>
  <div class="flex flex-col h-screen overflow-hidden p-3 lg:p-4 gap-3 lg:gap-4">
    <!-- Header -->
    <div class="flex justify-between items-center mb-1">
      <div class="flex items-center gap-4">
        <h2 class="text-xl font-bold">ABDUL HAMID AND BROTHERS</h2>
        <div class="flex items-center gap-2">
          <button
            class="bg-white border border-gray-300 py-1.5 px-3 rounded-md text-sm font-semibold hover:bg-gray-100 transition-colors"
            @click="openFile"
          >
            Open
          </button>
          <button
            class="bg-white border border-gray-300 py-1.5 px-3 rounded-md text-sm font-semibold hover:bg-gray-100 transition-colors"
            @click="saveFile"
          >
            Save
          </button>
          <button
            class="bg-white border border-gray-300 py-1.5 px-3 rounded-md text-sm font-semibold hover:bg-gray-100 transition-colors"
            @click="saveFileAs"
          >
            Save As
          </button>
        </div>
      </div>
      <div class="flex items-center gap-2 text-sm text-gray-600">
        <span> Date: </span>
        <span>
          {{ today }}
        </span>
      </div>
    </div>

    <!-- Body -->
    <div
      class="flex-grow grid grid-cols-1 lg:grid-cols-3 gap-3 lg:gap-4 min-h-0"
    >
      <!-- Left column -->
      <div
        class="lg:col-span-1 flex flex-col gap-3 lg:gap-4 min-h-0 overflow-hidden"
      >
        <!-- Search Customer -->
        <div class="bg-white p-4 rounded-md shadow-sm border border-gray-200">
          <h3 class="text-base font-semibold mb-3">Search Customer</h3>
          <div class="flex items-center gap-2">
            <input
              id="search-customer"
              name="search-customer"
              type="text"
              placeholder="Enter Customer ID or Name"
              class="w-full bg-gray-50 border border-gray-300 rounded-md pl-3 pr-2 py-1.5 text-sm"
            />
            <button
              class="bg-blue-600 text-white py-1.5 px-3 rounded-md text-sm font-semibold hover:bg-blue-700 transition-colors"
            >
              Search
            </button>
          </div>
        </div>

        <!-- Quick Actions -->
        <div class="bg-white p-4 rounded-md shadow-sm border border-gray-200">
          <div class="grid grid-cols-2 gap-2">
            <button
              class="col-span-2 bg-blue-100 text-blue-700 py-1.5 px-3 rounded-md text-sm font-semibold hover:bg-blue-200 transition-colors"
              @click="navigate('customer-history')"
            >
              History
            </button>
            <button
              class="bg-blue-100 text-blue-700 py-1.5 px-3 rounded-md text-sm font-semibold hover:bg-blue-200 transition-colors"
              @click="navigate('customers')"
            >
              Customers
            </button>
            <button
              class="bg-blue-100 text-blue-700 py-1.5 px-3 rounded-md text-sm font-semibold hover:bg-blue-200 transition-colors"
              @click="navigate('products')"
            >
              Products
            </button>
            <button
              class="bg-blue-100 text-blue-700 py-1.5 px-3 rounded-md text-sm font-semibold hover:bg-blue-200 transition-colors"
              @click="navigate('product-sales-history')"
            >
              Sales History
            </button>
            <button
              class="bg-blue-100 text-blue-700 py-1.5 px-3 rounded-md text-sm font-semibold hover:bg-blue-200 transition-colors"
              @click="navigate('product-purchase-history')"
            >
              Purchase History
            </button>
          </div>
        </div>

        <!-- Summary card -->
        <div
          class="mt-auto bg-white p-3 rounded-md shadow-sm border border-gray-200"
        >
          <div class="space-y-1.5 text-sm">
            <div class="flex justify-between items-center">
              <span class="text-gray-600"> Total Price </span>
              <span class="font-semibold"> 0.00 </span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-gray-600"> Discount </span>
              <input
                class="w-20 bg-gray-50 border border-gray-300 rounded-md px-1 py-0 text-right font-semibold text-sm"
                type="number"
                value="0.00"
              />
            </div>
            <div class="flex justify-between items-center">
              <span class="text-gray-600"> Bill </span>
              <span class="font-semibold"> 0.00 </span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-gray-600"> Paid </span>
              <input
                class="w-20 bg-gray-50 border border-gray-300 rounded-md px-1 py-0 text-right font-semibold text-sm"
                type="number"
                value="0.00"
              />
            </div>
            <div class="flex justify-between items-center">
              <span class="text-gray-600"> Due </span>
              <span class="font-semibold text-red-600"> 0.00 </span>
            </div>
            <div
              class="flex justify-between items-center mt-2 pt-2 border-t border-gray-200"
            >
              <span class="text-gray-600"> Previous Due </span>
              <span class="font-semibold"> 0.00 </span>
            </div>
            <div
              class="flex justify-between items-center p-2 bg-red-100 rounded-md"
            >
              <span class="font-bold text-base text-red-600"> Net Due </span>
              <span class="font-bold text-lg text-red-600"> 0.00 </span>
            </div>
            <div class="mt-2 flex items-end gap-2">
              <textarea
                class="flex-grow bg-gray-50 border border-gray-300 rounded-md px-2 py-1 text-sm"
                placeholder="Comment"
                rows="2"
              />
              <button
                class="bg-green-600 text-white py-2 px-3 rounded-md text-sm font-semibold hover:bg-green-700 transition-colors flex-shrink-0"
              >
                Complete
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Right column -->
      <div
        class="lg:col-span-2 bg-white p-4 rounded-md shadow-sm border border-gray-200 flex flex-col min-h-0"
      >
        <div class="bg-blue-50 p-3 rounded-lg mb-4">
          <h3 class="text-base font-semibold mb-2 text-blue-700">
            Customer Information
          </h3>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-2 text-sm">
            <div>
              <span class="text-gray-600"> ID: </span>
              <span class="font-medium ml-1"> — </span>
            </div>
            <div>
              <span class="text-gray-600"> Name: </span>
              <span class="font-medium ml-1"> — </span>
            </div>
            <div>
              <span class="text-gray-600"> Last Bill: </span>
              <span class="font-medium ml-1"> — </span>
            </div>
            <div>
              <span class="text-gray-600"> Due: </span>
              <span class="font-medium text-red-600 ml-1"> — </span>
            </div>
          </div>
        </div>

        <div class="flex-grow min-h-0 overflow-auto">
          <table class="w-full text-left text-sm">
            <thead class="border-b border-gray-200">
              <tr>
                <th class="p-2 text-xs font-semibold text-gray-600 text-center">
                  #
                </th>
                <th class="p-2 text-xs font-semibold text-gray-600">
                  PRODUCT NAME
                </th>
                <th class="p-2 text-xs font-semibold text-gray-600 text-center">
                  QUANTITY
                </th>
                <th class="p-2 text-xs font-semibold text-gray-600 text-center">
                  UNIT
                </th>
                <th class="p-2 text-xs font-semibold text-gray-600 text-right">
                  UNIT PRICE
                </th>
                <th class="p-2 text-xs font-semibold text-gray-600 text-right">
                  TOTAL
                </th>
              </tr>
            </thead>
            <tbody>
              <tr class="border-b border-gray-200">
                <td class="p-2 text-center">1</td>
                <td class="p-2">—</td>
                <td class="p-2 text-center">
                  <input
                    class="w-16 bg-gray-50 border border-gray-300 rounded-md px-1 py-0.5 text-center text-sm"
                    type="number"
                    value="0"
                  />
                </td>
                <td class="p-2 text-center">—</td>
                <td class="p-2 text-right">0.00</td>
                <td class="p-2 text-right">0.00</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="border-t border-gray-200 mt-4 pt-4 flex items-center gap-2">
          <div class="relative flex-grow">
            <input
              id="search-product"
              name="search-product"
              type="text"
              placeholder="Search for products to add..."
              class="w-full bg-gray-50 border border-gray-300 rounded-md pl-3 pr-2 py-2 text-sm"
            />
          </div>
          <button
            class="bg-green-600 text-white py-2 px-4 rounded-md text-sm font-semibold hover:bg-green-700 transition-colors"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: "AhbDashboardView" });
import { computed } from "vue";

const today = computed(() => new Date().toLocaleDateString("en-GB"));

const emit = defineEmits<{
  (
    e: "navigate",
    page:
      | "dashboard"
      | "products"
      | "customers"
      | "product-sales-history"
      | "product-purchase-history"
      | "customer-history"
  ): void;
}>();

function navigate(page: Parameters<typeof emit>[1]) {
  emit("navigate", page);
}
function openFile() {
  window.ahb.openFile();
}
function saveFile() {
  window.ahb.saveFile();
}
function saveFileAs() {
  window.ahb.saveFileAs();
}
</script>
