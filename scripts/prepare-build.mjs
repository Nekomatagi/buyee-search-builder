// Writes build-time values into neutralino.config.json before `neu build`.
// Used by CI only; the committed config keeps these empty.
//   DEEPL_API_KEY  - DeepL key (GitHub secret)
//   APP_VERSION    - e.g. 0.2.0 (from the git tag)
//   UPDATE_URL     - where the app checks for updates
import fs from "node:fs";

const file = new URL("../neutralino.config.json", import.meta.url);
const cfg = JSON.parse(fs.readFileSync(file, "utf8"));

const key = (process.env.DEEPL_API_KEY || "").trim();
const version = (process.env.APP_VERSION || cfg.version).replace(/^v/, "");
const updateUrl = (process.env.UPDATE_URL || "").trim();

if (!/^\d+\.\d+\.\d+$/.test(version)) throw new Error(`Bad version: ${version}`);
if (!key) console.warn("WARNING: DEEPL_API_KEY is empty; translation will be off in this build.");

cfg.version = version;
cfg.globalVariables = { ...cfg.globalVariables, DEEPL_KEY: key, UPDATE_URL: updateUrl };
fs.writeFileSync(file, JSON.stringify(cfg, null, 2) + "\n");
console.log(`Prepared build ${version}; DeepL key ${key ? "set" : "missing"}; updates ${updateUrl || "off"}.`);
