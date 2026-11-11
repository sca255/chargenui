import vm from "node:vm";
import * as path from "node:path";
import { spawn } from "node:child_process";
import type { RoleplayCharacter } from "../types/character";
import type { CharGenPlugin, PluginMeta, PluginResult, ValidationIssue, PluginContext } from "./api";

/**
 * Executes a JavaScript plugin inside a node:vm sandbox.
 * Enforces timeout and safe globals isolation.
 */
export async function executeJsPlugin(
  scriptCode: string,
  hookName: string,
  args: unknown[],
  timeoutMs: number = 5000
): Promise<PluginResult<any>> {
  const logs: string[] = [];
  const sandbox = {
    console: {
      log: (...a: unknown[]) => logs.push(a.map((x) => (typeof x === "object" ? JSON.stringify(x) : String(x))).join(" ")),
      warn: (...a: unknown[]) => logs.push("[WARN] " + a.map((x) => (typeof x === "object" ? JSON.stringify(x) : String(x))).join(" ")),
      error: (...a: unknown[]) => logs.push("[ERR] " + a.map((x) => (typeof x === "object" ? JSON.stringify(x) : String(x))).join(" ")),
    },
    Math,
    Date,
    JSON,
    RegExp,
    Array,
    Object,
    String,
    Number,
    Boolean,
    parseInt,
    parseFloat,
    Buffer: {
      from: Buffer.from,
      isBuffer: Buffer.isBuffer,
    },
    module: { exports: {} },
    exports: {},
  };

  const context = vm.createContext(sandbox);

  try {
    const wrappedScript = `
      (function() {
        ${scriptCode}
        return module.exports || exports;
      })()
    `;

    const script = new vm.Script(wrappedScript, { filename: "plugin.js" });
    const pluginInstance = script.runInContext(context, { timeout: timeoutMs });

    if (!pluginInstance || typeof pluginInstance[hookName] !== "function") {
      return {
        success: false,
        error: `Hook "${hookName}" not found or not a function in JavaScript plugin.`,
        logs,
      };
    }

    const result = await Promise.resolve(pluginInstance[hookName](...args));
    return {
      success: true,
      data: result?.data !== undefined ? result.data : result,
      logs,
      issues: result?.issues,
      changesSummary: result?.changesSummary,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || String(err),
      logs,
    };
  }
}

const LUA_RUNNER_PATH = path.resolve(import.meta.dir, "lua_runner.lua");

/**
 * Executes a Lua plugin by invoking the system Lua interpreter in a subprocess via Bun.spawn.
 * Passes input via stdin as JSON and reads JSON response from stdout.
 */
export async function executeLuaPlugin(
  luaFilePath: string,
  hookName: string,
  payload: Record<string, unknown>,
  timeoutMs: number = 8000
): Promise<PluginResult<any>> {
  try {
    const proc = Bun.spawn(["lua", LUA_RUNNER_PATH, hookName, luaFilePath], {
      stdin: "pipe",
      stdout: "pipe",
      stderr: "pipe",
    });

    const inputJson = JSON.stringify({ hook: hookName, args: payload });
    proc.stdin.write(inputJson);
    proc.stdin.end();

    const stdoutPromise = new Response(proc.stdout).text();
    const stderrPromise = new Response(proc.stderr).text();

    const timeoutPromise = new Promise<{ timeout: true }>((resolve) =>
      setTimeout(() => resolve({ timeout: true }), timeoutMs)
    );

    const raceResult = await Promise.race([
      Promise.all([stdoutPromise, stderrPromise, proc.exited]),
      timeoutPromise,
    ]);

    if ("timeout" in raceResult) {
      proc.kill(9);
      return {
        success: false,
        error: `Lua plugin execution timed out after ${timeoutMs}ms`,
      };
    }

    const [stdout, stderr, exitCode] = raceResult as [string, string, number];
    if (exitCode !== 0 && !stdout.trim()) {
      return {
        success: false,
        error: stderr.trim() || `Lua process exited with code ${exitCode}`,
      };
    }

    try {
      const parsed = JSON.parse(stdout.trim());
      return {
        success: !!parsed.success,
        data: parsed.data,
        error: parsed.error,
        logs: stderr ? [stderr] : undefined,
      };
    } catch (err: any) {
      return {
        success: false,
        error: `Failed to parse Lua plugin response JSON: ${err?.message} - Output: ${stdout}`,
      };
    }
  } catch (err: any) {
    return {
      success: false,
      error: `Failed to execute Lua plugin: ${err?.message || String(err)}`,
    };
  }
}
