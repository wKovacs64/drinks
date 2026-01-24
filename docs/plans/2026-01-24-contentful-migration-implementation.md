# Contentful Migration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace Contentful CMS with SQLite + ImageKit + in-app admin UI.

**Architecture:** SQLite (strict mode) on Fly volume for data, ImageKit for image storage/CDN, Google OAuth for admin auth, Drizzle ORM for database access. Admin routes built into the existing React Router app.

**Tech Stack:** React Router v7, Drizzle ORM, SQLite, ImageKit, remix-auth, @coji/remix-auth-google, Zod

**Reference Project:** Auth patterns from `/home/justin/dev/work/slhs/hand-hygiene`

---

## Task 1: Add Drizzle and SQLite Dependencies

**Files:**
- Modify: `package.json`

**Step 1: Install dependencies**

Run:
```bash
pnpm add drizzle-orm better-sqlite3 @paralleldrive/cuid2
pnpm add -D drizzle-kit @types/better-sqlite3
```

**Step 2: Verify installation**

Run: `pnpm ls drizzle-orm better-sqlite3`
Expected: Both packages listed with versions

**Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: add drizzle, sqlite, and cuid2 dependencies"
```

---

## Task 2: Create Drizzle Configuration

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

## Task 3: Create Database Schema

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

## Task 4: Create Database Client

**Files:**
- Create: `app/db/client.server.ts`

**Step 1: Create the database client**

```typescript
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';

const DATABASE_URL = process.env.DATABASE_URL || './data/drinks.db';

const sqlite = new Database(DATABASE_URL);
sqlite.pragma('journal_mode = WAL');

export const db = drizzle(sqlite, { schema });
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
git commit -m "feat: add drizzle database client"
```

---

## Task 5: Generate and Run Initial Migration

**Files:**
- Create: `drizzle/` migrations directory (generated)

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

Run: `pnpm db:generate`
Expected: Migration files created in `drizzle/` directory

**Step 3: Create local database and apply migration**

Run: `pnpm db:push`
Expected: Tables created in local SQLite database

**Step 4: Verify tables exist**

Run: `sqlite3 ./data/drinks.db ".schema"`
Expected: Shows users and drinks table schemas with STRICT not visible (SQLite limitation in drizzle, but the schema enforces types)

**Step 5: Commit**

```bash
git add package.json drizzle/
git commit -m "feat: add database migrations"
```

---

## Task 6: Update Environment Variables Schema

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
IMAGEKIT_PUBLIC_KEY: z.string(),
IMAGEKIT_PRIVATE_KEY: z.string(),
IMAGEKIT_URL_ENDPOINT: z.string(),

// Google OAuth
GOOGLE_CLIENT_ID: z.string(),
GOOGLE_CLIENT_SECRET: z.string(),
GOOGLE_REDIRECT_URI: z.string(),

// Session
SESSION_SECRET: z.string(),
```

**Step 3: Mark Contentful variables as optional (for migration period)**

Change Contentful variables to `.optional()` so app can run without them after migration.

**Step 4: Commit**

```bash
git add app/utils/env.server.ts
git commit -m "feat: add env vars for database, imagekit, and auth"
```

---

## Task 7: Add Auth Dependencies

**Files:**
- Modify: `package.json`

**Step 1: Install auth dependencies**

Run:
```bash
pnpm add remix-auth @coji/remix-auth-google
```

**Step 2: Verify installation**

Run: `pnpm ls remix-auth @coji/remix-auth-google`
Expected: Both packages listed

**Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: add remix-auth dependencies"
```

---

## Task 8: Create Auth Types

**Files:**
- Create: `app/auth/types.ts`

**Step 1: Create auth types file**

Reference: `/home/justin/dev/work/slhs/hand-hygiene/app/auth/types.ts`

```typescript
import type { User } from '~/db/schema';

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

## Task 9: Create Session Storage

**Files:**
- Create: `app/auth/session.server.ts`

**Step 1: Create session storage**

