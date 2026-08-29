<template>
  <div
    class="flex-grow bg-white dark:bg-gray-900 shadow-sm border border-gray-200 dark:border-gray-700 min-h-0 overflow-y-auto p-2 flex flex-col gap-1.5"
  >
    <div
      v-for="field in fields"
      :key="field.key"
      class="flex items-center gap-2"
    >
      <label class="text-xs whitespace-nowrap flex-1">{{ t(field.key) }}:</label>
      <input
        type="text"
        :value="field.value"
        readonly
        :class="[fieldClass, 'max-w-[55%] text-right disabled:opacity-70 disabled:cursor-not-allowed read-only:opacity-70 read-only:cursor-default']"
      >
    </div>
    <div class="flex flex-col gap-1 flex-grow">
      <label class="text-xs whitespace-nowrap">{{ t("comment") }}:</label>
      <textarea
        v-model="comment"
        :readonly="locked"
        rows="3"
        :class="[fieldClass, 'flex-grow resize-none disabled:opacity-70 disabled:cursor-not-allowed read-only:opacity-70 read-only:cursor-default']"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: "AhbCustomerStatusPanel" });
import { localizeDigits } from "../../utils/numerals";
import { computed } from "vue";
import { t } from "../../i18n";

export type PostedStatus = {
  totalPrice: number;
  discount: number;
  bill: number;
  deposit: number;
  difference: number;
  previousDue: number;
  nextDue: number;
};

const props = defineProps<{
  status: PostedStatus | null;
  locked: boolean;
}>();

const comment = defineModel<string>("comment", { required: true });

const fields = computed(() => {
  const s = props.status;
  const fmt = (n: number | undefined) =>
    n === undefined ? "" : localizeDigits(n.toFixed(2));
  return [
    { key: "total_price", value: fmt(s?.totalPrice) },
    { key: "v2_discount", value: fmt(s?.discount) },
    { key: "v2_bill", value: fmt(s?.bill) },
    { key: "v2_deposit", value: fmt(s?.deposit) },
    { key: "v2_difference", value: fmt(s?.difference) },
    { key: "v2_previous_due", value: fmt(s?.previousDue) },
    { key: "v2_next_due", value: fmt(s?.nextDue) },
  ];
});

const fieldClass =
  "min-w-0 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 px-2 py-1.5 text-sm dark:text-gray-100";
</script>
