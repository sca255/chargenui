#!/usr/bin/env python3
"""
Offline unit tests for the agentic Era Agent Harness loop (no llama-server needed).

Run:  python3 idea_generator/test_era_agent_loop.py
"""

import sys
import os
import json
import tempfile
import traceback
import threading
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "idea_generator"))

import era_agent_harness as hmod


def _era(name_suffix, mode, slug):
    if mode == "poly":
        eid = f"{slug}_haven"
        nm = f"🌌 {name_suffix} (Sovereign — Multi-Partner Variant)"
        sn = f"{name_suffix}: Multi-Partner"
        tags = [name_suffix, "Polygyny", "Relationship Dynamic", "Social Hierarchy", "Tone", "Seclusion", "Domestic", "Fantasy"]
    else:
        eid = f"{slug}_monogamy"
        nm = f"💍 {name_suffix} (Devoted — Sole Partner Variant)"
        sn = f"{name_suffix}: Sole Partner"
        tags = [name_suffix, "Monogamy", "Sole Partner", "Relationship Dynamic", "Social Hierarchy", "Tone", "Seclusion", "Fantasy"]
    return {
        "id": eid,
        "name": nm,
        "short_name": sn,
        "span": "Age of Testing",
        "category": "Fantasy",
        "region": "The Unit-Test Lagoon",
        "aesthetic": "Moonlit lagoon waters over basalt terraces, silk drapes rippling in warm lantern light, obsidian columns etched with tide runes, and the soft glow of abyssal pearls embedded in dark timber rafters.",
        "tech": "Tide-binding enchantments, pearl-lumen lanterns, obsidian warding craft, and current-weaving looms that spin cloth from sea-silk.",
        "social_codes": (
            "{{user}} holds unquestioned headship of the lagoon household, where every companion defers to his "
            "authority with graceful devotion. Etiquette demands a formal evening procession along the terraces "
            "before supper, after which disputes are settled in private counsel beside the pearl lanterns. "
            "Plural marriage rites bind the wives into a sisterhood under his protection, while the sole-bride "
            "tradition keeps one partner in exclusive devotion when that path is chosen. Gifts of hand-woven "
            "sea-silk mark each vow, and no outsider may cross the ward-line without his leave, ensuring the "
            "household remains a sealed sanctuary of warmth, discipline, and tender loyalty."
        ),
        "names": ["Lyra", "Vespera", "Sariel", "Elowen", "Fenra", "Nissa", "Zephyra", "Aurelia", "Celeste", "Naevia", "Kaelen", "Morrigan", "Yvaine", "Isolde", "Corinne"],
        "titles": ["The Tide-Bound Bride", "The Pearl Hearth Consort", "The Lagoon Scholar Wife", "The Ward-Weaver Spouse", "The Devoted Sole Partner", "The Night-Procession Lady"],
        "tags": tags,
    }


class FakeScript:
    """Scripted LLM: consumes one scripted response per _post_chat call."""

    def __init__(self, responses):
        self.responses = list(responses)
        self.calls = 0

    def __call__(self, messages, temperature=0.7, max_tokens=5000, use_tools=True):
        self.calls += 1
        if not self.responses:
            raise AssertionError("FakeScript exhausted — loop ran more steps than scripted")
        return self.responses.pop(0)


def _tag(name, args):
    return {"role": "assistant", "content": f"<tool:{name}>{json.dumps(args)}</tool:{name}>"}


def _run(script, prompt="make a new lagoon era", history=None, draft=None, temp=0.7):
    harness = hmod.EraAgentHarness(endpoint="http://localhost:5001/v1", model="fake")
    harness.check_server = lambda: True
    harness._post_chat = script
    steps = []
    result = harness.run_turn(
        prompt,
        chat_history=history,
        current_draft=draft,
        temperature=temp,
        status_cb=lambda s: None,
        step_cb=lambda st: steps.append(dict(st)),
    )
    result["_steps_final"] = steps
    result["_harness"] = harness
    return result


