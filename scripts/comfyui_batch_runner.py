#!/usr/bin/env python3
"""
CharGenUI ComfyUI Batch Runner
A lightweight runner to batch-execute workflows exported from CharGenUI on ComfyUI.

Usage:
    python comfyui_batch_runner.py comfyui_batch.json [http://127.0.0.1:8188]
"""

import sys
import os
import json
import time
import urllib.request
import urllib.parse
import urllib.error

def main():
    if len(sys.argv) < 2:
        print("Usage: python comfyui_batch_runner.py <batch_file.json> [comfy_url]")
        print("Example: python comfyui_batch_runner.py comfyui_batch.json http://127.0.0.1:8188")
        sys.exit(1)

    batch_path = sys.argv[1]
    comfy_url = sys.argv[2] if len(sys.argv) > 2 else "http://127.0.0.1:8188"
    comfy_url = comfy_url.rstrip("/")

    if not os.path.exists(batch_path):
        print(f"Error: Batch file not found: {batch_path}")
        sys.exit(1)

    with open(batch_path, "r", encoding="utf-8") as f:
        try:
            batch_data = json.load(f)
        except Exception as e:
            print(f"Error parsing batch JSON: {e}")
            sys.exit(1)

    if not isinstance(batch_data, list):
        print("Error: Expected JSON array of batch items.")
        sys.exit(1)

    # Check ComfyUI connection
    print(f"Connecting to ComfyUI at {comfy_url}...")
    try:
        req = urllib.request.urlopen(f"{comfy_url}/system_stats", timeout=5)
        if req.getcode() == 200:
            print("✓ Connected to ComfyUI successfully!")
    except Exception as e:
        print(f"✗ Failed to connect to ComfyUI at {comfy_url}: {e}")
        print("Please make sure ComfyUI is running.")
        sys.exit(1)

    out_dir = os.path.join(os.getcwd(), "chargen_comfy_output")
    os.makedirs(out_dir, exist_ok=True)
    print(f"Output directory: {out_dir}")
    print(f"Total jobs to process: {len(batch_data)}\n")

    for idx, item in enumerate(batch_data, start=1):
        char_name = item.get("characterName", f"Char_{idx}")
        purpose = item.get("imagePurpose", "avatar")
        workflow = item.get("workflow")
        if not workflow:
            print(f"[{idx}/{len(batch_data)}] ⚠️ Skipping {char_name}: No workflow found in item.")
            continue

        print(f"[{idx}/{len(batch_data)}] 🚀 Queuing: {char_name} ({purpose.upper()})")
        payload = json.dumps({"prompt": workflow, "client_id": "chargenui_batch_runner"}).encode("utf-8")
        req = urllib.request.Request(
            f"{comfy_url}/prompt",
            data=payload,
            headers={"Content-Type": "application/json"}
        )

        try:
            resp = urllib.request.urlopen(req, timeout=10)
            res_json = json.loads(resp.read().decode("utf-8"))
            prompt_id = res_json.get("prompt_id")
            if not prompt_id:
                print(f"  ✗ Failed to get prompt_id: {res_json}")
                continue
            print(f"  Prompt ID: {prompt_id} (Queue position #{res_json.get('number', '?')})")
        except Exception as e:
            print(f"  ✗ Submission failed: {e}")
            continue

        # Poll history
        sys.stdout.write("  Waiting for execution")
        sys.stdout.flush()
        completed = False
        images = []
        start_time = time.time()

        while time.time() - start_time < 300: # 5 min timeout
            time.sleep(1.5)
            sys.stdout.write(".")
            sys.stdout.flush()

            try:
                hist_req = urllib.request.urlopen(f"{comfy_url}/history/{prompt_id}", timeout=5)
                hist_json = json.loads(hist_req.read().decode("utf-8"))
                run_data = hist_json.get(prompt_id)
                if run_data:
                    status = run_data.get("status", {})
                    if status.get("status_str") == "error":
                        print("\n  ✗ Execution error in ComfyUI!")
                        break
                    outputs = run_data.get("outputs", {})
                    for out_node in outputs.values():
                        if isinstance(out_node, dict) and "images" in out_node:
                            images.extend(out_node["images"])
                    if images or status.get("completed"):
                        completed = True
                        break
            except Exception:
                pass

        print("")
        if completed and images:
            for img_info in images:
                filename = img_info.get("filename")
                subfolder = img_info.get("subfolder", "")
                img_type = img_info.get("type", "output")
                q_params = urllib.parse.urlencode({"filename": filename, "subfolder": subfolder, "type": img_type})
                view_url = f"{comfy_url}/view?{q_params}"
                safe_name = "".join(c if c.isalnum() or c in "._-" else "_" for c in char_name)
                local_path = os.path.join(out_dir, f"{safe_name}_{purpose}_{filename}")

                try:
                    urllib.request.urlretrieve(view_url, local_path)
                    print(f"  ✓ Saved image to: {local_path}")
                except Exception as e:
                    print(f"  ✗ Failed to download {filename}: {e}")
        elif not completed:
            print("  ⚠️ Execution timed out.")

    print("\n🎉 Batch processing finished!")

if __name__ == "__main__":
    main()
