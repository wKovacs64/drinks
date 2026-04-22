# Ubiquitous Language

## Cocktail catalog

| Term                  | Definition                                                                                               | Aliases to avoid                            |
| --------------------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| **Drink**             | A cocktail entry in the gallery with content, image, tags, and publish state.                            | Cocktail row, drink record, entry           |
| **Drink view**        | A drink prepared for gallery UI: enriched image, tags, and notes as shown (not the persisted row alone). | Enhanced drink, published DTO, card payload |
| **Published drink**   | A drink visible to public visitors.                                                                      | Live drink, public row, visible drink       |
| **Unpublished drink** | A drink visible only to admins.                                                                          | Draft drink, hidden drink                   |
| **Tag**               | A denormalized label attached to a drink for grouping and discovery.                                     | Category, facet, label                      |
| **Drink for viewer**  | A drink plus visibility metadata resolved for a specific viewer role.                                    | Drink page, visible drink, payload          |
| **Search result**     | A published drink returned from text search.                                                             | Hit, match row                              |

## Access control

| Term              | Definition                                                     | Aliases to avoid               |
| ----------------- | -------------------------------------------------------------- | ------------------------------ |
| **Identity**      | The app's authentication and authorization domain.             | Auth, login system             |
| **User**          | An authenticated person known to the app.                      | Account, login                 |
| **Admin**         | A user allowed to manage drinks and view unpublished drinks.   | Editor, maintainer             |
| **Return-to URL** | The path saved before login so the user can resume after auth. | Redirect target, callback path |

## Architecture seams

| Term                           | Definition                                                                                                                                            | Aliases to avoid                           |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| **Module**                     | A domain-owned folder under `app/modules/<module>` with a narrow public interface and hidden internals.                                               | Feature folder, layer                      |
| **Deep module**                | A **Module** whose **Public seam** is small relative to the complexity it hides; behavior is pinned with **Boundary tests**.                          | Feature dump, leaky barrel                 |
| **Public entrypoint**          | One of the two allowed import surfaces for a module: `<module>.ts` or `<module>.server.ts`.                                                           | Barrel, shared file                        |
| **Public seam**                | The full public API exposed by a module through its public entrypoints.                                                                               | Public surface, exported helpers           |
| **Module internals**           | Any file inside a module that is not a public entrypoint.                                                                                             | Helpers, private API                       |
| **Boundary dependency**        | An external effect or collaborator that crosses a real system boundary and is passed into a service factory.                                          | Injectable helper, override hook           |
| **Mutation boundary**          | A boundary dependency required only when the service performs create, update, or delete (e.g. hosted images, edge cache invalidation).                | Write effects, write ports, I/O hooks      |
| **Internal collaborator**      | A module-private helper used inside the implementation and not exposed through the public seam.                                                       | Injectable internal, test seam             |
| **Service**                    | The single object returned by `create<Module>Service(...)` that exposes the module’s public behavior—not split into separate read and write services. | Manager, util, read service, write service |
| **Capability method**          | A public service operation named for what it does rather than for a route or page.                                                                    | Page method, route method                  |
| **Draft**                      | Validated input data shaped for saving through a service.                                                                                             | Form data, payload                         |
| **Editor**                     | Data for create or edit UI, including initial values and options.                                                                                     | View model, form model                     |
| **Route action**               | The standard action pipeline that validates input, dispatches intent, translates domain errors, and handles toasts or redirects.                      | Action helper, form handler                |
| **Route Action Seam**          | The explicit route-level call to `routeAction(...)` that remains visible even when app-specific orchestration is extracted.                           | Hidden action handler, implicit workflow   |
| **Workflow**                   | A domain-specific application layer that coordinates a user-facing operation across framework seams and module capabilities.                          | Wiring, generic helper, domain core        |
| **Admin Drink Write Path**     | The admin-only capability for creating, updating, and deleting a **Drink** from route submissions.                                                    | Save flow, admin mutation layer            |
| **Admin Drink Write Workflow** | The **Workflow** dedicated to the **Admin Drink Write Path** that prepares create, update, and delete operations for the **Route Action Seam**.       | Generic form workflow, drinks domain core  |
| **Preparation Failure**        | A non-navigational submission failure detected before the **Route Action Seam** and represented as validation-shaped errors.                          | Arbitrary response, thrown redirect        |
| **Prepared Intent**            | A fully-built `Intent` produced by a **Workflow** and handed to the **Route Action Seam** for execution.                                              | Partial route config, ad hoc action policy |
| **Framework Adapter**          | A thin layer that absorbs framework-specific request mechanics without changing the router-agnostic business service.                                 | Domain service, business core              |
| **Domain error**               | A typed expected failure raised by a module for business-rule violations.                                                                             | Result union, error string                 |
| **Warning metadata**           | Non-fatal follow-up information returned with a successful operation.                                                                                 | Soft error, partial failure                |
| **Boundary test**              | A test that exercises a module through its public schema or service API.                                                                              | Unit test of internals, helper test        |

