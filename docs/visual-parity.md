# React Router to Remix visual parity

PR #386 was rechecked against the deployed main application at
<https://drinks-dev.fly.dev>, which identifies its commit as
`e848dad7ebf70129c1d8c37c7a04c88c61cc2257`. The candidate is `1ad705d`, running in
production mode against an isolated SQLite copy of the deployed catalog. This supersedes the
local-fixture audit as the reference for current route appearance.

## Deployed coverage

Eighteen route states were captured at seven viewport sizes: 360×800, 390×844, 640×800,
768×1024, 1024×800, 1280×800, and 1440×900. Every published recipe and tag was additionally
checked at desktop and mobile sizes, covering all 29 Drinks and 45 Tags in the deployed catalog.

| Route                            | Captured states                                            |
| -------------------------------- | ---------------------------------------------------------- |
| `/`                              | Published gallery                                          |
| `/:slug`                         | Recipes with short/long notes, every recipe, missing Drink |
| `/tags`, `/tags/:tag`            | Index, every Tag, missing Tag                              |
| `/search`                        | Empty query, one result, multiple results, no results      |
| Catch-all                        | Unknown multi-segment URL                                  |
| `/login-failed`, `/unauthorized` | Authentication/authorization pages                         |
| `/admin/drinks`                  | Authenticated catalog                                      |
| `/admin/drinks/new`              | Empty editor                                               |
| `/admin/drinks/:slug/edit`       | Existing image and values, missing Drink                   |

There are 268 route/viewport comparisons: 126 core captures plus 142 additional recipe/tag
captures. Desktop and mobile interactions cover admin filtering, sorting, image cropping,
required-image feedback, pending search, rejected duplicate-slug submission, pending save,
and success/warning/error notifications. Timestamp filtering is also checked at both sizes;
notification positioning is checked at 600px, 620px, and 640px.

The comparison uses the same Chromium engine, CSS-pixel viewport, pixel density, timezone,
fonts, and catalog. Full-page screenshots wait for loaded fonts/photos and painted external
SVG symbols. Screenshot animations are disabled. Pixel measurement counts each position with
any differing RGB channel; no nonzero tolerance is accepted as an exact match.

The deployed admin session was authenticated using the existing Chromium Google login.
Toast fixtures are injected into a browser-local copy of the deployed loader response, so the
actual deployed React notification renderer supplies the reference. Pending save requests are
held and aborted in the browser. Cropping and required-image feedback remain browser-local.
Duplicate-slug submissions were rejected; no successful writes were made to the deployed catalog.

## Results and corrections

All 268 route screenshots match exactly after controlling the image cache and recapturing the
admin routes following the filter fix. Including interactions and breakpoint checks, 291 of
293 measured pairs are exact; the two differences are the desktop/mobile duplicate-slug
validation state described below. Five additional matching-cache controls are also exact.
The raw samples, interactive results, and qualifications
are in [the deployed comparison summary](measurements/deployed-visual-parity.json).

The deployed dataset revealed an admin filter regression: searching `Margarita` returned two
Drinks in main but included Mom-arita in the rewrite because its recipe notes mention Margarita.
The rewrite also searched serialized timestamps, so `2026` incorrectly matched all 29 rows.
The admin read query now projects only its nine summary fields, and filtering searches only the
five string fields main actually searches. Recipe details, numeric values, and timestamps are
excluded. Regression tests exercise recipe exclusion, case-insensitive matching, Escape, and
serialized dates.

Two 404 cases explain the apparent disagreement in the earlier report:

- `/not-a-real-drink` is a missing Drink matched by `/:slug`. Deployed main uses the fullscreen
  404 without gallery chrome. The rewrite already matched this state and still does.
- `/unknown/deep/path` is the unmatched catch-all. Deployed main retains the gallery header,
  breadcrumb, and footer. The earlier chrome fix is correct for this route. Main returns HTTP
  200 here; the rewrite retains its intentional 404 status while matching the page pixels.

An ordinary duplicate-slug submission does **not** match the deployed page: main shows
`Application Error`, while the rewrite retains the editor and displays `Slug already exists`.
Complete inline validation and retry preservation are existing, explicit PR features. This
behavior was retained and is shown as a deliberate difference, so the audit does not establish
pixel identity for every submission outcome. Bypassing HTML required-field validation with an
empty title produces the same deployed error screen; it is not counted as an ordinary UI state.

The initial mobile Black Manhattan screenshots selected different ImageKit AVIF variants:
400px in the deployed capture and a cached 420px variant in the rewrite. Both apps select the
same variant and yield identical pixels under matching fresh and warmed cache histories.
Fresh recaptures match exactly. The original mismatch affected 127,274 pixel positions, with a
maximum channel difference of 41; it was not an antialiasing tolerance or a source-code fix.
Pending-search captures also match after waiting for the external magnifying-glass SVG to paint.

## Earlier local-fixture evidence

The earlier comparison ran both implementations locally against three published Drinks and one
unpublished Drink. Its [raw summary](measurements/visual-parity.json) remains historical evidence.
It also exercised failures that were not induced on the deployed site: public/admin exception
documents, failed Frame navigation/search recovery, and an unpublished Drink. Those fault-injection
screenshots must not be presented as captures of deployed main.

The six corrections from that pass remain in the branch: catch-all chrome, the missing-editor
root document, exception documents, rejected 5xx Frame recovery, the error notification icon,
and fixed notification width from 601–639px. Catch-all chrome, missing-editor appearance, and
notification icon/width have now also been checked directly against the deployed renderer.

The old local audit recorded up to three input-border pixels differing by at most two 8-bit
channel levels. A full repaint eliminated them with identical geometry/styles. That statement
was a measured browser painting artifact in those old captures, not an application tolerance.
It does not describe the new deployed route captures, which have zero changed pixels.

## Validation and limits

Formatting, lint, typechecking, all 116 tests, the production build, and `git diff --check` pass.
The independent standards review has zero documented violations or actionable baseline smells.
The spec review has zero outstanding findings in the filter correction; the existing validation
behavior difference is explicitly identified above.

Redirect-only auth routes and resource endpoints have no composed page to compare and remain
covered by integration tests. Live Google authentication succeeded, but external Google screen
appearance, destructive writes, unpublished content absent from the deployed catalog, other
browser engines, every cache history, and every possible content value were not exhaustively
compared. Additional hidden search controls differ in the DOM; rendered pixels and visible
text match. The report is a bounded screenshot audit, not a guarantee for every browser state.
