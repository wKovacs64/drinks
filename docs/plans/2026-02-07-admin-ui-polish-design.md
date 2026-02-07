# Admin UI Polish Design

Address visual, layout, and functional issues in the admin interface.

## Problems

1. Admin renders inside the public site chrome (dark header, breadcrumbs, footer all visible)
2. Generic "Tailwind 3 blue on white" aesthetic
3. Header text (View Site, email, Logout) hard to read
4. Image upload input floats with no visual container
5. "Confirm Crop" button layout is bad; clicking it produces a broken preview
6. Form labels too small and light
7. Calories field accepts negative numbers
8. Nav between public site and admin is weak

## Design Decisions

| Decision | Choice | Rationale |
| --- | --- | --- |
| Layout isolation | Move public chrome from root to `_app.tsx` layout | Admin routes already use `admin.*` prefix (siblings to `_app`, not children). Moving public chrome into `_app.tsx` gives admin its own standalone layout without renaming any routes. |
| Visual direction | Dark, minimal, utilitarian, developer-centric | Single admin user, built-for-myself tool aesthetic. Contrast with the public gallery's warm vintage feel. |
| Color palette | Zinc-900/950 backgrounds, zinc-300 text, amber accent | Amber ties back to the cocktail theme without looking generic. |
| Typography | System font stack, dense, small, uppercase labels | Utilitarian feel. No decorative fonts in admin. |
| Image crop flow | Inline crop, no confirm button, crop on form submit | Simpler UX. Eliminates the broken confirm-crop workflow. "Change image" link to reset. |
| Nav | Compact header bar, no sidebar | Single section (drinks) doesn't need sidebar. Header has site link and admin label. |

## Architecture

### Route Layout Structure

**Before:**
```
root.tsx (Header, Breadcrumbs, Footer, background)
├── _app.tsx (error boundary pass-through)
│   ├── _app._index.tsx
│   ├── _app.$slug.tsx
│   ├── _app.tags._index.tsx
│   ├── _app.tags.$tag.tsx
│   └── _app.search/route.tsx
├── admin.tsx (admin layout - renders INSIDE root's chrome)
│   ├── admin._index.tsx
│   ├── admin.drinks._index.tsx
│   ├── admin.drinks.new.tsx
│   ├── admin.drinks.$slug.edit.tsx
│   └── admin.drinks.$slug.delete.tsx
├── login.tsx, logout.tsx, etc.
```

**After:**
```
root.tsx (minimal: html/head/body, base styles, Outlet)
├── _app.tsx (Header, Breadcrumbs, Footer, background, error boundary)
│   ├── _app._index.tsx
│   ├── _app.$slug.tsx
│   ├── _app.tags._index.tsx
│   ├── _app.tags.$tag.tsx
│   └── _app.search/route.tsx
├── admin.tsx (standalone dark admin layout)
│   ├── admin._index.tsx
│   ├── admin.drinks._index.tsx
│   ├── admin.drinks.new.tsx
│   ├── admin.drinks.$slug.edit.tsx
│   └── admin.drinks.$slug.delete.tsx
├── login.tsx, logout.tsx, etc.
```

The key change: move public site chrome (Header, Breadcrumbs, Footer, background image,
width constraints) from `root.tsx` into `_app.tsx`. Root becomes a minimal shell.

### Admin Layout (`admin.tsx`)

Full-page dark layout:

- **Header bar**: `bg-zinc-900`. Left: `drinks.fyi` linking to `/` (acts as "View Site") and `/ admin`
  label in zinc-500. Right: user email in zinc-500 and "Sign out" link in zinc-500 with hover:white.
- **Body**: `bg-zinc-950`. Content centered with max-width. No card wrappers.
- **Font**: System font stack via `font-sans` override or inline `font-family`.

### Drinks List (`admin.drinks._index.tsx`)

- Page title "Drinks" in zinc-200 with drink count in zinc-500.
- "Add Drink" button: amber-600 bg, zinc-950 text.
- Table: no outer shadow/wrapper. Zinc-800 column headers (uppercase, xs, tracking-wide). Zinc-800/50
  row dividers. Row hover zinc-800/30. Text in zinc-300.
- Actions: "Edit" as zinc-400 text link (hover amber). "Delete" as zinc-500 text link (hover red-400).

### Drink Form (`drink-form.tsx`)

- Labels: `text-xs font-semibold uppercase tracking-wider text-zinc-500`.
- Inputs: `bg-zinc-800 border-zinc-700 text-zinc-200 placeholder-zinc-600 rounded-sm`.
  Focus: amber ring.
- Calories: add `min="0"` attribute.
- Submit button: `bg-amber-600 hover:bg-amber-500 text-zinc-950 font-medium`.

### Image Upload/Crop (`image-crop.tsx`)

Redesigned inline flow:

1. **Empty state**: Dashed border zone (`border-dashed border-zinc-700 bg-zinc-900`). "Select image"
   button inside.
2. **After file selected**: Crop UI replaces the zone. Image with react-image-crop overlay. Below:
   "Change image" text link to reset.
3. **Edit mode (existing image)**: Current image thumbnail inside the zone with "Change image" link.
4. **On form submit**: Crop is applied automatically. No "Confirm Crop" button. The crop coordinates
   are captured from the react-image-crop state and the canvas crop happens in `handleSubmit`.

## Bug Fixes

1. **Broken crop preview**: Remove the "Confirm Crop" step entirely. Move canvas crop logic into form
   submit handler. This eliminates the broken object URL preview.
2. **Negative calories**: Add `min="0"` to calories input.
3. **Logout visibility**: Already works (POST form destroys session). Just needs to be visible in the
   new dark header.

## Files to Modify

- `app/root.tsx` - Strip public chrome, keep minimal html/head/body shell
- `app/routes/_app.tsx` - Receive public chrome (Header, Breadcrumbs, Footer, background, widths)
- `app/routes/admin.tsx` - New dark standalone layout
- `app/admin/image-crop.tsx` - Redesigned inline crop flow
- `app/admin/drink-form.tsx` - Dark form styling, image zone, min=0 on calories
- `app/routes/admin.drinks._index.tsx` - Dark table styling

## Out of Scope

- Sidebar navigation (only one admin section currently)
- Mobile-responsive admin (single admin on desktop is fine)
- Drink form validation beyond min calories
- Changes to auth flow, logout logic, or any route handlers/actions
