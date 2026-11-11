import { describe, it, expect } from "bun:test";
import { migrateCharacter, CURRENT_SCHEMA_VERSION } from "./migrations";
import { computeLexicalVector, cosineSimilarity } from "./embeddings";
import type { RoleplayCharacter } from "../../types/character";

describe("Card Migrations", () => {
  it("migrates legacy v1 system prompt and bumps schema version to CURRENT_SCHEMA_VERSION", () => {
    const legacyCard: RoleplayCharacter = {
      id: "test_legacy",
      name: "Legacy Hero",
      description: "A brave knight.",
      personality: "Stern, unyielding.",
      scenario: "{{char}} guards the gate.",
      first_mes: '"Halt," {{char}} demands.',
      mes_example: "",
      alternate_greetings: ["{{char}} draws his sword."],
      system_prompt: "You are a realistic knight.",
      post_history_instructions: "",
      creator_notes: "",
      tags: ["fantasy", "knight"],
    };

    const migrated = migrateCharacter(legacyCard);

    expect(migrated.extensions?.chargenui?.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(migrated.system_prompt).toBe("");
    expect(migrated.post_history_instructions).toBe("You are a realistic knight.");
    expect(Array.isArray(migrated.assets)).toBe(true);
    expect(Array.isArray(migrated.extensions?.chargenui?.migrationHistory)).toBe(true);
  });
});

describe("Embeddings & Cosine Similarity", () => {
  it("computes lexical vectors and produces high similarity for related texts", () => {
    const textA = "Cyberpunk netrunner infiltrating Megacorp mainframe with neuro-deck";
    const textB = "Cyberpunk hacker breaking into corporate mainframe systems";
    const textC = "Victorian lady drinking afternoon tea in a quiet botanical garden";

    const vecA = computeLexicalVector(textA);
    const vecB = computeLexicalVector(textB);
    const vecC = computeLexicalVector(textC);

    const simAB = cosineSimilarity(vecA, vecB);
    const simAC = cosineSimilarity(vecA, vecC);

    expect(simAB).toBeGreaterThan(simAC);
    expect(simAB).toBeGreaterThan(0.2);
  });
});
