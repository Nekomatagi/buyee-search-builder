import {
  hasJapanese, buildQuery, buyeeUrl, lookupWord, rememberWord,
  addItem, removeItem, seedWords
} from "./core.js";
import { romaji, initRomaji } from "./romaji.js";
import {
  isDesktop, initPlatform, appVersion, load, save, translateWithDeepL,
  hasDeepLKey, copyText, openUrl, checkForUpdate, installUpdate
} from "./platform.js";

const $ = (id) => document.getElementById(id);
const DEBOUNCE_MS = 700;

const state = {
  defaults: null,
  words: {},      // English -> Japanese cache (shared by product and filters)
  presets: [],
  filters: [],    // custom filters only; defaults come from defaults.json
  editing: false
};

// ---------- translation (cache first, DeepL second)
async function toJapanese(text) {
  const t = text.trim();
  if (!t) return { ja: "", source: "" };
  if (hasJapanese(t)) return { ja: t, source: "Typed in Japanese" };
  const cached = lookupWord(state.words, t);
  if (cached) return { ja: cached, source: "Saved word" };
  if (!hasDeepLKey()) throw new Error(isDesktop ? "This build has no DeepL key." : "Translation works in the desktop app.");
  const ja = await translateWithDeepL(t);
  state.words = rememberWord(state.words, t, ja);
  save("words", state.words);
  return { ja, source: "DeepL" };
}

// One live translator per English box: debounced, and late answers are ignored.
function liveTranslator({ input, output, srcEl, romajiEl, onChange }) {
  let timer = null, seq = 0;
  async function run() {
    const mine = ++seq;
    const text = input.value;
    if (!text.trim()) { output.value = ""; srcEl.textContent = ""; await showRomaji(); return onChange(); }
    srcEl.className = "src"; srcEl.textContent = "Translating…";
    try {
      const { ja, source } = await toJapanese(text);
      if (mine !== seq) return;
      output.value = ja;
      srcEl.textContent = source;
    } catch (e) {
      if (mine !== seq) return;
      output.value = "";
      srcEl.className = "src err";
      srcEl.textContent = e.message;
    }
    await showRomaji();
    onChange();
  }
  async function showRomaji() {
    const r = await romaji(output.value);
    romajiEl.textContent = r;
  }
  input.addEventListener("input", () => { clearTimeout(timer); timer = setTimeout(run, DEBOUNCE_MS); });
  input.addEventListener("keydown", (e) => { if (e.key === "Enter") { clearTimeout(timer); run(); } });
  // Editing the Japanese by hand teaches the cache for next time.
  output.addEventListener("input", () => { srcEl.className = "src"; srcEl.textContent = "Edited"; onChange(); showRomaji(); });
  output.addEventListener("change", () => {
    const en = input.value.trim();
    if (en && !hasJapanese(en) && output.value.trim()) {
      state.words = rememberWord(state.words, en, output.value);
      save("words", state.words);
    }
  });
  return { run, showRomaji };
}

// ---------- rendering
function fillSelect(el, items, keep) {
  el.replaceChildren(...items.map((it) => {
    const o = document.createElement("option");
    o.value = it.ja;
    o.textContent = !it.ja ? it.en : it.en === it.ja ? it.ja : `${it.en} (${it.ja})`;
    return o;
  }));
  if (keep !== undefined && items.some((i) => i.ja === keep)) el.value = keep;
}

function renderPresets() {
  const box = $("presets");
  box.classList.toggle("editing", state.editing);
  box.replaceChildren(...state.presets.map((p) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "chip" + ($("ja").value.trim() === p.ja ? " on" : "");
    b.title = p.ja;
    b.dataset.ja = p.ja;
    b.dataset.en = p.en;
    b.append(p.en);
    const x = document.createElement("span");
    x.className = "x";
    x.textContent = "×";
    x.setAttribute("aria-label", "Remove " + p.en);
    b.append(x);
    return b;
  }));
  $("editPresets").textContent = state.editing ? "Done" : "Edit";
}

function renderFilters(keep) {
  fillSelect($("ext"), [...state.defaults.filters, ...state.filters], keep);
}

async function renderQuery() {
  const q = buildQuery([$("ja").value, $("cond").value, $("fmt").value, $("ext").value]);
  $("q").textContent = q || "…";
  $("qRomaji").textContent = q ? await romaji(q) : "";
  document.querySelectorAll("#presets .chip").forEach((c) => c.classList.toggle("on", c.dataset.ja === $("ja").value.trim()));
  return q;
}

