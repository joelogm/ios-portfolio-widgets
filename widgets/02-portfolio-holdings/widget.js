// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: green; icon-glyph: list-ol;

/**
 * Real-time Portfolio Holdings Visualization Widget for iOS Scriptable (Large 4x4)
 * - Connects to Google Sheets '포트폴리오 표' (Portfolio Table) published CSV
 * - Top holdings ranking (#1~#8) with asset-class color badges
 * - Visual progress bars for each holding & top segmented proportion gauge
 * - Header refresh button (↻) and tap to open Google Sheet
 */

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

// 1. Published CSV URL of '포트폴리오 표' tab
//    Google Sheets ▸ File ▸ Share ▸ Publish to web ▸ '포트폴리오 표' ▸ CSV
const SHEET_CSV_URL = "YOUR_PUBLISHED_HOLDINGS_CSV_URL_HERE";

// 2. Spreadsheet opened when the widget is tapped
const SHEET_EDIT_URL = "https://docs.google.com/spreadsheets/d/YOUR_SPREADSHEET_ID/edit#gid=YOUR_TAB_GID";

const widget = await createWidget();
Script.setWidget(widget);
if (!config.runsInWidget) {
  await widget.presentLarge();
}
Script.complete();

async function createWidget() {
  const w = new ListWidget();
  w.backgroundColor = new Color("#16171a");
  w.setPadding(15, 16, 14, 16);

  // Load data
  const data = await fetchHoldingsData();
  const holdings = data.holdings.slice(0, 8); // Top 8 holdings
  const maxPct = holdings.length > 0 ? holdings[0].pct : 20.0;
  const top8Sum = holdings.reduce((acc, cur) => acc + cur.pct, 0);

  // 1. Header
  const headerRow = w.addStack();
  headerRow.layoutHorizontally();

  const titleCol = headerRow.addStack();
  titleCol.layoutVertically();

  const titleTxt = titleCol.addText("▲ PORTFOLIO HOLDINGS");
  titleTxt.font = Font.boldSystemFont(11);
  titleTxt.textColor = new Color("#34A853");

  titleCol.addSpacer(1);

  const subTxt = titleCol.addText(`총 순자산 ${data.netAsset} · Top 8 비중 ${top8Sum.toFixed(1)}%`);
  subTxt.font = Font.systemFont(9);
  subTxt.textColor = new Color("#8E8E93");

  headerRow.addSpacer();

  // Right Header: Time & Refresh Button
  const rightHeader = headerRow.addStack();
  rightHeader.layoutVertically();

  const timeRow = rightHeader.addStack();
  timeRow.addSpacer();
  const timeTxt = timeRow.addText(formatCurrentTime());
  timeTxt.font = Font.systemFont(9);
  timeTxt.textColor = new Color("#8E8E93");

  rightHeader.addSpacer(3);

  const btnRow = rightHeader.addStack();
  btnRow.addSpacer();

  const refreshBtn = btnRow.addStack();
  refreshBtn.backgroundColor = new Color("#25262B");
  refreshBtn.cornerRadius = 4;
  refreshBtn.setPadding(2, 6, 2, 6);

  const scriptName = Script.name() || "holdings widget";
  refreshBtn.url = "scriptable:///run?scriptName=" + encodeURIComponent(scriptName);

  const refreshTxt = refreshBtn.addText("↻ 갱신");
  refreshTxt.font = Font.boldSystemFont(8);
  refreshTxt.textColor = new Color("#FFFFFF");

  w.addSpacer(8);

  // 2. Top Multi-Segment Proportion Bar
  const segmentBar = drawSegmentBar(holdings, 300, 6);
  const segmentImg = w.addImage(segmentBar);
  segmentImg.imageSize = new Size(300, 6);

  w.addSpacer(10);

  // 3. Top 8 Holdings List
  for (let i = 0; i < holdings.length; i++) {
    const item = holdings[i];
    const rank = i + 1;
    const itemColor = getItemColor(item.name);

    const row = w.addStack();
    row.layoutHorizontally();

    // Rank (#1, #2)
    const rankTxt = row.addText(`#${rank}`);
    rankTxt.font = Font.boldSystemFont(9);
    rankTxt.textColor = new Color("#636366");

    row.addSpacer(4);

    // Color dot
    const dotTxt = row.addText("• ");
    dotTxt.font = Font.boldSystemFont(11);
    dotTxt.textColor = new Color(itemColor);

    // Name
    const nameTxt = row.addText(item.name);
    nameTxt.font = Font.boldSystemFont(10);
    nameTxt.textColor = new Color("#FFFFFF");

    row.addSpacer();

    // Progress Bar (70px width)
    const progressBar = drawProgressBar(item.pct, maxPct, itemColor, 70, 5);
    const barImg = row.addImage(progressBar);
    barImg.imageSize = new Size(70, 5);

    row.addSpacer(6);

    // Percentage
    const pctTxt = row.addText(`${item.pct.toFixed(1)}%`);
    pctTxt.font = Font.boldSystemFont(10);
    pctTxt.textColor = new Color("#FFFFFF");

    row.addSpacer(6);

    // Amount
    const amtTxt = row.addText(formatAmount(item.amt));
    amtTxt.font = Font.systemFont(9);
    amtTxt.textColor = new Color("#8E8E93");

    w.addSpacer(4);
  }

  w.addSpacer(6);

  // 4. Footer
  const footerRow = w.addStack();
  footerRow.layoutHorizontally();

  const othersPct = Math.max(0, 100 - top8Sum).toFixed(1);
  const footerTxt = footerRow.addText(`기타 세부종목 비중 ${othersPct}% · 터치하여 시트 열기`);
  footerTxt.font = Font.systemFont(9);
  footerTxt.textColor = new Color("#636366");

  w.url = SHEET_EDIT_URL;
  w.refreshAfterDate = new Date(Date.now() + 1000 * 60 * 15);

  return w;
}

