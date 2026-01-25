# Contentful Migration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan
> task-by-task.

**Goal:** Replace Contentful CMS with SQLite + ImageKit + in-app admin UI.

**Architecture:** SQLite (strict mode) on Fly volume for data, ImageKit for image storage/CDN,
Google OAuth for admin auth, Drizzle ORM for database access. Admin routes built into the existing
React Router app.

**Tech Stack:** React Router v7, Drizzle ORM, SQLite, ImageKit, remix-auth, @coji/remix-auth-google,
Playwright, Zod

**Reference Project:** Auth and testing patterns from `/home/justin/dev/work/slhs/hand-hygiene`

**Testing Strategy:**

- Playwright for all E2E tests (test as the user would)
- Fresh database seeded before EACH test via `/_/reset-db` endpoint
- `pageAsAdmin` fixture for authenticated tests (injects session cookie)
- Test-only endpoint only available when `NODE_ENV=test`

---

## Phase 1: Database Setup (Tasks 1-6)

### Task 1: Add Drizzle and SQLite Dependencies

**Files:**

- Modify: `package.json`

**Step 1: Install dependencies**

Run:

```bash
pnpm add drizzle-orm better-sqlite3 @paralleldrive/cuid2
pnpm add -D drizzle-kit @types/better-sqlite3
```

**Step 2: Verify installation**

Run: `pnpm ls drizzle-orm better-sqlite3` Expected: Both packages listed with versions

**Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: add drizzle, sqlite, and cuid2 dependencies"
```

---

### Task 2: Create Drizzle Configuration

**Files:**

- Create: `drizzle.config.ts`

**Step 1: Create drizzle config file**

```typescript
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './app/db/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
  dbCredentials: {
    url: process.env.DATABASE_URL || './data/drinks.db',
  },
  strict: true,
  verbose: true,
});
```

**Step 2: Commit**

```bash
git add drizzle.config.ts
git commit -m "chore: add drizzle configuration"
```

---

### Task 3: Create Database Schema

**Files:**

- Create: `app/db/schema.ts`

**Step 1: Create the schema file**

```typescript
import { sql } from 'drizzle-orm';
import { integer, text, sqliteTable } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name'),
  avatarUrl: text('avatar_url'),
  role: text('role').notNull().default('admin'),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const drinks = sqliteTable('drinks', {
  id: text('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  title: text('title').notNull(),
  imageUrl: text('image_url').notNull(),
  imageFileId: text('image_file_id').notNull(),
  calories: integer('calories').notNull(),
  ingredients: text('ingredients', { mode: 'json' }).notNull().$type<string[]>(),
  tags: text('tags', { mode: 'json' }).notNull().$type<string[]>(),
  notes: text('notes'),
  rank: integer('rank').notNull().default(0),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`(datetime('now'))`),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Drink = typeof drinks.$inferSelect;
export type NewDrink = typeof drinks.$inferInsert;
```

**Step 2: Commit**

```bash
git add app/db/schema.ts
git commit -m "feat: add drizzle schema for users and drinks"
```

---

### Task 4: Create Database Client

**Files:**

- Create: `app/db/client.server.ts`

**Step 1: Create the database client**

```typescript
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { getEnvVars } from '#/app/utils/env.server';
import * as schema from './schema';

const { DATABASE_URL } = getEnvVars();

let sqlite: Database.Database | null = null;

export function getDatabase() {
  if (!sqlite) {
    sqlite = new Database(DATABASE_URL);
    sqlite.pragma('journal_mode = WAL');
  }
  return sqlite;
}

export function closeDatabase() {
  if (sqlite) {
    sqlite.close();
    sqlite = null;
  }
}

export function resetDatabaseConnection() {
  closeDatabase();
  return getDatabase();
}

export const db = drizzle(getDatabase(), { schema });

export function getDb() {
  return drizzle(getDatabase(), { schema });
}
```

**Step 2: Create data directory for local development**

Run:

```bash
mkdir -p data
echo "*.db" >> data/.gitignore
echo "*.db-*" >> data/.gitignore
```

**Step 3: Commit**

```bash
git add app/db/client.server.ts data/.gitignore
git commit -m "feat: add drizzle database client with reset capability"
```

---

### Task 5: Generate and Run Initial Migration

**Files:**

- Create: `drizzle/` migrations directory (generated)
- Modify: `package.json`

**Step 1: Add migration scripts to package.json**

Add to `package.json` scripts:

```json
{
  "db:generate": "drizzle-kit generate",
  "db:migrate": "drizzle-kit migrate",
  "db:push": "drizzle-kit push",
  "db:studio": "drizzle-kit studio"
}
```

**Step 2: Generate migration**

Run: `pnpm db:generate` Expected: Migration files created in `drizzle/` directory

**Step 3: Create local database and apply migration**

Run: `pnpm db:push` Expected: Tables created in local SQLite database

**Step 4: Verify tables exist**

Run: `sqlite3 ./data/drinks.db ".schema"` Expected: Shows users and drinks table schemas

**Step 5: Commit**

```bash
git add package.json drizzle/
git commit -m "feat: add database migrations"
```

---

### Task 6: Update Environment Variables Schema

**Files:**

- Modify: `app/utils/env.server.ts`

**Step 1: Read current env.server.ts**

Read the file to understand current structure.

**Step 2: Add new environment variables**

Add to the Zod schema:

```typescript
// Database
DATABASE_URL: z.string().default('./data/drinks.db'),

// ImageKit
IMAGEKIT_PUBLIC_KEY: z.string().optional(),
IMAGEKIT_PRIVATE_KEY: z.string().optional(),
IMAGEKIT_URL_ENDPOINT: z.string().optional(),

// Google OAuth (required - set dummy values for local dev if not using admin)
GOOGLE_CLIENT_ID: z.string().min(1),
GOOGLE_CLIENT_SECRET: z.string().min(1),
GOOGLE_REDIRECT_URI: z.string().min(1),

// Session
SESSION_SECRET: z.string().default('dev-secret-change-in-production'),

// Node environment
NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
```

**Step 3: Mark Contentful variables as optional (for migration period)**

Change Contentful variables to `.optional()` so app can run without them after migration.

**Step 4: Commit**

```bash
git add app/utils/env.server.ts
git commit -m "feat: add env vars for database, imagekit, and auth"
```

---

## Phase 2: Playwright Infrastructure (Tasks 7-13)

### Task 7: Install Playwright

**Files:**

- Modify: `package.json`
- Create: `playwright.config.ts`

**Step 1: Install Playwright**

Run:

```bash
pnpm add -D @playwright/test
pnpm exec playwright install chromium
```

**Step 2: Create Playwright config**

Reference: `/home/justin/dev/work/slhs/hand-hygiene/playwright.config.ts`

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './playwright',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'pnpm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: './data/test.db',
    },
  },
});
```

**Step 3: Add test script to package.json**

```json
{
  "test:e2e": "playwright test",
  "test:e2e:ui": "playwright test --ui"
}
```

**Step 4: Commit**

```bash
git add package.json pnpm-lock.yaml playwright.config.ts
git commit -m "chore: add playwright for e2e testing"
```

---

### Task 8: Create Test Seed Data

**Files:**

- Create: `playwright/seed-data.ts`

**Step 1: Create seed data file**

```typescript
import type { NewUser, NewDrink } from '#/app/db/schema';

export const TEST_ADMIN_USER: NewUser = {
  id: 'test-admin-id',
  email: 'admin@test.com',
  name: 'Test Admin',
  avatarUrl: null,
  role: 'admin',
};

export const TEST_DRINKS: Omit<NewDrink, 'createdAt' | 'updatedAt'>[] = [
  {
    id: 'test-drink-1',
    slug: 'test-margarita',
    title: 'Test Margarita',
    imageUrl: 'https://via.placeholder.com/400x400.png?text=Margarita',
    imageFileId: 'test-placeholder',
    calories: 200,
    ingredients: ['2 oz tequila', '1 oz lime juice', '1 oz triple sec'],
    tags: ['tequila', 'citrus'],
    notes: 'A classic test margarita',
    rank: 10,
  },
  {
    id: 'test-drink-2',
    slug: 'test-mojito',
    title: 'Test Mojito',
    imageUrl: 'https://via.placeholder.com/400x400.png?text=Mojito',
    imageFileId: 'test-placeholder',
    calories: 150,
    ingredients: ['2 oz rum', '1 oz lime juice', 'mint leaves', 'soda water'],
    tags: ['rum', 'citrus', 'mint'],
    notes: 'A refreshing test mojito',
    rank: 5,
  },
  {
    id: 'test-drink-3',
    slug: 'test-old-fashioned',
    title: 'Test Old Fashioned',
    imageUrl: 'https://via.placeholder.com/400x400.png?text=OldFashioned',
    imageFileId: 'test-placeholder',
    calories: 180,
    ingredients: ['2 oz bourbon', '1 sugar cube', 'angostura bitters'],
    tags: ['bourbon', 'classic'],
    notes: null,
    rank: 0,
  },
];
```

**Step 2: Commit**

```bash
git add playwright/seed-data.ts
git commit -m "feat: add test seed data for playwright"
```

---

### Task 9: Create Database Reset Utility

**Files:**

- Create: `app/db/reset.server.ts`

**Step 1: Create reset utility**

Uses Drizzle's type-safe delete method to stay in sync with the schema.

```typescript
import { getDb } from './client.server';
import { users, drinks } from './schema';
import { TEST_ADMIN_USER, TEST_DRINKS } from '../../playwright/seed-data';

export async function resetAndSeedDatabase() {
  const db = getDb();

  // Delete all data (order matters if there are foreign keys)
  await db.delete(drinks);
  await db.delete(users);

  // Seed test data
  await db.insert(users).values(TEST_ADMIN_USER);
  await db.insert(drinks).values(TEST_DRINKS);

  return { success: true };
}
```

**Step 2: Commit**

```bash
git add app/db/reset.server.ts
git commit -m "feat: add database reset utility for testing"
```

---

### Task 10: Create Test Reset Endpoint

**Files:**

- Create: `app/routes/[_].reset-db.ts`

**Step 1: Create test reset endpoint**

```typescript
import type { Route } from './+types/[_].reset-db';
import { getEnvVars } from '#/app/utils/env.server';
import { resetAndSeedDatabase } from '#/app/db/reset.server';

const { NODE_ENV } = getEnvVars();

export async function action({ request }: Route.ActionArgs) {
  // Only allow in test environment
  if (NODE_ENV !== 'test') {
    throw new Response('Not Found', { status: 404 });
  }

  if (request.method !== 'POST') {
    throw new Response('Method Not Allowed', { status: 405 });
  }

  await resetAndSeedDatabase();

  return Response.json({ success: true });
}

export async function loader() {
  // Don't expose this endpoint via GET
  throw new Response('Not Found', { status: 404 });
}
```

**Step 2: Commit**

```bash
git add app/routes/[_].reset-db.ts
git commit -m "feat: add test database reset endpoint"
```

---

### Task 11: Create Mock Users for Testing

**Files:**

- Create: `playwright/mock-users.ts`

**Step 1: Create mock users file**

Reference: `/home/justin/dev/work/slhs/hand-hygiene/playwright/mock-users.ts`

```typescript
import type { AuthenticatedUser } from '#/app/auth/types';
import { TEST_ADMIN_USER } from './seed-data';

export const MOCK_ADMIN: AuthenticatedUser = {
  id: TEST_ADMIN_USER.id,
  email: TEST_ADMIN_USER.email,
  name: TEST_ADMIN_USER.name,
  avatarUrl: TEST_ADMIN_USER.avatarUrl,
  role: TEST_ADMIN_USER.role,
};
```

**Step 2: Commit**

```bash
git add playwright/mock-users.ts
git commit -m "feat: add mock users for playwright tests"
```

---

### Task 12: Create Playwright Test Utilities (Scaffold)

**Files:**

- Create: `playwright/playwright-utils.ts`

**Step 1: Create test utilities scaffold**

This will be completed after auth is set up. For now, create a scaffold.

Reference: `/home/justin/dev/work/slhs/hand-hygiene/playwright/playwright-utils.ts`

```typescript
import { test as base, expect, type Page } from '@playwright/test';

// Will be extended with pageAsAdmin fixture after auth is implemented

async function resetDatabase(request: Page['request']) {
  const response = await request.post('/_/reset-db');
  if (!response.ok()) {
    throw new Error(`Failed to reset database: ${response.status()}`);
  }
}

export const test = base.extend<{ resetDb: void }>({
  resetDb: async ({ request }, use) => {
    await resetDatabase(request);
    await use();
  },
});

export { expect };
```

**Step 2: Commit**

```bash
git add playwright/playwright-utils.ts
git commit -m "feat: add playwright test utilities scaffold"
```

---

### Task 13: Create First Smoke Test

**Files:**

- Create: `playwright/smoke.test.ts`

**Step 1: Create smoke test**

```typescript
import { test, expect } from './playwright-utils';

test.describe('Smoke Tests', () => {
  test('homepage loads with seeded drinks', async ({ page, resetDb }) => {
    await page.goto('/');

    // Check that seeded drinks appear
    await expect(page.getByText('Test Margarita')).toBeVisible();
    await expect(page.getByText('Test Mojito')).toBeVisible();
    await expect(page.getByText('Test Old Fashioned')).toBeVisible();
  });

  test('drink detail page loads', async ({ page, resetDb }) => {
    await page.goto('/test-margarita');

    await expect(page.getByText('Test Margarita')).toBeVisible();
    await expect(page.getByText('2 oz tequila')).toBeVisible();
    await expect(page.getByText('200')).toBeVisible(); // calories
  });
});
```

**Step 2: Run test to verify setup works**

Run: `pnpm test:e2e` Expected: Tests pass (or fail meaningfully if public routes aren't updated
yet - this verifies the test infrastructure works)

**Step 3: Commit**

```bash
git add playwright/smoke.test.ts
git commit -m "test: add smoke tests for homepage and drink detail"
```

---

## Phase 3: Authentication (Tasks 14-26)

### Task 14: Add Auth Dependencies

**Files:**

- Modify: `package.json`

**Step 1: Install auth dependencies**

Run:

```bash
pnpm add remix-auth @coji/remix-auth-google @epic-web/invariant
```

**Step 2: Verify installation**

Run: `pnpm ls remix-auth @coji/remix-auth-google @epic-web/invariant` Expected: All packages listed

**Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: add remix-auth dependencies"
```

---

### Task 15: Create Auth Types

**Files:**

- Create: `app/auth/types.ts`

**Step 1: Create auth types file**

Reference: `/home/justin/dev/work/slhs/hand-hygiene/app/auth/types.ts`

```typescript
import type { User } from '#/app/db/schema';

export type AuthenticatedUser = {
  id: User['id'];
  email: User['email'];
  name: User['name'];
  avatarUrl: User['avatarUrl'];
  role: User['role'];
};
```

**Step 2: Commit**

```bash
git add app/auth/types.ts
git commit -m "feat: add authenticated user type"
```

---

### Task 16: Create Session Storage with Test Export

**Files:**

- Create: `app/auth/session.server.ts`

**Step 1: Create session storage with getRawSessionCookieValue export**

Reference: `/home/justin/dev/work/slhs/hand-hygiene/app/auth/session.server.ts`

```typescript
import { createCookie, createCookieSessionStorage } from 'react-router';
import { getEnvVars } from '#/app/utils/env.server';
import type { AuthenticatedUser } from './types';

const { SESSION_SECRET, NODE_ENV } = getEnvVars();

export const sessionCookie = createCookie('__session', {
  httpOnly: true,
  path: '/',
  sameSite: 'lax',
  secrets: [SESSION_SECRET],
  secure: NODE_ENV === 'production',
});

type SessionData = {
  user?: AuthenticatedUser;
  returnTo?: string;
};

const cookieSessionStorage = createCookieSessionStorage<SessionData>({
  cookie: sessionCookie,
});

export const { getSession, commitSession, destroySession } = cookieSessionStorage;

/**
 * Get the raw session cookie value for a user.
 * Used in Playwright tests to inject auth cookies.
 */
export async function getRawSessionCookieValue(user: AuthenticatedUser): Promise<string> {
  const session = await getSession();
  session.set('user', user);
  const serializedCookie = await commitSession(session);
  // Extract just the cookie value (before the first semicolon)
  const [cookiePair] = serializedCookie.split(';');
  const [, value] = cookiePair.split('=');
  return value;
}
```

**Step 2: Commit**

```bash
git add app/auth/session.server.ts
git commit -m "feat: add session storage with test cookie export"
```

---

### Task 17: Create Auth Utilities

**Files:**

- Create: `app/auth/utils.server.ts`

**Step 1: Create auth utilities**

Reference: `/home/justin/dev/work/slhs/hand-hygiene/app/auth/utils.server.ts`

```typescript
export function safeRedirectTo(
  to: FormDataEntryValue | string | null | undefined,
  defaultRedirect = '/admin',
): string {
  if (!to || typeof to !== 'string') {
    return defaultRedirect;
  }

  if (!to.startsWith('/') || to.startsWith('//')) {
    return defaultRedirect;
  }

  return to;
}

export function createReturnToUrl(request: Request): string {
  const url = new URL(request.url);
  return url.pathname + url.search;
}
```

**Step 2: Commit**

```bash
git add app/auth/utils.server.ts
git commit -m "feat: add auth utility functions"
```

---

### Task 18: Create User Model Functions

**Files:**

- Create: `app/models/user.server.ts`

**Step 1: Create user model**

```typescript
import { eq } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';
import { getDb } from '#/app/db/client.server';
import { users, type User } from '#/app/db/schema';

export async function getUserById(id: User['id']): Promise<User | undefined> {
  const db = getDb();
  return db.query.users.findFirst({
    where: eq(users.id, id),
  });
}

export async function getUserByEmail(email: User['email']): Promise<User | undefined> {
  const db = getDb();
  return db.query.users.findFirst({
    where: eq(users.email, email),
  });
}

/**
 * Update an existing user's profile on login.
 * Returns null if user doesn't exist (allowlist model - users must be manually added).
 */
export async function updateUserOnLogin({
  email,
  name,
  avatarUrl,
}: {
  email: string;
  name: string | null;
  avatarUrl: string | null;
}): Promise<User | null> {
  const db = getDb();
  const existingUser = await getUserByEmail(email);

  if (!existingUser) {
    return null;
  }

  const [updatedUser] = await db
    .update(users)
    .set({
      name,
      avatarUrl,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(users.id, existingUser.id))
    .returning();

  return updatedUser;
}
```

**Step 2: Commit**

```bash
git add app/models/user.server.ts
git commit -m "feat: add user model functions"
```

---

### Task 19: Create Authenticator

**Files:**

- Create: `app/auth/auth.server.ts`

**Step 1: Create authenticator**

Reference: `/home/justin/dev/work/slhs/hand-hygiene/app/auth/auth.server.ts`

```typescript
import { Authenticator } from 'remix-auth';
import { GoogleStrategy, type GoogleStrategyOptions } from '@coji/remix-auth-google';
import { invariant } from '@epic-web/invariant';
import { getEnvVars } from '#/app/utils/env.server';
import { updateUserOnLogin } from '#/app/models/user.server';
import type { AuthenticatedUser } from './types';

const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI } = getEnvVars();

const googleStrategyOptions: GoogleStrategyOptions = {
  clientId: GOOGLE_CLIENT_ID,
  clientSecret: GOOGLE_CLIENT_SECRET,
  redirectURI: GOOGLE_REDIRECT_URI,
};

/**
 * Verify callback for Google OAuth. Called after successful authentication
 * to check user exists (allowlist) and return session data.
 *
 * Note: Role checking is NOT done here - that's handled by middleware.
 * This allows the same auth flow for different route protection levels.
 */
const verify: ConstructorParameters<typeof GoogleStrategy<AuthenticatedUser>>[1] = async ({
  profile,
}) => {
  const email = profile.emails?.[0]?.value;
  invariant(email, 'No email found in Google profile');

  const user = await updateUserOnLogin({
    email,
    name: profile.displayName ?? null,
    avatarUrl: profile.photos?.[0]?.value ?? null,
  });

  // Allowlist model: user must exist in database to log in
  // Role checking happens in middleware (adminMiddleware, etc.)
  invariant(user, 'User not authorized');

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
    role: user.role,
  };
};

export const authenticator = new Authenticator<AuthenticatedUser>();

authenticator.use(new GoogleStrategy(googleStrategyOptions, verify), 'google');
```

**Step 2: Commit**

```bash
git add app/auth/auth.server.ts
git commit -m "feat: add google oauth authenticator"
```

---

### Task 20: Create Auth Middleware

**Files:**

- Create: `app/middleware/auth.server.ts`

**Step 1: Create auth middleware with composable pattern**

Adapts the pattern from
`/home/justin/dev/work/slhs/hand-hygiene/app/middleware/authorization.server.ts`:

- Uses `createContext` for type-safe context access
- Exports `getUserFromContext` helper for use in route loaders
- Composable middleware: `userMiddleware` (auth only) + `adminMiddleware` (role check)

```typescript
import {
  createContext,
  redirect,
  type RouterContextProvider,
  type unstable_MiddlewareFunction as MiddlewareFunction,
} from 'react-router';
import { getSession, commitSession } from '#/app/auth/session.server';
import { getUserById } from '#/app/models/user.server';
import { createReturnToUrl } from '#/app/auth/utils.server';
import type { AuthenticatedUser } from '#/app/auth/types';

const userContext = createContext<AuthenticatedUser>();

/**
 * Get the authenticated user from the route context.
 * Use this in route loaders/actions after userMiddleware has run.
 */
export function getUserFromContext(context: Readonly<RouterContextProvider>): AuthenticatedUser {
  return context.get(userContext);
}

/**
 * Middleware that requires an authenticated user. If authenticated, the user
 * is stored in context (accessible via getUserFromContext). If not authenticated,
 * redirects to login with returnTo URL preserved.
 */
export const userMiddleware: MiddlewareFunction<Response> = async ({ request, context }, next) => {
  const session = await getSession(request.headers.get('Cookie'));
  const sessionUser = session.get('user');

  if (!sessionUser) {
    session.set('returnTo', createReturnToUrl(request));
    throw redirect('/login', {
      headers: { 'Set-Cookie': await commitSession(session) },
    });
  }

  // Verify user still exists in database
  const user = await getUserById(sessionUser.id);

  if (!user) {
    // User was deleted - clear session and redirect to login
    throw redirect('/login', {
      headers: { 'Set-Cookie': await commitSession(session) },
    });
  }

  context.set(userContext, {
    id: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
    role: user.role,
  });

  return next();
};

/**
 * Middleware that requires the authenticated user has admin role.
 * Must come after userMiddleware in the middleware chain.
 */
export const adminMiddleware: MiddlewareFunction<Response> = async ({ context }, next) => {
  const user = getUserFromContext(context);

  if (user.role !== 'admin') {
    throw redirect('/unauthorized');
  }

  return next();
};
```

**Step 2: Commit**

```bash
git add app/middleware/auth.server.ts
git commit -m "feat: add composable auth middleware with typed context"
```

---

### Task 21: Create Login Route

**Files:**

- Create: `app/routes/login.tsx`

**Step 1: Create login route**

Reference: `/home/justin/dev/work/slhs/hand-hygiene/app/routes/login.tsx`

```typescript
import type { Route } from './+types/login';
import { authenticator } from '#/app/auth/auth.server';

export async function loader({ request }: Route.LoaderArgs) {
  // Single provider - automatically initiate Google OAuth
  return authenticator.authenticate('google', request);
}

export default function LoginPage() {
  // This won't render - loader redirects to Google
  return null;
}
```

**Step 2: Commit**

```bash
git add app/routes/login.tsx
git commit -m "feat: add login route"
```

---

### Task 22: Create Google OAuth Callback Route

**Files:**

- Create: `app/routes/auth.google.callback.tsx`

**Step 1: Create callback route**

Reference: `/home/justin/dev/work/slhs/hand-hygiene/app/routes/auth.okta.callback.tsx`

```typescript
import { redirect } from 'react-router';
import type { Route } from './+types/auth.google.callback';
import { authenticator } from '#/app/auth/auth.server';
import { getSession, commitSession } from '#/app/auth/session.server';
import { safeRedirectTo } from '#/app/auth/utils.server';

export async function loader({ request }: Route.LoaderArgs) {
  let authenticatedUser;

  try {
    authenticatedUser = await authenticator.authenticate('google', request);
  } catch (error) {
    console.error('Google OAuth error:', error);
    throw redirect('/login-failed');
  }

  if (!authenticatedUser) {
    throw redirect('/login-failed');
  }

  const session = await getSession(request.headers.get('Cookie'));
  session.set('user', authenticatedUser);

  const returnTo = session.get('returnTo');
  session.unset('returnTo');

  throw redirect(safeRedirectTo(returnTo), {
    headers: { 'Set-Cookie': await commitSession(session) },
  });
}

export default function AuthGoogleCallback() {
  return null;
}
```

**Step 2: Commit**

```bash
git add app/routes/auth.google.callback.tsx
git commit -m "feat: add google oauth callback route"
```

---

### Task 23: Create Logout Route

**Files:**

- Create: `app/routes/logout.tsx`

**Step 1: Create logout route**

Reference: `/home/justin/dev/work/slhs/hand-hygiene/app/routes/logout.tsx`

```typescript
import { redirect } from 'react-router';
import type { Route } from './+types/logout';
import { getSession, destroySession } from '#/app/auth/session.server';

export async function action({ request }: Route.ActionArgs) {
  const session = await getSession(request.headers.get('Cookie'));

  throw redirect('/', {
    headers: { 'Set-Cookie': await destroySession(session) },
  });
}

export async function loader() {
  // Redirect GET requests to home
  throw redirect('/');
}
```

**Step 2: Commit**

```bash
git add app/routes/logout.tsx
git commit -m "feat: add logout route"
```

---

### Task 24: Create Login Failed and Unauthorized Routes

**Files:**

- Create: `app/routes/login-failed.tsx`
- Create: `app/routes/unauthorized.tsx`

**Step 1: Create login failed page**

```typescript
import { Link } from 'react-router';

export default function LoginFailed() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <h1 className="text-2xl font-bold">Login Failed</h1>
      <p className="mt-2 text-gray-600">
        Unable to authenticate. Please try again.
      </p>
      <Link to="/login" className="mt-4 text-blue-600 hover:underline">
        Try again
      </Link>
    </div>
  );
}
```

**Step 2: Create unauthorized page**

```typescript
import { Link } from 'react-router';

