export type ThemeSource = "system" | "light" | "dark";

type ThemePayload = {
  source: ThemeSource | string;
  effective: "light" | "dark" | string;
};
type ThemeAPI = {
  getTheme: () => Promise<ThemePayload>;
  setTheme: (source: ThemeSource) => Promise<ThemePayload>;
  onThemeChanged: (cb: (payload: ThemePayload) => void) => () => void;
};

function applyClass(effective: "light" | "dark") {
  const el = document.documentElement;
  if (effective === "dark") {
    el.classList.add("dark");
  } else {
    el.classList.remove("dark");
  }
}

export async function initTheme() {
  try {
    const api = (window as unknown as { ahb?: Partial<ThemeAPI> }).ahb;
    if (api && typeof api.getTheme === "function") {
      const { effective } = await api.getTheme();
      applyClass(effective as "light" | "dark");
    }
    if (api && typeof api.onThemeChanged === "function") {
      api.onThemeChanged((p: ThemePayload) => {
        const eff = (p.effective === "dark" ? "dark" : "light") as
          | "light"
          | "dark";
        applyClass(eff);
      });
    }
  } catch {
    // ignore failures in early init
  }
}

export async function setTheme(source: ThemeSource) {
  const api = (window as unknown as { ahb?: Partial<ThemeAPI> }).ahb;
  if (!api || typeof api.setTheme !== "function") return;
  const res = await api.setTheme(source);
  const eff = (res.effective === "dark" ? "dark" : "light") as "light" | "dark";
  applyClass(eff);
}
