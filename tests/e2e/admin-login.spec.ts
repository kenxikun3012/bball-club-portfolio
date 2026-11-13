import { expect, test } from "@playwright/test";
import { PASSWORD, USERS } from "./helpers";

test.describe("admin login", () => {
  test("signed-out visitors are redirected to the login page", async ({ page }) => {
    await page.goto("/admin/members");
    await expect(page).toHaveURL(/\/admin\/login/);
    await expect(page.getByRole("heading", { name: /sign in/i })).toBeVisible();
  });

  test("a wrong password shows an error and stays on the login page", async ({ page }) => {
    await page.goto("/admin/login");
    await page.getByLabel("Email").fill(USERS.wrong);
    await page.getByLabel("Password").fill("definitely-not-the-password");
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page.getByText("Email or password is incorrect.")).toBeVisible();
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test("a correct login reaches the overview and signing out returns to login", async ({ page }) => {
    await page.goto("/admin/login");
    await page.getByLabel("Email").fill(USERS.viewer);
    await page.getByLabel("Password").fill(PASSWORD);
    await page.getByRole("button", { name: /sign in/i }).click();

    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.getByRole("heading", { name: "Overview." })).toBeVisible();

    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/admin\/login/);
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test("owner-only links are hidden from editors", async ({ page }) => {
    await page.goto("/admin/login");
    await page.getByLabel("Email").fill(USERS.editor);
    await page.getByLabel("Password").fill(PASSWORD);
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page.getByRole("heading", { name: "Overview." })).toBeVisible();
    await expect(page.getByRole("link", { name: "Users" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Audit log" })).toHaveCount(0);
  });
});
