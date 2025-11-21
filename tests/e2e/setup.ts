import {
  test as base,
  _electron as electron,
  type ElectronApplication,
} from "@playwright/test";
import path from "node:path";

export const test = base.extend<{
  electronApp: ElectronApplication;
}>({
  // eslint-disable-next-line no-empty-pattern
  electronApp: async ({}, use) => {
    // Start Electron app
    const dotenv = await import("dotenv");
    dotenv.config();

    const electronApp = await electron.launch({
      args: [path.join(__dirname, "../../.vite/build/main.js")],
      env: {
        ...process.env,
        NODE_ENV: "test",
        AHB_KEY_HEX:
          process.env.AHB_KEY_HEX ||
          "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
      },
    });

    await use(electronApp);
    await electronApp.close();
  },
});

export { expect } from "@playwright/test";
