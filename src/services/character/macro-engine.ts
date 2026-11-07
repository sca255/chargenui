// Comprehensive Roleplay Macro Engine
// Handles SillyTavern / TavernAI macro normalization, validation, and preview interpolation

export interface MacroReplaceOptions {
  userName?: string;
  charName?: string;
  userPronouns?: { subject: string; object: string; possessive: string };
  charPronouns?: { subject: string; object: string; possessive: string };
}

/**
 * Normalizes legacy, case-variant, or malformed macro tags into standard {{user}} and {{char}}
 */
export function normalizeRpMacros(text: string, charName?: string): string {
  if (!text) return "";

  let result = text;

  // 1. Protect existing valid macros with temporary unique tokens
  result = result.replace(/\{\{\s*user\s*\}\}/gi, "___RP_USER___");
  result = result.replace(/\{\{\s*(?:char|bot)\s*\}\}/gi, "___RP_CHAR___");

  // 2. Normalize single-brace and angle-bracket variants
  result = result.replace(/(?:<user>|<USER>|\{user\}|\{USER\})/g, "___RP_USER___");
  result = result.replace(/(?:<char>|<CHAR>|\{char\}|\{CHAR\}|<bot>|<BOT>|\{bot\}|\{BOT\})/g, "___RP_CHAR___");

  // 3. Restore to standard {{user}} and {{char}}
  result = result.replace(/___RP_USER___/g, "{{user}}");
  result = result.replace(/___RP_CHAR___/g, "{{char}}");

  // 4. Normalize Example Messages start blocks: <start>, [START], <Start> -> <START>
  result = result.replace(/(?:<start>|<Start>|\[START\]|\[start\])/g, "<START>");

  // 5. Normalize dialogue turns in example messages
  // e.g. "User: ", "user: ", "<user>: ", "You: " -> "{{user}}: "
  result = result.replace(/(?:^|\n)\s*(?:User|user|You|you|\{\{user\}\}):\s*/gm, (m) => m.startsWith("\n") ? "\n{{user}}: " : "{{user}}: ");

  // If character name is known, convert hardcoded turn headers "CharName:" -> "{{char}}:"
  if (charName && charName.trim().length > 1) {
    const escapedName = charName.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const charTurnRegex = new RegExp(`(?:^|\\n)\\s*(?:${escapedName}|\\{\\{char\\}\\}):\\s*`, "gm");
    result = result.replace(charTurnRegex, (m) => m.startsWith("\n") ? "\n{{char}}: " : "{{char}}: ");
  }

  return result;
}

/**
 * Normalizes single-quoted dialogue ('Hello,' she said) to standard double quotes ("Hello," she said)
 * so that roleplay clients (Lumiverse, SillyTavern) can highlight dialogue properly.
 * Preserves all intra-word contractions (you're, don't, it's, isn't, {{char}}'s).
 */
export function normalizeDialogueQuotes(text: string): string {
  if (!text) return "";
  let out = text;

  // 1. Protect intra-word apostrophes and contractions (e.g. you're, don't, it's, {{char}}'s)
  out = out.replace(/(\{\{[^}]+\}\})['’]s/g, "$1___CHAR_POSS___");
  out = out.replace(/([a-zA-Z0-9])['’]([a-zA-Z0-9])/g, "$1___INTRA_APOS___$2");

  // 2. Convert dialogue quotes in single quotes or curly single quotes to double quotes
  out = out.replace(/(^|[\s—–(\[{*])['‘]([^"'\n]+?)['’](?=[\s—–,.;:!?)*\]}\n]|$)/gm, '$1"$2"');

  // 3. Restore protected contractions
  out = out.replace(/___INTRA_APOS___/g, "'");
  out = out.replace(/___CHAR_POSS___/g, "'s");

  return out;
}

/**
 * Interpolates macros into final rendered text (for live preview or simulation)
 */
export function interpolateRpMacros(text: string, options: MacroReplaceOptions = {}): string {
  if (!text) return "";

  const userName = options.userName || "{{user}}";
  const charName = options.charName || "{{char}}";

  let out = text;

  // Replace {{user}} and variants
  out = out.replace(/\{\{\s*user\s*\}\}/gi, userName);
  out = out.replace(/<USER>/gi, userName);

  // Replace {{char}} and variants
  out = out.replace(/\{\{\s*char\s*\}\}/gi, charName);
  out = out.replace(/<CHAR>/gi, charName);
  out = out.replace(/<BOT>/gi, charName);

  // Pronoun replacements if configured
  if (options.userPronouns) {
    out = out.replace(/\{\{\s*user_they\s*\}\}/gi, options.userPronouns.subject);
    out = out.replace(/\{\{\s*user_them\s*\}\}/gi, options.userPronouns.object);
    out = out.replace(/\{\{\s*user_their\s*\}\}/gi, options.userPronouns.possessive);
  }

  if (options.charPronouns) {
    out = out.replace(/\{\{\s*char_they\s*\}\}/gi, options.charPronouns.subject);
    out = out.replace(/\{\{\s*char_them\s*\}\}/gi, options.charPronouns.object);
    out = out.replace(/\{\{\s*char_their\s*\}\}/gi, options.charPronouns.possessive);
  }

  return out;
}

/**
 * Validates roleplay macros in a character card and returns any warnings/issues
 */
export function validateRpMacros(char: {
  name?: string;
  description?: string;
  personality?: string;
  scenario?: string;
  first_mes?: string;
  mes_example?: string;
  alternate_greetings?: string[];
}): {
  valid: boolean;
  issues: string[];
  fixesAvailable: boolean;
} {
  const issues: string[] = [];
  let fixesAvailable = false;

  const allText = [
    char.description || "",
    char.personality || "",
    char.scenario || "",
    char.first_mes || "",
    char.mes_example || "",
    ...(char.alternate_greetings || []),
  ].join("\n");

  // Check for malformed single brace {user} or {char}
  if (/(?<!\{)\{(?:user|char|bot)\}(?!\})/i.test(allText)) {
    issues.push("Found malformed single-brace macros ({user} or {char}). Standard SillyTavern requires double braces: {{user}} / {{char}}.");
    fixesAvailable = true;
  }

  // Check for legacy angle bracket <USER> or <CHAR>
  if (/<user>|<char>|<bot>/i.test(allText)) {
    issues.push("Found legacy angle-bracket macros (<USER> / <CHAR>). Should be normalized to {{user}} / {{char}}.");
    fixesAvailable = true;
  }

  // Check mes_example for hardcoded character name instead of {{char}}
  if (char.mes_example && char.name && char.name.length > 2) {
    const escaped = char.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const hardcodedCharRegex = new RegExp(`^${escaped}:`, "m");
    if (hardcodedCharRegex.test(char.mes_example)) {
      issues.push(`Example dialogues hardcode "${char.name}:" instead of "{{char}}:". This prevents the card from functioning correctly if renamed.`);
      fixesAvailable = true;
    }
  }

  // Check first_mes for {{user}} mention
  if (char.first_mes && !char.first_mes.includes("{{user}}") && !char.first_mes.toLowerCase().includes("you")) {
    issues.push("First message does not reference {{user}} or 'you', which may result in a detached greeting with no hook.");
  }

  return {
    valid: issues.length === 0,
    issues,
    fixesAvailable,
  };
}
