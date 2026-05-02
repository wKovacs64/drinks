---
status: accepted
---

# Let the Admin Drink Write Route Adapter own web translation

The **Admin Drink Write Route Adapter** is the complete React Router adapter for the **Admin Drink
Write Path**. It prepares create/update submissions, validates `drinkDraftSchema`, calls the
transport-agnostic Drinks module write service, and exhaustively translates typed create, update, and
delete outcomes into field/form error data, not-found responses, redirects, and toasts.

The Drinks module must continue to return transport-agnostic typed outcomes. It must not import React
Router, construct `Response` objects, or decide toast behavior.

## Context

Earlier iterations kept routes thin with a generic `routeAction` helper. That helper handled schema
validation, thrown domain errors, redirects, and toasts. The admin drink write adapter translated only
some Drink-specific outcomes before handing control to `routeAction` for the final web response.
After deepening this route seam, the helper had no remaining production callers and was removed.

That split repeatedly made the seam shallow. Understanding one **Admin Drink Write Path** outcome
required knowing the Drinks outcome union, adapter branch behavior, thrown domain-error behavior,
React Router thrown responses, and toast callback resolution. It also collapsed typed field-error maps
to the first field/message when bridging through a thrown field error.

## Decision

The **Admin Drink Write Route Adapter** owns the entire web-side translation for admin drink creates,
updates, and deletes:

- multipart image submission preparation
- `drinkDraftSchema` validation for create/update form values
- calls to `AdminDrinksWriteService`
- complete typed outcome translation
- full field/form error preservation
- not-found responses for missing update/delete targets
- redirects to the admin drinks list
- success and warning toasts

This path intentionally does not use a generic route action pipeline. Routes remain thin by delegating
to this deeper web adapter.

## Consequences

- The interface test surface for Drink-specific web behavior is `app/web/admin-drink-write/route-adapter.test.ts`.
- Generic route action helpers should not partially translate **Admin Drink Write Path** outcomes.
- The previous `routeAction` helper should not be restored for this path unless this ADR is revisited.
- If another route family later needs the same kind of typed-outcome-to-web-response interpreter, add
  it at that route seam first. Extract a generic helper only after more than one production seam proves
  the abstraction.
- New **Admin Drink Write Path** outcome kinds should force an exhaustive update in the adapter before
  typecheck passes.
- New save notice codes should force an explicit toast/response decision in the adapter before
  typecheck passes.
