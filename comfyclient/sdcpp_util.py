#!/usr/bin/env python3
"""
Utilities for sd.cpp payload construction and image file management.
"""

import os
import re
from typing import Any, Dict, List, Optional, Tuple

def extract_loras_from_prompt_and_params(params: Dict[str, Any], lora_spec: Any) -> Tuple[str, str, List[Dict[str, Any]]]:
    """
    Extracts positive prompt, negative prompt, and structured LoRA list for sd.cpp.
    sd.cpp requires lora to be a list of {'path': filename, 'multiplier': float, 'is_high_noise': False}.
    Also strips any <lora:name:strength> tags from the prompt text since sd.cpp doesn't parse them.
    """
    pos = str(params.get("positive") or params.get("prompt") or "")
    neg = str(params.get("negative") or params.get("negative_prompt") or "")

    lora_list: List[Dict[str, Any]] = []
    seen = set()

    # 1. Parse from params.lora or item.lora
    from .runner import parse_lora_spec
    parsed = parse_lora_spec(lora_spec)
    for l in parsed:
        if not l.get("on", True):
            continue
        name = l.get("name", "")
        if not name:
            continue
        path = name if name.endswith(".safetensors") else f"{name}.safetensors"
        strength = float(l.get("strength", 1.0))
        if path.lower() not in seen:
            seen.add(path.lower())
            lora_list.append({
                "path": path,
                "multiplier": strength,
                "is_high_noise": False,
            })

    # 2. Extract embedded <lora:name:weight> from prompt text and strip them
    def _strip_lora(match):
        tag_content = match.group(1).strip()
        parts = tag_content.split(":")
        if parts:
            lname = parts[0].strip()
            lstr = 1.0
            if len(parts) > 1:
                try:
                    lstr = float(parts[1].strip())
                except ValueError:
                    pass
            lpath = lname if lname.endswith(".safetensors") else f"{lname}.safetensors"
            if lpath.lower() not in seen:
                seen.add(lpath.lower())
                lora_list.append({
                    "path": lpath,
                    "multiplier": lstr,
                    "is_high_noise": False,
                })
        return ""

    pos = re.sub(r"<lora:([^>]+)>", _strip_lora, pos).strip()
    neg = re.sub(r"<lora:([^>]+)>", _strip_lora, neg).strip()

    return pos, neg, lora_list


def build_sdcpp_payload(
    params: Dict[str, Any],
    lora_spec: Any = None,
    seed: Optional[int] = None,
    output_format: str = "png",
) -> Dict[str, Any]:
    """
    Builds the native /sdcpp/v1/img_gen payload JSON dictionary.
    """
    pos, neg, loras = extract_loras_from_prompt_and_params(params, lora_spec)
    
    width = int(params.get("width") or 512)
    height = int(params.get("height") or 512)
    steps = int(params.get("steps") or 20)
    cfg = float(params.get("cfg") or 7.0)
    sampler = str(params.get("sampler") or "euler")
    scheduler = str(params.get("scheduler") or "normal")
    final_seed = int(seed if seed is not None and seed >= 0 else params.get("seed", -1))
    if final_seed < 0:
        import random
        final_seed = random.randint(0, 2**32 - 1)

    payload: Dict[str, Any] = {
        "prompt": pos,
        "negative_prompt": neg,
        "clip_skip": int(params.get("clip_skip", -1)),
        "width": width,
        "height": height,
        "strength": float(params.get("strength", 0.75)),
        "seed": final_seed,
        "batch_count": 1,
        "auto_resize_ref_image": True,
        "increase_ref_index": False,
        "control_strength": 0.9,
        "ip_adapter_strength": 1.0,
        "embed_image_metadata": True,
        "sample_params": {
            "scheduler": scheduler,
            "sample_method": sampler,
            "sample_steps": steps,
            "guidance": {
                "txt_cfg": cfg,
                "distilled_guidance": float(params.get("distilled_guidance", 3.5)),
            },
        },
        "lora": loras,
        "output_format": output_format if output_format in ("png", "jpeg", "webp") else "png",
        "output_compression": 100,
    }
    return payload

