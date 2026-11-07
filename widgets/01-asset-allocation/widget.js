// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: blue; icon-glyph: chart-pie;

/**
 * 100% Dynamic Asset Allocation Widget for iOS Scriptable (Medium 2x4)
 * - Directly connected to Google Sheets '자산 모니터링' tab via published CSV.
 * - Compares 4 core asset classes (US Equities, World Equities, Crypto, Gold) Current vs. Target weights.
 * - Displays Total Invested, Net Asset & Debt in M format.
 * - YTD & ITD single-line layout with micro-spacer calibration (zero wrapping, zero level distortion).
 * - Header timestamp & instant refresh button (↻).
 */

// ---------------------------------------------------------------------------
// Configuration (injected via CONFIG if called from loader, or defaults)
// ---------------------------------------------------------------------------

// 1. Published CSV link of the sheet.
const SHEET_CSV_URL = (typeof CONFIG !== "undefined" && CONFIG.sheetCsvUrl) 
  ? CONFIG.sheetCsvUrl 
  : "YOUR_PUBLISHED_CSV_URL_HERE";

// Widget header title
const WIDGET_TITLE = (typeof CONFIG !== "undefined" && CONFIG.title) 
  ? CONFIG.title 
  : "ASSET ALLOCATION";

// 2. Spreadsheet opened when the widget is tapped.
const SHEET_EDIT_URL = (typeof CONFIG !== "undefined" && CONFIG.sheetEditUrl) 
  ? CONFIG.sheetEditUrl 
  : "https://docs.google.com/spreadsheets/d/YOUR_SPREADSHEET_ID/edit";

const SCRIPT_NAME = (typeof CONFIG !== "undefined" && CONFIG.scriptName) 
  ? CONFIG.scriptName 
  : "dohn_asset";

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

// 5. Refresh hint in minutes
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

  const d = await fetchSheetData();

  // Header row
  const headerRow = w.addStack();
  headerRow.layoutHorizontally();
  headerRow.centerAlignContent();

  const titleText = headerRow.addText(`▲ ${WIDGET_TITLE}`);
  titleText.font = Font.boldSystemFont(10);
  titleText.textColor = new Color("#FF5555");

  headerRow.addSpacer();

  const timeText = headerRow.addText(formatCurrentTime());
  timeText.font = Font.systemFont(8.5);
  timeText.textColor = new Color("#8E8E93");

  headerRow.addSpacer(6);

  const refreshBtn = headerRow.addStack();
  refreshBtn.backgroundColor = new Color("#2C2C2E");
  refreshBtn.cornerRadius = 4;
  refreshBtn.setPadding(2, 6, 2, 6);

  const scriptName = SCRIPT_NAME || (typeof Script !== "undefined" && Script.name()) || "dohn_asset";
  refreshBtn.url = "scriptable:///run?scriptName=" + encodeURIComponent(scriptName);

  const refreshText = refreshBtn.addText("↻ 갱신");
  refreshText.font = Font.boldSystemFont(8);
  refreshText.textColor = new Color("#FFFFFF");

  w.addSpacer(5);

  // Body: two columns
  const bodyRow = w.addStack();
  bodyRow.layoutHorizontally();

  // Left: total invested, net asset & debt, performance
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

  const subLabel = leftCol.addText(`순자산 ${d.netAsset} · 부채 ${d.debt}`);
  subLabel.font = Font.systemFont(9);
  subLabel.textColor = new Color("#A1A1A6");

  leftCol.addSpacer(5);

  // 1. YTD
  const ytdRow = leftCol.addStack();
  ytdRow.layoutHorizontally();

  const ytdTag = ytdRow.addText("YTD");
  ytdTag.font = Font.boldSystemFont(9);
  ytdTag.textColor = new Color("#8E8E93");

  ytdRow.addSpacer(5);

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

  // 2. All-time (ITD)
  const itdRow = leftCol.addStack();
  itdRow.layoutHorizontally();

  const itdTag = itdRow.addText("ITD");
  itdTag.font = Font.boldSystemFont(9);
  itdTag.textColor = new Color("#8E8E93");

  itdRow.addSpacer(8.5); // Micro-spacer absorbs 3.5px width delta

  const itdPct = itdRow.addText(d.totalReturn);
  itdPct.font = Font.boldSystemFont(9);
  itdPct.textColor = d.totalReturn.startsWith("-") ? new Color("#5E9BFF") : new Color("#FF453A");

  const itdDot = itdRow.addText(" · ");
  itdDot.font = Font.systemFont(9);
  itdDot.textColor = new Color("#636366");

  const itdAmt = itdRow.addText(d.totalProfit);
  itdAmt.font = Font.boldSystemFont(9);
  itdAmt.textColor = d.totalProfit.startsWith("-") ? new Color("#5E9BFF") : new Color("#FF453A");

  bodyRow.addSpacer(12);

  // Right: current vs. target weight per asset class
  const rightCol = bodyRow.addStack();
  rightCol.layoutVertically();

  for (let i = 0; i < CATEGORIES.length; i++) {
    const cat = CATEGORIES[i];
    const catData = d.alloc[cat.name] || { current: "0.0%", target: "0.0%" };

    const row = rightCol.addStack();
    row.layoutHorizontally();
    row.centerAlignContent();

    const dot = row.addText("● ");
    dot.font = Font.systemFont(8);
    dot.textColor = new Color(cat.col);

    const nameText = row.addText(cat.name);
    nameText.font = Font.systemFont(10.5);
    nameText.textColor = new Color("#CCCCCC");

    row.addSpacer();

    const curText = row.addText(catData.current);
    curText.font = Font.boldSystemFont(10.5);
    curText.textColor = new Color("#FFFFFF");

    const slash = row.addText(" / ");
    slash.font = Font.systemFont(9.5);
    slash.textColor = new Color("#636366");

    const tgtText = row.addText(catData.target);
    tgtText.font = Font.systemFont(10);
    tgtText.textColor = new Color("#8E8E93");

    if (i < CATEGORIES.length - 1) {
      rightCol.addSpacer(4);
    }
  }

  w.refreshAfterDate = new Date(Date.now() + 1000 * 60 * REFRESH_MINUTES);

  return w;
}

