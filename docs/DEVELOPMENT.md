# Development

## Setup

Requires Node.js 22 and Python 3 (for the dev server).

```bash
npm install
npm test          # unit tests, including romaji checks
npm run dev       # serves resources/ at http://localhost:8765
```

In the browser, everything works except translation (that needs the desktop app's curl bridge). Storage uses `localStorage` there.

## Running the desktop app locally

```bash
# one-time: put Neutralino 6.10.0 binaries in bin/
curl -sSL -o nl.zip https://github.com/neutralinojs/neutralinojs/releases/download/v6.10.0/neutralinojs-v6.10.0.zip
unzip -o nl.zip -d bin && rm nl.zip

DEEPL_API_KEY=your-key:fx node scripts/prepare-build.mjs   # writes the key into neutralino.config.json
npx neu run
git checkout neutralino.config.json                          # never commit the key
```

## Tests

| Command | What it checks |
|---|---|
| `npm test` | `test/core.test.mjs` (logic) and `test/romaji.test.mjs` (romaji output) |
| `DEEPL_API_KEY=... node scripts/translation-check.mjs` | Runs `test/translation-criteria.json` through DeepL with and without instructions and prints a score table |

### Tuning translations

1. Add or change cases in `test/translation-criteria.json` (`en` plus a list of accepted answers; spaces are ignored).
2. Change `DEEPL_INSTRUCTIONS` in `resources/js/core.js` (max 10, each 300 characters or fewer; a unit test enforces this).
3. Open a pull request. The **translation** job posts both score tables to the run's **Summary** page.

## Releasing

Releases are automatic. `.github/workflows/release.yml` has three jobs:

| Job | Runs on | Does |
|---|---|---|
| `test` | every push and pull request | `npm ci`, `npm test`, decides whether to release |
| `translation` | every push and same-repo pull request | DeepL score report (fails only if DeepL can't be used at all) |
| `release` | push to `main` when the `package.json` version has no tag yet | builds, checks the DeepL key, publishes the GitHub Release (`vX.Y.Z` + zip) and the GitHub Pages update feed |

To ship a version:

1. Bump `version` in `package.json` (and run `npm install --package-lock-only`).
2. Add a section to `CHANGELOG.md`.
3. Open a pull request, check the `test` and `translation` results, then merge.
4. Installed apps show **Update now** within one start.

Pushing to `main` without bumping the version runs the tests only.

### Repository settings (one-time)

- **Secret** `DEEPL_API_KEY`: Settings → Secrets and variables → Actions.
- **Pages** source: Settings → Pages → Build and deployment → **GitHub Actions**.
- The repository must stay **public** for the free Pages update feed.

## Common changes

| Change | Where |
|---|---|
| Default presets, conditions, formats, filters | `resources/data/defaults.json` (first item of each dropdown must have `"ja": ""`) |
| Buyee filters | `BUYEE_CONDITIONS`, `BUYEE_OPTIONS`, `PRICE_PARAMS` in `core.js` |
| Themes | `[data-theme=...]` blocks in `styles.css` and `THEMES` in `core.js` |
| Allowed native APIs | `nativeAllowList` in `neutralino.config.json` |
| Neutralino version | `cli.binaryVersion`/`clientVersion` in the config, `NEUTRALINO_VERSION` in the workflow, `@neutralinojs/lib` in `package.json`, then copy `node_modules/@neutralinojs/lib/dist/neutralino.js` to `resources/js/vendor/` |

## Conventions

- Logic goes in `core.js` with a unit test; only `platform.js` touches Neutralino.
- Text from DeepL, storage or the network is inserted with `textContent`, never `innerHTML`.
- Keep the release zip portable: no installers and no registry writes.
