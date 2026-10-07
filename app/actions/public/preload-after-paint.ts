// Speculative imports should not compete with the first visible server-rendered page.
const preloads = document.getElementById("client-module-preloads");
if (preloads instanceof HTMLTemplateElement) {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => preloads.replaceWith(preloads.content));
  });
}
