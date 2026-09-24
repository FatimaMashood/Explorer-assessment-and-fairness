import * as Plot from "https://cdn.jsdelivr.net/npm/@observablehq/plot@0.6.17/+esm";

let summary;

const countrySelect = document.querySelector("#country-select");
const factorSelect = document.querySelector("#factor-select");
const appStatus = document.querySelector("#app-status");
const appError = document.querySelector("#app-error");
const appContent = document.querySelector("#app-content");
const retryButton = document.querySelector("#retry-button");
const overallMean = document.querySelector("#overall-mean");
const studentCount = document.querySelector("#student-count");
const schoolCount = document.querySelector("#school-count");
const factorTitle = document.querySelector("#factor-title");
const factorQuestion = document.querySelector("#factor-question");
const chartSummary = document.querySelector("#chart-summary");
const dotPlot = document.querySelector("#dot-plot");
const signalHeading = document.querySelector("#signal-heading");
const signalCopy = document.querySelector("#signal-copy");
const nextAction = document.querySelector("#next-action");
const evidenceNeeded = document.querySelector("#evidence-needed");
const decisionGate = document.querySelector("#decision-gate");
const summaryTable = document.querySelector("#summary-table");
const tableCaption = document.querySelector("#table-caption");
const guardrailList = document.querySelector("#guardrail-list");
const sourceCitation = document.querySelector("#source-citation");
const selectedView = document.querySelector("#selected-view");
const viewStatus = document.querySelector("#view-status");
const aboutViewContent = document.querySelector("#about-view-content");
const copyLinkButton = document.querySelector("#copy-link-button");

const number = new Intl.NumberFormat("en-US");
const percent = new Intl.NumberFormat("en-US", {
  style: "percent",
  maximumFractionDigits: 1,
});

function makeElement(tag, text, className) {
  const element = document.createElement(tag);
  if (text) {
    element.textContent = text;
  }
  if (className) {
    element.className = className;
  }
  return element;
}

function fillSelect(select, entries) {
  entries.forEach(({ value, label }) => {
    const option = makeElement("option", label);
    option.value = value;
    select.append(option);
  });
}

function selectedCountry() {
  return summary.countries.find((country) => country.code === countrySelect.value);
}

function groupRange(groups) {
  const values = groups.map((group) => group.weighted_mean);
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  return { minimum, maximum, difference: maximum - minimum };
}

function renderPlot(groups) {
  const ciLows = groups.map((group) => group.ci_low);
  const ciHighs = groups.map((group) => group.ci_high);
  const domainFloor = Math.floor(Math.min(...ciLows) / 10) * 10 - 5;
  const domainCeiling = Math.ceil(Math.max(...ciHighs) / 10) * 10 + 5;
  const containerWidth = dotPlot.clientWidth || 640;
  const isNarrow = containerWidth < 420;

  const chart = Plot.plot({
    height: (isNarrow ? 84 : 70) * groups.length + 40,
    marginLeft: isNarrow ? 84 : 190,
    marginRight: isNarrow ? 16 : 40,
    marginBottom: isNarrow ? 46 : 34,
    width: dotPlot.clientWidth || 640,
    x: {
      domain: [domainFloor, domainCeiling],
      label: "Weighted mathematics mean (TIMSS scale points)",
      grid: true,
      ticks: isNarrow ? 4 : undefined,
    },
    y: {
      domain: groups.map((group) => group.label),
      label: null,
      tickFormat: (label) =>
        isNarrow && label.length > 11 ? `${label.slice(0, 10)}…` : label,
    },
    style: {
      background: "transparent",
      color: "var(--ink)",
      fontFamily: "inherit",
      fontSize: isNarrow ? "0.74rem" : "0.86rem",
    },
    marks: [
      Plot.ruleY(groups, {
        y: "label",
        x1: "ci_low",
        x2: "ci_high",
        stroke: "var(--accent)",
        strokeWidth: 2,
        marker: "tick",
      }),
      Plot.dot(groups, {
        x: "weighted_mean",
        y: "label",
        r: 6,
        fill: "var(--accent)",
        stroke: "var(--surface)",
        strokeWidth: 2,
      }),
    ],
  });
  chart.setAttribute("role", "img");
  chart.setAttribute(
    "aria-label",
    "Dot plot of weighted mathematics means with 95% confidence intervals by group. See the accessible table below for exact values.",
  );
  dotPlot.replaceChildren(chart);
}

