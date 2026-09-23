import { expect, test } from "@playwright/test";

test("student registers, resumes PIN setup, and then logs in", async ({ page }) => {
  const email = `student-${Date.now()}-${Math.random().toString(36).slice(2)}@local.test`;
  await page.goto("/register");
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Daftar dan lanjutkan" }).click();
  await expect(page).toHaveURL(/\/setup-pin/);

  await page.goto("/courses");
  await expect(page).toHaveURL(/\/setup-pin/);
  const blocked = await page.evaluate(async () => {
    const response = await fetch("/api/progress/not-a-course", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ positionSeconds: 1, durationSeconds: 10 }) });
    return response.status;
  });
  expect(blocked).toBe(403);

  await page.evaluate(() => fetch("/api/auth/logout", { method: "POST" }));
  await page.goto("/register");
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Daftar dan lanjutkan" }).click();
  await expect(page).toHaveURL(/\/setup-pin/);
  await page.getByLabel("PIN baru").fill("123456");
  await page.getByLabel("Ulangi PIN").fill("123456");
  await page.getByRole("button", { name: "Simpan PIN dan lanjutkan" }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  await page.evaluate(() => fetch("/api/auth/logout", { method: "POST" }));
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("PIN", { exact: true }).fill("123456");
  await page.getByRole("button", { name: "Masuk ke LMS" }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  await page.goto("/register");
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Daftar dan lanjutkan" }).click();
  await expect(page.getByText("Email sudah terdaftar. Silakan masuk.")).toBeVisible();
});

test("new teacher replaces the initial PIN before accessing the dashboard", async ({ page }) => {
  const email = `teacher-${Date.now()}-${Math.random().toString(36).slice(2)}@local.test`;
  await page.goto("/login");
  await page.getByLabel("Email").fill(process.env.SEED_ADMIN_EMAIL || "admin@local.test");
  await page.getByLabel("PIN", { exact: true }).fill("696969");
  await page.getByRole("button", { name: "Masuk ke LMS" }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  await page.goto("/admin/users");
  await page.getByLabel("Nama", { exact: true }).fill("Teacher PIN Test");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Role").selectOption("TEACHER");
  await page.getByRole("button", { name: "Buat pengguna" }).click();
  await expect(page.getByText(email)).toBeVisible();

  await page.evaluate(() => fetch("/api/auth/logout", { method: "POST" }));
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("PIN", { exact: true }).fill("696969");
  await page.getByRole("button", { name: "Masuk ke LMS" }).click();
  await expect(page).toHaveURL(/\/setup-pin/);
  await page.getByLabel("PIN baru").fill("696969");
  await page.getByLabel("Ulangi PIN").fill("696969");
  await page.getByRole("button", { name: "Simpan PIN dan lanjutkan" }).click();
  await expect(page.getByText("Pilih PIN selain PIN awal.")).toBeVisible();
  await page.getByLabel("PIN baru").fill("234567");
  await page.getByLabel("Ulangi PIN").fill("234567");
  await page.getByRole("button", { name: "Simpan PIN dan lanjutkan" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
});
