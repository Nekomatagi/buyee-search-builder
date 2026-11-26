# Buyee Search Builder

A small Windows app that turns a product idea into the Japanese search that finds it on [Buyee](https://buyee.jp), with Buyee's filters already set.

Type **"surf fishing reel"**, get **投げ釣り リール** (*nagezuri rīru*), add *Used* and まとめ売り from the dropdowns, tick *Free delivery within Japan*, and open the search on Buyee in one click.

- **English → seller Japanese.** DeepL is briefed like a sourcer ("give the keywords sellers use in listing titles"), so you get デジカメ, not デジタルカメラ.
- **Romaji under every Japanese line**, generated offline.
- **Your own presets and filters**, saved next to the app.
- **Buyee's own filters**: item condition, options, and price range in ¥ or ฿.
- **Portable and self-updating**: no install, and it offers each new version when you open it.

## Download

1. Go to [**Releases**](../../releases/latest) and download `BuyeeSearch-win-x64.zip`.
2. Unzip it anywhere (desktop, USB stick). Keep `BuyeeSearch.exe` and `resources.neu` together.
3. Double-click `BuyeeSearch.exe`.

The first time, Windows may show *Windows protected your PC*. Click **More info → Run anyway**. This happens because the app isn't code-signed.

**Requirements:** Windows 10 or 11 (64-bit) with Microsoft Edge WebView2, which both include by default, and an internet connection for translation and Buyee.

## Documentation

| Guide | For |
|---|---|
| [User guide](docs/USER_GUIDE.md) | Every part of the screen, tips, and troubleshooting |
| [Architecture](docs/ARCHITECTURE.md) | How the app works inside: translation pipeline, Buyee filters, storage, updates |
| [Development](docs/DEVELOPMENT.md) | Running, testing, changing and releasing the app |
| [Changelog](CHANGELOG.md) | What changed in each version |

## At a glance

| | |
|---|---|
| App shell | [Neutralinojs](https://neutralino.js.org) 6.10 on Microsoft Edge WebView2 |
| Translation | [DeepL API](https://developers.deepl.com) with custom instructions |
| Romaji | [kuroshiro](https://github.com/hexenq/kuroshiro) + kuromoji dictionary (offline) |
| Exchange rate | [open.er-api.com](https://www.exchangerate-api.com/docs/free) (free, daily) |
| Releases | GitHub Actions → GitHub Releases + GitHub Pages update feed |
| Size | about 20 MB (18 MB is the offline romaji dictionary) |

## Status

Personal proof of concept. The DeepL key is built into the released app, so anyone who downloads it can extract the key. See [Architecture → Security](docs/ARCHITECTURE.md#security).
