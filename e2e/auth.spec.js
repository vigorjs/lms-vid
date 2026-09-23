import { expect, test } from "@playwright/test";

async function login(page, email) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("PIN", { exact: true }).fill("696969");
  await page.getByRole("button", { name: "Masuk ke LMS" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

test("admin sees administration navigation", async ({ page }, testInfo) => {
  await login(page, process.env.SEED_ADMIN_EMAIL || "admin@local.test");
  if (testInfo.project.name === "mobile") {
    await page.getByRole("button", { name: "Buka menu" }).click();
  }
  await expect(page.getByRole("link", { name: "Pengguna" })).toBeVisible();
  if (testInfo.project.name === "mobile") {
    await page.getByRole("dialog", { name: "Navigasi utama" }).getByRole("button", { name: "Tutup menu" }).click();
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
  }
  await expect(page.getByRole("heading", { name: "Dashboard administrator" })).toBeVisible();
  if (testInfo.project.name === "mobile") {
    await page.goto("/admin/users");
    for (const width of [320, 375, 768]) {
      await page.setViewportSize({ width, height: 800 });
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
    }
  }
});

test("student cannot open admin area", async ({ page }) => {
  await login(page, "student@local.test");
  await page.goto("/admin/users");
  await expect(page).toHaveURL(/\/unauthorized/);
});

test("teacher workspaces fit mobile widths", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "Mobile layout only.");
  await login(page, "teacher@local.test");
  for (const route of ["/teacher/courses", "/teacher/reviews"]) {
    await page.goto(route);
    for (const width of [320, 375, 768]) {
      await page.setViewportSize({ width, height: 800 });
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
    }
  }
});

test("mobile student can log out from the header", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "Mobile navigation only.");
  await login(page, "student@local.test");
  await expect(page.getByRole("button", { name: "Keluar" })).toBeVisible();
  await page.getByRole("button", { name: "Keluar" }).click();
  await expect(page).toHaveURL(/\/login/);
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login/);
});
