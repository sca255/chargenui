import { describe, it, expect } from "bun:test";
import type { RoleplayCharacter, TimelineEvent } from "../../types/character";
import {
  calculateMutatedVector,
  mutateCharacterArchetype,
} from "./trait-embeddings";
import {
  getCharacterTimeline,
  setCharacterTimeline,
  continueNarrativeArc,
} from "./timeline";
import {
  ensureBranchesData,
  createBranch,
  commitChanges,
  checkoutBranchOrCommit,
  mergeBranches,
} from "./branches";
import {
  expressionSheetPlugin,
  outfitVariantsPlugin,
  textureAtlasPlugin,
} from "../../plugins/builtin/asset-generators";
import { lumiverseJsonExporterPlugin } from "../../plugins/builtin";

describe("Net-New Feature 1: Character Mutation / Archetype Evolution (Vector Arithmetic)", () => {
  it("calculates mutated vectors by adding and subtracting trait vectors with intensity", () => {
    const base = [0.5, 0.5, 0.5, 0.5];
    const add1 = [0.2, 0.0, 0.1, 0.0];
    const rem1 = [0.0, 0.2, 0.0, 0.1];

    const mutated = calculateMutatedVector(base, [add1], [rem1], 1.0);
    expect(mutated.length).toBe(4);
    // Vector should be unit normalized
    const mag = Math.sqrt(mutated.reduce((sum, v) => sum + v * v, 0));
    expect(Math.abs(mag - 1.0)).toBeLessThan(0.001);
  });

  it("mutates character archetype and attaches embedding to extensions.chargenui", async () => {
    const char: RoleplayCharacter = {
      id: "char_test_1",
      name: "Valerius",
      description: "A stoic palace guard captain.",
      personality: "Stern, dutiful, loyal to the crown.",
      scenario: "Guarding the throne room.",
      first_mes: "Halt. State your business.",
      alternate_greetings: [],
      system_prompt: "",
      post_history_instructions: "",
      creator_notes: "",
      tags: ["guard", "stoic"],
    };

    const res = await mutateCharacterArchetype({
      character: char,
      addTraits: ["corrupted", "shadow-magic"],
      removeTraits: ["loyal"],
      intensity: 1.2,
      count: 1,
    });

    expect(res.variants.length).toBe(1);
    const variant = res.variants[0].character;
    expect(variant.tags).toContain("corrupted");
    expect(variant.tags).toContain("shadow-magic");
    expect(variant.tags).not.toContain("loyal");
    expect(variant.extensions?.chargenui?.embedding).toBeDefined();
  });
});

describe("Net-New Feature 2: Narrative Timeline / Character Arc Tracker", () => {
  it("manages persistent timeline in extensions.chargenui.timeline", () => {
    const char: RoleplayCharacter = {
      id: "char_test_2",
      name: "Lyra",
      description: "An apprentice astromancer.",
      personality: "Curious and bright.",
      scenario: "Observing fallen stars.",
      first_mes: "Did you see that streak in the east?",
      alternate_greetings: [],
      system_prompt: "",
      post_history_instructions: "",
      creator_notes: "",
      tags: ["astromancer"],
    };

    expect(getCharacterTimeline(char)).toEqual([]);

    const event1: TimelineEvent = {
      id: "evt_1",
      title: "Starfall Incident",
      timestamp: "Day 1",
      summary: "A fallen comet crashed into the observatory.",
      significance: "critical",
    };

    const updated = setCharacterTimeline(char, [event1]);
    expect(getCharacterTimeline(updated).length).toBe(1);
    expect(getCharacterTimeline(updated)[0].title).toBe("Starfall Incident");
  });

  it("continues story arc and appends new timeline beat and opening", async () => {
    const char: RoleplayCharacter = {
      id: "char_test_2b",
      name: "Lyra",
      description: "An apprentice astromancer.",
      personality: "Curious and bright.",
      scenario: "Observing fallen stars.",
      first_mes: "Did you see that streak in the east?",
      alternate_greetings: [],
      system_prompt: "",
      post_history_instructions: "",
      creator_notes: "",
      tags: ["astromancer"],
    };

    const res = await continueNarrativeArc({
      character: char,
      timeAdvance: "Six months later",
      focusPlot: "Uncovering the void shard",
      provider: {} as any,
    });

    expect(res.updatedCharacter.extensions?.chargenui?.timeline?.length).toBe(1);
    expect(res.updatedCharacter.alternate_greetings.length).toBe(1);
    expect(res.newEvent.timestamp).toBe("Six months later");
  });
});

