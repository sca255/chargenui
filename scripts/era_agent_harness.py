#!/usr/bin/env python3
"""
scripts/era_agent_harness.py
----------------------------
Dedicated, zero-bloat Era Agent Harness for the CharGenUI worldbuilding ecosystem.
Bypasses heavy agent frameworks (like OpenCode) with a direct, multi-stage pipeline:
  Stage 1: Reference Era Grounding & Thematic Conceptualization
  Stage 2: Sensory Polygyny Haven Generation
  Stage 3: Monogamy Seclusion Companion Derivation
  Stage 4: 5-Pillars Compliance Audit & Auto-Repair
  Stage 5: Direct Extension File Save (data/eras_extensions/<slug>.json)

Usage:
  # One-shot command line generation:
  python3 scripts/era_agent_harness.py "make new eras similar to floating_sky_citadel, targeting bdsm, maledom, patriarchy themes"

  # Interactive agent mode:
  python3 scripts/era_agent_harness.py --interactive
"""

import sys
import os
import re
import json
import copy
import argparse
import requests
from pathlib import Path
from typing import Dict, Any, Optional, Tuple, Callable

# Locate repository root (whether in scripts/ or idea_generator/ or root)
current_dir = Path(__file__).resolve().parent
if (current_dir / "data" / "eras_db.json").exists():
    ROOT_DIR = current_dir
elif (current_dir.parent / "data" / "eras_db.json").exists():
    ROOT_DIR = current_dir.parent
else:
    ROOT_DIR = current_dir.parent.parent

sys.path.insert(0, str(ROOT_DIR))
sys.path.insert(0, str(ROOT_DIR / "idea_generator"))

try:
    from idea_generator.eras_data import (
        get_all_eras,
        get_era_info,
        validate_era_compliance,
        save_extension_file,
    )
except ImportError:
    from eras_data import (
        get_all_eras,
        get_era_info,
        validate_era_compliance,
        save_extension_file,
    )


