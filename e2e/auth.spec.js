import { expect, test } from "@playwright/test";

async function login(page, email) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(process.env.DEMO_PASSWORD || "Demo123!");
  await page.getByRole("button", { name: "Masuk ke LMS" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

test("admin sees administration navigation", async ({ page }) => {
  await login(page, process.env.SEED_ADMIN_EMAIL || "admin@local.test");
  await expect(page.getByRole("link", { name: "Pengguna" })).toBeVisible();
  await expect(page.getByText("Dashboard administrator")).toBeVisible();
});

test("student cannot open admin area", async ({ page }) => {
  await login(page, "student@local.test");
  await page.goto("/admin/users");
  await expect(page).toHaveURL(/\/unauthorized/);
});
