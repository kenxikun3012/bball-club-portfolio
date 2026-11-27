import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { loginAs } from "./helpers";

/**
 * Automated WCAG 2.x A/AA scans. Serious and critical violations fail the run,
 * including colour contrast (the muted text colour was darkened to meet AA).
 */
const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

async function scan(page: Page, label: string) {
  const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  const blocking = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  for (const violation of results.violations) {
    const where = violation.nodes.slice(0, 3).map((node) => node.target.join(" ")).join(" | ");
    console.log(`[a11y] ${label}: ${violation.id} (${violation.impact}) x${violation.nodes.length} — ${where}`);
  }
  expect(
    blocking.map((v) => `${v.id} x${v.nodes.length}`),
    `${label}: serious/critical accessibility violations`,
  ).toEqual([]);
}

test.describe("public pages", () => {
  test("home page", async ({ page }) => {
    await page.goto("/");
    await page.locator("#join").scrollIntoViewIfNeeded();
    await page.waitForTimeout(800); // let scroll-reveal animations settle
    await scan(page, "home");
  });

  test("admin login page", async ({ page }) => {
    await page.goto("/admin/login");
    await scan(page, "login");
  });
});

test.describe("admin pages (owner)", () => {
  for (const path of [
    "/admin",
    "/admin/members",
    "/admin/hall-of-fame",
    "/admin/achievements",
    "/admin/activities",
    "/admin/applications",
    "/admin/users",
    "/admin/audit",
    "/admin/settings",
  ]) {
    test(path, async ({ page }) => {
      await loginAs(page, "owner");
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await scan(page, path);
    });
  }
});