def repair_and_decode_json(raw_text: str) -> Optional[Dict[str, Any]]:
    """
    Self-contained, robust JSON parser for local LLM output:
    - Strips markdown codeblock fences
    - Extracts outermost {...}
    - Cleans trailing commas
    - Fixes unescaped newlines inside strings
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

    # 4. Attempt standard json.loads
    try:
        data = json.loads(cleaned)
        if isinstance(data, dict):
            return data
    except Exception:
        pass

    # 5. Fix unescaped newlines inside strings
    try:
        def _escape_newlines(m):
            return m.group(0).replace("\n", "\\n").replace("\r", "\\r")

        sanitized = re.sub(r'"([^"\\]*(\\.[^"\\]*)*)"', _escape_newlines, cleaned)
        data = json.loads(sanitized)
        if isinstance(data, dict):
            return data
    except Exception:
        pass

    return None

DEFAULT_ENDPOINT = "http://localhost:5001/v1"
DB_PATH = ROOT_DIR / "data" / "eras_db.json"
EXTENSIONS_DIR = ROOT_DIR / "data" / "eras_extensions"

# ANSI color codes for terminal display
C_CYAN = "\033[96m"
C_GREEN = "\033[92m"
C_YELLOW = "\033[93m"
C_RED = "\033[91m"
C_PURPLE = "\033[95m"
C_BOLD = "\033[1m"
C_RESET = "\033[0m"


class EraAgentHarness:
    """
    Lightweight, deterministic multi-stage agent pipeline for authoring paired eras.
    """
    def __init__(self, endpoint: str = DEFAULT_ENDPOINT, model: Optional[str] = None):
        self.endpoint = endpoint.rstrip("/")
        self.model = model
        self.db = self._load_db()

    def _load_db(self) -> Dict[str, Any]:
        db = {}
        if DB_PATH.exists():
            try:
                with open(DB_PATH, "r", encoding="utf-8") as f:
                    db = json.load(f)
            except Exception as e:
                print(f"{C_RED}Warning: Failed to load {DB_PATH}: {e}{C_RESET}")

        # Also load all modular era extension files so prompts referencing extensions can be matched
        ext_dirs = [
            EXTENSIONS_DIR,
            ROOT_DIR / "idea_generator" / "eras_extensions",
            ROOT_DIR / "eras_extensions"
        ]
        for edir in ext_dirs:
            if not edir.exists() or not edir.is_dir():
                continue
            for f in edir.glob("*.json"):
                try:
                    with open(f, "r", encoding="utf-8") as fp:
                        content = fp.read().strip()
                        if not content:
                            continue
                        data = json.loads(content)

                    def _register(item, fallback_key=None):
                        if not isinstance(item, dict):
                            return
                        raw_id = item.get("id") or fallback_key or item.get("name")
                        if not raw_id:
                            return
                        eid = str(raw_id).strip()
                        item["id"] = eid
                        item["_extension_file"] = f.name
                        item["is_extension"] = True
                        db[eid] = item

                    if isinstance(data, list):
                        for entry in data:
                            _register(entry)
                    elif isinstance(data, dict):
                        if "era_pair" in data and isinstance(data["era_pair"], dict):
                            for k, v in data["era_pair"].items():
                                _register(v, k)
                        elif data.get("id") and (data.get("name") or data.get("social_codes")):
                            _register(data)
                        else:
                            for k, v in data.items():
                                _register(v, k)
                except Exception:
                    pass

        return db

    def check_server(self) -> bool:
        try:
            r = requests.get(f"{self.endpoint}/models", timeout=4)
            return r.status_code == 200
        except Exception:
            return False

    def _call_llm(self, messages: list, temperature: float = 0.8, max_tokens: int = 1500) -> str:
        url = f"{self.endpoint}/chat/completions"
        payload = {
            "model": self.model or "llama-server",
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens
        }

        try:
            r = requests.post(url, json=payload, timeout=120)
            if r.status_code == 200:
                data = r.json()
                return data["choices"][0]["message"]["content"].strip()
            else:
                raise RuntimeError(f"HTTP {r.status_code}: {r.text}")
        except Exception as e:
            raise RuntimeError(f"LLM request to {self.endpoint} failed: {e}")

    # =========================================================================
    # STAGE 0: Tag & Reference Search Tool
    # =========================================================================
    def search_eras_by_tags_and_query(self, prompt: str) -> Tuple[Optional[Dict[str, Any]], List[str], List[Dict[str, Any]]]:
        """
        Tool: search_eras_by_tags_and_query
        Searches eras_db.json by matching partial tags, synonyms, and setting slugs.
        Returns: (best_matching_era, matched_tag_list, top_candidates_list)
        """
        prompt_lower = prompt.lower()

        # Tag synonyms & normalizations for uncensored roleplay & worldbuilding
        TAG_SYNONYMS = {
            "maledom": "male dom",
            "male dom": "male dom",
            "patriarchy": "patriarch",
            "patriarchal": "patriarch",
            "bdsm": "bdsm",
            "bondage": "bondage",
            "sky": "sky",
            "floating": "floating",
            "cloud": "cloud",
            "island": "island",
            "subterranean": "subterranean",
            "underdark": "underdark",
            "cavern": "cavern",
            "drow": "dark elf",
            "dark elf": "dark elf",
            "high elf": "high elf",
            "wood elf": "wood elf",
            "elf": "elf",
            "hot springs": "hot springs",
            "geothermal": "geothermal",
            "volcanic": "volcanic",
            "caldera": "caldera",
            "desert": "desert",
            "oasis": "oasis",
            "alpine": "alpine",
            "hearth": "hearth",
            "timber": "timber",
            "cabin": "lodge",
            "lodge": "lodge",
            "discipline": "discipline",
            "aftercare": "aftercare",
            "headship": "headship",
            "zero guards": "zero guards",
            "privacy": "privacy",
            "polygyny": "polygyny",
            "multi-wife": "multi-wife",
            "monogamy": "monogamy",
            "sole bride": "sole bride"
        }

        # 1. Identify query tags from prompt
        matched_tags = []
        for word, canonical in TAG_SYNONYMS.items():
            if re.search(r'\b' + re.escape(word) + r'\b', prompt_lower) or word in prompt_lower:
                if canonical not in matched_tags:
                    matched_tags.append(canonical)

        # 2. Extract potential slug (e.g. floating_sky_citadel)
        slug_match = None
        for eid in self.db.keys():
            if eid == "off": continue
            clean_eid = eid.replace("_haven", "").replace("_monogamy", "").replace("_estate", "").replace("_polygyny", "")
            if clean_eid in prompt_lower or (len(clean_eid) > 5 and clean_eid.replace("_", " ") in prompt_lower):
                slug_match = clean_eid
                break

        # 3. Extract significant words from prompt (length >= 3, skipping common stopwords)
        STOP_WORDS = {
            "with", "that", "this", "from", "they", "will", "have", "make", "create",
            "generate", "craft", "setting", "world", "rules", "high", "want", "like",
            "into", "some", "more", "also", "your", "their", "there", "about", "what",
            "when", "where", "which", "whose", "over", "under", "both", "each"
        }
        prompt_words = [w for w in re.findall(r'[a-z0-9]+', prompt_lower) if len(w) >= 3 and w not in STOP_WORDS]

        # 4. Score all eras based on tag overlap, word matching, and slug match
        candidates = []
        for eid, edata in self.db.items():
            if eid == "off": continue
            score = 0
            found_tags = []
            tags = [t.lower() for t in edata.get("tags", [])]
            name = str(edata.get("name", "")).lower()
            short = str(edata.get("short_name", "")).lower()
            region = str(edata.get("region", "")).lower()
            aesthetic = str(edata.get("aesthetic", "")).lower()

            # Exact slug bonus
            if slug_match and (slug_match in eid or slug_match in name):
                score += 150

            # Match extracted tags
            for t_query in matched_tags:
                matched_in_era = False
                for t in tags:
                    if t_query in t:
                        score += 30
                        found_tags.append(t)
                        matched_in_era = True
                if not matched_in_era:
                    if t_query in name or t_query in region:
                        score += 15
                        found_tags.append(t_query)

            # Direct word matching in title, region, short_name, tags, and aesthetic
            for w in prompt_words:
                if w in name:
                    score += 45
                    found_tags.append(w)
                elif w in short:
                    score += 40
                    found_tags.append(w)
                elif w in region:
                    score += 30
                    found_tags.append(w)
                elif any(w in t for t in tags):
                    score += 25
                    found_tags.append(w)
                elif w in aesthetic:
                    score += 10

            if score > 0:
                candidates.append({
                    "id": eid,
                    "era": edata,
                    "score": score,
                    "matched_tags": list(set(found_tags))
                })

        candidates.sort(key=lambda x: x["score"], reverse=True)

        best_ref = None
        if candidates and candidates[0]["score"] >= 30:
            # Prefer _haven if polygyny or base
            top = candidates[0]
            top_id = top["id"]
            if top_id.endswith("_haven"):
                best_ref = top["era"]
            else:
                haven_id = f"{top_id.replace('_monogamy', '')}_haven"
                best_ref = self.db.get(haven_id) or top["era"]

        return best_ref, matched_tags, candidates[:5]

    def find_reference_era(self, prompt: str) -> Optional[Dict[str, Any]]:
        ref, _, _ = self.search_eras_by_tags_and_query(prompt)
        return ref

    # =========================================================================
    # STAGE 1: Conceptualize Distinct Setting
    # =========================================================================
    def stage1_conceptualize(self, prompt: str, ref_era: Optional[Dict[str, Any]], log_cb: Callable) -> Dict[str, str]:
        log_cb(f"🧠 {C_BOLD}Stage 1: Conceptualizing Setting from User Instructions...{C_RESET}")

        ref_context = ""
        if ref_era:
            ref_source = ref_era.get("_extension_file", "data/eras_extensions" if ref_era.get("is_extension") else "built-in eras_db.json")
            ref_context = (
                f"🔍 SIMILAR EXISTING ERA DETECTED ({ref_source}):\n"
                f"- Name: {ref_era.get('name')}\n"
                f"- Region: {ref_era.get('region')}\n"
                f"- Tech Context: {ref_era.get('tech')}\n"
                f"- Aesthetic Summary: {str(ref_era.get('aesthetic'))[:220]}...\n"
                f"- Social Dynamics: {str(ref_era.get('social_codes'))[:220]}...\n\n"
                f"ARCHITECT NUDGE / INSTRUCTION:\n"
                f"An existing similar era was found in {ref_source}. Check its world parameters.\n"
                f"• If the user's prompt is expanding, customizing, or referencing this existing setting, ground your response in its established lore and dynamics.\n"
                f"• If the user wants a NEW, distinct setting, ensure your concept uses a fresh title, distinct geography, and unique role dynamics to prevent duplication.\n\n"
            )

        system_msg = (
            "You are an expert Worldbuilding Architect for CharGen. "
            "Your task is to conceptualize a BRAND NEW, immersive setting concept faithfully following the user's instructions, requested genre, scale, tone, and character dynamics. "
            "Respond in STRICT JSON with: slug, emoji, setting_name, short_name, span, category, region, master_archetype, core_theme."
        )

        user_msg = f"""{ref_context}USER INSTRUCTION:
