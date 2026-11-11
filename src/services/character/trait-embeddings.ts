import type { RoleplayCharacter } from "../../types/character";
import type { ProviderConfig } from "../../types/provider";
import { getEmbedding, cosineSimilarity, buildCharacterDnaText } from "./embeddings";
import { listSavedCards, getSavedCard } from "./card-storage";
import { callProviderWithJsonRepair } from "../llm/provider-router";

export interface TraitEmbeddingMutationRequest {
  character: RoleplayCharacter;
  addTraits?: string[];
  removeTraits?: string[];
  intensity?: number; // 0.1 to 2.0, default 1.0
  count?: number; // 1 to 4 variants
  provider?: ProviderConfig;
}

export interface TraitSteeringInfluence {
  sourceCardId: string;
  sourceCardName: string;
  similarity: number;
  extractedTraits: string[];
  steeringSnippet: string;
}

export interface CharacterMutationVariant {
  title: string;
  divergenceSummary: string;
  steeringInfluences: TraitSteeringInfluence[];
  character: RoleplayCharacter;
}

export interface TraitEmbeddingMutationResult {
  variants: CharacterMutationVariant[];
  baseVectorMagnitude: number;
  targetVectorMagnitude: number;
  nearestLibraryCards: Array<{
    id: string;
    name: string;
    similarity: number;
  }>;
}

/**
 * Performs vector arithmetic in embedding space:
 * v_target = v_base + intensity * sum(v_add_i) - intensity * sum(v_remove_j)
 */
export function calculateMutatedVector(
  baseVector: number[],
  addVectors: number[][],
  removeVectors: number[][],
  intensity: number = 1.0
): number[] {
  const dim = baseVector.length;
  const result = [...baseVector];

  for (const addVec of addVectors) {
    if (addVec.length === dim) {
      for (let i = 0; i < dim; i++) {
        result[i] += intensity * addVec[i];
      }
    }
  }

  for (const remVec of removeVectors) {
    if (remVec.length === dim) {
      for (let i = 0; i < dim; i++) {
        result[i] -= intensity * remVec[i];
      }
    }
  }

  // Normalize
  let sumSq = 0;
  for (let i = 0; i < dim; i++) sumSq += result[i] * result[i];
  const mag = Math.sqrt(sumSq);
  if (mag > 0) {
    for (let i = 0; i < dim; i++) result[i] /= mag;
  }

  return result;
}

/**
 * Searches library cards to find the nearest archetypes to the mutated target vector.
 */
export async function findNearestArchetypes(
  targetVector: number[],
  excludeCardId?: string,
  topK: number = 5
): Promise<Array<{ card: RoleplayCharacter; id: string; similarity: number }>> {
  const metas = await listSavedCards();
  const scored: Array<{ card: RoleplayCharacter; id: string; similarity: number }> = [];

  for (const meta of metas) {
    if (excludeCardId && meta.id === excludeCardId) continue;
    const full = await getSavedCard(meta.id);
    if (!full || !full.character) continue;

    let charVec = full.character.extensions?.chargenui?.embedding;
    if (!charVec || !Array.isArray(charVec) || charVec.length !== targetVector.length) {
      const dnaText = buildCharacterDnaText(full.character);
      charVec = await getEmbedding(dnaText);
    }

    const sim = cosineSimilarity(targetVector, charVec);
    scored.push({ card: full.character, id: full.id, similarity: sim });
  }

  scored.sort((a, b) => b.similarity - a.similarity);
  return scored.slice(0, topK);
}

/**
 * Core orchestrator: Mutate character embedding vector -> find nearest library cards
 * -> extract their steering -> generate new variant(s).
 */
