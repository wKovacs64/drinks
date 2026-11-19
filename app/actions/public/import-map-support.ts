async function probeOneMoreMappingInThisDocumentWithoutIframe() {
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
    return false;
  } finally {
    script.remove();

    if (url) URL.revokeObjectURL(url);
  }
}

export const supportsMultipleImportMaps = probeOneMoreMappingInThisDocumentWithoutIframe();
