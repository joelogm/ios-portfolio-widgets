// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: blue; icon-glyph: chart-pie;

/**
 * Real-time portfolio & asset-allocation widget for iOS Scriptable.
 *
 * Reads a Google Sheet that is published to the web as CSV and renders a
 * medium-size (2x4) dark widget:
 *   left  — total invested, net asset, YTD and all-time P&L
 *   right — current vs. target weight for each asset class
 *
 * Tap the ↻ button in the header to re-run the script and refresh right away;
 * tap anywhere else to open the spreadsheet.
 */

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

// 1. Published CSV link of the sheet.
//    Google Sheets ▸ File ▸ Share ▸ Publish to web ▸ pick the tab ▸ CSV
const SHEET_CSV_URL = "YOUR_PUBLISHED_CSV_URL_HERE";

// 2. Spreadsheet opened when the widget is tapped.
//    Keep the id part (the long string between /d/ and /edit) of your sheet URL.
const SHEET_EDIT_URL = "https://docs.google.com/spreadsheets/d/YOUR_SPREADSHEET_ID/edit";

// 3. Row labels of the summary table in the sheet.
const ROW_TOTAL_INVESTED = "투자 총합";
const ROW_GRAND_TOTAL = "총합";

// 4. Asset classes shown on the right, in display order, with their dot colour.
const CATEGORIES = [
  { name: "미국주식", col: "#4285F4" },
  { name: "세계주식", col: "#34A853" },
  { name: "암호화폐", col: "#F7931A" },
  { name: "금",       col: "#FFD700" }
];

// 5. Cumulative P&L at the start of the current year, in the sheet's currency.
//    YTD = current cumulative P&L − this number. 0 means YTD = all-time P&L.
const YTD_START_CUM_PROFIT = 0;

// 6. Refresh hint in minutes (iOS decides the actual cadence on its own).
const REFRESH_MINUTES = 15;

// ---------------------------------------------------------------------------

const widget = await createWidget();
Script.setWidget(widget);
if (!config.runsInWidget) {
  await widget.presentMedium();
}
Script.complete();

