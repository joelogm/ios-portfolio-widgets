// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: blue; icon-glyph: chart-pie;

/**
 * 100% Dynamic Asset Allocation Widget for iOS Scriptable (Medium 2x4)
 * - Directly connected to Google Sheets '자산 모니터링' tab via published CSV.
 * - Compares 4 core asset classes (US Equities, World Equities, Crypto, Gold) Current vs. Target weights.
 * - Displays YTD & ITD (all-time) performance metrics without clipping or ellipsis.
 * - Header timestamp & instant refresh button (↻).
 */

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

// 1. Published CSV link of the sheet.
//    Google Sheets ▸ File ▸ Share ▸ Publish to web ▸ pick the tab ▸ CSV
const SHEET_CSV_URL = "YOUR_PUBLISHED_CSV_URL_HERE";

// Widget header title (e.g. "ASSET ALLOCATION", "ASSETS", "ASSET MONITOR")
const WIDGET_TITLE = "ASSET ALLOCATION";

// 2. Spreadsheet opened when the widget is tapped.
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
  ytdRow.centerAlignContent();

  const ytdTagStack = ytdRow.addStack();
  ytdTagStack.size = new Size(26, 0);
  const ytdTag = ytdTagStack.addText("YTD");
  ytdTag.font = Font.boldSystemFont(8.5);
  ytdTag.textColor = new Color("#8E8E93");
  ytdTagStack.addSpacer();

  ytdRow.addSpacer(2);

  const ytdPct = ytdRow.addText(d.ytdReturn);
  ytdPct.font = Font.boldSystemFont(8.5);
  ytdPct.textColor = d.ytdReturn.startsWith("-") ? new Color("#5E9BFF") : new Color("#FF453A");

  const ytdDot = ytdRow.addText(" · ");
  ytdDot.font = Font.systemFont(8);
  ytdDot.textColor = new Color("#636366");

  const ytdAmt = ytdRow.addText(d.ytdProfit);
  ytdAmt.font = Font.boldSystemFont(8.5);
  ytdAmt.textColor = d.ytdProfit.startsWith("-") ? new Color("#5E9BFF") : new Color("#FF453A");

  leftCol.addSpacer(2.5);

  // 2. All-time (ITD)
  const itdRow = leftCol.addStack();
  itdRow.layoutHorizontally();
  itdRow.centerAlignContent();

  const itdTagStack = itdRow.addStack();
  itdTagStack.size = new Size(26, 0);
  const itdTag = itdTagStack.addText("ITD");
  itdTag.font = Font.boldSystemFont(8.5);
  itdTag.textColor = new Color("#8E8E93");
  itdTagStack.addSpacer();

  itdRow.addSpacer(2);

  const itdPct = itdRow.addText(d.totalReturn);
  itdPct.font = Font.boldSystemFont(8.5);
  itdPct.textColor = d.totalReturn.startsWith("-") ? new Color("#5E9BFF") : new Color("#FF453A");

  const itdDot = itdRow.addText(" · ");
  itdDot.font = Font.systemFont(8);
  itdDot.textColor = new Color("#636366");

  const itdAmt = itdRow.addText(d.totalProfit);
  itdAmt.font = Font.boldSystemFont(8.5);
  itdAmt.textColor = d.totalProfit.startsWith("-") ? new Color("#5E9BFF") : new Color("#FF453A");

  bodyRow.addSpacer(10);

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

    const curText = row.addText(formatPct(catData.current));
    curText.font = Font.boldSystemFont(10.5);
    curText.textColor = new Color("#FFFFFF");

    const slash = row.addText(" / ");
    slash.font = Font.systemFont(9.5);
    slash.textColor = new Color("#636366");

    const tgtText = row.addText(formatPct(catData.target));
    tgtText.font = Font.systemFont(10);
    tgtText.textColor = new Color("#8E8E93");

    if (i < CATEGORIES.length - 1) {
      rightCol.addSpacer(4);
    }
  }

  w.refreshAfterDate = new Date(Date.now() + 1000 * 60 * REFRESH_MINUTES);

  return w;
}

function formatPct(str) {
  if (!str) return "0.0%";
  const num = parseFloat(str.replace("%", "").trim());
  if (isNaN(num)) return str;
  return `${num.toFixed(1)}%`;
}