export async function mutateCharacterArchetype(
  req: TraitEmbeddingMutationRequest
): Promise<TraitEmbeddingMutationResult> {
  const {
    character,
    addTraits = [],
    removeTraits = [],
    intensity = 1.0,
    count = 1,
    provider,
  } = req;

  // 1. Compute Base Vector
  const baseDna = buildCharacterDnaText(character);
  const baseVector =
    character.extensions?.chargenui?.embedding &&
    Array.isArray(character.extensions.chargenui.embedding)
      ? character.extensions.chargenui.embedding
      : await getEmbedding(baseDna, provider);

  // 2. Compute Trait Vectors
  const addVectors = await Promise.all(
    addTraits.map((t) => getEmbedding(t, provider))
  );
  const removeVectors = await Promise.all(
    removeTraits.map((t) => getEmbedding(t, provider))
  );

  // 3. Vector Arithmetic
  const targetVector = calculateMutatedVector(baseVector, addVectors, removeVectors, intensity);

  // 4. Find Nearest Archetypes from library
  const nearest = await findNearestArchetypes(targetVector, character.id, 5);

  const nearestList = nearest.map((n) => ({
    id: n.id,
    name: n.card.name,
    similarity: Math.round(n.similarity * 100) / 100,
  }));

  const topInfluences: TraitSteeringInfluence[] = nearest.slice(0, 3).map((n) => ({
    sourceCardId: n.id,
    sourceCardName: n.card.name,
    similarity: Math.round(n.similarity * 100) / 100,
    extractedTraits: n.card.tags || [],
    steeringSnippet: (n.card.personality || n.card.description || "").slice(0, 300),
  }));

  const variantCount = Math.max(1, Math.min(count, 4));
  const variants: CharacterMutationVariant[] = [];

  // 5. Generate variants using LLM if provider is available, else algorithmic synthesis
  if (provider && provider.type) {
    const prompt = `You are a master character architect and persona evolution engine.
We are performing Vector Arithmetic Archetype Evolution on an existing character.

Original Character:
- Name: ${character.name}
- Personality: ${character.personality}
- Description: ${character.description}
- Scenario: ${character.scenario}
- Opening: ${character.first_mes}
- Tags: ${(character.tags || []).join(", ")}

Trait Vector Transformations:
- Injected Traits (+): ${addTraits.length > 0 ? addTraits.join(", ") : "None"}
- Suppressed/Removed Traits (-): ${removeTraits.length > 0 ? removeTraits.join(", ") : "None"}
- Mutation Intensity: ${intensity}

Nearest Archetype Influences found in vector space:
${topInfluences
  .map(
    (inf) =>
      `• [${inf.sourceCardName}] (Similarity: ${inf.similarity})\n  Steering Snippet: ${inf.steeringSnippet}\n  Traits: ${inf.extractedTraits.join(", ")}`
  )
  .join("\n\n")}

Generate exactly ${variantCount} evolved variant(s) of this character that organically integrate the added traits, suppress the removed traits, and borrow nuanced cadence/depth from the nearest archetypes without losing the core identity.

Return JSON in this format:
{
  "variants": [
    {
      "title": "Evolved Variant Title",
      "divergenceSummary": "Explanation of how the archetype shifted",
      "name": "${character.name}",
      "personality": "Mutated personality string...",
      "description": "Mutated description string...",
      "scenario": "Mutated scenario string...",
      "first_mes": "Mutated opening message...",
      "tags": ["mutated", "tags"]
    }
  ]
}`;

    try {
      const response = await callProviderWithJsonRepair<{
        variants: Array<{
          title: string;
          divergenceSummary: string;
          name?: string;
          personality?: string;
          description?: string;
          scenario?: string;
          first_mes?: string;
          tags?: string[];
        }>;
      }>(provider, prompt, "Character Mutation Vector Arithmetic");

      if (response && Array.isArray(response.variants) && response.variants.length > 0) {
        for (const v of response.variants) {
          const mutatedChar: RoleplayCharacter = {
            ...character,
            id: `char_mutated_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            name: v.name || character.name,
            personality: v.personality || character.personality,
            description: v.description || character.description,
            scenario: v.scenario || character.scenario,
            first_mes: v.first_mes || character.first_mes,
            tags: v.tags || Array.from(new Set([...(character.tags || []), ...addTraits])).filter((t) => !removeTraits.includes(t)),
            extensions: {
              ...character.extensions,
              chargenui: {
                ...(character.extensions?.chargenui || { schemaVersion: 3 }),
                embedding: targetVector,
              },
            },
          };

          variants.push({
            title: v.title || `Mutated ${character.name}`,
            divergenceSummary: v.divergenceSummary || "Archetype vector evolved.",
            steeringInfluences: topInfluences,
            character: mutatedChar,
          });
        }
      }
    } catch (err) {
      console.warn("LLM mutation synthesis failed, falling back to algorithmic blend:", err);
    }
  }

  // Algorithmic fallback if no variants were generated by LLM
  if (variants.length === 0) {
    for (let i = 0; i < variantCount; i++) {
      const addedTagList = addTraits.filter((t) => !(character.tags || []).includes(t));
      const filteredTags = (character.tags || []).filter((t) => !removeTraits.includes(t));
      const combinedTags = [...filteredTags, ...addedTagList];

      const steeringNotes = topInfluences.length > 0
        ? `\n\n[Archetype Resonances: ${topInfluences.map((inf) => inf.sourceCardName).join(", ")}]`
        : "";

      const mutatedChar: RoleplayCharacter = {
        ...character,
        id: `char_mutated_${Date.now()}_${i}`,
        personality: `${character.personality}\n[Evolved Traits (+)]: ${addTraits.join(", ")}${steeringNotes}`,
        tags: combinedTags,
        extensions: {
          ...character.extensions,
          chargenui: {
            ...(character.extensions?.chargenui || { schemaVersion: 3 }),
            embedding: targetVector,
          },
        },
      };

      variants.push({
        title: `${character.name} (Variant ${i + 1})`,
        divergenceSummary: `Injected traits: ${addTraits.join(", ")}. Suppressed: ${removeTraits.join(", ")}.`,
        steeringInfluences: topInfluences,
        character: mutatedChar,
      });
    }
  }

  return {
    variants,
    baseVectorMagnitude: 1.0,
    targetVectorMagnitude: 1.0,
    nearestLibraryCards: nearestList,
  };
}
