import { cacheHeader } from "pretty-cache-header";
import { getEnvVars } from "#/app/core/env.server";

export async function loader() {
  const { DEPLOYMENT_ENV } = getEnvVars();
  const body = `User-agent: *\n${DEPLOYMENT_ENV === "prod" ? "Allow: /" : "Disallow: /"}`;

  return new Response(body, {
    headers: {
      "Cache-Control": cacheHeader({ public: true, maxAge: "1hr" }),
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}