export default function Unauthorized() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <h1 className="text-2xl font-bold">Unauthorized</h1>
      <p className="mt-2 text-gray-600">
        You do not have permission to access this page.
      </p>
      <Link to="/" className="mt-4 text-blue-600 hover:underline">
        Go home
      </Link>
    </div>
  );
}
```

**Step 3: Commit**

```bash
git add app/routes/login-failed.tsx app/routes/unauthorized.tsx
git commit -m "feat: add login failed and unauthorized pages"
```

---

### Task 25: Complete Playwright Test Utilities with Auth

**Files:**

- Modify: `playwright/playwright-utils.ts`
- Modify: `playwright/mock-users.ts` (if needed)

**Step 1: Update playwright-utils with pageAsAdmin fixture**

Reference: `/home/justin/dev/work/slhs/hand-hygiene/playwright/playwright-utils.ts`

```typescript
import { test as base, expect, type Page } from '@playwright/test';
import { sessionCookie, getRawSessionCookieValue } from '#/app/auth/session.server';
import { MOCK_ADMIN } from './mock-users';

type TestFixtures = {
  resetDb: void;
  pageAsAdmin: Page;
};

async function resetDatabase(request: Page['request']) {
  const response = await request.post('/_/reset-db');
  if (!response.ok()) {
    throw new Error(`Failed to reset database: ${response.status()}`);
  }
}

