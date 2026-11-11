import type { RequestHandler } from "../utils/router";
import type { RoleplayCharacter, TimelineEvent } from "../types/character";
import {
  getCharacterTimeline,
  setCharacterTimeline,
  extractTimelineEvents,
  continueNarrativeArc,
} from "../services/character/timeline";
import { getSavedCard, saveCardRecord } from "../services/character/card-storage";

export const timelineRoutes: RequestHandler[] = [
  {
    method: "GET",
    path: "/api/characters/:id/timeline",
    handler: async (req, params) => {
      const record = await getSavedCard(params.id);
      if (!record || !record.character) {
        return Response.json({ error: "Character not found" }, { status: 404 });
      }
      const timeline = getCharacterTimeline(record.character);
      return Response.json({ timeline });
    },
  },
  {
    method: "POST",
    path: "/api/characters/:id/timeline",
    handler: async (req, params) => {
      const record = await getSavedCard(params.id);
      if (!record || !record.character) {
        return Response.json({ error: "Character not found" }, { status: 404 });
      }

      const body = (await req.json().catch(() => ({}))) as {
        timeline?: TimelineEvent[];
        event?: TimelineEvent;
        autoExtract?: boolean;
        provider?: any;
      };

      let currentTimeline = getCharacterTimeline(record.character);

      if (body.autoExtract) {
        const extracted = await extractTimelineEvents(record.character, {
          provider: body.provider,
        });
        currentTimeline = [...currentTimeline, ...extracted];
      } else if (Array.isArray(body.timeline)) {
        currentTimeline = body.timeline;
      } else if (body.event) {
        currentTimeline.push({
          ...body.event,
          id: body.event.id || `evt_${Date.now()}`,
        });
      }

      const updatedChar = setCharacterTimeline(record.character, currentTimeline);
      await saveCardRecord(updatedChar, record.avatarBase64, record.id);
      return Response.json({ success: true, timeline: currentTimeline });
    },
  },
  {
    method: "POST",
    path: "/api/characters/:id/continue-arc",
    handler: async (req, params) => {
      const record = await getSavedCard(params.id);
      if (!record || !record.character) {
        return Response.json({ error: "Character not found" }, { status: 404 });
      }

      const body = (await req.json().catch(() => ({}))) as {
        timeAdvance?: string;
        focusPlot?: string;
        divergenceBranch?: string;
        provider?: any;
        saveToCard?: boolean;
      };

      const result = await continueNarrativeArc({
        character: record.character,
        timeAdvance: body.timeAdvance,
        focusPlot: body.focusPlot,
        divergenceBranch: body.divergenceBranch,
        provider: body.provider,
      });

      if (body.saveToCard !== false) {
        await saveCardRecord(result.updatedCharacter, record.avatarBase64, record.id);
      }

      return Response.json(result);
    },
  },
  {
    method: "POST",
    path: "/api/continue-arc",
    handler: async (req) => {
      const body = (await req.json().catch(() => ({}))) as {
        character: RoleplayCharacter;
        timeAdvance?: string;
        focusPlot?: string;
        divergenceBranch?: string;
        provider?: any;
      };

      if (!body.character) {
        return Response.json({ error: "Character is required" }, { status: 400 });
      }

      const result = await continueNarrativeArc({
        character: body.character,
        timeAdvance: body.timeAdvance,
        focusPlot: body.focusPlot,
        divergenceBranch: body.divergenceBranch,
        provider: body.provider,
      });

      return Response.json(result);
    },
  },
];
