// Everything that touches Neutralino lives here, so the rest of the app also
// runs in a plain browser for development (storage falls back to localStorage,
// translation reports that it needs the desktop app).

import { curlCommand, deeplBody, parseCurlOutput, cleanTranslation, searchClean, isNewer } from "./core.js";

export const isDesktop = typeof window.Neutralino !== "undefined" && typeof window.NL_PORT !== "undefined";

export const APP_TITLE = "Buyee Search Builder - 🏠TH-JP✈️";

export async function initPlatform() {
  if (!isDesktop) return;
  Neutralino.init();
  Neutralino.window.setTitle(APP_TITLE).catch(() => {});
  Neutralino.events.on("windowClose", () => Neutralino.app.exit());
}

export const appVersion = () => (isDesktop ? window.NL_APPVERSION : "dev");
const globalVar = (name) => (isDesktop && window["NL_" + name]) || "";

// ---- storage (portable: Neutralino keeps it in .storage next to the .exe)
export async function load(key, fallback) {
  try {
    const raw = isDesktop ? await Neutralino.storage.getData(key) : localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export async function save(key, value) {
  const raw = JSON.stringify(value);
  try {
    if (isDesktop) await Neutralino.storage.setData(key, raw);
    else localStorage.setItem(key, raw);
  } catch (e) {
    console.error("save failed", key, e);
  }
}

// ---- DeepL (through curl.exe: WebView2 blocks direct calls to DeepL)
export function hasDeepLKey() {
  return Boolean(globalVar("DEEPL_KEY"));
}

// Instructions are used unless DeepL refuses them (e.g. not on this plan);
// after one refusal the app stops sending them for the rest of the session.
let useInstructions = true;

async function callDeepL(text, instructions) {
  const key = globalVar("DEEPL_KEY");
  const tmp = await Neutralino.os.getPath("temp");
  const windows = window.NL_OS === "Windows";
  const bodyFile = `${tmp}${windows ? "\\" : "/"}buyee-deepl-${Date.now()}.json`;
  await Neutralino.filesystem.writeFile(bodyFile, deeplBody(text, { instructions }));
  try {
    const r = await Neutralino.os.execCommand(curlCommand({ key, bodyFile, windows }));
    if (r.exitCode !== 0 && !r.stdOut) throw new Error(r.stdErr.trim() || "Could not reach DeepL.");
    return parseCurlOutput(r.stdOut).text;
  } finally {
    Neutralino.filesystem.remove(bodyFile).catch(() => {});
  }
}

export async function translateWithDeepL(text) {
  if (!isDesktop) throw new Error("Translation works in the desktop app.");
  if (!globalVar("DEEPL_KEY")) throw new Error("This build has no DeepL key.");
  let ja;
  try {
    ja = await callDeepL(text, useInstructions);
  } catch (e) {
    if (!useInstructions || ![400, 403].includes(e.status)) throw e;
    useInstructions = false;
    ja = await callDeepL(text, false);
  }
  return searchClean(cleanTranslation(ja));
}

// ---- Windows notification (only called after the user allowed it in the app)
export async function notify(title, body) {
  if (!isDesktop) return false;
  await Neutralino.os.showNotification(title, body, "INFO");
  return true;
}

// ---- window
export async function setAlwaysOnTop(on) {
  if (isDesktop) await Neutralino.window.setAlwaysOnTop(Boolean(on));
}

// ---- clipboard and links
export async function copyText(text) {
  if (isDesktop) return Neutralino.clipboard.writeText(text);
  return navigator.clipboard.writeText(text);
}

export function openUrl(url) {
  if (isDesktop) return Neutralino.os.open(url);
  window.open(url, "_blank", "noopener");
}

// ---- self-update from GitHub Releases
export async function checkForUpdate() {
  const url = globalVar("UPDATE_URL");
  if (!isDesktop || !url) return null;
  try {
    const manifest = await Neutralino.updater.checkForUpdates(url);
    return manifest && isNewer(manifest.version, appVersion()) ? manifest : null;
  } catch {
    return null;
  }
}

export async function installUpdate() {
  await Neutralino.updater.install();
  await Neutralino.app.restartProcess();
}
