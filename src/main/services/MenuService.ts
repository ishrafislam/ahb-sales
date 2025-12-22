import {
  Menu,
  type MenuItemConstructorOptions,
  autoUpdater,
  BrowserWindow,
} from "electron";
import { getLanguage, setLanguage, dict } from "../i18n";
import type { FileService } from "./FileService";
import type { SettingsService } from "./SettingsService";
import { logger } from "./Logger";

export class MenuService {
  constructor(
    private fileService: FileService,
    private settingsService: SettingsService
  ) {}

  private notifyAll(channel: string, ...args: unknown[]) {
    BrowserWindow.getAllWindows().forEach((w) =>
      w.webContents.send(channel, ...args)
    );
  }

  buildMenu(): void {
    const lang = getLanguage();
    const d = dict[lang];
    const themeSource =
      this.settingsService.loadSettings().themeSource ?? "system";
    const currentFilePath = this.fileService.getCurrentFilePath();
    const isDirty = this.fileService.getIsDirty();

    const template: MenuItemConstructorOptions[] = [
      {
        label: d.menu_file,
        submenu: [
          {
            label: d.menu_new,
            accelerator: process.platform === "darwin" ? "Cmd+N" : "Ctrl+N",
            click: (): void => {
              void this.fileService.newFileFlow();
            },
          },
          {
            label: d.menu_open,
            accelerator: process.platform === "darwin" ? "Cmd+O" : "Ctrl+O",
            click: (): void => {
              void this.fileService.openFileFlow();
            },
          },
          {
            label: d.menu_save,
            enabled: Boolean(currentFilePath && isDirty),
            accelerator: process.platform === "darwin" ? "Cmd+S" : "Ctrl+S",
            click: (): void => {
              void this.fileService.handleSaveFile();
            },
          },
          {
            label: d.menu_save_as,
            enabled: Boolean(currentFilePath),
            accelerator:
              process.platform === "darwin" ? "Shift+Cmd+S" : "Ctrl+Shift+S",
            click: (): void => {
              void this.fileService.handleSaveFileAs();
            },
          },
          { type: "separator" },
          {
            label: d.menu_close,
            enabled: Boolean(currentFilePath),
            accelerator: process.platform === "darwin" ? "Cmd+W" : "Ctrl+W",
            click: (): void => {
              void this.fileService.closeFileFlow();
            },
          },
          {
            label: d.menu_quit ?? "Quit",
            accelerator: process.platform === "darwin" ? "Cmd+Q" : "Alt+F4",
            click: (): void => {
              void this.quitAppFlow();
            },
          },
        ],
      },
      {
        label: d.settings ?? "Settings",
        submenu: [
          {
            label: `${d.print} ${d.settings_title ?? d.settings ?? "Settings"}`,
            click: (): void => {
              this.notifyAll("app:open-settings");
            },
          },
          {
            label: d.menu_language ?? "Language",
            submenu: [
              {
                label: "বাংলা",
                type: "radio",
                checked: lang === "bn",
                click: (): void => {
                  setLanguage("bn");
                  this.notifyAll("app:language-changed", "bn");
                  this.buildMenu();
                },
              },
              {
                label: "English",
                type: "radio",
                checked: lang === "en",
                click: (): void => {
                  setLanguage("en");
                  this.notifyAll("app:language-changed", "en");
                  this.buildMenu();
                },
              },
            ],
          },
          {
            label: d.menu_theme ?? "Theme",
            submenu: [
              {
                label: d.theme_system ?? "System",
                type: "radio",
                checked: themeSource === "system",
                click: (): void => {
                  this.settingsService.setTheme("system");
                  this.buildMenu();
                },
              },
              {
                label: d.theme_light ?? "Light",
                type: "radio",
                checked: themeSource === "light",
                click: (): void => {
                  this.settingsService.setTheme("light");
                  this.buildMenu();
                },
              },
              {
                label: d.theme_dark ?? "Dark",
                type: "radio",
                checked: themeSource === "dark",
                click: (): void => {
                  this.settingsService.setTheme("dark");
                  this.buildMenu();
                },
              },
            ],
          },
        ],
      },
      {
        label: d.about ?? "About",
        submenu: [
          {
            label: d.about_app ?? d.about ?? "About",
            click: (): void => {
              this.notifyAll("app:open-about");
            },
          },
          { type: "separator" },
          {
            label: d.check_updates ?? "Check for Updates",
            click: (): void => {
              try {
                autoUpdater.checkForUpdates();
              } catch (e) {
                logger.error("checkForUpdates failed", "MenuService", e);
              }
            },
          },
        ],
      },
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
  }

  private async quitAppFlow(): Promise<void> {
    const { app } = await import("electron");
    if (this.fileService.getIsDirty()) {
      const decision = await this.fileService.askToSaveChanges();
      if (decision === "cancel") return;
      if (decision === "save") {
        const ok = await this.fileService.saveCurrentPossiblyAs();
        if (!ok) return;
      }
    }
    app.quit();
  }
}
