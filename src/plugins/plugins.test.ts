import { describe, it, expect } from "bun:test";
import { initializePlugins } from "./loader";
import { pluginRegistry } from "./registry";
import type { RoleplayCharacter } from "../types/character";

describe("Plugin System", () => {
  it("initializes builtin and installed (JS/Lua) plugins", () => {
    initializePlugins();
    const plugins = pluginRegistry.getAll();
    expect(plugins.length).toBeGreaterThanOrEqual(3);

    const builtinIds = plugins.map((p) => p.meta.id);
    expect(builtinIds).toContain("builtin_token_validator");
    expect(builtinIds).toContain("builtin_sensory_tells");
    expect(builtinIds).toContain("builtin_lumiverse_exporter");
  });

  it("executes builtin validator hook", async () => {
    const validator = pluginRegistry.getPlugin("builtin_token_validator");
    expect(validator).toBeDefined();

    const charWithIssues: RoleplayCharacter = {
      id: "char_test_val",
      name: "Validator Test",
      description: "{{char}} has unclosed {{macro tags.",
      personality: "Stern",
      scenario: "In a tavern",
      first_mes: 'You feel a cold shiver run down your spine as you say, "Hello"',
      mes_example: "",
      alternate_greetings: [],
      system_prompt: "",
      post_history_instructions: "",
      creator_notes: "",
      tags: [],
    };

    const res = await validator!.onValidate!(charWithIssues);
    expect(res.success).toBe(true);
    expect(res.issues?.length).toBeGreaterThanOrEqual(1);
    const hasPuppetWarn = res.issues?.some((i) => i.area === "first_mes");
    expect(hasPuppetWarn).toBe(true);
  });

  it("executes installed JavaScript plugin in VM sandbox", async () => {
    const jsPlugin = pluginRegistry.getPlugin("dialect_rewriter_sample");
    expect(jsPlugin).toBeDefined();

    const char: RoleplayCharacter = {
      id: "char_dialect",
      name: "Old Farmer",
      description: "A weathered man.",
      personality: "Gruff",
      scenario: "Field",
      first_mes: "You are standing on your land and you are going to stay.",
      mes_example: "",
      alternate_greetings: [],
      system_prompt: "",
      post_history_instructions: "",
      creator_notes: "",
      tags: [],
    };

    const res = await jsPlugin!.onEnhance!(char, {});
    expect(res.success).toBe(true);
    expect(res.data?.first_mes).toContain("ye're");
    expect(res.data?.first_mes).toContain("yer");
    expect(res.data?.first_mes).toContain("gonna");
  });

  it("executes installed Lua plugin via runner", async () => {
    const luaPlugin = pluginRegistry.getPlugin("lua_vtt_exporter_sample");
    expect(luaPlugin).toBeDefined();

    const char: RoleplayCharacter = {
      id: "char_lua",
      name: "Shadowblade",
      description: "A stealthy rogue operating in midnight alleys.",
      personality: "Cynical",
      scenario: "Rooftops",
      first_mes: '"Keep quiet," he whispers.',
      mes_example: "",
      alternate_greetings: [],
      system_prompt: "",
      post_history_instructions: "",
      creator_notes: "",
      tags: ["stealth", "rogue"],
    };

    const res = await luaPlugin!.onExport!(char, "lua_vtt");
    expect(res.success).toBe(true);
    expect(res.data).toBeDefined();
    expect((res.data as any).token_name).toBe("SHADOWBLADE");
    expect((res.data as any).vtt_version).toBe("lua_vtt_1.0");
  });

  it("enables and disables plugins dynamically", () => {
    const toggled = pluginRegistry.setEnabled("builtin_sensory_tells", false);
    expect(toggled).toBe(true);
    expect(pluginRegistry.getPlugin("builtin_sensory_tells")?.meta.enabled).toBe(false);

    // Re-enable
    pluginRegistry.setEnabled("builtin_sensory_tells", true);
    expect(pluginRegistry.getPlugin("builtin_sensory_tells")?.meta.enabled).toBe(true);
  });
});
