import { test } from "remix/test";
import { expect } from "remix/assert";
import { createBrowserPage } from "#/test/e2e.ts";

test("images without a CDN render directly without fabricated format or resolution variants", async (testContext) => {
  const page = await createBrowserPage(testContext);
  await page.goto("/");
  const image = page.getByRole("img", { name: "Test Margarita", exact: true });
  await image.waitFor();
  expect(await image.getAttribute("src")).toMatch(/^data:image\/png;/);
  expect(await image.getAttribute("srcset")).toBeNull();
  expect(
    await page.getByRole("link", { name: "Test Margarita", exact: true }).locator("source").count(),
  ).toBe(0);
  await page.waitForFunction(
    (element) =>
      element instanceof HTMLImageElement && element.complete && element.naturalWidth > 0,
    await image.elementHandle(),
  );
});

test("hosted images preserve format fallbacks and responsive selection at twice pixel density", async (testContext) => {
  const pageAsAdmin = await createBrowserPage(testContext, { admin: true });
  // Stub only external image bytes; the markup and browser candidate selection are real.
  await pageAsAdmin.route("https://ik.imagekit.io/**", (route) =>
    route.fulfill({
      contentType: "image/jpeg",
      path: "app/assets/images/background-768.jpg",
    }),
  );
  // The real form/upload path makes this drink use the test ImageKit boundary.
  await pageAsAdmin.goto("/admin/drinks/test-margarita/edit");
  await pageAsAdmin.waitForFunction(() => document.documentElement.dataset.remixReady === "true");
  await pageAsAdmin
    .locator('input[type="file"]')
    .setInputFiles("app/assets/images/background-768.jpg");
  await pageAsAdmin.getByAltText("Crop preview").waitFor();
  await pageAsAdmin.getByRole("button", { name: "Update Drink" }).click();
  await pageAsAdmin.waitForURL("/admin/drinks");
  // Start a fresh document so the readiness marker covers the table, rather than the old editor.
  await pageAsAdmin.goto("/admin/drinks");
  await pageAsAdmin.waitForFunction(() => document.documentElement.dataset.remixReady === "true");

  const thumbnail = pageAsAdmin
    .locator("tbody tr")
    .filter({ has: pageAsAdmin.getByRole("link", { name: "Test Margarita", exact: true }) })
    .locator("img");
  expect(await thumbnail.getAttribute("decoding")).toBe("async");
  expect(await thumbnail.getAttribute("loading")).toBe("lazy");
  expect(await thumbnail.getAttribute("srcset")).toMatch(/32w,[\s\S]*64w$/);
  const thumbnailCandidates = await thumbnail.getAttribute("srcset");
  const filter = pageAsAdmin.getByRole("textbox", { name: "Filter drinks" });
  await filter.fill("no matching cocktail");
  await pageAsAdmin.waitForFunction(() => document.querySelectorAll("tbody tr").length === 0);
  expect(await pageAsAdmin.locator("tbody tr").count()).toBe(0);
  await filter.press("Escape");
  await thumbnail.waitFor();
  await pageAsAdmin.getByRole("button", { name: "Title", exact: false }).click();
  expect(await thumbnail.getAttribute("srcset")).toBe(thumbnailCandidates);
  expect(
    await thumbnail.evaluate(
      (element, propertyName) => getComputedStyle(element).getPropertyValue(propertyName),
      "width",
    ),
  ).toBe("32px");

  await pageAsAdmin.goto("/");
  const drinkLink = pageAsAdmin.getByRole("link", { name: "Test Margarita", exact: true });
  const image = drinkLink.getByRole("img", { name: "Test Margarita", exact: true });
  const sources = drinkLink.locator("source");
  expect(await sources.count()).toBe(2);
  expect(await sources.nth(0).getAttribute("type")).toBe("image/avif");
  expect(await sources.nth(1).getAttribute("type")).toBe("image/webp");
  expect(await image.getAttribute("loading")).toBe("eager");
  expect(await image.getAttribute("fetchpriority")).toBe("high");
  const preload = pageAsAdmin.locator('head link[rel="preload"][as="image"]');
  expect(await preload.count()).toBe(1);
  expect(await preload.getAttribute("imagesrcset")).toBe(
    await sources.nth(0).getAttribute("srcset"),
  );
  expect(await preload.getAttribute("imagesizes")).toBe(await image.getAttribute("sizes"));
  expect(await image.getAttribute("sizes")).toBe(
    "(min-width: 1280px) 400px, ((min-width: 1024px) and (max-width: 1279px)) 480px, ((min-width: 640px) and (max-width: 1023px)) 420px, 100vw",
  );

  for (const [source, format] of [
    [sources.nth(0), "avif"],
    [sources.nth(1), "webp"],
    [image, null],
  ] as const) {
    const candidates = await source.getAttribute("srcset");
    if (!candidates) throw new Error("Missing responsive image candidates");
    const widths = candidates.split(",\n").map((candidate) => {
      const [sourceUrl, descriptor] = candidate.split(" ");
      const transformations = new URL(sourceUrl).searchParams.get("tr")?.split(",") ?? [];
      expect(transformations).toContain("c-maintain_ratio");
      expect(transformations).toContain("fo-auto");
      if (format) expect(transformations).toContain(`f-${format}`);
      else expect(transformations.some((value) => value.startsWith("f-"))).toBe(false);
      return Number.parseInt(descriptor, 10);
    });
    expect(widths).toEqual([320, 400, 420, 480, 640, 800, 840, 960, 1280]);
  }

  for (const width of [390, 768, 1024, 1280, 1440]) {
    await pageAsAdmin.setViewportSize({ width, height: 900 });
    await pageAsAdmin.waitForFunction(
      (element) => {
        if (!(element instanceof HTMLImageElement) || !element.complete || !element.naturalWidth)
          return false;
        const transformations =
          new URL(element.currentSrc).searchParams.get("tr")?.split(",") ?? [];
        const selectedWidth = Number(
          transformations.find((value) => value.startsWith("w-"))?.slice(2),
        );
        return (
          transformations.includes("f-avif") &&
          selectedWidth >= element.getBoundingClientRect().width * window.devicePixelRatio
        );
      },
      await image.elementHandle(),
    );
  }

  // An unsupported MIME type exercises the browser's real picture fallback selection.
  await sources.nth(0).evaluate((element) => element.setAttribute("type", "image/unsupported"));
  await pageAsAdmin.waitForFunction(
    (element) =>
      element instanceof HTMLImageElement &&
      new URL(element.currentSrc).searchParams.get("tr")?.split(",").includes("f-webp"),
    await image.elementHandle(),
  );
  await sources.nth(1).evaluate((element) => element.setAttribute("type", "image/unsupported"));
  await pageAsAdmin.waitForFunction(
    (element) =>
      element instanceof HTMLImageElement &&
      element.complete &&
      element.naturalWidth > 0 &&
      !new URL(element.currentSrc).searchParams
        .get("tr")
        ?.split(",")
        .some((value) => value.startsWith("f-")),
    await image.elementHandle(),
  );
});
