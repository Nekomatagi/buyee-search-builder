import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import * as c from "../resources/js/core.js";

const defaults = JSON.parse(fs.readFileSync(new URL("../resources/data/defaults.json", import.meta.url)));

test("hasJapanese", () => {
  assert.equal(c.hasJapanese("cassette walkman"), false);
  assert.equal(c.hasJapanese("カセット"), true);
  assert.equal(c.hasJapanese("腕時計"), true);
  assert.equal(c.hasJapanese("New3DS LL"), false);
  assert.equal(c.hasJapanese("ｶｾｯﾄ"), true);
});

test("normalizeKey ignores case, spaces and punctuation", () => {
  assert.equal(c.normalizeKey("  Men's   Watch! "), "mens watch");
  assert.equal(c.normalizeKey("Bait / conventional reel"), "bait conventional reel");
});

test("buildQuery skips blanks and duplicates", () => {
  assert.equal(c.buildQuery(["カセットウォークマン", "中古", "", "  ", "まとめ売り"]), "カセットウォークマン 中古 まとめ売り");
  assert.equal(c.buildQuery(["中古", "中古"]), "中古");
  assert.equal(c.buildQuery(["", "", ""]), "");
});

test("buyeeUrl encodes the query", () => {
  assert.equal(c.buyeeUrl("デジカメ ジャンク"), "https://buyee.jp/item/search/query/%E3%83%87%E3%82%B8%E3%82%AB%E3%83%A1%20%E3%82%B8%E3%83%A3%E3%83%B3%E3%82%AF");
});

test("deeplEndpoint picks free vs pro host", () => {
  assert.match(c.deeplEndpoint("abc:fx"), /api-free/);
  assert.match(c.deeplEndpoint("abc"), /\/\/api\.deepl/);
});

test("deeplBody targets Japanese with context", () => {
  const b = JSON.parse(c.deeplBody("fishing reel"));
  assert.deepEqual(b.text, ["fishing reel"]);
  assert.equal(b.target_lang, "JA");
  assert.ok(b.context.length > 20);
});

test("curlCommand passes the body by file and quotes safely", () => {
  const cmd = c.curlCommand({ key: "k:fx", bodyFile: "C:\\Temp\\a b.json" });
  assert.match(cmd, /^curl\.exe /);
  assert.match(cmd, /"@C:\\Temp\\a b\.json"/);
  assert.match(cmd, /"Authorization: DeepL-Auth-Key k:fx"/);
  assert.match(cmd, /api-free\.deepl\.com/);
});

test("parseCurlOutput reads success and errors", () => {
  const ok = '{"translations":[{"detected_source_language":"EN","text":"釣りリール"}]}\n200';
  assert.deepEqual(c.parseCurlOutput(ok), { text: "釣りリール", detected: "EN" });
  assert.throws(() => c.parseCurlOutput('{"message":"Forbidden"}\n403'), /rejected the API key/);
  assert.throws(() => c.parseCurlOutput('{}\n456'), /allowance/);
  assert.throws(() => c.parseCurlOutput("\n000"), /reach DeepL/);
});

test("cleanTranslation drops end punctuation", () => {
  assert.equal(c.cleanTranslation("腕時計。"), "腕時計");
  assert.equal(c.cleanTranslation(" 中古 "), "中古");
});

test("isNewer compares versions", () => {
  assert.equal(c.isNewer("0.2.0", "0.1.9"), true);
  assert.equal(c.isNewer("v1.10.0", "1.9.3"), true);
  assert.equal(c.isNewer("0.1.0", "0.1.0"), false);
  assert.equal(c.isNewer("0.1.0", "0.2.0"), false);
});

test("word cache remember + lookup", () => {
  let w = {};
  w = c.rememberWord(w, "Fishing Reel", "リール");
  assert.equal(c.lookupWord(w, "fishing reel"), "リール");
  assert.equal(c.lookupWord(w, "toString"), null);
  assert.equal(c.lookupWord(w, ""), null);
});

test("addItem / removeItem", () => {
  let l = [];
  l = c.addItem(l, "With charger", "充電器付き");
  l = c.addItem(l, "", "箱付き");
  l = c.addItem(l, "dup", "充電器付き");
  assert.deepEqual(l, [{ en: "箱付き", ja: "箱付き" }, { en: "dup", ja: "充電器付き" }]);
  assert.deepEqual(c.removeItem(l, "箱付き"), [{ en: "dup", ja: "充電器付き" }]);
  assert.deepEqual(c.addItem(l, "x", " "), l);
});

test("seedWords covers presets and filters", () => {
  const w = c.seedWords(defaults);
  assert.equal(c.lookupWord(w, "cassette walkman"), "カセットウォークマン");
  assert.equal(c.lookupWord(w, "unit only"), "本体のみ");
  assert.equal(c.lookupWord(w, "any format"), null);
});

test("defaults: every select starts with an empty 'any' option", () => {
  for (const k of ["conditions", "formats", "filters"]) assert.equal(defaults[k][0].ja, "");
  assert.equal(defaults.formats[0].en, "Any format");
});
