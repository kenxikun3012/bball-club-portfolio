import { expect, test } from "@playwright/test";
import { APPLICANT, loginAs } from "./helpers";

test("an editor changes an application's status and adds a note that persist", async ({ page }) => {
  const note = `E2E note ${Date.now()}`;
  await loginAs(page, "editor");
  await page.goto(`/admin/applications?q=${encodeURIComponent(APPLICANT.email)}`);

  const row = page.locator("details").filter({ hasText: APPLICANT.name });
  await row.locator("summary").click();

  const statusSaved = page.waitForResponse(
    (response) => response.request().method() === "PATCH" && response.url().includes("/api/admin/applications/"),
  );
  await row.getByLabel(`Status for ${APPLICANT.name}`).selectOption("shortlisted");
  expect((await statusSaved).ok()).toBe(true);
  await expect(row.getByLabel(`Status for ${APPLICANT.name}`)).toHaveValue("shortlisted");

  await row.getByLabel(`Add a note for ${APPLICANT.name}`).fill(note);
  // Wait for the save to finish; the typed text alone (still in the textarea) must not count.
  const saved = page.waitForResponse(
    (response) => response.request().method() === "PATCH" && response.url().includes("/api/admin/applications/"),
  );
  await row.getByRole("button", { name: "Add note" }).click();
  expect((await saved).ok()).toBe(true);
  await expect(row.locator("li").getByText(note)).toBeVisible();

  await page.reload();
  const again = page.locator("details").filter({ hasText: APPLICANT.name });
  await again.locator("summary").click();
  await expect(again.getByLabel(`Status for ${APPLICANT.name}`)).toHaveValue("shortlisted");
  await expect(again.locator("li").getByText(note)).toBeVisible();
});

test("a viewer cannot change applications and sees no export link", async ({ page }) => {
  await loginAs(page, "viewer");
  await page.goto(`/admin/applications?q=${encodeURIComponent(APPLICANT.email)}`);
  const row = page.locator("details").filter({ hasText: APPLICANT.name });
  await row.locator("summary").click();
  await expect(row.getByLabel(`Status for ${APPLICANT.name}`)).toBeDisabled();
  await expect(page.getByRole("link", { name: "Export CSV" })).toHaveCount(0);
});
