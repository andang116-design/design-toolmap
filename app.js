"use strict";

// The five stages of the workflow. The order here is the order on the page.
// Each tool in data/tools.json lists the stage ids it belongs to.
const STAGES = [
  { id: "explore", label: "Explore", hint: "Find ideas and references" },
  { id: "define",  label: "Define",  hint: "Choose colour and type" },
  { id: "source",  label: "Source",  hint: "Get icons, images and illustrations" },
  { id: "make",    label: "Make",    hint: "Build the design" },
  { id: "present", label: "Present", hint: "Share and collect feedback" }
];

const PRICING_LABELS = { free: "Free", freemium: "Freemium", paid: "Paid" };

// Build an element with optional class and text. textContent (never innerHTML)
// keeps the page safe even if someone adds odd characters to the data file.
function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

// Only allow normal web links.
function safeUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : null;
  } catch (error) {
    return null;
  }
}

function stageLabel(id) {
  const stage = STAGES.find((s) => s.id === id);
  return stage ? stage.label : id;
}

function addTag(list, text, modifier) {
  const item = el("li", "tag " + modifier, text);
  list.append(item);
}

function buildCard(tool, currentStage) {
  const card = el("article", "card");
  if (tool.status === "dead") card.classList.add("is-dead");

  const title = el("h3", "card-title");
  const href = safeUrl(tool.url);
  if (href) {
    const link = el("a", "card-link", tool.name);
    link.href = href;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    title.append(link);
  } else {
    title.textContent = tool.name;
  }

  const description = el("p", "card-desc", tool.description);

  const tags = el("ul", "tags");
  addTag(tags, PRICING_LABELS[tool.pricing] || tool.pricing, "tag-" + tool.pricing);
  if (tool.openSource) addTag(tags, "Open source", "tag-open");
  if (tool.status === "dead") addTag(tags, "Link may be dead", "tag-dead");

  card.append(title, description, tags);

  const otherStages = tool.stages.filter((id) => id !== currentStage);
  if (otherStages.length > 0) {
    card.append(el("p", "also", "Also in: " + otherStages.map(stageLabel).join(", ")));
  }

  return card;
}

function buildStage(stage, index, tools) {
  const section = el("section", "stage");

  const header = el("header", "stage-header");
  header.append(
    el("p", "stage-number", "Stage " + (index + 1)),
    el("h2", "stage-title", stage.label),
    el("p", "stage-hint", stage.hint)
  );

  const stageTools = tools
    .filter((tool) => tool.stages.includes(stage.id))
    .sort((a, b) => a.name.localeCompare(b.name));

  section.append(header);

  if (stageTools.length === 0) {
    section.append(el("p", "stage-empty", "No tools yet."));
    return section;
  }

  const list = el("ul", "stage-list");
  stageTools.forEach((tool) => {
    const item = el("li");
    item.append(buildCard(tool, stage.id));
    list.append(item);
  });
  section.append(list);
  return section;
}

function render(tools) {
  const map = document.getElementById("map");
  map.replaceChildren(...STAGES.map((stage, index) => buildStage(stage, index, tools)));

  const summary = document.getElementById("summary");
  summary.textContent = tools.length + " tools across " + STAGES.length + " stages";
}

function showMessage(text) {
  document.getElementById("message").textContent = text;
}

async function init() {
  try {
    const response = await fetch("data/tools.json", { cache: "no-cache" });
    if (!response.ok) throw new Error("HTTP " + response.status);
    const tools = await response.json();
    render(tools);
  } catch (error) {
    showMessage(
      "Could not load data/tools.json. If you opened this file straight from your computer, " +
      "use the published GitHub Pages link instead. Otherwise check that the file exists and is valid JSON."
    );
  }
}

init();
