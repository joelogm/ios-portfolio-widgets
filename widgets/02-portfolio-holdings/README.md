# Portfolio Holdings Widget (Large 4x4)

An iOS Scriptable widget that visualizes your portfolio's individual asset breakdown directly from Google Sheets.

## Features

- **Top 8 Holdings Ranking**: Automatically ranks and displays your top holdings by evaluation amount and percentage.
- **Visual Progress Bars**: Crisp, anti-aliased horizontal progress bars rendered via `DrawContext`.
- **Segmented Allocation Bar**: Top proportion bar displaying the relative weights of your leading assets at a glance.
- **Asset Category Color Badges**:
  - 🟢 Domestic Equities / Broad Index (Kodex 200)
  - 🔵 Global / US Tech & Active ETFs (Time 나스닥, Koact 나스닥, GOOGL, etc.)
  - 🟠 Cryptocurrencies (Bitcoin, Ethereum, Solana)
  - 🟡 Gold / Precious Metals (KRX Gold, GLDM)
  - ⚪ Fixed Income / Cash / Deposits
- **One-Tap Refresh**: Instant re-sync via `↻ 갱신` button.
- **Deep Linking**: Tap anywhere on the widget to open your Google Sheet.

## Configuration

In `widget.js`:
```javascript
const SHEET_CSV_URL = "YOUR_PUBLISHED_HOLDINGS_CSV_URL_HERE";
const SHEET_EDIT_URL = "https://docs.google.com/spreadsheets/d/YOUR_SPREADSHEET_ID/edit#gid=YOUR_TAB_GID";
```

### Google Sheets Setup
1. In Google Sheets, navigate to **File > Share > Publish to the web**.
2. Under **Link**, select your **'포트폴리오 표'** tab.
3. Select **Comma-separated values (.csv)** and copy the generated URL into `SHEET_CSV_URL`.
