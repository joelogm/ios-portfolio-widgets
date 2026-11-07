# 01 · Asset Allocation Widget

A medium-size (2x4) dark Scriptable widget that reads a Google Sheet published as CSV and shows:

- **left** — total invested, net asset, YTD and all-time (ITD) performance,
- **right** — current vs. target weight for each asset class,
- **header** — a `↻` button that re-runs the script, and the time of the last render.

Tapping anywhere else on the widget opens the spreadsheet.

## Features

- **Live from Google Sheets** — reads the `Publish to web` CSV feed of one tab; edit a cell and the
  widget picks it up on the next refresh.
- **No credentials** — nothing to authenticate. The published link is read-only and the widget only
  ever performs a `GET`.
- **Cache-busting** — every request appends a timestamp and `no-store` headers, so you are not
  served Google's CDN copy from a few minutes ago.
- **Layout-tolerant parser** — the summary block is located by its `유형` (type) header instead of a
  hard-coded column, so inserting columns to the left does not break anything.
- **One-tap refresh** — the `↻` button re-invokes the script immediately.
- **Graceful degradation** — if the sheet is unreachable or not configured yet, the widget renders
  placeholders (`—`) instead of failing.
- **Single file, no dependencies** — one `.js` file you can paste into Scriptable.

## Requirements

- iOS 14 or later with the [Scriptable](https://apps.apple.com/app/scriptable/id1405459188) app.
- A Google Sheet containing the summary block described below.

## Setup

### 1. Publish the sheet tab as CSV

1. Open your spreadsheet in Google Sheets.
2. **File ▸ Share ▸ Publish to web**.
3. In the **Link** tab choose the specific sheet (tab) — do not publish the whole document — and
   the format **Comma-separated values (.csv)**.
4. Press **Publish** and copy the generated URL. It looks like:

   ```
   https://docs.google.com/spreadsheets/d/e/2PACX-.../pub?gid=123456789&single=true&output=csv
   ```

5. Keep the link private-ish: anyone with it can read that tab. Publishing only the tab you need
   keeps the rest of the workbook private.

### 2. Configure the script

Open `widget.js` and set the constants at the top:

| Constant | What it is |
| --- | --- |
| `SHEET_CSV_URL` | The published CSV link from step 1. |
| `SHEET_EDIT_URL` | The spreadsheet opened when the widget is tapped. Replace `YOUR_SPREADSHEET_ID` with the id between `/d/` and `/edit`; set it to `""` to disable the tap-through. |
| `ROW_TOTAL_INVESTED` | Row label of the invested-total line (default `투자 총합`). |
| `ROW_GRAND_TOTAL` | Row label of the grand-total line (default `총합`). |
| `CATEGORIES` | Asset classes shown on the right and their dot colours, in display order. |
| `YTD_START_CUM_PROFIT` | Cumulative P&L at the start of the year. `YTD = current cumulative P&L − this`; `0` makes YTD equal the all-time figure. |
| `REFRESH_MINUTES` | Refresh hint passed to iOS (default 15 minutes). |

### 3. Install in Scriptable

1. Open Scriptable, tap **+**, and paste the contents of `widget.js`.
2. Name it something short, e.g. `portfolio` (the name is used by the refresh button).
3. Tap **▶ Run** once — the widget previews as a medium-sized dark card.
4. Long-press the home screen ▸ **+** ▸ **Scriptable** ▸ choose **medium** ▸ add it.
5. Long-press the new widget ▸ **Edit Widget** ▸ pick the script.

Refresh cadence is controlled by iOS; `refreshAfterDate` only suggests a time. For an immediate
update, tap `↻`.

## Expected sheet layout

The parser looks for the first row that contains a cell equal to `유형` (at column F or further
right) and treats that column as `X`. Everything else is read relative to it:

| Row | Read from |
| --- | --- |
| `CATEGORIES` rows (e.g. `미국주식`) | current weight `%` at `X+3`, target weight `%` at `X+4` |
| `투자 총합` | amount at `X+2` (rendered as `₩120.0M`) |
| `총합` | net asset at `X+1`, cumulative P&L at `X+3`, all-time return `%` at `X+4`, YTD return `%` at `X+6` |

A minimal block therefore looks like this:

| 유형 | 순자산 | 투자금액 | 수익금 / 현재 | 수익률 / 목표 | | YTD |
| --- | --- | --- | --- | --- | --- | --- |
| 미국주식 | | | 52.0% | 50% | | |
| 세계주식 | | | 18.0% | 20% | | |
| 암호화폐 | | | 20.0% | 20% | | |
| 금 | | | 10.0% | 10% | | |
| 투자 총합 | | 120000000 | | | | |
| 총합 | 100000000 | | 13300000 | 12.50% | | 4.20% |

Values are expected in KRW; amounts are shortened to millions (`₩120.0M`) and losses are shown in
blue, gains in red — the usual Korean market convention. Change the colours in `createWidget()` if
you prefer the opposite. If no `유형` header is found the parser falls back to column K.

## How it works

1. `fetchSheetData()` requests the published CSV with a cache-busting query string.
2. The CSV is split into rows by a small quote-aware parser.
3. The `유형` header is located, and the summary rows are read relative to that column.
4. `createWidget()` lays the parsed values out on a `ListWidget` — header, two columns, refresh
   button — and hands it to iOS.

All parsing happens on the device. The script has no dependencies and makes exactly one network
request per run.

## Troubleshooting

| Symptom | Likely cause |
| --- | --- |
| Everything shows `—` | `SHEET_CSV_URL` still holds the placeholder, or the tab is not published. |
| Values are a few minutes stale | Google's CDN cache. Tap `↻`; the request already sends a cache-buster. |
| Right column is empty | No `유형` header found, or the asset-class names differ from `CATEGORIES`. |
| `YTD` equals all-time P&L | Set `YTD_START_CUM_PROFIT` to last year's closing cumulative P&L. |
| Amounts show the wrong scale | Amounts are divided by `1e6`; adjust the formatting in `fetchSheetData()` for other currencies. |