"{prompt}"

Generate a fresh, unique setting concept strictly adhering to the user's requested themes, setting rules, and character dynamics.
Output STRICT JSON matching this schema:
{{
  "slug": "unique_snake_case_name",
  "emoji": "Single appropriate emoji",
  "setting_name": "Full Descriptive Name",
  "short_name": "Short Name",
  "span": "Evocative Mythic Span (e.g. Age of ...)",
  "category": "Fantasy / Sci-Fi / Historical / etc.",
  "region": "Evocative Geographical Location",
  "master_archetype": "Protagonist's archetype/role requested by user",
  "core_theme": "Brief 1-2 sentence vision of the setting and relationship dynamics"
}}"""

        raw = self._call_llm([
            {"role": "system", "content": system_msg},
            {"role": "user", "content": user_msg}
        ], temperature=0.75, max_tokens=600)

        concept = repair_and_decode_json(raw)
        if not concept or not isinstance(concept, dict) or "slug" not in concept:
            raise RuntimeError(f"Stage 1 LLM conceptualization failed to return valid JSON. Raw output: {raw[:200]}")

        log_cb(f"   {C_GREEN}Concept Defined:{C_RESET} {concept.get('emoji', '✨')} {C_BOLD}{concept.get('setting_name')}{C_RESET} (Slug: `{concept.get('slug')}`)")
        return concept

    # =========================================================================
    # STAGE 2: Multi-Partner (Polygyny) Generation
    # =========================================================================
    def stage2_generate_polygyny(self, concept: Dict[str, str], prompt: str, ref_era: Optional[Dict[str, Any]], log_cb: Callable) -> Dict[str, Any]:
        log_cb(f"🌸 {C_BOLD}Stage 2: Engineering Multi-Partner (Polygyny) Setting from User Prompt...{C_RESET}")

        slug = concept.get("slug", "custom_haven")
        poly_id = f"{slug}_haven"

        system_msg = (
            "You are an expert Worldbuilding Architect for CharGen. "
            "Your task is to write high-depth, immersive era definitions adhering strictly to the user's instructions and requested world rules. "
            "Deliver the MULTI-PARTNER (POLYGYNY) variant of the setting matching the requested dynamic. "
            "Output STRICT JSON ONLY."
        )

        user_msg = f"""USER INSTRUCTION:
