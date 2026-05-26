import fs from "node:fs";
import vm from "node:vm";

const REPORTS_PATH = "data/reports.js";
const MODEL = process.env.OPENAI_MODEL || "gpt-5";
const API_KEY = process.env.OPENAI_API_KEY;

if (!API_KEY) {
  throw new Error("Missing OPENAI_API_KEY GitHub secret.");
}

const existingReports = readReports();
const existingDates = existingReports.map((report) => report.date);

const prompt = `
你是一名专业的美股市场日报分析师、宏观策略分析师和科技成长股研究员。
请生成一份中文《美股收盘日报》网站数据对象，覆盖截至当前美东时间最近一个已完整收盘的美股交易日。

重要规则：
- 必须使用最新可靠数据，并使用网络搜索核验。
- 优先来源：CNBC、Reuters、Bloomberg、MarketWatch、WSJ、Investing、Yahoo Finance、Barchart、TradingView、Finviz、FactSet、Nasdaq、公司IR、SEC、CME FedWatch、FRED、美国财政部、EIA。
- 所有关键事实、宏观数据、公司新闻、财报数据都要在 sources 数组中附来源链接。
- 不要编造数据。无法可靠获取时写“暂无可靠数据”。
- 如果今天是周末或美股假日，请使用最近一个完整美股交易日。
- 已有日报日期：${JSON.stringify(existingDates)}。如果最新完整交易日已经存在，请仍可输出该日期的更新版，不要输出重复对象数组。

只返回一个 JSON object，不要 Markdown，不要代码块。对象必须符合这个结构：
{
  "date": "YYYY-MM-DD",
  "title": "美股收盘日报",
  "label": "不超过16个中文字符的摘要",
  "generatedAt": "美东时间 ...",
  "coverageNote": "说明覆盖哪个交易日",
  "status": "今日市场状态：...",
  "summary": ["3-5条中文总结"],
  "sources": [{"label": "来源名称", "url": "https://..."}],
  "pulse": [{"label": "S&P 500", "value": "...", "note": "+0.00%", "tone": "positive|negative|neutral"}],
  "sections": [
    {"number":"0","title":"今日一句话总结","paragraphs":["..."]},
    {"number":"1","title":"大盘表现总览","table":{"headers":["..."],"rows":[["..."]]},"paragraphs":["..."]},
    {"number":"2","title":"盘中走势复盘","table":{"headers":["..."],"rows":[["..."]]},"paragraphs":["..."]},
    {"number":"3","title":"宏观环境","table":{"headers":["..."],"rows":[["..."]]},"paragraphs":["..."]},
    {"number":"4","title":"板块表现","table":{"headers":["..."],"rows":[["..."]]},"paragraphs":["..."]},
    {"number":"5","title":"主题与风格表现","bars":[{"label":"...","value":1.23}],"table":{"headers":["..."],"rows":[["..."]]},"paragraphs":["..."]},
    {"number":"6","title":"市场宽度与参与度","table":{"headers":["..."],"rows":[["..."]]},"paragraphs":["..."]},
    {"number":"7","title":"技术面分析","table":{"headers":["..."],"rows":[["..."]]},"paragraphs":["..."]},
    {"number":"8","title":"重点个股新闻与异动","table":{"headers":["..."],"rows":[["..."]]},"paragraphs":["..."]},
    {"number":"9","title":"财报日历与财报解读","table":{"headers":["..."],"rows":[["..."]]},"paragraphs":["..."]},
    {"number":"10","title":"机构观点与资金流","table":{"headers":["..."],"rows":[["..."]]},"paragraphs":["..."]},
    {"number":"11","title":"板块轮动判断","paragraphs":["..."]},
    {"number":"12","title":"我的重点关注股观察","table":{"headers":["股票","当日涨跌","当前趋势","关键新闻/驱动","支撑/压力","判断"],"rows":[["..."]]},"paragraphs":["..."]},
    {"number":"13","title":"明日交易计划/观察清单","paragraphs":["..."]},
    {"number":"14","title":"风险提示","table":{"headers":["风险维度","当前状态","风险等级"],"rows":[["..."]]},"paragraphs":["..."]},
    {"number":"15","title":"最终结论","paragraphs":["..."]}
  ]
}

重点跟踪股票：
NVDA, AMD, AVGO, MRVL, GOOGL, MSFT, META, AMZN, ORCL, CRM, NOW, SNOW, ADBE, PANW, CRWD, PLTR, DDOG, NET, LITE, COHR, AAOI, TSEM, SIVE, ANET, FLNC, OKLO, VST, CEG, ETN, VRT, PWR, GEV, APLD, IREN。
`.trim();

const response = await fetch("https://api.openai.com/v1/responses", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${API_KEY}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    model: MODEL,
    input: prompt,
    tools: [
      {
        type: "web_search_preview",
        search_context_size: "high",
        user_location: {
          type: "approximate",
          country: "US",
          timezone: "America/New_York",
        },
      },
    ],
  }),
});

if (!response.ok) {
  const errorText = await response.text();
  throw new Error(`OpenAI API error ${response.status}: ${errorText}`);
}

const payload = await response.json();
const text = extractResponseText(payload);
const report = parseJsonObject(text);
validateReport(report);

const withoutSameDate = existingReports.filter((item) => item.date !== report.date);
const nextReports = [report, ...withoutSameDate].sort((a, b) => b.date.localeCompare(a.date));
writeReports(nextReports);

console.log(`Wrote market report ${report.date}.`);

function readReports() {
  const source = fs.readFileSync(REPORTS_PATH, "utf8");
  const sandbox = { window: {} };
  vm.runInNewContext(source, sandbox, { filename: REPORTS_PATH });
  return Array.isArray(sandbox.window.MARKET_REPORTS)
    ? sandbox.window.MARKET_REPORTS
    : [];
}

function writeReports(reports) {
  const body = `window.MARKET_REPORTS = ${JSON.stringify(reports, null, 2)};\n`;
  fs.writeFileSync(REPORTS_PATH, body);
}

function extractResponseText(payload) {
  if (payload.output_text) return payload.output_text;

  const chunks = [];
  for (const item of payload.output || []) {
    for (const content of item.content || []) {
      if (content.type === "output_text" && content.text) {
        chunks.push(content.text);
      }
    }
  }
  return chunks.join("\n").trim();
}

function parseJsonObject(text) {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (!match) {
      throw new Error("Model did not return a JSON object.");
    }
    return JSON.parse(match[0]);
  }
}

function validateReport(report) {
  if (!report || typeof report !== "object") {
    throw new Error("Report is not an object.");
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(report.date || "")) {
    throw new Error("Report date must be YYYY-MM-DD.");
  }
  if (!Array.isArray(report.sections) || report.sections.length < 16) {
    throw new Error("Report must include sections 0-15.");
  }
  if (!Array.isArray(report.sources) || report.sources.length === 0) {
    throw new Error("Report must include source links.");
  }
  if (!Array.isArray(report.pulse) || report.pulse.length === 0) {
    throw new Error("Report must include pulse metrics.");
  }
}
