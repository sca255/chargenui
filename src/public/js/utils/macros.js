export function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function normalizeRpMacros(text, charName, nickname) {
  if (!text) return "";
  let result = text;
  result = result.replace(/\{\{\s*user\s*\}\}/gi, "___RP_USER___");
  result = result.replace(/\{\{\s*(?:char|bot)\s*\}\}/gi, "___RP_CHAR___");
  result = result.replace(/(?:<user>|<USER>|\{user\}|\{USER\})/g, "___RP_USER___");
  result = result.replace(/(?:<char>|<CHAR>|\{char\}|\{CHAR\}|<bot>|<BOT>|\{bot\}|\{BOT\})/g, "___RP_CHAR___");
  result = result.replace(/___RP_USER___/g, "{{user}}");
  result = result.replace(/___RP_CHAR___/g, "{{char}}");
  result = result.replace(/(?:<start>|<Start>|\[START\]|\[start\])/g, "<START>");
  result = result.replace(/(?:^|\n)\s*(?:User|user|You|you|\{\{user\}\}):\s*/gm, m => m.startsWith("\n") ? "\n{{user}}: " : "{{user}}: ");
  const namesToCheck = [nickname, charName].filter(n => !!n && n.trim().length > 1);
  for (const name of namesToCheck) {
    const escaped = name.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    result = result.replace(new RegExp(`(?:^|\\n)\\s*(?:${escaped}|\\{\\{char\\}\\}):\\s*`, "gm"), m => m.startsWith("\n") ? "\n{{char}}: " : "{{char}}: ");
  }
  return result;
}

export function interpolateRpMacros(text, userName, charName, nickname) {
  if (!text) return "";
  const u = userName || "Anon";
  const c = nickname || charName || "Character";
  return text
    .replace(/\{\{\s*user\s*\}\}/gi, u)
    .replace(/<USER>/gi, u)
    .replace(/\{\{\s*char\s*\}\}/gi, c)
    .replace(/<CHAR>/gi, c);
}

export function estimateTokens(text) {
  if (!text) return 0;
  const trimmed = text.trim();
  if (!trimmed) return 0;

  const words = trimmed.match(/[\w]+|[^\w\s]+/g);
  if (!words) return Math.ceil(trimmed.length / 3.8);

  let count = 0;
  for (const w of words) {
    if (w.length <= 4) {
      count += 1;
    } else {
      count += Math.ceil(w.length / 3.8);
    }
  }

  const lineBreaks = (text.match(/\n/g) || []).length;
  count += Math.ceil(lineBreaks * 0.5);

  return Math.max(1, Math.round(count));
}

export function normalizeDialogueQuotes(text) {
  if (!text) return "";
  let out = text;
  out = out.replace(/(\{\{[^}]+\}\})['’]s/g, "$1___CHAR_POSS___");
  out = out.replace(/([a-zA-Z0-9])['’]([a-zA-Z0-9])/g, "$1___INTRA_APOS___$2");
  out = out.replace(/(^|[\s—–(\[{*])['‘]([^"'\n]+?)['’](?=[\s—–,.;:!?)*\]}\n]|$)/gm, '$1"$2"');
  out = out.replace(/___INTRA_APOS___/g, "'");
  out = out.replace(/___CHAR_POSS___/g, "'s");
  return out;
}