## Relationships

- A **Drink** can have many **Tags**.
- A **Published drink** is a **Drink** visible to the public.
- An **Unpublished drink** is a **Drink** visible only to an **Admin**.
- A **Drink view** is how a **Drink** is shown in the gallery (lists, search, tags, slug page)—independent of whether the underlying **Drink** is published; _who_ may see it is separate (**Drink for viewer**, public-only listings, etc.).
- A **Drink for viewer** pairs visibility with a **Drink view** for the slug page (e.g. public vs private to the viewer).
- A **Search result** is always a **Published drink** and is shown as a **Drink view** in the UI.
- A **Draft** is consumed by a module **Service**.
- An **Editor** is produced by a module **Service**; a **Drink view** is the read-side counterpart for gallery display (vs **Editor** for forms).
- A **Capability method** may return route-ready data without being named after a route or page.
- A **Boundary dependency** belongs in a service factory; an **Internal collaborator** stays inside module internals.
- A module has one **Service**; read-only call sites may construct it with only the database, while mutation call sites pass **Mutation boundaries** into the same factory shape—no second **Service** type or “writer” object.
- Mutating routes may pass **Mutation boundaries** inline at `createDrinksService(...)` instead of a separate app-level helper; that is still one **Service**, not a read/write split.
- A **Route action** validates a **Draft**, calls a **Service**, and translates **Domain errors**.
- The **Admin Drink Write Path** passes through the **Route Action Seam**.
- The **Admin Drink Write Workflow** coordinates the **Admin Drink Write Path** while the **Drinks** **Service** remains the business core underneath it.
- A **Preparation Failure** may occur before a **Prepared Intent** reaches the **Route Action Seam**.
- A **Framework Adapter** may change when the router changes, but the underlying **Service** should not.
- **Warning metadata** may accompany a successful create, update, or delete when follow-up cleanup only partially succeeds.
- A **Deep module** keeps integration detail behind the **Public seam**; callers and **Boundary tests** depend on the **Service** and schemas, not **Module internals**.

## Example dialogue

> **Dev:** "If we extract the admin save logic, should the route stop calling `routeAction(...)`?"
>
> **Domain expert:** "No — keep the **Route Action Seam** visible. The route should execute a **Prepared Intent**, not rebuild policy itself."
>
> **Dev:** "So where does the duplicated create/edit/delete orchestration go?"
>
> **Domain expert:** "Into the **Admin Drink Write Workflow**. It owns the **Admin Drink Write Path** while the drinks **Service** stays router-agnostic."
>
> **Dev:** "What happens when image parsing fails before we get to `routeAction(...)`?"
>
> **Domain expert:** "That is a **Preparation Failure**. It should come back as validation-shaped errors, not as a thrown redirect or arbitrary response."

## Flagged ambiguities

- "page" was used for both routes and service return types. Prefer **Drink for viewer** and **Capability method** over page-shaped names in the module seam.
- "injectable" was used for both real external effects and same-module helpers. Use **Boundary dependency** for real external collaborators and **Internal collaborator** for hidden implementation details.
- "visible drink" sounded public-only. Prefer **Drink for viewer** for viewer-relative drink reads.
- "draft" could mean unpublished content state or form input. Use **Unpublished drink** for visibility state and **Draft** for validated save input.
- "error" was used for both expected business failures and successful operations with cleanup issues. Use **Domain error** for expected failures and **Warning metadata** for successful partial follow-up issues.
- "read service" / "write service" were used for TypeScript shapes. Prefer one **Service**; use **Mutation boundary** for external effects that only apply to mutations, not a second service name.
- A dedicated "writer" **factory name** in `core` implied a second seam. Prefer one `createDrinksService` with **Mutation boundaries** supplied at mutating call sites (or a single module-local helper), not a second conceptual **Service**.
- "**Published**" named a read-model type while an **Admin** can view an **Unpublished drink** in the same presentation shape. Prefer **Drink view** for the gallery presentation; reserve **Published drink** for visibility and for operations that only return published rows (e.g. public catalog listings, search).
- "wiring" was too vague. Prefer **Workflow** for domain-specific application orchestration and **Framework Adapter** for framework-specific translation.
- "response" was too broad in pre-`routeAction` discussion. Prefer **Preparation Failure** for validation-shaped early failures and reserve thrown responses for navigational control flow.
- "save flow" was used loosely. Prefer **Admin Drink Write Path** for the end-to-end admin create/update/delete capability.
- routes assembling schema, redirect, and toast policy ad hoc obscured ownership. Prefer a **Prepared Intent** built by the **Admin Drink Write Workflow** and executed through the **Route Action Seam**.
