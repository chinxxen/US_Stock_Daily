(function () {
  const reports = [...(window.MARKET_REPORTS || [])].sort((a, b) =>
    b.date.localeCompare(a.date)
  );

  const reportRoot = document.getElementById("reportRoot");
  const dateList = document.getElementById("dateList");
  const reportCount = document.getElementById("reportCount");
  const latestDatePill = document.getElementById("latestDatePill");
  const latestButton = document.getElementById("latestButton");

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function getSelectedDate() {
    const hash = decodeURIComponent(window.location.hash.replace(/^#/, ""));
    if (!hash || hash === "latest") return reports[0]?.date;
    return hash;
  }

  function toneClass(value) {
    if (!value) return "";
    if (value.startsWith("-")) return "negative";
    if (value.startsWith("+")) return "positive";
    return "neutral";
  }

  function renderTable(table) {
    if (!table) return "";
    return `
      <div class="table-wrap">
        <table>
          <thead>
            <tr>${table.headers.map((item) => `<th>${escapeHtml(item)}</th>`).join("")}</tr>
          </thead>
          <tbody>
            ${table.rows
              .map(
                (row) => `
                  <tr>
                    ${row
                      .map((item) => `<td class="${toneClass(String(item))}">${escapeHtml(item)}</td>`)
                      .join("")}
                  </tr>
                `
              )
              .join("")}
          </tbody>
        </table>
      </div>
    `;
  }

  function renderBars(bars) {
    if (!bars) return "";
    const max = Math.max(...bars.map((item) => Math.abs(item.value)), 1);
    return `
      <div class="mini-bars">
        ${bars
          .map((item) => {
            const width = Math.max(8, (Math.abs(item.value) / max) * 100);
            return `
              <div class="mini-bar">
                <strong>${escapeHtml(item.label)}</strong>
                <span class="bar-track"><span class="bar-fill" style="width:${width}%"></span></span>
                <span class="${item.value >= 0 ? "positive" : "negative"}">${item.value > 0 ? "+" : ""}${item.value.toFixed(2)}%</span>
              </div>
            `;
          })
          .join("")}
      </div>
    `;
  }

  function renderDateList(selectedDate) {
    dateList.innerHTML = reports
      .map(
        (report) => `
          <a class="date-link ${report.date === selectedDate ? "active" : ""}" href="#${report.date}">
            <strong>${escapeHtml(report.date)}</strong>
            <span>${escapeHtml(report.label || report.status)}</span>
          </a>
        `
      )
      .join("");
  }

  function renderReport(report) {
    if (!report) {
      reportRoot.innerHTML = `
        <section class="empty-state">
          <h1>没有找到这一天的日报</h1>
          <p>请选择左侧日期，或回到最新日报。</p>
        </section>
      `;
      return;
    }

    reportRoot.innerHTML = `
      <article>
        <header class="report-header">
          <div class="report-title-row">
            <div>
              <h1>${escapeHtml(report.title)}</h1>
              <p class="footnote">${escapeHtml(report.generatedAt)} · ${escapeHtml(report.coverageNote)}</p>
            </div>
            <span class="report-date">${escapeHtml(report.date)}</span>
          </div>

          <div class="status-bar">
            <p class="status-copy">${escapeHtml(report.status)}</p>
            <div class="market-pulse">
              ${report.pulse
                .map(
                  (item) => `
                    <div class="pulse-card">
                      <span>${escapeHtml(item.label)}</span>
                      <strong>${escapeHtml(item.value)}</strong>
                      <small class="${escapeHtml(item.tone)}">${escapeHtml(item.note)}</small>
                    </div>
                  `
                )
                .join("")}
            </div>
          </div>

          <div class="source-row">
            ${report.sources
              .map(
                (source) => `
                  <a class="source-link" href="${escapeHtml(source.url)}" target="_blank" rel="noreferrer">
                    ${escapeHtml(source.label)}
                  </a>
                `
              )
              .join("")}
          </div>
        </header>

        <div class="section-grid">
          ${report.sections
            .map(
              (section) => `
                <section class="report-section" id="section-${escapeHtml(section.number)}">
                  <h2>
                    <span class="section-number">${escapeHtml(section.number)}</span>
                    ${escapeHtml(section.title)}
                  </h2>
                  ${renderBars(section.bars)}
                  ${renderTable(section.table)}
                  ${(section.paragraphs || []).map((text) => `<p>${escapeHtml(text)}</p>`).join("")}
                </section>
              `
            )
            .join("")}
        </div>
      </article>
    `;
  }

  function render() {
    const selectedDate = getSelectedDate();
    const report = reports.find((item) => item.date === selectedDate) || reports[0];
    reportCount.textContent = `${reports.length} 篇日报`;
    latestDatePill.textContent = reports[0] ? `最新 ${reports[0].date}` : "暂无日报";
    renderDateList(report?.date);
    renderReport(report);
    reportRoot.focus({ preventScroll: true });
  }

  latestButton.addEventListener("click", () => {
    window.location.hash = "latest";
  });
  window.addEventListener("hashchange", render);

  render();
})();
