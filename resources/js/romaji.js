// Offline romaji using kuroshiro + kuromoji (dictionary in /dict).
// Loads once in the background; until it's ready, romaji() resolves to "".

let ready = null;
let kuroshiro = null;
const memo = new Map();

export function initRomaji(dictPath = "dict/") {
  if (ready) return ready;
  ready = (async () => {
    const K = window.Kuroshiro && (window.Kuroshiro.default || window.Kuroshiro);
    const A = window.KuromojiAnalyzer && (window.KuromojiAnalyzer.default || window.KuromojiAnalyzer);
    if (!K || !A) throw new Error("Romaji library missing");
    const k = new K();
    await k.init(new A({ dictPath }));
    kuroshiro = k;
  })();
  return ready;
}

export async function romaji(text) {
  const t = String(text || "").trim();
  if (!t) return "";
  if (memo.has(t)) return memo.get(t);
  try {
    await initRomaji();
  } catch {
    return "";
  }
  const out = await kuroshiro.convert(t, { to: "romaji", mode: "normal", romajiSystem: "hepburn" });
  const clean = out.replace(/\s+/g, " ").trim();
  memo.set(t, clean);
  return clean;
}
