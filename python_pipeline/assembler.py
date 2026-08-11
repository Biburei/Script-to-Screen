"""
Module F: MoviePy v2 Video Assembler (assembler.py)
Stitches audio, visual assets, and dynamic kinetic subtitles using MoviePy v2.
Features an Algorithmic Variance Engine (randomized colors/fonts/offsets) & Ken Burns motion zoom.
"""
import os
import random
import logging
try:
    import numpy as np
except ImportError:
    np = None
from typing import List, Dict, Any
from config import COLOR_PROFILES, OUTPUT_RESOLUTION, EXPORTS_DIR, TEMP_DIR
from random import randint

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

def apply_ken_burns_effect(clip: Any, duration: float, motion_type: str = None) -> Any:
    """
    Applies a dynamic, randomized Ken Burns motion effect (zoom/pan/tilt) to a MoviePy v2 ImageClip.
    Refactored with Python match-case structure.
    """
    # 1. Protect against zero-division errors with minimum duration fallback
    safe_duration = max(0.1, float(duration))
    clip = clip.with_duration(safe_duration)

    orig_w, orig_h = clip.w, clip.h

    # 2. Select motion choice at random if not specified or invalid
    MOTIONS = ["zoom_in", "zoom_out", "pan_left", "pan_right", "tilt_up", "tilt_down"]
    selected_motion = motion_type if motion_type in MOTIONS else random.choice(MOTIONS)

    # 3. Handle motion types with match-case
    match selected_motion:
        case "zoom_in":
            scaled_clip = clip.resized(lambda t: 1.0 + 0.10 * (t / safe_duration))
            return scaled_clip.cropped(
                width=orig_w,
                height=orig_h,
                x_center=scaled_clip.w / 2.0,
                y_center=scaled_clip.h / 2.0
            )

        case "zoom_out":
            scaled_clip = clip.resized(lambda t: 1.10 - 0.10 * (t / safe_duration))
            return scaled_clip.cropped(
                width=orig_w,
                height=orig_h,
                x_center=scaled_clip.w / 2.0,
                y_center=scaled_clip.h / 2.0
            )

        case _:
            # Panning & Tilting: 1.15x upscale prevents black edge exposure
            scale_factor = 1.15
            scaled_w = int(orig_w * scale_factor)
            scaled_h = int(orig_h * scale_factor)
            scaled_clip = clip.resized(new_size=(scaled_w, scaled_h))

            dx = scaled_w - orig_w
            dy = scaled_h - orig_h

            # Nested match-case for directional movement
            match selected_motion:
                case "pan_right":
                    x_center_fn = lambda t: (orig_w / 2.0) + dx * (t / safe_duration)
                    y_center_fn = lambda t: scaled_h / 2.0

                case "pan_left":
                    x_center_fn = lambda t: (orig_w / 2.0) + dx * (1.0 - (t / safe_duration))
                    y_center_fn = lambda t: scaled_h / 2.0

                case "tilt_down":
                    x_center_fn = lambda t: scaled_w / 2.0
                    y_center_fn = lambda t: (orig_h / 2.0) + dy * (t / safe_duration)

                case "tilt_up":
                    x_center_fn = lambda t: scaled_w / 2.0
                    y_center_fn = lambda t: (orig_h / 2.0) + dy * (1.0 - (t / safe_duration))

            return scaled_clip.cropped(
                width=orig_w,
                height=orig_h,
                x_center=x_center_fn,
                y_center=y_center_fn
            )

