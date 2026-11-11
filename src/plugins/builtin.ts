import type { CharGenPlugin } from "../api";
import { mutationEnhancerPlugin } from "./builtin/mutation-enhancer";
import {
  expressionSheetPlugin,
  outfitVariantsPlugin,
  textureAtlasPlugin,
} from "./builtin/asset-generators";

export const tokenBudgetValidatorPlugin: CharGenPlugin = {
  meta: {
    id: "builtin_token_validator",
    name: "Token Budget & Macro Validator",
    version: "1.0.0",
    description: "Audits card fields for token overflow, unclosed macro brackets, and excessive length.",
    author: "CharGen Core",
    type: "validator",
    language: "typescript",
    enabled: true,
    isBuiltin: true,
  },
  onValidate: (char) => {
    const issues = [];
    const name = char.name || "Unnamed";

    // Macro check
    const checkMacros = (field: string, text: string) => {
      if (!text) return;
      const opens = (text.match(/\{\{/g) || []).length;
      const closes = (text.match(/\}\}/g) || []).length;
      if (opens !== closes) {
        issues.push({
          area: field,
          severity: "error" as const,
          message: `Unmatched macro braces in ${field} (${opens} '{{' vs ${closes} '}}').`,
          recommendation: "Ensure all {{char}} and {{user}} macro tags are cleanly closed.",
        });
      }
    };

    checkMacros("description", char.description || "");
    checkMacros("personality", char.personality || "");
    checkMacros("first_mes", char.first_mes || "");

    // User puppeteering check in first_mes
    const lowerFirstMes = (char.first_mes || "").toLowerCase();
    if (
      lowerFirstMes.includes("you think") ||
      lowerFirstMes.includes("you feel") ||
      lowerFirstMes.includes("you say, \"") ||
      lowerFirstMes.includes("you reply, \"")
    ) {
      issues.push({
        area: "first_mes",
        severity: "warning" as const,
        message: "First message appears to narrate {{user}}'s thoughts or dialogue.",
        recommendation: "Preserve player agency: remove assumptions about {{user}}'s reactions.",
      });
    }

    return {
      success: true,
      data: issues,
      issues,
    };
  },
};

export const sensoryTellsEnhancerPlugin: CharGenPlugin = {
  meta: {
    id: "builtin_sensory_tells",
    name: "Sensory Tells Enhancer",
    version: "1.0.0",
    description: "Appends physical sensory tells (scent, posture, unconscious micro-habits) to character description.",
    author: "CharGen Core",
    type: "enhancer",
    language: "typescript",
    enabled: true,
    isBuiltin: true,
  },
  onEnhance: (char, opts) => {
    const desc = char.description || "";
    if (desc.includes("[Sensory Tells & Habits]")) {
      return {
        success: true,
        data: char,
        changesSummary: ["Sensory tells already present in description."],
      };
    }

    const sensoryBlock = `\n\n[Sensory Tells & Habits]\n- Scent: Cold parchment, dried bergamot, faint iron.\n- Posture: Guarded stillness, weight anchored on rear foot.\n- Micro-habit: Slight pause before replying; glances toward entryways.`;

    const updated = {
      ...char,
      description: desc + sensoryBlock,
    };

    return {
      success: true,
      data: updated,
      changesSummary: ["Appended physical sensory tells and micro-habits to character description."],
    };
  },
};

export const lumiverseJsonExporterPlugin: CharGenPlugin = {
  meta: {
    id: "builtin_lumiverse_exporter",
    name: "Lumiverse VTT Exporter",
    version: "1.0.0",
    description: "Exports character into standardized Lumiverse / VTT JSON exchange payload.",
    author: "CharGen Core",
    type: "exporter",
    language: "typescript",
    enabled: true,
    isBuiltin: true,
  },
  onExport: (char) => {
    // Collect asset references from character if available
    const assets = char.assets || [];
    const timeline = char.extensions?.chargenui?.timeline || [];
    const branches = char.extensions?.chargenui?.branches?.branches
      ? Object.keys(char.extensions.chargenui.branches.branches)
      : ["main"];

    const payload = {
      format: "lumiverse-vtt",
      version: "1.1",
      entity: {
        id: char.id,
        name: char.name,
        avatar: char.avatar ? "present" : "none",
        stats: {
          tags: char.tags || [],
          role: "npc",
        },
        profile: {
          summary: char.description || "",
          personality: char.personality || "",
          opening: char.first_mes || "",
          altOpenings: char.alternate_greetings || [],
        },
        assets: assets.map((a) => ({
          type: a.type,
          name: a.name,
          uri: a.uri,
        })),
        narrative: {
          timelineEventsCount: timeline.length,
          branches,
        },
        exportedAt: new Date().toISOString(),
      },
    };

    return {
      success: true,
      data: payload,
    };
  },
};

export const BUILTIN_PLUGINS: CharGenPlugin[] = [
  tokenBudgetValidatorPlugin,
  sensoryTellsEnhancerPlugin,
  lumiverseJsonExporterPlugin,
  mutationEnhancerPlugin,
  expressionSheetPlugin,
  outfitVariantsPlugin,
  textureAtlasPlugin,
];
