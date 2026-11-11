# Architecture

Current code ownership and runtime contracts.

## Runtime imports

Node runs TypeScript source directly, with Remix's loader handling TSX. Subpath and relative imports
resolve source files, so their specifiers include explicit `.ts` or `.tsx` extensions. The native
subpath mapping is defined in `package.json`.

## Ownership

Server business behavior lives under `app/modules/<module>/`. The public entrypoint is
`<module>.ts`, exposing types, read models, schemas, and service factories; other files are private.

Routes construct services and return framework responses. The Drinks module owns Drink write
behavior, image lifecycle orchestration, cache purge orchestration, and transport-independent typed
write outcomes. The admin write adapter owns the complete web translation, including submission
validation, error messages, redirects, and toasts. Failed submissions render the submitted editor
with HTTP 400. With the browser runtime, the editor awaits its crop, puts it on the image input, and
resubmits as a frame navigation, so the client entry keeps its draft and selected image across a
400; the adapter omits the reselect-image notice for frame requests. Frame requests that fail the
admin session check get a 401 sign-in page instead of the login redirect, because the frame resolver
fetches same-origin only and cannot follow the hop to Google; its link uses document navigation.
See [Remix forms](https://github.com/remix-run/remix/blob/remix%403.2.0/packages/remix/guides/09-forms-and-mutations.md#add-pending-feedback).
[ADR-0001](adr/0001-admin-drink-write-route-adapters.md) and [ADR-0002](adr/0002-admin-drink-write-route-adapter-owns-web-translation.md) record this seam.

## Browser and assets

Browser source lives in owner-local `public/` directories, with shared browser utilities under
`app/core/public/`. The asset allowlist permits those directories and `app/routes.ts`; every runtime
import in a browser graph must be allowed. Type-only imports are erased before serving browser code.
Files use ordinary `.ts` and `.tsx` names; server isolation comes from the allowlist rather than a
filename suffix. Browsers that pass an in-document multiple-import-map probe use native module
loading; other browsers use Remix's compatibility loader. Remix's CSP middleware issues a nonce per
response; `script-src` allows only same-origin URLs and that nonce. Remix stamps its import maps
and module preloads, Document stamps its authored scripts and preloads, and the loader's `blob:`
modules inherit the nonce from the module graph. Fastly-cached public pages share one nonce until
the cache entry expires or is purged; [ADR-0003](adr/0003-cached-public-pages-share-a-csp-nonce.md)
records why. See the
[CSP middleware](https://github.com/remix-run/remix/tree/remix%403.2.0/packages/csp-middleware#usage)
and the [loader's CSP requirements](https://github.com/remix-run/remix/tree/remix%403.2.0/packages/multiple-import-maps-polyfill#content-security-policy).
Public pages keep module hints out of the
LCP image preload's way: the render assets strip Remix's head preloads from public client entries,
and Document defers the `entry.ts` graph, plus any graphs a page passes such as Search's client
entries, until after paint, yielding between small batches. Admin client entries keep Remix's
head preloads. Static asset sources live under `app/assets/`; root `public/`
is generated output and local uploads. Navigation uses native anchors, and links and forms reload
the top frame, so every page action returns a complete document. The search form keeps scroll
position and focus across soft searches. See
[whole-page navigation](https://github.com/remix-run/remix/blob/remix%403.2.0/packages/remix/guides/06-streaming-ui-with-frames.md#choose-per-region-frames-or-whole-page-navigation).
Gallery, navigation, and Tag
links use Remix's `data-rmx-prefetch="viewport"` for low-priority frame HTML and asset discovery,
respecting Save-Data and slow connections. The header Search link uses `data-rmx-prefetch="intent"`
so asset discovery reads Search's deferred hints before a soft navigation. Card markup stays server-rendered without prefetch client
entries. Remix owns script-entry caching and watch/HMR invalidation.
See [Remix prefetching](https://github.com/remix-run/remix/blob/remix%403.1.0/packages/component/docs/frames.md#prefetching)
and [asset caching](https://github.com/remix-run/remix/releases/tag/assets%401.0.1).
The editor client entry keys its inner form by action URL so soft navigation resets the draft and
submission endpoint together.

The public `/mcp` adapter lives under `app/integrations/mcp.ts` and runs before website document,
session, authentication, and browser provenance middleware. It uses the official SDK's Fetch handler
for stateless Streamable HTTP, its own Host/Origin checks, and `no-store` caching.
It always calls the Drinks module as a public viewer; website cookies cannot grant MCP access.
MCP search requests exact-title preference from the Drinks module: a case-insensitive title match
returns only that Drink; other queries and website searches retain broad matching.
See [the SDK's HTTP lifecycle](https://ts.sdk.modelcontextprotocol.io/v2/serving/http).

The MCP Apps card entry lives under `app/integrations/mcp/public/`. Asset preparation bundles the
shared Drink summary with the MCP Apps bridge; its compiled script, gallery stylesheet, and fonts
are embedded in the UI resource. This bundle runs independently of the website loader and native
asset graph. The card receives full recipes in tool result `_meta` through the standard bridge; model-visible
results contain only Drink slugs. `search_drinks` performs discovery without UI; `show_drinks` alone
displays the selected summaries or full recipes, including existing notes, in one widget.
The card opens its absolute Drink URL with the host's `ui/open-link` method. Resource metadata permits images from the app origin
and ImageKit. See [MCP Apps UI guidance](https://developers.openai.com/plugins/build/chatgpt-ui).

## Write completion

A committed Drink write counts as success even if old-image cleanup or a public-cache refresh fails.
Report these follow-up failures as warnings so an admin is not invited to repeat an already-completed
write. Remote effects stay outside database transactions; before persistence succeeds, a failure
must preserve the original error even if compensating cleanup also fails.

## Public page caching

`app/web/gallery-cache.ts` owns the Fastly surrogate-key vocabulary in both directions. Gallery
controllers get response headers from `galleryPageHeaders`: every public page carries `all` plus
its own key (`index`, `search` for a non-empty query, `tags`, the Tag slug, or the Drink slug).
An Unpublished drink shown to an Admin gets `private, no-store` and no key. The Admin Drink Write
Path's composition root turns the affected Drink slugs and Tag slugs into keys with `purgeKeysFor`:
`index`, `search`, `tags`, each affected Drink slug, and the Tag slugs of the Drink's old and new
Tags. The Drinks module derives those Tag slugs from stored Tags. A write adds no `all` key of its
own; CI purges `all` on deploy. Drink slugs, Tag slugs, and the fixed keys (`all`, `index`,
`search`, `tags`) share one namespace, so a slug equal to another key over-purges and never leaves
a page stale.
`app/integrations/fastly.ts` is transport only: it sends a list of keys to Fastly's purge API.