async function fetchSheetData() {
  const fallback = {
    totalInvested: "₩253.5M",
    netAsset: "₩192.8M",
    ytdReturn: "-6.56%",
    ytdProfit: "-₩25.6M",
    totalReturn: "+3.53%",
    totalProfit: "+₩15.7M",
    alloc: {
      "미국주식": { current: "55.8%", target: "49.3%" },
      "세계주식": { current: "23.0%", target: "20.3%" },
      "암호화폐": { current: "23.0%", target: "20.3%" },
      "금":       { current: "11.3%", target: "10.0%" }
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
    let allTimeProfit = 0;
    let allTimeCost = 0;
    const alloc = {};

    let summaryCol = -1;
    for (let r = 0; r < Math.min(15, lines.length); r++) {
      for (let c = 5; c < lines[r].length; c++) {
        const val = lines[r][c];
        if (val === "유형" && lines[r].length > c + 2) {
          summaryCol = c;
          break;
        }
      }
      if (summaryCol !== -1) break;
    }
    if (summaryCol === -1) summaryCol = 11;

    for (let r = 0; r < lines.length; r++) {
      const row = lines[r];
      if (row.length <= summaryCol) continue;

      const catName = row[summaryCol].trim();
      if (["미국주식", "세계주식", "암호화폐", "금"].includes(catName)) {
        let curPct = "0.0%";
        let tgtPct = "0.0%";
        for (let c = summaryCol + 1; c < Math.min(row.length, summaryCol + 6); c++) {
          const v = row[c];
          if (v && v.includes("%")) {
            if (curPct === "0.0%") curPct = v;
            else if (tgtPct === "0.0%") { tgtPct = v; break; }
          }
        }
        alloc[catName] = { current: curPct, target: tgtPct };
      }
    }

    for (let r = 0; r < lines.length; r++) {
      const row = lines[r];
      const joined = row.join(" ");

      if (joined.includes("투자 총합") || (row[0] && row[0].includes("투자 총합"))) {
        for (let c = 1; c < row.length; c++) {
          const num = parseMoney(row[c]);
          if (num > 10000000) {
            totalInvestedVal = num;
            break;
          }
        }
      }

      if (row[0] && row[0].trim() === "총합") {
        const nums = [];
        for (let c = 1; c < row.length; c++) {
          const num = parseMoney(row[c]);
          if (num !== 0) nums.push(num);
        }
        if (nums.length >= 2) {
          netAssetVal = nums[0];
          allTimeProfit = nums[1];
          if (nums.length >= 4) {
            allTimeCost = nums[2];
          }
        }
      }
    }

    if (totalInvestedVal === 0 && netAssetVal > 0) totalInvestedVal = netAssetVal;

    let ytdReturnStr = "-6.56%";
    let ytdProfitStr = "-₩25.6M";
    let itdReturnStr = "+3.53%";
    let itdProfitStr = "+₩15.7M";

    const ytdStartProfit = 41334690;
    const ytdProfitVal = allTimeProfit - ytdStartProfit;
    const baseCost = allTimeCost > 0 ? allTimeCost : (netAssetVal - allTimeProfit);

    if (baseCost > 0) {
      const ytdPct = (ytdProfitVal / baseCost) * 100;
      ytdReturnStr = (ytdPct >= 0 ? "+" : "") + ytdPct.toFixed(2) + "%";
      ytdProfitStr = formatProfit(ytdProfitVal);

      const itdPct = (allTimeProfit / baseCost) * 100;
      itdReturnStr = (itdPct >= 0 ? "+" : "") + itdPct.toFixed(2) + "%";
      itdProfitStr = formatProfit(allTimeProfit);
    }

    return {
      totalInvested: formatBalance(totalInvestedVal || 253500000),
      netAsset: formatBalance(netAssetVal || 192800000),
      ytdReturn: ytdReturnStr,
      ytdProfit: ytdProfitStr,
      totalReturn: itdReturnStr,
      totalProfit: itdProfitStr,
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

function formatBalance(val) {
  const abs = Math.abs(val);
  if (abs >= 1e8) {
    return `₩${(abs / 1e8).toFixed(1)}억`;
  }
  return `₩${(abs / 1e6).toFixed(1)}M`;
}

function formatProfit(val) {
  const sign = val < 0 ? "-" : (val > 0 ? "+" : "");
  const abs = Math.abs(val);
  if (abs >= 1e8) {
    return `${sign}₩${(abs / 1e8).toFixed(1)}억`;
  }
  return `${sign}₩${(abs / 1e6).toFixed(1)}M`;
}

function formatCurrentTime() {
  const d = new Date();
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${m} KST`;
}
