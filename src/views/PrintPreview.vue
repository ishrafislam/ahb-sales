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
               shifted up so each sheet shows its slice. -->
          <iframe
            :ref="page === 1 ? setFirstFrame : undefined"
            class="border-0 block"
            :srcdoc="composedHtml"
            :style="{
              width: `${pageWidthMm}mm`,
              height: `${pageHeightMm * pageCount}mm`,
              marginTop: `${-(page - 1) * pageHeightMm}mm`,
            }"
            :title="`${jobTitle} ${page}`"
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
  doc.value ? composePrintHtml(doc.value, margins.value) : ""
);

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
 * Measure the rendered document and work out how many sheets it fills. The
 * sheets are viewports onto one render, so a break can land mid-row here even
 * though the printer keeps rows whole.
 */
async function measure() {
  await nextTick();
  const frame = firstFrame.value;
  const height = frame?.contentDocument?.documentElement?.scrollHeight ?? 0;
  pageCount.value = pageCountFor(height, mmToPx(pageHeightMm.value));
}

let off: null | (() => void) = null;
onMounted(async () => {
  const job = await window.ahb.getPrintJob(jobId);
  if (job) {
    doc.value = job.doc;
    margins.value = normalizeMargins(job.margins);
  }
  // The iframe needs a tick to lay the document out before it can be measured
  await nextTick();
  setTimeout(() => void measure(), 0);

  off = window.ahb.onPrintMarginsChanged((payload) => {
    if (payload.id !== jobId) return;
    margins.value = normalizeMargins(payload.margins);
    setTimeout(() => void measure(), 0);
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
