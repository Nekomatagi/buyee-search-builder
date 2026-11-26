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
    if (!v || seen.has(v)) continue;
    seen.add(v);
    out.push(v);
  }
  return out.join(" ");
}

export function buyeeUrl(query) {
  return BUYEE_SEARCH + encodeURIComponent(query);
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

export function deeplBody(text) {
  return JSON.stringify({
    text: [String(text)],
    target_lang: "JA",
    context: DEEPL_CONTEXT
  });
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
    403: "DeepL rejected the API key.",
    429: "Too many requests to DeepL. Wait a moment and try again.",
    456: "Your DeepL monthly character allowance is used up.",
    0: "Could not reach DeepL. Check the internet connection."
  };
  throw new Error(reasons[status] || `DeepL error (HTTP ${status || "none"}).`);
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
