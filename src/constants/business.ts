// The shop name lives in the locale files (business_name): it is printed and
// shown in whichever language the app is running.

export const BUSINESS_PHONES = [
  "+8801911-351254 ; +8801622-974343",
  "+8801783-929534 ; +8801712-619583",
];

// Product ID constraints
export const MIN_PRODUCT_ID = 1;
export const MAX_PRODUCT_ID = 1000;

// Purchase entry constraints
export const MAX_PURCHASE_QUANTITY = 1_000_000;

// Customer ID constraints
export const MIN_CUSTOMER_ID = 1;
export const MAX_CUSTOMER_ID = 1000;

// Toast/notification durations (milliseconds)
export const TOAST_DURATION_SUCCESS = 2500;
export const TOAST_DURATION_ERROR = 3000;
export const TOAST_DURATION_UPDATE_SHORT = 2000;
export const TOAST_DURATION_UPDATE_LONG = 4000;

// Print delay (milliseconds)
export const PRINT_WINDOW_DELAY = 100;

// Page geometry (millimetres)
export const A4_WIDTH_MM = 210;
export const A4_HEIGHT_MM = 297;
export const MM_PER_INCH = 25.4;

// Page margins (inches)
export const MIN_MARGIN_IN = 0;
export const MAX_MARGIN_IN = 8;
export const MARGIN_STEP_IN = 0.1;

// Print preview zoom
export const ZOOM_MIN = 0.25;
export const ZOOM_MAX = 4;
export const ZOOM_STEP = 0.1;

// Guard against a runaway document filling the preview with sheets
export const MAX_PREVIEW_PAGES = 50;
