import { expect, test } from "@playwright/test";
import { loginAs } from "./helpers";

test("an editor adds an honour and the public site shows it immediately", async ({ page }) => {
  const title = `E2E honour ${Date.now()}`;
  await loginAs(page, "editor");

  await page.goto("/admin/achievements");
  await page.getByRole("button", { name: "+ Add honour" }).click();

  // The honours list is the last array on this page and new rows append, so the new row is last.
  // (Its summary text changes as fields are filled, so do not locate it by text.)
  const row = page.locator("details").last();
  if (!(await row.evaluate((el) => (el as HTMLDetailsElement).open))) await row.locator("summary").click();
  await row.getByLabel("Year").fill("2099");
  await row.getByLabel("Title").fill(title);
  await row.getByLabel("Competition").fill("E2E Cup");
  await row.getByLabel("Result").fill("Champions");

  await expect(page.getByText("Unsaved changes")).toBeVisible();
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText(/^Saved/)).toBeVisible();

  await page.goto("/");
  await expect(page.getByText(title).first()).toBeAttached();
});

test("a viewer sees the editor read-only", async ({ page }) => {
  await loginAs(page, "viewer");
  await page.goto("/admin/achievements");
  await expect(page.getByRole("button", { name: "Save changes" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "+ Add honour" })).toHaveCount(0);
});