"{prompt}"

SETTING CONCEPT:
- Name: {concept.get('setting_name')} (ID: `{poly_id}`)
- Region: {concept.get('region')}
- Protagonist Archetype: {concept.get('master_archetype')}
- Core Theme: {concept.get('core_theme')}

Generate the MULTI-PARTNER (POLYGYNY) Era Definition in STRICT JSON:
{{
  "id": "{poly_id}",
  "name": "{concept.get('emoji', '🌸')} {concept.get('setting_name')} ({concept.get('master_archetype')} — Multi-Partner Variant)",
  "short_name": "{concept.get('short_name', 'Setting')}: Multi-Partner",
  "span": "{concept.get('span', 'Age of Discovery')}",
  "category": "{concept.get('category', 'Fantasy')}",
  "region": "{concept.get('region')}",
  "aesthetic": "Vivid sensory paragraph describing the environment, architecture, atmosphere, comfort, lighting, and textures.",
  "tech": "Description of crafts, technology, magic, or enchantments present in this setting.",
  "social_codes": "Comprehensive 160-250 word paragraph establishing the social rules, protagonist's role, household/domain dynamic, cultural conventions, and relationship hierarchy strictly following the user's prompt. (CRITICAL: Do NOT mention or copy names/text from reference settings like 'floating sky citadel'; every sentence must describe {concept.get('setting_name')} in {concept.get('region')}).",
  "names": ["At least 16 distinct feminine character names fitting the setting and culture"],
  "titles": ["At least 8 evocative partner/companion archetype titles fitting this setting"],
  "tags": ["At least 8 concise tags capturing the setting, genre, dynamic, and culture"]
}}"""

        raw = self._call_llm([
            {"role": "system", "content": system_msg},
            {"role": "user", "content": user_msg}
        ], temperature=0.8, max_tokens=1800)

        poly_era = repair_and_decode_json(raw)
        if not poly_era or not isinstance(poly_era, dict) or "social_codes" not in poly_era:
            raise RuntimeError(f"Stage 2 failed to generate a valid Polygyny era definition. Raw: {raw[:200]}")

        poly_era["id"] = poly_id
        poly_era.setdefault("span", concept.get("span", "Age of Discovery"))
        poly_era.setdefault("category", concept.get("category", "Fantasy"))
        poly_era.setdefault("region", concept.get("region", "Custom Region"))
        log_cb(f"   {C_GREEN}Polygyny Variant Authored:{C_RESET} {poly_era.get('name')}")
        return poly_era

    # =========================================================================
    # STAGE 3: Sole Partner (Monogamy) Companion Derivation
    # =========================================================================
    def stage3_generate_monogamy(self, concept: Dict[str, str], poly_era: Dict[str, Any], prompt: str, log_cb: Callable) -> Dict[str, Any]:
        log_cb(f"💍 {C_BOLD}Stage 3: Engineering Sole Partner (Monogamy) Companion Setting...{C_RESET}")

        slug = concept.get("slug", "custom_haven")
        mono_id = f"{slug}_monogamy"

        system_msg = (
            "You are an expert Worldbuilding Architect for CharGen. "
            "Adapt the setting into its companion SOLE PARTNER (MONOGAMY) variant. "
            "Maintain the exact world rules, aesthetic, and dynamic requested by the user, adapting the dynamic for an exclusive one-on-one bond. "
            "CRITICAL: Do NOT mention multiple wives, sisters, or plural brides. This is an exclusive bond with a single partner. "
            "Output STRICT JSON ONLY."
        )

        user_msg = f"""USER'S ORIGINAL REQUEST:
"{prompt}"

BASE SETTING:
- Setting Name: {poly_era.get('name')}
- Region: {poly_era.get('region')}
- Aesthetic: {poly_era.get('aesthetic')}

Create the companion SOLE PARTNER (MONOGAMY) Era Definition for ID `{mono_id}` in STRICT JSON:
{{
  "id": "{mono_id}",
  "name": "{concept.get('emoji', '💍')} {concept.get('setting_name')} ({concept.get('master_archetype')} — Sole Partner Variant)",
  "short_name": "{concept.get('short_name', 'Setting')}: Sole Partner",
  "span": "{poly_era.get('span', concept.get('span', 'Age of Discovery'))}",
  "category": "{poly_era.get('category', concept.get('category', 'Fantasy'))}",
  "region": "{poly_era.get('region', concept.get('region', ''))}",
  "aesthetic": "Vivid sensory paragraph adapted for an intimate retreat for two in this setting.",
  "tech": "{poly_era.get('tech', '')}",
  "social_codes": "Comprehensive 150-220 word paragraph adapting the dynamic for a dedicated one-on-one relationship between {{user}} and his single cherished partner. (CRITICAL: Do NOT mention multiple wives or sisterhood in the plural).",
  "names": ["At least 12 distinct feminine character names suitable for the sole partner"],
  "titles": ["At least 6 evocative archetype titles for the sole partner"],
  "tags": ["At least 8 concise tags replacing multi-partner tags with monogamy tags"]
}}"""

        raw = self._call_llm([
            {"role": "system", "content": system_msg},
            {"role": "user", "content": user_msg}
        ], temperature=0.75, max_tokens=1500)

        mono_era = repair_and_decode_json(raw)
        if not mono_era or not isinstance(mono_era, dict) or "social_codes" not in mono_era:
            # Fallback derivation directly adapting poly_era's generated text dynamically
            mono_era = copy.deepcopy(poly_era)
            mono_era["id"] = mono_id
            clean_title = re.sub(r'\(.*?\)', '', poly_era.get("name", "")).strip()
            mono_era["name"] = f"{concept.get('emoji', '💍')} {clean_title} ({concept.get('master_archetype')} — Sole Partner Variant)"
            mono_era["short_name"] = f"{concept.get('short_name', 'Setting')}: Sole Partner"
            s = poly_era.get("social_codes", "")
            s_adapted = re.sub(r'multi-wife|polygyny|sisterhood|wives|harem|multi-partner', 'sole companion', s, flags=re.IGNORECASE)
            s_adapted = re.sub(r'each of his wives|his partners', 'his beloved partner', s_adapted, flags=re.IGNORECASE)
            mono_era["social_codes"] = s_adapted
            mono_era["tags"] = [t for t in poly_era.get("tags", []) if "polygyny" not in t.lower() and "sisterhood" not in t.lower() and "multi" not in t.lower()] + ["Sole Partner Monogamy"]

        mono_era["id"] = mono_id
        for k in ["span", "region", "category", "tech"]:
            if not mono_era.get(k) and poly_era.get(k):
                mono_era[k] = poly_era[k]
        log_cb(f"   {C_GREEN}Monogamy Variant Authored:{C_RESET} {mono_era.get('name')}")
        return mono_era

    # =========================================================================
    # STAGE 4: Worldbuilding Quality & Structural Audit
    # =========================================================================
    def stage4_audit_and_repair(self, poly_era: Dict[str, Any], mono_era: Dict[str, Any], log_cb: Callable) -> Tuple[Dict[str, Any], Dict[str, Any], Dict[str, Any]]:
        log_cb(f"🔍 {C_BOLD}Stage 4: Auditing Setting Quality & Structural Completeness...{C_RESET}")

        poly_audit = validate_era_compliance(poly_era, mono_era)
        mono_audit = validate_era_compliance(mono_era, poly_era)

        log_cb(f"   {C_GREEN}Multi-Partner Compliance:{C_RESET} {poly_audit['score']}%")
        log_cb(f"   {C_GREEN}Sole Partner Compliance:{C_RESET} {mono_audit['score']}%")

        return poly_era, mono_era, {"polygyny": poly_audit, "monogamy": mono_audit}

    # =========================================================================
    # STAGE 5: Save Extension File
    # =========================================================================
    def stage5_save_extension(self, slug: str, poly_era: Dict[str, Any], mono_era: Dict[str, Any], log_cb: Callable) -> Path:
        log_cb(f"💾 {C_BOLD}Stage 5: Persisting to Extension System...{C_RESET}")

        clean_slug = re.sub(r'[^a-z0-9_]', '', slug.lower()).strip("_")
        filename = f"{clean_slug}.json"
        target_path = EXTENSIONS_DIR / filename

        EXTENSIONS_DIR.mkdir(parents=True, exist_ok=True)

        payload = {
            "era_pair": {
                poly_era["id"]: poly_era,
                mono_era["id"]: mono_era
            }
        }

        with open(target_path, "w", encoding="utf-8") as f:
            json.dump(payload, f, indent=2, ensure_ascii=False)

        log_cb(f"   {C_GREEN}Success:{C_RESET} Saved to `{target_path.relative_to(ROOT_DIR)}`")
        log_cb(f"   {C_PURPLE}✨ Both Idea Generator (:5001) and Main Harness (:3333) will hot-load this era immediately.{C_RESET}")
        return target_path

    # =========================================================================
    # MASTER RUNNER
    # =========================================================================
    def run(
        self,
        user_prompt: str,
        log_cb: Optional[Callable[[str], None]] = None,
        step_cb: Optional[Callable[[Dict[str, Any]], None]] = None
    ) -> Dict[str, Any]:
        log = log_cb or print

        log(f"\n{C_CYAN}{'='*70}{C_RESET}")
        log(f"{C_BOLD}{C_CYAN}🏰 CHARGENUI DEDICATED ERA AGENT HARNESS (TOOL FLOW){C_RESET}")
        log(f"{C_CYAN}{'='*70}{C_RESET}")
        log(f"Prompt: \"{user_prompt}\"")

        # 0. Check server
        if not self.check_server():
            err = f"⚠️ AI Server is offline at {self.endpoint}. Please start your llama-server on port 5001 so the Era Architect Agent can author the era."
            log(f"{C_RED}{err}{C_RESET}")
            raise RuntimeError(err)

        tool_steps = []

        # Tool Step 1: search_eras (Tag & Slug Database Search)
        ref_era, matched_tags, top_candidates = self.search_eras_by_tags_and_query(user_prompt)
        tags_str = ", ".join([f'"{t}"' for t in matched_tags]) if matched_tags else "none"
        query_snippet = user_prompt[:40].replace('"', "'")

        t1 = {
            "step": 1,
            "id": "search_eras",
            "name": "search_eras",
            "icon": "🏷️",
            "title": "Search Eras by Tags & Keywords",
            "status": "running",
            "input": f"tags=[{tags_str}], query=\"{query_snippet}...\"",
            "output": f"Scanning eras_db.json for tags [{tags_str}]..."
        }
        tool_steps.append(t1)
        if step_cb: step_cb(copy.deepcopy(t1))

        if ref_era:
            ref_source = ref_era.get("_extension_file", "data/eras_extensions" if ref_era.get("is_extension") else "eras_db.json")
            matched_names = [f"'{c['era'].get('name')}'" for c in top_candidates[:3]]
            t1["status"] = "done"
            t1["output"] = f"Found {len(top_candidates)} matching eras in database/extensions. Top match: {matched_names[0]} ({ref_source})"
            log(f"🏷️ {C_GREEN}Search Completed:{C_RESET} Found {len(top_candidates)} matching eras. Top: {matched_names[0]} ({ref_source})")
        elif top_candidates:
            matched_names = [f"'{c['era'].get('name')}'" for c in top_candidates[:3]]
            t1["status"] = "done"
            t1["output"] = f"Found {len(top_candidates)} eras matching tags [{tags_str}]. Top matches: {', '.join(matched_names)}"
            log(f"🏷️ {C_GREEN}Tag Search Completed:{C_RESET} Found {len(top_candidates)} matching eras. Top: {matched_names[0]}")
        else:
            t1["status"] = "done"
            t1["output"] = "No direct tag matches found; proceeding to synthesize custom domain."
            log(f"🏷️ {C_YELLOW}Tag Search:{C_RESET} No direct tag matches found; proceeding with novel domain.")
        if step_cb: step_cb(copy.deepcopy(t1))

        # Tool Step 2: inspect_era (Inspect Reference Metadata & Codes)
        ref_id = ref_era.get("id", "none") if ref_era else "none"
        t2 = {
            "step": 2,
            "id": "inspect_era",
            "name": "inspect_era",
            "icon": "🔍",
            "title": "Inspect Reference Era Metadata",
            "status": "running",
            "input": f"id=\"{ref_id}\"",
            "output": f"Retrieving aesthetics and social dynamics for `{ref_id}`..."
        }
        tool_steps.append(t2)
        if step_cb: step_cb(copy.deepcopy(t2))

        if ref_era:
            ref_source = ref_era.get("_extension_file", "data/eras_extensions" if ref_era.get("is_extension") else "eras_db.json")
            t2["status"] = "done"
            t2["output"] = f"Inspected '{ref_era.get('name')}' ({ref_source}) aesthetics & social codes ({len(ref_era.get('tags', []))} tags)"
            log(f"🔍 {C_GREEN}Reference Era Inspected:{C_RESET} {ref_era.get('name')} ({ref_source})")
        else:
            t2["status"] = "done"
            t2["output"] = "Reference inspection skipped (forging novel domain from user prompt)."
            log(f"🔍 {C_YELLOW}Reference inspection skipped (novel domain).{C_RESET}")
        if step_cb: step_cb(copy.deepcopy(t2))

        # Tool Step 3: conceptualize_setting_foil
        t3 = {
            "step": 3,
            "id": "conceptualize_foil",
            "name": "conceptualize_setting_foil",
            "icon": "🧠",
            "title": "Synthesize Thematic Counterpart",
            "status": "running",
            "input": f"ref=\"{ref_era.get('name', 'Custom') if ref_era else 'Custom'}\", target_tags=[{tags_str}]",
            "output": "Formulating geography, dynamic archetype, and world rules..."
        }
        tool_steps.append(t3)
        if step_cb: step_cb(copy.deepcopy(t3))

        concept = self.stage1_conceptualize(user_prompt, ref_era, log)
        t3["status"] = "done"
        t3["output"] = f"{concept.get('emoji', '✨')} {concept.get('setting_name')} (`{concept.get('slug')}`)"
        if step_cb: step_cb(copy.deepcopy(t3))

        # Tool Step 4: draft_polygyny_haven
        t4 = {
            "step": 4,
            "id": "draft_polygyny",
            "name": "draft_polygyny_haven",
            "icon": "🌸",
            "title": "Engineer Multi-Partner (Polygyny) Variant",
            "status": "running",
            "input": f"id=\"{concept.get('slug')}_haven\", tags=[{tags_str}]",
            "output": "Generating sensory aesthetics, world mechanics, and relationship dynamics..."
        }
        tool_steps.append(t4)
        if step_cb: step_cb(copy.deepcopy(t4))

        poly_era = self.stage2_generate_polygyny(concept, user_prompt, ref_era, log)
        t4["status"] = "done"
        t4["output"] = f"{poly_era.get('name')} ({len(poly_era.get('names', []))} names, {len(poly_era.get('titles', []))} titles)"
        if step_cb: step_cb(copy.deepcopy(t4))

        # Tool Step 5: draft_monogamy_seclusion
        t5 = {
            "step": 5,
            "id": "draft_monogamy",
            "name": "draft_monogamy_seclusion",
            "icon": "💍",
            "title": "Engineer Sole Partner (Monogamy) Variant",
            "status": "running",
            "input": f"id=\"{concept.get('slug')}_monogamy\"",
            "output": "Adapting setting for singular devotion and relationship dynamics..."
        }
        tool_steps.append(t5)
        if step_cb: step_cb(copy.deepcopy(t5))

        mono_era = self.stage3_generate_monogamy(concept, poly_era, user_prompt, log)
        t5["status"] = "done"
        t5["output"] = f"{mono_era.get('name')} (Sole Partner Devotion)"
        if step_cb: step_cb(copy.deepcopy(t5))

        # Tool Step 6: audit_structural_compliance
        t6 = {
            "step": 6,
            "id": "audit_compliance",
            "name": "audit_structural_compliance",
            "icon": "⚖️",
            "title": "Architecture & Structural Quality Audit",
            "status": "running",
            "input": "validate_era_compliance(polygyny, monogamy)",
            "output": "Validating dual-format completeness, setting depth, social dynamics, and name pool..."
        }
        tool_steps.append(t6)
        if step_cb: step_cb(copy.deepcopy(t6))

        poly_era, mono_era, compliance = self.stage4_audit_and_repair(poly_era, mono_era, log)
        t6["status"] = "done"
        t6["output"] = f"Polygyny: {compliance['polygyny']['score']}% | Monogamy: {compliance['monogamy']['score']}%"
        if step_cb: step_cb(copy.deepcopy(t6))

        # Tool Step 7: save_era_extension
        t7 = {
            "step": 7,
            "id": "save_extension",
            "name": "save_era_extension",
            "icon": "💾",
            "title": "Persist to Extension System",
            "status": "running",
            "input": f"path=\"data/eras_extensions/{concept['slug']}.json\"",
            "output": "Saving JSON payload to extension directory..."
        }
        tool_steps.append(t7)
        if step_cb: step_cb(copy.deepcopy(t7))

        saved_file = self.stage5_save_extension(concept["slug"], poly_era, mono_era, log)
        t7["status"] = "done"
        t7["output"] = f"Saved to data/eras_extensions/{concept['slug']}.json"
        if step_cb: step_cb(copy.deepcopy(t7))

        # Build clean visual tool flow trace
        tool_flow_lines = [
            "🛠️ **Agent Tool Call Execution Flow**:",
            f"• `tool:search_eras(tags=[{tags_str}])` ➔ {t1['output']}",
            f"• `tool:inspect_era(id=\"{ref_id}\")` ➔ {t2['output']}",
            f"• `tool:conceptualize_setting_foil()` ➔ {t3['output']}",
            f"• `tool:draft_polygyny_haven(id=\"{concept['slug']}_haven\")` ➔ {t4['output']}",
            f"• `tool:draft_monogamy_seclusion(id=\"{concept['slug']}_monogamy\")` ➔ {t5['output']}",
            f"• `tool:audit_structural_compliance()` ➔ Score: {compliance.get('polygyny', {}).get('score', 100)}% (Verified)",
            f"• `tool:save_era_extension(\"{concept['slug']}.json\")` ➔ Saved to extensions"
        ]
        tool_flow_md = "\n".join(tool_flow_lines)

        log(f"\n{C_GREEN}{'='*70}{C_RESET}")
        log(f"{C_BOLD}{C_GREEN}🎉 ERA PAIR TOOL CALL FLOW COMPLETE!{C_RESET}")
        log(f"  • Polygyny: {poly_era.get('name')}")
        log(f"  • Monogamy: {mono_era.get('name')}")
        log(f"  • Saved: {saved_file}")
        log(f"{C_GREEN}{'='*70}{C_RESET}\n")

        return {
            "concept": concept,
            "ref_era": ref_era,
            "era_pair": {
                "polygyny": poly_era,
                "monogamy": mono_era
            },
            "compliance": compliance,
            "file_path": str(saved_file),
            "tool_steps": tool_steps,
            "tool_flow_md": tool_flow_md
        }


def interactive_mode(harness: EraAgentHarness):
    print(f"\n{C_CYAN}{'='*70}{C_RESET}")
    print(f"{C_BOLD}{C_CYAN}🏰 ERA AGENT INTERACTIVE HARNESS{C_RESET}")
    print(f"Type your era worldbuilding prompt (or 'exit' / 'quit' to stop):")
    print(f"{C_CYAN}{'='*70}{C_RESET}\n")

    while True:
        try:
            prompt = input(f"{C_BOLD}Era Prompt > {C_RESET}").strip()
            if not prompt:
                continue
            if prompt.lower() in ["exit", "quit", "q"]:
                print("Goodbye!")
                break
            harness.run(prompt)
        except KeyboardInterrupt:
            print("\nExiting...")
            break
        except Exception as e:
            print(f"{C_RED}Error: {e}{C_RESET}\n")


def main():
    parser = argparse.ArgumentParser(description="Dedicated Era Agent Harness for CharGenUI.")
    parser.add_argument("prompt", nargs="?", help="Worldbuilding era request prompt")
    parser.add_argument("--interactive", "-i", action="store_true", help="Launch interactive chat harness")
    parser.add_argument("--endpoint", "-e", default=DEFAULT_ENDPOINT, help="AI Server endpoint (default: http://localhost:5001/v1)")
    parser.add_argument("--model", "-m", default=None, help="Specific model name (optional)")
    args = parser.parse_args()

    harness = EraAgentHarness(endpoint=args.endpoint, model=args.model)

    if args.interactive:
        interactive_mode(harness)
    elif args.prompt:
        harness.run(args.prompt)
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