export const test = base.extend<TestFixtures>({
  resetDb: async ({ request }, use) => {
    await resetDatabase(request);
    await use();
  },

  pageAsAdmin: async ({ page, context, request }, use) => {
    // Reset database before each test
    await resetDatabase(request);

    // Inject admin session cookie
    await context.addCookies([
      {
        name: sessionCookie.name,
        value: await getRawSessionCookieValue(MOCK_ADMIN),
        domain: 'localhost',
        httpOnly: true,
        path: '/',
        sameSite: 'Lax',
        secure: false,
      },
    ]);

    await use(page);
    await context.clearCookies();
  },
});

export { expect };
```

**Step 2: Commit**

```bash
git add playwright/playwright-utils.ts
git commit -m "feat: complete playwright utils with pageAsAdmin fixture"
```

---

### Task 26: Create Auth E2E Tests

**Files:**

- Create: `playwright/auth.test.ts`

**Step 1: Create auth tests**

```typescript
import { test, expect } from './playwright-utils';

test.describe('Authentication', () => {
  test('unauthenticated user is redirected to login when accessing admin', async ({
    page,
    resetDb,
  }) => {
    const response = await page.goto('/admin');

    // Should redirect to login
    expect(page.url()).toContain('/login');
  });

  test('authenticated admin can access admin pages', async ({ pageAsAdmin }) => {
    await pageAsAdmin.goto('/admin/drinks');

    // Should see the admin drinks page
    await expect(pageAsAdmin.getByRole('heading', { name: 'Drinks' })).toBeVisible();
    // Should see the user email in header
    await expect(pageAsAdmin.getByText('admin@test.com')).toBeVisible();
  });

  test('admin can logout', async ({ pageAsAdmin }) => {
    await pageAsAdmin.goto('/admin/drinks');

    // Click logout
    await pageAsAdmin.getByRole('button', { name: 'Logout' }).click();

    // Should be redirected to home
    await expect(pageAsAdmin).toHaveURL('/');
  });
});
```

**Step 2: Commit**

```bash
git add playwright/auth.test.ts
git commit -m "test: add auth e2e tests"
```

---

## Phase 4: Admin UI (Tasks 27-42)

### Task 27: Add ImageKit Dependencies

**Files:**

- Modify: `package.json`

**Step 1: Install ImageKit SDK**

Run:

```bash
pnpm add imagekit
```

**Step 2: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: add imagekit sdk"
```

