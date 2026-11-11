-- Embedded JSON encoder/decoder helper for Lua plugin execution
local json = {}

local function escape_str(s)
  local map = {
    ["\\"] = "\\\\",
    ['"'] = '\\"',
    ["\b"] = "\\b",
    ["\f"] = "\\f",
    ["\n"] = "\\n",
    ["\r"] = "\\r",
    ["\t"] = "\\t"
  }
  return s:gsub('[\\"%z\1-\31]', map)
end

function json.encode(v)
  local t = type(v)
  if t == "nil" then return "null"
  elseif t == "boolean" then return tostring(v)
  elseif t == "number" then return tostring(v)
  elseif t == "string" then return '"' .. escape_str(v) .. '"'
  elseif t == "table" then
    local is_arr = true
    local max = 0
    local n = 0
    for k in pairs(v) do
      n = n + 1
      if type(k) ~= "number" or k <= 0 or math.floor(k) ~= k then
        is_arr = false
        break
      end
      if k > max then max = k end
    end
    if is_arr and max == n then
      local parts = {}
      for i = 1, max do table.insert(parts, json.encode(v[i])) end
      return "[" .. table.concat(parts, ",") .. "]"
    else
      local parts = {}
      for k, val in pairs(v) do
        table.insert(parts, '"' .. escape_str(tostring(k)) .. '":' .. json.encode(val))
      end
      return "{" .. table.concat(parts, ",") .. "}"
    end
  end
  return "null"
end

local function skip_ws(str, pos)
  local p = str:find("[^ \t\r\n]", pos)
  return p or (#str + 1)
end

local parse_val
local function parse_str(str, pos)
  local end_q = str:find('"', pos + 1)
  if not end_q then return "", pos + 1 end
  return str:sub(pos + 1, end_q - 1), end_q + 1
end

local function parse_obj(str, pos)
  local res = {}
  pos = pos + 1
  while true do
    pos = skip_ws(str, pos)
    if str:sub(pos, pos) == "}" then return res, pos + 1 end
    local k; k, pos = parse_val(str, pos)
    pos = skip_ws(str, pos)
    if str:sub(pos, pos) == ":" then pos = pos + 1 end
    pos = skip_ws(str, pos)
    local v; v, pos = parse_val(str, pos)
    res[k] = v
    pos = skip_ws(str, pos)
    local c = str:sub(pos, pos)
    if c == "," then pos = pos + 1
    elseif c == "}" then return res, pos + 1
    else break end
  end
  return res, pos
end

local function parse_arr(str, pos)
  local res = {}
  pos = pos + 1
  while true do
    pos = skip_ws(str, pos)
    if str:sub(pos, pos) == "]" then return res, pos + 1 end
    local v; v, pos = parse_val(str, pos)
    table.insert(res, v)
    pos = skip_ws(str, pos)
    local c = str:sub(pos, pos)
    if c == "," then pos = pos + 1
    elseif c == "]" then return res, pos + 1
    else break end
  end
  return res, pos
end

function parse_val(str, pos)
  pos = skip_ws(str, pos)
  local c = str:sub(pos, pos)
  if c == "{" then return parse_obj(str, pos)
  elseif c == "[" then return parse_arr(str, pos)
  elseif c == '"' then return parse_str(str, pos)
  elseif str:sub(pos, pos + 3) == "true" then return true, pos + 4
  elseif str:sub(pos, pos + 4) == "false" then return false, pos + 5
  elseif str:sub(pos, pos + 3) == "null" then return nil, pos + 4
  else
    local num_str, end_p = str:match("^(-?%d+%.?%d*)()", pos)
    if num_str then return tonumber(num_str), end_p end
    return nil, pos + 1
  end
end

function json.decode(str)
  return (parse_val(str, 1))
end

-- Main runner logic
local input_raw = io.read("*a")
local input_data = json.decode(input_raw) or {}
local hook_name = arg[1] or input_data.hook
local plugin_path = arg[2]

if not plugin_path then
  print(json.encode({ success = false, error = "No plugin path provided as argument." }))
  os.exit(1)
end

local plugin_chunk, load_err = loadfile(plugin_path)
if not plugin_chunk then
  print(json.encode({ success = false, error = "Failed to load Lua plugin: " .. tostring(load_err) }))
  os.exit(1)
end

local plugin = plugin_chunk()
if type(plugin) ~= "table" or type(plugin[hook_name]) ~= "function" then
  print(json.encode({ success = false, error = "Hook '" .. tostring(hook_name) .. "' not found in Lua plugin table." }))
  os.exit(0)
end

local status, ret = pcall(plugin[hook_name], input_data.args or {})
if not status then
  print(json.encode({ success = false, error = "Lua runtime error: " .. tostring(ret) }))
  os.exit(0)
end

print(json.encode({ success = true, data = ret }))
