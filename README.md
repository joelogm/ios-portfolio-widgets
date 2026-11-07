# iOS Portfolio Widgets

A small collection of [Scriptable](https://scriptable.app) widgets for iPhone that turn a Google
Sheet into a live, glanceable dashboard — no backend, no API keys, no OAuth.

The sheet stays the single source of truth: it is published to the web as CSV, the widget fetches
that CSV on every refresh, and any edit shows up on the home screen within seconds.

| # | Widget | Shows | File |
| --- | --- | --- | --- |
| 01 | [Asset allocation](widgets/01-asset-allocation/README.md) | Total invested, net asset, YTD and all-time performance; current vs. target weight for each asset class | [`widgets/01-asset-allocation/widget.js`](widgets/01-asset-allocation/widget.js) |

A medium widget, one glance:

- **header** — `▲ PORTFOLIO`, the time of the last render, and a `↻` refresh button,
- **left** — `총 투자 자산` in large type, `순자산`, then `YTD` and `ITD` with both a percentage and
  an amount (losses in blue, gains in red),
- **right** — one row per asset class with its current and target weight, so a drift from the plan
  is visible without opening anything.

## Layout

```
portfolio_widget.js               → symlink to widgets/01-asset-allocation/widget.js
widgets/
  01-asset-allocation/
    widget.js                     the widget — paste this into Scriptable
    README.md                     configuration, sheet layout, troubleshooting
README.md
.gitignore
```

Each widget lives in its own numbered folder with its own `README.md`, so they can be installed,
configured and versioned independently. `portfolio_widget.js` at the root is a symlink for quick
access; the source of truth is the file inside `widgets/`.

## Quick start

1. Install [Scriptable](https://apps.apple.com/app/scriptable/id1405459188) on your iPhone.
2. Open the widget folder you want and read its `README.md` — it lists the constants you have to set
   (a published CSV link at minimum) and the sheet layout it expects.
3. In Scriptable: **+** ▸ paste the code ▸ name it ▸ **▶ Run** to preview.
4. Long-press the home screen ▸ **+** ▸ **Scriptable** ▸ medium size ▸ **Edit Widget** ▸ pick the
   script.

Tapping the `↻` button re-runs the script for an immediate refresh; tapping the rest of the widget
opens the spreadsheet.

## Privacy

- This repository ships with placeholders only — no credentials, no sheet ids, no personal figures.
  Keep your own links in your local copy and out of commits; `.gitignore` already excludes CSV
  exports of a sheet.
- A sheet published to the web is readable by anyone holding the link. Publish only the tab a
  widget needs, and stop publishing when you no longer want it exposed.
- Widgets only read: they never write to the sheet.
- All parsing happens on the device, and each run makes a single HTTP `GET`.

## Adding another widget

Create `widgets/NN-name/` with:

- `widget.js` — the Scriptable script, with every personal value as a constant at the top,
- `README.md` — what it shows, the constants to set, and the sheet layout it expects,

then add a row to the table above. Keep the configuration block at the top of each script so a
reader can see every value they have to change in one place.
