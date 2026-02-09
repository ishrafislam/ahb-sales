import type { ForgeConfig } from "@electron-forge/shared-types";
import { PublisherGithub } from "@electron-forge/publisher-github";
import { MakerSquirrel } from "@electron-forge/maker-squirrel";
import { MakerZIP } from "@electron-forge/maker-zip";
import { MakerDeb } from "@electron-forge/maker-deb";
import { MakerRpm } from "@electron-forge/maker-rpm";
import { VitePlugin } from "@electron-forge/plugin-vite";
import path from "node:path";
import fs from "node:fs";
type Pkg = { version: string };
const pkg: Pkg = JSON.parse(
  fs.readFileSync(path.join(__dirname, "package.json"), "utf-8")
);

// Icon paths (optional). Place your icons under assets/icons/... to enable.
const ICONS_DIR = path.join(__dirname, "assets", "icons");
const WIN_ICON = path.join(ICONS_DIR, "win", "icon.ico");
const MAC_ICON = path.join(ICONS_DIR, "mac", "icon.icns");
const LINUX_ICON = path.join(ICONS_DIR, "png", "512x512.png");

const config: ForgeConfig = {
  packagerConfig: {
    asar: true,
    // Use platform-appropriate icon if present
    icon:
      process.platform === "win32" && fs.existsSync(WIN_ICON)
        ? WIN_ICON
        : process.platform === "darwin" && fs.existsSync(MAC_ICON)
          ? MAC_ICON
          : process.platform === "linux" && fs.existsSync(LINUX_ICON)
            ? LINUX_ICON
            : undefined,
    extraResource: fs.existsSync(ICONS_DIR) ? [ICONS_DIR] : [],
  },
  rebuildConfig: {},
  publishers: [
    new PublisherGithub({
      repository: {
        owner: "ishrafislam",
        name: "ahb-sales",
      },
      draft: true,
      prerelease: false,
    }),
  ],
  makers: [
    new MakerSquirrel({
      // Keep internal Squirrel package ID stable (from package.json name)
      // and only customize the Setup.exe filename.
      setupExe: `Abdul_Hamid_and_Brothers_Sales_v${pkg.version}_x86.exe`,
      // To simplify renaming, disable delta packages.
      noDelta: true,
      // Set installer icon if available
      setupIcon: fs.existsSync(WIN_ICON) ? WIN_ICON : undefined,
    }),
    new MakerZIP({}, ["darwin"]),
    new MakerRpm({}),
    new MakerDeb({}),
  ],
  plugins: [
    new VitePlugin({
      // `build` can specify multiple entry builds, which can be Main process, Preload scripts, Worker process, etc.
      // If you are familiar with Vite configuration, it will look really familiar.
      build: [
        {
          // `entry` is just an alias for `build.lib.entry` in the corresponding file of `config`.
          entry: "src/main.ts",
          config: "vite.main.config.ts",
          target: "main",
        },
        {
          entry: "src/preload.ts",
          config: "vite.preload.config.ts",
          target: "preload",
        },
      ],
      renderer: [
        {
          name: "main_window",
          config: "vite.renderer.config.ts",
        },
      ],
    }),
  ],
  // Rename Windows full nupkg and update RELEASES after make, before publish
  hooks: {
    async postMake(
      _cfg: unknown,
      makeResults: { platform: string; artifacts: string[] }[]
    ) {
      const version: string = pkg.version;
      const desiredNupkgName = `Abdul_Hamid_and_Brothers_Sales_v${version}-full.nupkg`;

      for (const res of makeResults) {
        if (res.platform !== "win32") continue;

        const releasesPath: string | undefined = res.artifacts.find(
          (a: string) => path.basename(a) === "RELEASES"
        );
        const fullIdx = res.artifacts.findIndex((a: string) =>
          /-full\.nupkg$/i.test(a)
        );
        if (fullIdx === -1) continue;

        const oldFullPath = res.artifacts[fullIdx];
        if (!oldFullPath) continue;
        const dir = path.dirname(oldFullPath);
        const newFullPath = path.join(dir, desiredNupkgName);
        const oldBase = path.basename(oldFullPath);

        if (oldBase !== desiredNupkgName) {
          // Rename the full nupkg file
          fs.renameSync(oldFullPath, newFullPath);
          res.artifacts[fullIdx] = newFullPath;

          // Rewrite RELEASES to reference the new filename
          if (releasesPath && fs.existsSync(releasesPath)) {
            let content = fs.readFileSync(releasesPath, "utf-8");
            const escaped = oldBase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            content = content.replace(
              new RegExp(escaped, "g"),
              desiredNupkgName
            );
            fs.writeFileSync(releasesPath, content, "utf-8");
          }
        }
      }
    },
  },
};

export default config;