Reference: `/home/justin/dev/work/slhs/hand-hygiene/app/auth/session.server.ts`

```typescript
import {
  createCookie,
  createCookieSessionStorage,
} from 'react-router';
import { env } from '~/utils/env.server';
import type { AuthenticatedUser } from './types';

const sessionCookie = createCookie('__session', {
  httpOnly: true,
  path: '/',
  sameSite: 'lax',
  secrets: [env.SESSION_SECRET],
  secure: process.env.NODE_ENV === 'production',
});

type SessionData = {
  user?: AuthenticatedUser;
  returnTo?: string;
};

type SessionFlashData = {
  toast?: { kind: 'success' | 'error'; message: string };
};

const cookieSessionStorage = createCookieSessionStorage<
  SessionData,
  SessionFlashData
>({
  cookie: sessionCookie,
});

export const { getSession, commitSession, destroySession } =
  cookieSessionStorage;
```

**Step 2: Commit**

```bash
git add app/auth/session.server.ts
git commit -m "feat: add session storage for auth"
```

---

## Task 10: Create Auth Utilities

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

## Task 11: Create User Model Functions

**Files:**
- Create: `app/models/user.server.ts`

**Step 1: Create user model**

```typescript
import { eq } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';
import { db } from '~/db/client.server';
import { users, type User } from '~/db/schema';

export async function getUserById(id: User['id']): Promise<User | undefined> {
  return db.query.users.findFirst({
    where: eq(users.id, id),
  });
}

export async function getUserByEmail(
  email: User['email'],
): Promise<User | undefined> {
  return db.query.users.findFirst({
    where: eq(users.email, email),
  });
}

export async function upsertUserOnLogin({
  email,
  name,
  avatarUrl,
}: {
  email: string;
  name: string | null;
  avatarUrl: string | null;
}): Promise<User> {
  const existingUser = await getUserByEmail(email);

  if (existingUser) {
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

  const [newUser] = await db
    .insert(users)
    .values({
      id: createId(),
      email,
      name,
      avatarUrl,
      role: 'admin',
    })
    .returning();

  return newUser;
}
```

**Step 2: Commit**

```bash
git add app/models/user.server.ts
git commit -m "feat: add user model functions"
```

---

## Task 12: Create Authenticator

**Files:**
- Create: `app/auth/auth.server.ts`

**Step 1: Create authenticator**

Reference: `/home/justin/dev/work/slhs/hand-hygiene/app/auth/auth.server.ts`

```typescript
import { Authenticator } from 'remix-auth';
import { GoogleStrategy } from '@coji/remix-auth-google';
import { env } from '~/utils/env.server';
import { upsertUserOnLogin } from '~/models/user.server';
import type { AuthenticatedUser } from './types';

export const authenticator = new Authenticator<AuthenticatedUser>();

const googleStrategy = new GoogleStrategy(
  {
    clientId: env.GOOGLE_CLIENT_ID,
    clientSecret: env.GOOGLE_CLIENT_SECRET,
    redirectURI: env.GOOGLE_REDIRECT_URI,
  },
  async ({ profile }) => {
    const email = profile.emails?.[0]?.value;
    if (!email) {
      throw new Error('No email found in Google profile');
    }

    const user = await upsertUserOnLogin({
      email,
      name: profile.displayName ?? null,
      avatarUrl: profile.photos?.[0]?.value ?? null,
    });

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      role: user.role,
    };
  },
);

authenticator.use(googleStrategy, 'google');
```

**Step 2: Commit**

```bash
git add app/auth/auth.server.ts
git commit -m "feat: add google oauth authenticator"
```

---

## Task 13: Create Auth Middleware

**Files:**
- Create: `app/middleware/auth.server.ts`

**Step 1: Create auth middleware**

Reference: `/home/justin/dev/work/slhs/hand-hygiene/app/middleware/authorization.server.ts`

