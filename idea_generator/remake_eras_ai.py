#!/usr/bin/env python3
"""
idea_generator/remake_eras_ai.py
---------------------------------
AI-powered Era Refiner and De-Clichifier for CharGenUI.

Uses the existing LLM inference infrastructure (compatible with llama-server,
OpenAI-compatible endpoints, Ollama, etc.) to intelligently rewrite era definitions,
removing repetitive tropes (matriarch/patriarch over the knee, solemn chastisement,
kneeling protocol, broken pride) while enhancing distinctive cultural, economic,
and psychological depth.

Usage:
  # Dry-run test on a specific file or directory:
  python3 idea_generator/remake_eras_ai.py --dir data/eras_extensions --dry-run

  # Rewrite an extension file with AI:
  python3 idea_generator/remake_eras_ai.py --file data/eras_extensions/my_era.json

  # Custom LLM endpoint:
  python3 idea_generator/remake_eras_ai.py --dir data/eras_extensions --endpoint http://127.0.0.1:5001/v1
"""

import sys
import os
import re
import json
import argparse
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple

current_dir = Path(__file__).resolve().parent
ROOT_DIR = current_dir.parent if (current_dir.parent / "src").exists() else current_dir
sys.path.insert(0, str(ROOT_DIR))
sys.path.insert(0, str(current_dir))

try:
    import requests
except ImportError:
    print("Error: 'requests' library required. Run 'pip install requests'.")
    sys.exit(1)

from idea_generator.era_agent_harness import (
    repair_and_decode_json,
    DEFAULT_ENDPOINT,
    LLM_TIMEOUT,
)

SYSTEM_PROMPT = """You are an elite historical and fantasy cultural architect specializing in de-clichifying roleplay worldbuilding.
Your objective is to take an existing era definition and REWRITE its 'social_codes', 'titles', and 'aesthetic' to eradicate repetitive AI tropes.

STRICT BANNED SLOP & CLICHES:
- No generic "matriarch / patriarch" tropes.
- No "kneeling protocols", "ritual chastisement", "over the lap / knee", or "spankings".
- No "disciplined into pliancy", "breaking arrogance/insolence", or "haughty pride shattered".
- No "eyes darkening with desire", "mask of cold indifference", or "smirks knowingly".

REPLACEMENT PRINCIPLES:
- Ground societies in realistic cultural texture: tradecraft, guild politics, legal precedent, religious rites, inheritance laws, dietary customs, domestic labor, and genuine interpersonal friction.
- Power dynamics should stem from authentic social or material leverage (e.g. patronage, lineage debts, oath obligations, shared vulnerability) rather than pulp disciplinary tropes.
- Preserve the era's core genre, tone, and whether it's Monogamy (sole partner) or Polygyny (multi-partner).
- Keep the exact JSON schema and keys intact.

OUTPUT FORMAT:
Return ONLY valid JSON with the rewritten era definition. No commentary, no code fences.
"""

def extract_json(raw: str) -> Optional[Dict[str, Any]]:
    """Extract and parse JSON object from LLM response."""
    parsed = repair_and_decode_json(raw)
    if isinstance(parsed, dict):
        return parsed
    # Fallback search for outer curly braces
    start = raw.find("{")
    end = raw.rfind("}")
    if start != -1 and end > start:
        try:
            return json.loads(raw[start:end+1])
        except Exception:
            pass
    return None

def call_llm_rewrite(
    era_spec: Dict[str, Any],
    endpoint: str = DEFAULT_ENDPOINT,
    model: Optional[str] = None
) -> Optional[Dict[str, Any]]:
    """Calls local LLM endpoint to rewrite the era specification without slop."""
    url = f"{endpoint.rstrip('/')}/chat/completions"
    
    prompt = f"""Rewrite this era definition to make it completely free of generic AI slop and disciplinary cliches:

Input Era JSON:
{json.dumps(era_spec, indent=2, ensure_ascii=False)}

Return the full updated JSON object with rewritten 'social_codes', 'titles', and 'aesthetic'."""

    payload = {
        "model": model or "llama-server",
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.7,
        "max_tokens": 2048,
    }

    try:
        r = requests.post(url, json=payload, timeout=LLM_TIMEOUT)
        if r.status_code != 200:
            print(f"[-] LLM returned status {r.status_code}: {r.text[:200]}")
            return None
        data = r.json()
        raw_msg = (data.get("choices") or [{}])[0].get("message", {}).get("content", "")
        updated_era = extract_json(raw_msg)
        return updated_era
    except Exception as e:
        print(f"[-] LLM call failed: {e}")
        return None

