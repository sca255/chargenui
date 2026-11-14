#!/usr/bin/env python3
"""
declichify_eras.py
------------------
Utility script to scan, audit, and de-clichify era extensions.
Targets:
  - data/eras_extensions/*.json
  - idea_generator/eras_extensions/*.json
  - ~/.local/share/chargen/eras_extensions/*.json (if accessible)
  - Custom path specified via --dir or --file

Replaces repetitive formulaic slop phrases ("patriarch/matriarch over the lap",
"solemn chastisement", "haughty insolence broken", etc.) with grounded,
tactile, and diverse interpersonal dynamics.
"""

import sys
import os
import re
import json
import argparse
from pathlib import Path
from typing import Dict, Any, List, Tuple

# Patterns of formulaic slop to substitute with cleaner, richer alternatives
CLICHE_REPLACEMENTS: List[Tuple[re.Pattern, str]] = [
    # Patriarch / Matriarch stock phrases
    (re.compile(r"\b(uncompromising|strict|absolute)\s+patriarchal\s+martial\s+authority\b", re.IGNORECASE),
     "feudal martial chain of command and structured household hierarchy"),
    (re.compile(r"\babsolute\s+patriarchal\s+sect\s+hierarchy\b", re.IGNORECASE),
     "strict elder sect hierarchy and spiritual discipline"),
    (re.compile(r"\b(savage|ancient\s+forest)\s+patriarchal\s+clanship\b", re.IGNORECASE),
     "traditional lineage clan hierarchy and chieftain council law"),
    (re.compile(r"\bpatriarchal\s+dynasty\b", re.IGNORECASE),
     "ancestral ruling dynasty"),
    (re.compile(r"\bpatriarchal\s+discipline\b", re.IGNORECASE),
     "strict domestic boundaries"),

    # Over the lap / corporal punishment cliches
    (re.compile(r"\b(over|across)\s+(?:the\s+)?(?:warlord|chieftain|archon|patriarch|sovereign|master|husband|\{\{user\}\})'s\s+(?:knee|lap)\b", re.IGNORECASE),
     "before the household court or held firmly accountable"),
    (re.compile(r"\bspankings?\s+(?:over|across)\s+(?:the\s+)?(?:warlord|chieftain|archon|patriarch|sovereign|master|husband|\{\{user\}\})'s\s+(?:knee|lap)\b", re.IGNORECASE),
     "firm physical accountability and non-negotiable household duties"),
    (re.compile(r"\bsolemn,?\s*unyielding\s+physical\s+chastisement\b", re.IGNORECASE),
     "uncompromising personal accountability and swift reprimands"),
    (re.compile(r"\bsolemn\s+ritual\s+chastisement\b", re.IGNORECASE),
     "formal household censure and restorative duties"),
    (re.compile(r"\bdisciplined\s+through\s+solemn\s+ritual\s+chastisement\b", re.IGNORECASE),
     "bound by strict decorum and direct domestic accountability"),
    (re.compile(r"\bmeasured,?\s*dignified\s+physical\s+chastisement\b", re.IGNORECASE),
     "measured disciplinary protocols"),

    # Haughty insolence / breaking pride
    (re.compile(r"\bhaughty\s+insolence\b", re.IGNORECASE),
     "sharp defiance and testing of boundaries"),
    (re.compile(r"\bhaughty\s+intellectual\b", re.IGNORECASE),
     "guarded intellectual"),
    (re.compile(r"\bdefiant\s+civilized\s+noblewomen\s+are\s+systematically\s+broken\s+of\s+their\s+haughtiness\b", re.IGNORECASE),
     "foreign noblewomen learn to adapt their customs to the clan's pragmatic survival code"),
    (re.compile(r"\bbreaks?\s+(?:the\s+)?arrogance\s+of\b", re.IGNORECASE),
     "tames the factional friction with"),
    (re.compile(r"\bdisciplined\s+into\s+pliancy\b", re.IGNORECASE),
     "brought into mutual trust and compliance"),
    (re.compile(r"\breduced\s+to\s+a\s+flushed,?\s*breathless,?\s*obedient\s+wife\b", re.IGNORECASE),
     "grounded into relaxed, unmasked vulnerability and peace"),

    # Generic AI prose tropes
    (re.compile(r"\bmask\s+of\s+cold\s+indifference\b", re.IGNORECASE),
     "carefully guarded expression"),
    (re.compile(r"\beyes\s+darkening\s+with\s+(?:desire|possession|hunger)\b", re.IGNORECASE),
     "gaze narrowing with focused intent"),
    (re.compile(r"\bsmirks\s+(?:knowingly|mischievously)\b", re.IGNORECASE),
     "offers a faint, knowing grin"),
]

