# React Router to Remix visual parity

PR #386 was compared with main at `e848dad7ebf70129c1d8c37c7a04c88c61cc2257`.
Both implementations ran in production mode against the same isolated SQLite fixture catalog.

## Coverage

Nineteen route states were captured at seven viewport sizes: 360×800, 390×844, 640×800,
768×1024, 1024×800, 1280×800, and 1440×900.

| Route                            | Captured states                                                                                     |
| -------------------------------- | --------------------------------------------------------------------------------------------------- |
| `/`                              | Published gallery                                                                                   |
| `/:slug`                         | Recipe with Markdown notes, recipe without notes, admin view of an unpublished Drink, missing Drink |
| `/tags`                          | Tag index                                                                                           |
| `/tags/:tag`                     | Matching Drinks, missing Tag                                                                        |
| `/search`                        | Empty query, one result, multiple results, no results                                               |
| Catch-all                        | Unknown multi-segment URL                                                                           |
| `/login-failed`, `/unauthorized` | Authentication/authorization pages                                                                  |
| `/admin/drinks`                  | Full catalog                                                                                        |
| `/admin/drinks/new`              | Empty editor                                                                                        |
| `/admin/drinks/:slug/edit`       | Existing image and values, missing Drink                                                            |

Desktop and mobile captures also cover image cropping, admin filtering/sorting, pending search,
all three notification kinds, duplicate-slug validation, submission feedback, and a required image.
Public and admin exception documents were compared at desktop, tablet, and mobile sizes.
Notification positioning was checked immediately around its 600px and 640px breakpoints.

Redirect-only auth/admin routes and resource endpoints have no page composition to compare.
Their routing and response behavior is covered by the existing integration suite. Live Google
OAuth screens, production ImageKit delivery, other browser engines, and every possible content
value were not part of this local pixel comparison.

## Method and results

The comparison uses the same Chromium engine, viewport, pixel density, timezone, and fonts for
both versions. The catalog contains three published Drinks and one unpublished Drink, fixed
recipe content and timestamps, identical data-URI photos, and a 600×400 JPEG for cropping.
Screenshots wait for loaded fonts/photos; full-page captures include the bottom of each editor.
Notifications wait for their entrance animation, and cropped selections disable animation for
capture. Search and save requests are held to capture their pending states.

Affected states were recaptured after fixes. The numerical results are in
[the raw comparison summary](measurements/visual-parity.json): 145 of 162 captures have identical
pixels. The remaining differences are at most three rounded input-border pixels differing
by at most two levels on an 8-bit color channel; element geometry and visible content match.
These are measured residual differences, not an antialiasing tolerance implemented in the rewrite.
A follow-up investigation reproduced the three-pixel difference at the upper-left corner of the
admin filter input. Its computed styles, ancestor styles, and geometry match between implementations.
The complete screenshots match with JavaScript disabled, with the surrounding content hidden, and
after resizing the hydrated pages from 1280px to 1281px and back to force a repaint. The evidence
identifies an initial Chromium painting artifact; the browser's internal rounding cause remains
unconfirmed. The original captures are not all mathematically identical.

## Standards

The independent standards review found no documented violations in the rendering and route
changes reviewed. Public module imports, thin service calls, `clientEntry` hydration,
`mix={on(...)}`/`mix={ref(...)}`, and server-only dependency isolation follow repo conventions.
No actionable baseline code smells were identified in this UI scope.

## Spec

The requested standard was “every route is a pixel-perfect recreation of the React Router
version that's in main.” Six parity gaps were corrected:

1. The catch-all page now retains the header, breadcrumb, constrained content, and footer.
   Its HTTP status remains 404; main returned 200 for this catch-all.
2. Missing admin Drinks now use the original root 404 document for GET and ordinary mutation
   responses. Enhanced editor requests retain their typed JSON response.
3. Route failures regain the original public exception screen and root admin/auth fallback.
   Production exception details remain suppressed, and failures are not cached.
4. Rejected 5xx browser navigation and search Frame loads navigate the document to the error
   destination so the error screen replaces the gallery.
5. Error notifications use the original circle/exclamation icon.
6. Notifications retain the original fixed width from 601–639px, between their mobile and
   Tailwind `sm` breakpoints.

Six browser regression tests exercise the real router for catch-all recovery, missing admin
Drinks, public and admin failures, failed search updates, and failed Drink navigation. The existing
missing-delete test now also verifies the HTML error response. Formatting, lint, types, all 115
tests, the production build, and `git diff --check` pass.

Standards findings: 0. Spec findings: 6 corrected; the recorded input-border differences disappear
after a full repaint. No other visual discrepancy was found within the captured states.
