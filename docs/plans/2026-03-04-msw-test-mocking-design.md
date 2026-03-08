# MSW Test Mocking for External Services

## Problem

Production code has `NODE_ENV === "test"` checks and `"test-placeholder"` sentinels that
short-circuit external service calls. This pollutes production code with test concerns.

## Approach

Replace all test-awareness in production code with HTTP-level MSW interception in the vitest setup.
Production code becomes unconditional — it always makes real HTTP calls — and MSW intercepts them in
test.

## External services to intercept

1. **ImageKit upload API** — return realistic `{ url, fileId }` response
2. **ImageKit delete API** — return 204
3. **ImageKit CDN (`ik.imagekit.io`)** — return a small image buffer for blur placeholder generation
4. **Fastly purge API (`api.fastly.com`)** — return 200 (only fires if env vars are set; handler
   exists as a safety net)

## Production code changes

| File                  | Change                                                                                                                                                                                               |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `imagekit.server.ts`  | Remove both `NODE_ENV === "test"` checks. Merge `uploadImageOrPlaceholder` + `uploadImage` into single `uploadImage`. Remove `NODE_ENV` import.                                                      |
| `mutations.server.ts` | Replace `uploadImageOrPlaceholder` calls with `uploadImage`. Remove `"test-placeholder"` sentinel checks (simplify to `if (existingDrink.imageFileId)`). Remove dead `else` branch in `updateDrink`. |
| `env.server.ts`       | No change (NODE_ENV in schema is fine)                                                                                                                                                               |
| `[_].reset-db.ts`     | No change (legitimate test-only route guard)                                                                                                                                                         |

## Test infrastructure changes

| File                         | Change                                                                                     |
| ---------------------------- | ------------------------------------------------------------------------------------------ |
| `app/test-setup.ts`          | Start MSW server with default handlers before all tests, reset after each, close after all |
| `app/test-handlers.ts` (new) | Default MSW handlers for ImageKit API, ImageKit CDN, and Fastly API                        |

## MSW handler details

- **ImageKit upload** (`POST https://upload.imagekit.io/*`) — return
  `{ url: "https://ik.imagekit.io/test/drinks/<fileName>", fileId: "<uuid>" }`
- **ImageKit delete** (`DELETE https://api.imagekit.io/*`) — return 204
- **ImageKit CDN** (`GET https://ik.imagekit.io/*`) — return a tiny valid WebP image buffer
- **Fastly purge** (`POST https://api.fastly.com/service/*/purge`) — return 200

## Env var strategy

Fastly env vars (`FASTLY_SERVICE_ID`, `FASTLY_PURGE_API_KEY`) stay unpopulated in test. The
existing env var guard in `fastly.server.ts` is a legitimate production concern, not test pollution.
MSW handlers for Fastly exist as a safety net in case someone configures them.