```typescript
import { redirect } from 'react-router';
import type { unstable_MiddlewareFunction as MiddlewareFunction } from 'react-router';
import { getSession, commitSession } from '~/auth/session.server';
import { getUserById } from '~/models/user.server';
import { createReturnToUrl, safeRedirectTo } from '~/auth/utils.server';
import type { AuthenticatedUser } from '~/auth/types';

declare module 'react-router' {
  interface AppLoadContext {
    user?: AuthenticatedUser;
  }
}

export const adminMiddleware: MiddlewareFunction<Response> = async (
  { request, context },
  next,
) => {
  const session = await getSession(request.headers.get('Cookie'));
  const sessionUser = session.get('user');

  if (!sessionUser) {
    session.set('returnTo', createReturnToUrl(request));
    throw redirect('/login', {
      headers: { 'Set-Cookie': await commitSession(session) },
    });
  }

  const user = await getUserById(sessionUser.id);

  if (!user || user.role !== 'admin') {
    throw redirect('/unauthorized');
  }

  context.user = {
    id: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
    role: user.role,
  };

  return next();
};
```

**Step 2: Commit**

```bash
git add app/middleware/auth.server.ts
git commit -m "feat: add admin auth middleware"
```

---

## Task 14: Create Login Route

**Files:**
- Create: `app/routes/login.tsx`

**Step 1: Create login route**

Reference: `/home/justin/dev/work/slhs/hand-hygiene/app/routes/login.tsx`

```typescript
import type { Route } from './+types/login';
import { authenticator } from '~/auth/auth.server';

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

## Task 15: Create Google OAuth Callback Route

**Files:**
- Create: `app/routes/auth.google.callback.tsx`

**Step 1: Create callback route**

Reference: `/home/justin/dev/work/slhs/hand-hygiene/app/routes/auth.okta.callback.tsx`

```typescript
import { redirect } from 'react-router';
import type { Route } from './+types/auth.google.callback';
import { authenticator } from '~/auth/auth.server';
import { getSession, commitSession } from '~/auth/session.server';
import { safeRedirectTo } from '~/auth/utils.server';

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

## Task 16: Create Logout Route

**Files:**
- Create: `app/routes/logout.tsx`

**Step 1: Create logout route**

Reference: `/home/justin/dev/work/slhs/hand-hygiene/app/routes/logout.tsx`

```typescript
import { redirect } from 'react-router';
import type { Route } from './+types/logout';
import { getSession, destroySession } from '~/auth/session.server';

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

## Task 17: Create Login Failed Route

**Files:**
- Create: `app/routes/login-failed.tsx`

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

**Step 2: Commit**

```bash
git add app/routes/login-failed.tsx
git commit -m "feat: add login failed page"
```

---

## Task 18: Create Unauthorized Route

**Files:**
- Create: `app/routes/unauthorized.tsx`

**Step 1: Create unauthorized page**

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

**Step 2: Commit**

```bash
git add app/routes/unauthorized.tsx
git commit -m "feat: add unauthorized page"
```

---

## Task 19: Add ImageKit Dependencies

**Files:**
- Modify: `package.json`

**Step 1: Install ImageKit SDK**

Run:
```bash
pnpm add imagekit
```

**Step 2: Verify installation**

Run: `pnpm ls imagekit`
Expected: Package listed

**Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: add imagekit sdk"
```

---

## Task 20: Create ImageKit Client

**Files:**
- Create: `app/utils/imagekit.server.ts`

**Step 1: Create ImageKit client**

```typescript
import ImageKit from 'imagekit';
import { env } from './env.server';

export const imagekit = new ImageKit({
  publicKey: env.IMAGEKIT_PUBLIC_KEY,
  privateKey: env.IMAGEKIT_PRIVATE_KEY,
  urlEndpoint: env.IMAGEKIT_URL_ENDPOINT,
});

export async function uploadImage(
  file: Buffer,
  fileName: string,
): Promise<string> {
  const response = await imagekit.upload({
    file,
    fileName,
    folder: '/drinks',
  });

  return response.url;
}

export async function deleteImage(fileId: string): Promise<void> {
  await imagekit.deleteFile(fileId);
}
```

