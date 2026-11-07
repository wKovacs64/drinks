---
status: accepted
---

# Let cached public pages share a CSP nonce

Remix's CSP middleware issues a fresh nonce per response, and `script-src` allows only same-origin
URLs and that nonce. Fastly caches public pages until their entry expires or is purged, so every
viewer of a cached page gets the same nonce. Uncached responses, including all admin and auth pages,
keep a unique nonce per response.

This is where we landed for the current site, not a fixed rule. The reasoning below holds while its
assumptions do; when one stops holding, revisit.

## Context

CSP Level 3 requires a unique nonce each time a server delivers a policy, because a nonce only
blocks injected scripts while attackers can't guess it
([Nonce Reuse](https://www.w3.org/TR/CSP3/#security-nonces)). Google's
[strict CSP guidance](https://web.dev/articles/strict-csp) uses nonces for pages rendered per
response and hashes for static or cached pages.

Public pages need some `script-src` allowance beyond same-origin URLs: Remix renders an inline
import map, and its runtime inserts more import maps during frame navigation, copying the document's
nonce (`@remix-run/component/dist/runtime/import-map-manager.js`).

## Alternatives

- **Hash-based CSP on public pages.** Covers the server-rendered import map, but not the import maps
  Remix inserts at runtime, so frames would break.
- **Don't edge-cache public HTML.** Gives every response a unique nonce, at the cost of every page
  view reaching the single Fly region and SQLite.
- **Rewrite the nonce at the edge.** The origin emits a placeholder and the edge swaps in a fresh
  nonce per response. Fastly VCL can't rewrite bodies, so this means moving the service to Fastly
  Compute, adding a worker and a deploy target.
- **`'unsafe-inline'`.** Lets any injected inline script run.

## Why this is acceptable

A shared nonce only helps an attacker who can already inject script into a public page and read the
nonce first. That describes DOM XSS: client code writing visitor input into the page. Client code
here inserts only server-rendered or Admin-authored HTML; no visitor input reaches an HTML or script
sink. Stored and reflected injections are rendered before their nonce exists, and a purge on save
renders a new one. Knowing a public page's nonce gives nothing on admin pages.

## Revisit when

- Visitor input reaches a client-side HTML or script sink.
- Anyone other than the Admin can author content rendered on public pages.
- Remix stops inserting import maps at runtime, which would make hashes viable.
- The site moves to a CDN or Fastly service type that can rewrite response bodies.
