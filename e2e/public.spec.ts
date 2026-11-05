import { expect, test } from "@playwright/test";

const publicRoutes = [
  { path: "/", heading: /Deja de perseguir papeles/i },
  { path: "/privacidad", heading: /Política de privacidad/i },
  { path: "/terminos", heading: /Términos y condiciones/i },
];

for (const route of publicRoutes) {
  test(`publica ${route.path} carga sin error y conserva el título`, async ({ page }) => {
    await page.goto(route.path);
    await expect(page).toHaveTitle(/SIG|BJSIGAPP/i);
    await expect(page.getByRole("heading", { name: route.heading })).toBeVisible();
  });
}

test("landing muestra navegación, módulos y CTA de WhatsApp sin envío automático", async ({
  page,
}) => {
  await page.goto("/");
  const cookieDialog = page.getByRole("dialog", { name: "Aviso de privacidad y cookies" });
  if (await cookieDialog.isVisible()) {
    await cookieDialog.getByRole("button", { name: "Solo necesarias" }).click();
  }
  await expect(page.getByRole("banner")).toBeVisible();
  await expect(page.locator('a[href="/admin"]').first()).toHaveAttribute("href", "/admin");
  await expect(page.locator('a[href="/trabajador"]').first()).toHaveAttribute(
    "href",
    "/trabajador",
  );
  await page
    .getByRole("link", { name: /Quiero mi demo gratis/i })
    .first()
    .click();
  await expect(
    page.getByRole("heading", { name: /No te quedes atrás\. Agenda tu demo hoy/i }),
  ).toBeVisible();
  const whatsapp = page.getByRole("link", { name: /Solicitar demo por WhatsApp/i });
  await expect(whatsapp).toBeVisible();
  await expect(whatsapp).toHaveAttribute("href", /^https:\/\/wa\.me\//);
  await expect(whatsapp).toHaveAttribute("target", "_blank");
});

test("menú móvil permite abrir y cerrar navegación sin overflow horizontal", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Abrir menú" })).toBeVisible();
  await page.getByRole("button", { name: "Abrir menú" }).click();
  await expect(page.getByRole("button", { name: "Cerrar menú" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Ingresar como administrador" })).toBeVisible();
  await page.getByRole("button", { name: "Cerrar menú" }).click();
  await expect(page.getByRole("button", { name: "Abrir menú" })).toBeVisible();

  const dimensions = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth,
  }));
  expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport + 1);
});

test("landing no presenta overflow horizontal en viewports críticos", async ({ page }) => {
  for (const viewport of [
    { width: 390, height: 844 },
    { width: 768, height: 1024 },
    { width: 1440, height: 900 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("/");
    const dimensions = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      content: document.documentElement.scrollWidth,
    }));
    expect(dimensions.content, `overflow at ${viewport.width}px`).toBeLessThanOrEqual(
      dimensions.viewport + 1,
    );
  }
});

test("rutas administrativas sin sesión no exponen el panel protegido", async ({ page }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin(?:$|\?)/);
  await expect(page.getByRole("heading", { name: /BJSIGAPP|Empresa/i })).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByText(/SaaS Control|Equipo Dev|Monitoreo/i)).toHaveCount(0);
});

test("el acceso administrativo bloquea correo y contraseña si el GPS está denegado", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: {
        getCurrentPosition: (_success: unknown, error?: (reason: { code: number }) => void) => {
          error?.({ code: 1 });
        },
      },
    });
  });

  await page.goto("/admin");
  await expect(page.getByPlaceholder("prevencionista@correo.cl")).toBeDisabled();
  await expect(page.getByPlaceholder("••••••••")).toBeDisabled();
  await expect(page.getByRole("button", { name: "Ingresar al Sistema" })).toBeDisabled();
  await expect(page.getByText(/No pudimos acceder al GPS/i)).toBeVisible();
  await expect(page.getByRole("button", { name: "Reintentar activación GPS" })).toBeEnabled();
});

test("el portal trabajador habilita el RUT sólo después de activar el GPS", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: {
        getCurrentPosition: (
          success: (position: {
            coords: { latitude: number; longitude: number; accuracy: number };
          }) => void,
          error?: (reason: { code: number }) => void,
        ) => {
          if (localStorage.getItem("__qa_gps_allowed") === "1") {
            success({ coords: { latitude: -33.45, longitude: -70.66, accuracy: 15 } });
          } else {
            error?.({ code: 1 });
          }
        },
      },
    });
  });

  await page.goto("/trabajador");
  const rut = page.getByPlaceholder("12.345.678-9");
  await expect(rut).toBeDisabled();
  await expect(page.getByText(/los campos seguirán bloqueados/i)).toBeVisible();

  await page.evaluate(() => localStorage.setItem("__qa_gps_allowed", "1"));
  await page.getByRole("button", { name: "Reintentar activación GPS" }).click();
  await expect(rut).toBeEnabled();
  await expect(
    page.getByText(/GPS activo\. Los campos de acceso están habilitados/i),
  ).toBeVisible();
});

test("cada acceso conserva el branding de su empresa y no desborda en móvil", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.route("**/rest/v1/rpc/fetch_public_tenant_branding", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        {
          company_name: "Empresa de prueba",
          logo_url: "",
          color_theme: "#7c3aed",
          glass_opacity: "0.7",
        },
      ]),
    });
  });

  await page.goto("/empresa-prueba");
  await expect.poll(() => page.title()).toContain("Empresa de prueba");
  await expect(
    page.getByRole("link", { name: /panel de empresa con el mismo correo/i }),
  ).toHaveAttribute("href", "/empresa-prueba/admin");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1,
    ),
  ).toBeTruthy();

  await page.goto("/empresa-prueba/admin");
  await expect.poll(() => page.title()).toContain("Empresa de prueba");
  await expect(page.getByText(/Portal operativo: ingresa con el correo/i)).toBeVisible();
  await expect(page.getByRole("link", { name: /Portal del Trabajador/i })).toHaveAttribute(
    "href",
    "/empresa-prueba",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1,
    ),
  ).toBeTruthy();
  expect(
    await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue("--color-primary").trim(),
    ),
  ).toBe("#7c3aed");
});