class MoviePyAssembler:
    def __init__(self, output_res: tuple = OUTPUT_RESOLUTION):
        self.output_width, self.output_height = output_res

    def select_random_variance_profile(self) -> Dict[str, Any]:
        """
        Algorithmic Variance Engine: Select a random layout profile per video
        to prevent social platform algorithm duplicate template detection.
        """
        profile = random.choice(COLOR_PROFILES).copy()
        
        # Add micro-variations to positioning and scaling
        profile["y_offset_px"] = int(self.output_height * profile["y_position"]) + random.randint(-30, 30)
        profile["scale_factor"] = round(random.uniform(0.95, 1.08), 2)
        
        logger.info(f"Algorithmic Variance Engine Profile: '{profile['name']}' (Y-Pos: {profile['y_offset_px']}px)")
        return profile

    def create_ken_burns_clip(self, image_path: str, duration: float, zoom_type: str = None, banner_height_ratio: float = 0.12) -> Any:
        """
        Apply smooth Ken Burns motion with cinematic letterbox effect:
        - Maintains original aspect ratio without stretching or distortion.
        - Places solid black horizontal banners across top and bottom of frame.
        - Resizes and positions content to fit in centralized gap between banners.
        """
        try:
            from moviepy import ImageClip, ColorClip, CompositeVideoClip
            from PIL import Image

            banner_height = int(self.output_height * banner_height_ratio)
            gap_height = self.output_height - (2 * banner_height)
            gap_width = self.output_width

            # Read original image dimensions to preserve aspect ratio strictly
            with Image.open(image_path) as img:
                orig_w, orig_h = img.size

            # Compute scale factor to fit within gap without stretching or distortion
            scale = min(gap_width / float(orig_w), gap_height / float(orig_h))
            fit_w = int(orig_w * scale)
            fit_h = int(orig_h * scale)

            raw_clip = ImageClip(image_path).with_duration(duration).resized(new_size=(fit_w, fit_h))

            # Apply dynamic Ken Burns motion effect helper
            motion_clip = apply_ken_burns_effect(raw_clip, duration, motion_type=zoom_type)

            # Center content vertically within the gap between top and bottom banners
            content_y = banner_height + (gap_height - min(fit_h, gap_height)) // 2
            content_clip = motion_clip.with_position(("center", content_y))

            # Create black background and solid top/bottom cinematic bars
            bg_black = ColorClip(size=(self.output_width, self.output_height), color=(0, 0, 0)).with_duration(duration)
            top_banner = ColorClip(size=(self.output_width, banner_height), color=(0, 0, 0)).with_duration(duration).with_position((0, 0))
            bottom_banner = ColorClip(size=(self.output_width, banner_height), color=(0, 0, 0)).with_duration(duration).with_position((0, self.output_height - banner_height))

            # Composite letterboxed scene
            return CompositeVideoClip([bg_black, content_clip, top_banner, bottom_banner], size=(self.output_width, self.output_height))

        except Exception as e:
            logger.warning(f"MoviePy v2 direct zoom effect fallback ({e})")
            from moviepy import ImageClip, ColorClip, CompositeVideoClip
            banner_height = int(self.output_height * banner_height_ratio)
            gap_height = self.output_height - (2 * banner_height)
            
            img_clip = ImageClip(image_path).with_duration(duration).resized(height=gap_height)
            img_clip = img_clip.with_position(("center", banner_height))
            
            bg_black = ColorClip(size=(self.output_width, self.output_height), color=(0, 0, 0)).with_duration(duration)
            top_banner = ColorClip(size=(self.output_width, banner_height), color=(0, 0, 0)).with_duration(duration).with_position((0, 0))
            bottom_banner = ColorClip(size=(self.output_width, banner_height), color=(0, 0, 0)).with_duration(duration).with_position((0, self.output_height - banner_height))
            
            return CompositeVideoClip([bg_black, img_clip, top_banner, bottom_banner], size=(self.output_width, self.output_height))

    def build_kinetic_caption_clips(
        self,
        word_timestamps: List[Dict[str, Any]],
        profile: Dict[str, Any]
        ) -> List[Any]:
        """
        Create word-by-word dynamic kinetic subtitle clips with a pop-in scale animation.
        Clips appear in the lower third and scale up rapidly to grab attention.
        """
        caption_clips = []
        try:
            from moviepy import TextClip

            #Randomly pick a caption style from the config file
            active_profile = random.choice(COLOR_PROFILES)
            logger.info(f"🎨 Selected Kinetic Caption Profile: {active_profile['name']}")

            y_pos_ratio = active_profile.get("y_position", 0.75)
            pos_y = active_profile.get("y_offset_px", int(self.output_height * y_pos_ratio))

            if os.name == "nt":
                default_font = "arial.ttf"
            else:
                default_font = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
                if not os.path.exists(default_font):
                    default_font = "DejaVu-Sans-Bold"

            font_name = active_profile.get("font", default_font)

            # --- KINETIC POP-IN MATH ---
                # t is the time elapsed since the start of THIS specific clip
            def pop_scale(t):
                if t < 0.05:
                    return 0.7 + (8.0 * t)          # 0s -> 0.7x scale, 0.05s -> 1.1x scale
                elif t < 0.1:
                    return 1.2 - (2.0 * (t - 0.05)) # 0.05s -> 1.2x scale, 0.1s -> 1.0x scale
                return 1.0                          # Settle at 1.0x scale

            for item in word_timestamps:
                word = item["word"]
                start = item["start"]
                end = item["end"]
                duration = max(0.08, end - start)

                text_color = profile.get("highlight") if len(word) > 5 else profile.get("primary")
                stroke_color = profile.get("bg_stroke")
                stroke_width = profile.get("stroke_width")
                font_size = profile.get("font_size")

                clip_kwargs = {
                    "text": word,
                    "font": font_name,
                    "font_size": font_size,
                    "color": text_color,
                    "stroke_color": stroke_color,
                    "stroke_width": stroke_width,
                    "method": "caption",
                    "size": (self.output_width - 120, None)
                }

                try:
                    txt_clip = TextClip(**clip_kwargs)
                except TypeError:
                    # Fallback for MoviePy v1.x argument names
                    clip_kwargs["fontsize"] = clip_kwargs.pop("font_size")
                    txt_clip = TextClip(**clip_kwargs)
                    
                txt_clip = (
                    txt_clip
                    .with_start(start)
                    .with_duration(duration)
                )

                # Apply the resize effect safely across MoviePy versions
                if hasattr(txt_clip, 'resize'):
                    txt_clip = txt_clip.resize(pop_scale)
                elif hasattr(txt_clip, 'resized'):
                    txt_clip = txt_clip.resized(pop_scale)

                # IMPORTANT: Use a lambda for position so it stays perfectly centered 
                # dynamically as the text size physically changes per frame.
                txt_clip = txt_clip.with_position(lambda t, py=pos_y: ("center", py))
                
                caption_clips.append(txt_clip)

        except Exception as e:
            logger.error(f"Error creating kinetic text clips: {e}", exc_info=True)

        return caption_clips

    def assemble_short_video(
        self,
        audio_path: str,
        image_paths: List[str],
        word_timestamps: List[Dict[str, Any]],
        output_filename: str = "final_short.mp4"
    ) -> str:
        """
        Assemble timeline with MoviePy v2 and export vertical MP4.
        """
        output_path = os.path.join(EXPORTS_DIR, output_filename)
        os.makedirs(EXPORTS_DIR, exist_ok=True)
        
        logger.info(f"Assembling timeline for '{output_filename}' using MoviePy v2...")
        variance_profile = self.select_random_variance_profile()

        try:
            from moviepy import AudioFileClip, CompositeVideoClip, concatenate_videoclips
            
            # Load voiceover audio
            audio_clip = AudioFileClip(audio_path)
            total_duration = audio_clip.duration
            logger.info(f"Total Video Duration: {total_duration:.2f} seconds")

            # Calculate duration per visual background clip
            num_images = max(1, len(image_paths))
            dur_per_img = total_duration / float(num_images)

            # Build visual background track with Ken Burns variations or Wan 1.3B video clips
            image_clips = []
            zoom_modes = ["zoom_in", "zoom_out"]
            for idx, asset_path in enumerate(image_paths):
                z_mode = zoom_modes[idx % len(zoom_modes)]
                if str(asset_path).lower().endswith((".mp4", ".mov", ".avi", ".webm")):
                    try:
                        from moviepy import VideoFileClip
                        v_clip = VideoFileClip(asset_path)
                        if v_clip.duration < dur_per_img:
                            v_clip = v_clip.with_duration(dur_per_img)
                        else:
                            v_clip = v_clip.subclipped(0, dur_per_img)
                        v_clip = v_clip.resized(new_size=(self.output_width, self.output_height))
                        image_clips.append(v_clip)
                    except Exception as e:
                        logger.warning(f"Failed to load video asset '{asset_path}' ({e}). Falling back to Ken Burns clip.")
                        img_clip = self.create_ken_burns_clip(asset_path, dur_per_img, zoom_type=z_mode)
                        image_clips.append(img_clip)
                else:
                    img_clip = self.create_ken_burns_clip(asset_path, dur_per_img, zoom_type=z_mode)
                    image_clips.append(img_clip)

            background_track = concatenate_videoclips(image_clips, method="compose").with_duration(total_duration)

            # Build kinetic subtitles track
            caption_clips = self.build_kinetic_caption_clips(word_timestamps, variance_profile)

            # Composite final video
            final_composite = CompositeVideoClip([background_track] + caption_clips, size=(self.output_width, self.output_height))
            final_composite = final_composite.with_audio(audio_clip)

            # Write MP4 file with FFmpeg
            logger.info(f"Rendering final MP4 to '{output_path}'...")
            final_composite.write_videofile(
                output_path,
                fps=30,
                codec="libx264",
                audio_codec="aac",
                threads=4,
                preset="ultrafast",
                logger=None  # Suppress internal moviepy stdout noise
            )
            
            logger.info(f"RENDER COMPLETE! Video saved to: {output_path}")
            return output_path

        except Exception as e:
            logger.error(f"MoviePy v2 timeline render failed ({e}). Returning fallback configuration path.")
            return self._fallback_assembler_summary(audio_path, image_paths, word_timestamps, output_path)

    def _fallback_assembler_summary(self, audio_path: str, image_paths: List[str], word_timestamps: List[Dict[str, Any]], output_path: str) -> str:
        """Fallback status marker for browser sandbox preview mode."""
        logger.info(f"[SIMULATED RENDER COMPLETE] Video spec ready for render at: {output_path}")
        return output_path

if __name__ == "__main__":
    assembler = MoviePyAssembler()
    # Test variance profile selection
    prof = assembler.select_random_variance_profile()
    print("Selected Algorithmic Variance Profile:", prof)
