// Bulletproof Resilient JSON Repair & Salvage Engine
// Designed to ensure a single JSON syntax error, unescaped dialogue quote,
// or truncated token limit never destroys 15 minutes of generated LLM tokens.

/**
 * Strips markdown code fences from raw LLM output.
 */
export function stripCodeFences(raw: string): string {
  let cleaned = raw.trim();
  // Remove ```json ... ``` or ``` ... ```
  cleaned = cleaned.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```$/i, "").trim();
  return cleaned;
}

/**
 * Extracts the outermost JSON substring (bounded by { ... } or [ ... ]).
 */
export function extractOutermostJson(raw: string): string {
  let cleaned = stripCodeFences(raw);

  const firstBrace = cleaned.indexOf("{");
  const firstBracket = cleaned.indexOf("[");

  if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
    const lastBrace = cleaned.lastIndexOf("}");
    if (lastBrace !== -1 && lastBrace >= firstBrace) {
      return cleaned.substring(firstBrace, lastBrace + 1);
    }
    // Truncated JSON without closing brace: return from first brace to end
    return cleaned.substring(firstBrace);
  }

  if (firstBracket !== -1) {
    const lastBracket = cleaned.lastIndexOf("]");
    if (lastBracket !== -1 && lastBracket >= firstBracket) {
      return cleaned.substring(firstBracket, lastBracket + 1);
    }
    return cleaned.substring(firstBracket);
  }

  return cleaned;
}

/**
 * Repairs common LLM syntax flaws: trailing commas, single-line/multi-line comments,
 * Python boolean literals, smart quotes, and unescaped control characters.
 */
export function repairJsonSyntax(raw: string): string {
  let text = extractOutermostJson(raw);

  // 1. Remove single-line comments (// ...) outside strings
  text = text.replace(/^[ \t]*\/\/.*$/gm, "");

  // 2. Remove multi-line comments (/* ... */)
  text = text.replace(/\/\*[\s\S]*?\*\//g, "");

  // 3. Normalize Python literals to valid JSON
  text = text.replace(/:\s*True\b/g, ": true");
  text = text.replace(/:\s*False\b/g, ": false");
  text = text.replace(/:\s*None\b/g, ": null");

  // 4. Normalize unicode smart quotes to standard ASCII quotes
  text = text.replace(/[\u201C\u201D]/g, '"');
  text = text.replace(/[\u2018\u2019]/g, "'");

  // 5. Remove trailing commas before closing braces/brackets
  text = text.replace(/,(\s*[\}\]])/g, "$1");

  // 6. Handle truncated JSON (missing closing braces or quotes)
  text = balanceAndCloseJson(text);

  return text;
}

/**
 * Automatically balances unclosed quotes, brackets, and braces if the LLM hit a token limit.
 */
export function balanceAndCloseJson(text: string): string {
  let inString = false;
  let escape = false;
  const stack: string[] = [];

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (escape) {
      escape = false;
      continue;
    }

    if (ch === "\\") {
      escape = true;
      continue;
    }

    if (ch === '"') {
      inString = !inString;
      continue;
    }

    if (!inString) {
      if (ch === "{" || ch === "[") {
        stack.push(ch);
      } else if (ch === "}") {
        if (stack.length > 0 && stack[stack.length - 1] === "{") stack.pop();
      } else if (ch === "]") {
        if (stack.length > 0 && stack[stack.length - 1] === "[") stack.pop();
      }
    }
  }

  let repaired = text;
  // If stopped inside a string, close the string quote
  if (inString) {
    repaired += '"';
  }

  // Remove trailing comma if last token before closure was comma
  repaired = repaired.replace(/,\s*$/, "");

  // Close remaining open brackets and braces in reverse order
  while (stack.length > 0) {
    const open = stack.pop();
    if (open === "{") repaired += "}";
    else if (open === "[") repaired += "]";
  }

  return repaired;
}

/**
 * Repairs unescaped double quotes inside JSON string literals.
 * Common failure mode: dialogue inside JSON, e.g. "mes_example": "She said "Hello" to him."
 */
export function repairUnescapedQuotesInStrings(raw: string): string {
  // Line-by-line heuristic repair for `"key": "value with "unescaped quotes" inside"`
  const lines = raw.split("\n");
  const repairedLines: string[] = [];

  for (const line of lines) {
    // Check if line looks like: `  "key": "..."` or `"key": "..."`
    const match = line.match(/^(\s*"[^"]+"\s*:\s*")(.*)("(?:\s*,)?\s*)$/);
    if (match) {
      const prefix = match[1];
      const middle = match[2];
      const suffix = match[3];

      // If middle contains unescaped quotes (quotes not preceded by backslash)
      if (/(?<!\\)"/.test(middle)) {
        // Escape all unescaped double quotes in middle
        const fixedMiddle = middle.replace(/(?<!\\)"/g, '\\"');
        repairedLines.push(prefix + fixedMiddle + suffix);
        continue;
      }
    }
    repairedLines.push(line);
  }

  return repairedLines.join("\n");
}

/**
 * Fuzzy regex key-value extraction for roleplay character fields and agent responses.
 * When syntactic JSON parsing fails completely, this salvages every valid field generated!
 */
export function fuzzyExtractJsonFields(raw: string): Record<string, any> {
  const result: Record<string, any> = {};

  // 1. Check for Agent Message
  const agentMsgMatch = raw.match(/"agent_message"\s*:\s*"((?:[^"\\]|\\.)*)"/s);
  if (agentMsgMatch) {
    try {
      result.agent_message = JSON.parse(`"${agentMsgMatch[1]}"`);
    } catch {
      result.agent_message = agentMsgMatch[1].replace(/\\"/g, '"');
    }
  }

  // 2. Check for individual character fields
  const candidateFields = [
    "name",
    "description",
    "personality",
    "scenario",
    "first_mes",
    "mes_example",
    "post_history_instructions",
    "creator_notes",
    "archetype",
    "central_contradiction",
    "stance_toward_user",
  ];

  const updatedFields: Record<string, any> = {};

  for (const field of candidateFields) {
    // Match `"field": "..."` allowing multiline text and escaped quotes
    const regex = new RegExp(`"${field}"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"`, "s");
    const m = raw.match(regex);
    if (m) {
      try {
        const val = JSON.parse(`"${m[1]}"`);
        result[field] = val;
        updatedFields[field] = val;
      } catch {
        const val = m[1].replace(/\\"/g, '"').replace(/\\n/g, "\n").replace(/\\t/g, "\t");
        result[field] = val;
        updatedFields[field] = val;
      }
    }
  }

  // 3. Check for array fields: tags, alternate_greetings, values, experiences
  const arrayFields = ["tags", "alternate_greetings", "values", "experiences"];
  for (const field of arrayFields) {
    const arrayRegex = new RegExp(`"${field}"\\s*:\\s*\\[([^\\]]*)\\]`, "s");
    const m = raw.match(arrayRegex);
    if (m) {
      try {
        const parsedArray = JSON.parse(`[${m[1]}]`);
        result[field] = parsedArray;
        updatedFields[field] = parsedArray;
      } catch {
        // Fallback: extract string items
        const itemMatches = [...m[1].matchAll(/"((?:[^"\\]|\\.)*)"/g)];
        if (itemMatches.length > 0) {
          const items = itemMatches.map((im) => im[1].replace(/\\"/g, '"'));
          result[field] = items;
          updatedFields[field] = items;
        }
      }
    }
  }

  if (Object.keys(updatedFields).length > 0) {
    result.updated_fields = updatedFields;
  }

  return result;
}

/**
 * Master multi-pass resilient JSON parser.
 * Attempts 6 progressively deeper recovery strategies to guarantee tokens are never lost.
 */
export function safeParseJson<T = any>(raw: string, fallback?: T): T {
  if (!raw || typeof raw !== "string") {
    if (fallback !== undefined) return fallback;
    throw new Error("Cannot parse empty or non-string input");
  }

  const trimmed = raw.trim();

  // Pass 1: Direct JSON parse on clean fences
  const directClean = stripCodeFences(trimmed);
  try {
    return JSON.parse(directClean) as T;
  } catch {}

  // Pass 2: Outermost JSON slice
  const outer = extractOutermostJson(directClean);
  try {
    return JSON.parse(outer) as T;
  } catch {}

  // Pass 3: Syntax repair (comments, Python literals, trailing commas, balance brackets)
  const syntaxRepaired = repairJsonSyntax(outer);
  try {
    return JSON.parse(syntaxRepaired) as T;
  } catch {}

  // Pass 4: Unescaped quotes repair inside string values
  const quotesRepaired = repairUnescapedQuotesInStrings(syntaxRepaired);
  try {
    return JSON.parse(quotesRepaired) as T;
  } catch {}

  // Pass 5: Progressive truncation repair (strip back to last valid comma and close)
  const lastCommaIdx = quotesRepaired.lastIndexOf(",");
  if (lastCommaIdx !== -1) {
    const truncated = quotesRepaired.substring(0, lastCommaIdx);
    const rebalanced = balanceAndCloseJson(truncated);
    try {
      return JSON.parse(rebalanced) as T;
    } catch {}
  }

  // Pass 6: Fuzzy field regex salvage
  const salvaged = fuzzyExtractJsonFields(trimmed);
  if (Object.keys(salvaged).length > 0) {
    console.warn("⚠️ JSON syntax corrupted by LLM; successfully salvaged fields via resilient fuzzy extraction.");
    return salvaged as unknown as T;
  }

  if (fallback !== undefined) {
    return fallback;
  }

  throw new Error(`Failed to parse JSON response after 6 salvage passes.\nRaw text preview:\n${raw.substring(0, 500)}...`);
}
