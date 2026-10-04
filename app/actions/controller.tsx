import { createController } from "remix/router";
import { redirect } from "remix/response/redirect";
import { parseSafe, object, string, enum_ } from "remix/data-schema";
import { rawSql } from "remix/data-table";
import { assets, fetchHmrEvents } from "#/app/assets.ts";
import { routes } from "#/app/routes.ts";
import { getDb } from "#/app/db/client.server.ts";
import {
  createAdminDrinksWriteService,
  createDrinksService,
} from "#/app/modules/drinks/drinks.server.ts";
import { authenticate, initiateLogin, logout } from "#/app/modules/identity/identity.server.ts";
import { uploadImage, deleteImage } from "#/app/integrations/imagekit.server.ts";
import { purgeDrinkCache } from "#/app/integrations/fastly.server.ts";
import {
  createAdminDrinkActionAdapter,
  updateAdminDrinkActionAdapter,
  deleteAdminDrinkActionAdapter,
} from "#/app/web/admin-drink-write/route-adapter.server.ts";
import { getEnvVars } from "#/app/core/env.server.ts";
import { imageUrl } from "#/app/core/images.ts";
import { Document } from "#/app/ui/document.tsx";
import { Gallery } from "#/app/ui/gallery.tsx";
import { DrinkList } from "#/app/ui/drinks/drink-list.tsx";
import { DrinkSummary } from "#/app/ui/drinks/drink-summary.tsx";
import { DrinkDetails } from "#/app/ui/drinks/drink-details.tsx";
import { Glass } from "#/app/ui/drinks/glass.tsx";
import { Tag } from "#/app/ui/tags/tag.tsx";
import { TagLink } from "#/app/ui/tags/tag-link.tsx";
import { SearchForm } from "#/app/ui/public/search-form.tsx";
import { SearchResults } from "#/app/ui/public/search-results.tsx";
import { NotFound } from "#/app/ui/core/not-found.tsx";
import { Icon } from "#/app/ui/icons/icon.tsx";
import { AdminLayout } from "#/app/ui/admin-layout.tsx";
import { AdminDrinksList } from "#/app/ui/public/admin-drinks-list.tsx";
import { DrinkForm } from "#/app/ui/public/drink-form.tsx";

const publicHeaders = {
  "Cache-Control":
    "public, max-age=30, s-maxage=31536000, stale-while-revalidate=600, stale-if-error=86400",
  "Surrogate-Key": "all",
};
const notFoundHeaders = {
  "Cache-Control": "public, max-age=30, s-maxage=60, must-revalidate",
  "Surrogate-Key": "all",
};
function drinksService() {
  return createDrinksService({ db: getDb() });
}
function writeService() {
  return createAdminDrinksWriteService({
    db: getDb(),
    writeEffects: { uploadImage, deleteImage, purgeDrinkCache },
  });
}
const toastSchema = object({
  kind: enum_(["success", "warning", "error"] as const),
  message: string(),
});
function readToast(value: unknown) {
  const result = parseSafe(toastSchema, value);
  return result.success ? result.value : undefined;
}

