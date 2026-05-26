import fs from "node:fs";
import vm from "node:vm";

const source = fs.readFileSync("data/reports.js", "utf8");
const sandbox = { window: {} };
vm.runInNewContext(source, sandbox, { filename: "data/reports.js" });
const [latest] = sandbox.window.MARKET_REPORTS || [];

if (!latest?.date) {
  throw new Error("No latest report date found.");
}

process.stdout.write(latest.date);
