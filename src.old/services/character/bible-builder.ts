import type { CharacterBook } from "../../types/character";
import type { AuthoringSpine } from "../generator/spine";

/**
 * Builds the native SillyTavern Character Book (Authoring Bible) from the internal Spine.
 * Preserves the psychometrics, calibrated reaction gradient, formative backstory beats,
 * and vocal idiolect as structured lorebook entries so the LLM can reference them during RP
 * without polluting the core description field with raw OOC gradient bullets.
 */
export function buildCharacterBookFromSpine(spine: AuthoringSpine): CharacterBook {
  const charName = spine.name || "{{char}}";
  const rg = spine.reaction_gradient || { wont: "", craves: "", neutral: "", will: "", trust_gate: "" };
  const v = spine.voice || { cadence: "", dialect_register: "", signature_lexicon: [], forbidden_words: [], quirks: [] };
  const values = Array.isArray(spine.values) ? spine.values : [];
  const experiences = Array.isArray(spine.experiences) ? spine.experiences : [];
  const triggers = Array.isArray(spine.triggers) ? spine.triggers : [];

  return {
    name: `${charName} - Character Bible`,
    description: `Weaver Authoring Bible & Lorebook for ${charName}: Contains calibrated reaction gradient, psychometrics, formative history, and vocal idiolect.`,
    entries: [
      {
        id: 1,
        keys: [charName, "{{char}}", "psychology", "gradient", "reaction gradient", "boundaries", "limits", "trust"],
        comment: "Weaver Psychological Blueprint & Calibrated Reaction Gradient",
        content: `[CHARACTER BIBLE: PSYCHOLOGICAL BLUEPRINT & REACTION GRADIENT]
Name: ${charName}
Archetype: ${spine.archetype || "Unspecified"}
Central Contradiction: ${spine.central_contradiction || "Unspecified"}

Core Values:
${values.length > 0 ? values.map((val) => `• ${val}`).join("\n") : "• None specified"}

Calibrated Reaction Gradient:
- WON'T: ${rg.wont || "None"}
- NEUTRAL: ${rg.neutral || "None"}
- CRAVES: ${rg.craves || "None"}
- WILL: ${rg.will || "None"}
- TRUST GATE: ${rg.trust_gate || "None"}

Behavioral Triggers:
${triggers.length > 0 ? triggers.map((tr) => `• ${tr}`).join("\n") : "• None specified"}

Stance Toward {{user}}:
${spine.stance_toward_user || "Neutral"}`,
        constant: false,
        selective: true,
        insertion_order: 10,
        position: "before_char",
        enabled: true,
      },
      {
        id: 2,
        keys: [charName, "{{char}}", "backstory", "history", "past", "crucible", "origin"],
        comment: "Weaver Formative Backstory Crucible & Intent",
        content: `[CHARACTER BIBLE: FORMATIVE EXPERIENCES & CRUCIBLE]
Formative History Beats:
${experiences.length > 0 ? experiences.map((exp) => `• ${exp}`).join("\n") : "• None specified"}

Super-Objective: ${spine.intents?.super_objective || "Unspecified"}
Internal Obstacle: ${spine.intents?.obstacle || "Unspecified"}
Moment-to-Moment Strategy: ${spine.intents?.strategy || "Unspecified"}`,
        constant: false,
        selective: true,
        insertion_order: 11,
        position: "before_char",
        enabled: true,
      },
      {
        id: 3,
        keys: [charName, "{{char}}", "voice", "speech", "dialogue", "mannerisms", "talk"],
        comment: "Weaver Vocal Idiolect & Physical Tells",
        content: `[CHARACTER BIBLE: VOICE, IDIOLECT & PHYSICAL TELLS]
Cadence & Rhythm: ${v.cadence || "Standard conversational tempo"}
Dialect & Register: ${v.dialect_register || "Standard"}
Signature Lexicon: ${(v.signature_lexicon || []).join(", ") || "None"}
Forbidden Words: ${(v.forbidden_words || []).join(", ") || "None"}
Physical Quirks & Tells: ${(v.quirks || []).join(", ") || "None"}`,
        constant: false,
        selective: true,
        insertion_order: 12,
        position: "before_char",
        enabled: true,
      },
    ],
  };
}
