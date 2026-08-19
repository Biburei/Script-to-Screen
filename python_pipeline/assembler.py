import os
import random
import logging
from typing import List, Dict, Any
from PIL import ImageFont

try:
    import numpy as np
except ImportError:
    np = None

from config import COLOR_PROFILES, OUTPUT_RESOLUTION, EXPORTS_DIR, TEMP_DIR, WAN_FPS, BGM_POOL

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)


def resolve_system_font(requested_font: str = None) -> str:
    """
    Validates and resolves a system font path across Linux/Colab and Windows.
    Falls back gracefully if requested font is missing on Linux system.
    """
    if requested_font:
        try:
            ImageFont.truetype(requested_font, 24)
            return requested_font
        except Exception:
            logger.debug(f"Requested font '{requested_font}' not found. Resolving system fallback...")

    font_candidates = [
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/freefont/FreeSansBold.ttf",
        "arial.ttf",
    ]
    
    for font in font_candidates:
        try:
            ImageFont.truetype(font, 24)
            return font
        except Exception:
            continue
            
    return "DejaVu-Sans"


def apply_ken_burns_effect(clip: Any, duration: float, motion_type: str = None) -> Any:
    """
    Applies a dynamic, randomized Ken Burns motion effect (zoom/pan/tilt) to a MoviePy v2 ImageClip.
    """
    safe_duration = max(0.1, float(duration))
    clip = clip.with_duration(safe_duration)

    orig_w, orig_h = clip.w, clip.h

    MOTIONS = ["zoom_in", "zoom_out", "pan_left", "pan_right", "tilt_up", "tilt_down"]
    selected_motion = motion_type if motion_type in MOTIONS else random.choice(MOTIONS)

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
            scale_factor = 1.15
            scaled_w = int(orig_w * scale_factor)
            scaled_h = int(orig_h * scale_factor)
            scaled_clip = clip.resized(new_size=(scaled_w, scaled_h))

            dx = scaled_w - orig_w
            dy = scaled_h - orig_h

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
        profile["y_offset_px"] = int(self.output_height * profile["y_position"]) + random.randint(-30, 30)
        profile["scale_factor"] = round(random.uniform(0.95, 1.08), 2)
        
        logger.info(f"Algorithmic Variance Engine Profile: '{profile['name']}' (Y-Pos: {profile['y_offset_px']}px)")
        return profile

    def create_ken_burns_clip(self, image_path: str, duration: float, zoom_type: str = None, banner_height_ratio: float = 0.12) -> Any:
        """
        Apply smooth Ken Burns motion with cinematic letterbox effect.
        """
        try:
            from moviepy import ImageClip, ColorClip, CompositeVideoClip
            from PIL import Image

            banner_height = int(self.output_height * banner_height_ratio)
            gap_height = self.output_height - (2 * banner_height)
            gap_width = self.output_width

            with Image.open(image_path) as img:
                orig_w, orig_h = img.size

            scale = min(gap_width / float(orig_w), gap_height / float(orig_h))
            fit_w = int(orig_w * scale)
            fit_h = int(orig_h * scale)

            raw_clip = ImageClip(image_path).with_duration(duration).resized(new_size=(fit_w, fit_h))
            motion_clip = apply_ken_burns_effect(raw_clip, duration, motion_type=zoom_type)

            content_y = banner_height + (gap_height - min(fit_h, gap_height)) // 2
            content_clip = motion_clip.with_position(("center", content_y))

            bg_black = ColorClip(size=(self.output_width, self.output_height), color=(0, 0, 0)).with_duration(duration)
            top_banner = ColorClip(size=(self.output_width, banner_height), color=(0, 0, 0)).with_duration(duration).with_position((0, 0))
            bottom_banner = ColorClip(size=(self.output_width, banner_height), color=(0, 0, 0)).with_duration(duration).with_position((0, self.output_height - banner_height))

            return CompositeVideoClip([bg_black, content_clip, top_banner, bottom_banner], size=(self.output_width, self.output_height))

        except Exception as e:
            logger.warning(f"MoviePy v2 direct zoom effect fallback ({e})")
            from moviepy.editor import ImageClip, ColorClip, CompositeVideoClip
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
        """
        caption_clips = []
        try:
            from moviepy import TextClip

            active_profile = random.choice(COLOR_PROFILES)
            logger.info(f"🎨 Selected Kinetic Caption Profile: {active_profile['name']}")

            y_pos_ratio = active_profile.get("y_position", 0.75)
            pos_y = active_profile.get("y_offset_px", int(self.output_height * y_pos_ratio))

            # Dynamically resolve system font to prevent MoviePy/Colab crashes
            raw_font_choice = active_profile.get("font", None)
            font_name = resolve_system_font(raw_font_choice)

            def pop_scale(t):
                if t < 0.05:
                    return 0.7 + (8.0 * t)
                elif t < 0.1:
                    return 1.2 - (2.0 * (t - 0.05))
                return 1.0

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
                    clip_kwargs["fontsize"] = clip_kwargs.pop("font_size")
                    txt_clip = TextClip(**clip_kwargs)
                    
                txt_clip = (
                    txt_clip
                    .with_start(start)
                    .with_duration(duration)
                )

                if hasattr(txt_clip, 'resize'):
                    txt_clip = txt_clip.resize(pop_scale)
                elif hasattr(txt_clip, 'resized'):
                    txt_clip = txt_clip.resized(pop_scale)

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
            from moviepy import (
                AudioFileClip, CompositeVideoClip, concatenate_videoclips,
                CompositeAudioClip, concatenate_audioclips
            )
            
            # 1. Load voiceover (TTS) audio
            tts_clip = AudioFileClip(audio_path)
            total_duration = tts_clip.duration
            logger.info(f"Total Video Duration: {total_duration:.2f} seconds")

            # 2. Setup Background Music (BGM) Track
            bgm_choice = random.choice(BGM_POOL)
            bgm_path = os.path.join("assets", "BGM", f"{bgm_choice}.mp3") 
            
            try:
                bgm_clip = AudioFileClip(bgm_path)
                bgm_duration = bgm_clip.duration

                if bgm_duration < total_duration:
                    loops_required = int(total_duration / bgm_duration) + 1
                    bgm_clip = concatenate_audioclips([bgm_clip] * loops_required).with_duration(total_duration)
                    logger.info(f"BGM '{bgm_choice}' looped {loops_required} times to fit timeline.")
                else:
                    random_start = random.uniform(0, bgm_duration - total_duration)
                    bgm_clip = bgm_clip.subclipped(random_start, random_start + total_duration)
                    logger.info(f"BGM '{bgm_choice}' randomly started at {random_start:.2f}s.")

                if hasattr(bgm_clip, 'with_volume_scaled'):
                    bgm_clip = bgm_clip.with_volume_scaled(0.12)
                else: 
                    bgm_clip = bgm_clip.volumex(0.12)

                final_audio = CompositeAudioClip([tts_clip, bgm_clip])
            except Exception as e:
                logger.warning(f"Could not load or process BGM '{bgm_path}' ({e}). Proceeding with TTS audio only.")
                final_audio = tts_clip

            # Calculate duration per visual background clip
            num_images = max(1, len(image_paths))
            dur_per_img = total_duration / float(num_images)

            # Build visual background track with Ken Burns or looped Video Clips
            image_clips = []
            zoom_modes = ["zoom_in", "zoom_out"]
            for idx, asset_path in enumerate(image_paths):
                z_mode = zoom_modes[idx % len(zoom_modes)]
                if str(asset_path).lower().endswith((".mp4", ".mov", ".avi", ".webm")):
                    try:
                        from moviepy import VideoFileClip, vfx
                        v_clip = VideoFileClip(asset_path)
                        
                        # Loop video clip if shorter than target duration (prevents EOF error)
                        if v_clip.duration < dur_per_img:
                            loops_needed = int(dur_per_img / v_clip.duration) + 1
                            v_clip = concatenate_videoclips([v_clip] * loops_needed).subclipped(0, dur_per_img)
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
            final_composite = final_composite.with_audio(final_audio)

            # Write MP4 file with FFmpeg
            logger.info(f"Rendering final MP4 to '{output_path}'...")
            final_composite.write_videofile(
                output_path,
                fps=WAN_FPS,
                codec="libx264",
                audio_codec="aac",
                threads=4,
                preset="ultrafast",
                logger=None
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
    prof = assembler.select_random_variance_profile()
    print("Selected Algorithmic Variance Profile:", prof)