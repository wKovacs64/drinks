const PRELOADS_PER_TASK_SO_INPUT_RUNS_BETWEEN = 4;

const preloads = document.getElementById("client-module-preloads");

if (preloads instanceof HTMLTemplateElement) {
  const insertBatch = () => {
    if (!preloads.isConnected) return;
    const batch = document.createDocumentFragment();

    for (
      let index = 0;
      index < PRELOADS_PER_TASK_SO_INPUT_RUNS_BETWEEN && preloads.content.firstChild;
      index++
    ) {
      batch.appendChild(preloads.content.firstChild);
    }

    preloads.before(batch);

    if (preloads.content.firstChild) setTimeout(insertBatch, 0);
    else preloads.remove();
  };

  requestAnimationFrame(() => {
    requestAnimationFrame(insertBatch);
  });
}
