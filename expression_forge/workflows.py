"""
ComfyUI Workflow Builder for Img2Img Facial Expression Variants.
Supports standard SD 1.5, SDXL, and modern Checkpoint workflows with VAE Encode/Decode.
"""

from typing import Any, Dict


def build_img2img_workflow(
    checkpoint: str,
    positive_prompt: str,
    negative_prompt: str,
    input_image_name: str,
    denoise: float = 0.40,
    steps: int = 24,
    cfg: float = 6.5,
    sampler_name: str = "euler_ancestral",
    scheduler: str = "normal",
    seed: int = -1,
) -> Dict[str, Any]:
    """
    Constructs an API-format ComfyUI img2img execution graph.
    - Node 1: LoadImage (input source avatar)
    - Node 2: CheckpointLoaderSimple
    - Node 3: VAEEncode (image to latent)
    - Node 4: CLIPTextEncode (Positive Prompt with expression delta)
    - Node 5: CLIPTextEncode (Negative Prompt with suppressors)
    - Node 6: KSampler (with denoise < 0.5 to preserve structure)
    - Node 7: VAEDecode (latent to image)
    - Node 8: SaveImage (output result)
    """
    return {
        "1": {
            "class_type": "LoadImage",
            "inputs": {
                "image": input_image_name
            }
        },
        "2": {
            "class_type": "CheckpointLoaderSimple",
            "inputs": {
                "ckpt_name": checkpoint
            }
        },
        "3": {
            "class_type": "VAEEncode",
            "inputs": {
                "pixels": ["1", 0],
                "vae": ["2", 2]
            }
        },
        "4": {
            "class_type": "CLIPTextEncode",
            "inputs": {
                "clip": ["2", 1],
                "text": positive_prompt
            }
        },
        "5": {
            "class_type": "CLIPTextEncode",
            "inputs": {
                "clip": ["2", 1],
                "text": negative_prompt
            }
        },
        "6": {
            "class_type": "KSampler",
            "inputs": {
                "cfg": float(cfg),
                "denoise": float(denoise),
                "latent_image": ["3", 0],
                "model": ["2", 0],
                "negative": ["5", 0],
                "positive": ["4", 0],
                "sampler_name": sampler_name,
                "scheduler": scheduler,
                "seed": int(seed),
                "steps": int(steps)
            }
        },
        "7": {
            "class_type": "VAEDecode",
            "inputs": {
                "samples": ["6", 0],
                "vae": ["2", 2]
            }
        },
        "8": {
            "class_type": "SaveImage",
            "inputs": {
                "filename_prefix": "ExpressionForge",
                "images": ["7", 0]
            }
        }
    }
