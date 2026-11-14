import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

export interface EraDefinition {
  id: string;
  name: string;
  short_name: string;
  span: string;
  category: string;
  region: string;
  aesthetic: string;
  tech: string;
  social_codes: string;
  names?: string[];
  titles?: string[];
  tags?: string[];
  is_user_era?: boolean;
  is_extension?: boolean;
  relevance_score?: number;
  created_at?: number;
  /** Content rating flag: true marks dark fantasy, extreme, taboo or NSFL themes */
  nsfl?: boolean;
  /** Granular content tier: defaults to vanilla or mature */
  rating?: "vanilla" | "mature" | "nsfl";
}

const BUILTIN_ERAS_PATH = path.join(import.meta.dir, "eras_data.json");
const ERAS_DB_PATH = path.join(process.cwd(), "data", "eras_db.json");
const USER_ERAS_PATH = path.join(process.cwd(), "data", "user_eras.json");

/**
 * Resolves the OS-specific external user data directory for private era extensions:
 * - Linux / Unix: ~/.local/share/chargen/eras_extensions (or $XDG_DATA_HOME/chargen/eras_extensions)
 * - Windows: %APPDATA%\CharGen\eras_extensions (or ~\\AppData\\Roaming\\CharGen\\eras_extensions)
 */
export function getExternalUserExtensionDir(): string {
  const isWindows = process.platform === "win32" || Boolean(process.env.APPDATA);
  if (isWindows) {
    const appData = process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming");
    return path.join(appData, "CharGen", "eras_extensions");
  } else {
    const xdgData = process.env.XDG_DATA_HOME || path.join(os.homedir(), ".local", "share");
    return path.join(xdgData, "chargen", "eras_extensions");
  }
}

export function getPrimaryExtensionDir(targetDirType?: "local_user" | "project_data" | string): string {
  if (targetDirType === "local_user" || targetDirType === "user" || targetDirType === "external") {
    return getExternalUserExtensionDir();
  }
  return path.join(process.cwd(), "data", "eras_extensions");
}

export function getAllExtensionDirs(): string[] {
  const userExtDir = getExternalUserExtensionDir();
  return [
    path.join(process.cwd(), "data", "eras_extensions"),
    userExtDir,
    path.join(process.cwd(), "idea_generator", "eras_extensions"),
    path.join(process.cwd(), "eras_extensions"),
  ];
}

const EXTENSION_DIRS = getAllExtensionDirs();

// Cache for built-in eras
let builtinErasCache: Record<string, EraDefinition> | null = null;

function loadBuiltinEras(): Record<string, EraDefinition> {
  if (builtinErasCache) return builtinErasCache;
  try {
    const targetPath = fs.existsSync(ERAS_DB_PATH) ? ERAS_DB_PATH : BUILTIN_ERAS_PATH;
    if (fs.existsSync(targetPath)) {
      const raw = fs.readFileSync(targetPath, "utf-8");
      builtinErasCache = JSON.parse(raw);
      return builtinErasCache!;
    }
  } catch (err) {
    console.error("Failed to load eras database from eras_db.json / eras_data.json:", err);
  }
  return {};
}

/**
 * Loads modular extension eras from JSON files placed in:
 * - data/eras_extensions/*.json
 * - idea_generator/eras_extensions/*.json
 *
 * Each JSON file can contain:
 * 1. A map: { "era_id": { ...era_fields... } }
 * 2. An array: [ { "id": "era_id", ... }, ... ]
 * 3. A single era object: { "id": "era_id", ... }
 */
export function loadExtensionEras(): Record<string, EraDefinition> {
  const extensionEras: Record<string, EraDefinition> = {};
  for (const dir of EXTENSION_DIRS) {
    try {
      if (!fs.existsSync(dir)) continue;
      const files = fs.readdirSync(dir);
      for (const file of files) {
        if (!file.endsWith(".json")) continue;
        const filePath = path.join(dir, file);
        try {
          const raw = fs.readFileSync(filePath, "utf-8");
          if (!raw.trim()) continue;
          const parsed = JSON.parse(raw);

          const registerEra = (item: any, fallbackKey?: string) => {
            if (!item || typeof item !== "object") return;
            const rawId = item.id || fallbackKey || (item.name ? item.name.toLowerCase().replace(/[^a-z0-9_]/g, "_") : null);
            if (!rawId) return;
            const id = String(rawId).trim();
            extensionEras[id] = {
              ...item,
              id,
              is_user_era: true,
              category: item.category || "Extension Eras",
            };
          };

          if (parsed && typeof parsed === "object" && "era_pair" in parsed && typeof parsed.era_pair === "object" && parsed.era_pair !== null) {
            for (const [k, v] of Object.entries(parsed.era_pair)) {
              registerEra(v, k);
            }
          } else if (Array.isArray(parsed)) {
            for (const item of parsed) {
              registerEra(item);
            }
          } else if (parsed && typeof parsed === "object") {
            if (parsed.id && (parsed.name || parsed.social_codes)) {
              // Single era object in file
              registerEra(parsed);
            } else {
              // Map of era_id -> era_object
              for (const [k, v] of Object.entries(parsed)) {
                registerEra(v, k);
              }
            }
          }
        } catch (err) {
          console.error(`Failed to parse era extension file ${filePath}:`, err);
        }
      }
    } catch (err) {
      console.error(`Failed to scan extension directory ${dir}:`, err);
    }
  }
  return extensionEras;
}

