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
  assert.equal(c.buyeeUrl("デジカメ ジャンク"), "https://buyee.jp/item/search/query/%E3%83%87%E3%82%B8%E3%82%AB%E3%83%A1%20%E3%82%B8%E3%83%A3%E3%83%B3%E3%82%AF?translationType=98");
});

test("buyeeUrl adds Buyee filters the way buyee.jp does", () => {
  const u = new URL(c.buyeeUrl("デジカメ", {
    conditions: ["1", "3", "bogus"],
    options: ["new", "freeshipping", "buynow", "hack"],
    prices: { currentMin: 1111, currentMax: "2222", buyoutMin: 0, buyoutMax: 4444.4 },
    sort: "bids-desc"
  }));
  const q = Object.fromEntries(u.searchParams);
  assert.deepEqual(q, {
    aucminprice: "1111", aucmaxprice: "2222", aucmax_bidorbuy_price: "4444",
    new: "1", freeshipping: "1", buynow: "1", item_status: "1,3",
    sort: "bids", order: "a", translationType: "98"
  });
  const pop = new URL(c.buyeeUrl("x", { sort: "popular" })).searchParams;
  assert.equal(pop.get("sort"), "score");
  assert.equal(pop.get("order"), null);
  assert.equal(new URL(c.buyeeUrl("x", { sort: "nope" })).searchParams.get("sort"), null);
});

test("Buyee sorts: 10 options, default is bids high to low", () => {
  assert.equal(c.BUYEE_SORTS.length, 10);
  assert.equal(c.DEFAULT_SORT, "bids-desc");
  assert.equal(new Set(c.BUYEE_SORTS.map((x) => x.id)).size, 10);
});

test("currencies and back-translation body", () => {
  assert.deepEqual(c.CURRENCIES.map((x) => x.code), ["THB", "USD", "JPY"]);
  assert.equal(c.DEFAULT_CURRENCY, "THB");
  assert.equal(c.toJpy(1, 0.0064), 156);
  const b = JSON.parse(c.deeplBackBody("腕時計 中古"));
  assert.deepEqual(b, { text: ["腕時計 中古"], source_lang: "JA", target_lang: "EN-US" });
});

test("thbToJpy converts with baht-per-yen rate", () => {
  assert.equal(c.thbToJpy(213, 0.213), 1000);
  assert.equal(c.thbToJpy("", 0.2), null);
  assert.equal(c.thbToJpy(100, 0), null);
});

test("nextTheme cycles dark -> paper -> red", () => {
  assert.equal(c.nextTheme("dark"), "paper");
  assert.equal(c.nextTheme("paper"), "red");
  assert.equal(c.nextTheme("red"), "dark");
  assert.equal(c.nextTheme("weird"), "dark");
});

test("deeplEndpoint picks free vs pro host", () => {
  assert.match(c.deeplEndpoint("abc:fx"), /api-free/);
  assert.match(c.deeplEndpoint("abc"), /\/\/api\.deepl/);
});

test("deeplBody targets Japanese with context and instructions", () => {
  const b = JSON.parse(c.deeplBody("fishing reel"));
  assert.deepEqual(b.text, ["fishing reel"]);
  assert.equal(b.target_lang, "JA");
  assert.equal(b.source_lang, "EN");
  assert.ok(b.context.length > 20);
  assert.deepEqual(b.custom_instructions, c.DEEPL_INSTRUCTIONS);
  assert.equal(JSON.parse(c.deeplBody("x", { instructions: false })).custom_instructions, undefined);
});

test("instructions stay within DeepL limits", () => {
  assert.ok(c.DEEPL_INSTRUCTIONS.length <= c.MAX_INSTRUCTIONS);
  for (const i of c.DEEPL_INSTRUCTIONS) assert.ok(i.length <= c.MAX_INSTRUCTION_LENGTH, i);
});

test("searchClean turns phrases into search words", () => {
  assert.equal(c.searchClean("サーフフィッシング用リール"), "サーフフィッシング リール");
  assert.equal(c.searchClean("セイコーの自動巻き腕時計（ジャンク品）"), "セイコー 自動巻き腕時計 ジャンク品");
  assert.equal(c.searchClean("カセットプレーヤー。"), "カセットプレーヤー");
  assert.equal(c.searchClean("本体のみ"), "本体のみ");
  assert.equal(c.searchClean("まとめ売り"), "まとめ売り");
  assert.equal(c.searchClean("ニンテンドー3DS LL"), "ニンテンドー3DS LL");
});

test("isUntranslated spots English left as-is", () => {
  assert.equal(c.isUntranslated("shimano ocea conquest", "shimano ocea conquest"), true);
  assert.equal(c.isUntranslated("shimano", "シマノ"), false);
});

