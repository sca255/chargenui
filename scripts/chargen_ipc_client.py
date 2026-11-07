#!/usr/bin/env python3
"""
CharGenUI Unix Domain Socket IPC Client for Python Scripts & Side Daemons.
Re-exports CharGenUnixClient from desktop.unix_ipc.
"""

import os
import sys
from pathlib import Path

# Add project root to sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from desktop.unix_ipc import CharGenUnixClient

__all__ = ["CharGenUnixClient"]

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="CharGenUI Unix Socket IPC Utility")
    parser.add_argument("command", choices=["status", "ping", "themes", "card", "suggest"], help="Command to run")
    parser.add_argument("--concept", type=str, help="Concept to suggest")
    parser.add_argument("--archetype", type=str, help="Archetype")
    parser.add_argument("--themes", type=str, help="Comma-separated themes")
    parser.add_argument("--era", type=str, help="Historical/fantasy era")
    args = parser.parse_args()

    client = CharGenUnixClient()
    try:
        client.connect()
        if args.command == "status":
            print(json.dumps(client.get_status(), indent=2))
        elif args.command == "ping":
            print(json.dumps(client.ping(), indent=2))
        elif args.command == "themes":
            print(json.dumps(client.get_themes(), indent=2))
        elif args.command == "card":
            print(json.dumps(client.get_active_card(), indent=2))
        elif args.command == "suggest":
            if not args.concept:
                print("Error: --concept required for suggest command", file=sys.stderr)
                sys.exit(1)
            th = [t.strip() for t in args.themes.split(",")] if args.themes else []
            res = client.suggest_concept(args.concept, archetype=args.archetype, themes=th, era=args.era)
            print(json.dumps(res, indent=2))
    except Exception as e:
        print(f"IPC Error: {e}", file=sys.stderr)
        sys.exit(1)
    finally:
        client.close()
