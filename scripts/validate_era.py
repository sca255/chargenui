#!/usr/bin/env python3
"""
scripts/validate_era.py
-----------------------
CLI tool to validate era extension JSON files for structural quality,
dual-format completeness, and content richness.

Usage:
  python3 scripts/validate_era.py data/eras_extensions/my_era.json
  python3 scripts/validate_era.py --dir data/eras_extensions
"""

import sys
import os
import json
import argparse
from pathlib import Path

# Add project root and idea_generator to path
ROOT_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT_DIR))
sys.path.insert(0, str(ROOT_DIR / "idea_generator"))

from idea_generator.eras_data import validate_era_compliance


def audit_era_file(file_path: Path) -> bool:
    print(f"\n🔍 Inspecting: {file_path.name}")
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)
    except Exception as e:
        print(f"  ❌ Invalid JSON: {e}")
        return False

    eras = []
    if isinstance(data, dict):
        # Could be {"poly_id": {...}, "mono_id": {...}} or {"era_pair": {...}} or single era
        if "era_pair" in data and isinstance(data["era_pair"], dict):
            eras = list(data["era_pair"].values())
        elif all(isinstance(v, dict) and "name" in v for v in data.values()):
            eras = list(data.values())
        elif "id" in data and "name" in data:
            eras = [data]
    elif isinstance(data, list):
        eras = data

    if not eras:
        print("  ❌ No valid era definitions found in file.")
        return False

    print(f"  Found {len(eras)} era definition(s).")

    all_passed = True
    poly_era = None
    mono_era = None

    for e in eras:
        if not isinstance(e, dict):
            continue
        eid = str(e.get("id", "")).lower()
        ename = str(e.get("name", "")).lower()
        if ("polygyny" in eid or "multi_wife" in eid or "multi-wife" in ename) and not poly_era:
            poly_era = e
        elif ("monogamy" in eid or "sole_bride" in eid or "sole bride" in ename) and not mono_era:
            mono_era = e

    if not poly_era and len(eras) > 0:
        poly_era = eras[0]
    if not mono_era and len(eras) > 1:
        mono_era = eras[1]

    for idx, era in enumerate(eras):
        counterpart = mono_era if era is poly_era else poly_era
        report = validate_era_compliance(era, counterpart)

        status_emoji = "✅" if report["compliant"] else "⚠️"
        print(f"\n  {status_emoji} [{idx+1}/{len(eras)}] Era: '{era.get('name')}' (ID: `{era.get('id')}`)")
        print(f"     Compliance Score: {report['score']}%")

        if report["strengths"]:
            print("     Quality Strengths:")
            for s in report["strengths"]:
                print(f"       • {s}")

        if report["issues"]:
            all_passed = False
            print("     ❌ Compliance Issues:")
            for issue in report["issues"]:
                print(f"       • {issue}")

        if report["warnings"]:
            print("     ⚠️  Warnings:")
            for warn in report["warnings"]:
                print(f"       • {warn}")

    return all_passed


def main():
    parser = argparse.ArgumentParser(description="Audit era JSON files for quality and completeness.")
    parser.add_argument("path", nargs="?", help="Path to era JSON file or directory")
    parser.add_argument("--dir", default=None, help="Directory to audit all .json files in")
    args = parser.parse_args()

    target = args.dir or args.path or str(ROOT_DIR / "data" / "eras_extensions")
    target_path = Path(target)

    if target_path.is_file():
        success = audit_era_file(target_path)
        sys.exit(0 if success else 1)
    elif target_path.is_dir():
        json_files = list(target_path.glob("*.json"))
        if not json_files:
            print(f"No .json files found in {target_path}")
            sys.exit(0)
        overall = True
        for jf in json_files:
            if not audit_era_file(jf):
                overall = False
        print("\n" + "=" * 60)
        print("Audit Complete: " + ("ALL PASSED ✅" if overall else "SOME ISSUES FOUND ⚠️"))
        sys.exit(0 if overall else 1)
    else:
        print(f"Error: Path '{target}' does not exist.")
        sys.exit(1)


if __name__ == "__main__":
    main()
