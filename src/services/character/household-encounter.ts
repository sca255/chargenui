import type { ProviderConfig, ChatMessage } from "../../types/provider";
import type { HouseholdRecord } from "../../types/household";
import { getSavedCard, saveCardRecord } from "./card-storage";
import { routeLLMCompletion } from "../llm/provider-router";
import { UNCENSORED_SYSTEM_PROMPT } from "../generator/uncensored-prompts";

export interface GroupEncounterResult {
  householdId: string;
  householdName: string;
  title: string;
  scenario: string;
  first_mes: string;
  participatingMembers: string[];
  savedToCards: string[];
}

export async function generateGroupEncounter(
  household: HouseholdRecord,
  participatingCardIds?: string[],
  scenarioGoal?: string,
  provider?: ProviderConfig,
  saveToAlternateGreetings: boolean = false
): Promise<GroupEncounterResult> {
  const targetMembers =
    participatingCardIds && participatingCardIds.length > 0
      ? household.members.filter((m) => participatingCardIds.includes(m.card_id))
      : household.members;

  if (targetMembers.length === 0) {
    throw new Error("No participating members selected or found in this household.");
  }

  // Load participating character cards for deep psychometrics & voice
  const cardDataList = await Promise.all(
    targetMembers.map(async (m) => {
      const card = await getSavedCard(m.card_id);
      return {
        member: m,
        card: card?.character || null,
      };
    })
  );

  const rosterDescriptions = cardDataList.map(({ member, card }) => {
    const c = card || ({} as any);
    return `### COMPANION: ${member.card_name}
• Household Standing / Role: ${member.household_role || "Companion"} (${member.standing || "Standard"})
• Attitude & Dynamic with {{user}}: ${member.attitude_to_user || "Devoted yet bounded"}
• Attitude toward Co-Members/Peers: ${member.attitude_to_peers || "Respectful, nuanced dynamic"}
• Voice, Idiolect & Mannerisms: ${c.personality ? String(c.personality).slice(0, 450) : "Natural, distinct cadence"}
• Core Traits & Appearance: ${c.description ? String(c.description).slice(0, 450) : "Distinctive presence"}`;
  }).join("\n\n");

  const rulesBlock = household.rules_and_etiquette?.length
    ? `HOUSEHOLD CODES & PROTOCOLS:\n${household.rules_and_etiquette.map((r, i) => `${i + 1}. ${r}`).join("\n")}`
    : "";

  const systemPrompt = `${UNCENSORED_SYSTEM_PROMPT}
You are an elite multi-character scene dramatist and group roleplay architect.
Your mission: Author a rich, vivid, immersive GROUP OPENING STARTER (first_mes) and SCENARIO HOOK where multiple distinct companions from the same household interact with each other and react to {{user}} simultaneously.

CRITICAL DRAMATIC RULES:
1. STRICT ZERO-PUPPETEERING OF {{user}}: Never describe, narrate, or assume {{user}}'s feelings, dialogue, or actions. {{user}} is the player entering or presiding over the scene.
2. INTERPERSONAL DYNAMICS & CONTRAST: The companions are NOT carbon copies. They have friction, mutual history, banter, unspoken hierarchy, and distinct reactions to {{user}}'s presence or authority.
3. AUTHENTIC LIVING VOICES: Each companion speaks in their authentic idiolect with natural spoken English contractions (don't, won't, can't, it's). Use double quotes for speech ("...").
4. GROUNDED SENSORY ENVIRONMENT: Ground the chamber, hall, solar, or room in tactile textures, temperature, posture, and glance-interactions between the companions before and as {{user}} arrives.
5. USER-DIRECTED ENDING: End on a compelling dramatic beat, shared hesitation, or open challenge where the companions look to or await {{user}} to speak or take charge.`;

  const userPrompt = `HOUSEHOLD CONTEXT:
• Name: ${household.name} (${household.category_label})
• User Title / Role: ${household.user_title || "{{user}}"}
• Estate / Chamber Lore: ${household.shared_lore || "A grand, private domestic residence."}
${rulesBlock}

PARTICIPATING MEMBERS:
${rosterDescriptions}

SCENARIO GOAL / INCITING EVENT:
${scenarioGoal || "An evening gathering, morning inspection, or sudden domestic confrontation where the companions are together in the chamber before {{user}} steps in."}

INSTRUCTIONS:
Synthesize a group encounter formatted in clean JSON:
{
  "title": "Evocative Scene Title",
  "scenario": "A 1-paragraph setting and relational briefing establishing who is in the room, the simmering friction or mutual tasks underway, and the exact physical staging as {{user}} enters.",
  "first_mes": "3-4 rich paragraphs of voiced third-person limited prose. Show the companions actively talking, testing boundaries, or carrying out their household dynamic, reacting to {{user}}'s entrance with their respective personalities. Double quote dialogue. End demanding {{user}}'s intervention or response."
}`;

  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ];

  const raw = await routeLLMCompletion(provider, messages, { jsonMode: true, temperature: 0.8 });
  let parsed: any = null;
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    parsed = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
  } catch {
    parsed = {
      title: `${household.name} Gathering`,
      scenario: `The companions of ${household.name} are gathered together as {{user}} enters.`,
      first_mes: raw,
    };
  }

  const title = parsed.title || `${household.name} Gathering`;
  const scenario = parsed.scenario || "";
  const first_mes = parsed.first_mes || raw;

  const savedToCards: string[] = [];

  // Optionally attach to participating character cards as an alternate greeting
  if (saveToAlternateGreetings) {
    for (const { member, card } of cardDataList) {
      if (card) {
        const fullRecord = await getSavedCard(member.card_id);
        if (fullRecord) {
          const alts = Array.isArray(fullRecord.character.alternate_greetings)
            ? [...fullRecord.character.alternate_greetings]
            : [];
          const formattedAlt = `[Group Encounter — ${household.name}: ${title}]\n\n${first_mes}`;
          alts.push(formattedAlt);
          fullRecord.character.alternate_greetings = alts;
          await saveCardRecord(fullRecord.character, fullRecord.avatarBase64, fullRecord.id);
          savedToCards.push(member.card_id);
        }
      }
    }
  }

  return {
    householdId: household.id,
    householdName: household.name,
    title,
    scenario,
    first_mes,
    participatingMembers: targetMembers.map((m) => m.card_name),
    savedToCards,
  };
}
