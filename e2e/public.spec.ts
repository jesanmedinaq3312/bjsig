import { expect, test } from "@playwright/test";

const publicRoutes = [
  { path: "/", heading: /Software multiempresa de RR\. HH\. y operaciones/i },
  { path: "/modulos", heading: /Módulos de recursos humanos y gestión empresarial/i },
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

test("catálogo y detalle de módulo entregan HTML inicial con contenido indexable", async ({
  page,
}) => {
  const catalogResponse = await page.request.get("/modulos");
  expect(catalogResponse.status()).toBe(200);
  const catalogHtml = await catalogResponse.text();
  expect(catalogHtml).toContain("Módulos de recursos humanos y gestión empresarial");
  expect(catalogHtml).toContain("/modulos/portal-del-trabajador");

  await page.goto("/modulos");
  await expect(page.getByRole("heading", { name: /Todos los módulos de BJSIGAPP/i })).toBeVisible();
  await expect(
    page.locator('main a[href="/modulos/portal-del-trabajador"]').first(),
  ).toHaveAttribute("href", "/modulos/portal-del-trabajador");

  const detailResponse = await page.request.get("/modulos/portal-del-trabajador");
  expect(detailResponse.status()).toBe(200);
  const detailHtml = await detailResponse.text();
  expect(detailHtml).toContain("Portal del trabajador para documentos, turnos y solicitudes");
  expect(detailHtml).toContain("¿Qué permite gestionar este módulo?");

  const unknownResponse = await page.request.get("/modulos/slug-inexistente");
  expect(unknownResponse.status()).toBe(404);
});

test("SEO publica robots, sitemap seguro y redirecciones de URLs antiguas", async ({ page }) => {
  const robotsResponse = await page.request.get("/robots.txt");
  expect(robotsResponse.status()).toBe(200);
  const robots = await robotsResponse.text();
  expect(robots).toContain("Disallow: /admin");
  expect(robots).toContain("Disallow: /trabajador");

  const sitemapResponse = await page.request.get("/sitemap.xml");
  expect([200, 503]).toContain(sitemapResponse.status());
  const sitemap = await sitemapResponse.text();
  if (sitemapResponse.status() === 200) {
    expect(sitemap).toContain("/modulos/portal-del-trabajador");
    expect(sitemap).not.toContain("/admin");
  } else {
    expect(sitemap).toContain("VITE_PUBLIC_SITE_URL");
  }

  const redirects = [
    ["/contacto", "/#contacto"],
    ["/gestion-multisucursal", "/modulos/plataforma-multiempresa"],
    ["/gestion-de-personas-y-turnos", "/modulos"],
    ["/seguridad-y-cumplimiento", "/modulos/prevencion-de-riesgos"],
    ["/software-de-gestion-empresarial", "/modulos/plataforma-multiempresa"],
  ] as const;
  for (const [path, location] of redirects) {
    const response = await page.request.get(path, { maxRedirects: 0 });
    expect(response.status(), path).toBe(308);
    expect(response.headers().location, path).toBe(location);
  }
});

test("landing muestra accesos y formulario de demo sin envío automático", async ({ page }) => {
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
  await expect(
    page.getByRole("heading", {
      name: /Software multiempresa de RR\. HH\. y operaciones/i,
      level: 1,
    }),
  ).toBeVisible();
  await expect(page.locator('a[href="/modulos"]').first()).toHaveAttribute("href", "/modulos");
  await expect(page.locator('a[href="/#comparativa"]').first()).toHaveAttribute(
    "href",
    "/#comparativa",
  );
  await expect(
    page.getByRole("heading", { name: /BJSIGAPP conecta RR\. HH\. con prevención y terreno/i }),
  ).toBeVisible();
  await expect(page.locator("#comparativa")).toContainText("BJSIGAPP sí tiene");
  await expect(page.locator("#comparativa")).toContainText(
    "¿Por qué elegir BJSIGAPP frente a cada software?",
  );
  await expect(
    page.locator("#comparativa").getByText("BJSIGAPP es mejor opción si...", { exact: true }),
  ).toHaveCount(5);
  await expect(page.locator('#comparativa a[href^="https://"]')).toHaveCount(0);
  await expect(page.locator('#comparativa a[href^="/modulos/"]')).toHaveCount(1);
  const whatsapp = page.getByRole("button", { name: /Solicitar demo por WhatsApp/i });
  await expect(whatsapp).toBeVisible();
  await expect(whatsapp).not.toHaveAttribute("href");
  await expect(page.getByRole("link", { name: "Abrir WhatsApp" })).toHaveAttribute(
    "href",
    /^https:\/\/wa\.me\//,
  );
});

test("hero responsive conserva el H1 y enlaza su imagen de fondo", async ({ page }) => {
  await page.route("**/rest/v1/rpc/fetch_public_landing_settings", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        hero_image_url: "https://cdn.example.com/bjsig-hero.webp",
        hero_link_url: "/modulos",
        hero_opacity: 0.72,
      }),
    });
  });

  for (const viewport of [
    { width: 390, height: 844 },
    { width: 768, height: 1024 },
    { width: 1440, height: 900 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("/");
    const hero = page.locator(".public-hero");
    await expect(hero.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(hero.getByTestId("hero-background-link")).toHaveAttribute("href", "/modulos");
    const dimensions = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      content: document.documentElement.scrollWidth,
    }));
    expect(dimensions.content, `hero overflow at ${viewport.width}px`).toBeLessThanOrEqual(
      dimensions.viewport + 1,
    );
  }
});

test("hero de reserva puede enlazarse sin imagen personalizada", async ({ page }) => {
  await page.route("**/rest/v1/rpc/fetch_public_landing_settings", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        hero_image_url: "",
        hero_link_url: "/modulos",
        hero_opacity: 0.72,
      }),
    });
  });

  await page.goto("/");
  const hero = page.locator(".public-hero");
  await expect(hero.getByRole("heading", { level: 1 })).toBeVisible();
  const heroLink = hero.getByTestId("hero-background-link");
  await expect(heroLink).toHaveAttribute("href", "/modulos");
  await heroLink.click({ position: { x: 8, y: 8 } });
  await expect(page).toHaveURL(/\/modulos$/);
});

test("menú móvil permite abrir y cerrar navegación sin overflow horizontal", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const cookieDialog = page.getByRole("dialog", { name: "Aviso de privacidad y cookies" });
  if (await cookieDialog.isVisible()) {
    await cookieDialog.getByRole("button", { name: "Solo necesarias" }).click();
  }
  await page.waitForLoadState("networkidle");
  await expect(page.getByRole("button", { name: "Abrir menú" })).toBeVisible();
  await page.getByRole("button", { name: "Abrir menú" }).click();
  await expect(page.getByRole("button", { name: "Cerrar menú" })).toBeVisible();
  await expect(page.locator('#public-mobile-navigation a[href="/#comparativa"]')).toBeVisible();
  await expect(page.locator('#public-mobile-navigation a[href="/modulos"]')).toBeVisible();
  await expect(page.locator('#public-mobile-navigation a[href="/admin"]')).toBeVisible();
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
