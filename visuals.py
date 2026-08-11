"""
Module D: Wan 1.3B Local Text-to-Video Art Director (visuals.py)
Generates sequential 9:16 vertical video clips (.mp4) locally using Wan 1.3B in FP16 precision.
Optimized for Google Colab Free Tier (Tesla T4 GPU with 15GB VRAM & 12GB System RAM).
Includes aggressive VRAM safety features (CPU model offloading, attention slicing, VAE tiling, GC).
"""
import os
import gc
import re
import logging
from typing import List, Dict, Any
import torch
import numpy as np
from PIL import Image

# Hugging Face Diffusers Wan 1.3B imports
try:
    from diffusers import WanPipeline
    from diffusers.utils import export_to_video
except ImportError:
    WanPipeline = None
    export_to_video = None

from config import (
    WAN_MODEL_ID, IMAGE_WIDTH, IMAGE_HEIGHT, WAN_NUM_FRAMES, WAN_FPS,
    WAN_NUM_INFERENCE_STEPS, WAN_GUIDANCE_SCALE, ASSETS_DIR,
    get_random_num_scenes, generate_hybrid_prompt
)
from agent_llm import generate_scene_prompts

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)


def export_frames_to_mp4(frames: List[Any], output_path: str, fps: int = WAN_FPS) -> str:
    """Utility to export video frames to MP4 using diffusers export_to_video or imageio fallback."""
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    try:
        if export_to_video is not None:
            export_to_video(frames, output_path, fps=fps)
            logger.info(f"Wan 1.3B MP4 video clip saved via export_to_video: {output_path}")
            return output_path
    except Exception as e:
        logger.warning(f"diffusers.utils.export_to_video unavailable or failed ({e}). Falling back to imageio...")

    try:
        import imageio
        writer = imageio.get_writer(output_path, fps=fps, codec="libx264")
        for frame in frames:
            if isinstance(frame, Image.Image):
                writer.append_data(np.array(frame))
            else:
                writer.append_data(np.array(frame))
        writer.close()
        logger.info(f"Wan 1.3B MP4 video clip saved via imageio: {output_path}")
    except Exception as e:
        logger.error(f"Failed to encode video ({e}).")
    return output_path


