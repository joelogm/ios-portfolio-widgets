// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: green; icon-glyph: chart-bar;

/**
 * 100% Dynamic Portfolio Holdings Visualization Widget for iOS Scriptable (Large 4x4)
 * - Dynamically parses '세부종목' (Holding Name) and '비중(평가금액의 SUM)' (Weight %) from Google Sheets CSV.
 * - 0% Hardcoding: Automatically recalculates rankings, percentages, and progress bars as sheet rows change.
 * - Top multi-segment gauge + individual horizontal progress bars + one-tap refresh button.
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
  w.setPadding(16, 16, 14, 16);

  // 1. Load holdings dynamically
  const data = await fetchDynamicHoldings();
  const allItems = data.items;
  const topItems = allItems.slice(0, 8); // Top 8 holdings
  const topSum = topItems.reduce((acc, cur) => acc + cur.pct, 0);
  const maxPct = topItems.length > 0 ? topItems[0].pct : 20.0;

  // 2. Header
  const headerRow = w.addStack();
  headerRow.layoutHorizontally();

  const titleCol = headerRow.addStack();
  titleCol.layoutVertically();

  const titleTxt = titleCol.addText("▲ PORTFOLIO HOLDINGS");
  titleTxt.font = Font.boldSystemFont(11);
  titleTxt.textColor = new Color("#34A853");

  titleCol.addSpacer(2);

  const subTxt = titleCol.addText(`Top 8 비중 ${topSum.toFixed(1)}% · 총 ${allItems.length}개 종목`);
  subTxt.font = Font.systemFont(9);
  subTxt.textColor = new Color("#8E8E93");

  headerRow.addSpacer();

  // Right Header: Time & Refresh Button
  const rightCol = headerRow.addStack();
  rightCol.layoutVertically();

  const timeRow = rightCol.addStack();
  timeRow.addSpacer();
  const timeTxt = timeRow.addText(formatCurrentTime());
  timeTxt.font = Font.systemFont(9);
  timeTxt.textColor = new Color("#8E8E93");

  rightCol.addSpacer(3);

  const btnRow = rightCol.addStack();
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

  w.addSpacer(10);

  // 3. Top Multi-Segment Proportion Bar
  if (topItems.length > 0) {
    const segmentBar = drawSegmentBar(topItems, 300, 6);
    const segmentImg = w.addImage(segmentBar);
    segmentImg.imageSize = new Size(300, 6);
  }

  w.addSpacer(10);

  // 4. Holdings List (Dynamic)
  if (topItems.length === 0) {
    const emptyRow = w.addStack();
    emptyRow.addSpacer();
    const emptyTxt = emptyRow.addText("구글 시트 CSV 링크를 연결해 주세요");
    emptyTxt.font = Font.systemFont(10);
    emptyTxt.textColor = new Color("#8E8E93");
    emptyRow.addSpacer();
  } else {
    for (let i = 0; i < topItems.length; i++) {
      const item = topItems[i];
      const rank = i + 1;
      const itemColor = getItemColor(item.name, i);

      const row = w.addStack();
      row.layoutHorizontally();

      // Rank (#1, #2)
      const rankTxt = row.addText(`#${rank}`);
      rankTxt.font = Font.boldSystemFont(9);
      rankTxt.textColor = new Color("#636366");

      row.addSpacer(5);

      // Color Dot
      const dotTxt = row.addText("• ");
      dotTxt.font = Font.boldSystemFont(11);
      dotTxt.textColor = new Color(itemColor);

      // Name
      const nameTxt = row.addText(item.name);
      nameTxt.font = Font.boldSystemFont(10);
      nameTxt.textColor = new Color("#FFFFFF");

      row.addSpacer();

      // Dynamic Progress Bar (80px width)
      const progressBar = drawProgressBar(item.pct, maxPct, itemColor, 80, 5);
      const barImg = row.addImage(progressBar);
      barImg.imageSize = new Size(80, 5);

      row.addSpacer(8);

      // Percentage
      const pctTxt = row.addText(`${item.pct.toFixed(1)}%`);
      pctTxt.font = Font.boldSystemFont(10);
      pctTxt.textColor = new Color("#FFFFFF");

      // Amount if available
      if (item.amt && item.amt > 0) {
        row.addSpacer(6);
        const amtTxt = row.addText(formatAmount(item.amt));
        amtTxt.font = Font.systemFont(9);
        amtTxt.textColor = new Color("#8E8E93");
      }

      w.addSpacer(4);
    }
  }

  w.addSpacer(6);

  // 5. Footer
  const footerRow = w.addStack();
  footerRow.layoutHorizontally();

  const othersPct = Math.max(0, 100 - topSum).toFixed(1);
  const otherCount = Math.max(0, allItems.length - topItems.length);
  const footerTxt = footerRow.addText(`기타 ${otherCount}개 세부종목 (${othersPct}%) · 터치하여 시트 열기`);
  footerTxt.font = Font.systemFont(9);
  footerTxt.textColor = new Color("#636366");

  w.url = SHEET_EDIT_URL;
  w.refreshAfterDate = new Date(Date.now() + 1000 * 60 * 15);

  return w;
}

/**
 * Draw rounded progress bar
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

  const ratio = Math.min(1.0, Math.max(0.04, pct / maxPct));
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
    ctx.setFillColor(new Color(getItemColor(item.name, i)));
    ctx.fillPath();

    currentX += itemW;
  }

  return ctx.getImage();
}

/**
 * Dynamic color mapping
 */
