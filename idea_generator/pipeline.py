#!/usr/bin/env python3
"""
Character Idea Suggestion Pipeline
Generates uncensored, psychometrically rich roleplay character pitches,
premises, psychometric spines, and opening scenarios using local LLMs (llama-server, Ollama, LM Studio).
Powered by the Advanced Psychometric Procedural Engine for instant offline concept synthesis.
"""

import sys
import json
import random
import re
import time
import threading
import requests
from pathlib import Path
from typing import Dict, Any, Optional, List, Callable, Tuple

# Ensure repository root and idea_generator are in sys.path
ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))
CURRENT_DIR = Path(__file__).resolve().parent
if str(CURRENT_DIR) not in sys.path:
    sys.path.insert(0, str(CURRENT_DIR))

try:
    from era_agent_harness import EraAgentHarness, EraHarnessError
except ImportError:
    from scripts.era_agent_harness import EraAgentHarness, EraHarnessError

# Import procedural engine
from procedural_engine import (
    HISTORICAL_ERAS,
    get_era_info
)

# LLM Generation Timeout (seconds) - 1800s (30 minutes) allows heavy local model prompt ingestion and multi-thousand token generation without premature timeouts
LLM_TIMEOUT = 1800
from eras_data import (
    validate_era_compliance,
    read_era_tool,
    list_eras_tool,
    search_eras_semantic,
    get_all_eras,
    save_extension_file
)

CONFIG_FILE = Path(__file__).parent / "config.json"

