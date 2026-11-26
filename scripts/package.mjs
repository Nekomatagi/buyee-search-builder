// After `neu build --release`: makes the files a release needs.
//   release/BuyeeSearch-win-x64.zip  -> what you download and unzip on any PC
//   site/update.json + site/resources.neu -> served by GitHub Pages for self-update
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const cfg = JSON.parse(fs.readFileSync(path.join(root, "neutralino.config.json"), "utf8"));
const dist = path.join(root, "dist", cfg.cli.binaryName);
const pagesBase = (process.env.PAGES_BASE || "").replace(/\/$/, "");

const out = path.join(root, "release");
const site = path.join(root, "site");
const stage = path.join(out, "BuyeeSearch");
for (const d of [out, site]) fs.rmSync(d, { recursive: true, force: true });
fs.mkdirSync(stage, { recursive: true });
fs.mkdirSync(site, { recursive: true });

fs.copyFileSync(path.join(dist, `${cfg.cli.binaryName}-win_x64.exe`), path.join(stage, "BuyeeSearch.exe"));
fs.copyFileSync(path.join(dist, "resources.neu"), path.join(stage, "resources.neu"));
fs.writeFileSync(path.join(stage, "README.txt"),
  "Buyee Search Builder " + cfg.version + "\r\n\r\n" +
  "Keep BuyeeSearch.exe and resources.neu in the same folder.\r\n" +
  "Double-click BuyeeSearch.exe to start. Your presets are saved in the .storage folder here,\r\n" +
  "so you can copy this whole folder to a USB stick or another PC.\r\n" +
  "First run: if Windows shows 'Windows protected your PC', click More info > Run anyway.\r\n");

execFileSync("zip", ["-r", "-q", path.join(out, "BuyeeSearch-win-x64.zip"), "BuyeeSearch"], { cwd: out });

fs.copyFileSync(path.join(dist, "resources.neu"), path.join(site, "resources.neu"));
// Also attached to the GitHub Release: the app's second update source.
fs.copyFileSync(path.join(dist, "resources.neu"), path.join(out, "resources.neu"));
const manifest = {
  applicationId: cfg.applicationId,
  version: cfg.version,
  resourcesURL: `${pagesBase}/resources.neu`,
  data: { released: new Date().toISOString() }
};
fs.writeFileSync(path.join(site, "update.json"), JSON.stringify(manifest, null, 2));
fs.writeFileSync(path.join(site, "index.html"),
  `<!doctype html><meta charset="utf-8"><title>Buyee Search Builder updates</title><p>Update feed for version ${cfg.version}.</p>`);
console.log("Packaged", cfg.version, "->", path.relative(root, out), "and", path.relative(root, site));
