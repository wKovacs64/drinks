import { Marked } from "marked";
import sanitizeHtml from "sanitize-html";

const markdown = new Marked();

const markedOutputAllowlist = {
  allowedTags: [
    "p",
    "br",
    "hr",
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
    a: sanitizeHtml.simpleTransform("a", {
      target: "_blank",
      rel: "noreferrer noopener nofollow",
    }),
  },
} satisfies sanitizeHtml.IOptions;

const shallowestNoteHeadingLevel = 2;

function headingTagsNestedUnderPageTitle(html: string) {
  const levels = Array.from(html.matchAll(/<h([1-6])[\s>]/g), (match) => Number(match[1]));
  const shift = shallowestNoteHeadingLevel - Math.min(...levels);

  return Object.fromEntries(
    [1, 2, 3, 4, 5, 6].map((level) => [`h${level}`, `h${Math.min(level + shift, 6)}`]),
  );
}

export function markdownToAllowlistedHtml(markdownString: string) {
  const html = markdown.parse(markdownString, { async: false });

  return sanitizeHtml(html, {
    ...markedOutputAllowlist,
    transformTags: {
      ...markedOutputAllowlist.transformTags,
      ...headingTagsNestedUnderPageTitle(html),
    },
  });
}
