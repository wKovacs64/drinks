---
status: accepted
---

# Let the Admin Drink Write Route Adapter own web translation

The **Admin Drink Write Route Adapter** is the complete Remix adapter for the **Admin Drink
Write Path**. It prepares create/update submissions, validates `drinkDraftSchema`, calls the
transport-agnostic Drinks module write service, and exhaustively translates typed create, update, and
delete outcomes into field/form error data, not-found responses, redirects, and toasts.

The Drinks module must continue to return transport-agnostic typed outcomes. Web response
construction and toast behavior belong in the adapter.

## Context

Splitting web translation between a Drink-specific adapter and a generic action helper makes one
**Admin Drink Write Path** outcome depend on multiple response interpreters. Keeping submission
validation, typed outcome translation, redirects, and toasts in the same adapter gives callers a
single web seam and preserves complete field-error maps without converting them to thrown errors.

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

- Browser tests under `test/e2e/` exercise Drink-specific web behavior; module tests exercise
  the transport-agnostic write service. See `docs/testing.md` for test harness setup.
- Generic route action helpers should not partially translate **Admin Drink Write Path** outcomes.
- This path should not introduce a generic action helper unless this ADR is revisited.
- If another route family later needs the same kind of typed-outcome-to-web-response interpreter, add
  it at that route seam first. Extract a generic helper only after more than one production seam proves
  the abstraction.
- New **Admin Drink Write Path** outcome kinds should force an exhaustive update in the adapter before
  typecheck passes.
- New write notice codes should force an explicit toast/response decision in the adapter before
  typecheck passes.
