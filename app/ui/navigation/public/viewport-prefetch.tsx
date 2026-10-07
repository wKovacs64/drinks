import { clientEntry, ref, type Handle } from "remix/component";

const prefetched = new Set<string>();

const viewportPrefetch = ref<HTMLSpanElement>((element, signal) => {
  const anchor = element.parentElement;
  if (!(anchor instanceof HTMLAnchorElement)) return;
  const observer = new IntersectionObserver((entries) => {
    if (signal.aborted || !entries.some((entry) => entry.isIntersecting)) return;
    observer.unobserve(anchor);
    const href = anchor.href;
    if (new URL(href).origin !== window.location.origin || prefetched.has(href)) return;
    const image = anchor.querySelector("img");
    if (image && !image.complete) {
      const observeAfterPhoto = () => {
        if (!signal.aborted && anchor.isConnected) observer.observe(anchor);
      };
      image.addEventListener("load", observeAfterPhoto, { signal, once: true });
      image.addEventListener("error", observeAfterPhoto, { signal, once: true });
      return;
    }
    prefetched.add(href);
    const preload = document.createElement("link");
    preload.rel = "prefetch";
    preload.href = href;
    preload.as = "document";
    document.head.append(preload);
  });
  observer.observe(anchor);
  signal.addEventListener("abort", () => observer.disconnect(), { once: true });
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
