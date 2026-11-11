import type { RequestHandler } from "../utils/router";
import type { HouseholdRecord, GenerateEncounterRequest } from "../types/household";
import {
  listHouseholds,
  getHousehold,
  saveHousehold,
  deleteHousehold,
} from "../services/character/household-storage";
import { generateGroupEncounter } from "../services/character/household-encounter";

export const householdsRoutes: RequestHandler[] = [
  {
    method: "GET",
    path: "/api/households",
    handler: async () => {
      const households = await listHouseholds();
      return Response.json({ households });
    },
  },
  {
    method: "POST",
    path: "/api/households",
    handler: async (req) => {
      const body = (await req.json().catch(() => ({})))  as Partial<HouseholdRecord> & { name: string };
      if (!body?.name?.trim()) {
        return Response.json({ error: "Household name is required" }, { status: 400 });
      }
      const saved = await saveHousehold(body);
      return Response.json({ success: true, household: saved });
    },
  },
  {
    method: "GET",
    path: "/api/households/:id",
    handler: async (req, params) => {
      const household = await getHousehold(params.id);
      if (!household) {
        return Response.json({ error: "Household not found" }, { status: 404 });
      }
      return Response.json({ household });
    },
  },
  {
    method: "DELETE",
    path: "/api/households/:id",
    handler: async (req, params) => {
      const ok = await deleteHousehold(params.id);
      return Response.json({ success: ok });
    },
  },
  {
    method: "POST",
    path: "/api/households/:id/encounter",
    handler: async (req, params) => {
      const household = await getHousehold(params.id);
      if (!household) {
        return Response.json({ error: "Household not found" }, { status: 404 });
      }
      const body = (await req.json().catch(() => ({}))) as GenerateEncounterRequest & { provider?: any };
      const result = await generateGroupEncounter(
        household,
        body.participatingCardIds,
        body.scenarioGoal,
        body.provider,
        Boolean(body.saveToAlternateGreetings)
      );
      return Response.json({ success: true, encounter: result });
    },
  },
];