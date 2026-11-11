import type { CharGenPlugin } from "../../plugins/api";
import { mutateCharacterArchetype } from "../../services/character/trait-embeddings";

export const mutationEnhancerPlugin: CharGenPlugin = {
  meta: {
    id: "builtin_mutation_enhancer",
    name: "Archetype Vector Mutation Enhancer",
    version: "1.0.0",
    description: "Applies vector arithmetic mutation and trait steering to evolve character archetypes.",
    author: "CharGen Core",
    type: "enhancer",
    language: "typescript",
    enabled: true,
    isBuiltin: true,
  },
  onEnhance: async (char, opts = {}) => {
    const addTraits = (opts.addTraits as string[]) || [];
    const removeTraits = (opts.removeTraits as string[]) || [];
    const intensity = (opts.intensity as number) || 1.0;
    const provider = opts.provider as any;

    if (addTraits.length === 0 && removeTraits.length === 0) {
      return {
        success: true,
        data: char,
        changesSummary: ["No trait modifications specified for mutation enhancer."],
      };
    }

    const mutationResult = await mutateCharacterArchetype({
      character: char,
      addTraits,
      removeTraits,
      intensity,
      count: 1,
      provider,
    });

    const mutated = mutationResult.variants[0]?.character || char;
    return {
      success: true,
      data: mutated,
      changesSummary: [
        `Mutated archetype vector with traits (+): [${addTraits.join(", ")}], (-): [${removeTraits.join(", ")}]`,
        `Nearest archetypes integrated: ${mutationResult.nearestLibraryCards.map((c) => c.name).join(", ") || "None"}`,
      ],
    };
  },
};
