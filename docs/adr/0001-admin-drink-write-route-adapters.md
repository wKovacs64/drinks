---
status: accepted
---

# Keep Remix v3 adapters for Admin Drink Write Path outcomes

The **Admin Drink Write Path** keeps a transport-agnostic Drinks module seam: `createAdminDrinksWriteService` returns typed write outcomes, while Remix v3 web adapters adapt those outcomes into framework responses, field/form errors, redirects, and toasts. We accept this seam because pushing Remix v3 response concerns behind the Drinks module would reduce the module's transport independence.

ADR-0002 deepens this decision for the current codebase: the **Admin Drink Write Route Adapter** owns the complete web translation for create, update, and delete outcomes instead of splitting that translation with a generic route action helper.

## Consequences

- Web adapters may translate typed **Admin Drink Write Path** outcomes into Remix v3 responses when that translation is route/framework-specific.
- The Drinks module owns Drink write behavior, image lifecycle orchestration, cache purge orchestration, and typed write outcomes.
- Repeated business behavior in route actions should move behind the Drinks module seam; framework-specific adaptation belongs in the web adapter for the route seam.
