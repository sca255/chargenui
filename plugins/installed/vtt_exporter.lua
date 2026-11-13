-- @id: lua_vtt_exporter_sample
-- @name: Lua Custom VTT Exporter
-- @type: exporter
-- @version: 1.0.0
-- @description: Formats character into a custom lightweight Lua VTT entity structure.
-- @author: Community

local plugin = {}

function plugin.onExport(args)
  local char = args.character or {}
  local name = char.name or "Unnamed"
  local desc = char.description or ""
  
  local exported = {
    vtt_version = "lua_vtt_1.0",
    name = name,
    token_name = name:upper(),
    bio = desc:sub(1, 250),
    tags = char.tags or {}
  }
  return exported
end

return plugin