**Step 2: Commit**

```bash
git add app/utils/imagekit.server.ts
git commit -m "feat: add imagekit client"
```

---

## Task 21: Create Drink Model Functions

**Files:**
- Create: `app/models/drink.server.ts`

**Step 1: Create drink model**

```typescript
import { eq, desc, sql } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';
import { db } from '~/db/client.server';
import { drinks, type Drink, type NewDrink } from '~/db/schema';

export async function getAllDrinks(): Promise<Drink[]> {
  return db.query.drinks.findMany({
    orderBy: [desc(drinks.rank), desc(drinks.createdAt)],
  });
}

export async function getDrinkBySlug(
  slug: string,
): Promise<Drink | undefined> {
  return db.query.drinks.findFirst({
    where: eq(drinks.slug, slug),
  });
}

export async function getDrinksByTag(tag: string): Promise<Drink[]> {
  return db.query.drinks.findMany({
    where: sql`json_each(${drinks.tags}) LIKE ${`%${tag}%`}`,
    orderBy: [desc(drinks.rank), desc(drinks.createdAt)],
  });
}

export async function getAllTags(): Promise<string[]> {
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
  await db.delete(drinks).where(eq(drinks.id, id));
}
```

**Step 2: Commit**

```bash
git add app/models/drink.server.ts
git commit -m "feat: add drink model functions"
```

---

## Task 22: Create Slug Utility

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

## Task 23: Create Admin Layout Route

**Files:**
- Create: `app/routes/_admin.tsx`

**Step 1: Create admin layout**

```typescript
import { Outlet, Link, Form } from 'react-router';
import type { Route } from './+types/_admin';
import { adminMiddleware } from '~/middleware/auth.server';

export const middleware = [adminMiddleware];

export async function loader({ context }: Route.LoaderArgs) {
  return { user: context.user };
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

## Task 24: Create Admin Index Route (Redirect)

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

## Task 25: Create Admin Drinks List Route

**Files:**
- Create: `app/routes/_admin.drinks._index.tsx`

**Step 1: Create drinks list page**

```typescript
import { Link } from 'react-router';
import type { Route } from './+types/_admin.drinks._index';
import { getAllDrinks } from '~/models/drink.server';

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

**Step 2: Commit**

```bash
git add app/routes/_admin.drinks._index.tsx
git commit -m "feat: add admin drinks list page"
```

---

## Task 26: Create Image Crop Component

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
import ReactCrop, { type Crop, centerCrop, makeAspectCrop } from 'react-image-crop';
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
    makeAspectCrop(
      { unit: '%', width: 90 },
      aspect,
      mediaWidth,
      mediaHeight,
    ),
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

## Task 27: Create Drink Form Component

**Files:**
- Create: `app/admin/drink-form.tsx`

**Step 1: Create the drink form component**

```typescript
import { Form, useNavigation } from 'react-router';
import { useState } from 'react';
import { ImageCrop } from './image-crop';
import type { Drink } from '~/db/schema';

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
        <label className="block text-sm font-medium text-gray-700">
          Image
        </label>
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

## Task 28: Create New Drink Route

**Files:**
- Create: `app/routes/_admin.drinks.new.tsx`

**Step 1: Create new drink route**

```typescript
import { redirect } from 'react-router';
import type { Route } from './+types/_admin.drinks.new';
import { createDrink } from '~/models/drink.server';
import { uploadImage } from '~/utils/imagekit.server';
import { generateSlug } from '~/utils/slug';
import { DrinkForm } from '~/admin/drink-form';
import { purgeSearchCache } from '~/routes/_app.search/cache.server';
import { purgeFastlyCache } from '~/utils/fastly.server';

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

  // Upload image to ImageKit
  const base64Data = imageData.split(',')[1];
  const imageBuffer = Buffer.from(base64Data, 'base64');
  const imageUrl = await uploadImage(imageBuffer, `${slug}.jpg`);

  await createDrink({
    title,
    slug,
    imageUrl,
    ingredients,
    calories,
    tags,
    notes,
    rank,
  });

  // Invalidate caches
  purgeSearchCache();
  await purgeFastlyCache(['index', 'all', 'tags']);

  return redirect('/admin/drinks');
}
```

**Step 2: Commit**

```bash
git add app/routes/_admin.drinks.new.tsx
git commit -m "feat: add new drink route"
```

---

## Task 29: Create Fastly Utility

**Files:**
- Create: `app/utils/fastly.server.ts`

**Step 1: Create Fastly utility**

Extract and adapt from existing webhook handler.

```typescript
import { env } from './env.server';