/**
 * Draw rounded progress bar using DrawContext
 */
function drawProgressBar(pct, maxPct, colorHex, width, height) {
  const ctx = new DrawContext();
  ctx.size = new Size(width, height);
  ctx.opaque = false;
  ctx.respectScreenScale = true;

  const bgPath = new Path();
  bgPath.addRoundedRect(new Rect(0, 0, width, height), height / 2, height / 2);
  ctx.addPath(bgPath);
  ctx.setFillColor(new Color("#25262B"));
  ctx.fillPath();

  const ratio = Math.min(1.0, Math.max(0.05, pct / maxPct));
  const fillWidth = Math.max(height, width * ratio);
  const fillPath = new Path();
  fillPath.addRoundedRect(new Rect(0, 0, fillWidth, height), height / 2, height / 2);
  ctx.addPath(fillPath);
  ctx.setFillColor(new Color(colorHex));
  ctx.fillPath();

  return ctx.getImage();
}

/**
 * Draw segmented horizontal bar
 */
function drawSegmentBar(items, width, height) {
  const ctx = new DrawContext();
  ctx.size = new Size(width, height);
  ctx.opaque = false;
  ctx.respectScreenScale = true;

  const bgPath = new Path();
  bgPath.addRoundedRect(new Rect(0, 0, width, height), height / 2, height / 2);
  ctx.addPath(bgPath);
  ctx.setFillColor(new Color("#25262B"));
  ctx.fillPath();

  let currentX = 0;
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const itemW = (item.pct / 100.0) * width;
    if (itemW <= 0) continue;

    const segPath = new Path();
    segPath.addRect(new Rect(currentX, 0, itemW, height));
    ctx.addPath(segPath);
    ctx.setFillColor(new Color(getItemColor(item.name)));
    ctx.fillPath();

    currentX += itemW;
  }

  return ctx.getImage();
}

/**
 * Map item name to asset category color
 */
function getItemColor(name) {
  if (name.includes("비트코인") || name.includes("이더리움") || name.includes("솔라나") || name.includes("CONL")) {
    return "#F7931A";
  }
  if (name.includes("금") || name.includes("GLDM")) {
    return "#FFD700";
  }
  if (name.includes("Kodex 200") || name.includes("한국") || name.includes("삼전") || name.includes("초단기채권")) {
    return "#34A853";
  }
  if (name.includes("나스닥") || name.includes("GOOGL") || name.includes("글로벌") || name.includes("배당다우") || 
      name.includes("TQQQ") || name.includes("SOXL") || name.includes("DRAM") || name.includes("차이나")) {
    return "#4285F4";
  }
  return "#8E8E93";
}

function formatAmount(val) {
  if (val >= 1e8) {
    return `₩${(val / 1e8).toFixed(2)}억`;
  }
  return `₩${(val / 1e6).toFixed(1)}M`;
}

/**
 * Fetch and parse CSV
 */
async function fetchHoldingsData() {
  const fallback = {
    netAsset: "₩224.4M",
    holdings: [
      { name: "Kodex 200",   pct: 17.61, amt: 39502500 },
      { name: "Time 나스닥",  pct: 15.03, amt: 33716030 },
      { name: "Koact 나스닥", pct: 14.55, amt: 32646750 },
      { name: "비트코인",     pct: 13.87, amt: 31123500 },
      { name: "GOOGL",        pct: 8.67,  amt: 19462115 },
      { name: "금현물",       pct: 7.87,  amt: 17669000 },
      { name: "보증금",       pct: 7.13,  amt: 16000000 },
      { name: "이더리움",     pct: 6.83,  amt: 15335000 },
      { name: "Time 글로벌AI", pct: 5.96, amt: 13365000 },
      { name: "배당다우",     pct: 5.55,  amt: 12444000 }
    ]
  };

  try {
    const cacheBuster = (SHEET_CSV_URL.includes("?") ? "&" : "?") + "_t=" + Date.now();
    const req = new Request(SHEET_CSV_URL + cacheBuster);
    req.timeoutInterval = 6;
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

    const parsed = [];
    let netAsset = fallback.netAsset;

    for (let i = 1; i < lines.length; i++) {
      const r = lines[i];
      if (r.length < 3) continue;
      const name = r[0].trim();
      if (!name || name === "총계" || name === "부채") {
        if (name === "총계" && r[2]) {
          const totalVal = parseFloat(r[2].replace(/[₩,\s]/g, ""));
          if (!isNaN(totalVal)) netAsset = `₩${(totalVal / 1e6).toFixed(1)}M`;
        }
        continue;
      }

      const pctVal = parseFloat(r[1].replace("%", "").trim());
      const amtVal = parseFloat(r[2].replace(/[₩,\s]/g, ""));

      if (!isNaN(pctVal) && !isNaN(amtVal) && amtVal > 0) {
        parsed.push({ name, pct: pctVal, amt: amtVal });
      }
    }

    if (parsed.length > 0) {
      parsed.sort((a, b) => b.pct - a.pct);
      return { netAsset, holdings: parsed };
    }

    return fallback;
  } catch (e) {
    return fallback;
  }
}

function formatCurrentTime() {
  const d = new Date();
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${m} KST`;
}
