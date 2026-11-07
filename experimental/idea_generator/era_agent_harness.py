#!/usr/bin/env python3
"""
idea_generator/era_agent_harness.py
-----------------------------------
Agentic Era Architect Harness for CharGenUI.

Replaces the old linear 5-stage pipeline + static keyword router with a true
iterate-observe-revise tool loop (Hermes/opencode-style):

  1. The LLM receives a tool schema (OpenAI `tools` field) and drives the turn.
  2. Native `tool_calls` are used when the server returns them; otherwise the
     loop falls back to a robust `<tool:name>{json}</tool:name>` tag protocol
     (plus a pythonic `<|tool_call_start|>[fn(args)]<|tool_call_end|>` shim
     for LFM2.5-style models).
  3. Hard invariants are enforced by the tool executors themselves:
       - draft_era_pair is rejected until search_eras/inspect_era ran this turn
       - save_era_extension auto-runs a similarity gate and refuses near-duplicates
       - finalize is rejected while a staged draft is unsaved
  4. On failure the loop hard-errors (no silent fallback, no free-prose claims).

Usage:
  python3 idea_generator/era_agent_harness.py "make an era similar to floating_sky_citadel"
  python3 idea_generator/era_agent_harness.py --interactive
"""

import sys
import os
import re
import json
import copy
import argparse
import ast
import logging
import requests
import threading
from pathlib import Path
from typing import Dict, Any, Optional, List, Callable, Tuple

# Locate repository root (whether in scripts/, idea_generator/, or project root)
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
        get_era_info,
        search_eras_semantic,
        validate_era_compliance,
        save_extension_file,
    )
except ImportError:
    from eras_data import (
        get_era_info,
        search_eras_semantic,
        validate_era_compliance,
        save_extension_file,
    )


def repair_and_decode_json(raw_text: str) -> Optional[Any]:
    """
    Self-contained, robust JSON parser for local LLM output:
    - Strips markdown codeblock fences
    - Extracts outermost {...} or [...]
    - Cleans trailing commas
    - Fixes unescaped newlines inside strings
    """
    if not raw_text or not raw_text.strip():
        return None

    text = raw_text.strip()
    text = re.sub(r"^```(?:json)?\s*", "", text, flags=re.IGNORECASE)
    text = re.sub(r"\s*```$", "", text)

    start_obj, end_obj = text.find("{"), text.rfind("}")
    start_arr, end_arr = text.find("["), text.rfind("]")
    if start_obj != -1 and end_obj > start_obj and (
        start_arr == -1 or start_obj < start_arr
    ):
        text = text[start_obj : end_obj + 1]
    elif start_arr != -1 and end_arr > start_arr:
        text = text[start_arr : end_arr + 1]

    cleaned = re.sub(r",\s*([\}\]])", r"\1", text)

    try:
        return json.loads(cleaned)
    except Exception:
        pass

    try:
        def _escape_newlines(m):
            return m.group(0).replace("\n", "\\n").replace("\r", "\\r")

        sanitized = re.sub(r'"([^"\\]*(\\.[^"\\]*)*)"', _escape_newlines, cleaned)
        return json.loads(sanitized)
    except Exception:
        pass

    return None


DEFAULT_ENDPOINT = "http://localhost:5001/v1"
LLM_TIMEOUT = 1800

C_CYAN = "\033[96m"
C_GREEN = "\033[92m"
C_YELLOW = "\033[93m"
C_RED = "\033[91m"
C_PURPLE = "\033[95m"
C_BOLD = "\033[1m"
C_RESET = "\033[0m"

LOGGER = logging.getLogger("chargenui.era_agent_harness")


def configure_logging(level: str = "WARNING", log_file: Optional[str] = None) -> None:
    """Configure CLI diagnostics without mixing them into the tool-flow output."""
    handlers: List[logging.Handler] = [
        logging.StreamHandler(sys.stderr),
    ]
    if log_file:
        handlers.append(logging.FileHandler(log_file, encoding="utf-8"))

    logging.basicConfig(
        level=getattr(logging, level.upper()),
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
        handlers=handlers,
        force=True,
    )


class EraHarnessError(RuntimeError):
    """Hard failure of the agentic era loop. Never silently swallowed."""


