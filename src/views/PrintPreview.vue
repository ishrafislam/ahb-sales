<template>
  <div class="flex flex-1 min-h-0 flex-col">
    <!-- Sheet canvas: plain wheel scrolls this, Ctrl+wheel zooms -->
    <div
      ref="canvasRef"
      class="flex-1 min-h-0 overflow-auto bg-gray-300 dark:bg-gray-800 p-6"
      @wheel="onWheel"
    >
      <div
        class="flex flex-col items-center gap-6"
        :style="{ transform: `scale(${zoom})`, transformOrigin: 'top center' }"
      >
        <div
          v-for="page in pageCount"
          :key="page"
          class="bg-white shadow-lg overflow-hidden shrink-0"
          data-role="sheet"
          :style="{ width: `${pageWidthMm}mm`, height: `${pageHeightMm}mm` }"
        >
          <!-- One composed document, one viewport per sheet: the iframe is
               shifted so each sheet shows its slice. A normal document grows
               downwards; a two-column one overflows sideways, so it is
               sliced on the other axis. -->
          <iframe
            :ref="page === 1 ? setFirstFrame : undefined"
            class="border-0 block"
            :srcdoc="composedHtml"
            :style="frameStyle(page)"
            :title="`${jobTitle} ${page}`"
            @load="onFrameLoad(page)"
          ></iframe>
        </div>
      </div>
    </div>

    <!-- Zoom bar -->
    <div
      class="shrink-0 flex items-center justify-end gap-3 border-t border-gray-200 dark:border-gray-700 px-4 py-2"
    >
      <span class="text-sm text-gray-600 dark:text-gray-300 mr-auto">
        {{ jobTitle }}
      </span>
      <button
        type="button"
        :class="stepButtonClass"
        :disabled="zoom <= ZOOM_MIN"
        aria-label="zoom-out"
        @click="stepZoom(-1)"
      >
        −
      </button>
      <input
        id="zoom-slider"
        :value="zoom"
        class="w-48"
        type="range"
        :min="ZOOM_MIN"
        :max="ZOOM_MAX"
        :step="ZOOM_STEP"
        @input="onSlider"
      />
      <button
        type="button"
        :class="stepButtonClass"
        :disabled="zoom >= ZOOM_MAX"
        aria-label="zoom-in"
        @click="stepZoom(1)"
      >
        +
      </button>
      <span
        class="w-14 text-right text-sm tabular-nums text-gray-600 dark:text-gray-300"
        data-role="zoom-percent"
      >
        {{ Math.round(zoom * 100) }}%
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: "AhbPrintPreview" });
import { ref, computed, onMounted, onUnmounted, nextTick } from "vue";
import { t } from "../i18n";
import { useKeyboardShortcuts } from "../composables/useKeyboardShortcuts";
import {
  composePrintHtml,
  mmToPx,
  pageCountFor,
  pageSizeMm,
  normalizeMargins,
  type PrintDocument,
  type PrintMargins,
} from "../print/document";
import { ZOOM_MIN, ZOOM_MAX, ZOOM_STEP } from "../constants/business";

const jobId = window.location.hash.replace(/^#/, "").split("/")[1] || "";

const doc = ref<PrintDocument | null>(null);
const margins = ref<PrintMargins>(normalizeMargins());
const zoom = ref(1);
const pageCount = ref(1);
const firstFrame = ref<HTMLIFrameElement | null>(null);

const jobTitle = computed(() => doc.value?.title || t("print_preview_title"));

const pageDims = computed(() => pageSizeMm(doc.value ?? {}));
const pageWidthMm = computed(() => pageDims.value.width);
const pageHeightMm = computed(() => pageDims.value.height);

const composedHtml = computed(() =>
  doc.value ? composePrintHtml(doc.value, margins.value, "preview") : ""
);

// Every document flows into page-tall columns that overflow sideways, so a
// sheet is always the horizontal slice one page wide
function frameStyle(page: number) {
  return {
    width: `${pageWidthMm.value * pageCount.value}mm`,
    height: `${pageHeightMm.value}mm`,
    marginLeft: `${-(page - 1) * pageWidthMm.value}mm`,
  };
}

function setFirstFrame(el: unknown) {
  firstFrame.value = (el as HTMLIFrameElement | null) ?? null;
}

function setZoom(z: number) {
  const next = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z));
  // Keep the slider off floating-point dust like 1.3000000000000003
  zoom.value = Math.round(next * 100) / 100;
}

function stepZoom(direction: number) {
  setZoom(zoom.value + direction * ZOOM_STEP);
}

function onSlider(e: Event) {
  setZoom(Number((e.target as HTMLInputElement).value));
}

// Ctrl (or Cmd) + wheel zooms; a plain wheel is left to scroll the canvas
function onWheel(e: WheelEvent) {
  if (!e.ctrlKey && !e.metaKey) return;
  e.preventDefault();
  stepZoom(e.deltaY > 0 ? -1 : 1);
}

/**
 * Measure once the first sheet's document has parsed. An srcdoc iframe loads
 * in its own task: before that its documentElement is still empty and
 * scrollHeight reports the iframe's own height, which reads as exactly one
 * page and silently clips the rest of the report.
 *
 * Measuring here rather than after the resize is deliberate: the frame is
 * still one page big, so the document overflows and reports its true extent.
 */
function onFrameLoad(page: number) {
  if (page === 1) void measure();
}

/**
 * Measure the rendered document and work out how many sheets it fills. The
 * columns overflow to the right, so how far the document reaches sideways is
 * how many pages it takes.
 */
async function measure() {
  await nextTick();
  const root = firstFrame.value?.contentDocument?.documentElement;
  pageCount.value = pageCountFor(
    root?.scrollWidth ?? 0,
    mmToPx(pageWidthMm.value)
  );
}

let off: null | (() => void) = null;
onMounted(async () => {
  const job = await window.ahb.getPrintJob(jobId);
  if (job) {
    doc.value = job.doc;
    margins.value = normalizeMargins(job.margins);
  }
  // Measuring is left to the sheet's load event, both now and after a margin
  // change: new margins mean new srcdoc, which reloads the frame.
  off = window.ahb.onPrintMarginsChanged((payload) => {
    if (payload.id !== jobId) return;
    margins.value = normalizeMargins(payload.margins);
  });
});
onUnmounted(() => {
  if (off) off();
});

useKeyboardShortcuts([
  {
    key: "p",
    ctrl: true,
    handler: () => {
      void window.ahb.openPrintMargins(jobId);
    },
    description: "Page margins",
  },
]);

const canvasRef = ref<HTMLElement | null>(null);

const stepButtonClass =
  "w-8 h-8 leading-none bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors rounded-md text-sm dark:text-gray-100 disabled:opacity-70 disabled:cursor-not-allowed";
</script>
