import {
  hasJapanese, isUntranslated, buildQuery, buyeeUrl, isFilterToken, conditionsFor, migrateWords, WORDS_REV, lookupWord, rememberWord,
  addItem, removeItem, seedWords, BUYEE_CONDITIONS, BUYEE_OPTIONS, BUYEE_SORTS, DEFAULT_SORT,
  CURRENCIES, DEFAULT_CURRENCY, toJpy, nextTheme, THEMES
} from "./core.js";
import { romaji, initRomaji } from "./romaji.js";
import { ASEAN, JAPAN, flagSvg, findCountry } from "./flags.js";
import {
  isDesktop, initPlatform, appVersion, load, save, translateWithDeepL,
  hasDeepLKey, copyText, openUrl, checkForUpdate, installUpdate, setAlwaysOnTop, translateToEnglish,
  isWindows, currentExePath, getStartupPath, setStartup
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
  if (isUntranslated(t, ja)) {
    // Not saved: next time DeepL gets another chance, or you type the Japanese.
    return { ja, source: "Kept in English. Fine for foreign brands; type the Japanese if you know it." };
  }
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
    if (!text.trim()) { output.value = ""; output.classList.remove("edited"); srcEl.textContent = ""; await showRomaji(); return onChange(); }
    srcEl.className = "src"; srcEl.textContent = "Translating…";
    try {
      const { ja, source, warn } = await toJapanese(text);
      if (mine !== seq) return;
      output.value = ja;
      output.classList.remove("edited");
      srcEl.className = warn ? "src err" : "src";
      srcEl.textContent = source;
    } catch (e) {
      if (mine !== seq) return;
      output.value = "";
      output.classList.remove("edited");
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
  output.addEventListener("input", () => { output.classList.add("edited"); srcEl.className = "src"; srcEl.textContent = "Edited"; onChange(); showRomaji(); });
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
    o.textContent = !it.ja ? it.en
      : isFilterToken(it.ja) ? `${it.en} (Buyee filter)`
      : it.en === it.ja ? it.ja : `${it.en} (${it.ja})`;
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

// Bold frame on any dropdown moved off its default ("Any …"/"None").
function markChanged() {
  for (const id of ["cond", "fmt", "ext"]) $(id).classList.toggle("changed", $(id).value !== "");
}

// The final query translated back to English, so you can check its meaning.
const backCache = new Map();
let backTimer = null, backSeq = 0;
function renderBack(q) {
  clearTimeout(backTimer);
  const el = $("qEnglish");
  if (!q || !hasJapanese(q)) { el.textContent = ""; return; }
  if (backCache.has(q)) { el.textContent = backCache.get(q); return; }
  el.textContent = "";
  const mine = ++backSeq;
  backTimer = setTimeout(async () => {
    try {
      const en = await translateToEnglish(q);
      if (!en) return;
      backCache.set(q, en);
      save("backWords", Object.fromEntries([...backCache].slice(-200)));
      if (mine === backSeq) el.textContent = en;
    } catch { /* offline or no key: leave empty */ }
  }, 900);
}

async function renderQuery() {
  const q = buildQuery([$("ja").value, $("cond").value, $("fmt").value, $("ext").value]);
  markChanged();
  $("q").textContent = q || "…";
  $("qRomaji").textContent = q ? await romaji(q) : "";
  renderBack(q);
  document.querySelectorAll("#presets .chip").forEach((c) => c.classList.toggle("on", c.dataset.ja === $("ja").value.trim()));
  saveSession();
  return q;
}

// ---------- theme (dark / paper white / red)
const THEME_NAMES = { dark: "Dark", paper: "Paper white", red: "Red" };
function applyTheme(t) {
  const theme = THEMES.includes(t) ? t : "dark";
  document.documentElement.dataset.theme = theme;
  const next = nextTheme(theme);
  $("themeBtn").title = `Theme: ${THEME_NAMES[theme]}. Click for ${THEME_NAMES[next]}.`;
  return theme;
}

// ---------- internet indicator + update arrow
const net = { online: true, update: null };
function renderNet() {
  const el = $("net");
  const showUpdate = net.online && net.update;
  el.classList.toggle("on", net.online && !showUpdate);
  el.classList.toggle("off", !net.online);
  el.classList.toggle("update", Boolean(showUpdate));
  el.title = showUpdate
    ? `Version ${net.update.version} is ready. Click to restart and update.`
    : net.online ? "Online. Click to check for updates." : "Offline: translation and Buyee won't work";
  el.setAttribute("aria-label", el.title);
}
async function checkNet() {
  let on = navigator.onLine;
  if (on) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 5000);
    try { await fetch("https://buyee.jp/favicon.ico?" + Date.now(), { mode: "no-cors", cache: "no-store", signal: ctrl.signal }); }
    catch { on = false; }
    clearTimeout(t);
  }
  net.online = on;
  renderNet();
  return on;
}

