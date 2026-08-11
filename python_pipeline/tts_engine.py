"""
Module C: Kokoro TTS Engine (tts_engine.py)
Generates high-fidelity voiceover using local Kokoro TTS (24kHz PyTorch).
Parses custom [PAUSE=sec] tags and interleaves exact zero-padded NumPy arrays for breathing pauses.
"""
import re
import os
import random
import logging
try:
    import numpy as np
except ImportError:
    np = None

try:
    import scipy.io.wavfile as wavfile
except ImportError:
    wavfile = None
from typing import Tuple, List, Optional, Any
from config import KOKORO_LANG_CODE, KOKORO_VOICE, KOKORO_VOICES, SAMPLE_RATE, TEMP_DIR

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)


def get_lang_code_for_voice(voice: str) -> str:
    """Dynamically map language code based on voice prefix ('b' for British, 'a' for American)."""
    return "b" if voice.lower().startswith("b") else "a"


class KokoroTTSEngine:
    def __init__(self, voice: Optional[str] = None, lang_code: Optional[str] = None):
        # Pick a random voice from KOKORO_VOICES if none specified
        self.voice = voice or random.choice(KOKORO_VOICES)
        # Dynamically infer language code unless explicitly provided
        self.lang_code = lang_code or get_lang_code_for_voice(self.voice)
        self.sample_rate = SAMPLE_RATE
        self.pipeline = None
        logger.info(f"🎙 KokoroTTSEngine initialized with Voice='{self.voice}' (Language Code='{self.lang_code}')")
        self._init_kokoro()

    def _init_kokoro(self):
        """Lazy load Kokoro pipeline."""
        try:
            from kokoro import KPipeline
            logger.info(f"Initializing Kokoro TTS Pipeline (lang_code='{self.lang_code}')...")
            self.pipeline = KPipeline(lang_code=self.lang_code)
        except Exception as e:
            logger.warning(f"Kokoro package not installed or model missing ({e}). Will use fallback audio generator mode if needed.")
            self.pipeline = None

    def parse_script_pauses(self, text_with_pauses: str) -> List[Tuple[str, float]]:
        """
        Parse text into tuples of (text_chunk, silence_after_seconds).
        Example: "Hello world [PAUSE=1.0] How are you" -> [("Hello world", 1.0), ("How are you", 0.0)]
        """
        pattern = r'\[PAUSE=([\d.]+)\]'
        parts = re.split(pattern, text_with_pauses)
        
        segments = []
        idx = 0
        while idx < len(parts):
            chunk = parts[idx].strip()
            pause_sec = 0.0
            if idx + 1 < len(parts):
                try:
                    pause_sec = float(parts[idx + 1])
                except ValueError:
                    pause_sec = 0.0
                idx += 2
            else:
                idx += 1
                
            if chunk:
                segments.append((chunk, pause_sec))
                
        return segments

    def generate_silence(self, duration_sec: float) -> Any:
        """Create exact array of zeros matching 24kHz sample rate for pauses."""
        num_samples = int(self.sample_rate * duration_sec)
        return np.zeros(num_samples, dtype=np.float32)

    def synthesize_to_wav(self, script_with_pauses: str, output_path: str) -> str:
        """
        Synthesize script with interleaved breathing pauses into a 24kHz WAV file.
        """
        segments = self.parse_script_pauses(script_with_pauses)
        logger.info(f"Synthesizing {len(segments)} text chunks with pause injection...")
        
        audio_chunks = []

        if self.pipeline is not None:
            for text_chunk, pause_after in segments:
                try:
                    generator = self.pipeline(text_chunk, voice=self.voice, speed=1.0, split_pattern=r'\n+')
                    for _, _, audio in generator:
                        if isinstance(audio, np.ndarray):
                            audio_chunks.append(audio.astype(np.float32))
                        else:
                            # If PyTorch tensor
                            audio_chunks.append(audio.cpu().numpy().astype(np.float32))
                except Exception as e:
                    logger.error(f"Error rendering chunk '{text_chunk[:20]}...': {e}")
                
                # Interleave silence array
                if pause_after > 0:
                    silence = self.generate_silence(pause_after)
                    audio_chunks.append(silence)
        else:
            # Fallback audio synthesizer for environments without PyTorch/Kokoro binaries installed
            logger.warning("Executing lightweight synthetic audio generator fallback...")
            total_est_words = sum(len(chunk.split()) for chunk, _ in segments)
            est_duration = total_est_words / 3.0  # ~3 words per second
            t = np.linspace(0, est_duration, int(self.sample_rate * est_duration), False)
            # Gentle background voice hum simulation for demo preview
            audio_wave = 0.1 * np.sin(2 * np.pi * 220 * t) * np.exp(-t / est_duration)
            audio_chunks.append(audio_wave.astype(np.float32))

        if not audio_chunks:
            # Fallback safety 3 second silent audio
            audio_chunks.append(self.generate_silence(3.0))

        # Concatenate numpy arrays
        full_audio = np.concatenate(audio_chunks)
        
        # Normalize audio peak to -1dB (0.9 max amplitude)
        max_val = np.max(np.abs(full_audio))
        if max_val > 0:
            full_audio = (full_audio / max_val) * 0.9

        # Convert float32 [-1, 1] to int16 PCM format
        audio_int16 = (full_audio * 32767).astype(np.int16)
        
        # Save WAV file
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        wavfile.write(output_path, self.sample_rate, audio_int16)
        
        duration_sec = len(full_audio) / self.sample_rate
        logger.info(f"Saved TTS audio to '{output_path}' (Duration: {duration_sec:.2f}s, SR: {self.sample_rate}Hz)")
        return output_path

if __name__ == "__main__":
    tts = KokoroTTSEngine()
    sample_text = "I couldn't believe my eyes when I walked into the venue. [PAUSE=1.0] Everyone was staring at me. [PAUSE=0.5] What should I do next?"
    out_file = str(TEMP_DIR / "sample_voice.wav")
    tts.synthesize_to_wav(sample_text, out_file)
