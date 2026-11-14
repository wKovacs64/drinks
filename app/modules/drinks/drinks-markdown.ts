import { Marked } from "marked";
import sanitizeHtml from "sanitize-html";

const markdown = new Marked();

/** Elements and attributes marked emits for notes markdown; everything else is dropped. */
const sanitizeOptions = {
  allowedTags: [
    "p",
    "br",
    "hr",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "blockquote",
    "ul",
    "ol",
    "li",
    "input",
    "strong",
    "em",
    "del",
    "code",
    "pre",
    "a",
    "img",
    "table",
    "thead",
    "tbody",
    "tr",
    "th",
    "td",
  ],
  allowedAttributes: {
    a: ["href", "title", "target", "rel"],
    img: ["src", "alt", "title"],
    input: [{ name: "type", multiple: false, values: ["checkbox"] }, "checked", "disabled"],
    ol: ["start"],
    th: ["align"],
    td: ["align"],
  },
  allowedClasses: { code: ["language-*"] },
  allowedSchemes: ["http", "https", "mailto"],
  transformTags: {
    // Every link, markdown or raw HTML, opens in a new tab without referrer or ranking credit.
    a: sanitizeHtml.simpleTransform("a", {
      target: "_blank",
      rel: "noreferrer noopener nofollow",
    }),
  },
} satisfies sanitizeHtml.IOptions;

export function markdownToHtml(markdownString: string) {
  return sanitizeHtml(markdown.parse(markdownString, { async: false }), sanitizeOptions);
}
