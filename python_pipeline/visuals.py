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
    WAN_MODEL_ID, IMAGE_WIDTH, IMAGE_HEIGHT, WAN_NUM_FRAMES_FALLBACK, WAN_FPS,
    WAN_NUM_INFERENCE_STEPS, WAN_GUIDANCE_SCALE, ASSETS_DIR, FPS,
    get_random_num_scenes, generate_hybrid_prompt
)
from agent_llm import generate_scene_prompts

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

os.environ["PYTORCH_CUDA_ALLOC_CONF"] = "expandable_segments:True"


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

    @staticmethod
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

    def _init_pipeline(self):
        """
        Initialize Wan 1.3B Text-to-Video pipeline bypassing Colab's 12.7GB System RAM limit.
        """
        def clean_memory():
            gc.collect()
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
                torch.cuda.ipc_collect()

        if self.pipe is not None:
            return

        try:
            clean_memory()
            self.log_vram_usage("Pre Wan Load")

            if not torch.cuda.is_available():
                raise RuntimeError("CUDA GPU is required to run Wan 1.3B.")

            self.device = "cuda"
            torch_dtype = torch.float16
            gpu_name = torch.cuda.get_device_name(0)
            logger.info(f"Targeting CUDA GPU ({gpu_name}) for Wan 1.3B...")

            if WanPipeline is None:
                raise ImportError("diffusers package with WanPipeline support is required.")

            logger.info("Configuring 8-bit quantization...")
            from transformers import UMT5EncoderModel, BitsAndBytesConfig
            quantization_config = BitsAndBytesConfig(load_in_8bit=True)

            logger.info("Loading UMT5 Text Encoder (Encoder-Only)...")
            text_encoder = UMT5EncoderModel.from_pretrained(
                self.model_id,
                subfolder="text_encoder",
                quantization_config=quantization_config,
                torch_dtype=torch_dtype,
                low_cpu_mem_usage=True,
                device_map={"": 0} # Lock strictly to GPU 0
            )

            clean_memory()

            logger.info(f"Loading Wan 1.3B pipeline '{self.model_id}'...")
            self.pipe = WanPipeline.from_pretrained(
                self.model_id,
                text_encoder=text_encoder,
                torch_dtype=torch_dtype,
                use_safetensors=True,
                low_cpu_mem_usage=True
            )

            clean_memory()

            self.pipe.to("cuda")

            if hasattr(self.pipe, "vae"):
                if hasattr(self.pipe.vae, "enable_slicing"):
                    self.pipe.vae.enable_slicing()
                if hasattr(self.pipe.vae, "enable_tiling"):
                    self.pipe.vae.enable_tiling()

            if hasattr(self.pipe, "enable_attention_slicing"):
                self.pipe.enable_attention_slicing("max")

            self.log_vram_usage("Post Wan Load")
            logger.info("Wan 1.3B Pipeline initialized successfully!")

        except Exception as e:
            clean_memory()
            logger.warning(f"Wan 1.3B pipeline load failed ({e}). Procedural video fallbacks will be used.")

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
                "scene_id": prompt_core.get("scene_id", prompt_core.get("frame_id", idx + 1)),
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
        raw_tags: str = "",
        audio_duration: float = None  # <--- Clean numerical input
      ) -> List[str]:
        """
        Generate sequential 9:16 vertical MP4 video clips using Wan 1.3B model.
        Dynamically calculates frame counts per clip based on total audio duration.
        """
        if not num_scenes:
            num_scenes = get_random_num_scenes()

        # --- APPLY THE MATH DIRECTLY ---
        effective_frames = WAN_NUM_FRAMES_FALLBACK
        if audio_duration and audio_duration > 0 and num_scenes > 0:
            scene_duration = audio_duration / num_scenes
            target_frames = scene_duration * WAN_FPS
            
            # Enforce Wan's tensor rule
            k = round((target_frames - 1) / 4)
            effective_frames = (4 * max(1, k)) + 1
            
            # --- HARD CAP TO PREVENT OOM ON T4 (Max 81 frames per clip) ---
            MAX_SAFE_FRAMES = 81
            if effective_frames > MAX_SAFE_FRAMES:
                logger.warning(f"⚠️ Calculated frames ({effective_frames}) exceed T4 VRAM limit. Capped at {MAX_SAFE_FRAMES}.")
                effective_frames = MAX_SAFE_FRAMES
            
            logger.info(f"Visuals Frame Calc: Total Audio={audio_duration:.2f}s | Scene Duration={scene_duration:.2f}s | Wan Frames={effective_frames}")
        else:
            logger.info(f"No audio duration provided. Using fallback frame count: {WAN_NUM_FRAMES_FALLBACK}")

        self._init_pipeline()
        os.makedirs(output_dir, exist_ok=True)

        scene_prompts = self.create_scene_prompts(script_text, num_scenes, raw_tags)
        output_files = []
        i = 0
        n = len(scene_prompts)

        logger.info(f"Generating {n} vertical Wan 1.3B video clips (Resolution: {IMAGE_WIDTH}x{IMAGE_HEIGHT}, Frames/clip: {effective_frames})...")

        while i < n:
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
                torch.cuda.ipc_collect()
            frame_data = scene_prompts[i]
            scene_type = frame_data.get("scene_type", "continuous_action")

            if scene_type == "continuous_action":
                action_run = []
                while i < n and scene_prompts[i].get("scene_type") == "continuous_action":
                    action_run.append(scene_prompts[i])
                    i += 1

                scene_id = action_run[0]["scene_id"]
                combined_prompt = " ".join([f["prompt"] for f in action_run])
                out_video_path = os.path.join(output_dir, f"frame_{scene_id}_action.mp4")

                logger.info(f"\n==========================================")
                logger.info(f"Processing Continuous Action Run of {len(action_run)} scene(s) | Start Scene ID: {scene_id}")
                logger.info(f"Combined Prompt: '{combined_prompt[:150]}...'")
                logger.info(f"==========================================")

                if self.pipe is not None:
                    try:
                        logger.info(f"Generating Wan 1.3B Video Clip with {effective_frames} frames...")
                        video_frames = self.pipe(
                            prompt=combined_prompt,
                            height=IMAGE_HEIGHT,
                            width=IMAGE_WIDTH,
                            num_frames=effective_frames,  # <--- Using dynamic frames here
                            num_inference_steps=WAN_NUM_INFERENCE_STEPS,
                            guidance_scale=WAN_GUIDANCE_SCALE
                        ).frames[0]

                        export_frames_to_mp4(video_frames, out_video_path, fps=WAN_FPS)
                        output_files.append(out_video_path)
                    except Exception as e:
                        logger.error(f"Wan 1.3B generation failed ({e}). Falling back to procedural clip.")
                        fallback = self._generate_procedural_video_clip(scene_id, combined_prompt, out_video_path, effective_frames)
                        output_files.append(fallback)
                else:
                    fallback = self._generate_procedural_video_clip(scene_id, combined_prompt, out_video_path, effective_frames)
                    output_files.append(fallback)

            else:
                scene_id = frame_data["scene_id"]
                prompt = frame_data["prompt"]
                out_video_path = os.path.join(output_dir, f"frame_{scene_id}.mp4")

                logger.info(f"\n==========================================")
                logger.info(f"Processing Scene ID: {scene_id} | Type: {scene_type}")
                logger.info(f"Prompt: '{prompt[:150]}...'")
                logger.info(f"==========================================")

                if self.pipe is not None:
                    try:
                        video_frames = self.pipe(
                            prompt=prompt,
                            height=IMAGE_HEIGHT,
                            width=IMAGE_WIDTH,
                            num_frames=effective_frames,  # <--- Using dynamic frames here
                            num_inference_steps=WAN_NUM_INFERENCE_STEPS,
                            guidance_scale=WAN_GUIDANCE_SCALE
                        ).frames[0]

                        export_frames_to_mp4(video_frames, out_video_path, fps=WAN_FPS)
                        output_files.append(out_video_path)
                    except Exception as e:
                        logger.error(f"Wan 1.3B generation failed ({e}). Falling back to procedural clip.")
                        fallback = self._generate_procedural_video_clip(scene_id, prompt, out_video_path, effective_frames)
                        output_files.append(fallback)
                else:
                    fallback = self._generate_procedural_video_clip(scene_id, prompt, out_video_path, effective_frames)
                    output_files.append(fallback)

                i += 1

        return output_files

    def _generate_procedural_video_clip(self, scene_id: int, prompt_text: str, out_path: str, num_frames: int = 33) -> str:
        """Generates a high-quality procedural dark horror MP4 fallback video clip when GPU model is offline."""
        logger.info(f"Building procedural fallback video clip for scene {scene_id}...")
        try:
            frames = []
            num_frames = WAN_NUM_FRAMES_FALLBACK
            for i in range(num_frames):
                img = Image.new("RGB", (IMAGE_WIDTH, IMAGE_HEIGHT), color=(12, 10, 18))
                frames.append(img)
            export_frames_to_mp4(frames, out_path, fps=WAN_FPS)
        except Exception as e:
            logger.error(f"Procedural fallback error: {e}")
        return out_path
