# User guide

The screen runs top to bottom in the order you build a search: product, then conditions, then Buyee's filters, then **Open on Buyee**.

## Top-left icons

| Icon | What it does |
|---|---|
| Coloured dot | Switches theme: **Dark → Paper white → Red**. The dot shows the colour of the *next* theme. Your choice is remembered. |
| Globe | **Green dot:** online. **Red dot:** offline, so translation, the exchange rate and Buyee won't work. Checked every 30 seconds. **Green up-arrow:** an update is ready; click it to restart on the new version. Clicking the globe otherwise checks for updates now. |
| Pin | **Keep on top:** the window stays above other windows (handy next to your browser). Click again to turn off. Remembered. |
| Windows Startup | Switch: when it's green, the app opens when you sign in to Windows. No admin rights needed; it appears in Task Manager → Startup apps. If you move the app's folder, open it once from the new place and the setting follows. |

The flags top-right show your home country and Japan. Click the home flag to choose any ASEAN member country; for now this only changes the flag.

**Tip:** to start the app from the taskbar, run it once, right-click its taskbar icon and choose **Pin to taskbar**.

**Several copies?** Each copy of the app (desktop, USB stick) checks for updates itself and shows the arrow when it's behind, so whichever copy you open can be brought up to date.

## 1. Product

- **English box:** type the product. After a short pause (or when you press **Enter**), the Japanese appears underneath with romaji in grey.
- **Typing Japanese directly** skips translation. Use this when you've found a keyword you like on Buyee.
- **Japanese box:** you can edit the translation. While it holds your own edit it has a bold frame, and the app remembers your version for that English word from then on.
- The small label on the right says where the Japanese came from:

| Label | Meaning |
|---|---|
| DeepL | Freshly translated |
| Saved word | From your saved words (no DeepL call) |
| Preset | From a quick preset |
| Typed in Japanese | You typed Japanese |
| Edited | You changed the Japanese by hand |
| DeepL kept it in English… | DeepL didn't know the word (often a brand). Type the Japanese if you know it. Nothing is saved. |

### Quick presets

- Click a preset to fill the product.
- **+ Add current** saves the product you're on as a preset.
- **Edit** shows a × on each preset; click a preset to remove it. Click **Done** to finish.

## 2–4. Selling condition, format, additional filter

These add Japanese words to the search. They start at **Any** / **None** for the broadest results; anything you change keeps a bold frame so you can see it at a glance (the same goes for Buyee's sort, currency and price boxes).

| Dropdown | Examples |
|---|---|
| Selling condition | 中古 (used), 稼働品 (running, for watches), ジャンク (junk), 美品 (excellent) |
| Selling format | Any format, 1円 (¥1-start auction), まとめ売り (bulk lot), セット (set) |
| Additional filter | 本体のみ (unit only), 箱付き (with box), 部品取り (for parts), plus your own |

**+ Add custom filter:** type a filter in English or Japanese, check the Japanese and romaji, then click **Add filter**. It's added to the list and selected.

## Your Japanese search query

The finished query, with romaji underneath and, below that, its meaning in English (translated back by DeepL). **Copy Japanese query** copies it for pasting into Buyee's search bar. **Reset** clears the product and dropdowns.

## 5. Buyee filters

These are Buyee's own search settings. They're sent to Buyee when you click **Open on Buyee**; they're **not** part of the copied text.

- **Item condition:** Unused item, Close to unused, No noticeable scratches or stains, Slight scratches or stains, Visible scratches or stains, Overall poor condition. Pick any number.
- **Options:** Newly posted, Free delivery within Japan, With pictures, Buyee recommended, Ending within 1 hour, Official authentication, Buy It Now items only.
- **Sort results:** the same orders as buyee.jp. Default: **No. of Bids: High to Low**.
- **Price range:** current price and buyout price, min and max. Choose **฿ THB** (default), **$ USD** or **¥ JPY**. Baht and dollars are converted to yen with a daily exchange rate, shown under the prices.
- **Clear** removes all Buyee filters. Your filters are remembered between sessions.

## Open on Buyee

The orange button, always visible at the bottom of the window, opens the search on Buyee (Yahoo! Auctions) in your browser, with all filters applied. It shows how many Buyee filters are on.

## Your data

Presets, custom filters, saved words, Buyee filters and theme are stored in the **`.storage`** folder next to `BuyeeSearch.exe`. Copy the whole folder to move everything to another PC or a USB stick.

## Updates

- The app checks for a new version when it starts and every 30 minutes.
- When one is ready, the globe turns into a **green up-arrow**. Click it, choose **Restart and update**, and the app restarts on the new version.
- Your presets, filters, saved words and **your last search** are kept.

## Your last search

Whatever you were searching for (English, Japanese, condition, format and filter) is restored when you open the app again.

## Troubleshooting

| Problem | Fix |
|---|---|
| *Windows protected your PC* | Click **More info → Run anyway**. Only the first time. |
| Globe dot is red | Check your internet connection. Typed Japanese, presets and Copy still work offline. |
| "DeepL rejected the API key" | The key in this build was changed or removed. A new release with the current key fixes it. |
| "Your DeepL monthly character allowance is used up" | Wait for the monthly reset, or upgrade the DeepL plan. Saved words keep working. |
| A translation is wrong | Fix the Japanese box by hand; the app remembers your version. |
| Romaji says "unavailable" | `resources.neu` is missing or damaged. Unzip the release again. |
| Prices in ฿ are ignored | No exchange rate yet (offline). Switch to ¥ JPY or connect to the internet. |
