#!/usr/bin/env bash
set -euo pipefail

# Create GitHub issues for the Contentful Migration implementation plan
# Usage: ./scripts/create-migration-issues.sh

LABEL="cms-migration"
LABEL_COLOR="0052CC"
LABEL_DESC="Contentful to SQLite migration tasks"

echo "=== Creating label: $LABEL ==="
gh label create "$LABEL" --color "$LABEL_COLOR" --description "$LABEL_DESC" 2>/dev/null || echo "Label already exists"

echo ""
echo "=== Creating milestones ==="

declare -A MILESTONES=(
  ["Phase 1: Database Setup"]="Tasks 1-6: Drizzle ORM, SQLite schema, database client"
  ["Phase 2: Playwright Infrastructure"]="Tasks 7-13: E2E testing setup with per-test DB reset"
  ["Phase 3: Authentication"]="Tasks 14-26: Google OAuth, session management, middleware"
  ["Phase 4: Admin UI"]="Tasks 27-42: CRUD interface for drinks management"
  ["Phase 5: Update Public Routes"]="Tasks 43-49: Switch from Contentful to SQLite"
  ["Phase 6: Migration and Cleanup"]="Tasks 50-56: Data migration, Fly config, cleanup"
)

for title in "${!MILESTONES[@]}"; do
  echo "Creating milestone: $title"
  gh api repos/:owner/:repo/milestones --method POST \
    -f title="$title" \
    -f description="${MILESTONES[$title]}" \
    -f state="open" 2>/dev/null || echo "  (already exists or error)"
done

echo ""
echo "=== Creating issues ==="

# Helper function to create an issue
create_issue() {
  local task_num="$1"
  local title="$2"
  local milestone="$3"
  local body="$4"

  echo "Creating Task $task_num: $title"
  gh issue create \
    --title "Task $task_num: $title" \
    --label "$LABEL" \
    --milestone "$milestone" \
    --body "$body"
}

# Phase 1: Database Setup (Tasks 1-6)
M1="Phase 1: Database Setup"