def extract_eras_from_data(data: Any) -> List[Tuple[str, Dict[str, Any], Any]]:
    """
    Extracts all era definitions from arbitrary extension JSON schemas:
    - {"polygyny": {...}, "monogamy": {...}}
    - {"era_pair": {"polygyny": {...}, "monogamy": {...}}}
    - {"id": "...", "name": "...", "social_codes": "..."}
    - {"some_era_id": {"name": "...", ...}}
    - [ {...}, {...} ]
    Returns list of tuples: (identifier/key, era_dict, parent_container)
    """
    results: List[Tuple[str, Dict[str, Any], Any]] = []

    def is_era_dict(d: Any) -> bool:
        if not isinstance(d, dict):
            return False
        # If it has social_codes or (name and aesthetic) or (id and tags/titles)
        return bool(
            d.get("social_codes") or 
            (d.get("name") and (d.get("aesthetic") or d.get("tech") or d.get("titles")))
        )

    if isinstance(data, list):
        for idx, item in enumerate(data):
            if is_era_dict(item):
                results.append((item.get("id") or str(idx), item, data))
    elif isinstance(data, dict):
        if "era_pair" in data and isinstance(data["era_pair"], dict):
            for k, v in data["era_pair"].items():
                if is_era_dict(v):
                    results.append((k, v, data["era_pair"]))
        elif "polygyny" in data or "monogamy" in data:
            for k in ["polygyny", "monogamy"]:
                if k in data and is_era_dict(data[k]):
                    results.append((k, data[k], data))
        elif is_era_dict(data):
            results.append((data.get("id") or "root", data, None))
        else:
            for k, v in data.items():
                if is_era_dict(v):
                    results.append((k, v, data))

    return results

def has_slop_markers(spec: Dict[str, Any]) -> Tuple[bool, List[str]]:
    """Detects whether an era definition contains slop patterns. Returns (is_slop, found_markers)."""
    text = " ".join([
        str(spec.get("name", "")),
        str(spec.get("social_codes", "")),
        str(spec.get("aesthetic", "")),
        " ".join(spec.get("titles", [])) if isinstance(spec.get("titles"), list) else str(spec.get("titles", "")),
        " ".join(spec.get("tags", [])) if isinstance(spec.get("tags"), list) else str(spec.get("tags", ""))
    ]).lower()

    slop_indicators = [
        "over the lap", "across the lap", "over his knee", "across his knee",
        "over the warlord's lap", "across the patriarch's lap", "over the archon's lap",
        "solemn ritual chastisement", "unyielding physical chastisement", "measured chastisement",
        "dignified physical chastisement", "ritual bare-bottom chastisement",
        "haughty insolence", "disciplined into pliancy", "broken of their haughtiness",
        "spankings over the warlord", "kneeling protocol", "patriarchal martial authority",
        "filial obedience, ritual kowtowing", "mask of cold indifference",
        "eyes darkening with", "smirks knowingly", "smirks mischievously",
        "patriarchal", "patriarchy", "male headship", "taming haughtiness", "tamed ward"
    ]
    found = [m for m in slop_indicators if m in text]
    return (len(found) > 0, found)

