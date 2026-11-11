import type { RoleplayCharacter, TimelineEvent } from "../../types/character";
import type { ProviderConfig } from "../../types/provider";
import { callProviderWithJsonRepair } from "../llm/provider-router";
import { getSavedCard, saveCardRecord } from "./card-storage";

export interface ExtractTimelineOptions {
  includeScenario?: boolean;
  includeFirstMes?: boolean;
  chatHistory?: string | Array<{ role: string; content: string }>;
  provider?: ProviderConfig;
}

export interface ContinueArcRequest {
  character: RoleplayCharacter;
  timeAdvance?: string; // e.g. "Three months later", "Next morning"
  focusPlot?: string;
  divergenceBranch?: string; // name of alternate branch if any
  provider: ProviderConfig;
}

export interface ContinueArcResult {
  updatedCharacter: RoleplayCharacter;
  newEvent: TimelineEvent;
  nextGreeting: string;
  arcSummary: string;
}

/**
 * Gets the persistent timeline from a character card.
 */
export function getCharacterTimeline(character: RoleplayCharacter): TimelineEvent[] {
  const events = character.extensions?.chargenui?.timeline;
  return Array.isArray(events) ? events : [];
}

/**
 * Appends or updates timeline events on a character.
 */
export function setCharacterTimeline(
  character: RoleplayCharacter,
  timeline: TimelineEvent[]
): RoleplayCharacter {
  const extensions = character.extensions || {};
  const chargenui = extensions.chargenui || { schemaVersion: 3 };

  return {
    ...character,
    extensions: {
      ...extensions,
      chargenui: {
        ...chargenui,
        timeline,
      },
    },
  };
}

/**
 * Automatically extracts chronological narrative timeline events from scenario, first_mes, and optional chat.
 */
export async function extractTimelineEvents(
  character: RoleplayCharacter,
  options: ExtractTimelineOptions = {}
): Promise<TimelineEvent[]> {
  const { includeScenario = true, includeFirstMes = true, chatHistory, provider } = options;

  const textSources: string[] = [];
  if (includeScenario && character.scenario) {
    textSources.push(`[Scenario & World Setting]:\n${character.scenario}`);
  }
  if (includeFirstMes && character.first_mes) {
    textSources.push(`[Opening Narrative / Inciting Incident]:\n${character.first_mes}`);
  }
  if (chatHistory) {
    const chatStr = typeof chatHistory === "string"
      ? chatHistory
      : chatHistory.map((m) => `${m.role}: ${m.content}`).join("\n");
    textSources.push(`[Recent Chat / Dialogue]:\n${chatStr.slice(0, 3000)}`);
  }

  if (textSources.length === 0) return [];

  // If LLM provider is available, use semantic extraction
  if (provider && provider.type) {
    const prompt = `You are a narrative arc tracker and story timeline architect.
Analyze the following character narrative materials and extract a chronological array of concrete story beats / timeline events.

Character Name: ${character.name}
${textSources.join("\n\n")}

Return a JSON array of events under key "events":
{
  "events": [
    {
      "id": "evt_1",
      "title": "Concise Event Title",
      "timestamp": "Temporal order or in-universe time (e.g. Day 1, Prologue, Six Years Ago)",
      "summary": "Clear 1-3 sentence summary of what occurred and how character/world shifted",
      "significance": "critical" | "major" | "minor" | "flavor",
      "location": "Setting/location where it happened",
      "source": "scenario" | "first_mes" | "chat"
    }
  ]
}`;

    try {
      const parsed = await callProviderWithJsonRepair<{ events: TimelineEvent[] }>(
        provider,
        prompt,
        "Timeline Event Extraction"
      );
      if (parsed && Array.isArray(parsed.events)) {
        return parsed.events.map((e, idx) => ({
          ...e,
          id: e.id || `evt_${Date.now()}_${idx}`,
          source: e.source || "scenario",
        }));
      }
    } catch (err) {
      console.warn("LLM timeline extraction failed, falling back to heuristic parsing:", err);
    }
  }

  // Algorithmic heuristic fallback
  const fallbackEvents: TimelineEvent[] = [];
  if (character.scenario) {
    fallbackEvents.push({
      id: `evt_scen_${Date.now()}`,
      title: "Setting Inception & Inciting Context",
      timestamp: "Pre-Opening",
      summary: character.scenario.slice(0, 160) + (character.scenario.length > 160 ? "..." : ""),
      significance: "major",
      source: "scenario",
      charactersInvolved: [character.name],
    });
  }
  if (character.first_mes) {
    fallbackEvents.push({
      id: `evt_first_${Date.now() + 1}`,
      title: "Initial Encounter",
      timestamp: "Chapter 1",
      summary: character.first_mes.slice(0, 160) + (character.first_mes.length > 160 ? "..." : ""),
      significance: "critical",
      source: "first_mes",
      charactersInvolved: [character.name, "{{user}}"],
    });
  }

  return fallbackEvents;
}

