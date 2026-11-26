# Changelog

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
