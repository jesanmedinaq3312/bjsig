import { test, expect, type Page } from "@playwright/test";

type TenantUser = {
  email: string;
  tenantSlug: string;
  tenantName: string;
  expectedText?: string;
};

type TenantTarget = {
  tenantSlug: string;
  tenantName: string;
  expectedText?: string;
};

function parseJson<T>(name: string, fallback: T): T {
  const raw = process.env[name];
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    throw new Error(`${name} must contain valid JSON`);
  }
}

const adminUsers = parseJson<TenantUser[]>("E2E_ADMIN_USERS_JSON", []);
const developerTenants = parseJson<TenantTarget[]>("E2E_DEVELOPER_TENANTS_JSON", []);
const adminPassword = process.env.E2E_ADMIN_PASSWORD;
const developerEmail = process.env.E2E_DEVELOPER_EMAIL;
const developerPassword = process.env.E2E_DEVELOPER_PASSWORD;
const hasAdminScenario = Boolean(adminPassword && adminUsers.length >= 2);
const hasDeveloperScenario = Boolean(
  developerEmail && developerPassword && developerTenants.length >= 2,
);
const requireAuthScenario = process.env.CI === "true" || process.env.E2E_REQUIRE_AUTH === "true";

async function loginAsAdmin(page: Page, user: TenantUser): Promise<void> {
  await page.goto("/admin");
  await page.locator('input[type="email"]:visible').first().fill(user.email);
  await page.locator('input[type="password"]:visible').first().fill(adminPassword!);
  await page.getByRole("button", { name: "Ingresar al Sistema" }).click();
  await expect(page).not.toHaveURL(/\/admin$/);
}

async function assertTenantPage(page: Page, target: TenantTarget): Promise<void> {
  await page.goto(`/${target.tenantSlug}/admin/dashboard`);
  await expect(page).toHaveURL(new RegExp(`/${target.tenantSlug}/admin/dashboard`));
  await expect(page.locator("body")).not.toContainText("El plano de control SaaS");
  if (target.expectedText) {
    await expect(page.locator("body")).toContainText(target.expectedText);
  }
}

test.describe("multi-tenant authorization", () => {
  test("each admin sees only its assigned tenant and cannot jump to another tenant", async ({
    page,
  }) => {
    if (requireAuthScenario && !hasAdminScenario) {
      throw new Error(
        "Authenticated E2E is required, but E2E_ADMIN_PASSWORD or two E2E_ADMIN_USERS_JSON users are missing",
      );
    }
    test.skip(
      !hasAdminScenario,
      "Set E2E_ADMIN_PASSWORD and two E2E_ADMIN_USERS_JSON staging users",
    );
    const [first, second] = adminUsers;
    await loginAsAdmin(page, first);
    await assertTenantPage(page, first);
    await page.goto(`/${second.tenantSlug}/admin/dashboard`);
    await expect(page.locator("body")).not.toContainText(second.expectedText ?? second.tenantName);
    await expect(page.locator("body")).not.toContainText("Trabajadores de la empresa");
  });

  test("developer can switch only across explicitly assigned tenants", async ({ page }) => {
    if (requireAuthScenario && !hasDeveloperScenario) {
      throw new Error(
        "Authenticated E2E is required, but developer credentials or two E2E_DEVELOPER_TENANTS_JSON targets are missing",
      );
    }
    test.skip(!hasDeveloperScenario, "Set developer credentials and two assigned tenant targets");
    await page.goto("/admin");
    await page.locator('input[type="email"]:visible').first().fill(developerEmail!);
    await page.locator('input[type="password"]:visible').first().fill(developerPassword!);
    await page.getByRole("button", { name: "Ingresar al Sistema" }).click();
    await expect(page).toHaveURL(/\/admin-saas/);
    for (const tenant of developerTenants) {
      await assertTenantPage(page, tenant);
    }
  });
});
