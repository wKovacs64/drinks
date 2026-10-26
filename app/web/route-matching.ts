import { createMatcher } from "remix/route-pattern/match";
import { joinPatterns } from "remix/route-pattern/join";
import { routes } from "#/app/routes.ts";

// Use the router's decoding rules for every consumer of the admin boundary.
const adminMatchers = [
  createMatcher(routes.admin.index.pattern),
  createMatcher(joinPatterns(routes.admin.index.pattern, "/*path")),
];
const authMatchers = Object.values(routes.auth).map((route) => createMatcher(route.pattern));
const loginMatcher = createMatcher(routes.auth.login.pattern);
const resourceMatchers = [
  createMatcher(routes.assets.pattern),
  createMatcher("/_/*path"),
  createMatcher(routes.robots.pattern),
  createMatcher(routes.manifest.pattern),
];

export function isAdminUrl(url: URL): boolean {
  return adminMatchers.some((matcher) => matcher.match(url) !== null);
}

export function isAuthUrl(url: URL): boolean {
  return authMatchers.some((matcher) => matcher.match(url) !== null);
}

export function isLoginUrl(url: URL): boolean {
  return loginMatcher.match(url) !== null;
}

/** Non-document routes whose errors keep their own responses. */
export function isResourceUrl(url: URL): boolean {
  return resourceMatchers.some((matcher) => matcher.match(url) !== null);
}
