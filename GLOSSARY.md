# drinks

The language of drinks.fyi, a curated cocktail gallery with a single admin.

## Language

### Cocktail catalog

**Drink**:
A cocktail entry in the gallery with recipe content, image, tags, and a visibility state.
_Avoid_: cocktail row, entry, record

**Drink view**:
The gallery presentation of a **Drink** shown in lists, search, tags, and slug pages.
_Avoid_: DTO, card payload, enhanced drink

**Published drink**:
A **Drink** whose visibility state allows public viewing.
_Avoid_: live drink, public row, visible drink

**Unpublished drink**:
A **Drink** whose visibility state restricts viewing to an **Admin**. Reserve "draft" for form input.
_Avoid_: draft drink, hidden drink

**Tag**:
A label attached to a **Drink** for grouping and discovery. A **Tag** is canonically stored as a lowercase phrase derived from its URL slug. Equivalent **Tags** that share the same URL slug collapse to one **Tag**.
_Avoid_: category, facet, label

**Tag display name**:
The lowercase phrase shown to viewers for a **Tag**.
_Avoid_: label, title

**Tag slug**:
The URL-safe identity for a **Tag**. The **Tag display name** is derived from the **Tag slug**.
_Avoid_: tag id, route param

**Drink for viewer**:
A **Drink view** paired with the visibility outcome for a specific viewer.
_Avoid_: page payload, visible drink

**Search result**:
A **Published drink** returned from text search.
_Avoid_: hit, match row

### Access control

**Identity**:
The authenticated access context the app uses to decide what a person may see or manage.
_Avoid_: auth, login system

**User**:
A person authenticated to the app.
_Avoid_: account, login

**Admin**:
A **User** allowed to manage drinks and view **Unpublished drinks**.
_Avoid_: editor, maintainer

**Return-to URL**:
The path saved before authentication so a **User** can resume the page they tried to reach.
_Avoid_: redirect target, callback path

### Editorial workflow

**Admin Drink Write Path**:
The editorial operation that creates, updates, or deletes a **Drink**.
_Avoid_: save flow, admin mutation layer

**Admin Drink Write Route Adapter**:
The web adapter between route submissions and the **Admin Drink Write Path**.
_Avoid_: admin mutation handler, route plumbing, generic route action helper
