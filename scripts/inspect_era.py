#!/usr/bin/env python3
"""
scripts/inspect_era.py
----------------------
CLI tool for agents and developers to quickly inspect, search, or read specific
eras from data/eras_db.json AND data/eras_extensions/*.json without loading the
massive 200KB database into context.

Usage:
  python3 scripts/inspect_era.py floating_sky_citadel
  python3 scripts/inspect_era.py briarwoven_maze_manor
  python3 scripts/inspect_era.py --search "citadel"
  python3 scripts/inspect_era.py --list
"""

import sys
import json
import argparse
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
DB_PATH = ROOT_DIR / "data" / "eras_db.json"
EXTENSION_DIRS = [
    ROOT_DIR / "data" / "eras_extensions",
    ROOT_DIR / "idea_generator" / "eras_extensions",
    ROOT_DIR / "eras_extensions",
]

def load_db():
    db = {}
    if DB_PATH.exists():
        try:
            with open(DB_PATH, "r", encoding="utf-8") as f:
                db = json.load(f)
        except Exception as e:
            print(f"Warning: Failed to load {DB_PATH}: {e}")

    # Load all modular era extension files
    for edir in EXTENSION_DIRS:
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
            except Exception as e:
                pass

    return db

def main():
    parser = argparse.ArgumentParser(description="Inspect or search eras in database and extensions.")
    parser.add_argument("query", nargs="?", help="Era ID or keyword to inspect")
    parser.add_argument("--search", "-s", help="Search keyword across IDs, titles, and tags")
    parser.add_argument("--tag", "-t", help="Search specifically across tags (e.g. bdsm, male dom, patriarchy)")
    parser.add_argument("--list", "-l", action="store_true", help="List all era IDs and titles")
    parser.add_argument("--raw", "-r", action="store_true", help="Print raw JSON only")
    args = parser.parse_args()

    db = load_db()

    if args.list:
        print(f"Found {len(db)} total eras (database + extensions):\n")
        for eid, data in sorted(db.items()):
            if eid == "off": continue
            ext_tag = f" [📁 Extension: {data['_extension_file']}]" if data.get("_extension_file") else ""
            print(f"• `{eid}`: {data.get('name')}{ext_tag}")
        return

    # Tag search
    if args.tag:
        tag_q = args.tag.lower().strip()
        matches = {}
        for eid, data in db.items():
            if eid == "off": continue
            matched_tags = [t for t in data.get("tags", []) if tag_q in t.lower()]
            if matched_tags:
                matches[eid] = data

        if not matches:
            print(f"No eras found with tag matching '{args.tag}'.")
            sys.exit(1)

        print(f"Found {len(matches)} era(s) matching tag '{args.tag}':\n")
        for eid, data in list(matches.items())[:12]:
            matching = [t for t in data.get("tags", []) if tag_q in t.lower()]
            print(f"• `{eid}`: {data.get('name')}")
            print(f"  Matched Tags: {', '.join(matching)}")
        if len(matches) > 12:
            print(f"\n... and {len(matches) - 12} more.")
        return

    q = args.search or args.query
    if not q:
        parser.print_help()
        return

    q_lower = q.lower().strip()
    
    # 1. Exact match
    if q_lower in db:
        matches = {q_lower: db[q_lower]}
    else:
        # 2. Slug match (e.g. "floating_sky_citadel" matches "_haven" and "_monogamy")
        matches = {}
        for eid, data in db.items():
            if eid == "off": continue
            slug = eid.replace("_haven", "").replace("_monogamy", "").replace("_estate", "").replace("_polygyny", "")
            if slug == q_lower or eid.startswith(q_lower):
                matches[eid] = data

        # 3. Fuzzy search in id, name, tags
        if not matches:
            for eid, data in db.items():
                if eid == "off": continue
                name = str(data.get("name", "")).lower()
                tags = [str(t).lower() for t in data.get("tags", [])]
                if q_lower in eid or q_lower in name or any(q_lower in t for t in tags):
                    matches[eid] = data

    if not matches:
        print(f"No eras found matching '{q}'. Run with --list to see all available IDs.")
        sys.exit(1)

    if args.raw or len(matches) <= 2:
        print(json.dumps(matches, indent=2, ensure_ascii=False))
    else:
        print(f"Found {len(matches)} matching eras:")
        for eid, data in list(matches.items())[:10]:
            print(f"\n[{eid}] {data.get('name')}")
            print(f"  Region: {data.get('region')}")
            print(f"  Aesthetic: {str(data.get('aesthetic', ''))[:120]}...")
            print(f"  Tags: {', '.join(data.get('tags', []))}")
        if len(matches) > 10:
            print(f"\n... and {len(matches) - 10} more. Refine your query for specific JSON.")

if __name__ == "__main__":
    main()