export default createController(routes, {
  actions: {
    async assets(context) {
      const hmrEvents = await fetchHmrEvents(context.request);
      if (hmrEvents) return hmrEvents;
      return (await assets.fetch(context.request)) ?? new Response("Not Found", { status: 404 });
    },
    async home(context) {
      return context.render(
        <Document>
          <Gallery breadcrumbs={[{ title: "All Drinks" }]}>
            <DrinkList drinks={await drinksService().getPublishedDrinks()} />
          </Gallery>
        </Document>,
        { headers: { ...publicHeaders, "Surrogate-Key": "all index" } },
      );
    },
    async search(context) {
      const query = new URL(context.request.url).searchParams.get("q") ?? "";
      const drinks = await drinksService().searchPublishedDrinks({ query });
      return context.render(
        <Document
          title="Search Drinks"
          description="Search all drinks by ingredient or description"
        >
          <Gallery
            breadcrumbs={[
              { title: "All Drinks", href: "/" },
              { title: "Search", href: query ? "/search" : undefined },
              ...(query
                ? [
                    {
                      title: (
                        <span>
                          &quot;<span>{query}</span>&quot;
                        </span>
                      ),
                    },
                  ]
                : []),
            ]}
          >
            <SearchForm initialSearchTerm={query} />
            <SearchResults query={query} drinks={drinks} />
          </Gallery>
        </Document>,
        { headers: { ...publicHeaders, "Surrogate-Key": query ? "search all" : "all" } },
      );
    },
    async tags(context) {
      const tags = await drinksService().getAllTags();
      return context.render(
        <Document title="Ingredient Tags" description="Discover drinks by ingredient">
          <Gallery breadcrumbs={[{ title: "All Drinks", href: "/" }, { title: "Tags" }]}>
            <div className="mx-4 grid gap-4 sm:mx-0 sm:gap-8 lg:grid-cols-2 xl:grid-cols-3">
              {tags.map((tag) => (
                <TagLink to={`/tags/${tag.slug}`} key={tag.slug}>
                  <Tag className="p-4 text-2xl lg:p-6 lg:text-4xl">{tag.displayName}</Tag>
                </TagLink>
              ))}
            </div>
          </Gallery>
        </Document>,
        {
          headers: {
            ...publicHeaders,
            "Surrogate-Key": `all tags ${tags.map((tag) => tag.slug).join(" ")}`,
          },
        },
      );
    },
    async tag(context) {
      const taggedDrinks = await drinksService().getDrinksByTagSlug({
        tagSlug: context.params.tag,
      });
      if (!taggedDrinks)
        return context.render(
          <Document title="Not Found" description="There's nothing of interest here.">
            <NotFound />
          </Document>,
          { status: 404, headers: notFoundHeaders },
        );
      return context.render(
        <Document
          title={`Drinks with ${taggedDrinks.tag.displayName}`}
          description={`All drinks containing ${taggedDrinks.tag.displayName}`}
        >
          <Gallery
            breadcrumbs={[
              { title: "All Drinks", href: "/" },
              { title: "Tags", href: "/tags" },
              {
                title: (
                  <div className="inline-flex gap-2">
                    <span>{taggedDrinks.tag.displayName}</span>
                    <span>( {taggedDrinks.drinks.length} )</span>
                  </div>
                ),
              },
            ]}
          >
            <DrinkList drinks={taggedDrinks.drinks} />
          </Gallery>
        </Document>,
        { headers: { ...publicHeaders, "Surrogate-Key": `all tags ${taggedDrinks.tag.slug}` } },
      );
    },
    async drink(context) {
      const result = await drinksService().getDrinkBySlug({
        slug: context.params.slug,
        viewerRole: context.auth.ok && context.auth.identity.role === "admin" ? "admin" : "user",
      });
      if (!result)
        return context.render(
          <Document title="Not Found" description="There's nothing of interest here.">
            <NotFound />
          </Document>,
          { status: 404, headers: notFoundHeaders },
        );
      const { drink } = result;
      return context.render(
        <Document
          title={drink.title}
          description={drink.ingredients.join(", ")}
          socialTitle={drink.title}
          socialDescription={drink.ingredients.join(", ")}
          socialImage={imageUrl(drink.image.url, 1200, "jpg", 630, 50)}
          socialImageAlt={`${drink.title} in a glass`}
        >
          <Gallery breadcrumbs={[{ title: "All Drinks", href: "/" }, { title: drink.title }]}>
            <Glass>
              <DrinkSummary
                className="lg:flex-row"
                drink={drink}
                breakpoints={[320, 400, 420, 480, 640, 800, 840, 960, 1280]}
                sizes="(min-width: 1280px) 640px, ((min-width: 1024px) and (max-width: 1279px)) 480px, ((min-width: 640px) and (max-width: 1023px)) 420px, 100vw"
                stacked
                priority
              />
              <DrinkDetails drink={drink} />
            </Glass>
          </Gallery>
        </Document>,
        {
          headers:
            result.visibility === "public"
              ? { ...publicHeaders, "Surrogate-Key": `all ${drink.slug}` }
              : { "Cache-Control": "private, no-store" },
        },
      );
    },
    login: initiateLogin,
    callback: authenticate,
    logout,
    loginFailed(context) {
      return context.render(
        <Document title="Login Failed | drinks.fyi">
          <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 text-zinc-200">
            <div className="flex flex-col items-center gap-4">
              <Icon name="mdi-login" size={64} className="text-amber-600" />
              <h1 className="text-2xl font-bold text-zinc-100">Login Failed</h1>
              <p className="text-zinc-400">Unable to authenticate. Please try again.</p>
              <a
                href="/login"
                className="mt-2 rounded bg-amber-600 px-4 py-2 font-medium text-zinc-950 hover:bg-amber-500"
              >
                Try again
              </a>
            </div>
          </div>
        </Document>,
      );
    },
    unauthorized(context) {
      return context.render(
        <Document title="Unauthorized | drinks.fyi">
          <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 text-zinc-200">
            <div className="flex flex-col items-center gap-4">
              <Icon name="mdi-shield-lock-outline" size={64} className="text-amber-600" />
              <h1 className="text-2xl font-bold text-zinc-100">Unauthorized</h1>
              <p className="text-zinc-400">You do not have permission to access this page.</p>
              <a
                href="/"
                className="mt-2 rounded bg-amber-600 px-4 py-2 font-medium text-zinc-950 hover:bg-amber-500"
              >
                Go home
              </a>
            </div>
          </div>
        </Document>,
      );
    },
    admin() {
      return redirect("/admin/drinks");
    },
    async adminDrinks(context) {
      if (!context.auth.ok) return redirect("/login");
      const drinks = (await drinksService().getAllDrinks()).map((drink) => ({
        ...drink,
        createdAt: drink.createdAt.toISOString(),
        updatedAt: drink.updatedAt.toISOString(),
      }));
      return context.render(
        <Document title="All Drinks | drinks.fyi">
          <AdminLayout user={context.auth.identity} toast={readToast(context.session.get("toast"))}>
            <AdminDrinksList drinks={drinks} />
          </AdminLayout>
        </Document>,
      );
    },
    newDrink(context) {
      if (!context.auth.ok) return redirect("/login");
      return context.render(
        <Document title="New Drink | drinks.fyi">
          <AdminLayout user={context.auth.identity}>
            <div>
              <h1 className="mb-6 text-2xl font-medium text-zinc-200">Add New Drink</h1>
              <DrinkForm action="/admin/drinks/new" />
            </div>
          </AdminLayout>
        </Document>,
      );
    },
    async editDrink(context) {
      if (!context.auth.ok) return redirect("/login");
      const editor = await drinksService().findDrinkEditorBySlug(context.params.slug);
      if (!editor)
        return context.render(
          <Document title="Not Found">
            <NotFound />
          </Document>,
          { status: 404 },
        );
      return context.render(
        <Document title={`Edit ${editor.initialValues.title} | drinks.fyi`}>
          <AdminLayout user={context.auth.identity}>
            <div>
              <h1 className="mb-6 text-2xl font-medium text-zinc-200">Edit Drink</h1>
              <DrinkForm editor={editor} action={`/admin/drinks/${context.params.slug}/edit`} />
            </div>
          </AdminLayout>
        </Document>,
      );
    },
    createDrink(context) {
      return createAdminDrinkActionAdapter({
        request: context.request,
        session: context.session,
        adminDrinksWriteService: writeService(),
      });
    },
    updateDrink(context) {
      return updateAdminDrinkActionAdapter({
        request: context.request,
        session: context.session,
        slug: context.params.slug,
        adminDrinksWriteService: writeService(),
      });
    },
    deleteDrink(context) {
      return deleteAdminDrinkActionAdapter({
        request: context.request,
        session: context.session,
        slug: context.params.slug,
        adminDrinksWriteService: writeService(),
      });
    },
    deleteRedirect() {
      return redirect("/admin/drinks");
    },
    async healthcheck() {
      await getDb().exec(rawSql("SELECT 1"));
      return new Response("ok");
    },

    robots() {
      return new Response(
        `User-agent: *\n${getEnvVars().DEPLOYMENT_ENV === "prod" ? "Allow: /" : "Disallow: /"}`,
        {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "public, max-age=3600",
          },
        },
      );
    },
    manifest() {
      return Response.json(
        {
          name: "drinks.fyi",
          short_name: "Drinks",
          lang: "en-US",
          start_url: "/",
          display: "minimal-ui",
          background_color: "#137752",
          theme_color: "#137752",
          icons: [192, 512].flatMap((size) => [
            {
              src: `/images/icon-${size}x${size}.png`,
              sizes: `${size}x${size}`,
              type: "image/png",
            },
            {
              src: `/images/icon-maskable-${size}x${size}.png`,
              sizes: `${size}x${size}`,
              type: "image/png",
              purpose: "maskable",
            },
          ]),
        },
        {
          headers: {
            "Content-Type": "application/manifest+json",
            "Cache-Control": "no-cache, must-revalidate",
          },
        },
      );
    },
    notFound(context) {
      return context.render(
        <Document title="Not Found" description="There's nothing of interest here.">
          <NotFound />
        </Document>,
        { status: 404, headers: notFoundHeaders },
      );
    },
  },
});