def test_happy_path_native_tool_calls():
    """Native tool_calls path: search -> draft -> validate -> save -> finalize."""
    slug = "unit_test_lagoon"
    poly = _era("Unit Test Lagoon", "poly", slug)
    mono = _era("Unit Test Lagoon", "mono", slug)

    script = FakeScript([
        {"content": None, "tool_calls": [{"id": "c1", "type": "function",
         "function": {"name": "search_eras", "arguments": json.dumps({"query": "lagoon tide basalt"})}}]},
        {"content": None, "tool_calls": [{"id": "c2", "type": "function",
         "function": {"name": "draft_era_pair", "arguments": json.dumps({"slug": slug, "polygyny": poly, "monogamy": mono})}}]},
        {"content": None, "tool_calls": [{"id": "c3", "type": "function",
         "function": {"name": "validate_pair", "arguments": "{}"}}]},
        {"content": None, "tool_calls": [{"id": "c4", "type": "function",
         "function": {"name": "save_era_extension", "arguments": json.dumps({"slug": slug})}}]},
        {"content": None, "tool_calls": [{"id": "c5", "type": "function",
         "function": {"name": "finalize", "arguments": json.dumps({"message": "Forged the lagoon pair."})}}]},
    ])

    saved_paths = []
    real_save = hmod.save_extension_file
    hmod.save_extension_file = lambda fn, content, destination="project_data": (saved_paths.append((fn, content)) or
                                                    {"success": True, "filePath": f"/tmp/{fn}", "count": 2})
    try:
        result = _run(script)
    finally:
        hmod.save_extension_file = real_save

    assert len(saved_paths) == 1, f"expected 1 save, got {len(saved_paths)}"
    fn, content = saved_paths[0]
    assert fn == f"{slug}.json"
    assert f"{slug}_haven" in content["era_pair"] and f"{slug}_monogamy" in content["era_pair"]
    assert result["era_pair"]["polygyny"]["id"] == f"{slug}_haven"
    assert result["compliance"]["polygyny"]["score"] >= 55
    assert "saved" in result["agent_message"]
    names = [s["name"] for s in result["tool_steps"]]
    assert names == ["search_eras", "draft_era_pair", "validate_pair", "save_era_extension", "finalize"], names
    print("PASS happy_path_native_tool_calls")


def test_happy_path_tag_protocol():
    """Tag protocol path (server returned no tool_calls)."""
    slug = "unit_test_atoll"
    poly = _era("Unit Test Atoll", "poly", slug)
    mono = _era("Unit Test Atoll", "mono", slug)
    script = FakeScript([
        {"content": '<tool:search_eras>{"query": "atoll reef"}</tool:search_eras>'},
        {"content": '<tool:draft_era_pair>' + json.dumps({"slug": slug, "polygyny": poly, "monogamy": mono}) + '</tool:draft_era_pair>'},
        {"content": '<tool:save_era_extension>{"slug": "' + slug + '"}</tool:save_era_extension>'},
        {"content": '<tool:finalize>{"message": "Done."}</tool:finalize>'},
    ])
    saved = []
    real_save = hmod.save_extension_file
    hmod.save_extension_file = lambda fn, content, destination="project_data": (saved.append(fn) or
                                                    {"success": True, "filePath": f"/tmp/{fn}", "count": 2})
    try:
        result = _run(script)
    finally:
        hmod.save_extension_file = real_save
    assert saved == [f"{slug}.json"], saved
    assert result["era_pair"].get("monogamy", {}).get("id") == f"{slug}_monogamy"
    print("PASS happy_path_tag_protocol")


def test_direct_draft_without_search():
    """draft_era_pair can be called directly without prior search_eras."""
    slug = "unit_test_cay"
    poly = _era("Unit Test Cay", "poly", slug)
    mono = _era("Unit Test Cay", "mono", slug)
    script = FakeScript([
        # Model drafts directly without searching first
        {"content": '<tool:draft_era_pair>' + json.dumps({"slug": slug, "polygyny": poly, "monogamy": mono}) + '</tool:draft_era_pair>'},
        {"content": '<tool:save_era_extension>{}</tool:save_era_extension>'},
        {"content": '<tool:finalize>{"message": "ok"}</tool:finalize>'},
    ])
    saved = []
    real_save = hmod.save_extension_file
    hmod.save_extension_file = lambda fn, content, destination="project_data": (saved.append(fn) or
                                                    {"success": True, "filePath": f"/tmp/{fn}", "count": 2})
    try:
        result = _run(script)
    finally:
        hmod.save_extension_file = real_save

    assert saved == [f"{slug}.json"], saved
    assert result["tool_steps"][0]["name"] == "draft_era_pair"
    assert result["tool_steps"][0]["status"] == "done"
    print("PASS direct_draft_without_search")


