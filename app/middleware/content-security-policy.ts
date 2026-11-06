import { csp } from "remix/middleware/csp";
// Scripts need the request nonce or a same-origin URL. Remix stamps its import maps and module
// preloads, and module graphs inherit the nonce, so the import-map polyfill's blob: modules need no
// separate source. Inline style attributes still need 'unsafe-inline'.
export const contentSecurityPolicy = csp({
  policy: ({ nonce }) => ({
    baseUri: ["'none'"],
    frameAncestors: ["'none'"],
    formAction: ["'self'"],
    defaultSrc: ["'self'"],
    connectSrc: ["'self'", "https://ik.imagekit.io/"],
    imgSrc: ["'self'", "data:", "blob:", "https:"],
    scriptSrc: ["'self'", `'nonce-${nonce}'`],
    styleSrc: ["'self'", "'unsafe-inline'"],
  }),
  // Keep the policy on every routed response, not only HTML.
  filter: () => true,
});