export async function purgeFastlyCache(
  surrogateKeys: string[],
): Promise<void> {
  if (!env.FASTLY_SERVICE_ID || !env.FASTLY_PURGE_API_KEY) {
    console.log('Fastly not configured, skipping cache purge');
    return;
  }

  const response = await fetch(
    `https://api.fastly.com/service/${env.FASTLY_SERVICE_ID}/purge`,
    {
      method: 'POST',
      headers: {
        'Fastly-Key': env.FASTLY_PURGE_API_KEY,
        'Surrogate-Key': surrogateKeys.join(' '),
      },
    },
  );

  if (!response.ok) {
    console.error('Failed to purge Fastly cache:', await response.text());
  }
}
```

**Step 2: Commit**

```bash
git add app/utils/fastly.server.ts
git commit -m "feat: add fastly cache purge utility"
```

---

## Task 30: Create Edit Drink Route

**Files:**
- Create: `app/routes/_admin.drinks.$slug.edit.tsx`

**Step 1: Create edit drink route**

```typescript
import { redirect } from 'react-router';
import type { Route } from './+types/_admin.drinks.$slug.edit';
import { getDrinkBySlug, updateDrink } from '~/models/drink.server';
import { uploadImage } from '~/utils/imagekit.server';
import { DrinkForm } from '~/admin/drink-form';
import { purgeSearchCache } from '~/routes/_app.search/cache.server';
import { purgeFastlyCache } from '~/utils/fastly.server';

export async function loader({ params }: Route.LoaderArgs) {
  const drink = await getDrinkBySlug(params.slug);
  if (!drink) {
    throw new Response('Not found', { status: 404 });
  }
  return { drink };
}

export default function EditDrinkPage({ loaderData }: Route.ComponentProps) {
  const { drink } = loaderData;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Edit: {drink.title}</h1>
      <div className="rounded-lg bg-white p-6 shadow">
        <DrinkForm
          drink={drink}
          action={`/admin/drinks/${drink.slug}/edit`}
        />
      </div>
    </div>
  );
}

export async function action({ request, params }: Route.ActionArgs) {
  const formData = await request.formData();
  const drink = await getDrinkBySlug(params.slug);

  if (!drink) {
    throw new Response('Not found', { status: 404 });
  }

  const title = formData.get('title') as string;
  const slug = formData.get('slug') as string;
  const imageData = formData.get('imageData') as string;
  const existingImageUrl = formData.get('existingImageUrl') as string;
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

  let imageUrl = existingImageUrl;

  // Upload new image if provided
  if (imageData && imageData.startsWith('data:')) {
    const base64Data = imageData.split(',')[1];
    const imageBuffer = Buffer.from(base64Data, 'base64');
    imageUrl = await uploadImage(imageBuffer, `${slug}.jpg`);
  }

  await updateDrink(drink.id, {
    title,
    slug,
    imageUrl,
    ingredients,
    calories,
    tags,
    notes,
    rank,
  });

  // Invalidate caches
  purgeSearchCache();
  await purgeFastlyCache(['index', 'all', 'tags', params.slug, slug]);

  return redirect('/admin/drinks');
}
```

**Step 2: Commit**

```bash
git add app/routes/_admin.drinks.$slug.edit.tsx
git commit -m "feat: add edit drink route"
```

---

## Task 31: Add Delete Drink Action

**Files:**
- Create: `app/routes/_admin.drinks.$slug.delete.tsx`

**Step 1: Create delete route**

```typescript
import { redirect } from 'react-router';
import type { Route } from './+types/_admin.drinks.$slug.delete';
import { getDrinkBySlug, deleteDrink } from '~/models/drink.server';
import { purgeSearchCache } from '~/routes/_app.search/cache.server';
import { purgeFastlyCache } from '~/utils/fastly.server';