def test_finalize_rejected_while_unsaved():
    """finalize with a staged-but-unsaved draft must be refused, then save succeeds."""
    slug = "unit_test_reef"
    poly = _era("Unit Test Reef", "poly", slug)
    mono = _era("Unit Test Reef", "mono", slug)
    script = FakeScript([
        {"content": '<tool:search_eras>{"query": "reef"}</tool:search_eras>'},
        {"content": '<tool:draft_era_pair>' + json.dumps({"slug": slug, "polygyny": poly, "monogamy": mono}) + '</tool:draft_era_pair>'},
        # Model tries to slip away without saving
        {"content": '<tool:finalize>{"message": "All done, saved!"}</tool:finalize>'},
        # Rejection feeds back; model saves
        {"content": '<tool:save_era_extension>{}</tool:save_era_extension>'},
        {"content": '<tool:finalize>{"message": "Saved now."}</tool:finalize>'},
    ])
    saved = []
    real_save = hmod.save_extension_file
    hmod.save_extension_file = lambda fn, content, destination="project_data": (saved.append(fn) or
                                                    {"success": True, "filePath": f"/tmp/{fn}", "count": 2})
    try:
        result = _run(script)
    finally:
        hmod.save_extension_file = real_save

    finalize_steps = [s for s in result["tool_steps"] if s["name"] == "finalize"]
    assert len(finalize_steps) == 2, finalize_steps
    assert finalize_steps[0]["status"] == "error"
    assert "unsaved" in finalize_steps[0]["output"].lower()
    assert finalize_steps[1]["status"] == "done"
    assert saved == [f"{slug}.json"]
    print("PASS finalize_rejected_while_unsaved")


def test_similarity_gate_blocks_redundant_save():
    """Saving a near-duplicate of an existing era must be refused; a differentiated re-draft then saves."""
    clone_slug = "floating_sky_citadel_clone"
    fresh_slug = "unit_test_coral_terraces"
    poly = _era("Floating Sky Citadel Replica", "poly", clone_slug)
    poly["name"] = "🏝️ Floating Sky Citadel Replica (Cloned — Multi-Partner Variant)"
    mono = _era("Floating Sky Citadel Replica", "mono", clone_slug)
    mono["name"] = "💍 Floating Sky Citadel Replica (Cloned — Sole Partner Variant)"
    poly2 = _era("Coral Terraces", "poly", fresh_slug)
    mono2 = _era("Coral Terraces", "mono", fresh_slug)

    script = FakeScript([
        {"content": '<tool:search_eras>{"query": "floating sky citadel"}</tool:search_eras>'},
        {"content": '<tool:draft_era_pair>' + json.dumps({"slug": clone_slug, "polygyny": poly, "monogamy": mono}) + '</tool:draft_era_pair>'},
        {"content": '<tool:save_era_extension>{}</tool:save_era_extension>'},   # similarity gate refusal
        {"content": '<tool:draft_era_pair>' + json.dumps({"slug": fresh_slug, "polygyny": poly2, "monogamy": mono2}) + '</tool:draft_era_pair>'},
        {"content": '<tool:save_era_extension>{}</tool:save_era_extension>'},   # differentiated -> ok
        {"content": '<tool:save_era_extension>{}</tool:save_era_extension>'},   # identical successful save -> duplicate guard
        {"content": '<tool:finalize>{"message": "Differentiated and saved."}</tool:finalize>'},
    ])
    harness = hmod.EraAgentHarness(endpoint="http://localhost:5001/v1", model="fake")
    harness.check_server = lambda: True
    harness._post_chat = script
    harness._find_similarity_conflict = lambda poly_arg, slug_arg: (
        (
            "Too similar to existing era 'Floating Sky Citadel' (`floating_sky_citadel_haven`) "
            "(name overlap 95%). Differentiate region, naming, and social dynamics, then re-draft "
            "with a fresh slug."
        )
        if slug_arg == clone_slug
        else None
    )
    saved = []
    real_save = hmod.save_extension_file
    hmod.save_extension_file = lambda fn, content, destination="project_data": (saved.append(fn) or
                                                    {"success": True, "filePath": f"/tmp/{fn}", "count": 2})
    steps = []
    try:
        result = harness.run_turn("clone the citadel", status_cb=lambda s: None,
                                  step_cb=lambda st: steps.append(dict(st)))
    finally:
        hmod.save_extension_file = real_save

    save_steps = [s for s in result["tool_steps"] if s["name"] == "save_era_extension"]
    assert len(save_steps) == 3, f"expected 3 save attempts, got {len(save_steps)}"
    assert save_steps[0]["status"] == "error" and "Too similar" in save_steps[0]["output"]
    assert save_steps[1]["status"] == "done"
    assert save_steps[2]["status"] == "error" and "Duplicate" in save_steps[2]["output"]
    assert saved == [f"{fresh_slug}.json"], saved
    assert result["era_pair"]["polygyny"]["id"] == f"{fresh_slug}_haven"
    assert "saved" in result["agent_message"]
    print("PASS similarity_gate_blocks_redundant_save")