create_issue 1 "Add Drizzle and SQLite Dependencies" "$M1" "## Files
- Modify: \`package.json\`

## Steps
1. Install dependencies:
   \`\`\`bash
   pnpm add drizzle-orm better-sqlite3 @paralleldrive/cuid2
   pnpm add -D drizzle-kit @types/better-sqlite3
   \`\`\`
2. Verify: \`pnpm ls drizzle-orm better-sqlite3\`
3. Commit: \`chore: add drizzle, sqlite, and cuid2 dependencies\`

## Acceptance Criteria
- [ ] All packages installed
- [ ] \`pnpm ls\` shows versions
- [ ] Committed"

create_issue 2 "Create Drizzle Configuration" "$M1" "## Files
- Create: \`drizzle.config.ts\`

## Steps
1. Create drizzle config with SQLite dialect
2. Commit: \`chore: add drizzle configuration\`

## Acceptance Criteria
- [ ] Config file created with correct schema path
- [ ] Committed"

create_issue 3 "Create Database Schema" "$M1" "## Files
- Create: \`app/db/schema.ts\`

## Steps
1. Create schema with \`users\` and \`drinks\` tables
2. Export types: User, NewUser, Drink, NewDrink
3. Commit: \`feat: add drizzle schema for users and drinks\`

## Acceptance Criteria
- [ ] Schema matches design doc
- [ ] Types exported
- [ ] Committed"

create_issue 4 "Create Database Client" "$M1" "## Files
- Create: \`app/db/client.server.ts\`
- Create: \`data/.gitignore\`

## Steps
1. Create database client with connection pooling
2. Create data directory with .gitignore for .db files
3. Commit: \`feat: add drizzle database client with reset capability\`

## Acceptance Criteria
- [ ] Client exports getDb(), getDatabase(), closeDatabase(), resetDatabaseConnection()
- [ ] data/.gitignore ignores *.db and *.db-*
- [ ] Committed"

create_issue 5 "Generate and Run Initial Migration" "$M1" "## Files
- Create: \`drizzle/\` migrations directory
- Modify: \`package.json\`

## Steps
1. Add scripts: db:generate, db:migrate, db:push, db:studio
2. Run: \`pnpm db:generate\`
3. Run: \`pnpm db:push\`
4. Verify: \`sqlite3 ./data/drinks.db \".schema\"\`
5. Commit: \`feat: add database migrations\`

## Acceptance Criteria
- [ ] Migration files generated
- [ ] Tables created in local DB
- [ ] Schema shows users and drinks tables
- [ ] Committed"

create_issue 6 "Update Environment Variables Schema" "$M1" "## Files
- Modify: \`app/utils/env.server.ts\`

## Steps
1. Add: DATABASE_URL, IMAGEKIT_*, GOOGLE_*, SESSION_SECRET, NODE_ENV
2. Mark Contentful vars as .optional()
3. Commit: \`feat: add env vars for database, imagekit, and auth\`

## Acceptance Criteria
- [ ] All new env vars in schema
- [ ] Contentful vars optional
- [ ] Committed"

# Phase 2: Playwright Infrastructure (Tasks 7-13)
M2="Phase 2: Playwright Infrastructure"

create_issue 7 "Install Playwright" "$M2" "## Files
- Modify: \`package.json\`
- Create: \`playwright.config.ts\`

## Steps
1. Install: \`pnpm add -D @playwright/test && pnpm exec playwright install chromium\`
2. Create config (reference: hand-hygiene project)
3. Add scripts: test:e2e, test:e2e:ui
4. Commit: \`chore: add playwright for e2e testing\`

## Acceptance Criteria
- [ ] Playwright installed
- [ ] Config sets NODE_ENV=test and test DATABASE_URL
- [ ] Committed"

create_issue 8 "Create Test Seed Data" "$M2" "## Files
- Create: \`playwright/seed-data.ts\`

## Steps
1. Create TEST_ADMIN_USER and TEST_DRINKS constants
2. Commit: \`feat: add test seed data for playwright\`

## Acceptance Criteria
- [ ] 1 admin user, 3 test drinks defined
- [ ] Types match schema
- [ ] Committed"

create_issue 9 "Create Database Reset Utility" "$M2" "## Files
- Create: \`app/db/reset.server.ts\`

## Steps
1. Create resetAndSeedDatabase() function
2. Commit: \`feat: add database reset utility for testing\`

## Acceptance Criteria
- [ ] Deletes all data then seeds test data
- [ ] Committed"

create_issue 10 "Create Test Reset Endpoint" "$M2" "## Files
- Create: \`app/routes/[_].reset-db.ts\`

## Steps
1. Create POST-only endpoint at /_/reset-db
2. Only allow when NODE_ENV=test
3. Commit: \`feat: add test database reset endpoint\`

## Acceptance Criteria
- [ ] Returns 404 in non-test environments
- [ ] Returns 405 for non-POST requests
- [ ] Resets and seeds database on POST
- [ ] Committed"

create_issue 11 "Create Mock Users for Testing" "$M2" "## Files
- Create: \`playwright/mock-users.ts\`

## Steps
1. Create MOCK_ADMIN constant matching AuthenticatedUser type
2. Commit: \`feat: add mock users for playwright tests\`

## Acceptance Criteria
- [ ] MOCK_ADMIN derives from TEST_ADMIN_USER
- [ ] Committed"

create_issue 12 "Create Playwright Test Utilities (Scaffold)" "$M2" "## Files
- Create: \`playwright/playwright-utils.ts\`

## Steps
1. Create test fixture with resetDb
2. Export test and expect
3. Commit: \`feat: add playwright test utilities scaffold\`

## Acceptance Criteria
- [ ] resetDb fixture calls /_/reset-db
- [ ] Committed"

create_issue 13 "Create First Smoke Test" "$M2" "## Files
- Create: \`playwright/smoke.test.ts\`

## Steps
1. Create tests for homepage and drink detail
2. Run: \`pnpm test:e2e\` (may fail until public routes updated)
3. Commit: \`test: add smoke tests for homepage and drink detail\`

## Acceptance Criteria
- [ ] Tests check for seeded drink titles
- [ ] Test infrastructure verified working
- [ ] Committed"

# Phase 3: Authentication (Tasks 14-26)
M3="Phase 3: Authentication"

create_issue 14 "Add Auth Dependencies" "$M3" "## Files
- Modify: \`package.json\`

## Steps
1. Install: \`pnpm add remix-auth @coji/remix-auth-google @epic-web/invariant\`
2. Verify installation
3. Commit: \`chore: add remix-auth dependencies\`

## Acceptance Criteria
- [ ] All packages installed
- [ ] Committed"

create_issue 15 "Create Auth Types" "$M3" "## Files
- Create: \`app/auth/types.ts\`

## Steps
1. Create AuthenticatedUser type
2. Commit: \`feat: add authenticated user type\`

## Acceptance Criteria
- [ ] Type includes id, email, name, avatarUrl, role
- [ ] Committed"

create_issue 16 "Create Session Storage with Test Export" "$M3" "## Files
- Create: \`app/auth/session.server.ts\`

## Steps
1. Create cookie session storage
2. Export getRawSessionCookieValue for tests
3. Commit: \`feat: add session storage with test cookie export\`

## Acceptance Criteria
- [ ] Exports getSession, commitSession, destroySession
- [ ] Exports sessionCookie and getRawSessionCookieValue
- [ ] Committed"

create_issue 17 "Create Auth Utilities" "$M3" "## Files
- Create: \`app/auth/utils.server.ts\`

## Steps
1. Create safeRedirectTo() and createReturnToUrl()
2. Commit: \`feat: add auth utility functions\`

## Acceptance Criteria
- [ ] safeRedirectTo validates paths
- [ ] Committed"

create_issue 18 "Create User Model Functions" "$M3" "## Files
- Create: \`app/models/user.server.ts\`

## Steps
1. Create getUserById, getUserByEmail, updateUserOnLogin
2. Commit: \`feat: add user model functions\`

## Acceptance Criteria
- [ ] updateUserOnLogin returns null for unknown users (allowlist)
- [ ] Committed"

create_issue 19 "Create Authenticator" "$M3" "## Files
- Create: \`app/auth/auth.server.ts\`

## Steps
1. Create Google strategy with verify callback
2. Commit: \`feat: add google oauth authenticator\`

## Acceptance Criteria
- [ ] Verify callback uses allowlist model
- [ ] Returns AuthenticatedUser on success
- [ ] Committed"

create_issue 20 "Create Auth Middleware" "$M3" "## Files
- Create: \`app/middleware/auth.server.ts\`

## Steps
1. Create userMiddleware and adminMiddleware
2. Export getUserFromContext helper
3. Commit: \`feat: add composable auth middleware with typed context\`

## Acceptance Criteria
- [ ] userMiddleware stores user in context
- [ ] adminMiddleware checks role
- [ ] Committed"

create_issue 21 "Create Login Route" "$M3" "## Files
- Create: \`app/routes/login.tsx\`

## Steps
1. Create route that initiates Google OAuth
2. Commit: \`feat: add login route\`

## Acceptance Criteria
- [ ] Redirects to Google OAuth
- [ ] Committed"

create_issue 22 "Create Google OAuth Callback Route" "$M3" "## Files
- Create: \`app/routes/auth.google.callback.tsx\`

## Steps
1. Handle OAuth callback, set session
2. Commit: \`feat: add google oauth callback route\`

## Acceptance Criteria
- [ ] Sets user in session on success
- [ ] Redirects to returnTo or /
- [ ] Committed"

create_issue 23 "Create Logout Route" "$M3" "## Files
- Create: \`app/routes/logout.tsx\`

## Steps
1. Create POST action that destroys session
2. Commit: \`feat: add logout route\`

## Acceptance Criteria
- [ ] Destroys session and redirects to /
- [ ] Committed"

create_issue 24 "Create Login Failed and Unauthorized Routes" "$M3" "## Files
- Create: \`app/routes/login-failed.tsx\`
- Create: \`app/routes/unauthorized.tsx\`

## Steps
1. Create simple error pages
2. Commit: \`feat: add login failed and unauthorized pages\`

## Acceptance Criteria
- [ ] Both pages render with appropriate messages
- [ ] Committed"

create_issue 25 "Complete Playwright Test Utilities with Auth" "$M3" "## Files
- Modify: \`playwright/playwright-utils.ts\`

## Steps
1. Add pageAsAdmin fixture
2. Inject session cookie for authenticated tests
3. Commit: \`feat: complete playwright utils with pageAsAdmin fixture\`

## Acceptance Criteria
- [ ] pageAsAdmin resets DB and injects admin cookie
- [ ] Committed"

create_issue 26 "Create Auth E2E Tests" "$M3" "## Files
- Create: \`playwright/auth.test.ts\`

## Steps
1. Test redirect to login when unauthenticated
2. Test admin can access protected routes
3. Test logout works
4. Commit: \`test: add auth e2e tests\`

## Acceptance Criteria
- [ ] All auth tests pass
- [ ] Committed"

# Phase 4: Admin UI (Tasks 27-42)
M4="Phase 4: Admin UI"

create_issue 27 "Add ImageKit Dependencies" "$M4" "## Files
- Modify: \`package.json\`

## Steps
1. Install: \`pnpm add imagekit\`
2. Commit: \`chore: add imagekit sdk\`

## Acceptance Criteria
- [ ] ImageKit SDK installed
- [ ] Committed"

create_issue 28 "Create ImageKit Client" "$M4" "## Files
- Create: \`app/utils/imagekit.server.ts\`

## Steps
1. Create uploadImage, deleteImage, uploadImageOrPlaceholder
2. Skip actual uploads in test mode
3. Commit: \`feat: add imagekit client with test mode\`

## Acceptance Criteria
- [ ] Returns placeholder in test mode
- [ ] Committed"

create_issue 29 "Create Drink Model Functions" "$M4" "## Files
- Create: \`app/models/drink.server.ts\`

## Steps
1. Create getAllDrinks, getDrinkBySlug, getDrinksByTag, getAllTags
2. Create createDrink, updateDrink, deleteDrink
3. Commit: \`feat: add drink model functions\`

## Acceptance Criteria
- [ ] All CRUD operations implemented
- [ ] Committed"

create_issue 30 "Create Fastly Utility" "$M4" "## Files
- Create: \`app/utils/fastly.server.ts\`

## Steps
1. Create purgeFastlyCache and purgeDrinkCache
2. Commit: \`feat: add fastly cache purge utility\`

## Acceptance Criteria
- [ ] Gracefully handles missing config
- [ ] Committed"

create_issue 31 "Create Slug Utility" "$M4" "## Files
- Create: \`app/utils/slug.ts\`

## Steps
1. Create generateSlug function
2. Commit: \`feat: add slug generation utility\`

## Acceptance Criteria
- [ ] Generates URL-safe slugs
- [ ] Committed"

create_issue 32 "Create Admin Layout Route" "$M4" "## Files
- Create: \`app/routes/_admin.tsx\`

## Steps
1. Create layout with middleware chain
2. Show user email and logout button
3. Commit: \`feat: add admin layout route\`

## Acceptance Criteria
- [ ] Uses userMiddleware + adminMiddleware
- [ ] Shows navigation and user info
- [ ] Committed"

create_issue 33 "Create Admin Index Route (Redirect)" "$M4" "## Files
- Create: \`app/routes/_admin._index.tsx\`

## Steps
1. Redirect /admin to /admin/drinks
2. Commit: \`feat: add admin index redirect to drinks\`

## Acceptance Criteria
- [ ] Redirects to /admin/drinks
- [ ] Committed"

create_issue 34 "Create Admin Drinks List Route and Test" "$M4" "## Files
- Create: \`app/routes/_admin.drinks._index.tsx\`
- Create: \`playwright/admin-drinks-list.test.ts\`

## Steps
1. Write failing test first
2. Create drinks list page with table
3. Verify test passes
4. Commit: \`feat: add admin drinks list page with tests\`

## Acceptance Criteria
- [ ] Shows all drinks in table
- [ ] Has Add Drink button
- [ ] Has Edit/Delete links
- [ ] Tests pass
- [ ] Committed"

create_issue 35 "Create Image Crop Component" "$M4" "## Files
- Create: \`app/admin/image-crop.tsx\`

## Steps
1. Install: \`pnpm add react-image-crop\`
2. Create component with square aspect ratio
3. Commit: \`feat: add image crop component\`

## Acceptance Criteria
- [ ] Allows file selection and cropping
- [ ] Returns cropped blob
- [ ] Committed"

create_issue 36 "Create Drink Form Component" "$M4" "## Files
- Create: \`app/admin/drink-form.tsx\`

## Steps
1. Create form with all drink fields
2. Integrate ImageCrop component
3. Commit: \`feat: add drink form component\`

## Acceptance Criteria
- [ ] All fields present
- [ ] Image preview works
- [ ] Committed"

create_issue 37 "Create New Drink Route and Test" "$M4" "## Files
- Create: \`app/routes/_admin.drinks.new.tsx\`
- Create: \`playwright/admin-create-drink.test.ts\`

## Steps
1. Write failing test first
2. Create route with form and action
3. Verify test passes
4. Commit: \`feat: add new drink route with tests\`

## Acceptance Criteria
- [ ] Can create drink via form
- [ ] Redirects to list after save
- [ ] Tests pass
- [ ] Committed"

create_issue 38 "Create Edit Drink Route and Test" "$M4" "## Files
- Create: \`app/routes/_admin.drinks.\$slug.edit.tsx\`
- Create: \`playwright/admin-edit-drink.test.ts\`

## Steps
1. Write failing test first
2. Create route with form pre-filled
3. Verify test passes
4. Commit: \`feat: add edit drink route with tests\`

## Acceptance Criteria
- [ ] Form pre-filled with existing data
- [ ] Can update drink
- [ ] Tests pass
- [ ] Committed"

create_issue 39 "Create Delete Drink Route and Test" "$M4" "## Files
- Create: \`app/routes/_admin.drinks.\$slug.delete.tsx\`
- Create: \`playwright/admin-delete-drink.test.ts\`

## Steps
1. Write failing test first
2. Create POST-only delete action
3. Verify test passes
4. Commit: \`feat: add delete drink route with tests\`

## Acceptance Criteria
- [ ] Deletes drink and redirects
- [ ] Tests pass
- [ ] Committed"

create_issue 40 "Add remix-utils Dependency" "$M4" "## Files
- Modify: \`package.json\`

## Steps
1. Install: \`pnpm add remix-utils\`
2. Commit: \`chore: add remix-utils for client IP logging\`

## Acceptance Criteria
- [ ] Package installed
- [ ] Committed"

create_issue 41 "Review Admin UI Styling" "$M4" "## Steps
1. Review all admin routes for consistent styling
2. Ensure admin UI looks distinct from public site
3. Fix any styling issues
4. Commit if changes made

## Acceptance Criteria
- [ ] Admin UI is functional and usable
- [ ] Visual distinction from public site"

create_issue 42 "Run All Admin Tests" "$M4" "## Steps
1. Run: \`pnpm test:e2e\`
2. Fix any failing tests
3. Commit fixes if needed

## Acceptance Criteria
- [ ] All admin-related tests pass"

# Phase 5: Update Public Routes (Tasks 43-49)
M5="Phase 5: Update Public Routes"

create_issue 43 "Update Index Page to Use SQLite" "$M5" "## Files
- Modify: \`app/routes/_app._index/route.tsx\`

## Steps
1. Replace Contentful query with getAllDrinks()
2. Update smoke test if needed
3. Verify tests pass
4. Commit: \`feat: update index page to use sqlite\`

## Acceptance Criteria
- [ ] Loads drinks from SQLite
- [ ] Tests pass
- [ ] Committed"

create_issue 44 "Update Drink Detail Page to Use SQLite" "$M5" "## Files
- Modify drink detail route

## Steps
1. Replace Contentful query with getDrinkBySlug()
2. Verify tests pass
3. Commit: \`feat: update drink detail page to use sqlite\`

## Acceptance Criteria
- [ ] Loads drink from SQLite
- [ ] Tests pass
- [ ] Committed"

create_issue 45 "Update Tags Index to Use SQLite" "$M5" "## Files
- Modify tags index route

## Steps
1. Replace Contentful query with getAllTags()
2. Verify tests pass
3. Commit: \`feat: update tags index to use sqlite\`

## Acceptance Criteria
- [ ] Loads tags from SQLite
- [ ] Tests pass
- [ ] Committed"

create_issue 46 "Update Tag Detail Page to Use SQLite" "$M5" "## Files
- Modify tag detail route

## Steps
1. Replace Contentful query with getDrinksByTag()
2. Verify tests pass
3. Commit: \`feat: update tag detail page to use sqlite\`

## Acceptance Criteria
- [ ] Loads drinks by tag from SQLite
- [ ] Tests pass
- [ ] Committed"

create_issue 47 "Update Search to Use SQLite" "$M5" "## Files
- Modify search route

## Steps
1. Update MiniSearch indexing to use SQLite data
2. Verify tests pass
3. Commit: \`feat: update search to use sqlite\`

## Acceptance Criteria
- [ ] Search indexes from SQLite
- [ ] Tests pass
- [ ] Committed"

create_issue 48 "Update Placeholder Images for ImageKit" "$M5" "## Files
- Modify image URL handling

## Steps
1. Update URL transformation for ImageKit format
2. Verify images display correctly
3. Commit: \`feat: update image urls for imagekit\`

## Acceptance Criteria
- [ ] Images load from ImageKit
- [ ] Committed"

create_issue 49 "Run Full Test Suite" "$M5" "## Steps
1. Run: \`pnpm test:e2e\`
2. Run: \`pnpm lint\`
3. Run: \`pnpm typecheck\`
4. Fix any issues
5. Commit fixes if needed

## Acceptance Criteria
- [ ] All E2E tests pass
- [ ] No lint errors
- [ ] No type errors"

# Phase 6: Migration and Cleanup (Tasks 50-56)
M6="Phase 6: Migration and Cleanup"

create_issue 50 "Create Migration Script" "$M6" "## Files
- Create: \`scripts/migrate-from-contentful.ts\`

## Steps
1. Fetch all drinks from Contentful
2. Download and re-upload images to ImageKit
3. Insert drinks into SQLite
4. Make script idempotent (skip existing slugs)
5. Commit: \`feat: add contentful migration script\`

## Acceptance Criteria
- [ ] Script fetches from Contentful
- [ ] Uploads images to ImageKit
- [ ] Inserts into SQLite
- [ ] Safe to re-run
- [ ] Committed"

create_issue 51 "Update Fly.io Configuration" "$M6" "## Files
- Modify: \`fly.toml\`

## Steps
1. Add volume mount for /data
2. Update to single machine config
3. Commit: \`chore: update fly.toml for sqlite volume\`

**Note: Do not deploy yet**

## Acceptance Criteria
- [ ] Volume mount configured
- [ ] Committed"

create_issue 52 "Remove Contentful Code" "$M6" "## Files
- Delete: \`app/utils/graphql.server.ts\`
- Delete: \`app/routes/[_].content-change/\`
- Remove Contentful types

## Steps
1. Remove all Contentful-related code
2. Remove unused env vars from schema
3. Commit: \`chore: remove contentful code\`

## Acceptance Criteria
- [ ] No Contentful imports remain
- [ ] Committed"

create_issue 53 "Update Types and Clean Up" "$M6" "## Steps
1. Remove unused type definitions
2. Run typecheck to verify
3. Commit: \`chore: clean up types\`

## Acceptance Criteria
- [ ] \`pnpm typecheck\` passes
- [ ] Committed"

create_issue 54 "Create Fly Volume (Manual)" "$M6" "## Steps (Manual - run from terminal)
1. \`fly volumes create drinks_data --region sea --size 1\`
2. Verify volume created

**This is a manual step - not automated**

## Acceptance Criteria
- [ ] Volume exists in Fly dashboard"

create_issue 55 "Deploy and Run Migration (Manual)" "$M6" "## Steps (Manual - run from terminal)
1. \`fly deploy\`
2. \`fly ssh console\`
3. \`pnpm db:push\`
4. \`pnpm migrate:contentful\`
5. Verify data migrated

**This is a manual step - not automated**

## Acceptance Criteria
- [ ] App deployed with volume
- [ ] Database tables created
- [ ] All drinks migrated"

create_issue 56 "Add First Admin User (Manual)" "$M6" "## Steps (Manual)
1. SSH into Fly machine
2. Insert your Google email into users table:
   \`\`\`sql
   INSERT INTO users (id, email, role)
   VALUES ('your-cuid', 'your@email.com', 'admin');
   \`\`\`
3. Test login via /admin

**This is a manual step - not automated**

## Acceptance Criteria
- [ ] Can log in via Google OAuth
- [ ] Can access /admin"

echo ""
echo "=== Done! ==="
echo "Created label, 6 milestones, and 56 issues."
echo ""
echo "View issues: gh issue list -l $LABEL"
echo "View by milestone: gh issue list -l $LABEL -m 'Phase 1: Database Setup'"
