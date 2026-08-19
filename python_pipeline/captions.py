"""
Module E: Whisper Kinetic Timestamp Alignment (captions.py)
Transcribes generated WAV voiceover using faster-whisper or local OpenAI Whisper.
Extracts word-level timestamps and maps them directly back to original script words to ELIMINATE ALL TYPOS.
"""
import re
import os
import logging
import difflib
from typing import List, Dict, Any

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

class WhisperCaptionAligner:
    def __init__(self, model_name: str = "base"):
        self.model_name = model_name
        self.model = None
        self.engine_type = None  # "faster_whisper", "whisper", or None

    def _load_model(self):
        """Lazy load faster-whisper or standard OpenAI Whisper model."""
        if self.model is not None:
            return

        # 1. Attempt loading faster-whisper
        try:
            from faster_whisper import WhisperModel
            logger.info(f"Loading faster-whisper model ('{self.model_name}')...")
            self.model = WhisperModel(self.model_name, device="cpu", compute_type="int8")
            self.engine_type = "faster_whisper"
            logger.info("faster-whisper model loaded successfully!")
            return
        except Exception as e:
            logger.info(f"faster-whisper not available ({e}). Trying standard whisper...")

        # 2. Fallback to standard openai-whisper
        try:
            import whisper
            logger.info(f"Loading standard OpenAI Whisper model ('{self.model_name}')...")
            self.model = whisper.load_model(self.model_name)
            self.engine_type = "whisper"
            logger.info("OpenAI Whisper model loaded successfully!")
            return
        except Exception as e:
            logger.warning(f"Standard Whisper package unavailable ({e}). Reverting to timeline aligner fallback.")
            self.model = None
            self.engine_type = None

    def clean_word(self, word: str) -> str:
        """Strip non-alphanumeric characters for clean string comparison."""
        return re.sub(r'^\W+|\W+$', '', word).lower()

    def extract_raw_whisper_timestamps(self, audio_path: str) -> List[Dict[str, Any]]:
        """Extract raw word-level timestamps from audio using available Whisper engine."""
        self._load_model()
        raw_words = []

        if self.engine_type == "faster_whisper":
            try:
                logger.info(f"Transcribing '{audio_path}' using faster-whisper...")
                segments, _ = self.model.transcribe(audio_path, word_timestamps=True, language="en")
                for segment in segments:
                    if hasattr(segment, "words") and segment.words:
                        for w in segment.words:
                            cleaned = self.clean_word(w.word)
                            if cleaned:
                                raw_words.append({
                                    "word": w.word.strip(),
                                    "clean_word": cleaned,
                                    "start": round(float(w.start), 3),
                                    "end": round(float(w.end), 3),
                                    "probability": round(float(getattr(w, 'probability', 1.0)), 2)
                                })
                return raw_words
            except Exception as e:
                logger.error(f"faster-whisper transcription failed ({e})")

        elif self.engine_type == "whisper":
            try:
                logger.info(f"Transcribing '{audio_path}' using standard whisper...")
                result = self.model.transcribe(
                    audio_path,
                    word_timestamps=True,
                    language="en",
                    fp16=False
                )
                for segment in result.get("segments", []):
                    for w_info in segment.get("words", []):
                        raw_w = w_info.get("word", "").strip()
                        cleaned = self.clean_word(raw_w)
                        if cleaned:
                            raw_words.append({
                                "word": raw_w,
                                "clean_word": cleaned,
                                "start": round(float(w_info.get("start", 0.0)), 3),
                                "end": round(float(w_info.get("end", 0.0)), 3),
                                "probability": round(float(w_info.get("probability", 1.0)), 2)
                            })
                return raw_words
            except Exception as e:
                logger.error(f"standard whisper transcription failed ({e})")

        return raw_words

    def extract_word_timestamps(self, audio_path: str, raw_script_text: str = "") -> List[Dict[str, Any]]:
        """
        Extracts word-level timestamps and maps them BACK to the EXACT original script words.
        This guarantees 0 typos while maintaining precise speech audio synchronization.
        """
        # Clean script text of pause tags
        clean_script = re.sub(r'\[PAUSE=[\d.]+\]', '', raw_script_text).strip()
        script_words = [w for w in clean_script.split() if w.strip()]

        if not script_words:
            # If no script provided, fall back to raw transcription or fallback aligner
            raw_whisper = self.extract_raw_whisper_timestamps(audio_path)
            if raw_whisper:
                return [{"word": item["word"].upper(), "start": item["start"], "end": item["end"]} for item in raw_whisper]
            return self._fallback_timeline_aligner(audio_path, raw_script_text)

        raw_whisper_words = self.extract_raw_whisper_timestamps(audio_path)

        if not raw_whisper_words:
            logger.warning("Whisper produced no word timestamps. Falling back to mathematical timeline alignment.")
            return self._fallback_timeline_aligner(audio_path, raw_script_text)

        # Map original script words onto extracted Whisper timestamps to ELIMINATE ALL STT TYPOS
        aligned_results = self._align_script_to_whisper_timestamps(script_words, raw_whisper_words, audio_path)
        logger.info(f"Successfully aligned {len(aligned_results)} script words to audio timestamps (0 typos!).")
        return aligned_results

    def _align_script_to_whisper_timestamps(
        self,
        script_words: List[str],
        whisper_words: List[Dict[str, Any]],
        audio_path: str
    ) -> List[Dict[str, Any]]:
        """
        Sequence matching alignment algorithm:
        Maps each original script word to a timestamp boundary from Whisper,
        interpolating any gaps so that EVERY script word gets a valid start/end time.
        """
        norm_script = [self.clean_word(w) for w in script_words]
        norm_whisper = [item["clean_word"] for item in whisper_words]

        # Use SequenceMatcher to find longest matching sub-sequences
        matcher = difflib.SequenceMatcher(None, norm_script, norm_whisper)
        matching_blocks = matcher.get_matching_blocks()

        aligned_timestamps = [None] * len(script_words)

        for block in matching_blocks:
            s_idx, w_idx, length = block.a, block.b, block.size
            for offset in range(length):
                cur_s = s_idx + offset
                cur_w = w_idx + offset
                aligned_timestamps[cur_s] = {
                    "start": whisper_words[cur_w]["start"],
                    "end": whisper_words[cur_w]["end"]
                }

        # Estimate total duration of audio for boundary calculation
        total_duration = whisper_words[-1]["end"] if whisper_words else 10.0
        try:
            import scipy.io.wavfile as wavfile
            rate, data = wavfile.read(audio_path)
            total_duration = len(data) / float(rate)
        except Exception:
            pass

        # Interpolate timestamps for any unmapped script words (gaps or STT mismatches)
        n = len(script_words)
        idx = 0
        while idx < n:
            if aligned_timestamps[idx] is None:
                gap_start = idx
                while idx < n and aligned_timestamps[idx] is None:
                    idx += 1
                gap_end = idx

                # Determine preceding timestamp
                if gap_start > 0 and aligned_timestamps[gap_start - 1] is not None:
                    prev_time = aligned_timestamps[gap_start - 1]["end"]
                else:
                    prev_time = 0.0

                # Determine succeeding timestamp
                if gap_end < n and aligned_timestamps[gap_end] is not None:
                    next_time = aligned_timestamps[gap_end]["start"]
                else:
                    next_time = total_duration

                gap_count = gap_end - gap_start
                duration_span = max(0.1, next_time - prev_time)
                step = duration_span / gap_count

                for i, g_i in enumerate(range(gap_start, gap_end)):
                    w_start = prev_time + (i * step)
                    w_end = w_start + (step * 0.95)
                    aligned_timestamps[g_i] = {
                        "start": round(w_start, 3),
                        "end": round(w_end, 3)
                    }
            else:
                idx += 1

        # Format output using EXACT original script words (guarantees zero typos)
        output = []
        for i, word in enumerate(script_words):
            display_word = word.strip().upper()
            ts = aligned_timestamps[i]
            output.append({
                "word": display_word,
                "start": ts["start"],
                "end": max(ts["start"] + 0.08, ts["end"]),
                "probability": 1.0
            })

        return output

    def _fallback_timeline_aligner(self, audio_path: str, script_text: str) -> List[Dict[str, Any]]:
        """Mathematical fallback aligner based on total audio duration & script words."""
        clean_text = re.sub(r'\[PAUSE=[\d.]+\]', '', script_text)
        words = [w.strip().upper() for w in clean_text.split() if w.strip()]

        if not words:
            words = ["CHECK", "YOUR", "LOCAL", "PYTHON", "SETUP"]

        total_duration = 10.0
        try:
            import scipy.io.wavfile as wavfile
            rate, data = wavfile.read(audio_path)
            total_duration = len(data) / float(rate)
        except Exception:
            pass

        time_per_word = total_duration / float(len(words))
        word_list = []

        current_t = 0.05
        for w in words:
            w_end = current_t + time_per_word * 0.95
            word_list.append({
                "word": w,
                "start": round(current_t, 3),
                "end": round(w_end, 3),
                "probability": 1.0
            })
            current_t += time_per_word

        logger.info(f"Generated {len(word_list)} synthetic word timestamps (Total Audio Duration: {total_duration:.2f}s)")
        return word_list

if __name__ == "__main__":
    aligner = WhisperCaptionAligner()
    res = aligner.extract_word_timestamps("temp/sample_voice.wav", "I couldn't believe my eyes when I walked into the venue.")
    print("Extracted word timestamps snippet:", res[:5])