def clean_text(text: str) -> Tuple[str, int]:
    """Applies cliche replacements to a string, returning the cleaned text and replacement count."""
    if not isinstance(text, str):
        return text, 0

    count = 0
    modified = text
    for pattern, replacement in CLICHE_REPLACEMENTS:
        new_text, n = pattern.subn(replacement, modified)
        if n > 0:
            count += n
            modified = new_text

    return modified, count

def clean_data_structure(data: Any) -> Tuple[Any, int]:
    """Recursively traverses a JSON structure (dict/list) and cleans string values."""
    total_replacements = 0

    if isinstance(data, dict):
        new_dict = {}
        for k, v in data.items():
            new_val, count = clean_data_structure(v)
            new_dict[k] = new_val
            total_replacements += count
        return new_dict, total_replacements
    elif isinstance(data, list):
        new_list = []
        for item in data:
            new_item, count = clean_data_structure(item)
            new_list.append(new_item)
            total_replacements += count
        return new_list, total_replacements
    elif isinstance(data, str):
        return clean_text(data)
    else:
        return data, 0

def process_file(file_path: Path, dry_run: bool = False) -> int:
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            content = json.load(f)
    except Exception as e:
        print(f"[-] Could not read {file_path}: {e}")
        return 0

    cleaned, count = clean_data_structure(content)

    if count > 0:
        print(f"[+] {file_path.name}: {count} cliche/slop instances found.")
        if not dry_run:
            try:
                with open(file_path, "w", encoding="utf-8") as f:
                    json.dump(cleaned, f, indent=2, ensure_ascii=False)
                print(f"    -> Saved declichified updates to {file_path}")
            except Exception as e:
                print(f"    [-] Failed to write {file_path}: {e}")
    else:
        print(f"[.] {file_path.name}: clean (no matches).")

    return count

def get_default_search_paths() -> List[Path]:
    paths = [
        Path("data/eras_extensions"),
        Path("idea_generator/eras_extensions"),
    ]
    # Check OS user data dir
    if sys.platform != "win32":
        xdg = os.environ.get("XDG_DATA_HOME", str(Path.home() / ".local" / "share"))
        user_ext = Path(xdg) / "chargen" / "eras_extensions"
        if user_ext.exists():
            paths.append(user_ext)
    else:
        appdata = os.environ.get("APPDATA")
        if appdata:
            user_ext = Path(appdata) / "CharGen" / "eras_extensions"
            if user_ext.exists():
                paths.append(user_ext)

    return paths

def main():
    parser = argparse.ArgumentParser(description="Declichify era extension JSON files.")
    parser.add_argument("--dir", type=str, help="Specific directory to scan")
    parser.add_argument("--file", type=str, help="Specific JSON file to declichify")
    parser.add_argument("--dry-run", action="store_true", help="Report matches without overwriting files")
    args = parser.parse_args()

    files_to_process: List[Path] = []

    if args.file:
        p = Path(args.file)
        if p.is_file():
            files_to_process.append(p)
        else:
            print(f"Error: {args.file} is not a valid file.")
            sys.exit(1)
    elif args.dir:
        d = Path(args.dir)
        if d.is_dir():
            files_to_process.extend(d.glob("*.json"))
        else:
            print(f"Error: {args.dir} is not a directory.")
            sys.exit(1)
    else:
        search_dirs = get_default_search_paths()
        for d in search_dirs:
            if d.exists() and d.is_dir():
                files_to_process.extend(d.glob("*.json"))

    if not files_to_process:
        print("No era extension JSON files found in default or specified directories.")
        print("Scanned directories:")
        for d in get_default_search_paths():
            print(f"  - {d.resolve()} (exists: {d.exists()})")
        return

    print(f"Found {len(files_to_process)} extension file(s). Processing...")
    total_subs = 0
    for f in files_to_process:
        total_subs += process_file(f, dry_run=args.dry_run)

    print(f"\nDone! Total replacements made: {total_subs}")

if __name__ == "__main__":
    main()
