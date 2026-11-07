# Portfolio Holdings Widget (Large 4x4)

An iOS [Scriptable](https://scriptable.app) widget that visualizes your portfolio's full individual asset breakdown directly from Google Sheets.

## Features

- **Full Holdings Overview (Up to 25 Holdings)**: Automatically ranks and displays your portfolio holdings by weight (%) and valuation amount (₩), fitting up to 25 assets on a single screen with an ultra-dense, anti-aliased micro-grid layout.
- **100% Pure Dynamic Parsing (0% Hardcoding)**: Dynamically detects and parses `세부종목` (Holding Name) and `평가금액의 SUM` / `비중` (%) columns from your published CSV. Zero hardcoded tickers, names, or fallback dummy numbers.
- **Smart Offline Caching**: When online, live data is cached locally via `FileManager`. If your network drops (e.g. airplane mode, subway), the widget gracefully reuses the most recent real cache instead of crashing or showing stale dummy data.
- **Unified Emerald Green Theme (`#30D158`)**: Clean, distraction-free Apple Human Interface design with vector-drawn progress bars (`DrawContext`) strictly aligned at the same vertical coordinate.
- **Pixel-Perfect Typography & Alignment**:
  - `#1` ~ `#25` ranks fixed to a single line.
  - Strict left-aligned asset names (`leftAlignText`).
  - Right-aligned percentages and abbreviated amounts (₩M / ₩억).
- **Consistent Header & Quick Actions**:
  - Horizontal header layout with live render timestamp (`14:30 KST`) and `↻ 갱신` button side-by-side (matching Widget 01).
  - Tapping `↻ 갱신` executes an instant re-sync.
  - Tapping anywhere else opens your Google Sheet.

## Configuration

In `widget.js`:

```javascript
// Display limit (Default: 25)
const TOP_COUNT = 25;

// Published CSV URL of '포트폴리오 표' tab
const SHEET_CSV_URL = "YOUR_PUBLISHED_HOLDINGS_CSV_URL_HERE";

// Spreadsheet opened when tapped
const SHEET_EDIT_URL = "https://docs.google.com/spreadsheets/d/YOUR_SPREADSHEET_ID/edit#gid=YOUR_TAB_GID";

// Accent theme color
const THEME_COLOR = "#30D158";
```

### Google Sheets Setup
1. In Google Sheets, navigate to **File > Share > Publish to the web**.
2. Under **Link**, select your **'포트폴리오 표'** tab.
3. Select **Comma-separated values (.csv)** and click **Publish**.
4. Paste the generated URL into `SHEET_CSV_URL`.
