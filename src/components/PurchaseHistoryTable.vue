<template>
  <div
    class="flex-1 min-h-0 scrollbar-always border border-gray-300 dark:border-gray-600 rounded-md"
  >
    <!-- Separate borders, not collapsed: a sticky header loses collapsed
         cell borders while scrolling. The container supplies the outer
         frame, each cell its right and bottom gridline. -->
    <table class="w-full text-sm border-separate border-spacing-0">
      <thead
        class="sticky top-0 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300"
      >
        <tr>
          <th :class="[headCellClass, 'border-r']">{{ t("date") }}</th>
          <th :class="[headCellClass, 'border-r']">{{ t("amount") }}</th>
          <th :class="headCellClass">{{ t("unit") }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="rows.length === 0">
          <td
            class="px-3 py-3 text-center text-gray-500 dark:text-gray-400"
            colspan="3"
          >
            {{ t("no_purchases") }}
          </td>
        </tr>
        <tr
          v-for="(p, i) in rows"
          :key="i"
          class="dark:text-gray-100"
          data-row="purchase"
        >
          <td :class="[bodyCellClass, 'border-r']">
            {{ formatDate(p.date) }}
          </td>
          <td :class="[bodyCellClass, 'border-r']">{{ p.quantity }}</td>
          <td :class="bodyCellClass">{{ p.unit }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: "AhbPurchaseHistoryTable" });
import { t } from "../i18n";

defineProps<{
  rows: { date: string; unit: string; quantity: number }[];
}>();

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB");
}

const gridBorderClass = "border-gray-300 dark:border-gray-600";

const headCellClass = `px-3 py-2 text-center font-medium border-b ${gridBorderClass}`;

const bodyCellClass = `px-3 py-2 text-center border-b ${gridBorderClass}`;
</script>