export async function action({ params }: Route.ActionArgs) {
  const drink = await getDrinkBySlug(params.slug);

  if (!drink) {
    throw new Response('Not found', { status: 404 });
  }

  await deleteDrink(drink.id);

  // Invalidate caches
  purgeSearchCache();
  await purgeFastlyCache(['index', 'all', 'tags', params.slug]);

  return redirect('/admin/drinks');
}
```

**Step 2: Update drinks list to include delete button**

In `app/routes/_admin.drinks._index.tsx`, add delete form to the actions column:

```typescript
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
```

**Step 3: Commit**

```bash
git add app/routes/_admin.drinks.$slug.delete.tsx app/routes/_admin.drinks._index.tsx
git commit -m "feat: add delete drink functionality"
```

---

## Task 32: Update Public Routes - Index Page

**Files:**
- Modify: `app/routes/_app._index.tsx`

**Step 1: Read current index route**

Read the file to understand current structure.

**Step 2: Replace Contentful query with Drizzle query**

Replace the loader to use `getAllDrinks()` from the drink model. Keep the same response structure and caching headers.

**Step 3: Update imports**

Remove Contentful-related imports, add drink model import.

**Step 4: Commit**

```bash
git add app/routes/_app._index.tsx
git commit -m "feat: update index route to use sqlite"
```

---

## Task 33: Update Public Routes - Drink Detail Page

**Files:**
- Modify: `app/routes/_app.$slug.tsx`

**Step 1: Read current detail route**

Read the file to understand current structure.

**Step 2: Replace Contentful query with Drizzle query**

Replace the loader to use `getDrinkBySlug()` from the drink model.

**Step 3: Update imports**

Remove Contentful-related imports, add drink model import.

**Step 4: Commit**

```bash
git add app/routes/_app.$slug.tsx
git commit -m "feat: update drink detail route to use sqlite"
```

---

## Task 34: Update Public Routes - Tags Index

**Files:**
- Modify: `app/routes/_app.tags._index.tsx`

**Step 1: Read current tags index route**

Read the file to understand current structure.

**Step 2: Replace Contentful query with Drizzle query**

Replace the loader to use `getAllTags()` from the drink model.

**Step 3: Commit**

```bash
git add app/routes/_app.tags._index.tsx
git commit -m "feat: update tags index route to use sqlite"
```

---

## Task 35: Update Public Routes - Tag Detail Page

**Files:**
- Modify: `app/routes/_app.tags.$tag.tsx`

**Step 1: Read current tag detail route**

Read the file to understand current structure.

**Step 2: Replace Contentful query with Drizzle query**

Replace the loader to use `getDrinksByTag()` from the drink model.

**Step 3: Commit**

```bash
git add app/routes/_app.tags.$tag.tsx
git commit -m "feat: update tag detail route to use sqlite"
```

---

## Task 36: Update Search to Use SQLite

**Files:**
- Modify: `app/routes/_app.search/minisearch.server.ts`

**Step 1: Read current search implementation**

Read the file to understand current structure.

**Step 2: Replace Contentful fetch with Drizzle query**

Update `getOrCreateSearchIndex()` to use `getAllDrinks()` instead of fetching from Contentful.

**Step 3: Commit**

```bash
git add app/routes/_app.search/minisearch.server.ts
git commit -m "feat: update search to use sqlite"
```

---

## Task 37: Update Placeholder Image Generation

**Files:**
- Modify: `app/utils/placeholder-images.server.ts`

**Step 1: Read current implementation**

Read the file to understand how blur placeholders are generated.

**Step 2: Update to work with ImageKit URLs**

ImageKit supports URL-based transformations. Update the transformation logic to use ImageKit's URL format for generating small blur placeholders.

**Step 3: Commit**

```bash
git add app/utils/placeholder-images.server.ts
git commit -m "feat: update placeholder images for imagekit"
```

---

## Task 38: Create Migration Script

**Files:**
- Create: `scripts/migrate-from-contentful.ts`

**Step 1: Create the migration script**

```typescript
import 'dotenv/config';
import { db } from '../app/db/client.server';
import { drinks } from '../app/db/schema';
import { createId } from '@paralleldrive/cuid2';

