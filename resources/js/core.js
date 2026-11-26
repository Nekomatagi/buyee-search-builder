// Pure logic: no DOM, no Neutralino. Everything here is unit-tested in test/core.test.mjs.

export const BUYEE_SEARCH = "https://buyee.jp/item/search/query/";

// Hiragana, katakana (incl. half-width), CJK ideographs, iteration marks.
const JP_RE = /[぀-ヿㇰ-ㇿ㐀-䶿一-鿿ｦ-ﾟ々]/;

export function hasJapanese(text) {
  return JP_RE.test(String(text || ""));
}

// Key used for the local word cache: case-, space- and punctuation-insensitive.
export function normalizeKey(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[’'`]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

// Join the parts of a search into one Buyee query. Empty parts are skipped,
// duplicates are dropped, and inner whitespace is collapsed.
export function buildQuery(parts) {
  const seen = new Set();
  const out = [];
  for (const p of parts) {
    const v = String(p || "").replace(/\s+/g, " ").trim();
    if (!v || seen.has(v) || isFilterToken(v)) continue;
    seen.add(v);
    out.push(v);
  }
  return out.join(" ");
}

// Buyee's own search filters (read from buyee.jp's search page, Nov 2026).
// They travel in the search address, not in the typed query.
export const BUYEE_CONDITIONS = [
  { id: "1", en: "Unused item" },
  { id: "3", en: "Close to unused" },
  { id: "4", en: "No noticeable scratches or stains" },
  { id: "5", en: "Slight scratches or stains" },
  { id: "6", en: "Visible scratches or stains" },
  { id: "7", en: "Overall poor condition" }
];

// Dropdown values that start with "@" are Buyee filters, not search words.
// "Used" is one: sellers rarely type 中古 in titles, so the keyword threw away
// most listings (230 hits -> 22 in a Nov 2026 test). Buyee's condition filter
// uses the condition every seller must pick instead.
export const USED = "@used";
export const USED_STATUSES = ["3", "4", "5", "6", "7"];
export function isFilterToken(v) {
  return String(v || "").startsWith("@");
}

// Buyee condition ids for the Open link: ticks in Buyee filters win;
// otherwise "Used" in Selling condition means every used grade.
export function conditionsFor(sellingCondition, ticked = []) {
  if (ticked.length) return ticked;
  return sellingCondition === USED ? [...USED_STATUSES] : [];
}

export const BUYEE_OPTIONS = [
  { param: "new", en: "Newly posted" },
  { param: "freeshipping", en: "Free delivery within Japan" },
  { param: "thumbnail", en: "With pictures" },
  { param: "goodSellers", en: "Buyee recommended" },
  { param: "one_hour_to_finish", en: "Ending within 1 hour" },
  { param: "isAppraisal", en: "Official authentication" },
  { param: "buynow", en: "Buy It Now items only" }
];

// Buyee's "sort" dropdown (read from buyee.jp, Nov 2026). Note Buyee's bid
// sort is inverted: "High to Low" is order=a.
export const BUYEE_SORTS = [
  { id: "recommended", en: "Recommended", sort: "recommended", order: "recommended" },
  { id: "price-asc", en: "Price: Low to High", sort: "cbids", order: "a" },
  { id: "price-desc", en: "Price: High to Low", sort: "cbids", order: "d" },
  { id: "bids-desc", en: "No. of Bids: High to Low", sort: "bids", order: "a" },
  { id: "bids-asc", en: "No. of Bids: Low to High", sort: "bids", order: "d" },
  { id: "ending", en: "Time: Ending Soon", sort: "end", order: "a" },
  { id: "newest", en: "Time: Newly Listed", sort: "end", order: "d" },
  { id: "buyout-asc", en: "Buyout Price: Low to High", sort: "bidorbuy", order: "a" },
  { id: "buyout-desc", en: "Buyout Price: High to Low", sort: "bidorbuy", order: "d" },
  { id: "popular", en: "Most Popular + Newly Listed", sort: "score", order: "" }
];
export const DEFAULT_SORT = "bids-desc";

const PRICE_PARAMS = {
  currentMin: "aucminprice",
  currentMax: "aucmaxprice",
  buyoutMin: "aucmin_bidorbuy_price",
  buyoutMax: "aucmax_bidorbuy_price"
};

// filters = { conditions: ["1","3"], options: ["new"], prices: { currentMin: 1000 } } (prices in yen)
export function buyeeUrl(query, filters = {}) {
  const p = new URLSearchParams();
  const prices = filters.prices || {};
  for (const [k, param] of Object.entries(PRICE_PARAMS)) {
    const v = Math.round(Number(prices[k]));
    if (Number.isFinite(v) && v > 0) p.set(param, String(v));
  }
  const allowed = new Set(BUYEE_OPTIONS.map((o) => o.param));
  for (const o of filters.options || []) if (allowed.has(o)) p.set(o, "1");
  const conds = (filters.conditions || []).filter((c) => BUYEE_CONDITIONS.some((x) => x.id === c));
  if (conds.length) p.set("item_status", conds.join(","));
  const so = BUYEE_SORTS.find((x) => x.id === filters.sort);
  if (so) { p.set("sort", so.sort); if (so.order) p.set("order", so.order); }
  p.set("translationType", "98"); // search the Japanese as typed, no auto-translate
  return BUYEE_SEARCH + encodeURIComponent(query) + "?" + p.toString();
}

// Foreign money -> yen, with the rate expressed as units per 1 yen
// (e.g. baht per yen, dollars per yen) as open.er-api.com/v6/latest/JPY gives it.
export function toJpy(amount, perJpy) {
  const v = Number(amount), r = Number(perJpy);
  if (!(v > 0) || !(r > 0)) return null;
  return Math.round(v / r);
}
export const thbToJpy = toJpy;
export const CURRENCIES = [
  { code: "THB", symbol: "฿" },
  { code: "USD", symbol: "$" },
  { code: "JPY", symbol: "¥" }
];
export const DEFAULT_CURRENCY = "THB";

// Japanese -> English, to show what the final query means.
export function deeplBackBody(text) {
  return JSON.stringify({ text: [String(text)], source_lang: "JA", target_lang: "EN-US" });
}

// ---- Start with Windows (per-user, no admin): HKCU\...\Run registry value
export const RUN_KEY = "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run";
export const RUN_NAME = "BuyeeSearchBuilder";

// NL_PATH (app folder, may use "/") + the exe's file name from NL_ARGS[0].
export function exePathFrom(nlPath, arg0) {
  const dir = String(nlPath || "").replace(/\//g, "\\").replace(/\\+$/, "");
  const name = String(arg0 || "BuyeeSearch.exe").split(/[\\/]/).pop().replace(/^"|"$/g, "") || "BuyeeSearch.exe";
  return `${dir}\\${name}`;
}

// Windows starts sign-in programs from System32, so pass the app folder with
// --path, or Neutralino can't find resources.neu and .storage.
export function runValue(exePath) {
  const dir = exePath.replace(/\\[^\\]*$/, "");
  return `"${exePath}" --path="${dir}"`;
}
export function regAddCommand(exePath) {
  return `reg add "${RUN_KEY}" /v ${RUN_NAME} /t REG_SZ /d "${runValue(exePath).replace(/"/g, '\\"')}" /f`;
}
export function regDeleteCommand() {
  return `reg delete "${RUN_KEY}" /v ${RUN_NAME} /f`;
}
export function regQueryCommand() {
  return `reg query "${RUN_KEY}" /v ${RUN_NAME}`;
}
// Reads the registered exe path (first quoted part) out of `reg query` output, or null.
export function parseRegQuery(stdOut) {
  const m = String(stdOut || "").match(new RegExp(`${RUN_NAME}\\s+REG_SZ\\s+(.+)`));
  if (!m) return null;
  const v = m[1].trim();
  const q = v.match(/^"([^"]+)"/);
  return q ? q[1] : v.split(/\s+--/)[0];
}

export const THEMES = ["dark", "paper", "red"];
export function nextTheme(current) {
  const i = THEMES.indexOf(current);
  return THEMES[(i + 1) % THEMES.length];
}

// DeepL free keys end in ":fx" and use a different host.
export function deeplEndpoint(key) {
  return /:fx$/.test(String(key || "").trim())
    ? "https://api-free.deepl.com/v2/translate"
    : "https://api.deepl.com/v2/translate";
}

// Context helps DeepL pick marketplace wording (e.g. "reel" -> リール, not 巻).
export const DEEPL_CONTEXT =
  "Search keywords for a Japanese second-hand marketplace such as Yahoo! Auctions or Mercari. " +
  "Use the short product names and condition words Japanese sellers write in listing titles.";

// Instructions, the way you'd brief a person ("I'm sourcing second-hand goods").
// DeepL allows up to 10, each up to 300 characters.
export const DEEPL_INSTRUCTIONS = [
  "I am sourcing second-hand goods in Japan. Translate the text into the search keywords Japanese sellers write in Yahoo! Auctions and Mercari listing titles, not into a sentence.",
  "Prefer the short everyday forms sellers use, for example デジカメ for digital camera, 投げ竿 for surf fishing rod, 投げ釣り リール for surf fishing reel.",
  "Keep brand names from outside Japan in their original English spelling, as sellers write them (Bass Pro Shops, Abu Garcia, Zippo, Coleman). Translate only the item words around them.",
  "Write Japanese brand and model names in the katakana Japanese sellers use (シマノ, ダイワ, セイコー, オシアコンクエスト). Keep model numbers and letters like SP, LL, 3DS as they are.",
  "Separate keywords with a single space. Do not add particles such as の or 用, brackets, or punctuation."
];

export const MAX_INSTRUCTIONS = 10;
export const MAX_INSTRUCTION_LENGTH = 300;

export function deeplBody(text, { instructions = true } = {}) {
  const body = {
    text: [String(text)],
    source_lang: "EN",
    target_lang: "JA",
    context: DEEPL_CONTEXT
  };
  if (instructions) body.custom_instructions = DEEPL_INSTRUCTIONS;
  return JSON.stringify(body);
}

// Turn a translated phrase into space-separated search words:
// "セイコーの自動巻き腕時計（ジャンク品）" -> "セイコー 自動巻き腕時計 ジャンク品"
const WORD = "[\\u30a0-\\u30ff\\u3400-\\u9fffA-Za-z0-9ー]";
export function searchClean(text) {
  return String(text || "")
    .replace(/[（）()「」『』【】［］\[\]、。・,.!?！？:：;；"“”]/g, " ")
    .replace(new RegExp(`(${WORD})[のと用](?=${WORD})`, "gu"), "$1 ")
    .replace(/\s+/g, " ")
    .trim();
}

// DeepL returns the input unchanged when it can't translate (e.g. unknown brand names).
export function isUntranslated(source, result) {
  return !hasJapanese(result);
}

// Saved translations are reset once when the translation rules change, so old
// answers (like バスプロショップス for Bass Pro Shops) don't stick around.
// Entries that already keep Latin letters next to Japanese are kept: those are
// usually hand edits like "bass pro shops キャップ".
export const WORDS_REV = 2;
export function migrateWords(saved, rev) {
  const out = {};
  for (const [en, ja] of Object.entries(saved || {})) {
    if (!hasJapanese(ja)) continue;
    if (rev >= WORDS_REV || /[A-Za-z]/.test(ja)) out[en] = ja;
  }
  return out;
}

// Command line for Windows' built-in curl.exe. The body goes in a UTF-8 file so
// Japanese text and quotes never pass through the shell.
export function curlCommand({ key, bodyFile, windows = true }) {
  const q = (s) => '"' + String(s).replace(/"/g, '\\"') + '"';
  return [
    windows ? "curl.exe" : "curl", "-s", "-S", "--max-time", "20",
    "-X", "POST", q(deeplEndpoint(key)),
    "-H", q("Authorization: DeepL-Auth-Key " + String(key).trim()),
    "-H", q("Content-Type: application/json"),
    "-w", q("\\n%{http_code}"),
    "--data-binary", q("@" + bodyFile)
  ].join(" ");
}

// curl prints the body, then a newline and the HTTP status (from -w).
export function parseCurlOutput(stdOut) {
  const s = String(stdOut || "").trimEnd();
  const i = s.lastIndexOf("\n");
  const status = Number(i >= 0 ? s.slice(i + 1) : s);
  const body = i >= 0 ? s.slice(0, i) : "";
  if (status === 200) {
    const data = JSON.parse(body);
    const t = data && data.translations && data.translations[0];
    if (!t || !t.text) throw new Error("DeepL sent an empty answer.");
    return { text: t.text.trim(), detected: t.detected_source_language || "" };
  }
  const reasons = {
    400: "DeepL didn't accept the request.",
    403: "DeepL rejected the API key.",
    429: "Too many requests to DeepL. Wait a moment and try again.",
    456: "Your DeepL monthly character allowance is used up.",
    0: "Could not reach DeepL. Check the internet connection."
  };
  const err = new Error(reasons[status] || `DeepL error (HTTP ${status || "none"}).`);
  err.status = status;
  throw err;
}

// Clean DeepL output for search use: drop trailing sentence punctuation.
export function cleanTranslation(text) {
  return String(text || "").replace(/[。．.、,]+$/u, "").trim();
}

// "1.10.0" > "1.9.3"
export function isNewer(remote, local) {
  const a = String(remote || "0").replace(/^v/, "").split(".").map(Number);
  const b = String(local || "0").replace(/^v/, "").split(".").map(Number);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const x = a[i] || 0, y = b[i] || 0;
    if (x !== y) return x > y;
  }
  return false;
}

// ---- updates from two places, so one failing never strands the app:
//   1. GitHub Pages update.json (Neutralino's own updater)
//   2. the latest GitHub Release, which carries resources.neu as a file
// GitHub's API answer -> { version, resourcesURL, source: "release" } or null.
export function releaseUpdate(release) {
  if (!release || release.draft || release.prerelease) return null;
  const version = String(release.tag_name || "").replace(/^v/, "");
  const asset = (release.assets || []).find((a) => a.name === "resources.neu");
  if (!/^\d+\.\d+\.\d+$/.test(version) || !asset) return null;
  return { version, resourcesURL: asset.browser_download_url, source: "release" };
}

// The newest candidate that is newer than what's running, or null.
export function pickUpdate(local, candidates) {
  let best = null;
  for (const c of candidates) {
    if (!c || !isNewer(c.version, local)) continue;
    if (!best || isNewer(c.version, best.version)) best = c;
  }
  return best;
}

// Windows commands that download the new resources.neu next to the old one,
// then swap it in only if the download finished.
export function resourceSwapCommands({ url, appDir }) {
  const dir = String(appDir || "").replace(/\//g, "\\").replace(/\\+$/, "");
  const target = `${dir}\\resources.neu`, part = `${target}.download`;
  return [
    `curl.exe -sSL --fail --max-time 180 -o "${part}" "${url}"`,
    `cmd /c move /Y "${part}" "${target}"`
  ];
}

// Word cache: { [normalizedEnglish]: japanese }
export function lookupWord(words, english) {
  const k = normalizeKey(english);
  return k && Object.prototype.hasOwnProperty.call(words, k) ? words[k] : null;
}

export function rememberWord(words, english, japanese) {
  const k = normalizeKey(english);
  const ja = String(japanese || "").trim();
  if (!k || !ja) return words;
  return { ...words, [k]: ja };
}

// Lists of {en, ja} items (presets and custom filters).
export function addItem(list, en, ja) {
  const e = String(en || "").trim(), j = String(ja || "").trim();
  if (!j) return list;
  const label = e || j;
  const rest = list.filter((x) => x.ja !== j);
  return [...rest, { en: label, ja: j }];
}

export function removeItem(list, ja) {
  return list.filter((x) => x.ja !== ja);
}

export function seedWords(defaults) {
  let w = {};
  for (const group of [defaults.presets, defaults.conditions, defaults.formats, defaults.filters]) {
    for (const it of group) if (it.ja && it.en) w = rememberWord(w, it.en, it.ja);
  }
  return w;
}