# ---------------------------------------------------------------------------
# Tool schema (OpenAI function-calling format)
# ---------------------------------------------------------------------------
ERA_TOOL_DEFINITIONS = [
    {
        "type": "function",
        "function": {
            "name": "search_eras",
            "description": (
                "Semantic search across eras_db.json and data/eras_extensions/*.json. "
                "Can filter by category (e.g. category='Fantasy' or 'Medieval') to find eras in a specific setting bucket. "
                "MUST be called before drafting any new setting, to check for similar "
                "or redundant eras. Returns top matches with scores."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "Theme keywords, region, dynamics, e.g. 'floating sky citadel bdsm patriarchy'",
                    },
                    "category": {
                        "type": "string",
                        "description": "Optional category filter: 'Fantasy', 'Medieval', 'Antiquity', 'Renaissance', 'Enlightenment', 'Victorian', '20th Century', 'Sci-Fi', etc.",
                    }
                },
                "required": ["query"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "list_era_categories",
            "description": "Lists all available era categories in the database with their current era counts.",
            "parameters": {
                "type": "object",
                "properties": {},
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "inspect_era",
            "description": "Read the full spec of an existing era (plus its counterpart half of the pair).",
            "parameters": {
                "type": "object",
                "properties": {
                    "id": {"type": "string", "description": "Era id, e.g. floating_sky_citadel_haven"}
                },
                "required": ["id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "draft_era_pair",
            "description": (
                "Stage a complete paired setting (NOT saved yet). Requires search_eras "
                "to have been called earlier this turn. Both polygyny and monogamy "
                "variants are mandatory."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "slug": {"type": "string", "description": "unique_snake_case_name"},
                    "polygyny": {
                        "type": "object",
                        "description": "Multi-Partner era: name, short_name, span, category, region, aesthetic, tech, social_codes, names[], titles[], tags[]",
                    },
                    "monogamy": {
                        "type": "object",
                        "description": "Sole Partner era: same fields, exclusive one-on-one dynamic",
                    },
                },
                "required": ["slug", "polygyny", "monogamy"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "validate_pair",
            "description": "Dry-run the 5-Pillars compliance audit on the staged draft. Returns scores and issues.",
            "parameters": {"type": "object", "properties": {}},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "save_era_extension",
            "description": (
                "Persist the staged draft to an extension file (<slug>.json). "
                "REFUSED if too similar to an existing era or below the quality floor. "
                "Supports specifying destination ('project_data' for data/eras_extensions or "
                "'local_user' for OS user app data ~/.local/share on Linux or AppData on Windows)."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "slug": {"type": "string", "description": "Optional; defaults to the staged draft slug"},
                    "destination": {
                        "type": "string",
                        "enum": ["project_data", "local_user"],
                        "description": "Storage destination: 'project_data' (default) or 'local_user' (~/.local or AppData)."
                    }
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "finalize",
            "description": (
                "End the turn with a user-facing summary message. REJECTED while a "
                "staged draft remains unsaved — call save_era_extension first."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "message": {"type": "string", "description": "Final user-facing summary"}
                },
                "required": ["message"],
            },
        },
    },
]


ERA_SYSTEM_PROMPT = """You are the Master Era Architect for CharGen — an agentic, tool-using worldbuilder.
Your mission: invent, refine, and forge paired ERA DEFINITIONS strictly following the user's instructions.

================================================================
TOOL LOOP CONTRACT
================================================================
You drive the turn by calling tools. You may issue multiple tool calls in parallel or sequence within a single turn when appropriate (e.g. searching, drafting, inspecting, or validating).
Typical creation flow: search_eras -> draft_era_pair -> validate_pair -> (re-draft if issues) -> save_era_extension -> finalize.
For read-only questions: search_eras / inspect_era -> finalize with the answer.

Tools:
1. search_eras {"query": "...", "category": "..."} — semantic DB search across eras. Category filter optional (e.g. "Fantasy", "Medieval"). ALWAYS call this before drafting; drafts are rejected without it.
2. list_era_categories {} — lists all categories in the database with era counts.
3. inspect_era {"id": "..."} — full spec of an existing era + its counterpart.
4. draft_era_pair {"slug": "...", "polygyny": {...}, "monogamy": {...}} — stage a pair (not saved).
5. validate_pair {} — 5-Pillars compliance audit of the staged draft.
6. save_era_extension {"slug": "..."} — persist to data/eras_extensions/<slug>.json. Near-duplicates of existing eras are refused.
7. finalize {"message": "..."} — end the turn. Refused while a staged draft is unsaved.

================================================================
ERA OBJECT SCHEMA (for draft_era_pair)
================================================================
Both variants need:
- "name": "Emoji + Setting Name (Dynamic — Multi-Partner / Polygyny)" or "(Dynamic — Sole Partner / Monogamy)"
- "short_name", "span", "category", "region"
- "aesthetic": vivid sensory paragraph (>= 40 chars)
- "tech": world technology / magic / crafts (>= 25 chars)
- "social_codes": 100-250 word paragraph (>= 80 chars) of etiquette, hierarchy, relationship dynamic
- "names": 12-20 culturally fitting feminine names
- "titles": 6-10 companion archetype titles. For the MONOGAMY variant, titles must fit an exclusive
  sole-partner dynamic (e.g. "The Sole Bride", "The Forge Master's Wife") — never plural-wife roles
  like "Blade-Wife" or "Glass-Wife"; those belong only in the polygyny variant.
- "tags": 6-10 concise tags
IDs are auto-set to <slug>_haven / <slug>_monogamy. The monogamy variant is an exclusive
one-on-one bond — never plural wives.

================================================================
RULES
================================================================
- Faithful instruction following, zero dogma: honor whatever genre, hierarchy, tone the user asks for.
- STRICT ZERO-PROCEDURAL RULE: never invent canned template text; author genuinely from the prompt.
- If search reveals a near-duplicate, differentiate (fresh region, distinct dynamics, new naming) and re-draft.
- Never claim a setting was created/saved unless save_era_extension succeeded.
- No prose outside tool calls except tiny status notes between calls.
"""


# ---------------------------------------------------------------------------
# Harness
# ---------------------------------------------------------------------------
class EraAgentHarness:
    """
    Agentic multi-turn tool loop for authoring paired eras.
    Model-agnostic: hybrid native tool_calls + tag protocol fallback.
    """

    def __init__(
        self,
        endpoint: str = DEFAULT_ENDPOINT,
        model: Optional[str] = None,
        max_iterations: Optional[int] = None,
        min_save_score: int = 55,
        corrective_budget: int = 1,
    ):
        self.endpoint = endpoint.rstrip("/")
        self.model = model
        self.max_iterations = max_iterations
        self.min_save_score = min_save_score
        self.corrective_budget = corrective_budget

    @staticmethod
    def _cancelled(cancel_event: Optional[threading.Event]) -> bool:
        return bool(cancel_event and cancel_event.is_set())

    # -------------------------------------------------------------------------
    # LLM transport
    # -------------------------------------------------------------------------
    def check_server(self) -> bool:
        try:
            r = requests.get(f"{self.endpoint}/models", timeout=30)
            LOGGER.debug("Server health check returned HTTP %s", r.status_code)
            return r.status_code == 200
        except requests.RequestException as exc:
            LOGGER.debug("Server health check failed for %s: %s", self.endpoint, exc)
            return False

    def _post_chat(
        self,
        messages: List[Dict[str, Any]],
        temperature: float = 0.7,
        max_tokens: int = 5000,
        use_tools: bool = True,
    ) -> Dict[str, Any]:
        url = f"{self.endpoint}/chat/completions"
        payload: Dict[str, Any] = {
            "model": self.model or "llama-server",
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }
        if use_tools:
            payload["tools"] = ERA_TOOL_DEFINITIONS

        try:
            LOGGER.debug(
                "POST %s (messages=%d, tools=%s, model=%s)",
                url,
                len(messages),
                use_tools,
                self.model or "llama-server",
            )
            r = requests.post(url, json=payload, timeout=LLM_TIMEOUT)
        except Exception as e:
            LOGGER.exception("LLM request failed")
            raise EraHarnessError(f"LLM request to {self.endpoint} failed: {e}")

        if r.status_code != 200:
            # Some servers reject the `tools` field when the chat template lacks
            # native function-calling support -> retry once in tag-only mode.
            if use_tools and r.status_code in (400, 422):
                LOGGER.warning(
                    "LLM rejected native tools with HTTP %s; retrying without tools",
                    r.status_code,
                )
                return self._post_chat(messages, temperature, max_tokens, use_tools=False)
            LOGGER.error("LLM returned HTTP %s: %s", r.status_code, r.text[:300])
            raise EraHarnessError(f"LLM returned HTTP {r.status_code}: {r.text[:300]}")

        data = r.json()
        msg = (data.get("choices") or [{}])[0].get("message") or {}
        return msg

    # -------------------------------------------------------------------------
    # Tool-call parsing (native / tag / pythonic)
    # -------------------------------------------------------------------------
    @staticmethod
    def _parse_kwarg_string(s: str) -> Dict[str, Any]:
        """Parse `k="v", n=2, flag` style kwargs into a dict."""
        out: Dict[str, Any] = {}
        for m in re.finditer(r'([a-zA-Z_]\w*)\s*=\s*("(?:[^"\\]|\\.)*"|\'(?:[^\'\\]|\\.)*\'|-?\d+(?:\.\d+)?|True|False|None)', s):
            key, raw_val = m.group(1), m.group(2)
            try:
                out[key] = ast.literal_eval(raw_val)
            except Exception:
                out[key] = raw_val.strip("\"'")
        return out

    def _extract_tool_calls(self, msg: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Returns normalized calls: [{"id": str|None, "name": str, "args": dict}]
        Priority: native tool_calls -> <tool:name>{json}</tool:name> tags -> pythonic shim.
        """
        # 1. Native OpenAI-style tool_calls
        native = msg.get("tool_calls") or []
        calls = []
        for tc in native:
            fn = tc.get("function") or {}
            name = (fn.get("name") or "").strip()
            raw_args = fn.get("arguments") or "{}"
            args = None
            if isinstance(raw_args, dict):
                args = raw_args
            elif isinstance(raw_args, str):
                args = repair_and_decode_json(raw_args)
                if args is None:
                    try:
                        args = json.loads(raw_args)
                    except Exception:
                        args = None
            if name and isinstance(args, dict):
                calls.append({"id": tc.get("id"), "name": name, "args": args})
        if calls:
            return calls

        content = msg.get("content") or ""
        if not isinstance(content, str):
            content = str(content)

        # 2. XML-style tag protocol: <tool:name>{json}</tool:name> or self-closing <tool:name k="v" />
        tag_re = re.compile(
            r"<tool:([a-zA-Z_][\w]*)(\s[^>]*?)?(?:/>|>([\s\S]*?)</tool:\1>)", re.IGNORECASE
        )
        for m in tag_re.finditer(content):
            name = m.group(1).strip()
            attrs = (m.group(2) or "").strip()
            body = (m.group(3) or "").strip()
            args: Dict[str, Any] = {}
            if body:
                parsed = repair_and_decode_json(body)
                if isinstance(parsed, dict):
                    args = parsed
                elif parsed is not None:
                    args = {"value": parsed}
            elif attrs:
                # self-closing with attributes: <tool:inspect_era id="..."/>
                args = self._parse_kwarg_string(attrs)
            calls.append({"id": None, "name": name, "args": args})
        if calls:
            return calls

        # 3. Pythonic LFM2.5-style shim: <|tool_call_start|>[fn(k="v")]<|tool_call_end|>
        py_re = re.compile(
            r"<\|tool_call_start\|>\s*\[?\s*([a-zA-Z_][\w]*)\s*\(([^)]*)\)\s*\]?<\|tool_call_end\|>",
            re.IGNORECASE,
        )
        for m in py_re.finditer(content):
            name = m.group(1).strip()
            args = self._parse_kwarg_string(m.group(2))
            calls.append({"id": None, "name": name, "args": args})

        return calls

    @staticmethod
    def _strip_tool_artifacts(content: str) -> str:
        if not content:
            return ""
        c = re.sub(r"<tool:[^>]+>[\s\S]*?</tool:\w+>", "", content)
        c = re.sub(r"<tool:[^>]+/?>", "", c)
        c = re.sub(r"<\|tool_call_start\|>[\s\S]*?<\|tool_call_end\|>", "", c)
        return c.strip()

    # -------------------------------------------------------------------------
    # Turn state
    # -------------------------------------------------------------------------
    def _new_state(self) -> Dict[str, Any]:
        return {
            "draft": None,          # {"slug": str, "poly": dict, "mono": dict}
            "searched": False,      # search_eras or inspect_era succeeded this turn
            "saved": None,          # {"slug", "path", "filename"}
            "finalize_message": None,
            "compliance": {},
        }

    @staticmethod
    def _clean_slug(slug: str) -> str:
        return re.sub(r"[^a-z0-9_]", "", str(slug or "custom_era").lower()).strip("_") or "custom_era"

    @staticmethod
    def _base_slug(era_id: str) -> str:
        eid = str(era_id or "").lower()
        for suffix in ("_haven", "_monogamy", "_polygyny", "_estate"):
            if eid.endswith(suffix):
                return eid[: -len(suffix)]
        return eid

    @staticmethod
    def _name_tokens(name: str) -> set:
        return {w for w in re.findall(r"[a-z0-9]+", str(name or "").lower()) if len(w) > 2}

    _DYNAMIC_STOPWORDS = {
        "the", "and", "age", "era", "setting", "dynamic", "variant", "multi", "partner",
        "partners", "sole", "wife", "wives", "wife's", "polygyny", "monogamy", "haven",
        "seclusion", "sanctuary", "bride", "brides", "household", "mode", "version",
        "multiwife", "multihusband",
    }

    @classmethod
    def _content_tokens(cls, name: str) -> set:
        return {
            w for w in re.findall(r"[a-z0-9]+", str(name or "").lower())
            if len(w) > 2 and w not in cls._DYNAMIC_STOPWORDS
        }

    def _find_similarity_conflict(self, poly: Dict[str, Any], slug: str) -> Optional[str]:
        """Return a conflict description after deterministic filtering and AI review.

        An identical base slug remains a hard local collision. Content matches are
        only candidates: the configured LLM makes the final judgment so thematic
        overlap is not treated as duplication automatically.
        """
        slug_l = self._clean_slug(slug)
        name_tokens = self._content_tokens(poly.get("name", ""))
        query = " ".join(
            [str(poly.get("name", "")), str(poly.get("region", ""))]
            + [str(t) for t in (poly.get("tags") or [])[:6]]
        ).strip()

        try:
            matches = search_eras_semantic(query) or []
        except Exception:
            matches = []

        best = None
        best_score = 0.0
        for cand in matches[:10]:
            cand_id = str(cand.get("id", ""))
            if self._clean_slug(self._base_slug(cand_id)) == slug_l:
                return (
                    f"Existing era '{cand.get('name')}' (`{cand_id}`) uses the same base slug "
                    f"as your draft (`{slug_l}`). Choose a fresh slug/setting."
                )
            ct = self._content_tokens(cand.get("name", ""))
            if name_tokens and ct:
                jaccard = len(name_tokens & ct) / max(1, len(name_tokens | ct))
                if jaccard > best_score:
                    best_score = jaccard
                    best = cand

        if best is not None and best_score >= 0.55:
            return self._ai_similarity_conflict(poly, best, best_score)
        return None

    def _ai_similarity_conflict(
        self,
        draft: Dict[str, Any],
        candidate: Dict[str, Any],
        lexical_score: float,
    ) -> Optional[str]:
        """Ask the LLM whether a likely lexical match is actually redundant."""
        prompt = {
            "draft": {
                "name": draft.get("name"),
                "region": draft.get("region"),
                "aesthetic": str(draft.get("aesthetic", ""))[:900],
                "social_codes": str(draft.get("social_codes", ""))[:1200],
                "tags": (draft.get("tags") or [])[:10],
            },
            "existing": {
                "id": candidate.get("id"),
                "name": candidate.get("name"),
                "region": candidate.get("region"),
                "aesthetic": str(candidate.get("aesthetic", ""))[:900],
                "social_codes": str(candidate.get("social_codes", ""))[:1200],
                "tags": (candidate.get("tags") or [])[:10],
            },
        }
        messages = [
            {
                "role": "system",
                "content": (
                    "You are a strict originality reviewer for paired worldbuilding eras. "
                    "Decide whether the draft is a redundant copy of the existing era, not "
                    "whether they merely share a genre or relationship theme. Compare setting, "
                    "social mechanics, aesthetic, and naming. Respond with JSON only: "
                    '{"similar":true|false,"confidence":0.0,"rationale":"brief reason"}.'
                ),
            },
            {
                "role": "user",
                "content": (
                    f"Lexical prefilter overlap: {lexical_score:.0%}\n"
                    + json.dumps(prompt, ensure_ascii=False)
                ),
            },
        ]
        LOGGER.info(
            "AI similarity review for candidate %s (lexical prefilter %.0f%%)",
            candidate.get("id"),
            lexical_score * 100,
        )
        try:
            response = self._post_chat(
                messages,
                temperature=0.0,
                max_tokens=300,
                use_tools=False,
            )
            raw = response.get("content") if isinstance(response, dict) else ""
            verdict = repair_and_decode_json(str(raw or ""))
            if not isinstance(verdict, dict) or not isinstance(verdict.get("similar"), bool):
                raise EraHarnessError("AI similarity review returned invalid JSON")
        except Exception as exc:
            LOGGER.exception("AI similarity review failed")
            return None

        if not verdict["similar"]:
            LOGGER.info(
                "AI similarity review cleared candidate %s: %s",
                candidate.get("id"),
                str(verdict.get("rationale") or "").strip(),
            )
            return None

        try:
            confidence = float(verdict.get("confidence", 0.0))
        except (TypeError, ValueError):
            confidence = 0.0
        if confidence < 0.8:
            LOGGER.warning(
                "AI similarity review was inconclusive for %s (confidence %.0f%%); allowing save",
                candidate.get("id"),
                confidence * 100,
            )
            return None

        rationale = str(verdict.get("rationale") or "the settings share the same core identity").strip()
        return (
            f"AI judged this too similar to existing era '{candidate.get('name')}' "
            f"(`{candidate.get('id')}`, confidence {confidence:.0%}): {rationale} "
            "Differentiate the setting, naming, and social dynamics, then re-draft."
        )

    # -------------------------------------------------------------------------
    # Tool executors (all return a string result fed back to the model)
    # -------------------------------------------------------------------------
    def _tool_search_eras(self, args: Dict[str, Any], state: Dict[str, Any]) -> str:
        query = str(args.get("query") or "").strip()
        cat_filter = str(args.get("category") or "").strip() or "All"
        if not query and cat_filter == "All":
            return json.dumps({"ok": False, "error": "query or category is required"})
        try:
            matches = search_eras_semantic(query=query, category_filter=cat_filter) or []
        except Exception as e:
            return json.dumps({"ok": False, "error": f"search failed: {e}"})

        top = matches[:8]
        if not top:
            state["searched"] = True
            return json.dumps(
                {"ok": True, "matches": 0, "note": f"No matching eras found in '{cat_filter}'. Your concept is distinct — safe to draft."}
            )

        state["searched"] = True
        out = []
        for c in top:
            out.append(
                {
                    "id": c.get("id"),
                    "name": c.get("name"),
                    "category": c.get("category"),
                    "region": c.get("region"),
                    "score": c.get("relevance_score"),
                    "tags": (c.get("tags") or [])[:8],
                    "source": "extension" if c.get("is_extension") else "eras_db.json",
                }
            )
        return json.dumps({"ok": True, "matches": len(top), "results": out}, ensure_ascii=False)

    def _tool_list_era_categories(self, args: Dict[str, Any], state: Dict[str, Any]) -> str:
        try:
            from eras_data import search_era_categories
            cats = search_era_categories("")
            state["searched"] = True
            return json.dumps({"ok": True, "categories": cats}, ensure_ascii=False)
        except Exception as e:
            return json.dumps({"ok": False, "error": f"Failed to list categories: {e}"})

    def _tool_inspect_era(self, args: Dict[str, Any], state: Dict[str, Any]) -> str:
        era_id = str(args.get("id") or "").strip()
        if not era_id:
            return json.dumps({"ok": False, "error": "id is required"})
        era = get_era_info(era_id)
        if not era:
            return json.dumps({"ok": False, "error": f"era '{era_id}' not found"})

        state["searched"] = True
        counterpart = None
        cid = ""
        if era_id.endswith("_haven"):
            cid = era_id[: -len("_haven")] + "_monogamy"
        elif era_id.endswith("_monogamy"):
            cid = era_id[: -len("_monogamy")] + "_haven"
        if cid:
            counterpart = get_era_info(cid)

        def _brief(e: Dict[str, Any]) -> Dict[str, Any]:
            return {
                "id": e.get("id"),
                "name": e.get("name"),
                "region": e.get("region"),
                "span": e.get("span"),
                "category": e.get("category"),
                "aesthetic": str(e.get("aesthetic", ""))[:400],
                "tech": str(e.get("tech", ""))[:300],
                "social_codes": str(e.get("social_codes", ""))[:600],
                "tags": e.get("tags", []),
            }

        payload = {"ok": True, "era": _brief(era)}
        if counterpart:
            payload["counterpart"] = _brief(counterpart)
        return json.dumps(payload, ensure_ascii=False)

    def _tool_draft_era_pair(self, args: Dict[str, Any], state: Dict[str, Any]) -> str:
        if not state.get("searched"):
            return json.dumps(
                {
                    "ok": False,
                    "error": (
                        "Collision check not performed. Call search_eras with your concept's "
                        "name/region/tags FIRST, then re-issue draft_era_pair."
                    ),
                }
            )

        slug = self._base_slug(self._clean_slug(args.get("slug") or ""))
        poly = args.get("polygyny")
        mono = args.get("monogamy")
        if not slug:
            return json.dumps({"ok": False, "error": "slug is required"})
        if not isinstance(poly, dict) or not isinstance(mono, dict):
            return json.dumps(
                {"ok": False, "error": "both 'polygyny' and 'monogamy' must be era objects"}
            )
        for label, era in (("polygyny", poly), ("monogamy", mono)):
            if not str(era.get("name") or "").strip():
                return json.dumps({"ok": False, "error": f"{label}.name is required"})
            if not str(era.get("social_codes") or "").strip():
                return json.dumps(
                    {"ok": False, "error": f"{label}.social_codes is required (100-250 word paragraph)"}
                )

        poly = copy.deepcopy(poly)
        mono = copy.deepcopy(mono)
        poly["id"] = f"{slug}_haven"
        mono["id"] = f"{slug}_monogamy"
        for key in ("span", "category", "region", "tech"):
            if not mono.get(key) and poly.get(key):
                mono[key] = poly[key]

        state["draft"] = {"slug": slug, "poly": poly, "mono": mono}
        poly_audit = validate_era_compliance(poly, mono)
        mono_audit = validate_era_compliance(mono, poly)
        state["compliance"] = {"polygyny": poly_audit, "monogamy": mono_audit}
        return json.dumps(
            {
                "ok": True,
                "staged": f"{poly['id']} + {mono['id']}",
                "scores": {
                    "polygyny": poly_audit.get("score"),
                    "monogamy": mono_audit.get("score"),
                },
                "next": "Call validate_pair for details, then save_era_extension.",
            },
            ensure_ascii=False,
        )

    def _tool_validate_pair(self, args: Dict[str, Any], state: Dict[str, Any]) -> str:
        draft = state.get("draft")
        if not draft:
            return json.dumps({"ok": False, "error": "No staged draft. Call draft_era_pair first."})
        poly_audit = validate_era_compliance(draft["poly"], draft["mono"])
        mono_audit = validate_era_compliance(draft["mono"], draft["poly"])
        state["compliance"] = {"polygyny": poly_audit, "monogamy": mono_audit}

        def _rep(a: Dict[str, Any]) -> Dict[str, Any]:
            return {
                "score": a.get("score"),
                "issues": a.get("issues", []),
                "warnings": a.get("warnings", []),
            }

        scores = [poly_audit.get("score", 0), mono_audit.get("score", 0)]
        below = [s for s in scores if (s or 0) < self.min_save_score]
        return json.dumps(
            {
                "ok": True,
                "polygyny": _rep(poly_audit),
                "monogamy": _rep(mono_audit),
                "save_threshold": self.min_save_score,
                "below_threshold": bool(below),
                "next": "Fix issues by re-drafting if below threshold, then save_era_extension.",
            },
            ensure_ascii=False,
        )

    def _tool_save_era_extension(self, args: Dict[str, Any], state: Dict[str, Any]) -> str:
        draft = state.get("draft")
        if not draft:
            return json.dumps(
                {"ok": False, "error": "No staged draft. Call draft_era_pair first (after search_eras)."}
            )

        requested_slug = args.get("slug")
        if requested_slug:
            cleaned_req = self._base_slug(self._clean_slug(requested_slug))
            if cleaned_req != draft["slug"]:
                return json.dumps(
                    {
                        "ok": False,
                        "error": (
                            f"Slug mismatch: staged draft is for '{draft['slug']}', but save requested '{cleaned_req}'. "
                            "You cannot save stale era content under a different slug. "
                            "Call draft_era_pair with the new slug and its unique content first."
                        ),
                    },
                    ensure_ascii=False,
                )

        slug = draft["slug"]
        poly = copy.deepcopy(draft["poly"])
        mono = copy.deepcopy(draft["mono"])
        poly["id"] = f"{slug}_haven"
        mono["id"] = f"{slug}_monogamy"

        conflict = self._find_similarity_conflict(poly, slug)
        if conflict:
            return json.dumps({"ok": False, "error": f"Similarity gate: {conflict}"}, ensure_ascii=False)

        poly_audit = validate_era_compliance(poly, mono)
        mono_audit = validate_era_compliance(mono, poly)
        state["compliance"] = {"polygyny": poly_audit, "monogamy": mono_audit}
        scores = [poly_audit.get("score", 0) or 0, mono_audit.get("score", 0) or 0]
        if min(scores) < self.min_save_score:
            return json.dumps(
                {
                    "ok": False,
                    "error": (
                        f"Quality floor not met (scores {scores[0]}% / {scores[1]}%, "
                        f"minimum {self.min_save_score}%). Issues: "
                        f"{(poly_audit.get('issues') or []) + (mono_audit.get('issues') or [])}. "
                        "Fix via draft_era_pair re-draft, then save again."
                    ),
                },
                ensure_ascii=False,
            )

        destination = str(args.get("destination") or "project_data")
        try:
            result = save_extension_file(
                f"{slug}.json", {"era_pair": {poly["id"]: poly, mono["id"]: mono}}, destination=destination
            )
        except Exception as e:
            return json.dumps({"ok": False, "error": f"file write failed: {e}"})

        # Clear staged draft so a subsequent turn or file cannot accidentally reuse this draft
        state["last_saved_draft"] = {"slug": slug, "poly": poly, "mono": mono}
        state["draft"] = None
        dest_val = result.get("destination", "project_data")
        file_path = result.get("filePath", f"data/eras_extensions/{slug}.json")
        state["saved"] = {
            "slug": slug,
            "path": file_path,
            "filename": f"{slug}.json",
            "destination": dest_val,
        }
        return json.dumps(
            {
                "ok": True,
                "path": file_path,
                "destination": dest_val,
                "scores": {"polygyny": scores[0], "monogamy": scores[1]},
                "next": "Call finalize with a user-facing summary.",
            },
            ensure_ascii=False,
        )

    def _tool_finalize(self, args: Dict[str, Any], state: Dict[str, Any]) -> str:
        if state.get("draft") and not state.get("saved"):
            return json.dumps(
                {
                    "ok": False,
                    "error": (
                        "You have an unsaved staged draft. Call save_era_extension first, "
                        "or re-draft. finalize is refused to prevent unsaved claims."
                    ),
                }
            )
        message = str(args.get("message") or "").strip() or "Done."
        state["finalize_message"] = message
        return json.dumps({"ok": True, "finalizing": True})

    _TOOL_EXECUTORS = {
        "search_eras": "_tool_search_eras",
        "inspect_era": "_tool_inspect_era",
        "list_era_categories": "_tool_list_era_categories",
        "draft_era_pair": "_tool_draft_era_pair",
        "validate_pair": "_tool_validate_pair",
        "save_era_extension": "_tool_save_era_extension",
        "finalize": "_tool_finalize",
    }

    _TOOL_META = {
        "search_eras": ("🏷️", "Search Eras Database"),
        "inspect_era": ("🔍", "Inspect Existing Era"),
        "list_era_categories": ("📁", "List Era Categories"),
        "draft_era_pair": ("🌸", "Stage Paired Setting Draft"),
        "validate_pair": ("⚖️", "5-Pillars Compliance Audit"),
        "save_era_extension": ("💾", "Persist to Extensions"),
        "finalize": ("🏁", "Finalize Turn"),
    }

    def _execute_tool(
        self,
        name: str,
        args: Dict[str, Any],
        state: Dict[str, Any],
        step_no: int,
        step_cb: Optional[Callable],
    ) -> Tuple[str, bool]:
        icon, title = self._TOOL_META.get(name, ("🔧", name))
        args_desc = json.dumps(args, ensure_ascii=False)
        if len(args_desc) > 180:
            args_desc = args_desc[:177] + "..."
        step = {
            "step": step_no,
            "id": name,
            "name": name,
            "icon": icon,
            "title": title,
            "status": "running",
            "input": args_desc,
            "output": "Executing...",
        }
        if step_cb:
            step_cb(copy.deepcopy(step))

        executor = self._TOOL_EXECUTORS.get(name)
        if executor is None:
            result = json.dumps(
                {"ok": False, "error": f"Unknown tool '{name}'. Valid tools: {', '.join(self._TOOL_EXECUTORS)}"}
            )
        else:
            try:
                result = getattr(self, executor)(args, state)
            except Exception as e:
                LOGGER.exception("Tool %s failed", name)
                result = json.dumps({"ok": False, "error": f"tool execution failed: {e}"})

        try:
            parsed = json.loads(result)
            ok = bool(parsed.get("ok")) if isinstance(parsed, dict) else True
        except Exception:
            ok = True
        step["status"] = "done" if ok else "error"
        step["output"] = result if len(result) <= 400 else result[:397] + "..."
        if step_cb:
            step_cb(copy.deepcopy(step))
        return result, ok

    # -------------------------------------------------------------------------
    # Master loop
    # -------------------------------------------------------------------------
    def run_turn(
        self,
        user_message: str,
        chat_history: Optional[List[Dict[str, str]]] = None,
        current_draft: Optional[Dict[str, Any]] = None,
        temperature: float = 0.7,
        status_cb: Optional[Callable[[str], None]] = None,
        step_cb: Optional[Callable[[Dict[str, Any]], None]] = None,
        cancel_event: Optional[threading.Event] = None,
        instruction_queue: Optional[Callable[[], List[str]]] = None,
    ) -> Dict[str, Any]:
        """
        Executes one full agentic turn. Raises EraHarnessError on hard failure.
        Returns: era_pair, compliance, tool_steps, tool_flow_md, agent_message, saved_file.
        """
        log = status_cb or (lambda s: None)
        LOGGER.info(
            "Starting turn (endpoint=%s, model=%s, max_iterations=%s)",
            self.endpoint,
            self.model or "llama-server",
            self.max_iterations if self.max_iterations is not None else "unbounded",
        )

        if not self.check_server():
            LOGGER.error("AI server is offline at %s", self.endpoint)
            raise EraHarnessError(
                f"AI server is offline at {self.endpoint}. Start llama-server on port 5001."
            )

        state = self._new_state()
        tool_steps: List[Dict[str, Any]] = []
        executed_keys: set = set()
        corrective_left = self.corrective_budget
        prose_exit_left = 1
        step_no = 0

        messages: List[Dict[str, Any]] = [{"role": "system", "content": ERA_SYSTEM_PROMPT}]

        for h in (chat_history or [])[-6:]:
            role = h.get("role", "user")
            content = h.get("content", "")
            if role in ("user", "assistant") and content:
                messages.append({"role": role, "content": str(content)[:4000]})

        user_content = f'USER REQUEST:\n"{user_message.strip()}"'
        if current_draft and isinstance(current_draft, dict):
            if current_draft.get("polygyny") or current_draft.get("monogamy"):
                user_content = (
                    "CURRENT ACTIVE ERA DRAFT (for refinement context):\n"
                    + json.dumps(current_draft, ensure_ascii=False)[:6000]
                    + "\n\n"
                    + user_content
                )
        messages.append({"role": "user", "content": user_content})

        final_text = ""

        iteration = 0
        while True:
            if self._cancelled(cancel_event):
                raise EraHarnessError("Cancelled by user. No completion was claimed.")
            iteration += 1
            if self.max_iterations is not None and iteration > self.max_iterations:
                raise EraHarnessError(
                    f"Agentic loop exceeded configured limit {self.max_iterations} without finalize."
                )
            LOGGER.info("Agent iteration %d", iteration)
            if instruction_queue:
                for instruction in instruction_queue() or []:
                    text = str(instruction or "").strip()
                    if text:
                        messages.append({"role": "user", "content": f"NEW USER INSTRUCTION (while working):\n{text}"})
            log("🏛️ Era Architect deliberating (:5001)...")
            msg = self._post_chat(messages, temperature=temperature)
            if self._cancelled(cancel_event):
                raise EraHarnessError("Cancelled by user. No completion was claimed.")
            calls = self._extract_tool_calls(msg)
            content = msg.get("content") if isinstance(msg.get("content"), str) else str(msg.get("content") or "")

            if not calls:
                clean = self._strip_tool_artifacts(content)
                if state.get("finalize_message") is not None:
                    final_text = state["finalize_message"]
                    break
                if state.get("draft") and not state.get("saved"):
                    if corrective_left > 0:
                        corrective_left -= 1
                        messages.append({"role": "assistant", "content": content or "(no tool call)"})
                        messages.append(
                            {
                                "role": "user",
                                "content": (
                                    "CORRECTION: You ended without a tool call while a staged draft is unsaved. "
                                    "You MUST call save_era_extension now (or re-draft via draft_era_pair). "
                                    "finalize is only allowed after a successful save."
                                ),
                            }
                        )
                        continue
                    raise EraHarnessError(
                        "Model failed to save the staged draft after corrective retry. "
                        "No file was written."
                    )
                # Prose exit without finalize: allow one correction — the turn contract
                # requires finalize for Q&A endings and continued tool flow for creation.
                if state.get("saved"):
                    # The file was already successfully persisted to disk!
                    # Do not crash and lose progress; treat the assistant's prose as the final message.
                    final_text = self._strip_tool_artifacts(content) or "Turn completed."
                    break

                if prose_exit_left > 0:
                    prose_exit_left -= 1
                    messages.append({"role": "assistant", "content": content or "(no tool call)"})
                    messages.append(
                        {
                            "role": "user",
                            "content": (
                                "CORRECTION: You ended the turn without calling finalize. "
                                "If you were answering a question, restate your answer and end with "
                                'finalize {"message": "..."}. '
                                "If the user asked you to CREATE a setting, nothing has been created "
                                "yet — continue the flow: draft_era_pair, then validate_pair, then "
                                "save_era_extension, then finalize."
                            ),
                        }
                    )
                    continue
                raise EraHarnessError(
                    "Model ended the turn with prose but never called finalize. "
                    "No file was written."
                )

            # Echo assistant turn (native mode needs tool_calls preserved)
            if msg.get("tool_calls"):
                messages.append(
                    {
                        "role": "assistant",
                        "content": content or None,
                        "tool_calls": msg.get("tool_calls"),
                    }
                )
            else:
                messages.append({"role": "assistant", "content": content or "(tool call)"})

            for call in calls:
                if self._cancelled(cancel_event):
                    raise EraHarnessError("Cancelled by user. No further tools were executed.")
                name = call["name"]
                args = call["args"]
                LOGGER.info("Executing tool %s", name)
                # Draft-state tools re-key when the staged slug changes, so a
                # save_era_extension {} retried after a successful re-draft is not
                # treated as a duplicate of the earlier rejected attempt.
                state_scope = ""
                if name in ("draft_era_pair", "save_era_extension", "validate_pair"):
                    d = state.get("draft") or state.get("last_saved_draft")
                    state_scope = d.get("slug", "") if isinstance(d, dict) else ""
                key = (name, state_scope, json.dumps(args, sort_keys=True, ensure_ascii=False, default=str))
                if key in executed_keys:
                    result = json.dumps(
                        {"ok": False, "error": f"Duplicate identical {name} call skipped. Proceed with a different step."}
                    )
                    ok = False
                    icon, title = self._TOOL_META.get(name, ("🔧", name))
                    step_no += 1
                    tool_steps.append(
                        {
                            "step": step_no,
                            "id": name,
                            "name": name,
                            "icon": icon,
                            "title": title,
                            "status": "error",
                            "input": (json.dumps(args, ensure_ascii=False)[:180]),
                            "output": result,
                        }
                    )
                    if step_cb:
                        step_cb(copy.deepcopy(tool_steps[-1]))
                else:
                    step_no += 1
                    log(f"🛠️ tool:{name}")
                    result, ok = self._execute_tool(name, args, state, step_no, step_cb)
                    if ok:
                        # Dedup successful calls only, so a rejected call can be
                        # retried identically after its precondition is satisfied.
                        executed_keys.add(key)
                    icon, title = self._TOOL_META.get(name, ("🔧", name))
                    tool_steps.append(
                        {
                            "step": step_no,
                            "id": name,
                            "name": name,
                            "icon": icon,
                            "title": title,
                            "status": "done" if ok else "error",
                            "input": (json.dumps(args, ensure_ascii=False)[:180]),
                            "output": result if len(result) <= 400 else result[:397] + "...",
                        }
                    )

                if call.get("id"):
                    messages.append(
                        {"role": "tool", "tool_call_id": call["id"], "content": result}
                    )
                else:
                    messages.append(
                        {
                            "role": "user",
                            "content": f'<tool_result name="{name}">\n{result}\n</tool_result>',
                        }
                    )

            if state.get("finalize_message") is not None:
                final_text = state["finalize_message"]
                break

        saved = state.get("saved")
        compliance = state.get("compliance") or {}
        if saved:
            loc_label = "user data folder (~/.local or AppData)" if saved.get("destination") == "local_user" else "data/eras_extensions/"
            save_msg = (
                f"📁 Verified and saved to `{saved['filename']}` ({loc_label}). "
                "Both Idea Generator and Main Harness can now load it."
            )
            if final_text:
                final_text += f"\n\n{save_msg}"
            else:
                final_text = save_msg

        tool_flow_lines = ["🛠️ **Agent Tool Call Execution Flow**:"]
        for s in tool_steps:
            tool_flow_lines.append(f"• `tool:{s['name']}` ➔ {s['output'][:120]}")
        tool_flow_md = "\n".join(tool_flow_lines) if tool_steps else ""

        era_pair = {}
        active_draft = state.get("draft") or state.get("last_saved_draft")
        if saved and active_draft:
            era_pair = {"polygyny": active_draft["poly"], "monogamy": active_draft["mono"]}

        return {
            "era_pair": era_pair,
            "compliance": compliance,
            "tool_steps": tool_steps,
            "tool_flow_md": tool_flow_md,
            "agent_message": final_text or "Turn completed.",
            "saved_file": saved["path"] if saved else "",
        }


# ---------------------------------------------------------------------------
# CLI (standalone testing)
# ---------------------------------------------------------------------------
def main():
    parser = argparse.ArgumentParser(description="Agentic Era Architect Harness for CharGenUI.")
    parser.add_argument("prompt", nargs="?", help="Worldbuilding era request prompt")
    parser.add_argument("--interactive", "-i", action="store_true", help="Interactive loop")
    parser.add_argument("--endpoint", "-e", default=DEFAULT_ENDPOINT)
    parser.add_argument("--model", "-m", default=None)
    parser.add_argument(
        "--log-level",
        choices=("DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"),
        default="WARNING",
        help="Diagnostic log level (default: WARNING)",
    )
    parser.add_argument(
        "--log-file",
        metavar="PATH",
        help="Also write diagnostic logs to PATH",
    )
    args = parser.parse_args()

    try:
        configure_logging(args.log_level, args.log_file)
    except OSError as exc:
        parser.error(f"cannot open log file: {exc}")

    harness = EraAgentHarness(endpoint=args.endpoint, model=args.model)

    def _log(s):
        print(s)

    def _step(s):
        print(f"   [{s.get('status')}] {s.get('icon', '')} tool:{s.get('name')} — {s.get('output', '')[:120]}")

    if args.interactive:
        print(f"{C_CYAN}🏰 ERA AGENT INTERACTIVE HARNESS (agentic loop){C_RESET}")
        while True:
            try:
                prompt = input(f"{C_BOLD}Era Prompt > {C_RESET}").strip()
                if not prompt:
                    continue
                if prompt.lower() in ("exit", "quit", "q"):
                    break
                result = harness.run_turn(prompt, status_cb=_log, step_cb=_step)
                print(f"\n{C_GREEN}{result['agent_message']}{C_RESET}\n")
            except EraHarnessError as e:
                print(f"{C_RED}Error: {e}{C_RESET}\n")
            except KeyboardInterrupt:
                break
    elif args.prompt:
        try:
            result = harness.run_turn(args.prompt, status_cb=_log, step_cb=_step)
            print(f"\n{C_GREEN}{result['agent_message']}{C_RESET}")
        except EraHarnessError as e:
            print(f"{C_RED}Error: {e}{C_RESET}")
            sys.exit(1)
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