const CONTENTFUL_URL = process.env.CONTENTFUL_URL!;
const CONTENTFUL_ACCESS_TOKEN = process.env.CONTENTFUL_ACCESS_TOKEN!;
const IMAGEKIT_PUBLIC_KEY = process.env.IMAGEKIT_PUBLIC_KEY!;
const IMAGEKIT_PRIVATE_KEY = process.env.IMAGEKIT_PRIVATE_KEY!;
const IMAGEKIT_URL_ENDPOINT = process.env.IMAGEKIT_URL_ENDPOINT!;

async function fetchAllDrinksFromContentful() {
  const query = `
    query {
      drinkCollection(limit: 200, order: [rank_DESC, sys_firstPublishedAt_DESC]) {
        items {
          title
          slug
          image { url }
          ingredients
          calories
          tags
          notes
          rank
        }
      }
    }
  `;

  const response = await fetch(CONTENTFUL_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${CONTENTFUL_ACCESS_TOKEN}`,
    },
    body: JSON.stringify({ query }),
  });

  const json = await response.json();
  return json.data.drinkCollection.items;
}

async function downloadImage(url: string): Promise<Buffer> {
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function uploadToImageKit(
  buffer: Buffer,
  fileName: string,
): Promise<string> {
  const ImageKit = (await import('imagekit')).default;
  const imagekit = new ImageKit({
    publicKey: IMAGEKIT_PUBLIC_KEY,
    privateKey: IMAGEKIT_PRIVATE_KEY,
    urlEndpoint: IMAGEKIT_URL_ENDPOINT,
  });

  const response = await imagekit.upload({
    file: buffer,
    fileName,
    folder: '/drinks',
  });

  return response.url;
}

async function migrate() {
  console.log('Fetching drinks from Contentful...');
  const contentfulDrinks = await fetchAllDrinksFromContentful();
  console.log(`Found ${contentfulDrinks.length} drinks`);

  for (const drink of contentfulDrinks) {
    console.log(`Processing: ${drink.title}`);

    // Check if already migrated
    const existing = await db.query.drinks.findFirst({
      where: (d, { eq }) => eq(d.slug, drink.slug),
    });

    if (existing) {
      console.log(`  Skipping (already exists)`);
      continue;
    }

    // Download and re-upload image
    console.log(`  Downloading image...`);
    const imageBuffer = await downloadImage(drink.image.url);

    console.log(`  Uploading to ImageKit...`);
    const newImageUrl = await uploadToImageKit(
      imageBuffer,
      `${drink.slug}.jpg`,
    );

    // Insert into database
    console.log(`  Inserting into database...`);
    await db.insert(drinks).values({
      id: createId(),
      slug: drink.slug,
      title: drink.title,
      imageUrl: newImageUrl,
      calories: drink.calories,
      ingredients: drink.ingredients,
      tags: drink.tags || [],
      notes: drink.notes || null,
      rank: drink.rank || 0,
    });

    console.log(`  Done!`);
  }

  console.log('Migration complete!');
}

migrate().catch(console.error);
```

**Step 2: Add script to package.json**

```json
{
  "migrate:contentful": "tsx scripts/migrate-from-contentful.ts"
}
```

**Step 3: Install tsx for running TypeScript scripts**

Run: `pnpm add -D tsx`

**Step 4: Commit**

```bash
git add scripts/migrate-from-contentful.ts package.json pnpm-lock.yaml
git commit -m "feat: add contentful migration script"
```

---

## Task 39: Update Fly.io Configuration

**Files:**
- Modify: `fly.toml`

**Step 1: Read current fly.toml**

Read the file to understand current configuration.

**Step 2: Add volume mount configuration**

Add to fly.toml:
```toml
[mounts]
  source = "drinks_data"
  destination = "/data"
```

**Step 3: Update to single machine**

Ensure only one machine is configured (remove any multi-region settings).

**Step 4: Commit**

```bash
git add fly.toml
git commit -m "chore: configure fly.io for sqlite volume"
```

---

## Task 40: Remove Contentful Code

**Files:**
- Delete: `app/utils/graphql.server.ts`
- Delete: `app/routes/[_].content-change/` directory
- Modify: `app/utils/env.server.ts` (remove Contentful variables)
- Modify: `app/types.ts` (if needed)

**Step 1: Delete Contentful files**

Run:
```bash
rm app/utils/graphql.server.ts
rm -rf app/routes/[_].content-change
```

**Step 2: Remove Contentful env vars from schema**

Remove from env.server.ts:
- CONTENTFUL_ACCESS_TOKEN
- CONTENTFUL_URL
- CONTENTFUL_PREVIEW
- CONTENTFUL_WEBHOOK_TOKEN

**Step 3: Clean up any remaining Contentful imports**

Search for remaining Contentful references and remove them.

**Step 4: Commit**

```bash
git add -A
git commit -m "chore: remove contentful integration code"
```

---

## Task 41: Update Types

**Files:**
- Modify: `app/types.ts`

**Step 1: Read current types file**

Read the file to understand current type definitions.

**Step 2: Update or remove Contentful-specific types**

The `Drink` type should now come from the Drizzle schema. Update any remaining types to match the new data structure.

**Step 3: Commit**

```bash
git add app/types.ts
git commit -m "chore: update types for sqlite schema"
```

---

## Task 42: Create Fly Volume (Manual Step)

**This is a manual step to be run before deployment.**

**Step 1: Create the volume**

Run:
```bash
fly volumes create drinks_data --region sea --size 1
```

**Step 2: Verify volume created**

Run: `fly volumes list`
Expected: Shows drinks_data volume

---

## Task 43: Deploy and Run Migration (Manual Steps)

**Step 1: Deploy the updated app**

Run: `fly deploy`

**Step 2: SSH into the Fly machine**

Run: `fly ssh console`

**Step 3: Run database migrations**

Run: `cd /app && pnpm db:push`

**Step 4: Run the Contentful migration script**

Run: `pnpm migrate:contentful`

**Step 5: Verify data**

Run: `sqlite3 /data/drinks.db "SELECT COUNT(*) FROM drinks;"`
Expected: Shows ~50 drinks

**Step 6: Exit and test the app**

Visit the deployed URL and verify drinks are loading.

---

## Task 44: Add First Admin User (Manual Step)

**Step 1: SSH into the Fly machine**

Run: `fly ssh console`

**Step 2: Insert admin user**

Replace with your Google account email:
```bash
sqlite3 /data/drinks.db "INSERT INTO users (id, email, name, role, created_at, updated_at) VALUES ('$(openssl rand -hex 12)', 'your-email@gmail.com', 'Your Name', 'admin', datetime('now'), datetime('now'));"
```

**Step 3: Verify user created**

Run: `sqlite3 /data/drinks.db "SELECT * FROM users;"`

---

## Summary

This plan has 44 tasks covering:
1. **Tasks 1-6**: Database setup (Drizzle, SQLite, schema, migrations)
2. **Tasks 7-18**: Authentication (Google OAuth, sessions, middleware, routes)
3. **Tasks 19-31**: Admin UI (ImageKit, forms, CRUD routes)
4. **Tasks 32-37**: Public route updates (switch from Contentful to SQLite)
5. **Tasks 38-41**: Migration and cleanup
6. **Tasks 42-44**: Deployment and final setup

Each task is designed to be independently executable with clear inputs/outputs and commit points.