function flash(text) {
  $("msg").textContent = text;
  clearTimeout(flash.t);
  flash.t = setTimeout(() => ($("msg").textContent = "Paste into Buyee's search bar."), 2500);
}

// ---------- start
async function main() {
  await initPlatform();
  state.defaults = await (await fetch("data/defaults.json")).json();
  state.words = { ...seedWords(state.defaults), ...(await load("words", {})) };
  state.presets = await load("presets", state.defaults.presets);
  state.filters = await load("filters", []);

  fillSelect($("cond"), state.defaults.conditions);
  fillSelect($("fmt"), state.defaults.formats);
  renderFilters();
  $("cond").value = "中古";
  $("ver").textContent = `Version ${appVersion()}`;

  const product = liveTranslator({
    input: $("en"), output: $("ja"), srcEl: $("src"), romajiEl: $("jaRomaji"), onChange: renderQuery
  });
  const filter = liveTranslator({
    input: $("fEn"), output: $("fJa"), srcEl: $("fSrc"), romajiEl: $("fRomaji"),
    onChange: () => ($("saveFilter").disabled = !$("fJa").value.trim())
  });

  ["cond", "fmt", "ext"].forEach((id) => $(id).addEventListener("change", renderQuery));

  // presets
  $("presets").addEventListener("click", async (e) => {
    const chip = e.target.closest(".chip");
    if (!chip) return;
    if (state.editing) {
      state.presets = removeItem(state.presets, chip.dataset.ja);
      await save("presets", state.presets);
      return renderPresets();
    }
    $("en").value = chip.dataset.en;
    $("ja").value = chip.dataset.ja;
    $("src").className = "src";
    $("src").textContent = "Preset";
    await product.showRomaji();
    renderQuery();
  });
  $("addPreset").addEventListener("click", async () => {
    const ja = $("ja").value.trim();
    if (!ja) return flash("Type a product first.");
    state.presets = addItem(state.presets, $("en").value, ja);
    await save("presets", state.presets);
    renderPresets();
    flash("Preset saved.");
  });
  $("editPresets").addEventListener("click", () => { state.editing = !state.editing; renderPresets(); });

  // custom filters
  const panel = $("filterPanel");
  $("toggleFilter").addEventListener("click", () => {
    panel.hidden = !panel.hidden;
    if (!panel.hidden) { $("fEn").value = ""; $("fJa").value = ""; $("fRomaji").textContent = ""; $("fSrc").textContent = ""; $("saveFilter").disabled = true; $("fEn").focus(); }
  });
  $("cancelFilter").addEventListener("click", () => (panel.hidden = true));
  $("saveFilter").addEventListener("click", async () => {
    const ja = $("fJa").value.trim();
    if (!ja) return;
    state.filters = addItem(state.filters, $("fEn").value, ja);
    await save("filters", state.filters);
    renderFilters(ja);
    panel.hidden = true;
    renderQuery();
    flash("Filter added.");
  });

  // output
  $("copy").addEventListener("click", async () => {
    const q = await renderQuery();
    if (!q) return flash("Nothing to copy yet.");
    try { await copyText(q); flash("Copied. Paste it into Buyee."); }
    catch { flash("Copy failed. Select the query and press Ctrl+C."); }
  });
  $("open").addEventListener("click", async () => {
    const q = await renderQuery();
    if (q) openUrl(buyeeUrl(q));
  });
  $("reset").addEventListener("click", () => {
    $("en").value = ""; $("ja").value = ""; $("src").textContent = ""; $("jaRomaji").textContent = "";
    $("cond").value = "中古"; $("fmt").value = ""; $("ext").value = "";
    renderQuery(); $("en").focus();
  });

  renderPresets();
  renderQuery();
  initRomaji().then(() => { product.showRomaji(); renderQuery(); }).catch(() => {
    $("qRomaji").textContent = "Romaji unavailable.";
  });

  const update = await checkForUpdate();
  if (update) {
    $("updateText").textContent = `Version ${update.version} is ready.`;
    $("update").hidden = false;
    $("updateBtn").addEventListener("click", async () => {
      $("updateBtn").disabled = true;
      $("updateText").textContent = "Updating…";
      try { await installUpdate(); } catch { $("updateText").textContent = "Update failed. Try again later."; $("updateBtn").disabled = false; }
    });
  }
}

main().catch((e) => {
  console.error(e);
  $("msg").textContent = "Something went wrong: " + e.message;
});
