# Architecture

## Overview

```
┌─────────────────────────── BuyeeSearch.exe (Neutralino) ───────────────────────────┐
│  WebView2 window  ──  resources.neu (HTML/CSS/JS, romaji dictionary, defaults)     │
│                                                                                     │
│  app.js ── screen behaviour                                                         │
│    ├─ core.js ──── pure logic (query, Buyee URL, DeepL request/response, cleanup)   │
│    ├─ romaji.js ── kuroshiro + kuromoji, offline                                    │
│    └─ platform.js ─ Neutralino: storage, curl.exe, clipboard, open URL, updater     │
└─────────────────────────────────────────────────────────────────────────────────────┘
        │ curl.exe                    │ fetch                         │ fetch
        ▼                             ▼                               ▼
   DeepL API                  open.er-api.com               GitHub Pages update.json
   (translation)              (JPY→THB rate)                (self-update feed)
```

Only `platform.js` knows about Neutralino. Everything else also runs in a normal browser (`npm run dev`), where storage falls back to `localStorage` and translation is disabled.

## Files

| Path | Role |
|---|---|
| `resources/index.html`, `styles.css` | Screen and the three themes (`data-theme` = `dark`, `paper`, `red`) |
| `resources/js/app.js` | Wires the screen together |
| `resources/js/core.js` | Pure, unit-tested logic |
| `resources/js/platform.js` | Native features through Neutralino |
| `resources/js/romaji.js` | Japanese → romaji |
| `resources/js/flags.js` | ASEAN and Japan flags (drawn SVG; Windows has no flag emojis) |
| `resources/data/defaults.json` | Default presets, conditions, formats, filters |
| `resources/dict/` | kuromoji dictionary (18 MB) |
| `resources/js/vendor/` | Neutralino client, kuroshiro, analyzer (pinned versions) |
| `neutralino.config.json` | App id, window, allowed native APIs, build-time variables |
| `scripts/` | Build, packaging and translation-check scripts |
| `test/` | Unit tests and translation criteria |

## Translation pipeline

```
English input
  ├─ contains Japanese?        → use as typed
  ├─ in saved words?           → use saved (no DeepL call)
  └─ DeepL /v2/translate (source EN, target JA, context, custom_instructions)
        ├─ HTTP 400/403 with instructions → retry once without them (and stop sending them this session)
        ├─ cleanTranslation()  → drop trailing punctuation
        ├─ searchClean()       → brackets/punctuation → spaces; 用/の/と between words → space
        └─ still no Japanese?  → show "DeepL kept it in English", don't save
           otherwise           → save to words, show
```

**Why curl.exe?** WebView2 enforces CORS, and DeepL's API doesn't allow calls from web pages. The app writes the JSON body to a temp file (so Japanese text never passes through the command line) and runs Windows' built-in `curl.exe` through `Neutralino.os.execCommand`.

**Custom instructions** live in `DEEPL_INSTRUCTIONS` in `core.js` (DeepL allows up to 10, each up to 300 characters). They're the main lever for translation quality; see [Development → Tuning translations](DEVELOPMENT.md#tuning-translations).

## Buyee search address

The app reproduces how buyee.jp encodes its search filters (observed November 2026):

```
https://buyee.jp/item/search/query/<query>?<filters>&translationType=98
```

| Filter | Parameter | Value |
|---|---|---|
| Item condition | `item_status` | comma list: `1` Unused, `3` Close to unused, `4` No noticeable scratches, `5` Slight scratches, `6` Visible scratches, `7` Overall poor |
| Newly posted | `new` | `1` |
| Free delivery within Japan | `freeshipping` | `1` |
| With pictures | `thumbnail` | `1` |
| Buyee recommended | `goodSellers` | `1` |
| Ending within 1 hour | `one_hour_to_finish` | `1` |
| Official authentication | `isAppraisal` | `1` |
| Buy It Now only | `buynow` | `1` |
| Current price (¥) | `aucminprice`, `aucmaxprice` | integer yen |
| Buyout price (¥) | `aucmin_bidorbuy_price`, `aucmax_bidorbuy_price` | integer yen |
| Sort | `sort`, `order` | `recommended/recommended`, price `cbids` a/d, bids `bids` (**a = high→low**, d = low→high), ending `end/a`, newest `end/d`, buyout `bidorbuy` a/d, popular `score` (no order) |
| Search as typed | `translationType` | `98` (Direct Search, no auto-translate) |

