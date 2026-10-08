import { clientEntry, ref, type Handle } from "remix/component";

const prefetched = new Set<string>();

function observeLinks(anchors: Iterable<HTMLAnchorElement>, signal: AbortSignal) {
  const observer = new IntersectionObserver((entries) => {
    if (signal.aborted) return;
    for (const entry of entries) {
      if (!entry.isIntersecting || !(entry.target instanceof HTMLAnchorElement)) continue;
      const anchor = entry.target;
      observer.unobserve(anchor);
      const href = anchor.href;
      if (new URL(href).origin !== window.location.origin || prefetched.has(href)) continue;
      const image = anchor.querySelector("img");
      if (image && !image.complete) {
        const observeAfterPhoto = () => {
          if (!signal.aborted && anchor.isConnected) observer.observe(anchor);
        };
        image.addEventListener("load", observeAfterPhoto, { signal, once: true });
        image.addEventListener("error", observeAfterPhoto, { signal, once: true });
        continue;
      }
      prefetched.add(href);
      const preload = document.createElement("link");
      preload.rel = "prefetch";
      preload.href = href;
      preload.as = "document";
      document.head.append(preload);
    }
  });
  for (const anchor of anchors) observer.observe(anchor);
  signal.addEventListener("abort", () => observer.disconnect(), { once: true });
}

const viewportPrefetch = ref<HTMLSpanElement>((element, signal) => {
  const anchor = element.parentElement;
  if (anchor instanceof HTMLAnchorElement) observeLinks([anchor], signal);
});

const viewportPrefetchGroup = ref<HTMLSpanElement>((element, signal) => {
  const anchors = element.parentElement?.querySelectorAll<HTMLAnchorElement>(":scope > a");
  if (anchors) observeLinks(anchors, signal);
});

// Hydrate the marker alone so gallery photos and card markup remain server-rendered.
export const ViewportPrefetch = clientEntry(
  import.meta.url,
  function ViewportPrefetch(handle: Handle<{ href: string }>) {
    return () => (
      <>
        <span key={handle.props.href} hidden aria-hidden mix={viewportPrefetch} />
      </>
    );
  },
);

// A list needs one hydrated marker and observer, regardless of its Drink count.
export const ViewportPrefetchGroup = clientEntry(
  import.meta.url,
  function ViewportPrefetchGroup(handle: Handle<{ hrefs: string[] }>) {
    return () => (
      <>
        <span key={handle.props.hrefs.join("|")} hidden aria-hidden mix={viewportPrefetchGroup} />
      </>
    );
  },
);
