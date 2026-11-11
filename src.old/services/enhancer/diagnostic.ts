import type { RoleplayCharacter } from "../../types/character";
import type { CharacterDiagnostic } from "../../types/harness";
import { calculateCharacterCardTokens } from "../character/token-counter";
import { validateRpMacros } from "../character/macro-engine";

export function auditCharacterCard(char: RoleplayCharacter): CharacterDiagnostic {
  const tokenStats = calculateCharacterCardTokens(char);
  const weaknesses: CharacterDiagnostic["weaknesses"] = [];
  const strengths: string[] = [];
  let score = 100;

  // 1. Description analysis
  const desc = char.description?.trim() || "";
  if (!desc) {
    weaknesses.push({
      area: "description",
      issue: "Description is completely empty.",
      recommendation: "Provide a rich description covering physical presence, psychology, and backstory.",
    });
    score -= 30;
  } else if (desc.length < 150) {
    weaknesses.push({
      area: "description",
      issue: "Description is very brief/shallow.",
      recommendation: "Expand on sensory details, contradictory personality quirks, and formative backstory.",
    });
    score -= 15;
  } else {
    strengths.push("Substantial description length.");
  }

  // Check for generic cliché words
  const cliches = ["smirks mischievously", "heart of gold", "dark past", "mysterious stranger", "loyal to a fault", "lethal killer with a soft spot"];
  const foundCliches = cliches.filter((c) => desc.toLowerCase().includes(c));
  if (foundCliches.length > 0) {
    weaknesses.push({
      area: "description",
      issue: `Contains cliché trope phrases: ${foundCliches.map((c) => `"${c}"`).join(", ")}.`,
      recommendation: "Replace stock phrases with unique, concrete sensory behaviors and specific habits.",
    });
    score -= 10;
  }

  // 2. Personality
  const pers = char.personality?.trim() || "";
  if (!pers) {
    weaknesses.push({
      area: "personality",
      issue: "Missing dedicated personality or behavioral spec.",
      recommendation: "Add concrete behavioral IF-THEN triggers and speech mannerisms.",
    });
    score -= 15;
  }

  // 3. Central contradiction check
  const hasContradiction = /contradiction|tension|conflict|torn between|paradox|split between/i.test(desc + " " + pers);
  if (!hasContradiction) {
    weaknesses.push({
      area: "tension",
      issue: "No distinct central contradiction detected — character may read as a one-dimensional archetype.",
      recommendation: "Add an internal friction: two opposing motives or values warring inside them.",
    });
    score -= 12;
  } else {
    strengths.push("Has internal tension / central contradiction.");
  }

  // 4. First message analysis
  const firstMes = char.first_mes?.trim() || "";
  if (!firstMes) {
    weaknesses.push({
      area: "first_mes",
      issue: "Missing opening first message.",
      recommendation: "Write an immersive scene-setting starter with dialogue, sensory details, and an actionable hook.",
    });
    score -= 25;
  } else if (firstMes.length < 120) {
    weaknesses.push({
      area: "first_mes",
      issue: "First message is very short or passive (e.g. simple greeting without scene framing).",
      recommendation: "Enrich the opening with sensory atmosphere, ongoing character action, and dramatic tension.",
    });
    score -= 12;
  } else {
    strengths.push("Well-developed opening message.");
  }

  // Check for {{user}} puppeteering in first message
  if (firstMes.includes("You feel") || firstMes.includes("You say") || firstMes.includes("You think")) {
    weaknesses.push({
      area: "first_mes",
      issue: "First message narrates {{user}}'s feelings or dialogue (puppeteering).",
      recommendation: "Confine narration to {{char}}'s perspective, action, and sensory perception; let {{user}} decide their own reactions.",
    });
    score -= 10;
  }

  // Check for single-quoted dialogue in first message (breaks syntax highlighting in Lumiverse/SillyTavern)
  if (firstMes && /(?:^|[\s—–(\[{*])['‘][A-Z][^"'\n]+?[.!?]['’]/.test(firstMes)) {
    weaknesses.push({
      area: "first_mes",
      issue: "First message uses single quotes ('...') for spoken dialogue. Lumiverse and SillyTavern require double quotes (\"...\") for dialogue syntax highlighting.",
      recommendation: "Use standard double quotes (\"...\") for dialogue or click '🪄 Fix Macros' to auto-convert.",
    });
    score -= 5;
  }

  // 5. Example dialogues check
  const mesExample = char.mes_example?.trim() || "";
  if (!mesExample) {
    weaknesses.push({
      area: "dialogue",
      issue: "No example dialogues provided (<START> blocks).",
      recommendation: "Add 3-5 example exchanges in Example Messages format to teach LLMs the character's exact vocal cadence and humor.",
    });
    score -= 15;
  } else if (!mesExample.includes("<START>")) {
    weaknesses.push({
      area: "dialogue",
      issue: "Example dialogue is not formatted with standard <START> delimiters.",
      recommendation: "Format example exchanges with <START> delimiters and {{user}} / {{char}} turns.",
    });
    score -= 5;
  } else {
    strengths.push("Includes formatted example dialogues.");
  }

  // 6. Roleplay Macro syntax check ({{user}} and {{char}})
  const macroValidation = validateRpMacros(char);
  if (!macroValidation.valid) {
    for (const issue of macroValidation.issues) {
      weaknesses.push({
        area: "dialogue",
        issue: `Macro Issue: ${issue}`,
        recommendation: "Use the 'Normalize RP Macros' tool to standardize macros to {{user}} and {{char}}.",
      });
      score -= 5;
    }
  } else {
    strengths.push("Valid roleplay macro formatting ({{user}} & {{char}}).");
  }

  // 7. Alternate Greetings check
  if (!char.alternate_greetings || char.alternate_greetings.length === 0) {
    weaknesses.push({
      area: "first_mes",
      issue: "No alternate greetings available for different RP scenarios.",
      recommendation: "Generate 2-3 alternate greetings (e.g. combat encounter, late-night intimacy, hostile first meeting).",
    });
    score -= 5;
  } else {
    strengths.push(`Has ${char.alternate_greetings.length} alternate greeting(s).`);
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
  const combinedText = `${pers} ${mesExample}`.toLowerCase();
  const detectedRobotic = roboticPhrases.filter((p) => combinedText.includes(p));
  if (detectedRobotic.length > 0) {
    weaknesses.push({
      area: "dialogue",
      issue: `Robotic / unnatural dialogue tropes detected: ${detectedRobotic.map((r) => `"${r}"`).join(", ")}. In roleplay clients (Lumiverse / SillyTavern), this forces the model into unnatural, caricature responses for mundane everyday actions.`,
      recommendation: "Use Agent Mode or Voice Polish to replace pedantic jargon with natural spoken cadence, casual contractions, and dry sarcasm.",
    });
    score -= 10;
  }

  const isEmpty = !char.description?.trim() && !char.personality?.trim() && !char.first_mes?.trim();
  if (isEmpty) {
    score = 0;
  } else {
    score = Math.max(0, Math.min(100, score));
  }

  // -------------------------------------------------------------
  // 6-Axis Psychometric Radar Metrics (0 to 100)
  // -------------------------------------------------------------
  const allText = `${desc} ${pers} ${firstMes} ${mesExample}`.toLowerCase();

  // 1. Idiolect Distinctiveness
  let idiolectScore = 100;
  if (!mesExample) idiolectScore -= 35;
  else if (!mesExample.includes("<START>")) idiolectScore -= 15;
  if (detectedRobotic.length > 0) idiolectScore -= 25;
  const hasContractions = /\b(don't|can't|it's|won't|i'm|didn't|doesn't|wouldn't|you're)\b/i.test(firstMes + " " + mesExample);
  if (!hasContractions && (firstMes || mesExample)) idiolectScore -= 15;
  if (!/register|cadence|lexicon|forbidden|quirk/i.test(pers)) idiolectScore -= 10;
  idiolectScore = isEmpty ? 0 : Math.max(10, Math.min(100, idiolectScore));

  // 2. Boundary Sharpness & Reaction Gradient
  let boundariesScore = 100;
  const hasLimits = /never|refuse|wont|won't|boundary|cannot stand|hard limit/i.test(allText);
  const hasNeutral = /flat|unmoved|bored|indifferent|neutral|mundane/i.test(allText);
  const hasTrustGate = /trust gate|trust|earns? trust|guard drops/i.test(allText);
  if (!hasLimits) boundariesScore -= 40;
  if (!hasNeutral) boundariesScore -= 35;
  if (!hasTrustGate) boundariesScore -= 15;
  boundariesScore = isEmpty ? 0 : Math.max(10, Math.min(100, boundariesScore));

  // 3. Sensory Immersion
  let sensoryScore = 100;
  const sensoryKeywords = ["scent", "smell", "lighting", "shadow", "rain", "cold", "warm", "leather", "breath", "whisper", "sound", "texture", "fabric"];
  const sensoryMatches = sensoryKeywords.filter((kw) => allText.includes(kw));
  if (sensoryMatches.length < 3) sensoryScore -= 30;
  else if (sensoryMatches.length < 5) sensoryScore -= 15;
  if (desc.length < 200) sensoryScore -= 25;
  if (!/\[FORM\]|Appearance/i.test(desc)) sensoryScore -= 15;
  sensoryScore = isEmpty ? 0 : Math.max(10, Math.min(100, sensoryScore));

  // 4. Playability & Turn-0 Hook Potency
  let playabilityScore = 100;
  if (!firstMes) playabilityScore -= 50;
  else if (firstMes.length < 120) playabilityScore -= 25;
  if (firstMes.includes("You feel") || firstMes.includes("You say") || firstMes.includes("You think")) playabilityScore -= 30;
  if (!char.alternate_greetings || char.alternate_greetings.length === 0) playabilityScore -= 15;
  if (firstMes && /(?:^|[\s—–(\[{*])['‘][A-Z][^"'\n]+?[.!?]['’]/.test(firstMes)) playabilityScore -= 10;
  playabilityScore = isEmpty ? 0 : Math.max(10, Math.min(100, playabilityScore));

  // 5. Anti-Purple Prose Cleanliness
  let purpleProseScore = 100;
  const purplePhrases = [
    "functions as a high-performance engine of",
    "fortress to guard a heart",
    "mask of indifference",
    "delicate balance",
    "testament to",
    "the broken promise",
    "dance of shadows",
    "tapestry of",
  ];
  const detectedPurple = purplePhrases.filter((p) => allText.includes(p));
  if (detectedPurple.length > 0) {
    purpleProseScore -= detectedPurple.length * 20;
    weaknesses.push({
      area: "purple_prose",
      issue: `Stock purple-prose clichés detected: ${detectedPurple.map((p) => `"${p}"`).join(", ")}.`,
      recommendation: "Replace AI melodrama cliches with grounded, concrete behavioral observations.",
    });
  }
  if (foundCliches.length > 0) purpleProseScore -= foundCliches.length * 10;
  purpleProseScore = isEmpty ? 0 : Math.max(10, Math.min(100, purpleProseScore));

  // 6. Token Density & Scaffolding Ratio
  let tokenDensityScore = 100;
  const totalTokens = tokenStats.total;
  if (totalTokens < 150) tokenDensityScore = 20;
  else if (totalTokens < 300) tokenDensityScore = 55;
  else if (totalTokens > 3800) tokenDensityScore = 65;
  else if (totalTokens > 3000) tokenDensityScore = 80;
  tokenDensityScore = isEmpty ? 0 : Math.max(10, Math.min(100, tokenDensityScore));

  const grade =
    score >= 95 ? "S" : score >= 85 ? "A" : score >= 70 ? "B" : score >= 50 ? "C" : "D";

  return {
    score,
    grade,
    radarScores: {
      idiolect: idiolectScore,
      boundaries: boundariesScore,
      sensory: sensoryScore,
      playability: playabilityScore,
      antiPurpleProse: purpleProseScore,
      tokenDensity: tokenDensityScore,
    },
    tokenCount: tokenStats.total,
    weaknesses,
    strengths,
    summary:
      score >= 85
        ? "Excellent card architecture with strong psychological texture and voice definition."
        : score >= 65
        ? "Solid foundation, but could be significantly enhanced in voice cadence, reaction gradient, and scene setting."
        : isEmpty
        ? "Card is completely empty. There is no character content to evaluate."
        : "Basic or skeletal card. Needs persona deepening, behavioral calibration, and dialogue examples.",
  };
}
