<template>
  <div class="relative flex flex-1 min-h-0 flex-col overflow-hidden">
    <!-- Sheet canvas: plain wheel scrolls this, Ctrl+wheel zooms -->
    <div
      ref="canvasRef"
      class="flex-1 min-h-0 overflow-auto bg-gray-300 dark:bg-gray-800 p-6"
      @wheel="onWheel"
    >
      <!-- transform: scale() leaves layout alone, so the canvas would only
           ever scroll the unscaled box and everything the zoom pushed left of
           the origin would be unreachable. The spacer reserves the scaled
           size instead, and the scaling runs from the top-left corner so the
           sheets grow into it rather than out of it. -->
      <div class="flex justify-center w-max min-w-full">
        <div :style="spacerStyle">
          <div
            class="flex flex-col items-center gap-6"
            :style="{
              transform: `scale(${zoom})`,
              transformOrigin: 'top left',
              width: `${stackWidthPx}px`,
            }"
          >
            <div
              v-for="page in pageCount"
              :key="page"
              class="bg-white shadow-lg overflow-hidden shrink-0"
              data-role="sheet"
              :style="{ width: `${pageWidthMm}mm`, height: `${pageHeightMm}mm` }"
            >
              <!-- One composed document, one viewport per sheet: the iframe is
                   shifted so each sheet shows its slice. A normal document
                   grows downwards; a two-column one overflows sideways, so it
                   is sliced on the other axis. -->
              <iframe
                class="border-0 block"
                :srcdoc="composedHtml"
                :style="frameStyle(page)"
                :title="`${jobTitle} ${page}`"
              ></iframe>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Measured off-screen at exactly one page wide. The sheets' own frames
         are as wide as the whole report, so a document that shrank — smaller
         margins, say — would still fill its frame and the count could only
         ever grow. -->
    <iframe
      ref="measureFrame"
      class="absolute -left-[9999px] top-0 border-0"
      aria-hidden="true"
      tabindex="-1"
      data-role="measure"
      :srcdoc="measureHtml"
      :style="{ width: `${pageWidthMm}mm`, height: `${pageHeightMm}mm` }"
      @load="measure"
    ></iframe>

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
      <!-- Kept off the zoom group so it does not read as a third stepper -->
      <span
        class="w-px self-stretch bg-gray-200 dark:bg-gray-700"
        aria-hidden="true"
      ></span>
      <!-- Printing itself lives in the margins dialog; this is the only thing
           on screen that says so -->
      <button
        type="button"
        :class="printButtonClass"
        data-role="print"
        @click="openMargins"
      >
        {{ t("print") }}
      </button>
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
const measureFrame = ref<HTMLIFrameElement | null>(null);
const canvasRef = ref<HTMLElement | null>(null);

const jobTitle = computed(() => doc.value?.title || t("print_preview_title"));

const pageDims = computed(() => pageSizeMm(doc.value ?? {}));
const pageWidthMm = computed(() => pageDims.value.width);
const pageHeightMm = computed(() => pageDims.value.height);

// A sheet's frame spans the whole report, so its composition states that
// many columns; the measuring frame states one. The column width works out
// the same either way, so both fragment identically.
const composedHtml = computed(() =>
  doc.value
    ? composePrintHtml(doc.value, margins.value, "preview", pageCount.value)
    : ""
);

const measureHtml = computed(() =>
  doc.value ? composePrintHtml(doc.value, margins.value, "preview", 1) : ""
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

// Gap between sheets, matching the gap-6 on the stack
const SHEET_GAP_PX = 24;

const stackWidthPx = computed(() => mmToPx(pageWidthMm.value));
const stackHeightPx = computed(
  () =>
    pageCount.value * mmToPx(pageHeightMm.value) +
    (pageCount.value - 1) * SHEET_GAP_PX
);

// The scaled footprint, so the canvas can scroll to every edge of it
const spacerStyle = computed(() => ({
  width: `${stackWidthPx.value * zoom.value}px`,
  height: `${stackHeightPx.value * zoom.value}px`,
}));

function setZoom(z: number) {
  const next = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z));
  // Keep the slider off floating-point dust like 1.3000000000000003
  const rounded = Math.round(next * 100) / 100;
  const prev = zoom.value;
  zoom.value = rounded;
  if (prev === rounded) return;
  // Hold whatever was in the middle of the viewport, once the spacer has
  // taken its new size
  void nextTick(() => {
    const el = canvasRef.value;
    if (!el) return;
    const ratio = rounded / prev;
    el.scrollLeft =
      (el.scrollLeft + el.clientWidth / 2) * ratio - el.clientWidth / 2;
    el.scrollTop =
      (el.scrollTop + el.clientHeight / 2) * ratio - el.clientHeight / 2;
  });
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
 * Work out how many sheets the document fills, on the load event because an
 * srcdoc iframe parses in its own task: before that its documentElement is
 * empty and reports the frame's own size, which reads as exactly one page and
 * would silently clip the rest of the report.
 *
 * The columns overflow to the right, so how far the document reaches sideways
 * is how many pages it takes.
 */
async function measure() {
  await nextTick();
  const root = measureFrame.value?.contentDocument?.documentElement;
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

function openMargins() {
  void window.ahb.openPrintMargins(jobId);
}

useKeyboardShortcuts([
  {
    key: "p",
    ctrl: true,
    handler: openMargins,
    description: "Page margins",
  },
]);

const printButtonClass =
  "bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors rounded-md py-1.5 px-4 text-sm dark:text-gray-100";

const stepButtonClass =
  "w-8 h-8 leading-none bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors rounded-md text-sm dark:text-gray-100 disabled:opacity-70 disabled:cursor-not-allowed";
</script>
