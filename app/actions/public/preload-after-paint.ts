// Speculative imports should not compete with the first visible server-rendered page.
const preloads = document.getElementById("client-module-preloads");
if (preloads instanceof HTMLTemplateElement) {
  const insertBatch = () => {
    if (!preloads.isConnected) return;
    const batch = document.createDocumentFragment();
    for (let index = 0; index < 4 && preloads.content.firstChild; index++) {
      batch.appendChild(preloads.content.firstChild);
    }
    preloads.before(batch);
    // Inserting the whole graph starts module processing in one long task, even
    // with low fetch priority. Let input and rendering run between small batches.
    if (preloads.content.firstChild) setTimeout(insertBatch, 0);
    else preloads.remove();
  };
  requestAnimationFrame(() => {
    requestAnimationFrame(insertBatch);
  });
}
