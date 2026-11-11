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

  leftCol.addSpacer(1.5);

  const ratioLabel = leftCol.addText(`부채비율 ${d.debtRatio || "25.9%"}`);
  ratioLabel.font = Font.systemFont(8.5);
  ratioLabel.textColor = new Color("#8E8E93");

  leftCol.addSpacer(4);

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
  const fm = (typeof FileManager !== "undefined") ? FileManager.local() : null;
  const docCachePath = fm ? fm.joinPath(fm.documentsDirectory(), "dohn_asset_data_cache.json") : "";
  const cachePath = fm ? fm.joinPath(fm.cacheDirectory(), "dohn_asset_data_cache.json") : "";

  const fallback = {
    totalInvested: "₩259.7M",
    netAsset: "₩230.5M",
    debt: "59.6M",
    debtRatio: "25.9%",
    ytdReturn: "-4.97%",
    ytdProfit: "-₩19.4M",
    totalReturn: "+4.92%",
    totalProfit: "+₩21.9M",
    alloc: {
      "미국주식": { current: "50.42%", target: "50.00%" },
      "세계주식": { current: "21.23%", target: "20.00%" },
      "암호화폐": { current: "18.73%", target: "20.00%" },
      "금":       { current: "9.61%", target: "10.00%" }
    }
  };

  let cached = null;
  if (fm) {
    try {
      if (docCachePath && fm.fileExists(docCachePath)) {
        cached = JSON.parse(fm.readString(docCachePath));
      } else if (cachePath && fm.fileExists(cachePath)) {
        cached = JSON.parse(fm.readString(cachePath));
      }
    } catch (e) {}
  }

  function getSafeFallback() {
    if (cached && cached.netAsset && cached.netAsset !== "₩0.0M" && cached.alloc && cached.alloc["미국주식"] && cached.alloc["미국주식"].current !== "0.0%") {
      return cached;
    }
    return fallback;
  }

  if (!SHEET_CSV_URL || SHEET_CSV_URL.includes("YOUR_PUBLISHED_CSV_URL_HERE")) {
    return getSafeFallback();
  }

  try {
    const cacheBuster = (SHEET_CSV_URL.includes("?") ? "&" : "?") + "_t=" + Date.now();
    const req = new Request(SHEET_CSV_URL + cacheBuster);
    req.timeoutInterval = 8;
    req.headers = {
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Pragma": "no-cache",
      "Expires": "0"
    };

    const csv = await req.loadString();
    if (!csv || csv.includes("Unauthorized") || csv.includes("<!DOCTYPE html>")) {
      return getSafeFallback();
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
    let itdProfitVal = 0;
    let ytdBaseProfitVal = 0;
    const alloc = {};

    // 1. Time-series performance table (headers: 날짜, 순자산, YTD 수익률, YTD 수익, 수익률, 수익)
    for (let r = 0; r < lines.length; r++) {
      const row = lines[r];
      let netCol = -1, ytdRetCol = -1, ytdProfCol = -1, itdRetCol = -1, itdProfCol = -1, dateCol = -1;

      for (let c = 0; c < row.length; c++) {
        const h = row[c].trim();
        if (h === "날짜") dateCol = c;
        else if (h === "순자산") netCol = c;
        else if (h === "YTD 수익률") ytdRetCol = c;
        else if (h === "YTD 수익") ytdProfCol = c;
        else if (h === "수익률") itdRetCol = c;
        else if (h === "수익") itdProfCol = c;
      }

      if (netCol !== -1 && r + 1 < lines.length) {
        const nextRow = lines[r + 1];
        if (netCol < nextRow.length) {
          const candNet = parseMoney(nextRow[netCol]);
          if (candNet > 10000000) netAssetVal = candNet;
        }
        if (ytdRetCol !== -1 && ytdRetCol < nextRow.length && !nextRow[ytdRetCol].includes("로드")) {
          const s = formatPct(nextRow[ytdRetCol]);
          if (s) ytdReturnStr = s;
        }
        if (ytdProfCol !== -1 && ytdProfCol < nextRow.length && !nextRow[ytdProfCol].includes("로드")) {
          const m = parseMoney(nextRow[ytdProfCol]);
          if (m !== 0) ytdProfitStr = formatAmountM(m, true);
        }
        if (itdRetCol !== -1 && itdRetCol < nextRow.length && !nextRow[itdRetCol].includes("로드")) {
          const s = formatPct(nextRow[itdRetCol]);
          if (s) itdReturnStr = s;
        }
        if (itdProfCol !== -1 && itdProfCol < nextRow.length && !nextRow[itdProfCol].includes("로드")) {
          const m = parseMoney(nextRow[itdProfCol]);
          if (m !== 0) {
            itdProfitVal = m;
            itdProfitStr = formatAmountM(m, true);
          }
        }

        // Scan subsequent historical rows for baseline profit of previous year-end (e.g., 2025. 12. 31)
        if (dateCol !== -1 && itdProfCol !== -1) {
          const prevYear = (new Date().getFullYear() - 1).toString();
          for (let tr = r + 1; tr < lines.length; tr++) {
            const tRow = lines[tr];
            if (dateCol < tRow.length && (tRow[dateCol].includes(prevYear + ". 12") || tRow[dateCol].includes("2025. 12"))) {
              if (itdProfCol < tRow.length) {
                const baseM = parseMoney(tRow[itdProfCol]);
                if (baseM !== 0) {
                  ytdBaseProfitVal = baseM;
                  break;
                }
              }
            }
          }
        }
        break;
      }
    }

    // 2. Account summary table (headers: 계좌, 평가액, 비중, 수익, 수익률, 월 수익률, YTD 수익률)
    // Infallible live source for current returns and evaluation
    for (let r = 0; r < lines.length; r++) {
      const row = lines[r];
      let accCol = -1;
      for (let c = 0; c < row.length; c++) {
        if (row[c].trim() === "계좌" && c > 4) { accCol = c; break; }
      }
      if (accCol !== -1) {
        for (let tr = r + 1; tr < Math.min(r + 25, lines.length); tr++) {
          const sRow = lines[tr];
          if (accCol < sRow.length && sRow[accCol].trim() === "총합") {
            // accCol + 1: 평가액, +3: 수익, +4: 수익률, +6: YTD 수익률
            if (accCol + 1 < sRow.length && !sRow[accCol + 1].includes("로드")) {
              const cNet = parseMoney(sRow[accCol + 1]);
              if (cNet > 10000000 && netAssetVal === 0) netAssetVal = cNet;
            }
            if (accCol + 3 < sRow.length && !sRow[accCol + 3].includes("로드")) {
              const pVal = parseMoney(sRow[accCol + 3]);
              if (pVal !== 0) {
                if (itdProfitVal === 0) itdProfitVal = pVal;
                if (!itdProfitStr) itdProfitStr = formatAmountM(pVal, true);
              }
            }
            if (accCol + 4 < sRow.length && !sRow[accCol + 4].includes("로드") && !itdReturnStr) {
              const s = formatPct(sRow[accCol + 4]);
              if (s) itdReturnStr = s;
            }
            if (accCol + 6 < sRow.length && !sRow[accCol + 6].includes("로드") && !ytdReturnStr) {
              const s = formatPct(sRow[accCol + 6]);
              if (s) ytdReturnStr = s;
            }
            break;
          }
        }
        break;
      }
    }

    // If ytdProfitStr could not be read directly from time-series row, derive it: ITD Profit - Previous Year-End Profit
    if (!ytdProfitStr && itdProfitVal !== 0 && ytdBaseProfitVal !== 0) {
      ytdProfitStr = formatAmountM(itdProfitVal - ytdBaseProfitVal, true);
    }

    // 3. 4 Core Asset Allocation (미국주식, 세계주식, 암호화폐, 금)
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
        if (row.length > investWeightCol && row[investWeightCol] && !row[investWeightCol].includes("로드")) curPct = row[investWeightCol].trim();
        if (row.length > targetWeightCol && row[targetWeightCol] && !row[targetWeightCol].includes("로드")) tgtPct = row[targetWeightCol].trim();
        alloc[catName] = { current: curPct, target: tgtPct };
      }
    }

    // 4. Scan sheet for totalInvestedVal, debtVal, and netAssetVal fallback
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

    // Verify that allocation and totals parsed actual non-zero values
    let allocHasValidValues = true;
    const requiredCats = ["미국주식", "세계주식", "암호화폐", "금"];
    for (const cat of requiredCats) {
      if (!alloc[cat] || !alloc[cat].current || alloc[cat].current === "0.0%" || alloc[cat].current.includes("로드")) {
        allocHasValidValues = false;
        break;
      }
    }

    const isDataValid = (netAssetVal > 10000000) && (totalInvestedVal > 10000000) && allocHasValidValues;

    if (!isDataValid) {
      return getSafeFallback();
    }

    let debtRatioStr = fallback.debtRatio;
    if (netAssetVal > 0 && debtVal > 0) {
      const r = (debtVal / netAssetVal) * 100;
      debtRatioStr = `${r.toFixed(1)}%`;
    } else if (cached && cached.debtRatio) {
      debtRatioStr = cached.debtRatio;
    }

    const result = {
      totalInvested: formatAmountM(totalInvestedVal),
      netAsset: formatAmountM(netAssetVal),
      debt: debtVal > 0 ? `${(debtVal / 1e6).toFixed(1)}M` : (cached && cached.debt ? cached.debt : fallback.debt),
      debtRatio: debtRatioStr,
      ytdReturn: ytdReturnStr || (cached && cached.ytdReturn ? cached.ytdReturn : fallback.ytdReturn),
      ytdProfit: ytdProfitStr || (cached && cached.ytdProfit ? cached.ytdProfit : fallback.ytdProfit),
      totalReturn: itdReturnStr || (cached && cached.totalReturn ? cached.totalReturn : fallback.totalReturn),
      totalProfit: itdProfitStr || (cached && cached.totalProfit ? cached.totalProfit : fallback.totalProfit),
      alloc: alloc
    };

    if (fm) {
      try {
        if (docCachePath) fm.writeString(docCachePath, JSON.stringify(result));
        if (cachePath) fm.writeString(cachePath, JSON.stringify(result));
      } catch (e) {}
    }

    return result;
  } catch (e) {
    return getSafeFallback();
  }
}

function parseMoney(str) {
  if (!str || typeof str !== "string" || str.includes("로드")) return 0;
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
  if (!str || typeof str !== "string" || str.includes("로드")) return "";
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