// ---------- in-app dialog (no browser pop-ups)
function ask({ title, text, yes, no }) {
  return new Promise((resolve) => {
    const d = $("dialog");
    $("dlgTitle").textContent = title;
    $("dlgText").textContent = text;
    $("dlgYes").textContent = yes;
    $("dlgNo").textContent = no;
    d.hidden = false;
    $("dlgYes").focus();
    const done = (v) => {
      d.hidden = true;
      $("dlgYes").onclick = $("dlgNo").onclick = d.onkeydown = null;
      resolve(v);
    };
    $("dlgYes").onclick = () => done(true);
    $("dlgNo").onclick = () => done(false);
    d.onkeydown = (e) => { if (e.key === "Escape") done(false); };
  });
}

// ---------- last search (restored on every start, incl. after an update)
let sessionTimer = null;
function saveSession() {
  clearTimeout(sessionTimer);
  sessionTimer = setTimeout(() => save("session", {
    en: $("en").value, ja: $("ja").value, edited: $("ja").classList.contains("edited"),
    src: $("src").textContent, cond: $("cond").value, fmt: $("fmt").value, ext: $("ext").value
  }), 300);
}

// ---------- Buyee filters (sent in the Buyee address, not the copied text)
const RATE_MAX_AGE = 12 * 60 * 60 * 1000;
// { rates: { THB, USD } (units per 1 yen), at }
async function getRates() {
  const cached = await load("fxRates", null);
  if (cached && Date.now() - cached.at < RATE_MAX_AGE) return cached;
  try {
    const r = await fetch("https://open.er-api.com/v6/latest/JPY", { cache: "no-store" });
    const j = await r.json();
    const fresh = { rates: { THB: j.rates.THB, USD: j.rates.USD }, at: Date.now() };
    if (!(fresh.rates.THB > 0 && fresh.rates.USD > 0)) throw new Error("no rate");
    await save("fxRates", fresh);
    return fresh;
  } catch {
    return cached; // may be old or null
  }
}

