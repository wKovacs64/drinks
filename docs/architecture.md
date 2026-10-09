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
validation, field errors, redirects, and toasts. Native form failures render the submitted editor
with HTTP 400; enhanced submissions explicitly request the editor JSON media type.
[ADR-0001](adr/0001-admin-drink-write-route-adapters.md) and [ADR-0002](adr/0002-admin-drink-write-route-adapter-owns-web-translation.md) record this seam.

## Browser and assets

Browser source lives in owner-local `public/` directories, with shared browser utilities under
`app/core/public/`. The asset allowlist permits those directories and `app/routes.ts`; every runtime
import in a browser graph must be allowed. Type-only imports are erased before serving browser code.
Files use ordinary `.ts` and `.tsx` names; server isolation comes from the allowlist rather than a
filename suffix. Browsers that pass an in-document multiple-import-map probe use native module
loading; other browsers retain Remix's compatibility loader. Deferred module hints begin after
paint and yield between small batches. Static asset sources live under `app/assets/`; root `public/`
is generated output and local uploads. Navigation uses native anchors. Gallery lists share one small
hydrated viewport-prefetch marker and observer; standalone navigation anchors have their own marker.
Each marker's ref mixin owns observer and image-listener cleanup; card markup stays server-rendered.
The editor client entry keys its inner form by action URL so soft navigation resets the draft and
submission endpoint together.

The public `/mcp` adapter lives under `app/integrations/mcp.ts` and runs before website document,
session, authentication, and browser provenance middleware. It uses the official SDK's Fetch handler
for stateless Streamable HTTP, its own Host/Origin checks, and `no-store` caching.
It always calls the Drinks module as a public viewer; website cookies cannot grant MCP access.
See [the SDK's HTTP lifecycle](https://ts.sdk.modelcontextprotocol.io/v2/serving/http).

The MCP Apps card entry lives under `app/integrations/mcp/public/`. Asset preparation bundles the
shared Drink summary with the MCP Apps bridge; its compiled script, gallery stylesheet, and fonts
are embedded in the UI resource. This bundle runs independently of the website loader and native
asset graph. The card receives structured recipes through the standard bridge and opens its absolute
Drink URL with the host's `ui/open-link` method. Resource metadata permits images from the app origin
and ImageKit. See [MCP Apps UI guidance](https://developers.openai.com/plugins/build/chatgpt-ui).

## Write completion

A committed Drink write counts as success even if old-image cleanup or a public-cache refresh fails.
Report these follow-up failures as warnings so an admin is not invited to repeat an already-completed
write. Remote effects stay outside database transactions; before persistence succeeds, a failure
must preserve the original error even if compensating cleanup also fails.
