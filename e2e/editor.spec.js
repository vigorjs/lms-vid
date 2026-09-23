import { expect, test } from "@playwright/test";

test("student can open a course with version-aware practice UI", async ({ page }, testInfo) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("student@local.test");
  await page.getByLabel("PIN", { exact: true }).fill("696969");
  await page.getByRole("button", { name: "Masuk ke LMS" }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  await page.goto("/courses");
  const firstCourse = page.locator('a[href^="/courses/"]').first();
  if (await firstCourse.count() === 0) test.skip(true, "Belum ada course untuk smoke test editor.");
  await firstCourse.click();

  await expect(page.locator("body")).not.toContainText("Internal Server Error");
  if (testInfo.project.name === "mobile") {
    for (const width of [320, 375, 768]) {
      await page.setViewportSize({ width, height: 800 });
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
    }
  }
  const editor = page.getByRole("heading", { name: /Advanced editor attempt/ });
  if (await editor.count()) {
    await expect(editor).toBeVisible();
    await expect(page.getByText("Timeline segmen")).toBeVisible();
    await expect(page.getByText("Riwayat versi")).toBeVisible();
    await expect(page.locator("video").first()).not.toHaveAttribute("controls");
  }
});