def test_prose_without_tool_hard_errors_when_draft_unsaved():
    """Model blabbers prose while a draft is unsaved -> corrective retry -> hard error."""
    slug = "unit_test_shoal"
    poly = _era("Unit Test Shoal", "poly", slug)
    mono = _era("Unit Test Shoal", "mono", slug)
    script = FakeScript([
        {"content": '<tool:search_eras>{"query": "shoal"}</tool:search_eras>'},
        {"content": '<tool:draft_era_pair>' + json.dumps({"slug": slug, "polygyny": poly, "monogamy": mono}) + '</tool:draft_era_pair>'},
        {"content": "I have processed the request and created The Amber Honeycomb Sanctuary!"},  # prose, no tool
        {"content": "I am providing a new pair: The Amber Honeycomb Sanctuary."},  # prose again after correction
    ])
    harness = hmod.EraAgentHarness(endpoint="http://localhost:5001/v1", model="fake")
    harness.check_server = lambda: True
    harness._post_chat = script
    raised = None
    try:
        harness.run_turn("more simialr", status_cb=lambda s: None, step_cb=lambda st: None)
    except hmod.EraHarnessError as e:
        raised = e
    assert raised is not None, "expected EraHarnessError"
    assert "without a tool call" in str(raised) or "failed to save" in str(raised)
    print("PASS prose_without_tool_hard_errors_when_draft_unsaved")


def test_readonly_qa_turn_allowed_without_save():
    """A pure question (no draft) ends via finalize after a search; prose exit gets one corrective."""
    script = FakeScript([
        {"content": '<tool:search_eras>{"query": "volcanic caldera hot springs"}</tool:search_eras>'},
        {"content": "The closest existing eras are the volcanic caldera and hot-spring lodges; "
                    "I can forge a new paired setting from any of them if you want."},
        {"content": '<tool:finalize>{"message": "The closest existing eras are the volcanic caldera '
                    'and hot-spring lodges; I can forge a new paired setting from any of them if you want."}'
                    '</tool:finalize>'},
    ])
    result = _run(script, prompt="what existing eras are similar to volcanic hot springs?")
    assert not result["era_pair"], "read-only turn must not fabricate a pair"
    assert "existing eras" in result["agent_message"].lower()
    assert [s["name"] for s in result["tool_steps"]] == ["search_eras", "finalize"]
    print("PASS readonly_qa_turn_allowed_without_save")


def test_cancel_before_next_model_call():
    """Cancellation stops the loop without claiming completion."""
    event = threading.Event()
    event.set()
    harness = hmod.EraAgentHarness(endpoint="http://localhost:5001/v1", model="fake")
    harness.check_server = lambda: True
    called = []
    harness._post_chat = lambda *args, **kwargs: called.append(True)
    try:
        harness.run_turn("cancel this", cancel_event=event)
    except hmod.EraHarnessError as exc:
        assert "Cancelled by user" in str(exc)
    else:
        raise AssertionError("cancelled turn unexpectedly completed")
    assert not called
    print("PASS cancel_before_next_model_call")


def test_queued_instruction_is_injected():
    """Queued instructions are visible to the next model iteration."""
    seen = []

    def scripted(messages, **kwargs):
        seen.append(messages[-1]["content"])
        return {"content": '<tool:finalize>{"message":"Acknowledged."}</tool:finalize>'}

    harness = hmod.EraAgentHarness(endpoint="http://localhost:5001/v1", model="fake")
    harness.check_server = lambda: True
    harness._post_chat = scripted
    result = harness.run_turn(
        "begin",
        instruction_queue=lambda: ["please prioritize the new constraint"],
    )
    assert result["agent_message"].startswith("Acknowledged")
    assert "new constraint" in seen[0]
    print("PASS queued_instruction_is_injected")


def main():
    os.environ["ERA_AGENT_ALLOW_TAG_FALLBACK"] = "1"
    tests = [
        test_happy_path_native_tool_calls,
        test_happy_path_tag_protocol,
        test_direct_draft_without_search,
        test_finalize_rejected_while_unsaved,
        test_similarity_gate_blocks_redundant_save,
        test_prose_without_tool_hard_errors_when_draft_unsaved,
        test_readonly_qa_turn_allowed_without_save,
        test_cancel_before_next_model_call,
        test_queued_instruction_is_injected,
    ]
    failed = 0
    for t in tests:
        try:
            t()
        except Exception:
            failed += 1
            print(f"FAIL {t.__name__}")
            traceback.print_exc()
    print(f"\n{len(tests) - failed}/{len(tests)} passed")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
