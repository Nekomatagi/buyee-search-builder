// Everything that touches Neutralino lives here, so the rest of the app also
// runs in a plain browser for development (storage falls back to localStorage,
// translation reports that it needs the desktop app).

import { curlCommand, deeplBody, parseCurlOutput, cleanTranslation, isNewer } from "./core.js";

export const isDesktop = typeof window.Neutralino !== "undefined" && typeof window.NL_PORT !== "undefined";

export async function initPlatform() {
  if (!isDesktop) return;
  Neutralino.init();
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

export async function translateWithDeepL(text) {
  if (!isDesktop) throw new Error("Translation works in the desktop app.");
  const key = globalVar("DEEPL_KEY");
  if (!key) throw new Error("This build has no DeepL key.");
  const tmp = await Neutralino.os.getPath("temp");
  const windows = window.NL_OS === "Windows";
  const bodyFile = `${tmp}${windows ? "\\" : "/"}buyee-deepl-${Date.now()}.json`;
  await Neutralino.filesystem.writeFile(bodyFile, deeplBody(text));
  try {
    const r = await Neutralino.os.execCommand(curlCommand({ key, bodyFile, windows }));
    if (r.exitCode !== 0 && !r.stdOut) throw new Error(r.stdErr.trim() || "Could not reach DeepL.");
    const { text: ja } = parseCurlOutput(r.stdOut);
    return cleanTranslation(ja);
  } finally {
    Neutralino.filesystem.remove(bodyFile).catch(() => {});
  }
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
