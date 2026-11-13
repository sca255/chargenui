---
name: era-architect
description: Comprehensive skill for designing and validating paired eras (Multi-Partner & Sole Partner) and saving them to data/eras_extensions/.
---

# Era Architect Skill

Use this skill whenever you need to create, expand, or validate worldbuilding ERAS for the CharGenUI ecosystem.

## ⚠️ Important Path Rules
- Project root is the current repository root directory.
- ❌ Do NOT use leading slashes like `/data/...` (it will try to access the Linux root `/data` and fail).
- ✅ Always use relative paths: `data/eras_extensions/<name>.json`.
- ❌ Do NOT read `data/eras_db.json` directly (it is 200KB).
- ✅ Use `python3 scripts/inspect_era.py <slug>` to read any era quickly.

## 🚫 Strict Zero-Procedural Rule
- **NEVER** generate, fallback to, or inject procedural canned templates or algorithmic mock text into era definitions or agent responses.
- Procedural generation was only ever designed for Studio Mode when explicitly requested.
- All era content must be genuinely authored by the LLM adhering strictly to user prompt instructions. If offline or in error, report the error directly rather than silently substituting procedural text.

## 🔍 Pre-Authoring Similar Era Check
- **Always check if a similar or related era already exists** in `data/eras_extensions/*.json` or `eras_db.json` before authoring.
- Run `python3 scripts/inspect_era.py <keyword_or_slug>` to inspect existing settings.
- If a similar era is found:
  - **Nudge yourself to inspect its specifics**: review its existing aesthetics, hierarchy, social codes, and tech constraints.
  - If the user wants to adapt, extend, or build a variant of that era: ground your work in its established lore.
  - If the user is requesting a new setting: ensure the new concept is genuinely distinct with fresh naming and unique dynamics to avoid collisions.
  - Explicitly acknowledge the existing era in your explanation to the user.

## Core Architectural Guidelines (Instruction-Driven)
1. **Faithful Instruction-Following (Zero Dogma)**:
   - Faithfully follow the user's requested genre, scale, tone, setting, social hierarchy, and dynamic rules.
   - If the user specifies an imperial court, high king, palace sentries, modern metropolis, or sci-fi admiral, author them with complete fidelity.
   - If the user specifies secluded cottages, sovereign freeholders, or private sanctuaries, author that with complete fidelity.
   - NEVER force unsolicited tropes or penalize the user's creative vision.
2. **Dual-Format Requirement**: Every setting MUST produce both variants:
   - Version A: Multi-Partner (Polygyny) — {{user}}'s household / dynamic with multiple companions or wives fitting the requested world.
   - Version B: Sole Partner (Monogamy) — {{user}}'s dedicated bond with a single companion or bride fitting the requested world.
3. **Setting Atmosphere & Depth**: Evocative sensory aesthetics (`aesthetic` $\ge 40$ chars) and native technology/magic systems (`tech` $\ge 25$ chars).
4. **Social Codes & Dynamics**: Comprehensive paragraph (100-250 words, $\ge 80$ chars) establishing etiquette, hierarchy, and relationship rules.
5. **Content Richness**: Diverse feminine name pool ($\ge 12$ names), companion archetype titles ($\ge 6$ titles), and relevant tags ($\ge 6$ tags).

## Recommended Workflow
1. Check existing reference era (optional):
   ```bash
   python3 scripts/inspect_era.py <slug>
   ```
2. Reason and invent a fresh geographical/thematic counterpart based on user prompt instructions.
3. Draft the paired JSON (both Multi-Partner and Sole Partner).
4. Save the JSON to `data/eras_extensions/<setting_slug>.json`.
5. Validate with:
   ```bash
   python3 scripts/validate_era.py data/eras_extensions/<setting_slug>.json
   ```
6. Once saved in `data/eras_extensions/`, the era hot-loads into both the Idea Generator (:5001) and the Main Harness (:3333).
