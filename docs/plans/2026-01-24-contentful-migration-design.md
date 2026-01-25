# Contentful Migration Design

Replace Contentful CMS with a self-managed solution built into the drinks app.

## Background

The drinks app currently uses Contentful as a headless CMS for storing and managing drink data. However, only a fraction of Contentful's features are used:

- Upload an image to the media library
- Create a drink entity with fields (title, slug, ingredients, calories, tags, notes, rank)
- Link the image to the drink

For a site with ~50 drinks, a handful of visitors, and a single curator, Contentful adds unnecessary complexity. The goal is to simplify the stack while gaining more control over the data and admin experience.

## Goals

- **Simplicity**: Fewer external services, unified stack
- **Control**: Own the data, customize the admin experience
- **Portability**: Avoid vendor lock-in where practical
- **Preserve functionality**: Search, CDN caching, image optimization all continue working

## Non-Goals

- Multi-tenant or multi-user collaboration (for now)
- Complex role-based permissions (for now)
- Video or non-image media support
- Fancy image manipulation (filters, effects)

## Architecture

### Stack Overview

| Component | Current | New |
|-----------|---------|-----|
| Database | Contentful (GraphQL API) | SQLite (strict mode) on Fly volume |
| ORM | N/A | Drizzle |
| Images | Contentful Media Library | ImageKit |
| Image rendering | unpic | unpic (unchanged) |
| Auth | None | Google OAuth via remix-auth |
| Admin UI | Contentful dashboard | In-app `/admin` routes |
| CDN | Fastly | Fastly (unchanged) |
| Search | MiniSearch | MiniSearch (unchanged) |
| Hosting | Fly.io (2 regions) | Fly.io (1 region + volume) |

### Data Flow

**Public visitors:**
1. Request hits Fastly CDN
2. Cache miss → request forwarded to Fly.io app
3. App queries SQLite via Drizzle
4. Images served via ImageKit URLs (rendered with unpic)
5. Response cached at CDN with surrogate keys

**Admin users:**
1. Visit protected route → redirect to `/login` if no session
2. `/login` initiates Google OAuth (single provider, auto-redirect)
3. Google redirects to `/auth/google/callback`
4. On success, upsert user profile (name, avatar_url), create session
5. Redirect to original destination (via `returnTo` cookie) or `/admin`
6. Admin performs CRUD operations via forms
7. On save: write to SQLite, purge Fastly surrogate keys, invalidate MiniSearch cache

## Database Schema

```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,              -- cuid2
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'admin',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
) STRICT;

CREATE TABLE drinks (
  id TEXT PRIMARY KEY,              -- cuid2
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  image_url TEXT NOT NULL,
  image_file_id TEXT NOT NULL,       -- ImageKit fileId for deletion
  calories INTEGER NOT NULL,
  ingredients TEXT NOT NULL,        -- JSON array of strings
  tags TEXT NOT NULL,               -- JSON array of strings
  notes TEXT,                       -- Optional markdown
  rank INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
) STRICT;
```

**Notes:**
- `ingredients` and `tags` are stored as JSON arrays in TEXT columns. SQLite has solid JSON functions for querying, and Drizzle supports JSON columns well.
- `role` is a simple string (`'admin'`) for now, extensible to other roles later.
- Using cuid2 for IDs (shorter than UUIDs, URL-friendly).

## Authentication

### Flow

1. User visits protected route
2. Auth middleware checks for valid session
3. No session → store current path in `returnTo` cookie, redirect to `/login`
4. `/login` (single provider) → automatically initiates Google OAuth
5. Google authenticates user, redirects to `/auth/google/callback`
6. Callback handler:
   - Validates OAuth response
   - Looks up user by email in `users` table
   - If exists with admin role: update profile data (name, avatar_url), create session
   - If not found or not admin: show "not authorized" page
   - **Important:** Users must be manually added to the database before they can log in (allowlist model)
7. Redirect to `returnTo` path (or `/admin` fallback), clear `returnTo` cookie
8. `/logout` clears session, redirects to `/`

### Future Extensibility

- If additional OAuth providers are added, `/login` becomes a provider selection page
- Role field on users table supports adding contributor/editor roles later
- No code changes needed for basic role expansion

### Libraries

- `remix-auth` - Session and strategy management (compatible with React Router v7)
- `@coji/remix-auth-google` - Updated Google OAuth strategy

### Routes

- `/login` - Initiates auth (auto-redirects to Google for now)
- `/auth/google/callback` - OAuth callback handler
- `/logout` - Session destruction

## Admin UI

### Routes

- `/admin` - Redirects to `/admin/drinks` (future: dashboard with stats)
- `/admin/drinks` - List all drinks with edit/delete actions
- `/admin/drinks/new` - Create new drink
- `/admin/drinks/[slug]/edit` - Edit existing drink

### Drink Form

**Fields:**
- Title (text input)
- Slug (text input, auto-generated from title, editable)
- Image (upload with crop UI)
- Ingredients (multi-line or repeatable fields)
- Calories (number input)
- Tags (multi-select or comma-separated)
- Notes (textarea, markdown)
- Rank (number input, for manual sort order)

### Image Upload Flow

1. User selects or drops an image file
2. Crop UI appears - user drags a square selection over the image to set focal area
3. All displayed images in the app are square; source images may have other aspect ratios
4. On form submit:
   - Client-side crop via Canvas API produces square image
   - Cropped image uploaded to ImageKit via their Upload API
   - ImageKit returns URL
   - URL stored in `image_url` column
