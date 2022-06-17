import { marked } from 'marked';

export function markdownToHtml(markdownString: string) {
  // https://github.com/markedjs/marked/issues/655#issuecomment-383226346
  const renderer = new marked.Renderer();
  const linkRenderer = renderer.link;
  renderer.link = (href, title, text) => {
    const html = linkRenderer.call(renderer, href, title, text);
    return html.replace(
      /^<a /,
      '<a target="_blank" rel="noreferrer noopener nofollow" ',
    );
  };

  // TODO: sanitize resulting HTML
  return marked(markdownString, { renderer });
}
