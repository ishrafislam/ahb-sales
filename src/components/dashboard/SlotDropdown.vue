<template>
  <!-- Teleported and fixed: the product ID cell sits inside the entry table's
       own scroll box, which would clip a panel positioned within it. -->
  <Teleport to="body">
    <div
      v-if="open && options.length"
      ref="panelRef"
      class="fixed z-50 max-h-72 overflow-y-auto bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 shadow-lg text-xs dark:text-gray-100"
      :style="panelStyle"
      data-role="slot-dropdown"
      @mousedown.prevent
    >
      <ul ref="listRef">
        <li
          v-for="(opt, idx) in options"
          :key="opt.id"
          class="flex items-baseline gap-2 px-2 py-1 cursor-pointer"
          :class="
            idx === highlight
              ? 'bg-gray-100 dark:bg-gray-700'
              : 'hover:bg-gray-50 dark:hover:bg-gray-800'
          "
          data-role="slot-option"
          @click="emit('select', opt)"
        >
          <span class="w-10 shrink-0 tabular-nums text-gray-500 dark:text-gray-400">
            {{ opt.id }}
          </span>
          <span v-if="opt.primary" class="font-medium truncate">
            {{ opt.primary }}
          </span>
          <span v-else class="italic text-gray-400 dark:text-gray-500">
            {{ t("empty_slot") }}
          </span>
          <span
            v-if="opt.secondary"
            class="ml-auto truncate text-gray-500 dark:text-gray-400"
          >
            {{ opt.secondary }}
          </span>
        </li>
      </ul>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
defineOptions({ name: "AhbSlotDropdown" });
import { ref, watch, nextTick, onUnmounted } from "vue";
import { t } from "../../i18n";
import type { SlotOption } from "./slotOptions";

const props = defineProps<{
  open: boolean;
  /** Already filtered by the caller, so the highlight index lines up. */
  options: SlotOption[];
  /** -1 when nothing is highlighted, so Enter keeps its old meaning. */
  highlight: number;
  anchor: HTMLElement | null;
}>();

const emit = defineEmits<{ (e: "select", option: SlotOption): void }>();

const panelRef = ref<HTMLElement | null>(null);
const listRef = ref<HTMLUListElement | null>(null);

// Wider than either id field, as asked; the anchor only sets the minimum
const PANEL_WIDTH = 448; // 28rem
const MAX_HEIGHT = 288; // max-h-72
const GAP = 2;

const panelStyle = ref<Record<string, string>>({});

function place() {
  const el = props.anchor;
  if (!el) return;
  const r = el.getBoundingClientRect();
  const width = Math.max(PANEL_WIDTH, r.width);
  // Keep the panel on screen: right-align to the anchor when a left-aligned
  // one would run past the window, and flip above when there is no room below
  const left = Math.max(4, Math.min(r.left, window.innerWidth - width - 4));
  const below = window.innerHeight - r.bottom;
  const style: Record<string, string> = {
    left: `${left}px`,
    width: `${width}px`,
  };
  if (below < MAX_HEIGHT && r.top > below) {
    style.bottom = `${window.innerHeight - r.top + GAP}px`;
    style.maxHeight = `${Math.min(MAX_HEIGHT, r.top - GAP - 4)}px`;
  } else {
    style.top = `${r.bottom + GAP}px`;
    style.maxHeight = `${Math.min(MAX_HEIGHT, below - GAP - 4)}px`;
  }
  panelStyle.value = style;
}

function onViewportChange() {
  if (props.open) place();
}

watch(
  () => [props.open, props.anchor] as const,
  async ([open]) => {
    if (!open) {
      window.removeEventListener("resize", onViewportChange);
      window.removeEventListener("scroll", onViewportChange, true);
      return;
    }
    place();
    await nextTick();
    place();
    window.addEventListener("resize", onViewportChange);
    // Capture phase: the entry table scrolls, not the window
    window.addEventListener("scroll", onViewportChange, true);
  },
  { immediate: true }
);

watch(
  () => props.highlight,
  async (idx) => {
    if (!props.open || idx < 0) return;
    await nextTick();
    const row = listRef.value?.children[idx] as HTMLElement | undefined;
    // jsdom has no layout, so the method is simply absent there
    if (typeof row?.scrollIntoView === "function") {
      row.scrollIntoView({ block: "nearest" });
    }
  }
);

onUnmounted(() => {
  window.removeEventListener("resize", onViewportChange);
  window.removeEventListener("scroll", onViewportChange, true);
});
</script>
