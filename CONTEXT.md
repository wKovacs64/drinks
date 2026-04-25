# drinks

This context covers drinks.fyi: a curated cocktail gallery with a single-admin editorial workflow and public/private visibility rules. It defines the language for catalog entries, viewer-specific visibility, and the people allowed to manage them.

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
A **Drink** whose visibility state restricts viewing to an **Admin**.
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

## Relationships

- A **Drink** can have zero or more **Tags**
- A **Drink** has exactly one visibility state: **Published drink** or **Unpublished drink**
- A **Drink view** is the gallery presentation of a **Drink**
- A **Drink for viewer** combines a **Drink view** with viewer-specific visibility
- A **Search result** is always a **Published drink**
- An **Admin** is a kind of **User**
- Only an **Admin** may view an **Unpublished drink**
- Only an **Admin** can use the **Admin Drink Write Path**
- A **Return-to URL** lets a **User** resume the page they attempted before authentication

## Example dialogue

> **Dev:** "If the same slug page is used by admins and public visitors, do we need two display models?"
> **Domain expert:** "No — keep one **Drink view** for presentation, then resolve it as **Drink for viewer** so you know whether that viewer may see an **Unpublished drink**."
>
> **Dev:** "Who can change a drink that is still hidden from the public?"
> **Domain expert:** "Only an **Admin** can use the **Admin Drink Write Path**, and only an **Admin** may view an **Unpublished drink**."

## Flagged ambiguities

- "draft" was used to mean both unpublished content and form input — resolved: use **Unpublished drink** for visibility state.
- "page" was used for both routes and presentation data — resolved: use **Drink view** for the UI shape and **Drink for viewer** for viewer-relative visibility.
- "visible drink" sounded public-only — resolved: use **Published drink** for public visibility and **Drink for viewer** for viewer-relative reads.
- "published" was used for both visibility state and presentation shape — resolved: use **Published drink** for visibility and **Drink view** for presentation.
- "account" was used to mean the authenticated person — resolved: use **User**.
- "save flow" was used loosely — resolved: use **Admin Drink Write Path** for the admin create, update, and delete operation.
