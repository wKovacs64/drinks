export const publicHeaders = {
  "Cache-Control":
    "public, max-age=30, s-maxage=31536000, stale-while-revalidate=600, stale-if-error=86400",
  "Surrogate-Key": "all",
};
export const notFoundHeaders = {
  "Cache-Control": "public, max-age=30, s-maxage=60, must-revalidate",
  "Surrogate-Key": "all",
};
