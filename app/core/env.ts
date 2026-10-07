import { defaulted, enum_, object, optional, parseSafe, string } from "remix/data-schema";
const requiredString = () => string().refine((value) => value.length > 0, "Required");
const envSchema = object({
  COMMIT_SHA: defaulted(requiredString(), "unknown"),
  DEPLOYMENT_ENV: defaulted(requiredString(), "preview"),
  SITE_IMAGE_URL: requiredString(),
  SITE_IMAGE_ALT: requiredString(),
  DATABASE_URL: defaulted(string(), "./data/drinks.db"),
  IMAGEKIT_PUBLIC_KEY: requiredString(),
  IMAGEKIT_PRIVATE_KEY: requiredString(),
  IMAGEKIT_URL_ENDPOINT: requiredString(),
  GOOGLE_CLIENT_ID: requiredString(),
  GOOGLE_CLIENT_SECRET: requiredString(),
  GOOGLE_REDIRECT_URI: requiredString(),
  SESSION_SECRET: requiredString(),
  NODE_ENV: defaulted(enum_(["development", "production", "test"]), "development"),
  FASTLY_SERVICE_ID: optional(string()),
  FASTLY_PURGE_API_KEY: optional(string()),
});
export function getEnvVars() {
  const result = parseSafe(envSchema, process.env);
  if (result.success) return result.value;
  throw new Error(
    `Missing or invalid environment variables: ${result.issues.map((issue) => issue.path?.filter((segment): segment is string | number => typeof segment === "string" || typeof segment === "number").join(".")).join(", ")}`,
  );
}
