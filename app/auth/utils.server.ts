export function safeRedirectTo(
  to: FormDataEntryValue | string | null | undefined,
  defaultRedirect = '/',
): string {
  if (!to || typeof to !== 'string') {
    return defaultRedirect;
  }

  if (!to.startsWith('/') || to.startsWith('//')) {
    return defaultRedirect;
  }

  return to;
}

export function createReturnToUrl(request: Request): string {
  const url = new URL(request.url);
  return url.pathname + url.search;
}