---

### Task 28: Create ImageKit Client

**Files:**

- Create: `app/utils/imagekit.server.ts`

**Step 1: Create ImageKit client**

```typescript
import ImageKit from 'imagekit';
import { getEnvVars } from '#/app/utils/env.server';

const { IMAGEKIT_PUBLIC_KEY, IMAGEKIT_PRIVATE_KEY, IMAGEKIT_URL_ENDPOINT, NODE_ENV } = getEnvVars();

type UploadResult = {
  url: string;
  fileId: string;
};

function getImageKit() {
  if (!IMAGEKIT_PUBLIC_KEY || !IMAGEKIT_PRIVATE_KEY || !IMAGEKIT_URL_ENDPOINT) {
    throw new Error('ImageKit credentials not configured');
  }

  return new ImageKit({
    publicKey: IMAGEKIT_PUBLIC_KEY,
    privateKey: IMAGEKIT_PRIVATE_KEY,
    urlEndpoint: IMAGEKIT_URL_ENDPOINT,
  });
}

export async function uploadImage(file: Buffer, fileName: string): Promise<UploadResult> {
  const imagekit = getImageKit();

  const response = await imagekit.upload({
    file,
    fileName,
    folder: '/drinks',
  });

  return {
    url: response.url,
    fileId: response.fileId,
  };
}

export async function deleteImage(fileId: string): Promise<void> {
  if (NODE_ENV === 'test') {
    return; // Skip actual deletion in tests
  }
  const imagekit = getImageKit();
  await imagekit.deleteFile(fileId);
}

/**
 * For tests: return placeholder values instead of uploading
 */
export async function uploadImageOrPlaceholder(
  file: Buffer,
  fileName: string,
): Promise<UploadResult> {
  if (NODE_ENV === 'test') {
    return {
      url: `https://via.placeholder.com/400x400.png?text=${encodeURIComponent(fileName)}`,
      fileId: 'test-placeholder',
    };
  }
  return uploadImage(file, fileName);
}
```

**Step 2: Commit**

```bash
git add app/utils/imagekit.server.ts
git commit -m "feat: add imagekit client with test mode"
```

---

### Task 29: Create Drink Model Functions

**Files:**

- Create: `app/models/drink.server.ts`

**Step 1: Create drink model**

```typescript
import { eq, desc, sql, like } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';
import { getDb } from '#/app/db/client.server';
import { drinks, type Drink, type NewDrink } from '#/app/db/schema';

export async function getAllDrinks(): Promise<Drink[]> {
  const db = getDb();
  return db.query.drinks.findMany({
    orderBy: [desc(drinks.rank), desc(drinks.createdAt)],
  });
}

export async function getDrinkBySlug(slug: string): Promise<Drink | undefined> {
  const db = getDb();
  return db.query.drinks.findFirst({
    where: eq(drinks.slug, slug),
  });
}

export async function getDrinksByTag(tag: string): Promise<Drink[]> {
  const db = getDb();
  // Query drinks where tags JSON array contains the tag
  const allDrinks = await db.query.drinks.findMany({
    orderBy: [desc(drinks.rank), desc(drinks.createdAt)],
  });

  return allDrinks.filter((drink) => drink.tags.includes(tag));
}

export async function getAllTags(): Promise<string[]> {
  const db = getDb();
  const allDrinks = await db.query.drinks.findMany({
    columns: { tags: true },
  });

  const tagSet = new Set<string>();
  for (const drink of allDrinks) {
    for (const tag of drink.tags) {
      tagSet.add(tag);
    }
  }

  return Array.from(tagSet).sort();
}