function renderTable(groups, country, factor) {
  tableCaption.textContent =
    `${country.name}: weighted mathematics means by ${factor.title.toLowerCase()}.`;
  summaryTable.replaceChildren(
    ...groups.map((group) => {
      const row = document.createElement("tr");
      const groupHeader = makeElement("th", group.label);
      groupHeader.scope = "row";
      row.append(
        groupHeader,
        makeElement("td", group.weighted_mean.toFixed(1)),
        makeElement("td", `[${group.ci_low.toFixed(1)}, ${group.ci_high.toFixed(1)}]`),
        makeElement("td", number.format(group.unweighted_n)),
        makeElement("td", percent.format(group.student_share)),
        makeElement("td", number.format(group.school_n)),
      );
      return row;
    }),
  );
}

function renderSignal(country, factor) {
  const { groups } = factor;
  const { minimum, maximum, difference } = groupRange(groups);
  const lower = groups.find((group) => group.weighted_mean === minimum);
  const higher = groups.find((group) => group.weighted_mean === maximum);
  const roundedDifference = Math.round(difference);
  const intervalsOverlap = lower.ci_high >= higher.ci_low;

  signalHeading.textContent = `${roundedDifference}-point descriptive span`;
  signalCopy.textContent =
    `In ${country.name}, the selected groups range from ${lower.label.toLowerCase()} ` +
    `(${lower.weighted_mean.toFixed(1)}, 95% CI [${lower.ci_low.toFixed(1)}, ${lower.ci_high.toFixed(1)}]) ` +
    `to ${higher.label.toLowerCase()} (${higher.weighted_mean.toFixed(1)}, 95% CI ` +
    `[${higher.ci_low.toFixed(1)}, ${higher.ci_high.toFixed(1)}]). ${
      intervalsOverlap
        ? "Their confidence intervals overlap, so this span should be treated cautiously."
        : "Their confidence intervals stay separate, so this is a stable descriptive span."
    } Read this as a context signal for follow-up, ahead of any explanation of students' achievement.`;
  chartSummary.textContent =
    `${roundedDifference}-point descriptive span from ${lower.label.toLowerCase()} ` +
    `to ${higher.label.toLowerCase()}, each shown with a 95% confidence interval ` +
    "from TIMSS jackknife replication across five plausible values.";
}

function renderDecisionBrief(factor) {
  evidenceNeeded.replaceChildren(
    ...factor.evidence_needed.map((item) => makeElement("li", item)),
  );
  decisionGate.textContent = factor.decision_gate;
}

function updateUrl() {
  const url = new URL(window.location);
  url.searchParams.set("system", countrySelect.value);
  url.searchParams.set("factor", factorSelect.value);
  window.history.replaceState({}, "", url);
}

function renderAboutView() {
  const fragments = [
    summary.selection_note,
    `${summary.dataset.population}. ${summary.dataset.outcome}.`,
    summary.dataset.design_note,
  ];
  aboutViewContent.replaceChildren(
    ...fragments.map((fragment) => makeElement("p", fragment)),
  );
}