def process_extension_file(
    file_path: Path,
    endpoint: Optional[str],
    model: Optional[str],
    dry_run: bool = False,
    slop_only: bool = False,
    no_endpoint: bool = False
) -> Tuple[bool, int, int]:
    """Processes an extension file. Returns (modified, total_eras, slop_eras)."""
    print(f"\n[+] Processing: {file_path}")
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)
    except Exception as e:
        print(f"[-] Could not read {file_path}: {e}")
        return False, 0, 0

    eras_to_rewrite = extract_eras_from_data(data)

    if not eras_to_rewrite:
        if isinstance(data, dict):
            print(f"[.] No standard era definitions found in {file_path.name} (keys: {list(data.keys())})")
        else:
            print(f"[.] No standard era definitions found in {file_path.name} (type: {type(data)})")
        return False, 0, 0

    modified = False
    total_eras = len(eras_to_rewrite)
    slop_count = 0

    for key, spec, _ in eras_to_rewrite:
        name = spec.get("name", key)
        is_slop, markers = has_slop_markers(spec)
        if is_slop:
            slop_count += 1

        if no_endpoint:
            if is_slop:
                print(f"  [!] SLOP DETECTED in '{name}': matched {markers}")
            else:
                print(f"  [✓] CLEAN: '{name}'")
            continue

        if slop_only and not is_slop:
            print(f"  [.] Skipping '{name}' (clean, no slop markers detected).")
            continue

        print(f"  -> Sending '{name}' to LLM for de-slop rewrite...")
        rewritten = call_llm_rewrite(spec, endpoint=endpoint or DEFAULT_ENDPOINT, model=model)
        if rewritten and isinstance(rewritten, dict):
            for k in ["name", "social_codes", "titles", "aesthetic"]:
                if k in rewritten:
                    spec[k] = rewritten[k]
            if "tags" in rewritten:
                spec["tags"] = rewritten["tags"]
            modified = True
            print(f"  [✓] Successfully rewritten '{name}'.")
        else:
            print(f"  [-] Failed to obtain valid rewrite for '{name}'. Keeping original.")

    if modified and not dry_run and not no_endpoint:
        try:
            with open(file_path, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
            print(f"[✓] Saved updated era extension to {file_path}")
        except Exception as e:
            print(f"[-] Failed to write to {file_path}: {e}")
    elif modified and dry_run:
        print(f"[i] Dry-run enabled: {file_path.name} was not overwritten.")

    return modified, total_eras, slop_count

def main():
    parser = argparse.ArgumentParser(description="AI-driven Era Refiner and De-Clichifier.")
    parser.add_argument("--dir", type=str, help="Directory containing era extension JSONs (e.g. data/eras_extensions)")
    parser.add_argument("--file", type=str, help="Specific JSON file to rewrite with AI")
    parser.add_argument("--endpoint", type=str, default=DEFAULT_ENDPOINT, help=f"LLM API base URL (default: {DEFAULT_ENDPOINT})")
    parser.add_argument("--model", type=str, default=None, help="Model name (optional)")
    parser.add_argument("--dry-run", action="store_true", help="Run without overwriting existing files")
    parser.add_argument("--slop-only", action="store_true", help="Only rewrite eras that trigger detected slop/trope phrases")
    parser.add_argument("--no-endpoint", action="store_true", help="Scan and audit for slop/cliches without making any LLM requests")
    args = parser.parse_args()

    targets: List[Path] = []
    if args.file:
        p = Path(args.file)
        if p.is_file():
            targets.append(p)
        else:
            print(f"Error: file not found: {args.file}")
            sys.exit(1)
    elif args.dir:
        d = Path(args.dir)
        if d.is_dir():
            targets.extend(d.glob("*.json"))
        else:
            print(f"Error: directory not found: {args.dir}")
            sys.exit(1)
    else:
        # Default search locations
        defaults = [
            Path("data/eras_extensions"),
            Path("idea_generator/eras_extensions"),
            Path(os.environ.get("XDG_DATA_HOME", str(Path.home() / ".local" / "share"))) / "chargen" / "eras_extensions"
        ]
        for d in defaults:
            if d.exists() and d.is_dir():
                targets.extend(d.glob("*.json"))

    if not targets:
        print("No era extension JSON files found to process.")
        print("Provide a path using --dir <path> or --file <path>.")
        sys.exit(0)

    if args.no_endpoint:
        print(f"Audit mode (--no-endpoint): Scanning {len(targets)} file(s) for slop markers...")
    else:
        print(f"Found {len(targets)} file(s). Target LLM endpoint: {args.endpoint}")

    total_all_eras = 0
    total_slop_eras = 0
    for t in targets:
        _, file_eras, file_slop = process_extension_file(
            t,
            endpoint=args.endpoint,
            model=args.model,
            dry_run=args.dry_run,
            slop_only=args.slop_only,
            no_endpoint=args.no_endpoint
        )
        total_all_eras += file_eras
        total_slop_eras += file_slop

    print(f"\n================ AUDIT SUMMARY ================")
    print(f"Total files scanned: {len(targets)}")
    print(f"Total era definitions: {total_all_eras}")
    print(f"Slop / Cliché matches: {total_slop_eras}")
    if total_all_eras > 0:
        clean_pct = ((total_all_eras - total_slop_eras) / total_all_eras) * 100
        print(f"Clean rate: {clean_pct:.1f}%")
    print(f"================================================")

if __name__ == "__main__":
    main()
