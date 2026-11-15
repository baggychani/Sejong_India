// Rebuild the public dataset from official C-01 workbooks, never rounded web percentages.
// Download URLs and SHA-256 hashes are retained in the generated source records.
// Usage: node scripts/import-religions.mjs <path-to-SheetJS-module>
// Workbooks: data/cache/religion-c01-india.xls and religion-c01-<catalog-id>.xls.
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { createHash } from "node:crypto";

const require = createRequire(import.meta.url);
const XLSX = require(process.argv[2] ? resolve(process.argv[2]) : "xlsx");
const definitions = [
  ["india", 11361, 14474, "00", "India"],
  ["bihar", 11366, 14479, "10", "Bihar"],
  ["karnataka", 11378, 14491, "29", "Karnataka"],
  ["maharashtra", 11382, 14495, "27", "Maharashtra"],
  ["manipur", 11383, 14496, "14", "Manipur"],
  ["tamil-nadu", 11392, 14505, "33", "Tamil Nadu"],
  ["west-bengal", 11396, 14509, "19", "West Bengal"],
];
const tables = new Map();
const sources = definitions.map(([id, catalog, download, state, label]) => {
  const bytes = readFileSync(`data/cache/religion-c01-${id === "india" ? id : catalog}.xls`);
  const workbook = XLSX.read(bytes, { type: "buffer" });
  tables.set(id, XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1 }));
  return { id, title: `C-01: Population by religious community, ${label} - 2011`,
    url: `https://censusindia.gov.in/nada/index.php/catalog/${catalog}`,
    downloadUrl: `https://censusindia.gov.in/nada/index.php/catalog/${catalog}/download/${download}/DDW${state}C-01%20MDDS.XLS`,
    sha256: createHash("sha256").update(bytes).digest("hex"), accessed: "2026-11-15" };
});
const groups = [
  { id: "hindu", name: "힌두교", en: "Hindu" },
  { id: "muslim", name: "이슬람교", en: "Muslim" },
  { id: "christian", name: "기독교", en: "Christian" },
  { id: "sikh", name: "시크교", en: "Sikh" },
  { id: "buddhist", name: "불교", en: "Buddhist" },
  { id: "jain", name: "자이나교", en: "Jain" },
  { id: "other", name: "기타 종교·신앙", en: "Other religions and persuasions (incl.Unclassified Sect.)" },
  { id: "not-stated", name: "종교 미기재", en: "Religion not stated" },
];
function profile(id, placeIds, area, sourceId, predicate, note = "") {
  const rows = tables.get(sourceId).filter(predicate);
  assert(rows.length, `missing C-01 selection: ${id}`);
  const population = rows.reduce((sum, row) => sum + row[7], 0);
  const religions = groups.map((group, i) => ({ id: group.id, population: rows.reduce((sum, row) => sum + row[10 + i * 3], 0) }));
  assert.equal(religions.reduce((sum, row) => sum + row.population, 0), population, `C-01 categories must exhaust population: ${id}`);
  return { id, placeIds, area, sourceId, sourceAreas: rows.map(row => row[5].trim()),
    sourceRows: rows.map(row => ({ state: row[1], district: row[2], subdistrict: row[3], town: row[4], residence: row[6] })),
    note, population, religions };
}
const stateCodes = { "IN-JK": "01", "IN-HP": "02", "IN-PB": "03", "IN-CH": "04", "IN-UT": "05", "IN-HR": "06", "IN-DL": "07", "IN-RJ": "08", "IN-UP": "09", "IN-BR": "10", "IN-SK": "11", "IN-AR": "12", "IN-NL": "13", "IN-MN": "14", "IN-MZ": "15", "IN-TR": "16", "IN-ML": "17", "IN-AS": "18", "IN-WB": "19", "IN-JH": "20", "IN-OR": "21", "IN-CT": "22", "IN-MP": "23", "IN-GJ": "24", "IN-DH": ["25", "26"], "IN-MH": "27", "IN-AP": "28", "IN-KA": "29", "IN-GA": "30", "IN-LD": "31", "IN-KL": "32", "IN-TN": "33", "IN-PY": "34", "IN-AN": "35" };
const motherTongues = JSON.parse(readFileSync("data/content/mother-tongues.json", "utf8"));
const profiles = [profile("india", [], "인도 전국", "india", row => row[1] === "00" && row[6] === "Total")];
for (const original of motherTongues.profiles.filter(row => row.placeIds.some(id => id.startsWith("IN-")))) {
  const stateId = original.placeIds[0];
  const codes = [stateCodes[stateId]].flat();
  assert(codes.every(Boolean), `unknown state: ${stateId}`);
  const ids = [...original.placeIds];
  let note = "";
  if (stateId === "IN-AP") { ids.push("IN-TG"); note = "2011년 분리 전 안드라프라데시주 전체로, 현재 텔랑가나를 포함한 광역 참고치입니다. 현재 두 주의 개별 비율이 아닙니다."; }
  if (stateId === "IN-JK") { ids.push("IN-LA"); note = "2011년 분리 전 잠무 카슈미르주 전체로, 현재 라다크를 포함한 광역 참고치입니다. 현재 두 연방직할지의 개별 비율이 아닙니다."; }
  if (stateId === "IN-DH") note = "2011년 다만 디우와 다드라 나가르하벨리의 인원수를 합산해 계산했습니다.";
  if (stateId === "IN-DL") ids.push("delhi-kcci");
  profiles.push(profile(stateId, ids, original.area, "india", row => codes.includes(row[1]) && row[2] === "000" && row[6] === "Total", note));
}
const town = (code, name) => row => row[4] === code && row[5]?.trim() === name && row[6] === "Urban";
profiles.push(
  profile("bengaluru", ["bengaluru-cmr", "Bengaluru"], "벵갈루루 시역 및 외곽 확장지", "karnataka", town("803162", "BBMP (M Corp. + OG)")),
  profile("chennai", ["chennai-inko", "Chennai"], "첸나이 시역", "tamil-nadu", town("803339", "Chennai (M Corp.)")),
  profile("kancheepuram", ["chennai-vit"], "옛 칸치푸람구 전체 (광역 참고)", "tamil-nadu", row => row[2] === "604" && row[3] === "00000" && row[4] === "000000" && row[6] === "Total", "2011년 옛 칸치푸람 district 전체입니다. 학당 주변 동네나 현재 첸갈파투 district만의 비율이 아닙니다."),
  profile("pune", ["pune-ikc", "Pune"], "푸네 시역", "maharashtra", town("802814", "Pune (M Corp.)")),
  profile("patna", ["patna-anc", "Patna"], "파트나 시역 및 외곽 확장지", "bihar", town("801373", "Patna (M Corp. + OG)")),
  profile("barasat-i", ["barasat-wbsu"], "바라사트 I 블록", "west-bengal", row => row[2] === "337" && row[3] === "02325" && row[4] === "000000" && row[6] === "Total"),
  profile("imphal", ["imphal-dm", "Imphal"], "임팔 시역 및 외곽 확장지", "manipur", town("801487", "Imphal (MCI + OG)")),
  profile("barasat", ["Barasat"], "바라사트 시역", "west-bengal", town("801707", "Barasat (M)")),
);
writeFileSync("data/content/religions.json", JSON.stringify({ year: 2011,
  title: "종교별 인구 구성",
  description: "2011년 인도 인구조사 C-01. 지역 주민 전체의 종교별 인구 구성이며, 현재 비율이나 세종학당 수강생의 구성은 아닙니다.",
  methodology: "비율은 각 분류의 원자료 인원수를 해당 조사 지역의 전체 인구로 나누어 계산합니다. 화면의 비율은 소수점 한 자리로 반올림하며, 양수이지만 0.05% 미만이면 <0.1%로 표시합니다. 순위는 기타 종교·신앙을 포함한 실제 인원수로 계산하고, 종교 미기재는 순위에서 제외합니다. 같은 인원수는 공동 순위입니다. 종교 미기재는 무종교를 뜻하지 않습니다. M Corp.는 시 법인, M·MCI는 시 자치체, OG는 시 경계 밖의 외곽 확장지입니다.",
  groups, sources, profiles }, null, 2) + "\n");
console.log(`Imported ${profiles.length} religion profiles from ${sources.length} official C-01 workbooks.`);
