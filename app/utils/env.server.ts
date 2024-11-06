import { z } from 'zod';

// Note: if you add or update any environment variables, you'll probably need to purge the CDN
// cache, otherwise the changes won't take effect until the cache expires.

const envSchema = z.object({
  ALGOLIA_APP_ID: z.string().min(1),
  ALGOLIA_INDEX_NAME: z.string().min(1),
  ALGOLIA_SEARCH_KEY: z.string().min(1),
  CONTENTFUL_ACCESS_TOKEN: z.string().min(1),
  CONTENTFUL_URL: z.string().min(1),
  CONTENTFUL_PREVIEW: z.string().optional(),
  CONTENTFUL_WEBHOOK_TOKEN: z.string().min(1),
  DEPLOYMENT_ENV: z.string().min(1).default('preview'),
  SITE_IMAGE_URL: z.string().min(1),
  SITE_IMAGE_ALT: z.string().min(1),
});

export function getEnvVars() {
  return envSchema.parse(process.env);
}
