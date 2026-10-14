# GMD Personal Site

Local Node.js personal homepage with an interactive racing portrait and workstation records. Uses Node's built-in HTTP server and JSON file storage; no MongoDB or production npm dependencies.

## Run

```bash
cd /data_new/gongmingdao/code/web/gmd_personal_site
npm start
```

The default is `0.0.0.0:8765`. From another computer on a reachable LAN, open `http://172.18.36.70:8765/` if that is still this server's address. Host firewall and network routing must allow the port. An occupied port can be changed with `PORT=8766 npm start`. Stop with Ctrl+C.

For local-only use:

```bash
HOST=127.0.0.1 PORT=8765 npm start
```

This site has no authentication. LAN access exposes workstation records to anyone who can reach the port; do not publish it to the public Internet without authentication. The API is same-origin, so opening the website from another LAN computer does not require CORS headers.

## Pages and Data

- `/`: racing homepage; hover over the helmet to reveal the face. The face button toggles the whole portrait and supports keyboard/touch.
- `/#work`: four selected publications linked to their individual Google Scholar records, plus a Scholar profile link. Bibliography and citation counts use the supplied profile snapshot, not a live Scholar feed. Missing citation counts are omitted, not shown as zero.
- `/#activity`: month statistics, selectable daily calendar, 24-hour timeline and interval list.
- `/workstation.html#activity`: full analytics with custom date range, charts and daily detail.
- `/workstation.html?date=2026-09-03#activity`: directly select a recorded day.
- `/api/workstation`: reads `../ha_workstation_daily_duration.json` on each request. No writes, migration or database connection.

Reload the page after the collector updates the JSON file. Monthly daily averages include zero-duration recorded days and exclude dates with no records. Dates and intervals are interpreted in Beijing time, independently of the browser timezone. A next-day midnight endpoint is displayed as `24:00`. Open intervals use the stored collection cutoff; the webpage does not invent unrecorded minutes or change the collector's calculation rules.

## Assets

The homepage uses `public/assets/gmd-race-face.png` and `gmd-race-helmet.png`, both 1024 x 1536 transparent AI-generated portraits. The older handheld-helmet image is not used. See [ASSETS.md](ASSETS.md) for references and generation notes. All fonts, icons and images are served locally. The Chinese UI font contains a subset of the current page text; newly added Chinese characters may need the subset refreshed on systems without Chinese fonts.

## Checks

```bash
npm run check
npm test
```

Browser acceptance checks completed with Chromium: desktop/mobile widths 320 through 1920, mouse lens, keyboard and touch toggle, modal navigation, month totals against the JSON, daily intervals, zero vs missing data, detail deep links, seven-day ranges in a non-Beijing timezone, midnight endpoints, failed-load retry and empty data. The original JSON file is unchanged.