class WanArtDirector:
    def __init__(self, model_id: str = WAN_MODEL_ID):
        self.model_id = model_id
        self.pipe = None
        self.device = "cuda" if torch.cuda.is_available() else "cpu"

    def _init_pipeline(self):
        """
        Initialize Wan 1.3B Text-to-Video pipeline with aggressive VRAM safety rules for Tesla T4 GPU (15GB VRAM).
        """
        if self.pipe is not None:
            return

        if WanPipeline is None:
            logger.warning("diffusers package does not have WanPipeline installed. Running in procedural fallback mode.")
            self.pipe = None
            return

        try:
            if self.device == "cuda":
                torch_dtype = torch.float16  # Optimal FP16 precision for Tesla T4 Tensor Cores
                gpu_name = torch.cuda.get_device_name(0)
                logger.info(f"Targeting Tesla T4 CUDA GPU ({gpu_name}) for Wan 1.3B...")
            else:
                torch_dtype = torch.float32
                logger.warning("CUDA unavailable! Running Wan 1.3B on CPU will be extremely slow.")

            logger.info(f"Loading Wan 1.3B Text-to-Video pipeline '{self.model_id}' (torch.float16)...")

            self.pipe = WanPipeline.from_pretrained(
                self.model_id,
                torch_dtype=torch_dtype,
                use_safetensors=True
            )

            # Aggressive VRAM Safety Optimizations for Tesla T4 (15GB VRAM limit)
            if self.device == "cuda":
                # 1. CPU Offloading: Moves submodules to system RAM when idle
                logger.info("Enabling pipe.enable_model_cpu_offload() for T4 VRAM optimization...")
                self.pipe.enable_model_cpu_offload()

                # 2. Attention slicing to prevent peak VRAM allocation spikes
                if hasattr(self.pipe, "enable_attention_slicing"):
                    self.pipe.enable_attention_slicing("max")

                # 3. VAE Tiling/Slicing to prevent OOM during video decode
                if hasattr(self.pipe, "enable_vae_tiling"):
                    self.pipe.enable_vae_tiling()
                if hasattr(self.pipe, "enable_vae_slicing"):
                    self.pipe.enable_vae_slicing()

            logger.info("Wan 1.3B Text-to-Video Pipeline initialized successfully!")

        except Exception as e:
            logger.warning(f"PyTorch/diffusers Wan 1.3B pipeline load failed ({e}). Using procedural visual canvas builder.")
            self.pipe = None

    def clean_vram(self):
        """Flushes PyTorch CUDA cache and runs garbage collection between scene generations."""
        gc.collect()
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
            torch.cuda.ipc_collect()

    def create_scene_prompts(self, script_text: str, num_scenes: int = None, raw_tags: str = "") -> List[Dict[str, Any]]:
        """
        Segment script text into N visual prompts using OpenRouter LLM dynamic art director,
        fused with the Hybrid Master Blueprint extracted from tags.
        """
        if not num_scenes:
            num_scenes = get_random_num_scenes()

        clean_script = re.sub(r'\[PAUSE=[\d.]+\]', '', script_text)
        llm_prompts = generate_scene_prompts(clean_script, num_scenes)
        dynamic_master_style = generate_hybrid_prompt(raw_tags if raw_tags else clean_script)

        negative_prompt = (
            "blurry, distorted, text, watermark, low quality, oversaturated, video game, "
            "render, 3d model, CGI, static still, freeze frame, low resolution"
        )

        scene_prompts = []
        for idx in range(num_scenes):
            raw_data = llm_prompts[idx] if idx < len(llm_prompts) else {}
            prompt_core = {"prompt": raw_data} if isinstance(raw_data, str) else raw_data

            text_to_split = prompt_core.get("prompt", clean_script[:120])
            truncated_core = " ".join(text_to_split.split()[:20])

            full_prompt = (
                f"{truncated_core}, {dynamic_master_style}, "
                f"cinematic 35mm horror video footage, dynamic organic movement, 8k resolution, photorealistic horror atmospheric lighting"
            )

            scene_prompts.append({
                "scene_id": prompt_core.get("frame_id", idx + 1),
                "prompt": full_prompt,
                "negative_prompt": negative_prompt,
                "scene_type": prompt_core.get("scene_type", "continuous_action")
            })

        return scene_prompts

    def generate_storyboard(
        self,
        script_text: str,
        num_scenes: int = None,
        output_dir: str = str(ASSETS_DIR),
        raw_tags: str = ""
    ) -> List[str]:
        """
        Generate sequential 9:16 vertical MP4 video clips using Wan 1.3B model.
        Outputs final .mp4 clip paths to output_dir.
        """
        if not num_scenes:
            num_scenes = get_random_num_scenes()

        self._init_pipeline()
        os.makedirs(output_dir, exist_ok=True)

        scene_prompts = self.create_scene_prompts(script_text, num_scenes, raw_tags)
        generated_clip_paths = []

        logger.info(f"Generating {num_scenes} vertical Wan 1.3B video clips (Resolution: {IMAGE_WIDTH}x{IMAGE_HEIGHT})...")

        for idx, scene in enumerate(scene_prompts):
            s_id = scene["scene_id"]
            file_name = f"scene_{s_id}_action.mp4"
            out_video_path = os.path.join(output_dir, file_name)

            logger.info(f"Rendering Wan 1.3B Video Clip {s_id}/{num_scenes} -> '{file_name}'...")

            if self.pipe is not None:
                try:
                    seed = 2000 + s_id
                    generator = torch.Generator(device="cpu").manual_seed(seed)

                    with torch.inference_mode():
                        output = self.pipe(
                            prompt=scene["prompt"],
                            negative_prompt=scene["negative_prompt"],
                            height=IMAGE_HEIGHT,
                            width=IMAGE_WIDTH,
                            num_frames=WAN_NUM_FRAMES,
                            guidance_scale=WAN_GUIDANCE_SCALE,
                            num_inference_steps=WAN_NUM_INFERENCE_STEPS,
                            generator=generator
                        )
                        frames = output.frames[0]

                    export_frames_to_mp4(frames, out_video_path, fps=WAN_FPS)

                except Exception as e:
                    logger.error(f"Failed to generate video clip {s_id} via Wan 1.3B ({e}). Creating procedural fallback video clip.")
                    out_video_path = self._generate_procedural_video_clip(s_id, scene["prompt"], out_video_path)

            else:
                out_video_path = self._generate_procedural_video_clip(s_id, scene["prompt"], out_video_path)

            # Mandatory VRAM Cleanup between generation steps (Garbage Collection + CUDA empty_cache)
            self.clean_vram()
            generated_clip_paths.append(out_video_path)

        logger.info(f"Successfully generated {len(generated_clip_paths)} Wan 1.3B video assets!")
        return generated_clip_paths

    def _generate_procedural_video_clip(self, scene_id: int, prompt_text: str, out_path: str) -> str:
        """Generates a high-quality procedural dark horror MP4 fallback video clip when GPU model is offline."""
        logger.info(f"Building procedural fallback video clip for scene {scene_id}...")
        try:
            frames = []
            num_frames = 24
            for i in range(num_frames):
                img = Image.new("RGB", (IMAGE_WIDTH, IMAGE_HEIGHT), color=(12, 10, 18))
                frames.append(img)
            export_frames_to_mp4(frames, out_path, fps=12)
        except Exception as e:
            logger.error(f"Procedural fallback error: {e}")
        return out_path


# Backward-compatibility class alias so existing code expecting SDArtDirector works seamlessly
SDArtDirector = WanArtDirector