function renderBuyeeChips(b) {
  const chip = (group, value, label, on) => {
    const el = document.createElement("button");
    el.type = "button";
    el.className = "chip" + (on ? " on" : "");
    el.dataset.group = group;
    el.dataset.value = value;
    el.setAttribute("aria-pressed", String(on));
    el.textContent = label;
    return el;
  };
  $("bConditions").replaceChildren(...BUYEE_CONDITIONS.map((c) => chip("conditions", c.id, c.en, b.conditions.includes(c.id))));
  $("bOptions").replaceChildren(...BUYEE_OPTIONS.map((o) => chip("options", o.param, o.en, b.options.includes(o.param))));
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
  // Drop saved "translations" that are still English, and reset old DeepL
  // answers once when the translation rules change (see migrateWords).
  const saved = migrateWords(await load("words", {}), await load("wordsRev", 1));
  state.words = { ...seedWords(state.defaults), ...saved };
  save("words", saved);
  save("wordsRev", WORDS_REV);
  state.presets = await load("presets", state.defaults.presets);
  state.filters = await load("filters", []);

  fillSelect($("cond"), state.defaults.conditions);
  fillSelect($("fmt"), state.defaults.formats);
  renderFilters();
  $("cond").value = "";
  for (const [k, v] of Object.entries(await load("backWords", {}))) backCache.set(k, v);
  const lastExt = (await load("session", {}))?.ext;
  if (lastExt) renderFilters(lastExt);
  $("ver").textContent = `Version ${appVersion()}`;

  const last = await load("session", null);
  if (last) {
    $("en").value = last.en || "";
    $("ja").value = last.ja || "";
    $("ja").classList.toggle("edited", Boolean(last.edited));
    $("src").textContent = last.ja ? (last.src || "Last session") : "";
    for (const id of ["cond", "fmt"]) if ([...$(id).options].some((o) => o.value === last[id])) $(id).value = last[id];
  }

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
    $("ja").classList.remove("edited");
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
    if (!panel.hidden) { $("fEn").value = ""; $("fJa").value = ""; $("fJa").classList.remove("edited"); $("fRomaji").textContent = ""; $("fSrc").textContent = ""; $("saveFilter").disabled = true; $("fEn").focus(); }
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
  // Buyee filters
  const PRICE_IDS = { currentMin: "curMin", currentMax: "curMax", buyoutMin: "buyMin", buyoutMax: "buyMax" };
  const emptyBuyee = () => ({ conditions: [], options: [], currency: DEFAULT_CURRENCY, sort: DEFAULT_SORT, prices: {} });
  $("sort").replaceChildren(...BUYEE_SORTS.map((x) => new Option(x.en, x.id)));
  $("currency").replaceChildren(...CURRENCIES.map((x) => new Option(`${x.symbol} ${x.code}`, x.code)));
  let buyee = { ...emptyBuyee(), ...(await load("buyeeFilters", {})) };
  let rate = null;

  function markBuyee() {
    $("sort").classList.toggle("changed", buyee.sort !== DEFAULT_SORT);
    $("currency").classList.toggle("changed", buyee.currency !== DEFAULT_CURRENCY);
    for (const id of Object.values(PRICE_IDS)) $(id).classList.toggle("changed", $(id).value !== "");
  }
  function showBuyee() {
    renderBuyeeChips(buyee);
    $("currency").value = buyee.currency;
    $("sort").value = buyee.sort;
    for (const [k, id] of Object.entries(PRICE_IDS)) $(id).value = buyee.prices[k] ?? "";
    updateCount();
  }
  function updateCount() {
    const used = !buyee.conditions.length && conditionsFor($("cond").value).length ? 1 : 0;
    const n = buyee.conditions.length + used + buyee.options.length + Object.values(buyee.prices).filter((v) => Number(v) > 0).length;
    $("filterCount").textContent = n ? `· ${n} filter${n > 1 ? "s" : ""}` : "";
  }
  async function updateRate() {
    if (buyee.currency === "JPY") { $("rateNote").textContent = ""; return; }
    rate = await getRates();
    const sym = CURRENCIES.find((x) => x.code === buyee.currency).symbol;
    const per = rate && rate.rates[buyee.currency];
    $("rateNote").textContent = per
      ? `${sym}1 ≈ ¥${(1 / per).toFixed(2)} (rate from ${new Date(rate.at).toLocaleDateString()}). Buyee gets the prices in yen.`
      : "No exchange rate yet (offline). Switch to ¥ JPY or connect to the internet.";
  }
  const persist = () => { save("buyeeFilters", buyee); updateCount(); markBuyee(); };
  $("cond").addEventListener("change", updateCount);

  for (const box of ["bConditions", "bOptions"]) {
    $(box).addEventListener("click", (e) => {
      const c = e.target.closest(".chip");
      if (!c) return;
      const list = buyee[c.dataset.group];
      const v = c.dataset.value;
      buyee[c.dataset.group] = list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
      c.classList.toggle("on");
      c.setAttribute("aria-pressed", String(c.classList.contains("on")));
      persist();
    });
  }
  for (const [k, id] of Object.entries(PRICE_IDS)) {
    $(id).addEventListener("input", () => { buyee.prices[k] = $(id).value; persist(); });
  }
  $("currency").addEventListener("change", () => { buyee.currency = $("currency").value; persist(); updateRate(); });
  $("sort").addEventListener("change", () => { buyee.sort = $("sort").value; persist(); });
  $("clearBuyee").addEventListener("click", () => { buyee = emptyBuyee(); persist(); showBuyee(); updateRate(); });
  showBuyee();
  markBuyee();
  updateRate();

  $("open").addEventListener("click", async () => {
    const q = await renderQuery();
    if (!q) return flash("Type a product first.");
    const prices = {};
    for (const [k, v] of Object.entries(buyee.prices)) {
      if (!(Number(v) > 0)) continue;
      if (buyee.currency === "JPY") prices[k] = Number(v);
      else if (rate && rate.rates[buyee.currency]) prices[k] = toJpy(v, rate.rates[buyee.currency]);
    }
    if (buyee.currency !== "JPY" && !rate && Object.keys(buyee.prices).some((k) => Number(buyee.prices[k]) > 0)) {
      flash("Prices skipped: no exchange rate. Use ¥ JPY.");
    }
    const conditions = conditionsFor($("cond").value, buyee.conditions);
    openUrl(buyeeUrl(q, { conditions, options: buyee.options, prices, sort: buyee.sort }));
  });

  // theme and internet indicator
  let theme = applyTheme(await load("theme", "dark"));
  $("themeBtn").addEventListener("click", () => { theme = applyTheme(nextTheme(theme)); save("theme", theme); });
  // home-country flag picker (ASEAN). Decorative: only the flag changes.
  let home = findCountry(await load("homeCountry", "THA"));
  const list = $("homeList");
  $("jpFlag").innerHTML = flagSvg(JAPAN);
  const showHome = () => {
    $("homeBtn").innerHTML = flagSvg(home);
    $("homeBtn").title = `Home: ${home.name}`;
    list.innerHTML = ASEAN.map((c) => `<li role="option" tabindex="-1" data-code="${c.code}" aria-selected="${c.code === home.code}" title="${c.name}">${flagSvg(c)}<span>${c.code}</span></li>`).join("");
  };
  const closeList = () => { list.hidden = true; $("homeBtn").setAttribute("aria-expanded", "false"); };
  showHome();
  $("homeBtn").addEventListener("click", (e) => {
    e.stopPropagation();
    list.hidden = !list.hidden;
    $("homeBtn").setAttribute("aria-expanded", String(!list.hidden));
    if (!list.hidden) list.querySelector('[aria-selected="true"]')?.focus();
  });
  list.addEventListener("click", (e) => {
    const li = e.target.closest("li");
    if (!li) return;
    home = findCountry(li.dataset.code);
    save("homeCountry", home.code);
    showHome();
    closeList();
  });
  list.addEventListener("keydown", (e) => {
    const items = [...list.querySelectorAll("li")];
    const i = items.indexOf(document.activeElement);
    if (e.key === "ArrowDown") { e.preventDefault(); items[Math.min(i + 1, items.length - 1)].focus(); }
    if (e.key === "ArrowUp") { e.preventDefault(); items[Math.max(i - 1, 0)].focus(); }
    if (e.key === "Enter" && i >= 0) items[i].click();
  });
  document.addEventListener("click", (e) => { if (!e.target.closest(".home-pick")) closeList(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeList(); });

  let pinned = await load("pinned", false);
  const showPin = () => {
    $("pinBtn").classList.toggle("on", pinned);
    $("pinBtn").setAttribute("aria-pressed", String(pinned));
    $("pinBtn").title = `Keep window on top: ${pinned ? "on" : "off"}`;
  };
  showPin();
  if (pinned) setAlwaysOnTop(true).catch(() => {});
  $("pinBtn").addEventListener("click", async () => {
    pinned = !pinned;
    showPin();
    save("pinned", pinned);
    try { await setAlwaysOnTop(pinned); } catch { flash("Couldn't change keep-on-top."); }
  });

  // ---- start with Windows (power icon). The registry is the source of truth.
  let atStartup = false;
  const showBoot = () => {
    $("bootBtn").classList.toggle("on", atStartup);
    $("bootBtn").setAttribute("aria-checked", String(atStartup));
    $("bootBtn").title = isWindows()
      ? `Open the app when you sign in to Windows: ${atStartup ? "on" : "off"}`
      : "Windows Startup works on Windows only";
  };
  try {
    const registered = await getStartupPath();
    atStartup = Boolean(registered);
    // Folder moved? Point the startup entry at this copy.
    if (registered && registered.toLowerCase() !== currentExePath().toLowerCase()) await setStartup(true);
  } catch { /* leave as off */ }
  showBoot();
  $("bootBtn").addEventListener("click", async () => {
    try {
      await setStartup(!atStartup);
      atStartup = !atStartup;
      showBoot();
      flash(atStartup ? "The app will open when you sign in to Windows." : "The app won't open with Windows any more.");
    } catch (e) { flash(e.message); }
  });

  checkNet();
  setInterval(checkNet, 30000);
  window.addEventListener("online", checkNet);
  window.addEventListener("offline", checkNet);
  $("reset").addEventListener("click", () => {
    $("en").value = ""; $("ja").value = ""; $("ja").classList.remove("edited"); $("src").textContent = ""; $("jaRomaji").textContent = "";
    $("cond").value = ""; $("fmt").value = ""; $("ext").value = "";
    $("cond").dispatchEvent(new Event("change")); $("en").focus();
  });

  renderPresets();
  renderQuery();
  initRomaji().then(() => { product.showRomaji(); renderQuery(); }).catch(() => {
    $("qRomaji").textContent = "Romaji unavailable.";
  });

  // ---- updates: the globe turns into an up-arrow (checked in the background)
  let offered = null; // version already offered this run, so "Later" isn't nagged
  async function offerUpdate() {
    const ok = await ask({
      title: `Update to version ${net.update.version}?`,
      text: "The app will restart. Your current search, presets and filters are kept.",
      yes: "Restart and update",
      no: "Later"
    });
    if (!ok) return;
    clearTimeout(sessionTimer);
    await save("session", {
      en: $("en").value, ja: $("ja").value, edited: $("ja").classList.contains("edited"),
      src: $("src").textContent, cond: $("cond").value, fmt: $("fmt").value, ext: $("ext").value
    });
    flash("Updating…");
    try { await installUpdate(net.update); } catch { flash("Update failed. Try again later."); }
  }
  async function checkUpdates({ manual = false } = {}) {
    if (manual) flash("Checking for updates…");
    const m = await checkForUpdate();
    net.update = m;
    renderNet();
    if (!m) { if (manual) flash(`You're on the latest version (${appVersion()}).`); return; }
    // Found a new version: ask right away the first time, then the arrow waits.
    if (manual || offered !== m.version) { offered = m.version; offerUpdate(); }
  }

  $("net").addEventListener("click", async () => {
    if (!net.update) { await checkNet(); return checkUpdates({ manual: true }); }
    offerUpdate();
  });

  checkUpdates();
  setInterval(checkUpdates, 30 * 60 * 1000);
}

main().catch((e) => {
  console.error(e);
  $("msg").textContent = "Something went wrong: " + e.message;
});
