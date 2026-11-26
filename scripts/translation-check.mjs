// Runs test/translation-criteria.json through DeepL exactly the way the app does,
// with and without the custom instructions, and prints a score table.
// Fails only if DeepL can't be used at all; the score itself is a report.
//   DEEPL_API_KEY=... node scripts/translation-check.mjs
import fs from "node:fs";
import { deeplEndpoint, deeplBody, cleanTranslation, searchClean } from "../resources/js/core.js";

const key = (process.env.DEEPL_API_KEY || "").trim();
if (!key) { console.error("DEEPL_API_KEY is not set."); process.exit(1); }

const { cases } = JSON.parse(fs.readFileSync(new URL("../test/translation-criteria.json", import.meta.url), "utf8"));
const squash = (s) => s.replace(/\s+/g, "").toLowerCase();

async function translate(text, instructions) {
  const r = await fetch(deeplEndpoint(key), {
    method: "POST",
    headers: { Authorization: "DeepL-Auth-Key " + key, "Content-Type": "application/json" },
    body: deeplBody(text, { instructions })
  });
  const body = await r.text();
  if (!r.ok) return { error: `HTTP ${r.status}: ${body.slice(0, 200)}` };
  const raw = JSON.parse(body).translations[0].text;
  return { raw, clean: searchClean(cleanTranslation(raw)) };
}

const modes = [["With instructions", true], ["Without instructions", false]];
const results = {};
for (const [label, on] of modes) {
  results[label] = [];
  for (const c of cases) {
    const t = await translate(c.en, on);
    const pass = !t.error && c.accept.some((a) => squash(a) === squash(t.clean));
    results[label].push({ ...c, ...t, pass });
  }
}

const lines = ["## Translation check", ""];
for (const [label] of modes) {
  const rows = results[label];
  const score = rows.filter((r) => r.pass).length;
  lines.push(`### ${label}: ${score}/${rows.length}`, "", "| English | App output | Raw DeepL | Pass | Wanted |", "|---|---|---|---|---|");
  for (const r of rows) lines.push(`| ${r.en} | ${r.error ? "—" : r.clean} | ${r.error || r.raw} | ${r.pass ? "✅" : "❌"} | ${r.accept[0]} |`);
  lines.push("");
}
const report = lines.join("\n");
console.log(report);
if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, report + "\n");

const withErrors = results["With instructions"].filter((r) => r.error);
const withoutErrors = results["Without instructions"].filter((r) => r.error);
if (withoutErrors.length) { console.error("DeepL failed even without instructions:", withoutErrors[0].error); process.exit(1); }
if (withErrors.length) console.warn("::warning::DeepL refused custom instructions: " + withErrors[0].error + " — the app will fall back to plain translation.");
