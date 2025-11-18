import { ref } from "vue";
import en from "../locales/en.json";
import bn from "../locales/bn.json";

export type Lang = "bn" | "en";

const messages: Record<Lang, Record<string, string>> = { en, bn };

export const currentLang = ref<Lang>("bn");

export async function initI18n(): Promise<void> {
  try {
    const lang = await window.ahb.getLanguage();
    currentLang.value = lang;
  } catch {
    currentLang.value = "bn";
  }
  window.ahb.onLanguageChanged((l) => {
    currentLang.value = l;
  });
}

export function t(
  key: string,
  params?: Record<string, string | number>
): string {
  const dict = messages[currentLang.value] ?? messages.bn;
  const raw = dict[key] ?? messages.en[key] ?? key;
  // If no params provided but template has placeholders, return raw unchanged
  // and warn in dev to make missing params obvious.
  if (!params) {
    if (/\{\w+\}/.test(raw)) {
      try {
        // Detect environment without using import.meta to keep TS module config flexible
        const nodeEnv =
          (
            globalThis as unknown as {
              process?: { env?: { NODE_ENV?: string } };
              NODE_ENV?: string;
            }
          )?.process?.env?.NODE_ENV ??
          (
            globalThis as unknown as {
              process?: { env?: { NODE_ENV?: string } };
              NODE_ENV?: string;
            }
          )?.NODE_ENV ??
          "production";
        const isProduction = nodeEnv === "production";
        if (!isProduction) {
          // eslint-disable-next-line no-console
          console.warn(`[i18n] Missing params for key "${key}": ${raw}`);
        }
      } catch {
        // ignore env probing errors
      }
    }
    return raw;
  }
  return raw.replace(/\{(\w+)\}/g, (_, k: string) => {
    const v = params[k];
    return v === undefined || v === null ? `{${k}}` : String(v);
  });
}