test("parseCurlOutput keeps the HTTP status on errors", () => {
  try { c.parseCurlOutput('{"message":"bad"}\n400'); assert.fail(); }
  catch (e) { assert.equal(e.status, 400); }
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

test("ASEAN picker lists all 11 members with unique 3-letter codes", async () => {
  globalThis.window = globalThis.window || {};
  const f = await import("../resources/js/flags.js");
  assert.equal(f.ASEAN.length, 11);
  assert.equal(f.ASEAN[0].code, "THA");
  const codes = f.ASEAN.map((c) => c.code);
  assert.equal(new Set(codes).size, 11);
  for (const c of codes) assert.match(c, /^[A-Z]{3}$/);
  assert.ok(codes.includes("TLS"));
  assert.equal(f.findCountry("nope").code, "THA");
  assert.match(f.flagSvg(f.JAPAN), /^<svg class="flag"/);
});

test("start-with-Windows registry commands", () => {
  const exe = c.exePathFrom("C:/Users/Me/Desktop/BuyeeSearch/", "C:\\Users\\Me\\Desktop\\BuyeeSearch\\BuyeeSearch.exe");
  assert.equal(exe, "C:\\Users\\Me\\Desktop\\BuyeeSearch\\BuyeeSearch.exe");
  assert.equal(c.exePathFrom("D:\\Tools", "Buyee 2.exe"), "D:\\Tools\\Buyee 2.exe");
  assert.equal(c.runValue(exe), '"C:\\Users\\Me\\Desktop\\BuyeeSearch\\BuyeeSearch.exe" --path="C:\\Users\\Me\\Desktop\\BuyeeSearch"');
  assert.equal(c.regAddCommand(exe), 'reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" /v BuyeeSearchBuilder /t REG_SZ /d "\\"C:\\Users\\Me\\Desktop\\BuyeeSearch\\BuyeeSearch.exe\\" --path=\\"C:\\Users\\Me\\Desktop\\BuyeeSearch\\"" /f');
  assert.match(c.regDeleteCommand(), /^reg delete ".+\\Run" \/v BuyeeSearchBuilder \/f$/);
  const out = '\r\nHKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Run\r\n    BuyeeSearchBuilder    REG_SZ    "C:\\Users\\Me\\Desktop\\BuyeeSearch\\BuyeeSearch.exe" --path="C:\\Users\\Me\\Desktop\\BuyeeSearch"\r\n\r\n';
  assert.equal(c.parseRegQuery(out), exe);
  assert.equal(c.parseRegQuery("ERROR: The system was unable to find the specified registry key or value."), null);
});

test("Used is a Buyee filter, not a search word", () => {
  assert.equal(c.buildQuery(["bass pro shops キャップ", c.USED, ""]), "bass pro shops キャップ");
  assert.deepEqual(c.conditionsFor(c.USED), ["3", "4", "5", "6", "7"]);
  assert.deepEqual(c.conditionsFor(c.USED, ["1"]), ["1"]);
  assert.deepEqual(c.conditionsFor("ジャンク"), []);
  assert.deepEqual(c.conditionsFor(""), []);
  const url = c.buyeeUrl("bass pro shops cap", { conditions: c.conditionsFor(c.USED) });
  assert.match(url, /item_status=3%2C4%2C5%2C6%2C7/);
  assert.doesNotMatch(url, /%E4%B8%AD%E5%8F%A4/); // no 中古 in the query
});

test("defaults: Used maps to the Buyee filter", async () => {
  const { readFile } = await import("node:fs/promises");
  const d = JSON.parse(await readFile(new URL("../resources/data/defaults.json", import.meta.url), "utf8"));
  assert.equal(d.conditions.find((x) => x.en.startsWith("Used")).ja, c.USED);
});

test("migrateWords resets old DeepL answers once, keeps brand edits", () => {
  const saved = { "bass pro shops cap": "バスプロショップス キャップ", "zippo lighter": "Zippo ライター", "x": "x" };
  assert.deepEqual(c.migrateWords(saved, 1), { "zippo lighter": "Zippo ライター" });
  assert.deepEqual(c.migrateWords(saved, c.WORDS_REV), { "bass pro shops cap": "バスプロショップス キャップ", "zippo lighter": "Zippo ライター" });
});

test("DeepL instructions stay within DeepL's limits", () => {
  assert.ok(c.DEEPL_INSTRUCTIONS.length <= c.MAX_INSTRUCTIONS);
  for (const i of c.DEEPL_INSTRUCTIONS) assert.ok(i.length <= c.MAX_INSTRUCTION_LENGTH, i);
});

test("releaseUpdate reads GitHub's latest release", () => {
  const rel = { tag_name: "v0.4.4", draft: false, prerelease: false, assets: [
    { name: "BuyeeSearch-win-x64.zip", browser_download_url: "https://x/zip" },
    { name: "resources.neu", browser_download_url: "https://x/resources.neu" }
  ] };
  assert.deepEqual(c.releaseUpdate(rel), { version: "0.4.4", resourcesURL: "https://x/resources.neu", source: "release" });
  assert.equal(c.releaseUpdate({ ...rel, assets: rel.assets.slice(0, 1) }), null); // older releases had no resources.neu
  assert.equal(c.releaseUpdate({ ...rel, draft: true }), null);
  assert.equal(c.releaseUpdate(null), null);
});

test("pickUpdate takes the newest source that is newer than the app", () => {
  const pages = { version: "0.4.2", source: "pages" }, rel = { version: "0.4.4", source: "release" };
  assert.equal(c.pickUpdate("0.4.2", [pages, rel]), rel);       // Pages stuck behind: release wins
  assert.equal(c.pickUpdate("0.4.4", [pages, rel]), null);      // up to date
  assert.equal(c.pickUpdate("0.4.1", [pages, null]), pages);    // one source offline
  assert.equal(c.pickUpdate("0.4.3", [{ ...rel }, { version: "0.4.4", source: "pages" }]).source, "release"); // tie: first wins
});

test("resourceSwapCommands downloads first, then swaps", () => {
  const [dl, mv] = c.resourceSwapCommands({ url: "https://x/resources.neu", appDir: "C:/Apps/Buyee/" });
  assert.equal(dl, 'curl.exe -sSL --fail --max-time 180 -o "C:\\Apps\\Buyee\\resources.neu.download" "https://x/resources.neu"');
  assert.equal(mv, 'cmd /c move /Y "C:\\Apps\\Buyee\\resources.neu.download" "C:\\Apps\\Buyee\\resources.neu"');
});
