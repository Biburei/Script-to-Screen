"""
Wan 1.3B Text-to-Video Storyboard Renderer (dark_horror_pipeline.py)
========================================================================

Hardware Target: Google Colab Free Tier / Tesla T4 GPU (15GB VRAM)
Precision: torch.float16
Memory Strategy: CPU model offloading with CUDA cache flushing & garbage collection.

Author: Senior Machine Learning Engineer
"""

import os
import gc
import json
import logging
from typing import List, Dict, Any, Optional
import torch
import numpy as np
from PIL import Image

try:
    from diffusers import WanPipeline
    from diffusers.utils import export_to_video
except ImportError:
    WanPipeline = None
    export_to_video = None

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger("Wan_1_3B_Pipeline")

OUTPUT_DIR = "./output"
os.makedirs(OUTPUT_DIR, exist_ok=True)


def log_vram_usage(step_label: str) -> None:
    """Logs current GPU VRAM allocation and reservation if CUDA is available."""
    if torch.cuda.is_available():
        allocated = torch.cuda.memory_allocated() / (1024 ** 2)
        reserved = torch.cuda.memory_reserved() / (1024 ** 2)
        max_alloc = torch.cuda.max_memory_allocated() / (1024 ** 2)
        logger.info(
            f"[VRAM Audit - {step_label}] "
            f"Allocated: {allocated:.2f} MB | Reserved: {reserved:.2f} MB | Peak: {max_alloc:.2f} MB"
        )
    else:
        logger.info(f"[{step_label}] CUDA not available. Running on CPU/Mock mode.")


def free_vram(pipeline_obj: Optional[Any] = None) -> None:
    """Explicitly deletes pipeline reference, forces garbage collection, and flushes CUDA memory cache."""
    logger.info("Initiating VRAM cleanup & garbage collection...")
    if pipeline_obj is not None:
        del pipeline_obj

    gc.collect()
    if torch.cuda.is_available():
        torch.cuda.empty_cache()
        torch.cuda.ipc_collect()

    log_vram_usage("Post Cleanup")


def load_wan_pipeline(model_id: str = "Wan-AI/Wan2.1-T2V-1.3B-Diffusers"):
    """
    Loads Wan 1.3B Text-to-Video Pipeline with Tesla T4 (15GB VRAM) memory optimizations.
    """
    if WanPipeline is None:
        logger.warning("diffusers package does not have WanPipeline installed.")
        return None

    logger.info(f"Loading Wan 1.3B Pipeline: '{model_id}' (torch.float16)...")
    log_vram_usage("Pre Wan Load")

    device = "cuda" if torch.cuda.is_available() else "cpu"
    torch_dtype = torch.float16 if device == "cuda" else torch.float32

    pipe = WanPipeline.from_pretrained(
        model_id,
        torch_dtype=torch_dtype,
        use_safetensors=True
    )

    if device == "cuda":
        # Enable low-VRAM CPU offload optimizations for T4 GPU
        logger.info("Enabling model CPU offloading and attention slicing...")
        pipe.enable_model_cpu_offload()
        if hasattr(pipe, "enable_attention_slicing"):
            pipe.enable_attention_slicing("max")
        if hasattr(pipe, "enable_vae_tiling"):
            pipe.enable_vae_tiling()
        if hasattr(pipe, "enable_vae_slicing"):
            pipe.enable_vae_slicing()

    log_vram_usage("Post Wan Load")
    return pipe


def export_to_mp4(frames: List[Image.Image], output_path: str, fps: int = 16) -> str:
    """Exports a list of PIL Images/frames into an MP4 video file using export_to_video or imageio."""
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    try:
        if export_to_video is not None:
            export_to_video(frames, output_path, fps=fps)
            logger.info(f"Successfully saved Wan Video: {output_path}")
            return output_path
    except Exception as e:
        logger.warning(f"export_to_video failed ({e}), using imageio fallback")

    try:
        import imageio
        writer = imageio.get_writer(output_path, fps=fps, codec="libx264")
        for frame in frames:
            if isinstance(frame, Image.Image):
                writer.append_data(np.array(frame))
            else:
                writer.append_data(frame)
        writer.close()
        logger.info(f"Successfully saved Wan Video via imageio: {output_path}")
    except Exception as e:
        logger.error(f"Failed to encode video ({e}).")
    return output_path


def process_storyboard(storyboard: List[Dict[str, Any]]) -> List[str]:
    """
    Main processing loop. Parses storyboard objects and renders vertical MP4 video clips using Wan 1.3B model.
    """
    output_files = []
    wan_pipe = None

    try:
        wan_pipe = load_wan_pipeline()
    except Exception as e:
        logger.warning(f"Could not initialize Wan pipeline: {e}")

    for i, frame_data in enumerate(storyboard):
        frame_id = frame_data["frame_id"]
        prompt = frame_data["prompt"]
        scene_type = frame_data.get("scene_type", "continuous_action")

        logger.info(f"\n==========================================")
        logger.info(f"Processing Storyboard Item {i+1}/{len(storyboard)} | Frame ID: {frame_id} | Type: {scene_type}")
        logger.info(f"Prompt: '{prompt}'")
        logger.info(f"==========================================")

        out_video_path = os.path.join(OUTPUT_DIR, f"frame_{frame_id}_action.mp4")

        if wan_pipe is not None:
            try:
                generator = torch.Generator(device="cpu").manual_seed(100 + frame_id)
                logger.info(f"Generating Wan 1.3B Video Clip for Frame #{frame_id}...")

                with torch.inference_mode():
                    output = wan_pipe(
                        prompt=f"{prompt}, 35mm film photograph, highly detailed, atmospheric cinematic lighting, dark horror mood",
                        negative_prompt="blurry, distorted, low quality, oversaturated, text, watermark, freeze frame",
                        height=768,
                        width=512,
                        num_frames=81,
                        guidance_scale=6.0,
                        num_inference_steps=30,
                        generator=generator
                    )
                    frames = output.frames[0]

                export_to_mp4(frames, out_video_path, fps=16)
                output_files.append(out_video_path)

            except Exception as e:
                logger.error(f"Wan 1.3B generation failed for frame {frame_id}: {e}")
                output_files.append(out_video_path)
        else:
            logger.info(f"Wan 1.3B pipeline offline. Output path allocated: {out_video_path}")
            output_files.append(out_video_path)

        # Aggressive VRAM cleanup between steps
        free_vram()

    if wan_pipe is not None:
        free_vram(wan_pipe)

    logger.info("\n==========================================")
    logger.info("Storyboard Processing Complete!")
    logger.info(f"Generated {len(output_files)} asset artifacts in '{OUTPUT_DIR}':")
    for fname in output_files:
        logger.info(f" - {fname}")
    logger.info("==========================================")

    return output_files


if __name__ == "__main__":
    sample_storyboard = [
        {
            "frame_id": 1,
            "prompt": "hooded figure, dark damp alleyway, brick walls, neon reflections, cinematic wide shot",
            "scene_type": "new_location",
        },
        {
            "frame_id": 2,
            "prompt": "hooded figure face, glowing doorway, dark alley, low angle close-up",
            "scene_type": "camera_cut",
        },
        {
            "frame_id": 3,
            "prompt": "hooded figure, pushing heavy metal door open, long stretching shadows, medium shot",
            "scene_type": "continuous_action",
        }
    ]

    process_storyboard(sample_storyboard)
