"""
Media Utilities for Native Video and Image Inputs.
Supports:
1. Native `input_video` / `video_url` blocks conforming to llama.cpp & multimodal LLMs (Qwen2.5-VL, LLaVA-OneVision, etc.).
2. Fallback keyframe extraction via ffmpeg if native video fails or for non-native endpoints.
3. Clean MIME type resolution and base64 / file URL generation.
"""

import os
import sys
import base64
import tempfile
import subprocess
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Any


VIDEO_EXTENSIONS = {".mp4", ".mkv", ".webm", ".mov", ".avi", ".flv", ".m4v"}
IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp", ".avif", ".bmp", ".gif"}


def is_video_file(file_path: str) -> bool:
    """Checks if a file has a video extension."""
    if not file_path:
        return False
    ext = Path(file_path).suffix.lower()
    return ext in VIDEO_EXTENSIONS


def is_image_file(file_path: str) -> bool:
    """Checks if a file has an image extension."""
    if not file_path:
        return False
    ext = Path(file_path).suffix.lower()
    return ext in IMAGE_EXTENSIONS


def get_video_mime(file_path: str) -> str:
    ext = Path(file_path).suffix.lower()
    if ext == ".mp4" or ext == ".m4v":
        return "video/mp4"
    if ext == ".webm":
        return "video/webm"
    if ext == ".mkv":
        return "video/x-matroska"
    if ext == ".mov":
        return "video/quicktime"
    if ext == ".avi":
        return "video/x-msvideo"
    return "video/mp4"


def get_image_mime(file_path: str) -> str:
    ext = Path(file_path).suffix.lower()
    if ext == ".png":
        return "image/png"
    if ext == ".webp":
        return "image/webp"
    if ext == ".avif":
        return "image/avif"
    if ext == ".gif":
        return "image/gif"
    return "image/jpeg"


def load_media_payload(file_path: str, max_video_size_mb: int = 40) -> Optional[Dict[str, Any]]:
    """
    Constructs an API-ready multimodal payload for llama-server.
    For videos: creates a native `input_video` block (data URL or file:// URI).
    For images: creates an `image_url` block.
    """
    clean_path = file_path.replace("file://", "").strip()
    if not os.path.exists(clean_path):
        return None

    if is_video_file(clean_path):
        mime = get_video_mime(clean_path)
        file_size_mb = os.path.getsize(clean_path) / (1024 * 1024)

        # If file is reasonable in size (<= 40MB), pass as base64 data URL
        # Otherwise pass as direct absolute file:// URL (supported by llama-server with ffmpeg backend)
        if file_size_mb <= max_video_size_mb:
            try:
                with open(clean_path, "rb") as vf:
                    b64 = base64.b64encode(vf.read()).decode("ascii")
                    video_uri = f"data:{mime};base64,{b64}"
            except Exception as e:
                print(f"[Media] Failed reading video bytes, falling back to file:// URL: {e}")
                video_uri = f"file://{os.path.abspath(clean_path)}"
        else:
            video_uri = f"file://{os.path.abspath(clean_path)}"

        return {
            "type": "video",
            "native_block": {
                "type": "input_video",
                "input_video": {
                    "url": video_uri
                }
            },
            "file_path": clean_path,
            "video_uri": video_uri
        }

    # Image file
    mime = get_image_mime(clean_path)
    try:
        with open(clean_path, "rb") as img_f:
            b64 = base64.b64encode(img_f.read()).decode("ascii")
            data_url = f"data:{mime};base64,{b64}"
            return {
                "type": "image",
                "native_block": {
                    "type": "image_url",
                    "image_url": {
                        "url": data_url
                    }
                },
                "data_url": data_url
            }
    except Exception as e:
        print(f"[Media] Failed loading image: {e}")
        return None


def extract_fallback_keyframes(video_path: str, max_frames: int = 4) -> List[Dict[str, Any]]:
    """
    Fallback: extracts keyframes if a model/server doesn't support the native input_video block.
    """
    clean_path = video_path.replace("file://", "").strip()
    if not os.path.exists(clean_path):
        return []

    try:
        # Get duration
        cmd = ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", clean_path]
        res = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
        dur = float(res.stdout.strip()) if res.stdout.strip() else 5.0
    except Exception:
        dur = 5.0

    step = dur / (max_frames + 1)
    timestamps = [step * (i + 1) for i in range(max_frames)]
    frames = []
    tmp_dir = tempfile.gettempdir()

    for idx, ts in enumerate(timestamps):
        out_jpg = os.path.join(tmp_dir, f"cg_vkf_{os.getpid()}_{idx}_{int(ts*100)}.jpg")
        try:
            cmd = ["ffmpeg", "-y", "-ss", str(ts), "-i", clean_path, "-vframes", "1", "-vf", "scale='min(1024,iw)':-2", "-q:v", "3", out_jpg]
            subprocess.run(cmd, capture_output=True, check=True, timeout=15)
            if os.path.exists(out_jpg) and os.path.getsize(out_jpg) > 0:
                with open(out_jpg, "rb") as f:
                    b64 = base64.b64encode(f.read()).decode("ascii")
                    frames.append({
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:image/jpeg;base64,{b64}"
                        }
                    })
        except Exception:
            pass
        finally:
            if os.path.exists(out_jpg):
                try:
                    os.remove(out_jpg)
                except Exception:
                    pass

    return frames