async function createWidget() {
  const w = new ListWidget();
  w.backgroundColor = new Color("#16171a");
  w.setPadding(13, 16, 13, 16);

  // Live data from the published sheet
  const d = await fetchSheetData();

  // Header row
  const headerRow = w.addStack();
  headerRow.layoutHorizontally();

  const titleText = headerRow.addText("▲ PORTFOLIO");
  titleText.font = Font.boldSystemFont(10);
  titleText.textColor = new Color("#FF5555");

  headerRow.addSpacer();

  const timeText = headerRow.addText(formatCurrentTime());
  timeText.font = Font.systemFont(9);
  timeText.textColor = new Color("#8E8E93");

  headerRow.addSpacer(6);

  // Refresh button: re-invokes the script so the sheet is re-read immediately
  const refreshBtn = headerRow.addStack();
  refreshBtn.backgroundColor = new Color("#2C2C2E");
  refreshBtn.cornerRadius = 4;
  refreshBtn.setPadding(2, 6, 2, 6);

  const scriptName = Script.name() || "portfolio_widget";
  refreshBtn.url = "scriptable:///run?scriptName=" + encodeURIComponent(scriptName);

  const refreshText = refreshBtn.addText("↻ 갱신");
  refreshText.font = Font.boldSystemFont(8);
  refreshText.textColor = new Color("#FFFFFF");

  w.addSpacer(5);

  // Body: two columns
  const bodyRow = w.addStack();
  bodyRow.layoutHorizontally();

  // Left: total invested, net asset, performance
  const leftCol = bodyRow.addStack();
  leftCol.layoutVertically();

  const totalLabel = leftCol.addText("총 투자 자산");
  totalLabel.font = Font.systemFont(10);
  totalLabel.textColor = new Color("#8E8E93");

  leftCol.addSpacer(1);

  const totalValue = leftCol.addText(d.totalInvested);
  totalValue.font = Font.boldSystemFont(20);
  totalValue.textColor = new Color("#FFFFFF");

  leftCol.addSpacer(2);

  const subLabel = leftCol.addText(`순자산 ${d.netAsset}`);
  subLabel.font = Font.systemFont(9);
  subLabel.textColor = new Color("#A1A1A6");

  leftCol.addSpacer(5);

  // 1. YTD
  const ytdRow = leftCol.addStack();
  ytdRow.layoutHorizontally();

  const ytdTag = ytdRow.addText("YTD ");
  ytdTag.font = Font.boldSystemFont(9);
  ytdTag.textColor = new Color("#8E8E93");

  const ytdPct = ytdRow.addText(d.ytdReturn);
  ytdPct.font = Font.boldSystemFont(9);
  ytdPct.textColor = d.ytdReturn.startsWith("-") ? new Color("#5E9BFF") : new Color("#FF453A");

  const ytdDot = ytdRow.addText(" · ");
  ytdDot.font = Font.systemFont(9);
  ytdDot.textColor = new Color("#636366");

  const ytdAmt = ytdRow.addText(d.ytdProfit);
  ytdAmt.font = Font.boldSystemFont(9);
  ytdAmt.textColor = d.ytdProfit.startsWith("-") ? new Color("#5E9BFF") : new Color("#FF453A");

  leftCol.addSpacer(2);

  // 2. All-time
  const itdRow = leftCol.addStack();
  itdRow.layoutHorizontally();

  const itdTag = itdRow.addText("ITD ");
  itdTag.font = Font.boldSystemFont(9);
  itdTag.textColor = new Color("#8E8E93");

  const itdPct = itdRow.addText(d.totalReturn);
  itdPct.font = Font.boldSystemFont(9);
  itdPct.textColor = d.totalReturn.startsWith("-") ? new Color("#5E9BFF") : new Color("#FF453A");

  const itdDot = itdRow.addText(" · ");
  itdDot.font = Font.systemFont(9);
  itdDot.textColor = new Color("#636366");

  const itdAmt = itdRow.addText(d.totalProfit);
  itdAmt.font = Font.boldSystemFont(9);
  itdAmt.textColor = d.totalProfit.startsWith("-") ? new Color("#5E9BFF") : new Color("#FF453A");

  bodyRow.addSpacer(14);

  // Right: current vs. target weight per asset class
  const rightCol = bodyRow.addStack();
  rightCol.layoutVertically();

  const rightHeader = rightCol.addStack();
  rightHeader.layoutHorizontally();

  const colName = rightHeader.addText("유형");
  colName.font = Font.boldSystemFont(9);
  colName.textColor = new Color("#8E8E93");

  rightHeader.addSpacer();

  const colCur = rightHeader.addText("현재");
  colCur.font = Font.boldSystemFont(9);
  colCur.textColor = new Color("#D1D1D6");

  rightHeader.addSpacer(8);

  const colTgt = rightHeader.addText("목표");
  colTgt.font = Font.boldSystemFont(9);
  colTgt.textColor = new Color("#8E8E93");

  rightCol.addSpacer(4);

  for (const c of d.categories) {
    const row = rightCol.addStack();
    row.layoutHorizontally();

    const dot = row.addText("• ");
    dot.font = Font.boldSystemFont(10);
    dot.textColor = new Color(c.col);

    const nameTxt = row.addText(c.name);
    nameTxt.font = Font.systemFont(9);
    nameTxt.textColor = new Color("#E5E5EA");

    row.addSpacer();

    const curTxt = row.addText(c.cur);
    curTxt.font = Font.boldSystemFont(9);
    curTxt.textColor = new Color("#FFFFFF");

    row.addSpacer(8);

    const tgtTxt = row.addText(c.tgt);
    tgtTxt.font = Font.systemFont(9);
    tgtTxt.textColor = new Color("#8E8E93");

    rightCol.addSpacer(2);
  }

  // Tapping the widget (outside the refresh button) opens the spreadsheet
  if (SHEET_EDIT_URL && SHEET_EDIT_URL.indexOf("YOUR_SPREADSHEET_ID") === -1) {
    w.url = SHEET_EDIT_URL;
  }

  // Hint to iOS for the next background refresh
  w.refreshAfterDate = new Date(Date.now() + 1000 * 60 * REFRESH_MINUTES);

  return w;
}

/**
 * Reads the published CSV and parses the summary block.
 */
