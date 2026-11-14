import assert from "node:assert/strict";
import { globSync, readFileSync } from "node:fs";
import { verifyContentContract } from "./content-contract.mjs";
import { readablePage } from "./readable-html.mjs";

// Inject proposed content in memory; never change users' source data for tests.
export function verifyContentContractGuards(outDir) {
  const institutes = JSON.parse(readFileSync("data/content/institutes.json", "utf8"));
  const extraField = [...institutes, { futurePublicNote: "new public information" }];
  assert.throws(() => verifyContentContract(outDir, { datasets: { institutes: extraField } }), /unclassified content field: .*futurePublicNote/);
  assert.throws(() => verifyContentContract(outDir, { datasets: { "new-content-kind": [] } }), /unclassified content dataset: new-content-kind.json/);
  if (institutes.length) {
    const changedAddress = structuredClone(institutes);
    changedAddress[0].address = "RULE_ADDRESS_MUST_BE_RENDERED_0f71";
    assert.throws(() => verifyContentContract(outDir, { datasets: { institutes: changedAddress } }), /public field missing.*address/);
  }

  // Do not depend on a particular book remaining in the user's library.
  const existingFile = globSync("content/library/*.md")[0];
  if (existingFile) {
    const file = existingFile.replace(/\\/g, "/");
    const raw = readFileSync(existingFile, "utf8");
    const extraMetadata = raw.replace(/^---\r?\n/, "---\nfuturePublicNote: new public information\n");
    assert.throws(() => verifyContentContract(outDir, { markdown: { [file]: extraMetadata } }), /unclassified content field: .*futurePublicNote/);
    assert.throws(() => verifyContentContract(outDir, { markdown: { [file]: raw + "\n\nRULE_BODY_MUST_BE_RENDERED_0f71\n" } }), /Markdown body missing from HTML\/text/);
  }

  const text = readablePage('<main><details><summary>첸나이2</summary><a href="/source">출처</a></details><details><summary>바라사트</summary><p>주소</p></details></main>', "https://example.com/");
  assert.match(text, /출처\]\([^)]+\)\n\n바라사트/, "adjacent detail records must stay separated in text");
  console.log("PASS: new datasets/JSON fields/Markdown fields and unrendered addresses/bodies are rejected; adjacent details remain separated.");
}