export async function createDrink(
  data: Omit<NewDrink, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<Drink> {
  const db = getDb();
  const [drink] = await db
    .insert(drinks)
    .values({
      id: createId(),
      ...data,
    })
    .returning();

  return drink;
}

export async function updateDrink(
  id: string,
  data: Partial<Omit<NewDrink, 'id' | 'createdAt'>>,
): Promise<Drink> {
  const db = getDb();
  const [drink] = await db
    .update(drinks)
    .set({
      ...data,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(drinks.id, id))
    .returning();

  return drink;
}

export async function deleteDrink(id: string): Promise<void> {
  const db = getDb();
  await db.delete(drinks).where(eq(drinks.id, id));
}
```

**Step 2: Commit**

```bash
git add app/models/drink.server.ts
git commit -m "feat: add drink model functions"
```

---

### Task 30: Create Fastly Utility

**Files:**

- Create: `app/utils/fastly.server.ts`

**Step 1: Create Fastly utility**

```typescript
import { getEnvVars } from '#/app/utils/env.server';
import { getSurrogateKeyForTag } from '#/app/tags/utils';

const { FASTLY_SERVICE_ID, FASTLY_PURGE_API_KEY } = getEnvVars();

export async function purgeFastlyCache(surrogateKeys: string[]): Promise<void> {
  if (!FASTLY_SERVICE_ID || !FASTLY_PURGE_API_KEY) {
    console.log('Fastly not configured, skipping cache purge');
    return;
  }

  const response = await fetch(`https://api.fastly.com/service/${FASTLY_SERVICE_ID}/purge`, {
    method: 'POST',
    headers: {
      'Fastly-Key': FASTLY_PURGE_API_KEY,
      'Surrogate-Key': surrogateKeys.join(' '),
    },
  });

  if (!response.ok) {
    console.error('Failed to purge Fastly cache:', await response.text());
  }
}

/**
 * Purge all cache keys affected by a drink change.
 * Aligns with existing surrogate key patterns in the codebase.
 */
export async function purgeDrinkCache(drink: { slug: string; tags: string[] }): Promise<void> {
  const keys = ['index', 'all', drink.slug, 'tags', ...drink.tags.map(getSurrogateKeyForTag)];
  await purgeFastlyCache(keys);
}
```

**Step 2: Commit**

```bash
git add app/utils/fastly.server.ts
git commit -m "feat: add fastly cache purge utility"
```

---

### Task 31: Create Slug Utility

**Files:**

- Create: `app/utils/slug.ts`

**Step 1: Create slug utility**

```typescript
export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
```

**Step 2: Commit**

```bash
git add app/utils/slug.ts
git commit -m "feat: add slug generation utility"
```

---

### Task 32: Create Admin Layout Route

**Files:**

- Create: `app/routes/_admin.tsx`

**Step 1: Create admin layout**

Uses composable middleware chain: `userMiddleware` first (auth), then `adminMiddleware` (role
check). Retrieves user via `getUserFromContext` helper.

```typescript
import { Outlet, Link, Form } from 'react-router';
import type { Route } from './+types/_admin';
import {
  userMiddleware,
  adminMiddleware,
  getUserFromContext,
} from '#/app/middleware/auth.server';

export const middleware = [userMiddleware, adminMiddleware];

export async function loader({ context }: Route.LoaderArgs) {
  const user = getUserFromContext(context);
  return { user };
}

export default function AdminLayout({ loaderData }: Route.ComponentProps) {
  const { user } = loaderData;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-4">
            <Link to="/" className="text-gray-600 hover:text-gray-900">
              View Site
            </Link>
            <span className="text-gray-300">|</span>
            <Link
              to="/admin/drinks"
              className="font-semibold text-gray-900"
            >
              Drinks Admin
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{user?.email}</span>
            <Form method="post" action="/logout">
              <button
                type="submit"
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Logout
              </button>
            </Form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add app/routes/_admin.tsx
git commit -m "feat: add admin layout route"
```

---

### Task 33: Create Admin Index Route (Redirect)

**Files:**

- Create: `app/routes/_admin._index.tsx`

**Step 1: Create admin index redirect**

```typescript
import { redirect } from 'react-router';

export function loader() {
  throw redirect('/admin/drinks');
}
```

**Step 2: Commit**

```bash
git add app/routes/_admin._index.tsx
git commit -m "feat: add admin index redirect to drinks"
```

---

### Task 34: Create Admin Drinks List Route and Test

**Files:**

- Create: `app/routes/_admin.drinks._index.tsx`
- Create: `playwright/admin-drinks-list.test.ts`

**Step 1: Write the test first**

```typescript
import { test, expect } from './playwright-utils';

test.describe('Admin Drinks List', () => {
  test('displays list of drinks with actions', async ({ pageAsAdmin }) => {
    await pageAsAdmin.goto('/admin/drinks');

    // Should see heading
    await expect(pageAsAdmin.getByRole('heading', { name: 'Drinks' })).toBeVisible();

    // Should see "Add Drink" button
    await expect(pageAsAdmin.getByRole('link', { name: 'Add Drink' })).toBeVisible();

    // Should see seeded drinks in table
    await expect(pageAsAdmin.getByText('Test Margarita')).toBeVisible();
    await expect(pageAsAdmin.getByText('Test Mojito')).toBeVisible();
    await expect(pageAsAdmin.getByText('Test Old Fashioned')).toBeVisible();

    // Should see Edit links
    const editLinks = pageAsAdmin.getByRole('link', { name: 'Edit' });
    await expect(editLinks).toHaveCount(3);
  });

  test('Add Drink link navigates to new drink form', async ({ pageAsAdmin }) => {
    await pageAsAdmin.goto('/admin/drinks');

    await pageAsAdmin.getByRole('link', { name: 'Add Drink' }).click();

    await expect(pageAsAdmin).toHaveURL('/admin/drinks/new');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm test:e2e playwright/admin-drinks-list.test.ts` Expected: FAIL (route doesn't exist yet)

**Step 3: Create drinks list page**

```typescript
import { Link, Form } from 'react-router';
import type { Route } from './+types/_admin.drinks._index';
import { getAllDrinks } from '#/app/models/drink.server';

export async function loader() {
  const drinks = await getAllDrinks();
  return { drinks };
}

export default function AdminDrinksList({
  loaderData,
}: Route.ComponentProps) {
  const { drinks } = loaderData;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Drinks</h1>
        <Link
          to="/admin/drinks/new"
          className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          Add Drink
        </Link>
      </div>

      <div className="overflow-hidden rounded-lg bg-white shadow">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Title
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Slug
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Calories
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Rank
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {drinks.map((drink) => (
              <tr key={drink.id}>
                <td className="whitespace-nowrap px-6 py-4">
                  <div className="flex items-center">
                    <img
                      src={drink.imageUrl}
                      alt=""
                      className="h-10 w-10 rounded object-cover"
                    />
                    <span className="ml-3 font-medium">{drink.title}</span>
                  </div>
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                  {drink.slug}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                  {drink.calories}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                  {drink.rank}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-right text-sm">
                  <Link
                    to={`/admin/drinks/${drink.slug}/edit`}
                    className="text-blue-600 hover:text-blue-900"
                  >
                    Edit
                  </Link>
                  <Form
                    method="post"
                    action={`/admin/drinks/${drink.slug}/delete`}
                    className="ml-4 inline"
                    onSubmit={(e) => {
                      if (!confirm('Are you sure you want to delete this drink?')) {
                        e.preventDefault();
                      }
                    }}
                  >
                    <button
                      type="submit"
                      className="text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button>
                  </Form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm test:e2e playwright/admin-drinks-list.test.ts` Expected: PASS

**Step 5: Commit**

```bash
git add app/routes/_admin.drinks._index.tsx playwright/admin-drinks-list.test.ts
git commit -m "feat: add admin drinks list page with tests"
```

---

### Task 35: Create Image Crop Component

**Files:**

- Create: `app/admin/image-crop.tsx`

**Step 1: Install react-image-crop**

Run:

```bash
pnpm add react-image-crop
```

**Step 2: Create the image crop component**

```typescript
import { useState, useRef, useCallback } from 'react';
import ReactCrop, {
  type Crop,
  centerCrop,
  makeAspectCrop,
} from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

type ImageCropProps = {
  onCropComplete: (croppedImageBlob: Blob) => void;
};

function centerAspectCrop(
  mediaWidth: number,
  mediaHeight: number,
  aspect: number,
): Crop {
  return centerCrop(
    makeAspectCrop({ unit: '%', width: 90 }, aspect, mediaWidth, mediaHeight),
    mediaWidth,
    mediaHeight,
  );
}

export function ImageCrop({ onCropComplete }: ImageCropProps) {
  const [imgSrc, setImgSrc] = useState('');
  const [crop, setCrop] = useState<Crop>();
  const imgRef = useRef<HTMLImageElement>(null);

  const onSelectFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const reader = new FileReader();
      reader.addEventListener('load', () =>
        setImgSrc(reader.result?.toString() || ''),
      );
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    setCrop(centerAspectCrop(width, height, 1));
  };

  const getCroppedImg = useCallback(async () => {
    const image = imgRef.current;
    if (!image || !crop) return;

    const canvas = document.createElement('canvas');
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    const pixelCrop = {
      x: (crop.x / 100) * image.width * scaleX,
      y: (crop.y / 100) * image.height * scaleY,
      width: (crop.width / 100) * image.width * scaleX,
      height: (crop.height / 100) * image.height * scaleY,
    };

    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      pixelCrop.width,
      pixelCrop.height,
    );

    canvas.toBlob(
      (blob) => {
        if (blob) {
          onCropComplete(blob);
        }
      },
      'image/jpeg',
      0.9,
    );
  }, [crop, onCropComplete]);

  return (
    <div className="space-y-4">
      <input
        type="file"
        accept="image/*"
        onChange={onSelectFile}
        className="block w-full text-sm text-gray-500 file:mr-4 file:rounded file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-blue-700 hover:file:bg-blue-100"
        data-testid="image-upload-input"
      />

      {imgSrc && (
        <>
          <ReactCrop
            crop={crop}
            onChange={(_, percentCrop) => setCrop(percentCrop)}
            aspect={1}
            className="max-h-96"
          >
            <img
              ref={imgRef}
              alt="Crop preview"
              src={imgSrc}
              onLoad={onImageLoad}
            />
          </ReactCrop>

          <button
            type="button"
            onClick={getCroppedImg}
            className="rounded bg-green-600 px-4 py-2 text-white hover:bg-green-700"
            data-testid="confirm-crop-button"
          >
            Confirm Crop
          </button>
        </>
      )}
    </div>
  );
}
```

**Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml app/admin/image-crop.tsx
git commit -m "feat: add image crop component"
```

---

### Task 36: Create Drink Form Component

**Files:**

- Create: `app/admin/drink-form.tsx`

**Step 1: Create the drink form component**

```typescript
import { Form, useNavigation } from 'react-router';
import { useState } from 'react';
import { ImageCrop } from './image-crop';
import type { Drink } from '#/app/db/schema';

type DrinkFormProps = {
  drink?: Drink;
  action: string;
};

export function DrinkForm({ drink, action }: DrinkFormProps) {
  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting';

  const [croppedImage, setCroppedImage] = useState<Blob | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(
    drink?.imageUrl ?? null,
  );

  const handleCropComplete = (blob: Blob) => {
    setCroppedImage(blob);
    setImagePreview(URL.createObjectURL(blob));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    if (croppedImage) {
      e.preventDefault();
      const formData = new FormData(e.currentTarget);

      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(croppedImage);
      });

      formData.set('imageData', base64);

      const response = await fetch(action, {
        method: 'POST',
        body: formData,
      });

      if (response.redirected) {
        window.location.href = response.url;
      }
    }
  };

  return (
    <Form
      method="post"
      action={action}
      onSubmit={handleSubmit}
      className="space-y-6"
    >
      <div>
        <label
          htmlFor="title"
          className="block text-sm font-medium text-gray-700"
        >
          Title
        </label>
        <input
          type="text"
          name="title"
          id="title"
          defaultValue={drink?.title}
          required
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
        />
      </div>

      <div>
        <label
          htmlFor="slug"
          className="block text-sm font-medium text-gray-700"
        >
          Slug
        </label>
        <input
          type="text"
          name="slug"
          id="slug"
          defaultValue={drink?.slug}
          required
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Image</label>
        {imagePreview && (
          <img
            src={imagePreview}
            alt="Preview"
            className="mb-4 h-32 w-32 rounded object-cover"
          />
        )}
        <ImageCrop onCropComplete={handleCropComplete} />
        <input type="hidden" name="imageData" />
        {drink?.imageUrl && !croppedImage && (
          <input type="hidden" name="existingImageUrl" value={drink.imageUrl} />
        )}
      </div>

      <div>
        <label
          htmlFor="ingredients"
          className="block text-sm font-medium text-gray-700"
        >
          Ingredients (one per line)
        </label>
        <textarea
          name="ingredients"
          id="ingredients"
          rows={5}
          defaultValue={drink?.ingredients.join('\n')}
          required
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
        />
      </div>

      <div>
        <label
          htmlFor="calories"
          className="block text-sm font-medium text-gray-700"
        >
          Calories
        </label>
        <input
          type="number"
          name="calories"
          id="calories"
          defaultValue={drink?.calories}
          required
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
        />
      </div>

      <div>
        <label
          htmlFor="tags"
          className="block text-sm font-medium text-gray-700"
        >
          Tags (comma-separated)
        </label>
        <input
          type="text"
          name="tags"
          id="tags"
          defaultValue={drink?.tags.join(', ')}
          required
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
        />
      </div>

      <div>
        <label
          htmlFor="notes"
          className="block text-sm font-medium text-gray-700"
        >
          Notes (markdown)
        </label>
        <textarea
          name="notes"
          id="notes"
          rows={5}
          defaultValue={drink?.notes ?? ''}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
        />
      </div>

      <div>
        <label
          htmlFor="rank"
          className="block text-sm font-medium text-gray-700"
        >
          Rank
        </label>
        <input
          type="number"
          name="rank"
          id="rank"
          defaultValue={drink?.rank ?? 0}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
        />
      </div>

      <div className="flex gap-4">
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {isSubmitting ? 'Saving...' : drink ? 'Update Drink' : 'Create Drink'}
        </button>
      </div>
    </Form>
  );
}
```

**Step 2: Commit**

```bash
git add app/admin/drink-form.tsx
git commit -m "feat: add drink form component"
```

---

### Task 37: Create New Drink Route and Test

**Files:**

- Create: `app/routes/_admin.drinks.new.tsx`
- Create: `playwright/admin-create-drink.test.ts`

**Step 1: Write the test first**

```typescript
import { test, expect } from './playwright-utils';
import path from 'path';

test.describe('Create New Drink', () => {
  test('can create a new drink', async ({ pageAsAdmin }) => {
    await pageAsAdmin.goto('/admin/drinks/new');

    // Fill out the form
    await pageAsAdmin.getByLabel('Title').fill('New Test Drink');
    await pageAsAdmin.getByLabel('Slug').fill('new-test-drink');
    await pageAsAdmin.getByLabel('Ingredients').fill('1 oz vodka\n2 oz juice');
    await pageAsAdmin.getByLabel('Calories').fill('120');
    await pageAsAdmin.getByLabel('Tags').fill('vodka, juice');
    await pageAsAdmin.getByLabel('Notes').fill('A test drink');
    await pageAsAdmin.getByLabel('Rank').fill('5');

    // For image, we'll skip the crop in tests by providing existingImageUrl
    // The form should handle submitting without a new image

    // Submit - since no image was cropped, form submits normally
    await pageAsAdmin.getByRole('button', { name: 'Create Drink' }).click();

    // Should redirect to drinks list
    await expect(pageAsAdmin).toHaveURL('/admin/drinks');

    // New drink should appear in list
    await expect(pageAsAdmin.getByText('New Test Drink')).toBeVisible();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm test:e2e playwright/admin-create-drink.test.ts` Expected: FAIL

**Step 3: Create new drink route**

```typescript
import { redirect } from 'react-router';
import type { Route } from './+types/_admin.drinks.new';
import { createDrink } from '#/app/models/drink.server';
import { uploadImageOrPlaceholder } from '#/app/utils/imagekit.server';
import { generateSlug } from '#/app/utils/slug';
import { DrinkForm } from '#/app/admin/drink-form';
import { purgeSearchCache } from '#/app/routes/_app.search/cache.server';
import { purgeDrinkCache } from '#/app/utils/fastly.server';

export default function NewDrinkPage() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Add New Drink</h1>
      <div className="rounded-lg bg-white p-6 shadow">
        <DrinkForm action="/admin/drinks/new" />
      </div>
    </div>
  );
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();

  const title = formData.get('title') as string;
  const slug = (formData.get('slug') as string) || generateSlug(title);
  const imageData = formData.get('imageData') as string;
  const ingredients = (formData.get('ingredients') as string)
    .split('\n')
    .map((i) => i.trim())
    .filter(Boolean);
  const calories = parseInt(formData.get('calories') as string, 10);
  const tags = (formData.get('tags') as string)
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
  const notes = (formData.get('notes') as string) || null;
  const rank = parseInt(formData.get('rank') as string, 10) || 0;

  let imageUrl: string;
  let imageFileId: string;

  if (imageData && imageData.startsWith('data:')) {
    const base64Data = imageData.split(',')[1];
    const imageBuffer = Buffer.from(base64Data, 'base64');
    const uploadResult = await uploadImageOrPlaceholder(imageBuffer, `${slug}.jpg`);
    imageUrl = uploadResult.url;
    imageFileId = uploadResult.fileId;
  } else {
    // Fallback for tests or when no image provided
    imageUrl = `https://via.placeholder.com/400x400.png?text=${encodeURIComponent(slug)}`;
    imageFileId = 'test-placeholder';
  }

  await createDrink({
    title,
    slug,
    imageUrl,
    imageFileId,
    ingredients,
    calories,
    tags,
    notes,
    rank,
  });

  // Invalidate caches
  try {
    purgeSearchCache();
    await purgeDrinkCache({ slug, tags });
  } catch (e) {
    // Cache invalidation failures shouldn't block the request
    console.error('Cache invalidation failed:', e);
  }

  return redirect('/admin/drinks');
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm test:e2e playwright/admin-create-drink.test.ts` Expected: PASS

**Step 5: Commit**

```bash
git add app/routes/_admin.drinks.new.tsx playwright/admin-create-drink.test.ts
git commit -m "feat: add new drink route with tests"
```

---

### Task 38-42: Remaining Admin Routes (Edit, Delete)

Follow the same TDD pattern for:

- **Task 38**: Edit drink route (`_admin.drinks.$slug.edit.tsx`) with test
- **Task 39**: Delete drink route (`_admin.drinks.$slug.delete.tsx`) with test
- **Task 40-42**: Any remaining admin functionality

Each task follows the pattern:

1. Write failing test
2. Verify test fails
3. Implement feature
4. Verify test passes
5. Commit

---

## Phase 5: Update Public Routes (Tasks 43-49)

For each public route update, follow TDD:

### Task 43: Update Index Page

1. Update smoke test if needed
2. Replace Contentful query with `getAllDrinks()`
3. Verify tests pass
4. Commit

### Task 44: Update Drink Detail Page

Same pattern.

### Task 45: Update Tags Index

Same pattern.

### Task 46: Update Tag Detail Page

Same pattern.

### Task 47: Update Search

Same pattern.

### Task 48: Update Placeholder Images for ImageKit

Update URL transformation logic for ImageKit's format.

### Task 49: Run Full Test Suite

Run: `pnpm test:e2e` Expected: All tests pass

---

## Phase 6: Migration and Cleanup (Tasks 50-56)

### Task 50: Create Migration Script

Create `scripts/migrate-from-contentful.ts` (see original plan for full implementation).

### Task 51: Update Fly.io Configuration

Add volume mount, update to single machine.

### Task 52: Remove Contentful Code

Delete unused files, remove env vars.

### Task 53: Update Types

Clean up type definitions.

### Task 54: Create Fly Volume (Manual)

```bash
fly volumes create drinks_data --region sea --size 1
```

### Task 55: Deploy and Run Migration (Manual)

```bash
fly deploy
fly ssh console
pnpm db:push
pnpm migrate:contentful
```

### Task 56: Add First Admin User (Manual)

Insert your Google email into the users table.

---

## Summary

This plan has **56 tasks** organized into 6 phases:

1. **Phase 1 (Tasks 1-6)**: Database setup
2. **Phase 2 (Tasks 7-13)**: Playwright infrastructure with per-test DB reset
3. **Phase 3 (Tasks 14-26)**: Authentication with test fixtures
4. **Phase 4 (Tasks 27-42)**: Admin UI with TDD
5. **Phase 5 (Tasks 43-49)**: Public route updates with tests
6. **Phase 6 (Tasks 50-56)**: Migration and cleanup

**Testing Strategy:**

- Fresh database seeded before EACH test via `/_/reset-db` endpoint
- `pageAsAdmin` fixture injects session cookie for authenticated tests
- Tests run serially (one at a time) for database isolation
- Test infrastructure set up early so all subsequent features use TDD

**Security Model:**

- Allowlist-based auth: users must be manually added to database before they can log in
- `updateUserOnLogin` only updates existing users, returns null for unknown emails
- Google strategy rejects users not in the allowlist

Each task is designed to be independently executable with clear test verification at each step.
