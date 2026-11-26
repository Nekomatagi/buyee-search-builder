# Changelog

## 0.4.1 — 2026-11-26

Windows Startup, and a simpler update flow.

- New **Windows Startup** switch (after the pin): opens the app when you sign in to Windows. Per-user (no admin), visible in Task Manager → Startup apps; if you move the app's folder, the startup entry follows the copy you last opened.
- Removed the update-notification permission prompt and Windows notifications: the green up-arrow on the globe already shows when an update is ready, and the app checks in the background.

## 0.4.0 — 2026-11-26

Updates you notice, and your search kept.

- When an update is ready, the globe turns into a green up-arrow. Click it: the app asks "Update to version …?" and, if you agree, restarts on the new version. The old top banner is gone.
- Windows notifications for new versions, only after you allow them. The app asks once ("Get update notifications?"); you can switch them on or off any time at the bottom of the app.
- The app checks for updates on start and every 30 minutes. Clicking the globe checks right away.
- Your last search (English, Japanese, condition, format, filter) comes back when you reopen the app, including after an update.
- Dialogs are built into the app (no browser pop-ups).

## 0.3.2 — 2026-11-26

- Click the home flag (top-right) to pick any of the 11 ASEAN member countries, shown with flag and 3-letter code (THA, BRN, KHM, IDN, LAO, MYS, MMR, PHL, SGP, TLS, VNM). For now it only changes the flag; the rest of the app is the same. Your choice is remembered.

## 0.3.1 — 2026-11-26

Polish.

- The Japanese box keeps a bold frame while it holds your own edit; it goes back to normal when filled automatically (translation, preset, reset).
- Thai and Japanese flags top-right; window title "Buyee Search Builder - 🏠TH-JP✈️".
- New pin button after the globe: keep the window on top of other windows (remembered).
- "Open on Buyee" stays visible at the bottom of the window while scrolling.

## 0.3.0 — 2026-11-26

Buyee's own filters, themes and an internet indicator.

- New section 5, "Buyee filters", matching buyee.jp: item condition (Unused item … Overall poor condition), options (Newly posted, Free delivery within Japan, With pictures, Buyee recommended, Ending within 1 hour, Official authentication, Buy It Now items only) and price range (current and buyout price). They are sent to Buyee in the search address, exactly as buyee.jp does it, and remembered between sessions.
- Prices can be entered in yen or baht; baht are converted to yen with a daily exchange rate (open.er-api.com).
- "Open on Buyee" moved to the bottom of the page and shows how many filters are on.
- Top-left: theme button (dark → paper white → red; the dot shows the next theme's colour) and a globe that turns green when online, red when offline.
- Translation test: "セイコー 自動巻き ジャンク" accepted for "seiko automatic watch junk".

## 0.2.0 — 2026-11-26

Better translations for sourcing.

- DeepL now gets instructions, the way you'd brief a person: "I'm sourcing second-hand goods; give the keywords sellers use in listing titles" (short forms like デジカメ, brand names in katakana, no sentences).
- Translations are cleaned into search words: 用, の, brackets and punctuation are removed.
- If DeepL leaves a word in English (e.g. an unknown brand), the app says so and doesn't save it. Bad entries saved by 0.1.0 are removed on first start.
- If DeepL refuses the instructions (plan limits), the app falls back to plain translation automatically.
- Every build now runs a translation test list (test/translation-criteria.json) through DeepL and shows the score on the GitHub run's Summary page.

## 0.1.0 — 2026-11-26

First version.

- Product box: type English, get Japanese (DeepL) with romaji underneath; type Japanese directly to skip translation; edit the Japanese by hand and the app remembers it.
- Quick presets based on the watchlist categories; add the current product as a preset; remove presets with Edit.
- Selling condition, selling format (with "Any format") and additional filter dropdowns.
- Custom filters: type in English or Japanese, check the Japanese and romaji, add to the filter list.
- Final query with romaji, Copy button and Open on Buyee.
- Saved words, presets and filters are kept in the `.storage` folder next to the app, so the whole folder is portable.
- Self-update: the app checks for a new version on start and installs it with one click.
