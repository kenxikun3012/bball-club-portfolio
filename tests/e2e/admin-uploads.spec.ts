import { expect, test } from "@playwright/test";
import { loginAs } from "./helpers";

// 1x1 PNG
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNgYGD4DwABBAEAwS2OUAAAAABJRU5ErkJggg==",
  "base64",
);

test("an editor uploads an image and the URL field is filled", async ({ page }) => {
  await loginAs(page, "editor");
  await page.goto("/admin/members");

  const upload = page.locator('input[type="file"]').first();
  await expect(upload).toBeAttached();

  const done = page.waitForResponse(
    (response) => response.url().endsWith("/api/admin/uploads") && response.request().method() === "POST",
  );
  await upload.setInputFiles({ name: "team photo.png", mimeType: "image/png", buffer: PNG });
  expect((await done).ok()).toBe(true);

  await expect(page.locator('input[type="url"]').first()).toHaveValue(/^https:\/\/ik\.example\.test\/club\/.+\.png$/);
  await expect(page.getByText("Unsaved changes")).toBeVisible();
});

test("a rejected file shows an error and leaves the URL untouched", async ({ page }) => {
  await loginAs(page, "editor");
  await page.goto("/admin/members");

  const url = page.locator('input[type="url"]').first();
  const before = await url.inputValue();
  await page
    .locator('input[type="file"]')
    .first()
    .setInputFiles({ name: "evil.png", mimeType: "image/png", buffer: Buffer.from("<html>not an image</html>") });

  // The field may sit inside a collapsed row, which getByRole ignores, so match the element directly.
  await expect(page.locator('p[role="alert"]', { hasText: /JPEG, PNG or WebP/ })).toBeAttached();
  await expect(url).toHaveValue(before);
});

test("viewers get no upload controls", async ({ page }) => {
  await loginAs(page, "viewer");
  await page.goto("/admin/members");
  await expect(page.locator('input[type="file"]')).toHaveCount(0);
});
