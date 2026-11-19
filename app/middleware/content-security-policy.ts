import { csp } from "remix/middleware/csp";

const everyRoutedResponseNotOnlyHtml = () => true;

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
  filter: everyRoutedResponseNotOnlyHtml,
});