If Buyee changes these names, update `BUYEE_CONDITIONS`, `BUYEE_OPTIONS` and `PRICE_PARAMS` in `core.js` and the matching test.

## Storage

Neutralino storage, kept in `.storage/` next to the exe (portable).

| Key | Content |
|---|---|
| `words` | `{ normalisedEnglish: japanese }`, your saved translations |
| `presets` | `[{ en, ja }]` |
| `filters` | custom additional filters `[{ en, ja }]` |
| `buyeeFilters` | `{ conditions, options, currency, prices }` |
| `fxRates` | `{ rates: { THB, USD }, at }`, units per yen, refreshed every 12 hours |
| `backWords` | cache of query → English back-translations (last 200) |
| `theme` | `dark`, `paper` or `red` |
| `pinned` | keep-on-top on/off |
| `homeCountry` | 3-letter code of the home flag, e.g. `THA` |
| `session` | last search: `{ en, ja, edited, src, cond, fmt, ext }` |

## Updates

The app asks two places at once and takes the newest version, so one failing never strands it:

| Source | Address | Install |
|---|---|---|
| GitHub Pages | `NL_UPDATE_URL` (`https://<owner>.github.io/<repo>/update.json`) | Neutralino's updater writes `resources.neu` |
| Latest GitHub Release | `NL_RELEASES_URL` (`api.github.com/repos/<repo>/releases/latest`) | `curl.exe` downloads the release's `resources.neu` to `resources.neu.download`, then it's moved over the old file |

1. It checks on start, every 30 minutes, and when the globe is clicked.
2. When a newer version is found, it asks right away (once per version per run); after **Later**, the globe stays a green up-arrow.
3. **Restart and update** saves the current search, installs, and restarts.

Only `resources.neu` is updated. The exe itself changes only when the Neutralino version changes, which needs a fresh download from Releases. The Pages route exists because Neutralino's updater runs `fetch` inside the page, which needs CORS; the release route avoids that by downloading with `curl.exe`. The API answer itself does allow CORS. Releases before 0.4.4 have no `resources.neu` attached, so they're ignored by the second route.

## Start with Windows

The **Windows Startup** switch writes or deletes the value `BuyeeSearchBuilder` under `HKCU\Software\Microsoft\Windows\CurrentVersion\Run` with `reg.exe` (per-user, no admin). The value is `"<exe>" --path="<folder>"`: Windows starts sign-in programs from System32, so `--path` tells Neutralino where `resources.neu` and `.storage` are. The registry is the source of truth; nothing is stored in `.storage`. On every start, if the value points to a different folder, it's rewritten to the running copy.

**Why not Program Files?** Self-update replaces `resources.neu` next to the exe, and programs in Program Files can't write there without admin rights. The portable folder keeps updates silent.

## Build-time variables

Set by `scripts/prepare-build.mjs` in CI and exposed to the page as `NL_*` globals:

| Variable | Source |
|---|---|
| `NL_APPVERSION` | `package.json` version |
| `NL_DEEPL_KEY` | `DEEPL_API_KEY` repository secret |
| `NL_UPDATE_URL` | GitHub Pages address of this repository |
| `NL_RELEASES_URL` | GitHub API address of this repository's latest release |

## Security

- **DeepL key:** built into `resources.neu`, which is a plain archive. Anyone with the release can extract it. This is accepted for a proof of concept. If it's abused, generate a new key in DeepL, update the `DEEPL_API_KEY` secret, and release a new version. A production version should send translations through a small server that holds the key.
- **Native access** is limited by `nativeAllowList` in `neutralino.config.json` (storage, clipboard, temp files, `os.execCommand` for curl, `os.open` for links, updater file write).
- **Text from outside** (DeepL output, stored data) is always inserted as text, never as HTML.
