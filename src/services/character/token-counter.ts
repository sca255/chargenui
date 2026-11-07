// Fast and accurate token estimation for roleplay cards

export function estimateTokens(text: string | undefined | null): number {
  if (!text) return 0;
  // BPE heuristics: Words + special characters + whitespace
  const trimmed = text.trim();
  if (!trimmed) return 0;

  // Split on words and punctuation
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

  // Add line breaks and punctuation nuances
  const lineBreaks = (text.match(/\n/g) || []).length;
  count += Math.ceil(lineBreaks * 0.5);

  return Math.max(1, Math.round(count));
}

export function calculateCharacterCardTokens(char: {
  description?: string;
  personality?: string;
  scenario?: string;
  first_mes?: string;
  mes_example?: string;
  system_prompt?: string;
  post_history_instructions?: string;
  alternate_greetings?: string[];
}): {
  total: number;
  breakdown: Record<string, number>;
} {
  const breakdown: Record<string, number> = {
    description: estimateTokens(char.description),
    personality: estimateTokens(char.personality),
    scenario: estimateTokens(char.scenario),
    first_mes: estimateTokens(char.first_mes),
    mes_example: estimateTokens(char.mes_example),
    system_prompt: estimateTokens(char.system_prompt),
    post_history_instructions: estimateTokens(char.post_history_instructions),
  };

  let altTotal = 0;
  if (Array.isArray(char.alternate_greetings)) {
    for (let i = 0; i < char.alternate_greetings.length; i++) {
      const t = estimateTokens(char.alternate_greetings[i]);
      breakdown[`alt_greeting_${i + 1}`] = t;
      altTotal += t;
    }
  }

  const permanentTokens =
    breakdown.description +
    breakdown.personality +
    breakdown.scenario +
    breakdown.mes_example +
    breakdown.system_prompt +
    breakdown.post_history_instructions;

  return {
    total: permanentTokens + breakdown.first_mes,
    breakdown: {
      ...breakdown,
      permanent: permanentTokens,
      greetings_total: breakdown.first_mes + altTotal,
    },
  };
}
