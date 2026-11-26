# Buyee Search Builder

A small Windows app (about 20 MB, no install) that turns a product idea into a Japanese search query for [Buyee](https://buyee.jp).

- Type in English → Japanese appears with **romaji** underneath (DeepL translation, offline romaji).
- Pick condition, format and filter from dropdowns; add your own presets and filters.
- Copy the query or open the search on Buyee directly.
- Updates itself: when a new version is released, the app shows **Update now**.

## Download and run

1. Open the latest release on this repository's **Releases** page and download `BuyeeSearch-win-x64.zip`.
2. Unzip anywhere (desktop, USB stick). Keep `BuyeeSearch.exe` and `resources.neu` together.
3. Double-click `BuyeeSearch.exe`. The first time, Windows may show *Windows protected your PC*: click **More info → Run anyway**.

Your presets, filters and saved words live in the `.storage` folder next to the app. Copy the folder to take everything to another PC.

## One-time repository setup

1. **Settings → Secrets and variables → Actions → New repository secret**: name `DEEPL_API_KEY`, value = your DeepL API key.
2. **Settings → Pages → Build and deployment → Source: GitHub Actions** (this hosts the update feed).
3. The repository must be **public** for the free update feed. Note: the DeepL key is built into the app, so anyone who downloads it can extract the key. Fine for a proof of concept; regenerate the key in DeepL if it's ever abused.

## How releases work

- Every push to `main` runs the tests.
- When `version` in `package.json` is higher than the last release, GitHub Actions also builds the app, checks the DeepL key, publishes a Release with the zip, and updates the feed the app checks for updates.

## How it's built

| Part | What |
|---|---|
| Window | [Neutralinojs](https://neutralino.js.org) 6.10 using Microsoft Edge WebView2 (built into Windows 10/11) |
| Translation | DeepL API, called through Windows' built-in `curl.exe` (WebView2 blocks direct calls to DeepL) |
| Romaji | [kuroshiro](https://github.com/hexenq/kuroshiro) + kuromoji dictionary, fully offline |
| Storage | Neutralino storage (`.storage` folder next to the .exe) |
| Updates | Neutralino updater reading `update.json` from GitHub Pages |

```
resources/        the app (HTML, CSS, JS, romaji dictionary, default lists)
  js/core.js      pure logic, unit-tested
  js/platform.js  everything that touches Windows/Neutralino
  js/app.js       screen behaviour
  data/defaults.json  presets, conditions, formats, filters
scripts/          build helpers (adds key/version, packages release + update feed)
test/             unit tests (npm test)
```

Develop in a browser: `npm run dev`, then open http://localhost:8765 (translation needs the desktop app).
