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
  if (!params) return raw;
  return raw.replace(/\{(\w+)\}/g, (_, k: string) => {
    const v = params[k];
    return v === undefined || v === null ? `{${k}}` : String(v);
  });
}
