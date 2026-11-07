#!/usr/bin/env python3
"""Entry point: `python -m comfyclient` → CLI; `python -m comfyclient --gui` → editor."""

from .server import main

if __name__ == "__main__":
    main()