async function fetchSheetData() {
  const fallback = {
    totalInvested: "₩253.5M",
    netAsset: "₩224.3M",
    debt: "59.8M",
    ytdReturn: "-6.56%",
    ytdProfit: "-₩25.6M",
    totalReturn: "+3.53%",
    totalProfit: "+₩15.7M",
    alloc: {
      "미국주식": { current: "49.4%", target: "50.0%" },
      "세계주식": { current: "20.3%", target: "20.0%" },
      "암호화폐": { current: "20.3%", target: "20.0%" },
      "금":       { current: "10.0%", target: "10.0%" }
    }
  };

  if (!SHEET_CSV_URL || SHEET_CSV_URL.includes("YOUR_PUBLISHED_CSV_URL_HERE")) {
    return fallback;
  }

  try {
    const cacheBuster = (SHEET_CSV_URL.includes("?") ? "&" : "?") + "_t=" + Date.now();
    const req = new Request(SHEET_CSV_URL + cacheBuster);
    req.timeoutInterval = 7;
    req.headers = {
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Pragma": "no-cache",
      "Expires": "0"
    };

    const csv = await req.loadString();
    if (!csv || csv.includes("Unauthorized") || csv.includes("<!DOCTYPE html>")) {
      return fallback;
    }

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

    let totalInvestedVal = 0;
    let netAssetVal = 0;
    let debtVal = 0;
    let ytdReturnStr = "";
    let ytdProfitStr = "";
    let itdReturnStr = "";
    let itdProfitStr = "";
    const alloc = {};

    // 1. Time-series performance table (headers: 순자산, YTD 수익률, YTD 수익, 수익률, 수익)
    for (let r = 0; r < lines.length; r++) {
      const row = lines[r];
      let netCol = -1, ytdRetCol = -1, ytdProfCol = -1, itdRetCol = -1, itdProfCol = -1;

      for (let c = 0; c < row.length; c++) {
        const h = row[c].trim();
        if (h === "순자산") netCol = c;
        else if (h === "YTD 수익률") ytdRetCol = c;
        else if (h === "YTD 수익") ytdProfCol = c;
        else if (h === "수익률") itdRetCol = c;
        else if (h === "수익") itdProfCol = c;
      }

      if (netCol !== -1 && r + 1 < lines.length) {
        const nextRow = lines[r + 1];
        const candNet = parseMoney(nextRow[netCol]);
        if (candNet > 10000000) {
          netAssetVal = candNet;
          if (ytdRetCol !== -1 && nextRow[ytdRetCol]) {
            ytdReturnStr = formatPct(nextRow[ytdRetCol]);
          }
          if (ytdProfCol !== -1 && nextRow[ytdProfCol]) {
            ytdProfitStr = formatAmountM(parseMoney(nextRow[ytdProfCol]), true);
          }
          if (itdRetCol !== -1 && nextRow[itdRetCol]) {
            itdReturnStr = formatPct(nextRow[itdRetCol]);
          }
          if (itdProfCol !== -1 && nextRow[itdProfCol]) {
            itdProfitStr = formatAmountM(parseMoney(nextRow[itdProfCol]), true);
          }
          break;
        }
      }
    }

    // 2. 4 Core Asset Allocation (미국주식, 세계주식, 암호화폐, 금)
    let summaryCol = -1;
    let investWeightCol = -1;
    let targetWeightCol = -1;

    for (let r = 0; r < Math.min(15, lines.length); r++) {
      const headerRow = lines[r];
      for (let c = 0; c < headerRow.length; c++) {
        const val = headerRow[c].trim();
        if (val === "유형" && c > 4) {
          summaryCol = c;
          for (let k = c; k < Math.min(headerRow.length, c + 8); k++) {
            const h = headerRow[k].trim();
            if (h.includes("투자") && h.includes("비중")) investWeightCol = k;
            if (h.includes("목표") && h.includes("비중")) targetWeightCol = k;
          }
          break;
        }
      }
      if (summaryCol !== -1) break;
    }

    if (summaryCol === -1) summaryCol = 10;
    if (investWeightCol === -1) investWeightCol = summaryCol + 3;
    if (targetWeightCol === -1) targetWeightCol = summaryCol + 4;

    for (let r = 0; r < lines.length; r++) {
      const row = lines[r];
      if (row.length <= summaryCol) continue;
      const catName = row[summaryCol].trim();
      if (["미국주식", "세계주식", "암호화폐", "금"].includes(catName)) {
        let curPct = "0.0%";
        let tgtPct = "0.0%";
        if (row.length > investWeightCol && row[investWeightCol]) curPct = row[investWeightCol].trim();
        if (row.length > targetWeightCol && row[targetWeightCol]) tgtPct = row[targetWeightCol].trim();
        alloc[catName] = { current: curPct, target: tgtPct };
      }
    }

    // 3. Scan sheet for totalInvestedVal, debtVal, and netAssetVal fallback
    for (let r = 0; r < lines.length; r++) {
      const row = lines[r];
      for (let c = 0; c < row.length; c++) {
        const cell = row[c].trim();
        if ((cell === "투자 총합" || cell === "Exposure") && totalInvestedVal === 0) {
          for (let k = c + 1; k < Math.min(row.length, c + 5); k++) {
            const m = parseMoney(row[k]);
            if (m > 10000000) { totalInvestedVal = m; break; }
          }
        }
        if ((cell === "부채" || cell === "Debt") && debtVal === 0) {
          for (let k = c + 1; k < Math.min(row.length, c + 5); k++) {
            const m = Math.abs(parseMoney(row[k]));
            if (m > 1000000) { debtVal = m; break; }
          }
        }
        if ((cell === "Equity" || cell === "총합") && netAssetVal === 0) {
          for (let k = c + 1; k < Math.min(row.length, c + 5); k++) {
            const m = parseMoney(row[k]);
            if (m > 10000000) { netAssetVal = m; break; }
          }
        }
      }
    }

    return {
      totalInvested: formatAmountM(totalInvestedVal || 253500000),
      netAsset: formatAmountM(netAssetVal || 224300000),
      debt: `${((debtVal || 59800000) / 1e6).toFixed(1)}M`,
      ytdReturn: ytdReturnStr || "-6.56%",
      ytdProfit: ytdProfitStr || "-₩25.6M",
      totalReturn: itdReturnStr || "+3.53%",
      totalProfit: itdProfitStr || "+₩15.7M",
      alloc: Object.keys(alloc).length > 0 ? alloc : fallback.alloc
    };
  } catch (e) {
    return fallback;
  }
}

function parseMoney(str) {
  if (!str) return 0;
  const cleaned = str.replace(/[₩,\s]/g, "");
  const val = parseFloat(cleaned);
  return isNaN(val) ? 0 : val;
}

function formatAmountM(val, withSign = false) {
  if (!val && val !== 0) return "";
  const sign = val > 0 ? "+" : (val < 0 ? "-" : "");
  const mVal = (Math.abs(val) / 1e6).toFixed(1);
  return withSign ? `${sign}₩${mVal}M` : `₩${mVal}M`;
}

function formatPct(str) {
  if (!str) return "";
  const cleaned = str.replace(/[%,\s]/g, "");
  const val = parseFloat(cleaned);
  if (isNaN(val)) return str.trim();
  const sign = val > 0 ? "+" : (val < 0 ? "-" : "");
  return `${sign}${Math.abs(val).toFixed(2)}%`;
}

function formatCurrentTime() {
  const d = new Date();
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${m} KST`;
}
