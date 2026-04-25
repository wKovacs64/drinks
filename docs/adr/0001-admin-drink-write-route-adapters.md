---
status: accepted
---

# Keep React Router adapters for Admin Drink Write Path outcomes

The **Admin Drink Write Path** keeps a transport-agnostic Drinks module seam: `createAdminDrinksWriteService` returns typed write outcomes, while React Router route actions adapt those outcomes into framework responses, field/form errors, redirects, and toasts. We accept this seam because pushing React Router response concerns behind the Drinks module would reduce the module's transport independence.

## Consequences

- Route actions may translate typed **Admin Drink Write Path** outcomes into React Router responses when that translation is route/framework-specific.
- The Drinks module owns Drink write behavior, image lifecycle orchestration, cache purge orchestration, and typed write outcomes.
- Repeated business behavior in route actions should move behind the Drinks module seam; framework-specific adaptation may stay in routes.
