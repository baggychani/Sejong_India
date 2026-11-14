import { parse } from "parse5";

function attribute(node, name) {
  return node.attrs?.find(attr => attr.name === name)?.value;
}

function find(node, tag) {
  if (node.tagName === tag) return node;
  for (const child of node.childNodes ?? []) {
    const result = find(child, tag);
    if (result) return result;
  }
}

// Extract the actual rendered main instead of maintaining a second content set.
export function readablePage(html, url) {
  // Read like a client that does not execute scripts, including semantic
  // noscript fallbacks. Those fallbacks do not add controls to the normal UI.
  const main = find(parse(html, { scriptingEnabled: false }), "main");
  if (!main) throw new Error(`page has no main content: ${url}`);
  function text(node) {
    if (node.nodeName === "#text") return node.value.replace(/\s+/g, " ");
    if (["script", "style", "svg", "template"].includes(node.tagName)
      || attribute(node, "hidden") !== undefined || attribute(node, "aria-hidden") === "true") return "";
    const inner = (node.childNodes ?? []).map(text).join("").trim();
    const heading = /^h([1-6])$/.exec(node.tagName ?? "");
    if (heading) return `\n\n${"#".repeat(Number(heading[1]))} ${inner.replace(/[ \t]+/g, " ")}\n\n`;
    if (node.tagName === "a") {
      const label = inner || attribute(node, "aria-label") || "";
      const href = attribute(node, "href");
      if (!label || !href) return label;
      const target = new URL(href, url);
      return ["https:", "http:"].includes(target.protocol) ? `[${label}](${target.href}) ` : label;
    }
    if (node.tagName === "img") return attribute(node, "alt") || "";
    if (node.tagName === "br") return "\n";
    if (node.tagName === "li") return `\n- ${inner}\n`;
    if (["summary", "details"].includes(node.tagName)) return `\n\n${inner}\n\n`;
    if (["p", "div", "section", "article", "header", "nav", "ul", "ol", "dl", "dt", "dd", "tr"].includes(node.tagName)) return `\n${inner}\n`;
    return inner ? `${inner} ` : "";
  }
  const body = text(main).replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  if (!body) throw new Error(`page has no readable content: ${url}`);
  return body;
}
