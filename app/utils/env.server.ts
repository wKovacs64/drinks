import { z } from 'zod';

// Note: if you add or update any environment variables, you'll probably need to purge the CDN
// cache, otherwise the changes won't take effect until the cache expires.

const envSchema = z.object({
  COMMIT_SHA: z.string().min(1).default('unknown'),
  DEPLOYMENT_ENV: z.string().min(1).default('preview'),
  SITE_IMAGE_URL: z.string().min(1),
  SITE_IMAGE_ALT: z.string().min(1),

  // Database
  DATABASE_URL: z.string().default('./data/drinks.db'),

  // ImageKit
  IMAGEKIT_PUBLIC_KEY: z.string().min(1),
  IMAGEKIT_PRIVATE_KEY: z.string().min(1),
  IMAGEKIT_URL_ENDPOINT: z.string().min(1),

  // Google OAuth
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  GOOGLE_REDIRECT_URI: z.string().min(1),

  // Session
  SESSION_SECRET: z.string().min(1),

  // Node environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // CDN
  FASTLY_SERVICE_ID: z.string().optional(),
  FASTLY_PURGE_API_KEY: z.string().optional(),
});

export function getEnvVars() {
  try {
    return envSchema.parse(process.env);
  } catch (parseError) {
    if (parseError instanceof z.ZodError) {
      const offendingEnvVars = Object.keys(z.flattenError(parseError).fieldErrors).join(', ');
      const envVarError = new Error(
        `Missing or invalid environment variables: ${offendingEnvVars}`,
      );
      envVarError.stack = undefined;
      throw envVarError;
    }
    throw parseError;
  }
}
