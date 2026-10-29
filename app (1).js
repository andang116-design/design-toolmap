"use strict";

// The five stages of the workflow. Each tool in data/tools.json lists
// the stage ids it belongs to. The ids must match data-stage in index.html.
const STAGES = [
  { id: "explore", label: "Explore", hint: "Find ideas and references" },
  { id: "define",  label: "Define",  hint: "Choose colour and type" },
  { id: "source",  label: "Source",  hint: "Get icons, images and illustrations" },
  { id: "make",    label: "Make",    hint: "Build the design" },
  { id: "present", label: "Present", hint: "Share and collect feedback" }
];

const PRICING_LABELS = { free: "Free", freemium: "Freemium", paid: "Paid" };
const ISSUES_URL = "https://github.com/andang116-design/design-toolmap/issues";

// Page elements we talk to
const $ = (id) => document.getElementById(id);
const intro = $("intro");
const scene = $("scene");
const summary = $("summary");
const message = $("message");
const panel = $("panel");
const panelKicker = $("panel-kicker");
const panelTitle = $("panel-title");
const panelHint = $("panel-hint");
const panelBody = $("panel-body");
const stageButtons = document.querySelectorAll(".stage-btn");

// Things we remember while the page is open
let tools = null;          // the list from tools.json (null until loaded)
let loadFailed = false;    // true if tools.json could not be read
let currentStageId = null; // which stage the panel is showing
let lastTrigger = null;    // the button to give focus back to when the panel closes

/* ----------------------------------------------------------
   Small helpers
   ---------------------------------------------------------- */

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

function toolsIn(stageId) {
  return (tools || [])
    .filter((tool) => tool.stages.includes(stageId))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/* ----------------------------------------------------------
   Tool cards and the stage panel
   ---------------------------------------------------------- */

function addTag(list, text, modifier) {
  list.append(el("li", "tag " + modifier, text));
}

function buildCard(tool, stageId) {
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

  const tags = el("ul", "tags");
  addTag(tags, PRICING_LABELS[tool.pricing] || tool.pricing, "tag-" + tool.pricing);
  if (tool.openSource) addTag(tags, "Open source", "tag-open");
  if (tool.status === "dead") addTag(tags, "Link may be dead", "tag-dead");

  card.append(title, el("p", "card-desc", tool.description), tags);

  // Tools that belong to several stages link to the other stages.
  const others = tool.stages.filter((id) => id !== stageId);
  if (others.length > 0) {
    const also = el("p", "also", "Also in: ");
    others.forEach((id, index) => {
      if (index > 0) also.append(", ");
      const button = el("button", "also-btn", stageLabel(id));
      button.type = "button";
      button.addEventListener("click", () => openStage(id));
      also.append(button);
    });
    card.append(also);
  }

  return card;
}

function buildStageContent(stage) {
  if (loadFailed) {
    return [el("p", "panel-empty", "The tool list could not be loaded. Try reloading the page.")];
  }
  if (!tools) {
    return [el("p", "panel-empty", "Loading tools…")];
  }

  const list = toolsIn(stage.id);
  if (list.length === 0) {
    const empty = el("p", "panel-empty", "No tools here yet. ");
    const link = el("a", "", "Suggest one on GitHub");
    link.href = ISSUES_URL;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    empty.append(link, ".");
    return [empty];
  }

  return list.map((tool) => buildCard(tool, stage.id));
}

function openStage(id, trigger) {
  const index = STAGES.findIndex((s) => s.id === id);
  if (index < 0) return;
  const stage = STAGES[index];

  currentStageId = id;
  if (trigger) lastTrigger = trigger;

  panelKicker.textContent = "Stage " + (index + 1) + " of " + STAGES.length;
  panelTitle.textContent = stage.label;
  panelHint.textContent = stage.hint;
  panelBody.replaceChildren(...buildStageContent(stage));
  panelBody.scrollTop = 0;

  if (!panel.open) panel.showModal();
  panelTitle.focus();
}

/* ----------------------------------------------------------
   The intro: lights on
   ---------------------------------------------------------- */

function lightsOn(event) {
  if (document.body.classList.contains("is-lit")) return;
  document.body.classList.add("is-lit");
  intro.inert = true;
  scene.inert = false;

  // A keyboard user pressed Enter on "Yes" (a click with detail 0), so once
  // the objects have popped in, hand keyboard focus to the first one.
  // Mouse users keep a clean desk with no focus glow.
  const usedKeyboard = event && event.detail === 0;
  if (usedKeyboard) {
    window.setTimeout(() => {
      if (stageButtons[0]) stageButtons[0].focus({ preventScroll: true });
    }, 1200);
  }
}

/* ----------------------------------------------------------
   Loading the data
   ---------------------------------------------------------- */

function describeStageButtons() {
  stageButtons.forEach((button) => {
    const stage = STAGES.find((s) => s.id === button.dataset.stage);
    if (!stage) return;
    let text = stage.label + ": " + stage.hint;
    if (tools) text += ". " + toolsIn(stage.id).length + " tools";
    button.setAttribute("aria-label", text);
  });
}

async function loadTools() {
  try {
    const response = await fetch("data/tools.json", { cache: "no-cache" });
    if (!response.ok) throw new Error("HTTP " + response.status);
    tools = await response.json();
  } catch (error) {
    loadFailed = true;
    message.textContent =
      "Could not load data/tools.json. If you opened this file straight from your computer, " +
      "use the published GitHub Pages link instead. Otherwise check that the file exists and is valid JSON.";
    return;
  }

  summary.textContent = tools.length + " tools · " + STAGES.length + " stages";
  describeStageButtons();
  if (panel.open && currentStageId) openStage(currentStageId);
}

/* ----------------------------------------------------------
   Start
   ---------------------------------------------------------- */

function init() {
  document.documentElement.classList.add("armed");

  // Keep the desk out of reach until the lights are on.
  scene.inert = true;

  $("yes").addEventListener("click", lightsOn);
  $("yes-red").addEventListener("click", lightsOn);

  stageButtons.forEach((button) => {
    button.addEventListener("click", () => openStage(button.dataset.stage, button));
  });

  $("panel-close").addEventListener("click", () => panel.close());
  // A click on the dimmed area behind the panel closes it.
  panel.addEventListener("click", (event) => {
    if (event.target === panel) panel.close();
  });
  panel.addEventListener("close", () => {
    currentStageId = null;
    if (lastTrigger) lastTrigger.focus({ preventScroll: true });
  });

  describeStageButtons();
  $("yes").focus({ preventScroll: true });
  loadTools();
}

init();
