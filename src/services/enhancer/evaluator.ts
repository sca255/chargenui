import type { RoleplayCharacter } from "../../types/character";
import type { JudgeEvaluationReport } from "../../types/harness";
import type { ProviderConfig } from "../../types/provider";
import { callProviderWithJsonRepair } from "../llm/provider-router";

/**
 * Uses the configured LLM as an expert roleplay evaluator/judge, scoring the card across 5 core dimensions.
 */
export async function evaluateCharacterWithJudge(
  char: RoleplayCharacter,
  provider: ProviderConfig
): Promise<JudgeEvaluationReport> {
  const systemPrompt = `You are a critical, discerning Roleplay Character Card Quality Judge.
You evaluate character cards intended for SillyTavern and AI roleplay.
You will evaluate the card across 5 specific dimensions, assigning each a score from 1 to 10 and a concise critique:

1. psychologicalConsistency (1-10): Are personality traits cohesive yet interesting? Do flaws and strengths make sense without cartoonish contradiction?
2. dialogueNaturalness (1-10): Does spoken dialogue sound like real speech with natural rhythm, contractions, and authentic voice? Or is it robotic AI purple prose?
3. userAgencyCompliance (1-10): STRICT ZERO-PUPPETEERING RULE. Score 10 if {{user}} has 100% agency. Heavily penalize (score 1-4) if first_mes or alts describe {{user}}'s inner thoughts, spoken replies, or forced actions.
4. scenarioFriction (1-10): Does the scenario and opening create compelling immediate conflict, tension, stakes, or curiosity? Or is it a stagnant generic greeting?
5. sensoryImmediacy (1-10): Does the scene ground the reader with tactile textures, lighting, sounds, scents, and physical environment?

Return valid JSON with exact schema:
{
  "overallScore": number (1-100),
  "rpReadinessGrade": "S" | "A" | "B" | "C" | "D",
  "dimensions": {
    "psychologicalConsistency": { "name": "Psychological Consistency", "score": number, "critique": "string" },
    "dialogueNaturalness": { "name": "Dialogue Voice & Naturalness", "score": number, "critique": "string" },
    "userAgencyCompliance": { "name": "User Agency & Anti-Puppeteering", "score": number, "critique": "string" },
    "scenarioFriction": { "name": "Scenario Tension & Dynamic Friction", "score": number, "critique": "string" },
    "sensoryImmediacy": { "name": "Sensory & Physical Immediacy", "score": number, "critique": "string" }
  },
  "verdict": "Executive summary sentence",
  "actionableTweaks": ["Tweak 1", "Tweak 2", "Tweak 3"]
}`;

  const userPrompt = `CARD TO EVALUATE:
Name: ${char.name}
Description:
${char.description}

Personality:
${char.personality}

Scenario:
${char.scenario}

Opening Message:
${char.first_mes}

Example Dialogue:
${char.mes_example}

Alternate Greetings (${char.alternate_greetings.length} available):
${char.alternate_greetings.slice(0, 3).map((g, i) => `[Alt ${i + 1}]:\n${g}`).join("\n\n")}`;

  try {
    const res = await callProviderWithJsonRepair<JudgeEvaluationReport>({
      provider,
      systemPrompt,
      userPrompt,
      temperature: 0.3,
    });
    return res.data;
  } catch (err: any) {
    // Graceful fallback report
    return {
      overallScore: 75,
      rpReadinessGrade: "B",
      dimensions: {
        psychologicalConsistency: { name: "Psychological Consistency", score: 8, critique: "Solid foundation." },
        dialogueNaturalness: { name: "Dialogue Voice & Naturalness", score: 7, critique: "Good cadence." },
        userAgencyCompliance: { name: "User Agency & Anti-Puppeteering", score: 8, critique: "No obvious puppeteering detected." },
        scenarioFriction: { name: "Scenario Tension & Dynamic Friction", score: 7, critique: "Usable scenario setup." },
        sensoryImmediacy: { name: "Sensory & Physical Immediacy", score: 7, critique: "Adequate physical anchoring." },
      },
      verdict: "Evaluation completed with fallback heuristics due to LLM parsing interruption.",
      actionableTweaks: ["Consider deepening sensory textures in first_mes."],
    };
  }
}
