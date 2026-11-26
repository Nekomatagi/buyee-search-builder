// Checks the bundled romaji engine and dictionary give sensible readings
// for the words the app uses most. Runs the same libraries in Node.
import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const Kuroshiro = require("kuroshiro").default || require("kuroshiro");
const Analyzer = require("kuroshiro-analyzer-kuromoji");
const dictPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "../resources/dict");

const k = new Kuroshiro();
await k.init(new Analyzer({ dictPath }));
const r = (t) => k.convert(t, { to: "romaji", mode: "normal", romajiSystem: "hepburn" });

const cases = {
  "中古": /chūko/,
  "腕時計": /ude ?dokei|udedokei/,
  "美品": /bihin/,
  "まとめ売り": /matome ?uri/,
  "動作確認済み": /dōsa ?kakunin ?zumi/,
  "カセットウォークマン": /kasettowōkuman|kasetto ?wōkuman/,
  "ジャンク": /janku/
};

for (const [ja, re] of Object.entries(cases)) {
  test(`romaji: ${ja}`, async () => {
    const out = await r(ja);
    assert.match(out.replace(/\s+/g, " "), re, `${ja} -> ${out}`);
  });
}