export function loadUserEras(): Record<string, EraDefinition> {
  try {
    if (fs.existsSync(USER_ERAS_PATH)) {
      const raw = fs.readFileSync(USER_ERAS_PATH, "utf-8");
      const parsed = JSON.parse(raw);
      const userEras: Record<string, EraDefinition> = {};
      for (const [k, v] of Object.entries(parsed)) {
        userEras[k] = {
          ...(v as EraDefinition),
          is_user_era: true,
          category: (v as EraDefinition).category || "User Eras",
        };
      }
      return userEras;
    }
  } catch (err) {
    console.error("Failed to read user_eras.json:", err);
  }
  return {};
}

export function saveUserEras(eras: Record<string, EraDefinition>): void {
  try {
    const dir = path.dirname(USER_ERAS_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(USER_ERAS_PATH, JSON.stringify(eras, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to save user_eras.json:", err);
    throw err;
  }
}

export function getAllEras(includeUser: boolean = true): Record<string, EraDefinition> {
  const builtins = loadBuiltinEras();
  if (!includeUser) return { ...builtins };
  const extensions = loadExtensionEras();
  const user = loadUserEras();
  return { ...builtins, ...extensions, ...user };
}

export function getEraCategories(includeUser: boolean = true): Array<{ name: string; count: number }> {
  const all = getAllEras(includeUser);
  const counts: Record<string, number> = {};
  for (const e of Object.values(all)) {
    const c = e.category || "Uncategorized";
    counts[c] = (counts[c] || 0) + 1;
  }
  return Object.entries(counts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

export function searchEraCategories(query: string = ""): Array<{ name: string; count: number }> {
  const cats = getEraCategories(true);
  const q = (query || "").trim().toLowerCase();
  if (!q) return cats;
  return cats.filter((c) => c.name.toLowerCase().includes(q));
}

export function getEraById(id: string, filterNsfl: boolean = false): EraDefinition | null {
  const all = getAllEras(true);
  const era = all[id] || null;
  if (era && filterNsfl && isEraNsfl(era)) {
    return null;
  }
  return era;
}

/**
 * Resolves an era definition from an ID, full name, short name, or partial search string.
 */
export function resolveEraInfo(identifier: string): EraDefinition | null {
  if (!identifier || identifier.trim() === "" || identifier.toLowerCase() === "off") {
    return null;
  }
  const all = getAllEras(true);
  const trimmed = identifier.trim();
  // 1. Direct ID match
  if (all[trimmed]) return all[trimmed];

  const lower = trimmed.toLowerCase();
  // 2. Direct exact name / short_name / id match
  for (const era of Object.values(all)) {
    if (
      era.id.toLowerCase() === lower ||
      era.name.toLowerCase() === lower ||
      (era.short_name && era.short_name.toLowerCase() === lower)
    ) {
      return era;
    }
  }

  // 3. Name prefix match disregarding paren date spans
  const cleanIdent = lower.replace(/\s*\([^)]*\)/g, "").trim();
  for (const era of Object.values(all)) {
    const cleanEraName = era.name.toLowerCase().replace(/\s*\([^)]*\)/g, "").trim();
    if (cleanEraName === cleanIdent || cleanEraName.startsWith(cleanIdent) || cleanIdent.startsWith(cleanEraName)) {
      return era;
    }
  }

  // 4. Substring search
  for (const era of Object.values(all)) {
    if (era.name.toLowerCase().includes(lower) || lower.includes(era.name.toLowerCase())) {
      return era;
    }
  }

  return null;
}

/**
 * Formats the exact LLM prompt directive snippet for an era.
 */
export function formatEraPromptSnippet(eraInput: EraDefinition | string): string {
  let era: EraDefinition | null = typeof eraInput === "object" ? eraInput : resolveEraInfo(eraInput);
  if (!era) {
    const rawText = typeof eraInput === "string" ? eraInput.trim() : "";
    if (!rawText || rawText.toLowerCase() === "off") return "";
    return `HISTORICAL ERA / SETTING & TEMPORAL CONSTRAINTS:\n"""\n${rawText}\n"""\n(CRITICAL MANDATE: Ground background, dialect, sensory details, and technology strictly within this era constraints. STRICTLY FORBID anachronisms unless explicitly called for.)`;
  }

  return `HISTORICAL ERA / SETTING & TEMPORAL CONSTRAINTS: ${era.name} (${era.span})\n• Category & Region: ${era.category} | ${era.region}\n• Aesthetic & Material Culture: ${era.aesthetic}\n• Tech / Material Limitations: ${era.tech}\n• Social Codes & Hierarchy: ${era.social_codes}\n(CRITICAL MANDATE: Ground background, dialect, sensory details, and technology strictly within this era constraints. STRICTLY FORBID anachronisms unless explicitly called for.)`;
}

export function createUserEra(eraData: Partial<EraDefinition>): EraDefinition {
  const userEras = loadUserEras();
  const rawId = (eraData.id || eraData.name || `user_era_${Date.now()}`)
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/^_+|_+$/g, "");
  const id = rawId.startsWith("user_") ? rawId : `user_${rawId}`;

  const newEra: EraDefinition = {
    id,
    name: eraData.name || "Custom Era",
    short_name: eraData.short_name || eraData.name || "Custom Era",
    span: eraData.span || "Custom Epoch",
    category: "User Eras",
    region: eraData.region || "Global",
    aesthetic: eraData.aesthetic || "User-defined historical aesthetics and styling.",
    tech: eraData.tech || "User-defined technological limitations.",
    social_codes: eraData.social_codes || "User-defined social codes and hierarchies.",
    names: Array.isArray(eraData.names) ? eraData.names : [],
    titles: Array.isArray(eraData.titles) ? eraData.titles : [],
    tags: Array.isArray(eraData.tags) ? eraData.tags : ["User Template"],
    is_user_era: true,
    created_at: Date.now(),
  };

  userEras[id] = newEra;
  saveUserEras(userEras);
  return newEra;
}

export function deleteUserEra(id: string): boolean {
  const userEras = loadUserEras();
  if (userEras[id]) {
    delete userEras[id];
    saveUserEras(userEras);
    return true;
  }
  return false;
}

// ==========================================
// SEMANTIC SEARCH ENGINE & CONCEPT DICTIONARY
// ==========================================

const STEMS: Record<string, string> = {
  knights: "knight",
  castles: "castle",
  swords: "sword",
  samurais: "samurai",
  vikings: "viking",
  pirates: "pirate",
  pharaohs: "pharaoh",
  pyramids: "pyramid",
  chivalry: "chivalr",
  chivalric: "chivalr",
  feudalism: "feudal",
  empires: "empire",
  dynasties: "dynasty",
  crusades: "crusad",
  crusaders: "crusad",
  temples: "temple",
  clans: "clan",
  dragons: "dragon",
  monks: "monk",
  monasteries: "monaster",
  revolutions: "revolut",
  battles: "battle",
  wars: "war",
  "wars of": "war",
  shogunate: "shogun",
  barons: "baron",
  dukes: "duke",
  kings: "king",
};

const SEMANTIC_CONCEPT_MAP: Record<string, string[]> = {
  knight: ["chivalr", "lance", "tournament", "armor", "armour", "squire", "heraldry", "vassal", "feudal", "joust", "castle", "sword"],
  castle: ["keep", "fortress", "citadel", "bailey", "medieval", "feudal", "stone", "rampart", "moat", "tower", "castellan"],
  samurai: ["bushido", "katana", "shogun", "daimyo", "sengoku", "kamakura", "ronin", "edo", "japan", "kyoto", "armor", "honor"],
  ninja: ["shinobi", "stealth", "sengoku", "assassin", "japan", "shadow", "shuriken"],
  pyramid: ["pharaoh", "nile", "egypt", "monument", "hieroglyph", "tomb", "cairo", "giza", "mummy", "sand"],
  desert: ["sand", "oasis", "dune", "caravan", "sultanate", "caliphate", "cairo", "bedouin", "sahara", "mamluk", "arabia"],
  viking: ["norse", "longship", "danelaw", "scandinavia", "fjord", "valhalla", "shieldmaiden", "jarl", "runestone", "axe"],
  pirate: ["buccaneer", "galleon", "caribbean", "cutlass", "sail", "privateer", "corsair", "plunder", "black flag", "flintlock"],
  noir: ["detective", "fedora", "speakeasy", "trenchcoat", "gangster", "prohibition", "jazz", "smoke", "dame", "hardboiled"],
  magic: ["arcane", "spire", "enchant", "wizard", "sorcer", "dragon", "fae", "elven", "ley-line", "mythic", "crystal"],
  fantasy: ["arcane", "spire", "enchant", "wizard", "dragon", "fae", "elven", "ley-line", "mythic", "timeless"],
  witch: ["alchemy", "inquisition", "heresy", "sorcer", "occult", "coven", "potions", "grimoire"],
  crusade: ["crusad", "jerusalem", "templar", "hospitaller", "saladin", "holy land", "levant", "outremer", "faith", "teutonic"],
  "dark ages": ["early medieval", "anglo-saxon", "danelaw", "kievan rus", "migration", "barbarian", "viking"],
  "middle ages": ["medieval", "feudal", "chivalr", "crusad", "knight", "castle", "cathedral", "manor", "serf"],
  "wild west": ["frontier", "cowboy", "saloon", "outlaw", "sheriff", "revolver", "colt", "stagecoach", "gold rush", "boomtown"],
  western: ["frontier", "cowboy", "saloon", "outlaw", "sheriff", "revolver", "colt", "stagecoach", "gold rush"],
  cowboy: ["frontier", "wild west", "saloon", "outlaw", "sheriff", "revolver", "colt", "ranch", "horse"],
  steampunk: ["steam", "brass", "cogs", "clockwork", "victorian", "gaslamp", "industrial", "airship", "smog"],
  victorian: ["gaslamp", "smog", "steam", "corset", "crinoline", "top hat", "industrial", "london", "dickensian", "parlor"],
  gladiator: ["colosseum", "arena", "rome", "roman", "caesar", "senate", "centurion", "legion", "latin"],
  rome: ["caesar", "senate", "centurion", "legion", "gladiator", "colosseum", "roman", "aqueduct", "toga", "patrician"],
  greece: ["athens", "sparta", "philosophy", "hoplite", "olympus", "agora", "parthenon", "hellenic", "acropolis"],
  england: ["plantagenet", "tudor", "anglo-saxon", "victorian", "london", "chivalr", "parliament", "britain", "english"],
  english: ["plantagenet", "tudor", "anglo-saxon", "victorian", "london", "chivalr", "parliament", "britain"],
  france: ["capetian", "valois", "hundred years", "versailles", "bourbon", "parisian", "fleur-de-lis", "troubadour", "occitan"],
  french: ["capetian", "valois", "hundred years", "versailles", "bourbon", "parisian", "fleur-de-lis", "troubadour", "occitan"],
  germany: ["holy roman empire", "hre", "baron", "teutonic", "hanseatic", "weimar", "german", "prussia"],
  german: ["holy roman empire", "hre", "baron", "teutonic", "hanseatic", "weimar", "prussia"],
  italy: ["renaissance", "florence", "venice", "rome", "sicily", "medici", "doge", "norman sicily", "italian"],
  italian: ["renaissance", "florence", "venice", "rome", "sicily", "medici", "doge", "norman sicily"],
  spain: ["castile", "reconquista", "al-andalus", "cordoba", "granada", "el cid", "flamenco", "spanish"],
  spanish: ["castile", "reconquista", "al-andalus", "cordoba", "granada", "el cid", "spanish"],
  japan: ["heian", "kamakura", "sengoku", "edo", "meiji", "samurai", "shogun", "kyoto", "tokyo", "kimono"],
  japanese: ["heian", "kamakura", "sengoku", "edo", "meiji", "samurai", "shogun", "kyoto", "tokyo", "kimono"],
  china: ["han", "tang", "song", "ming", "qing", "dynasty", "beijing", "forbidden city", "silk", "porcelain"],
  chinese: ["han", "tang", "song", "ming", "qing", "dynasty", "beijing", "forbidden city", "silk", "porcelain"],
  korea: ["goryeo", "joseon", "silla", "hangul", "celadon", "hanbok", "seoul", "korean"],
  korean: ["goryeo", "joseon", "silla", "hangul", "celadon", "hanbok", "seoul"],
  india: ["delhi sultanate", "chola", "mughal", "maurya", "ashoka", "rajasthan", "sanskrit", "indian"],
  indian: ["delhi sultanate", "chola", "mughal", "maurya", "ashoka", "rajasthan", "sanskrit"],
  russia: ["rus", "novgorod", "kiev", "moscow", "tsar", "boyar", "slavic", "kremlin", "steppe", "russian"],
  russian: ["rus", "novgorod", "kiev", "moscow", "tsar", "boyar", "slavic", "kremlin", "steppe"],
  slavic: ["rus", "novgorod", "bohemia", "poland", "lithuania", "prague", "boyar", "tsar", "kiev"],
  byzantine: ["constantinople", "byzantium", "komnenian", "palaiologan", "orthodox", "basileus", "hagiasophia"],
  constantinople: ["byzantine", "byzantium", "komnenian", "palaiologan", "orthodox", "basileus", "istanbul"],
  ottoman: ["suleiman", "topkapi", "janissary", "porte", "istanbul", "divan", "pasha", "sultan", "turkey"],
  persia: ["achaemenid", "safavid", "isfahan", "shiraz", "cyrus", "shah", "persian", "iran"],
  persian: ["achaemenid", "safavid", "isfahan", "shiraz", "cyrus", "shah", "iran"],
  aztec: ["tenochtitlan", "mexica", "mesoamerica", "nahuatl", "pyramid", "sun stone", "obsidian", "mexico"],
  inca: ["cusco", "andes", "machu picchu", "sun road", "quechua", "quipu", "peru"],
  africa: ["mali", "timbuktu", "mansa musa", "solomonic", "ethiopia", "swahili", "kilwa", "african"],
  "cold war": ["espionage", "spies", "kgb", "cia", "berlin", "nuclear", "atomic", "1960s", "1970s", "iron curtain"],
  retro: ["neon", "cassette", "synth", "1980s", "arcade", "futurism", "vhs", "walkman"],
  grunge: ["flannel", "1990s", "y2k", "dial-up", "indie", "riot grrrl", "cd-rom"],
};

function parseSpanYears(spanStr: string): [number | null, number | null] {
  const isBce = spanStr.toLowerCase().includes("bce") || spanStr.toLowerCase().includes("bc");
  const nums = Array.from(spanStr.matchAll(/\b\d{1,4}\b/g)).map((m) => parseInt(m[0], 10));
  if (nums.length >= 2) {
    const start = nums[0];
    const end = nums[1];
    if (isBce) return [-start, -end];
    return [start, end];
  } else if (nums.length === 1) {
    return [nums[0], nums[0]];
  }
  return [null, null];
}

export function isEraNsfl(era: Partial<EraDefinition>): boolean {
  if (!era) return false;
  if (era.nsfl === true || era.rating === "nsfl") return true;
  const tags = (era.tags || []).map((t) => String(t).trim().toLowerCase());
  return tags.includes("nsfl") || tags.includes("extreme nsfl") || tags.includes("dark nsfl");
}

export function searchErasSemantic(
  query: string = "",
  categoryFilter: string = "All",
  regionFilter: string = "All",
  onlyUser: boolean = false,
  filterNsfl: boolean = true
): EraDefinition[] {
  const allEras = getAllEras(true);
  const qRaw = (query || "").trim().toLowerCase();

  const STOP_WORDS = new Set(["the", "and", "of", "in", "to", "a", "an", "at", "by", "for", "with", "from", "era", "age", "period", "century"]);
  const rawWords = qRaw
    .split(/\s+/)
    .map((w) => w.replace(/[^a-z0-9\-]/g, ""))
    .filter((w) => w.length > 1);

  let words = rawWords;
  if (rawWords.length > 1) {
    const filtered = rawWords.filter((w) => !STOP_WORDS.has(w));
    if (filtered.length > 0) words = filtered;
  }

  const targetStems = new Set<string>();
  const centuryRanges: [number, number][] = [];

  const centMatches = Array.from(qRaw.matchAll(/\b(\d{1,2})(?:st|nd|rd|th)\b/g));
  for (const match of centMatches) {
    const cNum = parseInt(match[1], 10);
    if (!isNaN(cNum) && cNum >= 1 && cNum <= 21) {
      centuryRanges.push([(cNum - 1) * 100, cNum * 100]);
    }
  }

  for (const w of rawWords) {
    const stemmed = STEMS[w] || w;
    if (!STOP_WORDS.has(w)) targetStems.add(stemmed);

    for (const [conceptKey, synonyms] of Object.entries(SEMANTIC_CONCEPT_MAP)) {
      if (stemmed === conceptKey || conceptKey.includes(stemmed) || stemmed.includes(conceptKey)) {
        synonyms.forEach((s) => targetStems.add(s));
      }
    }
  }

  const results: EraDefinition[] = [];

  for (const [eraId, era] of Object.entries(allEras)) {
    // When filterNsfl is enabled (default vanilla mode), completely skip NSFL eras
    if (filterNsfl && isEraNsfl(era)) {
      continue;
    }

    const isUser = !!era.is_user_era;
    const isExtension = !!era.is_extension;
    if (onlyUser && !isUser) continue;

    const cat = era.category || "";
    if (categoryFilter && !["All", "All Eras", ""].includes(categoryFilter)) {
      if (categoryFilter === "Extensions") {
        if (!isExtension) continue;
      } else if (categoryFilter === "User Eras") {
        if (!isUser && cat !== "User Eras") continue;
      } else if (cat.toLowerCase() !== categoryFilter.toLowerCase()) {
        continue;
      }
    }

    const reg = era.region || "";
    if (regionFilter && !["All", "All Regions", ""].includes(regionFilter)) {
      if (reg.toLowerCase() !== regionFilter.toLowerCase() && !reg.toLowerCase().includes(regionFilter.toLowerCase())) {
        continue;
      }
    }

    if (words.length === 0) {
      results.push({
        ...era,
        relevance_score: isUser ? 100 : 50,
      });
      continue;
    }

    let score = 0;
    const name = (era.name || "").toLowerCase();
    const short = (era.short_name || "").toLowerCase();
    const span = (era.span || "").toLowerCase();
    const catLower = cat.toLowerCase();
    const regLower = reg.toLowerCase();
    const tagsStr = (era.tags || []).join(" ").toLowerCase();
    const aesthetic = (era.aesthetic || "").toLowerCase();
    const tech = (era.tech || "").toLowerCase();
    const social = (era.social_codes || "").toLowerCase();
    const titlesStr = (era.titles || []).join(" ").toLowerCase();
    const namesStr = (era.names || []).join(" ").toLowerCase();

    // Exact ID or name match bonus
    if (qRaw === eraId.toLowerCase() || qRaw === short) {
      score += 200;
    } else if (name.includes(qRaw)) {
      score += 120;
    }

    for (const w of words) {
      if (name.includes(w)) score += 55;
      if (short.includes(w)) score += 45;
      if (catLower.includes(w)) score += 35;
      if (regLower.includes(w)) score += 35;
      if (tagsStr.includes(w)) score += 30;
      if (span.includes(w)) score += 30;
      if (titlesStr.includes(w) || namesStr.includes(w)) score += 20;
      if (aesthetic.includes(w)) score += 15;
      if (tech.includes(w)) score += 15;
      if (social.includes(w)) score += 15;
    }

    for (const stem of targetStems) {
      if (name.includes(stem)) score += 45;
      if (short.includes(stem)) score += 35;
      if (tagsStr.includes(stem)) score += 25;
      if (catLower.includes(stem) || regLower.includes(stem)) score += 20;
      if (span.includes(stem)) score += 25;
      if (titlesStr.includes(stem) || namesStr.includes(stem)) score += 15;
      if (aesthetic.includes(stem)) score += 12;
      if (tech.includes(stem)) score += 12;
      if (social.includes(stem)) score += 12;
    }

    if (centuryRanges.length > 0) {
      const [sYr, eYr] = parseSpanYears(span);
      if (sYr !== null && eYr !== null) {
        for (const [cStart, cEnd] of centuryRanges) {
          if (Math.max(sYr, cStart) <= Math.min(eYr, cEnd)) {
            score += 160;
          }
        }
      }
    }

    if (score > 0) {
      results.push({
        ...era,
        relevance_score: score,
      });
    }
  }

  results.sort((a, b) => (b.relevance_score || 0) - (a.relevance_score || 0));
  return results;
}

// ============================================================================
// Extension Files Management & 5-Pillars Compliance Linter
// ============================================================================

export interface ExtensionFileInfo {
  filename: string;
  filePath: string;
  sizeBytes: number;
  eraCount: number;
  eras: { id: string; name: string; short_name?: string; category?: string }[];
  isExternalUser?: boolean;
}

export interface EraPillarsAudit {
  dualFormat: boolean;
  settingDepth: boolean;
  socialStructure: boolean;
  contentRichness: boolean;
  zeroIntruder?: boolean;
  nonRoyalMaster?: boolean;
  panSpeciesBrides?: boolean;
  domesticOrder?: boolean;
}

export interface EraComplianceReport {
  eraId: string;
  eraName: string;
  compliant: boolean;
  score: number; // 0 - 100
  pillars: EraPillarsAudit;
  issues: string[];
  warnings: string[];
  strengths: string[];
}

/**
 * Lists all JSON files present in extension directories (both data/eras_extensions and external user dir).
 */
export function listExtensionFiles(): ExtensionFileInfo[] {
  const targetDirs = [
    { dir: EXTENSION_DIRS[0], isExternal: false },
    { dir: getExternalUserExtensionDir(), isExternal: true },
  ];

  const results: ExtensionFileInfo[] = [];
  const seenFiles = new Set<string>();

  for (const { dir, isExternal } of targetDirs) {
    if (!fs.existsSync(dir)) {
      try {
        fs.mkdirSync(dir, { recursive: true });
      } catch (e) {
        continue;
      }
    }

    try {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        if (!file.endsWith(".json")) continue;
        const filePath = path.join(dir, file);
        if (seenFiles.has(filePath)) continue;
        seenFiles.add(filePath);

        try {
          const stats = fs.statSync(filePath);
          const raw = fs.readFileSync(filePath, "utf-8");
          if (!raw.trim()) continue;
          const parsed = JSON.parse(raw);
          const eraList: { id: string; name: string; short_name?: string; category?: string }[] = [];

          const extractMeta = (item: any, fallbackKey?: string) => {
            if (!item || typeof item !== "object") return;
            const id = item.id || fallbackKey || (item.name ? item.name.toLowerCase().replace(/[^a-z0-9_]/g, "_") : "unknown");
            eraList.push({
              id: String(id),
              name: item.name || id,
              short_name: item.short_name,
              category: item.category,
            });
          };

          if (Array.isArray(parsed)) {
            for (const item of parsed) extractMeta(item);
          } else if (parsed && typeof parsed === "object") {
            if (parsed.era_pair && typeof parsed.era_pair === "object") {
              for (const [k, v] of Object.entries(parsed.era_pair)) {
                extractMeta(v, k);
              }
            } else if (parsed.id && (parsed.name || parsed.social_codes)) {
              extractMeta(parsed);
            } else {
              for (const [k, v] of Object.entries(parsed)) {
                extractMeta(v, k);
              }
            }
          }

          results.push({
            filename: file,
            filePath,
            sizeBytes: stats.size,
            eraCount: eraList.length,
            eras: eraList,
            isExternalUser: isExternal,
          });
        } catch (err) {
          console.warn(`Failed reading extension file ${file} in ${dir}:`, err);
        }
      }
    } catch (err) {
      console.error(`Failed to list extension directory ${dir}:`, err);
    }
  }

  return results;
}

/**
 * Saves a dictionary or array of era definitions into an extension file.
 * destination: "project_data" (default, data/eras_extensions) or "local_user" (.local on Linux / AppData on Windows).
 */
export function saveExtensionFile(
  filename: string,
  content: Record<string, any> | any[],
  destination: "project_data" | "local_user" | string = "project_data"
): { success: boolean; filePath: string; count: number; destination: string } {
  let cleanName = filename.trim().replace(/[^a-zA-Z0-9_\-\.]/g, "_");
  if (!cleanName.endsWith(".json")) cleanName += ".json";

  const targetDir = getPrimaryExtensionDir(destination);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const filePath = path.join(targetDir, cleanName);
  let count = 0;

  if (Array.isArray(content)) {
    count = content.length;
  } else if (content && typeof content === "object") {
    count = Object.keys(content).length;
  }

  fs.writeFileSync(filePath, JSON.stringify(content, null, 2), "utf-8");

  // Invalidate any active cache so future queries hot-load the new extension immediately
  builtinErasCache = null;

  return { success: true, filePath, count, destination: destination === "local_user" ? "local_user" : "project_data" };
}

/**
 * Deletes an extension file from target destination or searches both.
 */
export function deleteExtensionFile(filename: string, destination?: string): boolean {
  const cleanName = path.basename(filename.trim());
  const dirsToCheck = destination
    ? [getPrimaryExtensionDir(destination)]
    : [EXTENSION_DIRS[0], getExternalUserExtensionDir()];

  for (const dir of dirsToCheck) {
    const filePath = path.join(dir, cleanName);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      builtinErasCache = null;
      return true;
    }
  }
  return false;
}

