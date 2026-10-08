// The server installs a complete initial import map before this module runs. Test
// one additional mapping in this document instead of booting a hidden iframe.
export const supportsMultipleImportMaps = (async () => {
  const script = document.createElement("script");
  let url: string | undefined;
  try {
    url = URL.createObjectURL(new Blob([""], { type: "text/javascript" }));
    const specifier = `remix-import-map-probe:${url}`;
    script.type = "importmap";
    script.nonce = document.querySelector<HTMLScriptElement>("script[nonce]")?.nonce ?? "";
    script.text = JSON.stringify({ imports: { [specifier]: url } });
    document.head.appendChild(script);
    await import(specifier);
    return true;
  } catch {
    // Unsupported maps or a blocked probe retain Remix's compatibility loader.
    return false;
  } finally {
    script.remove();
    if (url) URL.revokeObjectURL(url);
  }
})();
