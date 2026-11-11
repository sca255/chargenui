// Client-side Character Health Audit
import { state } from "../core/state.js";
import { el } from "../core/dom.js";
import { estimateTokens } from "../utils/macros.js";

export function runLocalAudit() {
  const c = state.character;
  const desc = (c.description || "").trim();
  const pers = (c.personality || "").trim();
  const firstMes = (c.first_mes || "").trim();
  const ex = (c.mes_example || "").trim();

  // If card is completely empty, display BS / 100 HEALTH
  const isEmpty = !desc && !pers && !firstMes;
  if (isEmpty) {
    el.cardScoreNum.textContent = "BS";
    el.cardScoreNum.style.color = "var(--accent-red)";
    el.cardScoreSummary.textContent = "Card is completely empty. There is no character content to evaluate.";
    el.auditFindingsList.innerHTML = `<div style="color:var(--text-muted); font-size:11px; font-style:italic;">Card is currently blank. Generate or enter character details.</div>`;
    return;
  }

  let score = 100;
  const issues = [];
  const strengths = [];

  // 1. Description analysis
  if (!desc) {
    score -= 30;
    issues.push("Description is completely empty.");
  } else if (desc.length < 150) {
    score -= 15;
    issues.push("Description is very brief/shallow.");
  } else {
    strengths.push("Substantial description length.");
  }

  // Check for generic cliché words
  const cliches = ["smirks mischievously", "heart of gold", "dark past", "mysterious stranger", "loyal to a fault", "lethal killer with a soft spot"];
  const foundCliches = cliches.filter((cl) => desc.toLowerCase().includes(cl));
  if (foundCliches.length > 0) {
    score -= 10;
    issues.push(`Contains cliché trope phrases: ${foundCliches.map((cl) => `"${cl}"`).join(", ")}.`);
  }

  // 2. Personality
  if (!pers) {
    score -= 15;
    issues.push("Missing dedicated personality or behavioral spec.");
  }

  // 3. Central contradiction check
  const hasContradiction = /contradiction|tension|conflict|torn between|paradox|split between/i.test(desc + " " + pers);
  if (!hasContradiction) {
    score -= 12;
    issues.push("No distinct central contradiction detected — character may read as a one-dimensional archetype.");
  } else {
    strengths.push("Has internal tension / central contradiction.");
  }

  // 4. First message analysis
  if (!firstMes) {
    score -= 25;
    issues.push("Missing opening first message.");
  } else if (firstMes.length < 120) {
    score -= 12;
    issues.push("First message is very short or passive.");
  } else {
    strengths.push("Well-developed opening message.");
  }

  // Puppeteering check
  if (firstMes.includes("You feel") || firstMes.includes("You say") || firstMes.includes("You think")) {
    score -= 10;
    issues.push("First message narrates {{user}}'s feelings or dialogue (puppeteering).");
  }

  // Single-quoted dialogue check (Lumiverse / SillyTavern highlighting)
  if (firstMes && /(?:^|[\s—–(\[{*])['‘][A-Z][^"'\n]+?[.!?]['’]/.test(firstMes)) {
    score -= 5;
    issues.push("First message uses single quotes ('...') for spoken dialogue. Lumiverse/SillyTavern require double quotes (\"...\") for highlighting.");
  }

  // 5. Example dialogues check
  if (!ex) {
    score -= 15;
    issues.push("No example dialogues provided (<START> blocks).");
  } else if (!ex.includes("<START>")) {
    score -= 5;
    issues.push("Example dialogues not in standard <START> format.");
  } else {
    strengths.push("Includes formatted example dialogues (<START>).");
  }

  // 6. Roleplay Macro syntax check
  const allText = [desc, pers, c.scenario || "", firstMes, ex, ...(c.alternate_greetings || [])].join("\n");
  let macroIssues = 0;
  if (/(?<!\{)\{(?:user|char|bot)\}(?!\})/i.test(allText)) {
    issues.push("Found malformed single-brace macros ({user} or {char}). Standard requires {{user}} / {{char}}.");
    macroIssues++;
    score -= 5;
  }
  if (/<user>|<char>|<bot>/i.test(allText)) {
    issues.push("Found legacy angle-bracket macros (<USER> / <CHAR>). Standard requires {{user}} / {{char}}.");
    macroIssues++;
    score -= 5;
  }
  if (ex && c.name && c.name.length > 2) {
    const escaped = c.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (new RegExp(`^${escaped}:`, "m").test(ex)) {
      issues.push(`Example dialogues hardcode "${c.name}:" instead of "{{char}}:".`);
      macroIssues++;
      score -= 5;
    }
  }
  if (macroIssues === 0) {
    strengths.push("Valid roleplay macro formatting ({{user}} & {{char}}).");
  }

  // 7. Alternate greetings check
  if (!c.alternate_greetings || c.alternate_greetings.length === 0) {
    issues.push("No alternate greetings available for different RP scenarios.");
    score -= 5;
  } else {
    strengths.push(`Has ${c.alternate_greetings.length} alternate greeting(s).`);
  }

  // 8. Natural Spoken Cadence vs Robotic Thesaurus Caricature Check
  const roboticPhrases = [
    "treats every conversation as an academic lecture",
    "treating every conversation as an academic lecture",
    "uses complex linguistic structures and technical jargon as a shield",
    "statistical anomaly",
    "mathematically unsound",
    "nutrient density",
    "altering my trajectory",
    "inefficiency of your chaos",
  ];
  const combinedText = `${pers} ${ex}`.toLowerCase();
  const detectedRobotic = roboticPhrases.filter((p) => combinedText.includes(p));
  if (detectedRobotic.length > 0) {
    issues.push(`Robotic / unnatural dialogue tropes detected: ${detectedRobotic.map((r) => `"${r}"`).join(", ")}.`);
    score -= 10;
  }

  score = Math.max(0, Math.min(100, score));
  if (score <= 5) {
    el.cardScoreNum.textContent = "BS";
  } else {
    el.cardScoreNum.textContent = score;
  }
  el.cardScoreNum.style.color = score >= 80 ? "var(--accent-emerald)" : score >= 60 ? "var(--accent-amber)" : "var(--accent-red)";

  el.cardScoreSummary.textContent = score >= 85
    ? "Excellent card architecture with strong psychological texture and voice definition."
    : score >= 65
    ? "Solid foundation, but could be significantly enhanced in voice cadence, reaction gradient, and scene setting."
    : score <= 5
    ? "BS card health. Missing almost all essential roleplay fields."
    : "Basic or skeletal card. Needs persona deepening, behavioral calibration, and dialogue examples.";

  el.auditFindingsList.innerHTML = `
    ${issues.map(i => `<div style="color:var(--accent-amber); margin-bottom:4px;">⚠️ ${i}</div>`).join("")}
    ${strengths.map(s => `<div style="color:var(--accent-emerald); margin-bottom:4px;">✓ ${s}</div>`).join("")}
  `;
}