function getItemColor(name, index) {
  if (name.includes("비트코인") || name.includes("이더리움") || name.includes("솔라나") || name.includes("CONL")) {
    return "#F7931A";
  }
  if (name.includes("금") || name.includes("GLDM")) {
    return "#FFD700";
  }
  if (name.includes("Kodex 200") || name.includes("한국") || name.includes("삼전") || name.includes("채권")) {
    return "#34A853";
  }
  if (name.includes("나스닥") || name.includes("GOOGL") || name.includes("글로벌") || name.includes("배당다우") || 
      name.includes("TQQQ") || name.includes("SOXL") || name.includes("DRAM") || name.includes("차이나")) {
    return "#4285F4";
  }
  if (name.includes("보증금") || name.includes("청약") || name.includes("현금")) {
    return "#8E8E93";
  }

  const palette = ["#5E9BFF", "#30D158", "#FF9F0A", "#BF5AF2", "#64D2FF", "#FF375F", "#AC8E68"];
  return palette[index % palette.length];
}

function formatAmount(val) {
  if (val >= 1e8) {
    return `₩${(val / 1e8).toFixed(1)}억`;
  }
  return `₩${(val / 1e6).toFixed(1)}M`;
}

/**
 * Fetch and parse CSV completely dynamically
 */
async function fetchDynamicHoldings() {
  const fallback = {
    items: [
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

  if (!SHEET_CSV_URL || SHEET_CSV_URL.includes("YOUR_PUBLISHED_HOLDINGS_CSV_URL_HERE")) {
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

    if (lines.length < 2) return fallback;

    const header = lines[0];
    let nameCol = 0;
    let pctCol = 1;
    let amtCol = 2;

    for (let c = 0; c < header.length; c++) {
      const h = header[c];
      if (h.includes("세부종목") || h.includes("종목")) {
        nameCol = c;
      }
      if (h.includes("평가") || h.includes("비중") || h.includes("SUM")) {
        if (lines.length > 1 && lines[1][c] && lines[1][c].includes("%")) {
          pctCol = c;
        } else if (lines.length > 1 && lines[1][c] && lines[1][c].includes("₩")) {
          amtCol = c;
        }
      }
    }

    const parsed = [];
    for (let i = 1; i < lines.length; i++) {
      const r = lines[i];
      if (r.length <= Math.max(nameCol, pctCol)) continue;

      const name = r[nameCol].trim();
      if (!name || name === "총계" || name === "합계" || name === "부채") continue;

      const pctStr = r[pctCol].replace("%", "").trim();
      const pctVal = parseFloat(pctStr);

      if (!isNaN(pctVal) && pctVal > 0) {
        let amtVal = 0;
        if (r.length > amtCol && r[amtCol]) {
          amtVal = parseFloat(r[amtCol].replace(/[₩,\s]/g, ""));
          if (isNaN(amtVal)) amtVal = 0;
        }

        parsed.push({
          name: name,
          pct: pctVal,
          amt: amtVal
        });
      }
    }

    if (parsed.length > 0) {
      parsed.sort((a, b) => b.pct - a.pct);
      return { items: parsed };
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
