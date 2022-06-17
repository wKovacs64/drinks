interface LoaderEnv {
  ALGOLIA_APP_ID: string;
  ALGOLIA_INDEX_NAME: string;
  ALGOLIA_SEARCH_KEY: string;
  CONTENTFUL_ACCESS_TOKEN: string;
  CONTENTFUL_URL: string;
  CONTENTFUL_PREVIEW?: string;
  SITE_IMAGE_URL: string;
  SITE_IMAGE_ALT: string;
}

export function getEnvVars() {
  const {
    ALGOLIA_APP_ID,
    ALGOLIA_INDEX_NAME,
    ALGOLIA_SEARCH_KEY,
    CONTENTFUL_ACCESS_TOKEN,
    CONTENTFUL_URL,
    CONTENTFUL_PREVIEW,
    SITE_IMAGE_URL,
    SITE_IMAGE_ALT,
  } = process.env;

  if (!ALGOLIA_APP_ID) throw new Error(`ALGOLIA_APP_ID is not set`);
  if (!ALGOLIA_INDEX_NAME) throw new Error(`ALGOLIA_INDEX_NAME is not set`);
  if (!ALGOLIA_SEARCH_KEY) throw new Error(`ALGOLIA_SEARCH_KEY is not set`);
  if (!CONTENTFUL_URL) throw new Error(`CONTENTFUL_URL is not set`);
  if (!CONTENTFUL_ACCESS_TOKEN) {
    throw new Error(`CONTENTFUL_ACCESS_TOKEN is not set`);
  }
  if (!SITE_IMAGE_URL) throw new Error(`SITE_IMAGE_URL is not set`);
  if (!SITE_IMAGE_ALT) throw new Error(`SITE_IMAGE_ALT is not set`);

  const loaderEnv: LoaderEnv = {
    ALGOLIA_APP_ID,
    ALGOLIA_INDEX_NAME,
    ALGOLIA_SEARCH_KEY,
    CONTENTFUL_ACCESS_TOKEN,
    CONTENTFUL_URL,
    CONTENTFUL_PREVIEW,
    SITE_IMAGE_URL,
    SITE_IMAGE_ALT,
  };

  return loaderEnv;
}
