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
          <th
            v-for="(label, c) in columns"
            :key="c"
            :class="[
              headCellClass,
              c < columns.length - 1 ? 'border-r' : '',
            ]"
          >
            {{ label }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="rows.length === 0">
          <td
            class="px-3 py-3 text-center text-gray-500 dark:text-gray-400"
            :colspan="columns.length"
          >
            {{ emptyText }}
          </td>
        </tr>
        <tr
          v-for="(row, i) in rows"
          :key="i"
          class="dark:text-gray-100"
          data-row="grid"
        >
          <td
            v-for="(cell, c) in row"
            :key="c"
            :class="[bodyCellClass, c < row.length - 1 ? 'border-r' : '']"
          >
            {{ cell }}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: "AhbHistoryTable" });

// Headers arrive translated and cells pre-formatted: this component only
// lays strings out on the grid.
defineProps<{
  columns: string[];
  rows: string[][];
  emptyText: string;
}>();

const gridBorderClass = "border-gray-300 dark:border-gray-600";

const headCellClass = `px-3 py-2 text-center font-medium border-b ${gridBorderClass}`;

const bodyCellClass = `px-3 py-2 text-center border-b ${gridBorderClass}`;
</script>
