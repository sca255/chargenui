import type { RequestHandler } from "../utils/router";
import { pluginRegistry } from "../plugins/registry";
import { initializePlugins } from "../plugins/loader";
import type { RoleplayCharacter } from "../types/character";
import type { PluginContext } from "../plugins/api";

// Ensure plugins are initialized at startup
initializePlugins();

export const pluginsRoutes: RequestHandler[] = [
  {
    method: "GET",
    path: "/api/plugins",
    handler: async () => {
      const plugins = pluginRegistry.listMeta();
      return Response.json({ plugins });
    },
  },
  {
    method: "POST",
    path: "/api/plugins/reload",
    handler: async () => {
      initializePlugins();
      return Response.json({ success: true, plugins: pluginRegistry.listMeta() });
    },
  },
  {
    method: "POST",
    path: "/api/plugins/:id/toggle",
    handler: async (req, params) => {
      const body = (await req.json().catch(() => ({}))) as { enabled?: boolean };
      const current = pluginRegistry.getPlugin(params.id);
      if (!current) {
        return Response.json({ error: "Plugin not found" }, { status: 404 });
      }
      const newEnabled = body.enabled !== undefined ? body.enabled : !current.meta.enabled;
      pluginRegistry.setEnabled(params.id, newEnabled);
      return Response.json({ success: true, meta: current.meta });
    },
  },
  {
    method: "POST",
    path: "/api/plugins/:id/execute",
    handler: async (req, params) => {
      const plugin = pluginRegistry.getPlugin(params.id);
      if (!plugin) {
        return Response.json({ error: "Plugin not found" }, { status: 404 });
      }
      if (!plugin.meta.enabled) {
        return Response.json({ error: "Plugin is disabled" }, { status: 400 });
      }

      const body = (await req.json().catch(() => ({}))) as {
        hook: "onEnhance" | "onGenerate" | "onExport" | "onValidate" | "onImport" | "onPipeline";
        character?: RoleplayCharacter;
        context?: PluginContext;
        options?: Record<string, unknown>;
        fileContent?: string;
        format?: string;
      };

      const hook = body.hook || "onEnhance";
      try {
        switch (hook) {
          case "onEnhance": {
            if (!plugin.onEnhance || !body.character) {
              return Response.json({ error: "Plugin does not implement onEnhance or missing character" }, { status: 400 });
            }
            const res = await plugin.onEnhance(body.character, body.options);
            return Response.json(res);
          }
          case "onValidate": {
            if (!plugin.onValidate || !body.character) {
              return Response.json({ error: "Plugin does not implement onValidate or missing character" }, { status: 400 });
            }
            const res = await plugin.onValidate(body.character);
            return Response.json(res);
          }
          case "onExport": {
            if (!plugin.onExport || !body.character) {
              return Response.json({ error: "Plugin does not implement onExport or missing character" }, { status: 400 });
            }
            const res = await plugin.onExport(body.character, body.format);
            return Response.json(res);
          }
          case "onGenerate": {
            if (!plugin.onGenerate) {
              return Response.json({ error: "Plugin does not implement onGenerate" }, { status: 400 });
            }
            const res = await plugin.onGenerate(body.context || {});
            return Response.json(res);
          }
          case "onImport": {
            if (!plugin.onImport || !body.fileContent) {
              return Response.json({ error: "Plugin does not implement onImport or missing fileContent" }, { status: 400 });
            }
            const res = await plugin.onImport(body.fileContent, body.format);
            return Response.json(res);
          }
          case "onPipeline": {
            if (!plugin.onPipeline) {
              return Response.json({ error: "Plugin does not implement onPipeline" }, { status: 400 });
            }
            const res = await plugin.onPipeline(body.context || {});
            return Response.json(res);
          }
          default:
            return Response.json({ error: `Unknown hook: ${hook}` }, { status: 400 });
        }
      } catch (err: any) {
        return Response.json({ success: false, error: err?.message || String(err) }, { status: 500 });
      }
    },
  },
];
