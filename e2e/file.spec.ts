import { test } from "./setup";

test.describe("File Operations", () => {
  test("TC_001: Create New File", async ({ electronApp }) => {
    const window = await electronApp.firstWindow();

    // Wait for app to load
    await window.waitForSelector("text=New File");
  });
});