async function fetchSheetData() {
  const fallback = {
    totalInvested: "—",
    netAsset: "—",
    ytdReturn: "—",
    ytdProfit: "—",
    totalReturn: "—",
    totalProfit: "—",
    categories: CATEGORIES.map(c => ({ name: c.name, cur: "—", tgt: "—", col: c.col }))
  };

  if (!SHEET_CSV_URL || SHEET_CSV_URL.indexOf("YOUR_PUBLISHED_CSV_URL_HERE") !== -1) {
    return fallback;
  }

  try {
    // Cache-buster: Google's CDN and iOS may serve a stale copy for a few minutes
    const cacheBuster = (SHEET_CSV_URL.includes("?") ? "&" : "?") + "_t=" + Date.now();
    const req = new Request(SHEET_CSV_URL + cacheBuster);
    req.timeoutInterval = 7;
    req.headers = {
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Pragma": "no-cache",
      "Expires": "0"
    };

    const csv = await req.loadString();

    // Split into rows, respecting quoted commas
    const lines = csv.split(/\r?\n/).map(line => {
      const row = [];
      let inQuotes = false, cur = "";
      for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (c === '"') { inQuotes = !inQuotes; }
        else if (c === ',' && !inQuotes) { row.push(cur.trim()); cur = ""; }
        else { cur += c; }
      }
      row.push(cur.trim());
      return row;
    });

    // Locate the summary block: the column whose header is "유형"
    let allocCol = -1;
    for (const r of lines) {
      for (let c = 5; c < r.length; c++) {
        if (r[c] === "유형" && r.length > c + 4) {
          allocCol = c;
          break;
        }
      }
      if (allocCol !== -1) break;
    }
    if (allocCol === -1) allocCol = 10;

    let totalInvested = fallback.totalInvested;
    let netAsset = fallback.netAsset;
    let totalReturn = fallback.totalReturn;
    let totalProfit = fallback.totalProfit;
    let ytdReturn = fallback.ytdReturn;
    let ytdProfit = fallback.ytdProfit;

    const catMap = {};
    for (const c of CATEGORIES) {
      catMap[c.name] = { name: c.name, cur: "—", tgt: "—", col: c.col };
    }

    for (const r of lines) {
      if (r.length > allocCol + 4) {
        const typeName = r[allocCol];

        // Current / target weight of an asset class
        if (catMap[typeName] && r[allocCol + 3] && r[allocCol + 3].includes("%")) {
          const curVal = parseFloat(r[allocCol + 3].replace("%", "").trim());
          const tgtVal = parseFloat(r[allocCol + 4].replace("%", "").trim());
          if (!isNaN(curVal)) catMap[typeName].cur = `${curVal.toFixed(1)}%`;
          if (!isNaN(tgtVal)) catMap[typeName].tgt = `${Math.round(tgtVal)}%`;
        }

        // Total invested
        if (typeName === ROW_TOTAL_INVESTED && r[allocCol + 2]) {
          const amt = parseFloat(r[allocCol + 2].replace(/[₩,\s]/g, ""));
          if (!isNaN(amt) && amt > 0) totalInvested = `₩${(amt / 1e6).toFixed(1)}M`;
        }

        // Grand total: net asset, cumulative P&L, all-time return, YTD return
        if (typeName === ROW_GRAND_TOTAL && r.length > allocCol + 6 && r[allocCol + 3] && r[allocCol + 3].includes("₩")) {
          const net = parseFloat(r[allocCol + 1].replace(/[₩,\s]/g, ""));
          if (!isNaN(net) && net > 0) netAsset = `₩${(net / 1e6).toFixed(1)}M`;

          const p = parseFloat(r[allocCol + 3].replace(/[₩,\s]/g, ""));
          if (!isNaN(p)) {
            totalProfit = `${p >= 0 ? "+" : "-"}₩${(Math.abs(p) / 1e6).toFixed(1)}M`;
            const ytdP = p - YTD_START_CUM_PROFIT;
            ytdProfit = `${ytdP >= 0 ? "+" : "-"}₩${(Math.abs(ytdP) / 1e6).toFixed(1)}M`;
          }

          if (r[allocCol + 4] && r[allocCol + 4].includes("%")) {
            const tr = parseFloat(r[allocCol + 4].replace("%", "").trim());
            totalReturn = `${tr >= 0 ? "+" : ""}${tr.toFixed(2)}%`;
          }
          if (r[allocCol + 6] && r[allocCol + 6].includes("%")) {
            const yr = parseFloat(r[allocCol + 6].replace("%", "").trim());
            ytdReturn = `${yr >= 0 ? "+" : ""}${yr.toFixed(2)}%`;
          }
        }
      }
    }

    return {
      totalInvested: totalInvested,
      netAsset: netAsset,
      ytdReturn: ytdReturn,
      ytdProfit: ytdProfit,
      totalReturn: totalReturn,
      totalProfit: totalProfit,
      categories: Object.values(catMap)
    };
  } catch (e) {
    return fallback;
  }
}

function formatCurrentTime() {
  const d = new Date();
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${m} KST`;
}