/**
 * 5-Pillars Compliance Linter for an Era Definition.
 * Audits against the worldbuilding rules specified in ERA_AUTHORING_SPEC.md:
 * 1. Dual-Format Requirement (Paired Polygyny / Monogamy)
 * 2. Strict Zero-Intruder Directive (Absolute Domestic Privacy)
 * 3. Non-Royal Autonomous Master (No Unwanted Monarchs)
 * 4. Pan-Species Bride Integration (Elves, Humans, Demi-Humans as wedded wives)
 * 5. Traditional Patriarchal Order & Loving Authority
 */
export function validateEraCompliance(
  era: EraDefinition | any,
  pairEra?: EraDefinition | any
): EraComplianceReport {
  const issues: string[] = [];
  const warnings: string[] = [];
  const strengths: string[] = [];

  const name = String(era?.name || "").toLowerCase();
  const shortName = String(era?.short_name || "").toLowerCase();
  const id = String(era?.id || "").toLowerCase();
  const social = String(era?.social_codes || "").toLowerCase();
  const tags: string[] = (Array.isArray(era?.tags) ? era.tags : []).map((t: any) => String(t).toLowerCase());
  const titles: string[] = (Array.isArray(era?.titles) ? era.titles : []).map((t: any) => String(t).toLowerCase());
  const names = Array.isArray(era?.names) ? era.names : [];
  const aesthetic = String(era?.aesthetic || "");
  const tech = String(era?.tech || "");

  // Quality Check 1: Dual-Format (Paired Setting Set)
  let dualFormat = false;
  const isPolygyny = id.includes("polygyny") || id.includes("multi_wife") || name.includes("multi-wife") || shortName.includes("multi-wife") || name.includes("multi-partner") || tags.some(t => t.includes("polygyny") || t.includes("multi-wife") || t.includes("multi-partner"));
  const isMonogamy = id.includes("monogamy") || id.includes("sole_bride") || name.includes("sole-bride") || name.includes("sole bride") || shortName.includes("sole bride") || name.includes("sole-partner") || tags.some(t => t.includes("monogamy") || t.includes("sole-bride") || t.includes("sole partner") || t.includes("single wife"));

  if (pairEra) {
    const pairName = String(pairEra?.name || "").toLowerCase();
    const pairId = String(pairEra?.id || "").toLowerCase();
    const pairIsPoly = pairId.includes("polygyny") || pairName.includes("multi-wife") || pairName.includes("multi-partner");
    const pairIsMono = pairId.includes("monogamy") || pairName.includes("sole bride") || pairName.includes("sole-bride") || pairName.includes("sole partner");
    if ((isPolygyny && pairIsMono) || (isMonogamy && pairIsPoly)) {
      dualFormat = true;
      strengths.push("Verified complete paired set (Multi-Partner + Sole Partner).");
    }
  } else if (isPolygyny || isMonogamy) {
    dualFormat = true;
    strengths.push(`Clearly identified variant mode: ${isPolygyny ? "Multi-Partner (Polygyny)" : "Sole Partner (Monogamy)"}.`);
  } else {
    warnings.push("Era does not explicitly identify whether it is a Multi-Partner (Polygyny) or Sole Partner (Monogamy) version in title, short_name, or tags.");
  }

  // Quality Check 2: Setting Atmosphere & World Depth
  let settingDepth = true;
  if (aesthetic.length >= 40) {
    strengths.push("Rich sensory aesthetics and environmental atmosphere established.");
  } else {
    warnings.push("Aesthetic sensory visuals are brief; elaborate on sensory atmosphere and textures.");
    settingDepth = false;
  }
  if (tech.length >= 25) {
    strengths.push("World technology / magical systems / mechanics detailed.");
  } else if (tech.length > 0) {
    warnings.push("Tech / Enchantment description is brief; mention world crafts or mechanics.");
  }

  // Quality Check 3: Social Codes & Relationship Dynamics
  let socialStructure = true;
  if (social.length >= 80) {
    strengths.push("Clear cultural etiquette, social hierarchy, and interpersonal dynamics established.");
  } else {
    issues.push("Social codes paragraph is too brief to define relationship dynamics and world rules.");
    socialStructure = false;
  }

  // Optional Theme Highlights (Acknowledge user-requested elements without rigid penalties)
  const hasSeclusion = social.includes("secluded") || social.includes("sanctuary") || social.includes("private") || social.includes("isolation") || social.includes("zero guard") || tags.some(t => t.includes("seclusion") || t.includes("zero guard"));
  if (hasSeclusion) {
    strengths.push("High-privacy secluded sanctuary dynamic detected.");
  }

  const hasDomesticDiscipline = ["discipline", "knee", "lap", "headship"].some(k => social.includes(k));
  if (hasDomesticDiscipline) {
    strengths.push("Traditional domestic headship dynamic detected.");
  }

  const hasRoyalHierarchy = ["emperor", "king", "court", "throne", "imperial", "monarch"].some(k => name.includes(k) || social.includes(k));
  if (hasRoyalHierarchy) {
    strengths.push("Grand royal / imperial court hierarchy established.");
  }

  const hasAutonomousRole = ["freeholder", "captain", "artisan", "smith", "homesteader"].some(k => social.includes(k) || tags.some(t => t.includes(k)));
  if (hasAutonomousRole) {
    strengths.push("Autonomous sovereign roleplay established.");
  }

  const hasMultiSpecies = ["elf", "beastfolk", "kitsune", "demi", "draconic"].some(k => social.includes(k) || titles.some(t => t.includes(k)));
  if (hasMultiSpecies) {
    strengths.push("Multi-species integration confirmed.");
  }

  // Quality Check 4: Content Richness & Name Pools
  let contentRichness = true;
  if (names.length < 8) {
    warnings.push(`Name pool has ${names.length} names (recommended: 12+).`);
    contentRichness = false;
  } else {
    strengths.push(`Diverse name pool populated (${names.length} names).`);
  }

  if (titles.length < 4) {
    warnings.push(`Titles list has ${titles.length} archetypes (recommended: 6+).`);
    contentRichness = false;
  } else {
    strengths.push(`Companion archetype titles provided (${titles.length} titles).`);
  }

  if (tags.length < 4) {
    warnings.push(`Tags list has ${tags.length} entries (recommended: 6+).`);
    contentRichness = false;
  }

  // Calculate Score (0-100)
  let score = 100;
  score -= issues.length * 20;
  score -= warnings.length * 5;
  if (score < 0) score = 0;

  const compliant = issues.length === 0;

  return {
    eraId: String(era?.id || "unnamed"),
    eraName: String(era?.name || "Unnamed Era"),
    compliant,
    score,
    pillars: {
      dualFormat,
      settingDepth,
      socialStructure,
      contentRichness,
      zeroIntruder: settingDepth,
      nonRoyalMaster: socialStructure,
      panSpeciesBrides: contentRichness,
      domesticOrder: socialStructure,
    },
    issues,
    warnings,
    strengths,
  };
}
