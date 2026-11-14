import assert from "node:assert/strict";
import { readablePage } from "./readable-html.mjs";

const base = new URL(process.argv[2] ?? "https://baggychani.github.io/Sejong_India/");
if (!base.pathname.endsWith("/")) base.pathname += "/";
const agents = {
  browser: "Mozilla/5.0",
  "ChatGPT-User": "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; ChatGPT-User/1.0; +https://openai.com/bot",
  "OAI-SearchBot": "Mozilla/5.0 (compatible; OAI-SearchBot/1.4; +https://openai.com/searchbot)",
};
for (const [name, agent] of Object.entries(agents)) {
  const url = new URL("bharat/languages/hindi", base);
  const response = await fetch(url, { headers: { "User-Agent": agent }, signal: AbortSignal.timeout(15000) });
  assert.equal(response.status, 200, `${name}: HTTP error`);
  assert(response.headers.get("content-type")?.includes("text/html"));
  const html = await response.text();
  const text = readablePage(html, response.url);
  for (const word of ["힌디어", "हिन्दी", "Hindi"]) assert(text.includes(word), `${name}: missing ${word}`);
  assert(!/noindex|none/i.test(response.headers.get("x-robots-tag") ?? ""));
  console.log(`PASS ${name}: HTTP 200; HTML text: ${text.replace(/\n+/g, " ")}`);
}
console.log("This verifies HTTP delivery, not a successful request from ChatGPT's own retrieval service.");