/**
 * Continues the character's narrative arc into the future, creating a new timeline beat,
 * updated scenario context, and a new opening message.
 */
export async function continueNarrativeArc(
  req: ContinueArcRequest
): Promise<ContinueArcResult> {
  const { character, timeAdvance = "Some time later", focusPlot = "", divergenceBranch = "", provider } = req;
  const currentTimeline = getCharacterTimeline(character);

  const prompt = `You are a character arc progression engine.
We are continuing the narrative arc of character "${character.name}" forward in time.

Current Personality: ${character.personality}
Current Scenario: ${character.scenario}
Current First Message: ${character.first_mes}
Existing Timeline:
${currentTimeline.map((e) => `- [${e.timestamp || "Past"}]: ${e.title} - ${e.summary}`).join("\n")}

Progression Parameters:
- Temporal Jump: ${timeAdvance}
- Specific Plot Focus: ${focusPlot || "Natural emotional and conflict evolution"}
- Branch Direction: ${divergenceBranch || "Main canon continuation"}

Generate the next narrative phase with:
1. "newEvent": A new timeline event object ({ "title", "timestamp", "summary", "significance", "location" })
2. "evolvedScenario": The updated scenario reflecting this new point in time
3. "nextGreeting": A compelling new opening message from ${character.name} at this advanced point in time
4. "arcSummary": A brief synopsis of character development and stakes

Return JSON matching:
{
  "newEvent": {
    "title": "Title",
    "timestamp": "${timeAdvance}",
    "summary": "Summary...",
    "significance": "critical",
    "location": "Location..."
  },
  "evolvedScenario": "Updated scenario...",
  "nextGreeting": "New opening message...",
  "arcSummary": "Arc summary..."
}`;

  let parsed: any;
  if (provider && provider.type) {
    try {
      parsed = await callProviderWithJsonRepair<any>(
        provider,
        prompt,
        "Narrative Arc Continuation"
      );
    } catch (err) {
      console.warn("LLM arc continuation failed, using heuristic continuation:", err);
    }
  }

  const newEvent: TimelineEvent = {
    id: `evt_arc_${Date.now()}`,
    title: parsed?.newEvent?.title || `Arc Progression: ${timeAdvance}`,
    timestamp: parsed?.newEvent?.timestamp || timeAdvance,
    summary: parsed?.newEvent?.summary || (focusPlot ? `Progression: ${focusPlot}` : `Continued story arc with ${character.name}.`),
    significance: parsed?.newEvent?.significance || "major",
    location: parsed?.newEvent?.location,
    source: "continuation",
    charactersInvolved: [character.name, "{{user}}"],
  };

  const updatedTimeline = [...currentTimeline, newEvent];

  const evolvedScenario = parsed?.evolvedScenario || `${character.scenario}\n\n[Timeline Advance - ${timeAdvance}]: ${newEvent.summary}`;
  const nextGreeting = parsed?.nextGreeting || `${character.first_mes}\n\n*${timeAdvance}...*\n"${character.name} watches as the consequences unfold."`;
  const arcSummary = parsed?.arcSummary || `The narrative arc advanced by ${timeAdvance}.`;

  const updatedCharacter = setCharacterTimeline(
    {
      ...character,
      scenario: evolvedScenario,
      alternate_greetings: [
        ...(character.alternate_greetings || []),
        nextGreeting,
      ],
    },
    updatedTimeline
  );

  return {
    updatedCharacter,
    newEvent,
    nextGreeting,
    arcSummary,
  };
}