function renderSource() {
  const sourcePrefix = document.createTextNode("Source: ");
  const sourceLink = makeElement("a", summary.source.citation);
  sourceLink.href = summary.source.url;
  const sourceSuffix = document.createTextNode(
    ` Accessed ${summary.source.accessed}. Read the `,
  );
  // On GitHub Pages, link to the rendered files on github.com instead of raw markdown.
  const [owner] = location.hostname.split(".github.io");
  const repo = location.pathname.split("/")[1];
  const docsBase = location.hostname.endsWith(".github.io")
    ? `https://github.com/${owner}/${repo}/blob/main/`
    : "../";
  const methodologyLink = makeElement("a", "technical note");
  methodologyLink.href = `${docsBase}TECHNICAL_NOTE.md`;
  const readmeLink = makeElement("a", "local run guide");
  readmeLink.href = `${docsBase}README.md`;

  sourceCitation.replaceChildren(
    sourcePrefix,
    sourceLink,
    sourceSuffix,
    methodologyLink,
    document.createTextNode(" and "),
    readmeLink,
    document.createTextNode("."),
  );
}

function render() {
  const country = selectedCountry();
  const factor = country.factors[factorSelect.value];
  const selectedLabel = `${country.name} · ${factor.title}`;

  overallMean.textContent =
    `${country.weighted_math_mean.toFixed(1)} ` +
    `[${country.weighted_math_ci_low.toFixed(1)}, ${country.weighted_math_ci_high.toFixed(1)}]`;
  studentCount.textContent = number.format(country.valid_score_count);
  schoolCount.textContent = number.format(country.school_count);
  factorTitle.textContent = factor.title;
  factorQuestion.textContent = factor.question;
  nextAction.textContent = factor.next_action;
  renderDecisionBrief(factor);
  selectedView.textContent = selectedLabel;
  viewStatus.textContent = `${selectedLabel} selected.`;

  renderPlot(factor.groups);
  renderTable(factor.groups, country, factor);
  renderSignal(country, factor);
  updateUrl();
}

function setInitialSelection() {
  const params = new URLSearchParams(window.location.search);
  const countryCodes = summary.countries.map((country) => country.code);
  const factorCodes = Object.keys(summary.countries[0].factors);

  countrySelect.value = countryCodes.includes(params.get("system"))
    ? params.get("system")
    : "aus";
  factorSelect.value = factorCodes.includes(params.get("factor"))
    ? params.get("factor")
    : "home_resources";
}

async function copyViewLink() {
  try {
    await navigator.clipboard.writeText(window.location.href);
    copyLinkButton.textContent = "Copied";
    viewStatus.textContent = "Link to this view copied to the clipboard.";
  } catch {
    copyLinkButton.textContent = "Copy unavailable";
    viewStatus.textContent =
      "Your browser did not allow copying. Copy the address from the browser instead.";
  }
  window.setTimeout(() => {
    copyLinkButton.textContent = "Copy this view";
  }, 2200);
}

function showError() {
  appStatus.hidden = true;
  appContent.hidden = true;
  appError.hidden = false;
}

async function loadSummary() {
  appError.hidden = true;
  appStatus.hidden = false;
  appStatus.textContent = "Loading prepared assessment summaries…";

  try {
    const response = await fetch("../data/summary.json");
    if (!response.ok) {
      throw new Error(`Data request failed: ${response.status}`);
    }
    summary = await response.json();
    if (!Array.isArray(summary.countries) || !summary.countries.length) {
      throw new Error("Prepared data does not contain any country summaries.");
    }

    countrySelect.replaceChildren();
    factorSelect.replaceChildren();
    fillSelect(
      countrySelect,
      summary.countries.map((country) => ({
        value: country.code,
        label: country.name,
      })),
    );
    fillSelect(
      factorSelect,
      Object.entries(summary.countries[0].factors).map(([value, factor]) => ({
        value,
        label: factor.title,
      })),
    );
    guardrailList.replaceChildren(
      ...summary.guardrails.map((guardrail) => makeElement("li", guardrail)),
    );
    renderAboutView();
    renderSource();
    setInitialSelection();

    appStatus.hidden = true;
    appContent.hidden = false;
    render();
  } catch (error) {
    console.error(error);
    showError();
  }
}

countrySelect.addEventListener("change", render);
factorSelect.addEventListener("change", render);
copyLinkButton.addEventListener("click", copyViewLink);
retryButton.addEventListener("click", loadSummary);

loadSummary();
