import { readFileSync } from "node:fs";

export const cardUri = "ui://drinks/card-v6.html";
const script = readFileSync("public/mcp-card.js", "utf8");

function inlineFontsSoSandboxNeedsNoAssetCorsOrRelativeUrls(css: string) {
  let inlined = css;

  for (const weight of [300, 400]) {
    const filename = `source-sans-3-latin-${weight}-normal.woff2`;
    const font = readFileSync(`public/fonts/${filename}`).toString("base64");
    inlined = inlined.replaceAll(`./fonts/${filename}`, `data:font/woff2;base64,${font}`);
  }

  return inlined;
}

const styles = inlineFontsSoSandboxNeedsNoAssetCorsOrRelativeUrls(
  readFileSync("public/app.css", "utf8"),
);

export const cardHtml = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>drinks.fyi</title>
  <style>${styles}</style>
</head>
<body class="m-0 p-2 font-sans font-light">
  <main id="card" class="@container mx-auto flex max-w-xl flex-col gap-4"></main>
  <script type="module">${script.replaceAll("</script", "<\\/script")}</script>
</body>
</html>`;