5. No client-side compression (ImageKit handles optimization for delivery)
6. When editing: if image is replaced, old image can optionally be deleted from ImageKit

### After Save

1. Write drink to SQLite
2. Purge relevant Fastly surrogate keys (direct API call, no webhook needed)
3. Invalidate MiniSearch cache
4. Redirect to `/admin/drinks`

## Image Handling

### Provider: ImageKit

Selected for:
- Clear, simple free tier (20GB bandwidth, 3GB storage/month)
- Good ease-of-use ratings
- 200+ global edge locations
- unpic support

### Delivery

- Images stored in ImageKit
- URLs follow ImageKit's format
- unpic transforms URLs for responsive images (multiple sizes, formats)
- Blur data URLs generated at render time (same as current approach)

### Upload

- Direct upload to ImageKit from the server (not client-side)
- Use ImageKit's Upload API with private key (server-side only)
- Store returned URL in database

## CDN Caching

Fastly caching remains in place. The invalidation logic simplifies:

**Current (Contentful):**
- Contentful publishes content
- Webhook fires to `/_/content-change`
- App validates webhook, purges Fastly keys

**New:**
- Admin saves drink
- App directly calls Fastly purge API
- No webhook handler needed

Surrogate key strategy aligns with existing codebase patterns:
- `index` - home page listing
- `all` - search and other "all drinks" queries
- `[slug]` - individual drink pages
- `tags` - tag index page
- `[tag]` - individual tag pages (use `getSurrogateKeyForTag()` which replaces spaces with underscores)

On drink create/update/delete, purge: `index`, `all`, `[slug]`, `tags`, and all `[tag]` keys for the drink's tags.

## Migration

### One-Time Script

A migration script will import existing drinks from Contentful:

1. Fetch all drinks from Contentful GraphQL API
2. For each drink:
   - Download image from Contentful CDN
   - Upload to ImageKit
   - Insert drink record into SQLite with new ImageKit URL
3. Log progress throughout
4. Verify counts match

### Execution

- Deploy app with migration script included
- SSH into Fly machine: `fly ssh console`
- Run script: `node scripts/migrate-from-contentful.js`
- Script connects to local SQLite file on volume

### Idempotency

- Skip drinks that already exist (by slug)
- Safe to re-run if interrupted

### Post-Migration Cleanup

Remove from codebase:
- `app/utils/graphql.server.ts`
- `app/routes/[_].content-change/` (webhook handler)
- Contentful-related types
- Environment variables: `CONTENTFUL_ACCESS_TOKEN`, `CONTENTFUL_URL`, `CONTENTFUL_PREVIEW`, `CONTENTFUL_WEBHOOK_TOKEN`

## Fly.io Configuration

### Current
- 2 machines across regions (for zero-downtime deploys)

### New
- 1 machine with attached volume for SQLite
- Volume persists across deploys
- Fly's rolling deploy handles continuity (starts new machine, health checks, moves traffic, stops old machine, reattaches volume)

### Volume Setup

```bash
fly volumes create drinks_data --region sea --size 1
```

Update `fly.toml` to mount:
```toml
[mounts]
  source = "drinks_data"
  destination = "/data"
```

SQLite file lives at `/data/drinks.db`. Set `DATABASE_URL=/data/drinks.db` in production.

### Deployment Notes

- Fly volumes attach to a single machine; during rolling deploys, the old machine releases the volume before the new one attaches
- Brief interruption during deploys is acceptable for this scale
- Health checks ensure traffic switches only after new machine is ready

### Backup Strategy

- Fly provides volume snapshots: `fly volumes snapshots list`
- Create manual snapshots before migrations: `fly volumes snapshots create <volume-id>`
- Consider automated daily snapshots via Fly's snapshot scheduler
- For additional safety, periodic backup: `fly ssh sftp get /data/drinks.db ./backup.db`

## Implementation Order

1. **Database setup**: Add Drizzle, define schema, configure SQLite with Fly volume
2. **Authentication**: Google OAuth, session management, protected route middleware
3. **Admin routes**: CRUD UI for drinks, image upload with crop
4. **Migration**: Write and run script to import from Contentful
5. **Switch public routes**: Update loaders to read from SQLite instead of Contentful
6. **Cleanup**: Remove Contentful code and env vars
7. **Fly config**: Scale to single machine with volume

## Open Questions

None at this time. Ready for implementation planning.

## Decision Log

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Database | SQLite (strict mode) | Simple, portable, free. Strict mode addresses type affinity concerns. |
| ORM | Drizzle | Lightweight, TypeScript-first, excellent SQLite support. |
| Image provider | ImageKit | Simpler pricing than Cloudinary, generous free tier, unpic support. |
| Image crop | Client-side, on upload | Simpler than storing focal point metadata. Can't adjust later without re-upload, but acceptable trade-off. |
| Compression | None (pre-upload) | ImageKit handles optimization. Storage/bandwidth not a concern at this scale. |
| Auth | Google OAuth | Simple, no password management. Extensible to other providers. |
| Permissions | Admin-only for now | YAGNI. Role field allows future expansion. |
| CDN | Keep Fastly | Already working. Provides edge delivery and origin protection. |
| Fly regions | Single machine | Multi-region adds SQLite replication complexity. CDN handles edge delivery. Single machine sufficient for this scale. |
