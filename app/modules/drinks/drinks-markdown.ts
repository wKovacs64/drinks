import { Marked, Renderer } from "marked";

const markdown = new Marked({
  renderer: {
    // https://github.com/markedjs/marked/issues/655#issuecomment-383226346
    link(linkToken) {
      return Renderer.prototype.link
        .call(this, linkToken)
        .replace(/^<a /, '<a target="_blank" rel="noreferrer noopener nofollow" ');
    },
  },
});

export function markdownToHtml(markdownString: string) {
  // TODO: sanitize resulting HTML

  return markdown.parse(markdownString, { async: false });
}