describe("Net-New Feature 3: Character Forking / Git-like Branching", () => {
  it("manages branches, commits, checkout, and merge", () => {
    const char: RoleplayCharacter = {
      id: "char_test_3",
      name: "Kaelen",
      description: "A wandering sellsword.",
      personality: "Pragmatic and reserved.",
      scenario: "Resting by a campfire.",
      first_mes: "The road is quiet tonight.",
      alternate_greetings: ["First alt"],
      system_prompt: "",
      post_history_instructions: "",
      creator_notes: "",
      tags: ["mercenary"],
    };

    // Ensure branches structure
    const branchesData = ensureBranchesData(char);
    expect(branchesData.currentBranch).toBe("main");
    expect(branchesData.branches.main).toBeDefined();

    // Create branch 'dark-au'
    const { updatedCharacter: branchedChar } = createBranch(char, {
      name: "dark-au",
      description: "Corrupted dark fantasy timeline",
    });
    expect(branchedChar.extensions?.chargenui?.branches?.branches["dark-au"]).toBeDefined();

    // Commit changes on dark-au
    const modifiedChar: RoleplayCharacter = {
      ...branchedChar,
      description: "A blood-bound dread knight.",
      tags: ["mercenary", "dread-knight"],
      alternate_greetings: ["First alt", "Blood for the altar."],
    };
    modifiedChar.extensions!.chargenui!.branches!.currentBranch = "dark-au";

    const { updatedCharacter: committedChar } = commitChanges(modifiedChar, {
      message: "Ascended into Dread Knight",
      character: modifiedChar,
    });

    // Checkout 'main'
    const restoredMain = checkoutBranchOrCommit(committedChar, "main");
    expect(restoredMain.description).toBe("A wandering sellsword.");
    expect(restoredMain.extensions?.chargenui?.branches?.currentBranch).toBe("main");

    // Merge 'dark-au' into 'main'
    const mergeResult = mergeBranches(restoredMain, "dark-au", "main");
    expect(mergeResult.mergedCharacter.tags).toContain("dread-knight");
    expect(mergeResult.mergedCharacter.alternate_greetings).toContain("Blood for the altar.");
  });
});

describe("Net-New Feature 4: Asset Pipeline Plugins & Lumiverse Exporter", () => {
  it("generates 8 facial expressions with expression sheet plugin", async () => {
    const char: RoleplayCharacter = {
      id: "char_test_4",
      name: "Seraphina",
      description: "High priestess",
      personality: "Graceful",
      scenario: "At the cathedral",
      first_mes: "Welcome, seeker.",
      alternate_greetings: [],
      system_prompt: "",
      post_history_instructions: "",
      creator_notes: "",
      tags: ["priestess", "blonde"],
    };

    const res = await expressionSheetPlugin.onGenerateAssets!(char, { count: 8 });
    expect(res.success).toBe(true);
    expect(res.data?.assets.length).toBe(8);
    expect(res.data?.assets[0].workflowTemplate).toBeDefined();
  });

  it("generates 4 outfit variants with outfit plugin", async () => {
    const char: RoleplayCharacter = {
      id: "char_test_4",
      name: "Seraphina",
      description: "High priestess",
      personality: "Graceful",
      scenario: "At the cathedral",
      first_mes: "Welcome, seeker.",
      alternate_greetings: [],
      system_prompt: "",
      post_history_instructions: "",
      creator_notes: "",
      tags: ["priestess"],
    };

    const res = await outfitVariantsPlugin.onGenerateAssets!(char);
    expect(res.success).toBe(true);
    expect(res.data?.assets.length).toBe(4);
    expect(res.data?.assets[0].aspectRatio).toBe("2:3");
  });

  it("generates texture atlas / VTT pack with tokens and item prop atlas", async () => {
    const char: RoleplayCharacter = {
      id: "char_test_4",
      name: "Seraphina",
      description: "High priestess",
      personality: "Graceful",
      scenario: "At the cathedral",
      first_mes: "Welcome, seeker.",
      alternate_greetings: [],
      system_prompt: "",
      post_history_instructions: "",
      creator_notes: "",
      tags: ["priestess"],
    };

    const res = await textureAtlasPlugin.onGenerateAssets!(char);
    expect(res.success).toBe(true);
    expect(res.data?.assets.length).toBe(4);
  });

  it("exports assets and narrative metadata in Lumiverse exporter", async () => {
    const char: RoleplayCharacter = {
      id: "char_test_4",
      name: "Seraphina",
      description: "High priestess",
      personality: "Graceful",
      scenario: "At the cathedral",
      first_mes: "Welcome, seeker.",
      alternate_greetings: [],
      system_prompt: "",
      post_history_instructions: "",
      creator_notes: "",
      tags: ["priestess"],
      assets: [
        { type: "emotion", uri: "embedded://assets/joy.png", name: "joy" },
      ],
      extensions: {
        chargenui: {
          schemaVersion: 3,
          timeline: [{ id: "1", title: "Ordination", summary: "Ordained" }],
        },
      },
    };

    const res = await lumiverseJsonExporterPlugin.onExport!(char);
    expect(res.success).toBe(true);
    const data = res.data as any;
    expect(data.entity.assets.length).toBe(1);
    expect(data.entity.narrative.timelineEventsCount).toBe(1);
  });
});
