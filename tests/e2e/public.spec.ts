import { expect, test } from "@playwright/test";

test.describe("public site", () => {
  test("loads, hydrates and reveals content without console or CSP errors", async ({ page }) => {
    const problems: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") problems.push(message.text());
    });
    page.on("pageerror", (error) => problems.push(error.message));

    await page.goto("/");
    await expect(page.locator("html")).toHaveClass(/\bjs\b/); // inline nonce script ran
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    await page.locator("#trophies").scrollIntoViewIfNeeded();
    await expect(page.locator("#trophies")).toBeVisible();
    await expect(page.locator("#join")).toBeAttached();

    expect(problems, problems.join("\n")).toEqual([]);
  });

  test("join form exposes labelled fields", async ({ page }) => {
    await page.goto("/");
    const form = page.locator("form").filter({ has: page.locator("#join-email") });
    await form.scrollIntoViewIfNeeded();
    for (const label of ["join-name", "join-email", "join-phone", "join-year", "join-position", "join-message"]) {
      await expect(page.locator(`#${label}`)).toBeAttached();
      await expect(page.locator(`label[for="${label}"]`)).toBeAttached();
    }
  });

  test("works at a mobile width without horizontal scrolling", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });

  test("serves robots.txt and security headers", async ({ request }) => {
    const robots = await request.get("/robots.txt");
    expect(await robots.text()).toContain("Disallow: /admin");
    const home = await request.get("/");
    expect(home.headers()["content-security-policy"]).toContain("frame-ancestors 'none'");
  });
});
