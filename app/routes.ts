import { form, get, post, route } from "remix/routes";
export const routes = route({
  assets: get("/assets/*path"),
  home: get("/"),
  drinks: { show: get("/:slug") },
  search: { index: get("/search") },
  tags: { index: get("/tags"), show: get("/tags/:tag") },
  auth: {
    login: get("/login"),
    callback: get("/auth/google/callback"),
    logout: post("/logout"),
    failed: get("/login-failed"),
    unauthorized: get("/unauthorized"),
  },
  admin: {
    index: get("/admin"),
    drinks: {
      index: get("/admin/drinks"),
      new: form("/admin/drinks/new"),
      edit: form("/admin/drinks/:slug/edit"),
      deleteDrink: post("/admin/drinks/:slug/delete"),
      deleteRedirect: get("/admin/drinks/:slug/delete"),
    },
  },
  healthcheck: get("/_/healthcheck"),
  robots: get("/robots.txt"),
  manifest: get("/manifest.webmanifest"),
  notFound: get("/*path"),
});