def load_config() -> Dict[str, Any]:
    default_cfg = {
        "endpoint_url": "http://localhost:5001/v1",
        "model_name": "",
        "default_temperature": 0.85,
        "default_genre": "Modern Domestic / Slice of Life",
        "default_dynamic": "Loving Marriage & Playful Tension",
        "default_intensity": "any",
        "chargen_url": "http://localhost:3333",
        "auto_check_connection": True
    }
    if CONFIG_FILE.exists():
        try:
            with open(CONFIG_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                default_cfg.update(data)
        except Exception:
            pass
    return default_cfg

def save_config(cfg: Dict[str, Any]):
    try:
        with open(CONFIG_FILE, "w", encoding="utf-8") as f:
            json.dump(cfg, f, indent=2, ensure_ascii=False)
    except Exception as e:
        print(f"[Pipeline] Failed to save config: {e}")


# =========================================================================
# SYSTEM INSTRUCTIONS & FOCUS MODES FROM PRESETS
# =========================================================================

from prompt_presets import (
    get_preset,
    get_base_system_prompt,
    get_natural_spoken_dialogue_contract,
    get_natural_language_system_instruction,
    get_agent_copilot_prompt,
    get_surgical_refinement_prompt,
    get_group_chat_cast_prompt,
    get_household_scene_prompt,
    get_focus_mode_instructions,
    get_dramatic_stakes_guidance,
    get_correction_tier_guidance,
    get_bot_mode_guidance,
    load_all_presets,
    get_active_preset_id,
    set_active_preset_id
)

# Backwards compatibility module aliases
NATURAL_SPOKEN_DIALOGUE_CONTRACT = get_natural_spoken_dialogue_contract()
BASE_SYSTEM_PROMPT = get_base_system_prompt()
FOCUS_MODE_INSTRUCTIONS = get_focus_mode_instructions()
DRAMATIC_STAKES_GUIDANCE = get_dramatic_stakes_guidance()
CORRECTION_TIER_GUIDANCE = get_correction_tier_guidance()
BOT_MODE_GUIDANCE = get_bot_mode_guidance()

def resolve_correction_guidance(tier: str, preset_id: Optional[str] = None) -> Tuple[str, str]:
    """
    Resolves the correction tier guidance text and the effective tier name.
    - 'off': no guidance prompt (empty string)
    - 'any:ai': no guidance prompt (empty string) - lets AI decide naturally without prompts
    - 'any:r': randomly picks one of mild, correction, heavy and sends that tier's guidance
    - 'mild' / 'correction' / 'heavy': sends the respective guidance
    """
    guidance_map = get_correction_tier_guidance(preset_id)
    t = (tier or "off").lower().strip()
    if t in ("any:r", "any_r", "any_random", "random"):
        effective_tier = random.choice(["mild", "correction", "heavy"])
        return guidance_map.get(effective_tier, ""), effective_tier
    if t in ("any:ai", "any_ai", "ai", "none"):
        return "", "any:ai"
    if t == "off":
        return "", "off"
    return guidance_map.get(t, ""), t

def get_era_prompt_guidance(era: str) -> str:
    """
    Returns rich prompt guidance for historical eras and timeless fantasy.
    - 'off': empty string (unconstrained)
    - 'timeless_fantasy': explicitly instructs the model to disregard earthly time and ground in mythic fantasy
    - historical era: provides dates, aesthetic, technological constraints, and social propriety rules
    """
    e = (era or "off").lower().strip()
    if e in ("off", "none", "", "disabled"):
        return ""
    if e in ("timeless_fantasy", "timeless", "fantasy_timeless"):
        return (
            "HISTORICAL ERA & TEMPORAL SETTING: Timeless High Fantasy (Achronological).\n"
            "- CRITICAL RULE: Disregard earthly centuries and chronological timelines entirely.\n"
            "- Ground the character, setting, and world in an eternal, mythic, or achronological fantasy realm.\n"
            "- Do not mention earthly historical dates, modern years, or human industrial eras.\n"
            "- Emphasize arcane academies, floating spires, ageless elven courts, enchanted groves, and mythic oaths."
        )
    info = get_era_info(era)
    if info:
        is_user = info.get("is_user_era", False)
        is_fantasy = info.get("category") == "Fantasy"
        if is_fantasy:
            prefix = "MYTHIC FANTASY REALM & ERA"
            rule_addon = "- CRITICAL TEMPORAL RULE: Disregard earthly centuries and human chronological timelines entirely. Ground the character, setting, and world in this mythic fantasy realm without modern or earthly references.\n"
        elif is_user:
            prefix = "CUSTOM ERA TEMPLATE"
            rule_addon = ""
        else:
            prefix = "HISTORICAL ERA & TIME SETTING"
            rule_addon = ""
        return (
            f"{prefix}: {info['name']} (Period/Span: {info.get('span', 'Setting Defined')})\n"
            f"{rule_addon}"
            f"- REGION / REALM: {info.get('region', 'Specified')}\n"
            f"- AESTHETIC & TEXTURE: {info.get('aesthetic', '')}\n"
            f"- TECHNOLOGY & MATERIAL LIMITS: {info.get('tech', '')}. STRICTLY FORBID anachronistic modern technology.\n"
            f"- SOCIAL CODES & ETIQUETTE: {info.get('social_codes', '')}."
        )
    return f"HISTORICAL ERA & SETTING: {era}."

INTENSITY_GUIDANCE = DRAMATIC_STAKES_GUIDANCE


# =========================================================================
# ADVANCED JSON REPAIR & RESCUE UTILITIES
# =========================================================================

def repair_and_decode_json(raw_text: str) -> Optional[Dict[str, Any]]:
    """
    Robust JSON parser specifically engineered to handle common local LLM quirks:
    - Markdown codeblock fences
    - Conversational preambles and postscripts
    - Trailing commas before brackets/braces
    - Unescaped literal newlines inside string values
    """
    if not raw_text or not raw_text.strip():
        return None

    text = raw_text.strip()

    # 1. Strip markdown code fences
    text = re.sub(r"^```(?:json)?\s*", "", text, flags=re.IGNORECASE)
    text = re.sub(r"\s*```$", "", text)

    # 2. Extract outermost JSON object {...}
    start = text.find("{")
    end = text.rfind("}")
    if start != -1 and end != -1 and end > start:
        text = text[start : end + 1]
    else:
        return None

    # 3. Remove trailing commas: [1, 2, ] or {"a": 1, }
    cleaned = re.sub(r",\s*([\}\]])", r"\1", text)

    def _is_valid_concept_dict(d: Any) -> bool:
        if not isinstance(d, dict):
            return False
        # Flat character format (Studio Forge & Natural Language prompt)
        if d.get("name") or d.get("premise"):
            return True
        # Agent response format (Conversational agent message + character dossier)
        if d.get("agent_message") or d.get("character"):
            return True
        return False

    # 4. Attempt standard json.loads
    try:
        data = json.loads(cleaned)
        if _is_valid_concept_dict(data):
            return data
    except Exception:
        pass

    # 5. Fix unescaped newlines inside strings using regex substitution
    try:
        def _escape_newlines(m):
            return m.group(0).replace("\n", "\\n").replace("\r", "\\r")

        sanitized = re.sub(r'"([^"\\]*(\\.[^"\\]*)*)"', _escape_newlines, cleaned)
        data = json.loads(sanitized)
        if _is_valid_concept_dict(data):
            return data
    except Exception:
        pass

    # 6. Rescue Parser Fallback: Extract individual fields via regex if syntax is partially broken
    rescued: Dict[str, Any] = {}
    for key in ["agent_message", "name", "title", "tagline", "archetype", "intensity", "central_contradiction", "vocal_idiolect", "premise", "brainstorm_notes"]:
        # Match standard closed string first
        m = re.search(rf'"{key}"\s*:\s*"((?:[^"\\]|\\.)*)"', text, re.DOTALL)
        if m:
            val = m.group(1).encode("utf-8").decode("unicode_escape", errors="ignore")
            rescued[key] = val
        else:
            # If JSON output was cut off mid-string at max_tokens limit, recover the partial text
            m_cut = re.search(rf'"{key}"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)(?:"|\Z)', text, re.DOTALL)
            if m_cut and m_cut.group(1).strip():
                val = m_cut.group(1).encode("utf-8").decode("unicode_escape", errors="ignore")
                rescued[key] = val.strip()

    # Rescue tags
    tags_match = re.search(r'"tags"\s*:\s*\[(.*?)\]', text, re.DOTALL)
    if tags_match:
        tag_items = re.findall(r'"([^"]+)"', tags_match.group(1))
        if tag_items:
            rescued["tags"] = tag_items

    # Rescue reaction gradient
    grad_match = re.search(r'"reaction_gradient"\s*:\s*\{(.*?)\}', text, re.DOTALL)
    if grad_match:
        grad_dict = {}
        for gkey in ["wont", "craves", "neutral", "will", "trust_gate"]:
            gm = re.search(rf'"{gkey}"\s*:\s*"((?:[^"\\]|\\.)*)"', grad_match.group(1), re.DOTALL)
            if gm:
                grad_dict[gkey] = gm.group(1).encode("utf-8").decode("unicode_escape", errors="ignore")
        if grad_dict:
            rescued["reaction_gradient"] = grad_dict

    if rescued.get("name") or rescued.get("agent_message"):
        return rescued

    return None


def get_dynamic_few_shot_exemplar(intensity: str) -> Optional[Dict[str, Any]]:
    """Selects an authentic handcrafted exemplar from MASTER_SEEDS to guide local LLMs."""
    intens = intensity.lower().strip()
    candidates = [s for s in MASTER_SEEDS if s.get("intensity") == intens]
    if not candidates:
        candidates = MASTER_SEEDS
    exemplar = random.choice(candidates)
    return {
        "name": exemplar["name"],
        "title": exemplar["title"],
        "tagline": exemplar["tagline"],
        "tags": exemplar["tags"],
        "archetype": exemplar["archetype"],
        "intensity": exemplar.get("intensity", "medium"),
        "central_contradiction": exemplar["central_contradiction"],
        "reaction_gradient": exemplar["reaction_gradient"],
        "vocal_idiolect": exemplar["vocal_idiolect"],
        "premise": exemplar["premise"]
    }


# =========================================================================
# ROLEPLAY MACRO NORMALIZATION ENGINE (SillyTavern / Lumiverse / CharGen)
# =========================================================================

def clean_mojibake(text: str) -> str:
    """Cleans common UTF-8 bytes misdecoded as Latin-1/Windows-1252 (e.g. â€™ -> ’)."""
    if not text:
        return ""
    replacements = {
        "â\x80\x99": "'",
        "â\x80\x98": "'",
        "â\x80\x9c": '"',
        "â\x80\x9d": '"',
        "â\x80\x94": "—",
        "â\x80\x93": "–",
        "â\x80\xa6": "...",
        "â\x80\xa2": "•",
        "â\x80\xb9": "‹",
        "â\x80\xba": "›",
        "â\x82\xac": "€",
        "Ã©": "é",
        "Ã¨": "è",
        "Ã ": "à",
        "Â": "",
    }
    for bad, good in replacements.items():
        text = text.replace(bad, good)
    return text

def normalize_rp_macros(text: str) -> str:
    """
    Normalizes single-brace and malformed roleplay macro variants ({user}, {char}, <user>, <char>)
    into standard double-brace SillyTavern / Lumiverse / CharGen UI macros: {{user}} and {{char}}.
    """
    if not text or not isinstance(text, str):
        return text if text is not None else ""

    # 1. Protect existing clean double-brace macros
    text = re.sub(r'\{\{\s*user\s*\}\}', '___RP_USER___', text, flags=re.IGNORECASE)
    text = re.sub(r'\{\{\s*(?:char|bot)\s*\}\}', '___RP_CHAR___', text, flags=re.IGNORECASE)

    # 2. Normalize single braces, angle brackets, and case variants
    text = re.sub(r'(?:<user>|\{user\}|<USER>|\{USER\}|<User>|\{User\})', '___RP_USER___', text)
    text = re.sub(r'(?:<char>|\{char\}|<CHAR>|\{CHAR\}|<Char>|\{Char\}|<bot>|\{bot\}|<BOT>|\{BOT\})', '___RP_CHAR___', text)

    # 3. Clean up any leftover extra braces like {___RP_USER___} or {{___RP_USER___}}
    text = re.sub(r'\{+___RP_USER___\}+', '___RP_USER___', text)
    text = re.sub(r'\{+___RP_CHAR___\}+', '___RP_CHAR___', text)

    # 4. Restore canonical double-brace macros
    text = text.replace('___RP_USER___', '{{user}}')
    text = text.replace('___RP_CHAR___', '{{char}}')

    return text


def _to_str(val: Any) -> str:
    """
    Safely coerces any value (string, dict, list, int, etc.) into a clean stripped string.
    Prevents AttributeError when local LLMs output nested dictionaries or lists for text fields.
    """
    if val is None:
        return ""
    if isinstance(val, str):
        return val.strip()
    if isinstance(val, dict):
        # Extract common name/text fields if present
        for k in ("name", "title", "text", "description", "content", "value", "summary"):
            if k in val and val[k]:
                return _to_str(val[k])
        # Otherwise join non-empty values
        items = [_to_str(v) for v in val.values() if v]
        return " ".join(items).strip()
    if isinstance(val, (list, tuple, set)):
        items = [_to_str(item) for item in val if item]
        return ", ".join(items).strip()
    return str(val).strip()


def normalize_concept_dict_macros(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Recursively scans and normalizes macros in all string values within a concept dictionary.
    """
    if not isinstance(data, dict):
        return data

    for k, v in list(data.items()):
        if isinstance(v, str):
            data[k] = normalize_rp_macros(v)
        elif isinstance(v, dict):
            data[k] = normalize_concept_dict_macros(v)
        elif isinstance(v, list):
            data[k] = [
                normalize_rp_macros(item) if isinstance(item, str)
                else normalize_concept_dict_macros(item) if isinstance(item, dict)
                else item
                for item in v
            ]

    return data


# =========================================================================
# SPECIES FIDELITY & CONCEPT SAUCE FORMATTING ENGINE
# =========================================================================

SPECIES_FIDELITY_RULES = [
    {
        "pattern": r"\b(?:high[- ]?)?elf\b|\belven\b|\belves\b",
        "species_name": "Elf",
        "sub_race": "High Elf",
        "genre": "Fantasy",
        "default_names": ["Faelyn Silverleaf", "Aerith Vaelen", "Illenor", "Sylas Nightstrider", "Elara Whisperwind"],
        "title_qualifier": "High-Elven",
        "biological_marker": "graceful pointed ears, acute senses, and centuries of sylvan heritage"
    },
    {
        "pattern": r"\bdrow\b|\bdark[- ]?elf\b",
        "species_name": "Drow",
        "sub_race": "Dark Elf",
        "genre": "Dark Fantasy",
        "default_names": ["Viconia DeVir", "Malice Do'Urden", "Zelena Nightshade", "Drizzel Shadowborn"],
        "title_qualifier": "Drow",
        "biological_marker": "obsidian skin, stark silver-white hair, pointed ears, and superior darkvision"
    },
    {
        "pattern": r"\bwood[- ]?elf\b|\bsylvan\b",
        "species_name": "Wood Elf",
        "sub_race": "Sylvan Elf",
        "genre": "Fantasy",
        "default_names": ["Sylas Whisperwind", "Tariel Greenleaf", "Caelum Briar", "Kaelen Swiftbow"],
        "title_qualifier": "Wood-Elven",
        "biological_marker": "keen forest senses, pointed ears, and an innate bond with living flora"
    },
    {
        "pattern": r"\bkitsune\b|\bfox[- ]?girl\b|\bfox[- ]?spirit\b|\bvulpine\b",
        "species_name": "Kitsune",
        "sub_race": "Fox Spirit",
        "genre": "Eastern Fantasy / Supernatural",
        "default_names": ["Tamamo", "Kuzunoha", "Shiro", "Kohaku", "Senko"],
        "title_qualifier": "Kitsune",
        "biological_marker": "plush fox ears, expressive bushy tails, and innate foxfire embers"
    },
    {
        "pattern": r"\bvampire\b|\bvampiric\b|\bvampyress\b|\bdhampir\b",
        "species_name": "Vampire",
        "sub_race": "True Vampire",
        "genre": "Gothic / Supernatural",
        "default_names": ["Carmilla von Draken", "Vladislav", "Eleonore Bloodthorne", "Vincent Thorne"],
        "title_qualifier": "Vampiric",
        "biological_marker": "subtle sharp fangs, pale alabaster skin, aversion to direct sunlight, and immortal thirst"
    },
    {
        "pattern": r"\bsuccubus\b|\bdemon\b|\bdemonic\b|\bdemoness\b|\bincubus\b",
        "species_name": "Demon",
        "sub_race": "Succubus",
        "genre": "Dark Fantasy / Supernatural",
        "default_names": ["Lilith Shadowthorn", "Malphasia", "Azazel", "Morrigan Hellfire"],
        "title_qualifier": "Demonic",
        "biological_marker": "swept horns, a spade-tipped tail, and latent brimstone aura"
    },
    {
        "pattern": r"\bangel\b|\bseraph\b|\bangelic\b|\bvalkyrie\b|\bcelestial\b",
        "species_name": "Angel",
        "sub_race": "Celestial",
        "genre": "Fantasy / Mythic",
        "default_names": ["Seraphina Dawn", "Azrael", "Aurelia Goldwing", "Gabriel"],
        "title_qualifier": "Celestial",
        "biological_marker": "faint radiant halo, luminous eyes, and divine presence"
    },
    {
        "pattern": r"\bneko\b|\bcatgirl\b|\bcat[- ]?spirit\b|\bfelinoid\b",
        "species_name": "Neko",
        "sub_race": "Catgirl Beastkin",
        "genre": "Fantasy / Slice of Life",
        "default_names": ["Nyx Whiskerfall", "Mimi", "Kokoa", "Chiyo"],
        "title_qualifier": "Feline",
        "biological_marker": "twitching feline ears, a slender expressive tail, and acute night vision"
    },
    {
        "pattern": r"\bdragon\b|\bdraconic\b|\bdragonewt\b|\bhalf[- ]?dragon\b",
        "species_name": "Dragon",
        "sub_race": "Draconic Demi-Human",
        "genre": "Fantasy",
        "default_names": ["Kaelith Emberfang", "Ignis", "Ryuuka", "Drake Wyrmcaller"],
        "title_qualifier": "Draconic",
        "biological_marker": "iridescent horn crests, thermal heat radiating from her skin, and reptilian slit pupils"
    },
    {
        "pattern": r"\bdwarf\b|\bdwarven\b",
        "species_name": "Dwarf",
        "sub_race": "Dwarven Clan",
        "genre": "Fantasy",
        "default_names": ["Thora Ironfoot", "Brundor Stonehammer", "Helga Forgeheart", "Dain Deepdelver"],
        "title_qualifier": "Dwarven",
        "biological_marker": "dense musculoskeletal frame, unmatched smithcraft endurance, and subterranean grit"
    },
    {
        "pattern": r"\bgoblin\b|\bgoblinoid\b",
        "species_name": "Goblin",
        "sub_race": "Goblin",
        "genre": "Fantasy",
        "default_names": ["Gricka Quickdagger", "Razzik", "Nixie Sparkfinger", "Gribble"],
        "title_qualifier": "Goblin",
        "biological_marker": "large sensitive ears, sharp fangs, green-tinted skin, and feral agility"
    },
    {
        "pattern": r"\bmermaid\b|\bsiren\b",
        "species_name": "Siren",
        "sub_race": "Mermaid",
        "genre": "Fantasy / Nautical",
        "default_names": ["Nerida Abyss", "Sirena Tidecaller", "Thalassa", "Coralia"],
        "title_qualifier": "Siren",
        "biological_marker": "pearlescent aquatic scales, webbed fingers, and a hypnotic vocal timbre"
    },
    {
        "pattern": r"\bandroid\b|\bcyborg\b|\bautomaton\b",
        "species_name": "Android",
        "sub_race": "Cyborg",
        "genre": "Sci-Fi / Cyberpunk",
        "default_names": ["Unit 7-A 'Aria'", "Cipher", "Nova-09", "Iris Synth"],
        "title_qualifier": "Synthetic",
        "biological_marker": "cool chassis seams, faint servomotor whirs, and synthetic neural optic pulses"
    }
]

COMMON_TROPES_RULES = [
    (r"\bmaid\b", "Maid"),
    (r"\bknight\b|\bpaladin\b", "Knight"),
    (r"\bwife\b|\bmarried\b|\bmarriage\b", "Wife"),
    (r"\btomboy\b", "Tomboy"),
    (r"\btsundere\b", "Tsundere"),
    (r"\byandere\b", "Yandere"),
    (r"\bkuudere\b", "Kuudere"),
    (r"\bbrat\b|\bbratty\b", "Bratty"),
    (r"\bprincess\b|\broyalty\b|\bnoble\b", "Nobility"),
    (r"\balchemist\b", "Alchemist"),
    (r"\bwitch\b|\bsorceress\b|\bmage\b", "Mage"),
    (r"\bassassin\b", "Assassin"),
]

GENERIC_MODERN_NAMES = {
    "Sarah", "Emily", "Jessica", "Amanda", "Ashley", "Jennifer", "Rachel", "Brittany",
    "Megan", "Hannah", "John", "David", "Michael", "Chris", "Kevin", "Bob", "Tom", "Mary",
    "Evelyn Reed", "Sarah Jenkins", "Jessica Miller"
}

def enforce_prompt_fidelity(parsed: Dict[str, Any], prompt: str) -> Dict[str, Any]:
    """
    Guarantees absolute fidelity to species, fantasy lineage, and tropes explicitly
    mentioned in the user's natural language seed.
    If a local LLM drifted or dropped the species, this safety net restores and weaves
    it into name, title, tags, archetype, and premise.
    """
    if not isinstance(parsed, dict) or not prompt:
        return parsed

    tags = parsed.setdefault("tags", [])
    if not isinstance(tags, list):
        tags = [str(tags)]
        parsed["tags"] = tags

    prompt_clean = prompt.strip()

    # 1. Species enforcement
    for rule in SPECIES_FIDELITY_RULES:
        if re.search(rule["pattern"], prompt_clean, re.IGNORECASE):
            existing_tags_lower = [str(t).lower() for t in tags]
            # Ensure species tag is prominent
            if rule["species_name"].lower() not in existing_tags_lower:
                tags.insert(0, rule["species_name"])
            if rule.get("sub_race") and rule["sub_race"].lower() not in existing_tags_lower:
                tags.insert(1, rule["sub_race"])
            if rule.get("genre") and rule["genre"].lower() not in existing_tags_lower:
                tags.append(rule["genre"])

            # Ensure title mentions the species/qualifier
            title = _to_str(parsed.get("title"))
            if not re.search(rule["pattern"], title, re.IGNORECASE) and not re.search(rf"\b{rule['title_qualifier']}\b", title, re.IGNORECASE):
                if title.lower().startswith("the "):
                    parsed["title"] = f"The {rule['title_qualifier']} " + title[4:]
                elif title:
                    parsed["title"] = f"The {rule['title_qualifier']} {title}"
                else:
                    parsed["title"] = f"The {rule['title_qualifier']} Emissary"

            # Ensure archetype mentions species and biological markers
            archetype = _to_str(parsed.get("archetype"))
            if not re.search(rule["pattern"], archetype, re.IGNORECASE) and not re.search(r"\bpointed ears\b|\bfangs\b|\bhorns\b|\btails?\b", archetype, re.IGNORECASE):
                marker = rule["biological_marker"]
                parsed["archetype"] = f"A {rule['species_name'].lower()} characterized by {marker}. {archetype}".strip()

            # Ensure name fits the species if the model generated a generic modern name
            name = _to_str(parsed.get("name"))
            if not name or name in GENERIC_MODERN_NAMES:
                parsed["name"] = random.choice(rule["default_names"])
            else:
                parsed["name"] = name

            # Ensure premise anchors the species
            premise = _to_str(parsed.get("premise"))
            if not re.search(rule["pattern"], premise, re.IGNORECASE) and not re.search(r"\bpointed ears\b|\bfangs\b|\bhorns\b|\btails?\b", premise, re.IGNORECASE):
                parsed["premise"] = f"Carrying the distinct biological traits and ancestral heritage of the {rule['species_name']}—including {rule['biological_marker']}—{{{{char}}}} finds herself entangled with {{{{user}}}} under fraught circumstances. " + premise
            else:
                parsed["premise"] = premise

    # 2. Key tropes enforcement
    existing_tags_lower = [str(t).lower() for t in tags]
    for pattern, tag_name in COMMON_TROPES_RULES:
        if re.search(pattern, prompt_clean, re.IGNORECASE):
            if tag_name.lower() not in existing_tags_lower:
                tags.append(tag_name)

    return normalize_concept_dict_macros(parsed)


def format_concept_sauce(data: Dict[str, Any]) -> str:
    """
    Assembles a full-fidelity 'sauce' dossier from a character concept dictionary
    ready to be consumed by CharGenUI (:3333) Spark generator and displayed in its prompt box.
    """
    if not isinstance(data, dict):
        return str(data or "")

    parts = []
    name = _to_str(data.get("name"))
    title = _to_str(data.get("title"))
    age = _to_str(data.get("age"))
    tagline = _to_str(data.get("tagline"))
    archetype = _to_str(data.get("archetype"))
    era = _to_str(data.get("era"))
    household = _to_str(data.get("household"))
    bot_mode = _to_str(data.get("bot_mode") or data.get("botMode"))
    tags = data.get("tags") or []
    contradiction = _to_str(data.get("central_contradiction"))
    rg = data.get("reaction_gradient") or {}
    voice = _to_str(data.get("vocal_idiolect"))
    premise = _to_str(data.get("premise"))
    notes = _to_str(data.get("brainstorm_notes"))

    header_lines = []
    if bot_mode == "multi_character":
        header_lines.append("[Bot Mode: Multi-Character Cast / Duo / Household]")
    elif bot_mode == "rpg_world":
        header_lines.append("[Bot Mode: RPG World Simulator / Game Master]")

    if name and title:
        header_lines.append(f"Character: {name} — {title}")
    elif name:
        header_lines.append(f"Character: {name}")
    elif title:
        header_lines.append(f"Character: {title}")

    if household:
        header_lines.append(f"Household / Faction: {household}")
    if age:
        header_lines.append(f"Age & Life Stage: {age}")
    if tagline:
        header_lines.append(f'Tagline: "{tagline}"')
    if era and era.lower() != "off":
        header_lines.append(f"Setting / Era: {era}")
    if tags:
        tag_str = ", ".join(tags) if isinstance(tags, list) else str(tags)
        header_lines.append(f"Tags & Tropes: {tag_str}")
    if archetype:
        header_lines.append(f"Archetype & Lineage: {archetype}")

    if header_lines:
        parts.append("\n".join(header_lines))

    if contradiction:
        parts.append(f"[Core Psychological Contradiction]\n{contradiction}")

    if isinstance(rg, dict) and any(rg.values()):
        rg_lines = ["[Behavioral & Reaction Dynamics]"]
        if rg.get("wont"):
            rg_lines.append(f"• Won't (Hard Boundary): {_to_str(rg['wont'])}")
        if rg.get("craves"):
            rg_lines.append(f"• Craves (Deep Desire): {_to_str(rg['craves'])}")
        if rg.get("neutral"):
            rg_lines.append(f"• Neutral (Everyday Flat): {_to_str(rg['neutral'])}")
        if rg.get("will"):
            rg_lines.append(f"• Will (Unlocked on Trust): {_to_str(rg['will'])}")
        if rg.get("trust_gate"):
            rg_lines.append(f"• Trust Gate (Defenses Crumble Tell): {_to_str(rg['trust_gate'])}")
        parts.append("\n".join(rg_lines))

    if voice:
        parts.append(f"[Vocal Idiolect & Cadence]\n{voice}")

    if premise:
        parts.append(f"[Playable Premise & Dynamic with {{{{user}}}}]\n{premise}")

    if notes:
        parts.append(f"[Designer Commentary & Play Dynamic]\n{notes}")

    if not parts:
        return normalize_rp_macros(premise or name or "Character Concept")

    return normalize_rp_macros("\n\n".join(parts))


# =========================================================================
# PIPELINE CLASS
# =========================================================================

class IdeaPipeline:
    def __init__(self, endpoint_url: Optional[str] = None, model_name: Optional[str] = None, preset_id: Optional[str] = None):
        cfg = load_config()
        self.endpoint_url = (endpoint_url or cfg.get("endpoint_url", "http://localhost:5001/v1")).rstrip("/")
        self.model_name = model_name if model_name is not None else cfg.get("model_name", "")
        self.preset_id = preset_id or cfg.get("active_prompt_preset") or get_active_preset_id()

    def check_connection(self) -> Dict[str, Any]:
        """Checks if llama-server / local LLM server is reachable and inspects loaded models."""
        t0 = time.time()
        # 1. Direct query to /v1/models (generous timeout so busy llama.cpp doesn't drop health check)
        try:
            models_url = f"{self.endpoint_url}/models"
            resp = requests.get(models_url, timeout=30.0)
            latency_ms = int((time.time() - t0) * 1000)
            if resp.status_code == 200:
                data = resp.json()
                models = [m.get("id", "") for m in data.get("data", [])]
                current = models[0] if models else self.model_name or "llama-server"
                return {
                    "online": True,
                    "endpoint": self.endpoint_url,
                    "models": models,
                    "current_model": current,
                    "latency_ms": latency_ms
                }
        except Exception:
            pass

        # Check llama.cpp server root /health
        try:
            base_url = self.endpoint_url.replace("/v1", "")
            base_resp = requests.get(f"{base_url}/health", timeout=30.0)
            latency_ms = int((time.time() - t0) * 1000)
            if base_resp.status_code == 200:
                return {
                    "online": True,
                    "endpoint": self.endpoint_url,
                    "models": [self.model_name or "llama-server"],
                    "current_model": self.model_name or "llama-server",
                    "latency_ms": latency_ms
                }
        except Exception:
            pass

        return {
            "online": False,
            "endpoint": self.endpoint_url,
            "models": [],
            "current_model": "offline",
            "latency_ms": 0
        }

    def get_server_props(self) -> Dict[str, Any]:
        """Queries llama-server /props endpoint for context size and slot info."""
        try:
            base_url = self.endpoint_url.replace("/v1", "")
            resp = requests.get(f"{base_url}/props", timeout=1.5)
            if resp.status_code == 200:
                return resp.json()
        except Exception:
            pass
        return {}

    def generate_idea(
        self,
        params: Dict[str, Any],
        status_cb: Optional[Callable[[str], None]] = None
    ) -> Dict[str, Any]:
        """
        Synthesizes character pitch via local LLM (llama-server) using:
        - Dynamic few-shot exemplars
        - Creative focus mode tuning
        - Anti-purple-prose constraint filtering
        - Multi-pass robust JSON repair
        - Strictly errors if llama-server is offline (no silent fallback)
        """
        genre = params.get("genre", "Modern Domestic / Slice of Life")
        dynamic = params.get("dynamic", "Loving Marriage & Playful Tension")
        tropes = params.get("tropes", ["Married Couple", "Interpersonal Friction", "Emotional Closeness"])
        custom_seed = params.get("custom_seed", "")
        intensity = params.get("intensity", "any").lower().strip()
        correction_tier = params.get("correction_tier", "off").lower().strip()
        era = params.get("era", "off").lower().strip()
        bot_mode = params.get("bot_mode", params.get("botMode", "single")).lower().strip()
        focus_mode = params.get("focus_mode", "psychometric").lower().strip()
        temperature = float(params.get("temperature", 0.85))
        locks = params.get("locks", {})
        current_idea = params.get("current_idea", {})
        has_active_locks = any(locks.values()) if isinstance(locks, dict) else False

        if status_cb:
            status_cb("Checking connection to llama-server (:5001)...")

        conn = self.check_connection()

        if conn["online"]:
            try:
                if status_cb:
                    status_cb(f"Synthesizing with {conn['current_model']}...")

                dramatic_text = get_dramatic_stakes_guidance(self.preset_id).get(intensity, "")
                correction_text, _ = resolve_correction_guidance(correction_tier, preset_id=self.preset_id)
                era_text = get_era_prompt_guidance(era)
                bot_mode_text = get_bot_mode_guidance(self.preset_id).get(bot_mode, "")
                guidance_lines = [t for t in [dramatic_text, correction_text, era_text, bot_mode_text] if t]
                intensity_text = "\n".join(guidance_lines)
                focus_text = get_focus_mode_instructions(self.preset_id).get(focus_mode, get_focus_mode_instructions(self.preset_id).get("psychometric", ""))

                # Build intensity and focus prompt guidance

                user_prompt = f"""GENRE & SETTING: {genre}
RELATIONSHIP DYNAMIC: {dynamic}
{intensity_text}
{focus_text}
KEY TROPES / THEMES: {", ".join(tropes) if isinstance(tropes, list) else tropes}
{f'SPECIFIC USER INSPIRATION / SEED: "{custom_seed}"' if custom_seed else ''}

MANDATORY ATTRIBUTE:
- You MUST explicitly include an 'age' property in the JSON stating {{char}}'s chronological age and physical life stage (e.g. '28 years old', '32 years old (early thirties)', '45 years old (mature woman)', '70 years old (elderly)'). Never omit age."""

                if has_active_locks and current_idea:
                    lock_instructions = []
                    if locks.get("name") and current_idea.get("name"):
                        lock_instructions.append(f"- Character NAME MUST BE EXACTLY: '{current_idea['name']}' (do not invent a new name)")
                    if locks.get("archetype") and (current_idea.get("title") or current_idea.get("archetype")):
                        lock_instructions.append(f"- Character ARCHETYPE & TITLE MUST BE: '{current_idea.get('title', '')}' ({current_idea.get('archetype', '')})")
                    if locks.get("modality") and current_idea.get("reaction_gradient", {}).get("craves"):
                        lock_instructions.append(f"- Underlying CRAVING & DYNAMIC MUST BE: '{current_idea['reaction_gradient']['craves']}'")
                    if (locks.get("vocal") or locks.get("voice")) and current_idea.get("vocal_idiolect"):
                        lock_instructions.append(f"- VOCAL IDIOLECT & SPEECH PATTERNS MUST BE: '{current_idea['vocal_idiolect']}'")
                    if (locks.get("vocal") or locks.get("voice")) and current_idea.get("central_contradiction"):
                        lock_instructions.append(f"- CENTRAL CONTRADICTION MUST BE: '{current_idea['central_contradiction']}'")

                    if lock_instructions:
                        user_prompt += "\n\nCRITICAL COMPONENT LOCKS (Strictly preserve these attributes and build the concept around them):\n" + "\n".join(lock_instructions)

                user_prompt += "\n\nSynthesize a brand new, highly distinctive roleplay character pitch according to the system instructions. Output STRICT JSON."

                messages = [
                    {"role": "system", "content": get_base_system_prompt(self.preset_id)}
                ]

                messages.append({"role": "user", "content": user_prompt})

                chat_url = f"{self.endpoint_url}/chat/completions"
                payload = {
                    "model": self.model_name or conn["current_model"] or "llama-server",
                    "messages": messages,
                    "temperature": temperature,
                    "max_tokens": 2800
                }

                resp = requests.post(chat_url, json=payload, timeout=LLM_TIMEOUT)
                if resp.status_code == 200:
                    if status_cb:
                        status_cb("Received tokens. Parsing psychometric spine...")

                    data = resp.json()
                    raw_text = data["choices"][0]["message"]["content"].strip()
                    parsed = repair_and_decode_json(raw_text)

                    if parsed and (parsed.get("name") or parsed.get("premise")):
                        # Post-enforce locks to prevent LLM hallucination overrides
                        if has_active_locks and current_idea:
                            if locks.get("name") and current_idea.get("name"):
                                parsed["name"] = current_idea["name"]
                            if locks.get("archetype"):
                                if current_idea.get("title"): parsed["title"] = current_idea["title"]
                                if current_idea.get("archetype"): parsed["archetype"] = current_idea["archetype"]
                            if locks.get("modality") and current_idea.get("reaction_gradient"):
                                if "reaction_gradient" not in parsed or not isinstance(parsed["reaction_gradient"], dict):
                                    parsed["reaction_gradient"] = {}
                                for k, v in current_idea["reaction_gradient"].items():
                                    if v: parsed["reaction_gradient"][k] = v
                            if locks.get("vocal") or locks.get("voice"):
                                if current_idea.get("vocal_idiolect"):
                                    parsed["vocal_idiolect"] = current_idea["vocal_idiolect"]
                                if current_idea.get("central_contradiction"):
                                    parsed["central_contradiction"] = current_idea["central_contradiction"]

                        parsed["source"] = f"llama-server ({conn['current_model']} :5001)"
                        if "intensity" not in parsed:
                            parsed["intensity"] = intensity if intensity != "any" else "medium"
                        if era and era != "off":
                            era_info = get_era_info(era)
                            parsed["era"] = era_info.get("name") if era_info else era
                        if custom_seed:
                            parsed = enforce_prompt_fidelity(parsed, custom_seed)
                        parsed = normalize_concept_dict_macros(parsed)
                        parsed["formatted_concept"] = format_concept_sauce(parsed)
                        if status_cb:
                            status_cb("Idea synthesized successfully!")
                        return parsed
                    else:
                        raise RuntimeError("AI model responded but output could not be parsed into a valid character dossier.")
                else:
                    raise RuntimeError(f"llama-server returned HTTP {resp.status_code}: {resp.text}")

            except Exception as e:
                print(f"[IdeaPipeline] llama-server call failed: {e}")
                raise RuntimeError(f"AI synthesis failed: {e}")

        # If offline: strictly report error without falling back to procedural
        raise RuntimeError(f"Cannot connect to llama-server at {self.endpoint_url}. Please ensure your AI server is running on port 5001.")

    def brainstorm_natural_language(
        self,
        prompt: str,
        mode: str = "psychometric",
        intensity: str = "any",
        temperature: float = 0.85,
        status_cb: Optional[Callable[[str], None]] = None,
        correction_tier: str = "off",
        era: str = "off",
        bot_mode: str = "single",
        image_data_url: Optional[str] = None,
        media_data_urls: Optional[List[str]] = None,
        media_blocks: Optional[List[Dict[str, Any]]] = None,
        fallback_media_blocks: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        """
        Takes raw, freeform natural language thoughts/input from the user and turns it into
        a fully realized, multi-layer roleplay character concept dossier with psychometrics,
        reaction gradients, and sensory premise. Supports solo, multi-character cast, and rpg_world cards.
        """
        cleaned_prompt = prompt.strip()
        if not cleaned_prompt and not image_data_url and not media_data_urls and not media_blocks:
            raise ValueError("Please provide a prompt describing your character concept or attach an image/video.")

        if not cleaned_prompt and (image_data_url or media_data_urls or media_blocks):
            cleaned_prompt = "Examine the attached visual media and forge a rich, fully realized character concept based on the visible identity, aesthetics, and demeanor."

        # Consolidate media blocks
        effective_media_blocks = []
        if media_blocks:
            effective_media_blocks.extend(media_blocks)
        elif media_data_urls:
            for u in media_data_urls:
                if u:
                    effective_media_blocks.append({"type": "image_url", "image_url": {"url": u}})
        elif image_data_url:
            effective_media_blocks.append({"type": "image_url", "image_url": {"url": image_data_url}})

        conn = self.check_connection()
        if not conn["online"]:
            raise RuntimeError(f"Cannot connect to llama-server at {self.endpoint_url}. Please ensure your AI server is running on port 5001.")

        try:
            if status_cb:
                status_cb(f"Synthesizing natural language idea with {conn['current_model']}...")

            dramatic_guidance = get_dramatic_stakes_guidance(self.preset_id).get(intensity, "")
            correction_guidance, _ = resolve_correction_guidance(correction_tier, preset_id=self.preset_id)
            era_guidance = get_era_prompt_guidance(era)
            bot_guidance = get_bot_mode_guidance(self.preset_id).get((bot_mode or "single").lower().strip(), "")
            guidance_parts = [g for g in [dramatic_guidance, correction_guidance, era_guidance, bot_guidance] if g]
            intensity_guidance = "\n".join(guidance_parts)
            focus_guidance = get_focus_mode_instructions(self.preset_id).get(mode, get_focus_mode_instructions(self.preset_id).get("psychometric", ""))

            system_instruction = get_natural_language_system_instruction(self.preset_id, intensity=intensity)

            user_content = f"""USER'S NATURAL LANGUAGE INPUT:
\"{cleaned_prompt}\"

CREATIVE MODE: {mode}
{intensity_guidance}
{focus_guidance}

Forge this natural language seed into an evocative, psychologically textured character dossier.
MANDATORY CONSTRAINT: If the user specified a species (such as 'elf'), archetype, or specific tropes, ensure {{{{char}}}} is explicitly that species and weave it prominently into the name, title, tags, archetype, and premise.
MANDATORY HARD ANCHORS: Every specific demographic, physical trait, profession, age, or name explicitly stated in the user's prompt is a NON-NEGOTIABLE hard anchor. Preserve it EXACTLY in name, title, tags, archetype, and premise — creative expansion must work around these anchors, never override them.
MANDATORY AGE ATTRIBUTE: You MUST explicitly include an 'age' property in the JSON stating {{char}}'s chronological age and physical life stage (e.g. '28 years old', '32 years old (early thirties)', '45 years old (mature woman)'). Never omit age.
MANDATORY MACRO RULE: Always use standard {{{{char}}}} and {{{{user}}}} macros with DOUBLE curly braces.
Output ONLY the JSON object."""

            if effective_media_blocks:
                user_content += "\n\nCRITICAL VISUAL DIRECTIVE: Visual evidence (portrait image or video) is attached. Examine the attached visual media meticulously. Ground the character's physical traits, wardrobe, demeanor, species markers, hair, eyes, and aesthetic in the visible details."
                user_msg_content = [{"type": "text", "text": user_content}]
                for block in effective_media_blocks:
                    user_msg_content.append(block)
            else:
                user_msg_content = user_content

            messages = [
                {"role": "system", "content": system_instruction},
                {"role": "user", "content": user_msg_content}
            ]

            chat_url = f"{self.endpoint_url}/chat/completions"
            payload = {
                "model": self.model_name or conn["current_model"] or "llama-server",
                "messages": messages,
                "temperature": temperature,
                "max_tokens": 2800
            }

            resp = requests.post(chat_url, json=payload, timeout=LLM_TIMEOUT)
            # If server returned 400 due to unsupported input_video block, retry with extracted keyframe fallback
            if resp.status_code != 200 and fallback_media_blocks:
                print(f"[Pipeline] Native video returned {resp.status_code}, retrying with keyframe fallback...")
                fallback_user_content = [{"type": "text", "text": user_content}]
                for fb in fallback_media_blocks:
                    fallback_user_content.append(fb)
                payload["messages"][-1]["content"] = fallback_user_content
                resp = requests.post(chat_url, json=payload, timeout=LLM_TIMEOUT)
            if resp.status_code == 200:
                data = resp.json()
                raw_text = data["choices"][0]["message"]["content"].strip()
                parsed = repair_and_decode_json(raw_text)
                if parsed and (parsed.get("name") or parsed.get("premise")):
                    parsed["source"] = f"llama-server Freeform Brainstormer (:5001)"
                    if "intensity" not in parsed:
                        parsed["intensity"] = intensity if intensity != "any" else "medium"
                    if era and era != "off":
                        era_info = get_era_info(era)
                        parsed["era"] = era_info.get("name") if era_info else era

                    # Enforce strict user keyword & species fidelity
                    parsed = enforce_prompt_fidelity(parsed, cleaned_prompt)
                    parsed = normalize_concept_dict_macros(parsed)
                    parsed["formatted_concept"] = format_concept_sauce(parsed)
                    return parsed
                else:
                    raise RuntimeError("AI model responded but output could not be parsed into a valid character dossier.")
            else:
                raise RuntimeError(f"llama-server returned HTTP {resp.status_code}: {resp.text}")
        except Exception as e:
            print(f"[Pipeline] Brainstorm from NL failed: {e}")
            raise RuntimeError(f"AI synthesis failed: {e}")

    def agent_chat_turn(
        self,
        user_message: str,
        chat_history: Optional[List[Dict[str, str]]] = None,
        current_character: Optional[Dict[str, Any]] = None,
        temperature: float = 0.85,
        allow_emergency: bool = False,
        status_cb: Optional[Callable[[str], None]] = None,
        image_data_urls: Optional[List[str]] = None,
        media_blocks: Optional[List[Dict[str, Any]]] = None,
        fallback_media_blocks: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        """
        Executes an interactive AI Agent Co-Pilot turn:
        Chats conversationally with the user, critiques/evaluates the concept,
        and dynamically updates or generates the full character dossier using the local LLM.
        Supports native input_video and multimodal image inputs.
        """
        cleaned_msg = user_message.strip()
        history = chat_history or []
        effective_media_blocks = []
        if media_blocks:
            effective_media_blocks.extend(media_blocks)
        elif image_data_urls:
            for u in image_data_urls:
                if u:
                    effective_media_blocks.append({"type": "image_url", "image_url": {"url": u}})

        conn = self.check_connection()
        if conn["online"]:
            try:
                if status_cb:
                    status_cb(f"AI Agent deliberating with {conn['current_model']} (:5001)...")

                system_prompt = get_agent_copilot_prompt(self.preset_id)

                messages = [{"role": "system", "content": system_prompt}]

                # Append recent history (limit to last 6 turns to keep context fast and focused)
                recent_history = history[-6:] if len(history) > 6 else history
                for h in recent_history:
                    role = h.get("role", "user")
                    content = h.get("content", "")
                    if role in ["user", "assistant"] and content:
                        messages.append({"role": role, "content": content})

                # Build active context payload
                context_block = ""
                if current_character and isinstance(current_character, dict) and current_character.get("name"):
                    if current_character.get("description") is not None:
                        # Strip massive base64 media data (avatar/avatarDataUrl) before dumping into prompt context
                        prompt_char = {
                            k: v for k, v in current_character.items()
                            if k not in ("avatar", "avatarDataUrl")
                        }
                        context_block = f"""CURRENT ACTIVE ROLEPLAY CHARACTER CARD (preserve all fields unless the user asks for changes):
{json.dumps(prompt_char, ensure_ascii=False, indent=2)}
The response's character object must remain a full card-shaped object with name, description, personality, scenario, first_mes, mes_example, alternate_greetings, system_prompt, post_history_instructions, creator_notes, and tags. Use the user's request to update the relevant card fields; do not replace the card with a concept-only dossier.
"""
                    else:
                        context_block = f"""CURRENT ACTIVE CHARACTER DOSSIER:
- Name: {current_character.get('name')}
- Title: {current_character.get('title')}
- Archetype: {current_character.get('archetype')}
- Contradiction: {current_character.get('central_contradiction')}
- Reaction Gradient: {json.dumps(current_character.get('reaction_gradient', {}))}
- Premise: {current_character.get('premise')}
- Opening Scenario: {current_character.get('opening_scenario')}
"""

                turn_prompt = f"""{context_block}
USER'S MESSAGE:
"{cleaned_msg}"

Respond as the Master Character Architect with your conversational 'agent_message' and the complete, deeply developed 'character' dossier. Output ONLY the JSON object."""

                if effective_media_blocks:
                    user_turn_content = [{"type": "text", "text": turn_prompt}]
                    for block in effective_media_blocks:
                        user_turn_content.append(block)
                    messages.append({"role": "user", "content": user_turn_content})
                else:
                    messages.append({"role": "user", "content": turn_prompt})

                chat_url = f"{self.endpoint_url}/chat/completions"
                payload = {
                    "model": self.model_name or conn["current_model"] or "llama-server",
                    "messages": messages,
                    "temperature": temperature,
                    "max_tokens": 2800,
                    "response_format": {"type": "json_object"}
                }

                resp = requests.post(chat_url, json=payload, timeout=LLM_TIMEOUT)
                if resp.status_code != 200 and fallback_media_blocks:
                    print(f"[Pipeline] Native video returned {resp.status_code}, retrying with keyframe fallback...")
                    fallback_user_content = [{"type": "text", "text": turn_prompt}]
                    for fb in fallback_media_blocks:
                        fallback_user_content.append(fb)
                    payload["messages"][-1]["content"] = fallback_user_content
                    resp = requests.post(chat_url, json=payload, timeout=LLM_TIMEOUT)
                if resp.status_code == 200:
                    data = resp.json()
                    raw_text = data["choices"][0]["message"]["content"].strip()
                    raw_text = clean_mojibake(raw_text)
                    parsed = repair_and_decode_json(raw_text)
                    if parsed:
                        agent_msg = clean_mojibake(parsed.get("agent_message", ""))
                        char_obj = parsed.get("character")

                        # If model placed fields at root instead of under 'character'
                        if not char_obj and (parsed.get("name") or parsed.get("premise")):
                            char_obj = {k: v for k, v in parsed.items() if k != "agent_message"}

                        if not agent_msg:
                            agent_msg = f"I've updated {char_obj.get('name', 'the character')}'s dossier to incorporate your direction."

                        if char_obj:
                            if current_character and current_character.get("description") is not None:
                                merged_card = dict(current_character)
                                merged_card.update(char_obj)
                                # Preserve original avatar if present in current_character
                                if current_character.get("avatar") and not merged_card.get("avatar"):
                                    merged_card["avatar"] = current_character["avatar"]
                                char_obj = merged_card
                            char_obj = normalize_concept_dict_macros(char_obj)
                            char_obj["source"] = f"AI Agent (:5001 - {conn.get('current_model', 'local')})"
                            if current_character and current_character.get("era") and not char_obj.get("era"):
                                char_obj["era"] = current_character["era"]
                            return {
                                "agent_message": agent_msg,
                                "character": char_obj
                            }
                    else:
                        # Raw text was conversational prose without valid JSON dossier
                        clean_raw = clean_mojibake(raw_text)
                        return {
                            "agent_message": clean_raw,
                            "character": current_character or {}
                        }
            except Exception as e:
                print(f"[Pipeline] AI Agent request failed: {e}")
                return {
                    "agent_message": f"⚠️ **AI Agent Error**: {e}\n\nPlease check that your local `llama-server` is running on port 5001 (`{self.endpoint_url}`).",
                    "character": current_character or {}
                }

        # If LLM server is offline, report offline clearly (NO procedural mocking for the AI Agent)
        return {
            "agent_message": (
                f"⚠️ **AI Server Offline**: Cannot reach `llama-server` at `{self.endpoint_url}`.\n\n"
                "Please start your local llama-server on port 5001 (e.g. `./llama-server -m your_model.gguf --port 5001`) so the AI Agent can deliberate, co-write, and dynamically author character dossiers with you."
            ),
            "character": current_character or {}
        }

    def era_agent_chat_turn(
        self,
        user_message: str,
        chat_history: Optional[List[Dict[str, str]]] = None,
        current_era_pair: Optional[Dict[str, Any]] = None,
        temperature: float = 0.85,
        status_cb: Optional[Callable[[str], None]] = None,
        step_cb: Optional[Callable[[Dict[str, Any]], None]] = None,
        cancel_event: Optional[threading.Event] = None,
        instruction_queue: Optional[Callable[[], List[str]]] = None,
    ) -> Dict[str, Any]:
        """
        Executes one agentic Era Architect turn via the tool loop in EraAgentHarness.

        Every message runs through the same loop \u2014 read-only Q\u0026A vs. forging a new
        paired setting emerges from the model's own tool choices. There is intentionally
        NO static keyword router here; tool invariants (search-before-draft, similarity
        gate on save, unsaved-draft finalize rejection) are enforced by the harness itself.
        """
        cleaned_msg = user_message.strip()

        # 0. Server check \u2014 hard offline report, no procedural mocking
        conn = self.check_connection()
        if not conn["online"]:
            return {
                "agent_message": (
                    f"\u26a0\ufe0f **AI Server Offline**: Cannot reach `llama-server` at `{self.endpoint_url}`.\n\n"
                    "Please start your local llama-server on port 5001 so the Era Architect Agent can author paired eras with you."
                ),
                "era_pair": current_era_pair or {},
                "compliance": {},
                "tool_steps": []
            }

        try:
            harness = EraAgentHarness(endpoint=self.endpoint_url, model=self.model_name)
            result = harness.run_turn(
                cleaned_msg,
                chat_history=chat_history,
                current_draft=current_era_pair,
                temperature=temperature,
                status_cb=status_cb,
                step_cb=step_cb,
                cancel_event=cancel_event,
                instruction_queue=instruction_queue
            )
            return {
                "agent_message": result.get("agent_message", "Turn completed."),
                "era_pair": result.get("era_pair", {}),
                "compliance": result.get("compliance", {}),
                "tool_steps": result.get("tool_steps", [])
            }
        except EraHarnessError as e:
            return {
                "agent_message": f"\u26a0\ufe0f **Era Architect Error**: {e}",
                "era_pair": current_era_pair or {},
                "compliance": {},
                "tool_steps": [],
                "cancelled": "Cancelled by user" in str(e),
            }
        except Exception as e:
            import traceback
            print(f"[Pipeline] Era agent loop failed: {e}\n{traceback.format_exc()}")
            return {
                "agent_message": (
                    f"\u26a0\ufe0f **Era Agent Error**: {e}\n\n"
                    f"Please check that your local `llama-server` is running on port 5001 (`{self.endpoint_url}`)."
                ),
                "era_pair": current_era_pair or {},
                "compliance": {},
                "tool_steps": []
            }

    def generate_scenario_hook(
        self,
        character_data: Dict[str, Any],
        status_cb: Optional[Callable[[str], None]] = None
    ) -> str:
        """
        Generates an immediate, immersive First Message / Opening Scenario Hook
        featuring active friction between {{char}} and {{user}}.
        """
        name = character_data.get("name", "Character")
        premise = character_data.get("premise", "")
        contradiction = character_data.get("central_contradiction", "")
        vocal = character_data.get("vocal_idiolect", "")
        craving = character_data.get("reaction_gradient", {}).get("craves", "")

        conn = self.check_connection()
        if not conn["online"]:
            raise RuntimeError(f"Cannot connect to llama-server at {self.endpoint_url}. Please ensure your AI server is running on port 5001.")

        try:
            if status_cb:
                status_cb(f"Drafting Opening Scenario Hook with {conn['current_model']}...")

            prompt = f"""You are a master roleplay scene director. Write a vivid, visceral, and engaging Opening Roleplay Message (First Message) from {name}'s perspective interacting directly with {{{{user}}}}.

CHARACTER DOSSIER:
Name: {name}
Premise: {premise}
Central Contradiction: {contradiction}
Secret Craving: {craving}
Vocal Style: {vocal}

REQUIREMENTS:
1. Ground the scene in an active moment of emotional friction, personal vulnerability, or mutual conflict where {{{{char}}}} and {{{{user}}}} interact directly.
2. Include rich sensory grounding: physical atmosphere, sounds, body language, tone inflections, and spoken dialogue.
3. End with an actionable prompt / hook daring {{{{user}}}} to react or make his move.
4. Format in clean Markdown roleplay style (*actions in asterisks*, "dialogue in quotes"). 2-3 paragraphs.

Write ONLY the roleplay scenario:"""

            chat_url = f"{self.endpoint_url}/chat/completions"
            payload = {
                "model": self.model_name or conn["current_model"] or "llama-server",
                "messages": [
                    {"role": "system", "content": "You write immersive, atmospheric roleplay opening starters without purple prose."},
                    {"role": "user", "content": prompt}
                ],
                "temperature": 0.85,
                "max_tokens": 800
            }
            resp = requests.post(chat_url, json=payload, timeout=LLM_TIMEOUT)
            if resp.status_code == 200:
                data = resp.json()
                hook = data["choices"][0]["message"]["content"].strip()
                if hook:
                    return hook
                raise RuntimeError("AI model returned an empty scenario hook.")
            else:
                raise RuntimeError(f"llama-server returned HTTP {resp.status_code}: {resp.text}")
        except Exception as e:
            print(f"[Pipeline] Scenario hook generation failed: {e}")
            raise RuntimeError(f"Scenario hook generation failed: {e}")

    def generate_story_arc(
        self,
        character_data: Dict[str, Any],
        rough_story_hint: str = "",
        min_acts: int = 3,
        status_cb: Optional[Callable[[str], None]] = None
    ) -> str:
        """
        Generates a narrative story arc with the requested number of act phases
        tailored to {{char}} and {{user}} to steer roleplay greetings and scenario.
        Optionally incorporates the user's rough story hint or direction.
        """
        name = character_data.get("name", "Character")
        premise = character_data.get("premise", "")
        contradiction = character_data.get("central_contradiction", "")
        craving = character_data.get("reaction_gradient", {}).get("craves", "")
        stance = character_data.get("stance_toward_user", "")

        conn = self.check_connection()
        if not conn["online"]:
            raise RuntimeError(f"Cannot connect to llama-server at {self.endpoint_url}. Please ensure your AI server is running on port 5001.")

        try:
            if status_cb:
                status_cb(f"Drafting Story Arc Trajectory with {conn['current_model']}...")

            hint_block = f"\nSTORY GUIDANCE:\n{rough_story_hint.strip()}\n" if rough_story_hint.strip() else ""

            prompt = f"""You are an elite narrative designer. Write a STORY ARC for an uncensored roleplay between {name} and {{{{user}}}}.

CHARACTER:
Name: {name}
Premise: {premise}
Central Contradiction: {contradiction}
Stance Toward {{{{user}}}}: {stance}
Secret Craving: {craving}
{hint_block}
OUTPUT RULES — READ CAREFULLY:
- You MUST write EXACTLY {min_acts} acts. Not fewer. Not more. EXACTLY {min_acts}.
- Use this strict format for every act, no exceptions:
  Act [N]: [Title]
  [1–2 sentence beat description]
- Number them sequentially: Act 1, Act 2, Act 3 ... Act {min_acts}.
- Do NOT stop early. Do NOT summarize remaining acts. Do NOT write "..." or "[continued]".
- If you have written fewer than {min_acts} acts, you are NOT done. Keep writing.
- Output ONLY the numbered acts. No preamble, no closing remarks."""

            chat_url = f"{self.endpoint_url}/chat/completions"
            payload = {
                "model": self.model_name or conn["current_model"] or "llama-server",
                "messages": [
                    {"role": "system", "content": "You are a master story architect crafting concise, high-tension narrative arcs."},
                    {"role": "user", "content": prompt}
                ],
                "temperature": 0.8,
                "max_tokens": max(800, min_acts * 120)
            }
            resp = requests.post(chat_url, json=payload, timeout=LLM_TIMEOUT)
            if resp.status_code == 200:
                data = resp.json()
                arc = data["choices"][0]["message"]["content"].strip()
                if arc:
                    return arc
                raise RuntimeError("AI model returned an empty story arc.")
            else:
                raise RuntimeError(f"llama-server returned HTTP {resp.status_code}: {resp.text}")
        except Exception as e:
            print(f"[Pipeline] Story arc generation failed: {e}")
            raise RuntimeError(f"Story arc generation failed: {e}")

    def generate_concept_variance(
        self,
        character_data: Dict[str, Any],
        temperature: float = 0.9,
        guidance: str = "",
        status_cb: Optional[Callable[[str], None]] = None
    ) -> Dict[str, Any]:
        """
        Takes an existing character concept and generates an organic, nuanced VARIANCE / ALTERNATIVE ANGLE
        of the same core concept (same overarching trope/dynamic, but shifting the backstory crucible,
        relational chemistry, physical setting, or behavioral contradiction).
        Optionally incorporates user steering guidance if provided.
        """
        name = character_data.get("name", "Character")
        title = character_data.get("title", "Concept")
        premise = character_data.get("premise", "")
        contradiction = character_data.get("central_contradiction", "")
        craving = character_data.get("reaction_gradient", {}).get("craves", "")
        stance = character_data.get("stance_toward_user", "")
        tags = character_data.get("tags", [])
        bot_mode = character_data.get("bot_mode", "single")
        story_arc = character_data.get("story_arc", "")

        conn = self.check_connection()
        if not conn["online"]:
            raise RuntimeError(f"Cannot connect to llama-server at {self.endpoint_url}. Please ensure your AI server is running on port 5001.")

        try:
            if status_cb:
                status_cb(f"Synthesizing nuanced concept variance for {name} with {conn['current_model']}...")

            guidance_clause = ""
            if guidance and guidance.strip():
                guidance_clause = f"\nUSER GUIDANCE & STEERING CRITERIA FOR THIS VARIANCE:\n{guidance.strip()}\nEnsure you explicitly integrate and lean into these requested adjustments while respecting the core persona.\n"

            prompt = f"""You are a master roleplay dramaturge and narrative designer. Your task is to generate an EVOCATIVE, FRESH VARIANCE of an existing character concept.

EXISTING CHARACTER FOUNDATION:
Name: {name}
Title: {title}
Tags: {', '.join(tags)}
Premise: {premise}
Central Contradiction: {contradiction}
Reaction Gradient Craving: {craving}
Stance Toward {{{{user}}}}: {stance}
{f"Story Arc Trajectory: {story_arc}" if story_arc else ""}{guidance_clause}
VARIANCE GOAL:
Keep the core soul, species/lineage, and underlying relational dynamic intact, but create a DISTINCT ALTERNATIVE INTERPRETATION / VARIANT:
1. Shift the backstory crucible or specific inciting dilemma that brought them and {{{{user}}}} together.
2. Provide a refreshed or complementary central contradiction and secret craving.
3. Keep or playfully tweak their name/title to represent this compelling alternative path.
4. If a story arc exists, adjust it to fit this variant's specific stakes.
{"5. Actively incorporate the user guidance directives." if guidance_clause else ""}

Output STRICT JSON matching this schema:
{{
  "name": "{name}",
  "title": "Evocative Variant Title",
  "age": "Explicit chronological age & life stage (e.g. '24 years old', '32 years old (early thirties)', '45 years old (mature woman)')",
  "tagline": "A punchy single-line thematic thesis",
  "tags": ["Tag1", "Tag2", ...],
  "archetype": "Rich description of the variant archetype and role with {{{{user}}}}",
  "intensity": "{character_data.get('intensity', 'medium')}",
  "central_contradiction": "Competing inner drives",
  "stance_toward_user": "Emotional posture",
  "reaction_gradient": {{
    "wont": "What breaks trust or crosses lines",
    "craves": "Deepest unspoken need",
    "neutral": "Routine/mundane topics",
    "will": "Surrender/breakthrough response",
    "trust_gate": "Quiet tell of genuine vulnerability"
  }},
  "vocal_idiolect": "Cadence, tone, speech habits",
  "premise": "Rich, 2-3 paragraph uncensored character premise with sensory staging and relational tension",
  "story_arc": "Optional 2-3 sentence 3-phase narrative trajectory (Setup -> Complication -> Climax)"
}}"""

            chat_url = f"{self.endpoint_url}/chat/completions"
            payload = {
                "model": self.model_name or conn["current_model"] or "llama-server",
                "messages": [
                    {"role": "system", "content": "You are a master character architect generating nuanced, high-tension concept variants. Output ONLY valid JSON."},
                    {"role": "user", "content": prompt}
                ],
                "temperature": temperature,
                "max_tokens": 1400
            }

            resp = requests.post(chat_url, json=payload, timeout=LLM_TIMEOUT)
            if resp.status_code == 200:
                data = resp.json()
                raw_text = data["choices"][0]["message"]["content"].strip()
                parsed = repair_and_decode_json(raw_text)
                if parsed and (parsed.get("name") or parsed.get("premise")):
                    parsed["source"] = f"llama-server Concept Variance (:5001)"
                    if bot_mode and bot_mode != "single":
                        parsed["bot_mode"] = bot_mode
                    if "intensity" not in parsed:
                        parsed["intensity"] = character_data.get("intensity", "medium")
                    if character_data.get("era"):
                        parsed["era"] = character_data.get("era")
                    parsed = normalize_concept_dict_macros(parsed)
                    parsed["formatted_concept"] = format_concept_sauce(parsed)
                    return parsed
                raise RuntimeError("AI model responded but output could not be parsed into a valid concept variance.")
            else:
                raise RuntimeError(f"llama-server returned HTTP {resp.status_code}: {resp.text}")
        except Exception as e:
            print(f"[Pipeline] Concept variance generation failed: {e}")
            raise RuntimeError(f"Concept variance generation failed: {e}")

    def tweak_character_aspect(
        self,
        character_data: Dict[str, Any],
        instruction: str,
        temperature: float = 0.7,
        status_cb: Optional[Callable[[str], None]] = None
    ) -> Dict[str, Any]:
        """
        Takes an existing character concept and modifies a specific aspect or applies
        a targeted refinement/patch (e.g. 'change her hair to silver', 'make her dynamic more reluctant',
        'shift the premise to an abandoned moon base', 'replace the contradiction') while preserving
        everything else about the concept.
        """
        conn = self.check_connection()
        if not conn["online"]:
            raise RuntimeError(f"Cannot connect to llama-server at {self.endpoint_url}. Please ensure your AI server is running on port 5001.")

        name = character_data.get("name", "Character")
        try:
            if status_cb:
                status_cb(f"Applying targeted change to {name} with {conn['current_model']} (:5001)...")

            system_prompt = get_surgical_refinement_prompt(self.preset_id)

            user_prompt = f"""EXISTING CHARACTER DOSSIER:
{json.dumps(character_data, indent=2, ensure_ascii=False)}

REQUESTED TARGETED CHANGE / REFINEMENT:
{instruction.strip()}

Apply this exact modification to the dossier and output the complete updated character JSON:"""

            chat_url = f"{self.endpoint_url}/chat/completions"
            payload = {
                "model": self.model_name or conn["current_model"] or "llama-server",
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                "temperature": temperature,
                "max_tokens": 1500
            }

            resp = requests.post(chat_url, json=payload, timeout=LLM_TIMEOUT)
            if resp.status_code == 200:
                data = resp.json()
                raw_text = data["choices"][0]["message"]["content"].strip()
                parsed = repair_and_decode_json(raw_text)
                if parsed and isinstance(parsed, dict) and (parsed.get("name") or parsed.get("premise")):
                    # Preserve metadata fields from original
                    for meta_key in ["bot_mode", "intensity", "era", "origin_prompt", "story_arc"]:
                        if meta_key in character_data and meta_key not in parsed:
                            parsed[meta_key] = character_data[meta_key]
                    parsed["source"] = f"llama-server Targeted Tweak (:5001)"
                    parsed = normalize_concept_dict_macros(parsed)
                    parsed["formatted_concept"] = format_concept_sauce(parsed)
                    return parsed
                raise RuntimeError("AI model responded but output could not be parsed into a valid updated dossier.")
            else:
                raise RuntimeError(f"llama-server returned HTTP {resp.status_code}: {resp.text}")
        except Exception as e:
            print(f"[Pipeline] Targeted tweak failed: {e}")
            raise RuntimeError(f"Targeted tweak failed: {e}")

    def generate_group_chat_cast(
        self,
        theme_or_premise: str,
        cast_size: int = 3,
        genre: str = "Fantasy",
        intensity: str = "medium",
        correction_tier: str = "off",
        era: str = "off",
        status_cb: Optional[Callable[[str], None]] = None
    ) -> Dict[str, Any]:
        """
        Synthesizes a coordinated ensemble of MULTIPLE INDEPENDENT INDIVIDUAL CARDS
        tailored for group chats (SillyTavern, etc.) sharing a premise, household/faction bond,
        and deep interpersonal dynamics between each other and {{user}}.
        """
        conn = self.check_connection()
        if not conn["online"]:
            raise RuntimeError(f"Cannot connect to llama-server at {self.endpoint_url}. Please ensure your AI server is running on port 5001.")

        cast_count = max(2, min(6, int(cast_size)))
        dramatic_text = get_dramatic_stakes_guidance(self.preset_id).get(intensity, "")
        correction_text, _ = resolve_correction_guidance(correction_tier, preset_id=self.preset_id)
        era_text = get_era_prompt_guidance(era)
        guidance_lines = [t for t in [dramatic_text, correction_text, era_text] if t]
        intensity_text = "\n".join(guidance_lines)

        system_prompt = get_group_chat_cast_prompt(self.preset_id, cast_count=cast_count)

        user_prompt = f"""CAST PREMISE / CORE SEED:
{theme_or_premise.strip() or "An elite, contrasting group of companions bound together by a shared duty or household."}

SPECIFICATIONS:
• Number of Individual Characters to Forge: {cast_count}
• Setting / Genre: {genre}
{intensity_text}

Forge the {cast_count} individual character cards with rich inter-character dynamics for group chats now. Output STRICT JSON:"""

        try:
            if status_cb:
                status_cb(f"Synthesizing {cast_count}-character group chat cast with {conn['current_model']}...")

            chat_url = f"{self.endpoint_url}/chat/completions"
            payload = {
                "model": self.model_name or conn["current_model"] or "llama-server",
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                "temperature": 0.85,
                "max_tokens": 3600
            }
            resp = requests.post(chat_url, json=payload, timeout=LLM_TIMEOUT * 2)
            if resp.status_code == 200:
                data = resp.json()
                raw_content = data["choices"][0]["message"]["content"].strip()
                parsed = repair_and_decode_json(raw_content)
                if parsed and isinstance(parsed, dict) and isinstance(parsed.get("characters"), list):
                    return parsed
                # Fallback: check if parsed is a list of characters
                if isinstance(parsed, list):
                    return {"group_name": "Companion Group", "group_premise": theme_or_premise, "characters": parsed}
                raise RuntimeError("Failed to decode group chat ensemble JSON from model output.")
            else:
                raise RuntimeError(f"llama-server returned HTTP {resp.status_code}: {resp.text}")
        except Exception as e:
            print(f"[Pipeline] Group chat cast generation failed: {e}")
            raise RuntimeError(f"Group chat cast generation failed: {e}")

    def generate_household_encounter(
        self,
        household_data: Dict[str, Any],
        participating_members: List[Dict[str, Any]],
        scenario_goal: str = "",
        status_cb: Optional[Callable[[str], None]] = None
    ) -> Dict[str, str]:
        """
        Synthesizes a multi-companion group encounter with shared lore, rules,
        friction between characters, and an opening starter confronting {{user}}.
        """
        conn = self.check_connection()
        if not conn["online"]:
            raise RuntimeError(f"Cannot connect to llama-server at {self.endpoint_url}. Please ensure your AI server is running on port 5001.")

        hh_name = household_data.get("name", "Household")
        hh_category = household_data.get("category_label", "Household / Court")
        hh_user_title = household_data.get("user_title", "{{user}}")
        hh_lore = household_data.get("description", "") or household_data.get("shared_lore", "")
        rules = household_data.get("rules_and_etiquette", [])
        rules_text = "\n".join([f"- {r}" for r in rules]) if rules else "Standard household conduct."

        roster_descriptions = []
        for m in participating_members:
            m_name = m.get("name") or m.get("card_name", "Companion")
            m_role = m.get("role") or m.get("household_role", "Companion")
            m_standing = m.get("standing", "Standard")
            m_premise = m.get("premise", "")
            m_contradiction = m.get("central_contradiction", "")
            m_voice = m.get("vocal_idiolect", "")
            roster_descriptions.append(
                f"### COMPANION: {m_name}\n"
                f"• Household Role: {m_role} (Standing: {m_standing})\n"
                f"• Character Premise: {m_premise[:350]}\n"
                f"• Paradox / Friction: {m_contradiction[:250]}\n"
                f"• Voice / Cadence: {m_voice[:200]}"
            )
        roster_str = "\n\n".join(roster_descriptions)

        system_prompt = get_household_scene_prompt(self.preset_id)

        user_prompt = (
            f"HOUSEHOLD CONTEXT:\n"
            f"• Name: {hh_name} ({hh_category})\n"
            f"• User Title / Position: {hh_user_title}\n"
            f"• Shared Lore & Estate: {hh_lore or 'A private shared estate.'}\n"
            f"• Rules & Protocols:\n{rules_text}\n\n"
            f"PARTICIPATING COMPANIONS:\n{roster_str}\n\n"
            f"SCENARIO PREMISE / CRISIS:\n{scenario_goal or 'The companions are gathered together in the hall or private chamber as {{user}} enters.'}\n\n"
            f"Synthesize the encounter JSON with 'title', 'scenario', and 'first_mes':"
        )

        try:
            if status_cb:
                status_cb(f"Synthesizing group encounter for {hh_name} with {conn['current_model']}...")

            chat_url = f"{self.endpoint_url}/chat/completions"
            payload = {
                "model": self.model_name or conn["current_model"] or "llama-server",
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                "temperature": 0.82,
                "max_tokens": 1200
            }
            resp = requests.post(chat_url, json=payload, timeout=LLM_TIMEOUT)
            if resp.status_code == 200:
                data = resp.json()
                raw_content = data["choices"][0]["message"]["content"].strip()
                parsed = repair_and_decode_json(raw_content)
                if parsed and isinstance(parsed, dict) and ("first_mes" in parsed or "scenario" in parsed):
                    return {
                        "title": parsed.get("title", f"{hh_name} Gathering"),
                        "scenario": parsed.get("scenario", ""),
                        "first_mes": parsed.get("first_mes", raw_content)
                    }
                return {
                    "title": f"{hh_name} Gathering",
                    "scenario": f"The companions of {hh_name} are assembled as {{user}} arrives.",
                    "first_mes": raw_content
                }
            else:
                raise RuntimeError(f"llama-server returned HTTP {resp.status_code}: {resp.text}")
        except Exception as e:
            print(f"[Pipeline] Group encounter generation failed: {e}")
            raise RuntimeError(f"Group encounter generation failed: {e}")


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Character Idea Generator")
    parser.add_argument("--genre", default="Modern Domestic", help="Genre or setting")
    parser.add_argument("--dynamic", default="Loving Marriage & Playful Tension", help="Relationship dynamic")
    parser.add_argument("--intensity", default="any", help="Spice level (mild, medium, heavy, any)")
    parser.add_argument("--focus", default="psychometric", help="Focus mode (psychometric, domestic, reluctant, slowburn, scenario_hook)")
    parser.add_argument("--seed", default="", help="Custom seed")
    parser.add_argument("--endpoint", default="http://localhost:5001/v1", help="llama-server endpoint")
    args = parser.parse_args()

    pipe = IdeaPipeline(endpoint_url=args.endpoint)
    result = pipe.generate_idea({
        "genre": args.genre,
        "dynamic": args.dynamic,
        "intensity": args.intensity,
        "focus_mode": args.focus,
        "custom_seed": args.seed
    })
    print(json.dumps(result, indent=2))
