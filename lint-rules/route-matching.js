const comparisonOperators = new Set(["===", "!==", "==", "!="]);
const prefixMethods = new Set(["startsWith", "endsWith", "includes", "match"]);

function unwrap(node) {
  return node?.type === "ChainExpression" ? node.expression : node;
}

function isPathname(candidate) {
  const node = unwrap(candidate);
  if (node?.type === "Identifier") return node.name === "pathname";
  return (
    node?.type === "MemberExpression" &&
    !node.computed &&
    node.property.type === "Identifier" &&
    node.property.name === "pathname"
  );
}

export default {
  meta: {
    name: "route-matching",
  },
  rules: {
    "no-raw-pathname-match": {
      meta: {
        type: "problem",
        docs: {
          description: "require route-pattern matchers instead of raw pathname string matching",
        },
        schema: [],
        messages: {
          useMatcher:
            "Match URLs with remix/route-pattern matchers (see app/web/route-matching.ts). Raw pathname strings skip the router's decoding, so /%61dmin bypasses an /admin check.",
        },
      },
      create(context) {
        return {
          BinaryExpression(node) {
            if (
              comparisonOperators.has(node.operator) &&
              (isPathname(node.left) || isPathname(node.right))
            )
              context.report({ node, messageId: "useMatcher" });
          },
          CallExpression(node) {
            const callee = unwrap(node.callee);
            if (callee?.type !== "MemberExpression" || callee.property.type !== "Identifier")
              return;
            const method = callee.property.name;
            const matchesPathname =
              (prefixMethods.has(method) && isPathname(callee.object)) ||
              ((method === "includes" || method === "test") && isPathname(node.arguments[0]));
            if (matchesPathname) context.report({ node, messageId: "useMatcher" });
          },
          SwitchStatement(node) {
            if (isPathname(node.discriminant)) context.report({ node, messageId: "useMatcher" });
          },
        };
      },
    },
  },
};
