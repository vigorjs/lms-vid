import { expect, test } from "@playwright/test";

test("student can open a course with version-aware practice UI", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("student@local.test");
  await page.getByLabel("Password", { exact: true }).fill(process.env.DEMO_PASSWORD || "Demo123!");
  await page.getByRole("button", { name: "Masuk ke LMS" }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  await page.goto("/courses");
  const firstCourse = page.locator('a[href^="/courses/"]').first();
  if (await firstCourse.count() === 0) test.skip(true, "Belum ada course untuk smoke test editor.");
  await firstCourse.click();

  await expect(page.locator("body")).not.toContainText("Internal Server Error");
  const editor = page.getByRole("heading", { name: /Advanced editor attempt/ });
  if (await editor.count()) {
    await expect(editor).toBeVisible();
    await expect(page.getByText("Timeline segmen")).toBeVisible();
    await expect(page.getByText("Riwayat versi")).toBeVisible();
    await expect(page.locator("video").first()).not.toHaveAttribute("controls");
  }
});
