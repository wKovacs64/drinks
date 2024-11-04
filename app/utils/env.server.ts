import { z } from 'zod';

const envSchema = z.object({
  ALGOLIA_APP_ID: z.string().min(1),
  ALGOLIA_INDEX_NAME: z.string().min(1),
  ALGOLIA_SEARCH_KEY: z.string().min(1),
  CONTENTFUL_ACCESS_TOKEN: z.string().min(1),
  CONTENTFUL_URL: z.string().min(1),
  CONTENTFUL_PREVIEW: z.string().optional(),
  CONTENTFUL_WEBHOOK_TOKEN: z.string().min(1),
  DATABASE_FILE_PATH: z.string().min(1),
  FASTLY_API_TOKEN: z.string().optional(),
  FASTLY_SERVICE_ID: z.string().optional(),
  SITE_IMAGE_URL: z.string().min(1),
  SITE_IMAGE_ALT: z.string().min(1),
});

export function getEnvVars() {
  return envSchema.parse(process.env);
}
