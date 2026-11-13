import { expect, test } from "@playwright/test";
import { loginAs } from "./helpers";

test("an owner creates a user and sees the one-time temporary password", async ({ page }) => {
  const email = `e2e.new.${Date.now()}@example.com`;
  await loginAs(page, "owner");
  await page.goto("/admin/users");

  await page.getByLabel("New user email").fill(email);
  await page.locator("form select").selectOption("editor");
  await page.getByRole("button", { name: "Add user" }).click();

  const panel = page.getByRole("status").filter({ hasText: "Temporary password" });
  await expect(panel).toBeVisible();
  await expect(panel.locator("code")).toHaveText(/^[A-Za-z2-9]{16}$/);
  await expect(page.getByRole("cell", { name: email })).toBeVisible();

  await panel.getByRole("button", { name: "Dismiss" }).click();
  await expect(panel).toHaveCount(0);
});

test("editors are redirected away from the users page", async ({ page }) => {
  await loginAs(page, "editor");
  await page.goto("/admin/users");
  await expect(page).toHaveURL(/\/admin$/);
});
