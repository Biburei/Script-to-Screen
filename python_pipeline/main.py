"""
================================================================================
CREEPYPASTA SHORTS AUTOMATION PIPELINE (100% Local Excel Dataset Pipeline)
================================================================================
Central Orchestrator: main.py

Target Architecture:
- Local Excel (.xlsx) Archival Creepypasta Dataset Engine
- OpenRouter LLM Scriptwriting (180-210 words, Part 1 Hooks / Part 2+ Cliffhangers)
- Kokoro TTS Speech Synthesis with Breathing Pause Tags (24kHz)
- Local Stable Diffusion 1.5 9:16 Art Generation (torch.float16 + FP16 VRAM protection)
- OpenAI Whisper Kinetic Timestamp Alignment
- MoviePy v2 Dynamic Subtitle Video Assembly (Algorithmic Variance Engine)

Run:
  python main.py --excel-path data/creepypastas.xlsx --part 1 --scenes 5
================================================================================
"""
import argparse
import sys
import time
import logging
import random
import pandas as pd
from pathlib import Path

# Import logger system for fatal error reporting and run audit logging
try:
    from logger import setup_logger, report_fatal_error, log_pipeline_run
    logger = setup_logger("CreepypastaShortsPipeline")
except ImportError:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(message)s",
        handlers=[logging.StreamHandler(sys.stdout)]
    )
    logger = logging.getLogger("CreepypastaShortsPipeline")
    log_pipeline_run = None

# Import pipeline modules
from scraper import CreepypastaExcelLoader
from agent_llm import LLMScriptWriter
from tts_engine import KokoroTTSEngine, get_lang_code_for_voice
from visuals import SDArtDirector
from captions import WhisperCaptionAligner
from assembler import MoviePyAssembler
from config import (
    BASE_DIR, TEMP_DIR, EXPORTS_DIR, OPENROUTER_MODEL, KOKORO_VOICES, EXCEL_DATASET_PATH, get_random_num_scenes
)


def print_banner():
    banner = """
  =============================================================
   👻 ARCHIVAL CREEPYPASTA SHORTS PIPELINE (LOCAL EXCEL ENGINE)
   Optimized for NVIDIA RTX 3050 GPU & AMD Ryzen 7 CPU
  =============================================================
  """
    print(banner)


def run_pipeline(
    excel_path: str = None,
    genre: str = None,
    story_id: str = None,
    part: int = None,
    openrouter_model: str = OPENROUTER_MODEL,
    voice: str = None,
    num_scenes: int = None,
    output_filename: str = None
):
    start_time = time.time()
    print_banner()

    if not num_scenes:
        num_scenes = get_random_num_scenes()

    selected_voice = voice or random.choice(KOKORO_VOICES)
    selected_lang_code = get_lang_code_for_voice(selected_voice)

    # STEP 1: LOAD ARCHIVAL CREEPYPASTA FROM LOCAL EXCEL DATASET
    logger.info(f"--- STEP 1: LOADING FROM LOCAL EXCEL DATASET ({excel_path or EXCEL_DATASET_PATH}) ---")
    loader = CreepypastaExcelLoader(excel_path=excel_path)
    
    is_manual_override = bool(story_id)
    current_idx = None

    if is_manual_override:
        logger.info(f"Manual CLI override specified for story ID '{story_id}'")
        selected_story = loader.fetch_creepypasta_story(
            story_id=story_id,
            part=part,
            genre=genre
        )
    else:
        selected_story, current_idx = loader.fetch_sequential_story()
        logger.info(f"Automated sequential story state loaded (Index {current_idx}, Story ID: '{selected_story.get('id', 'N/A')}')")

    story_part = selected_story.get("part", part or 1)
    is_continuation = selected_story.get("is_continuation", story_part >= 2)
    
    # --- NEW: Extract Raw Tags for Visuals ---
    # Try to find 'tags' explicitly, otherwise safely grab the very last column in the dictionary
    tags_key = 'tags' if 'tags' in selected_story else list(selected_story.keys())[-1]
    raw_tags = str(selected_story.get(tags_key, ""))

    logger.info(f"Selected Story ID: {selected_story.get('id', 'N/A')}")
    logger.info(f"Title: \"{selected_story.get('title', 'N/A')}\"")
    logger.info(f"Part Number: {story_part} (Continuation: {is_continuation})")
    logger.info(f"Genre: {selected_story.get('genre', 'Horror')}")
    logger.info(f"Extracted Tags for Art Blueprint: [{raw_tags}]") # Log the extracted tags

    # Audit log run history
    if log_pipeline_run:
        log_pipeline_run({
            "run_id": f"run_{selected_story.get('id', 'N/A')}_{int(start_time)}",
            "genre": selected_story.get('genre'),
            "story_id": selected_story.get('id'),
            "story_title": selected_story.get('title'),
            "part": story_part,
            "openrouter_model": openrouter_model,
            "kokoro_voice": selected_voice,
            "kokoro_lang_code": selected_lang_code,
            "num_scenes": num_scenes,
            "tags_used": raw_tags # Added tags to audit log
        })

    # STEP 2: OPENROUTER / LLM SCRIPT REWRITE (180-210 WORDS + PART HOOK/CLIFFHANGER)
    logger.info(f"\n--- STEP 2: LLM CREEPYPASTA REWRITE (Model: {openrouter_model}, Target: 180-210 words) ---")
    writer = LLMScriptWriter(model=openrouter_model)
    script_result = writer.rewrite_story(
        selected_story['title'],
        selected_story['body'],
        source_word_count=selected_story.get('word_count', 0),
        part=story_part,
        is_continuation=is_continuation
    )

    script_with_pauses = script_result['script_with_pauses']
    logger.info(f"Polished Script Word Count: {script_result['word_count']} words (Target 180-210)")
    logger.info(f"Script Snippet:\n\"{script_result['raw_script'][:180]}...\"")

    # STEP 3: KOKORO TTS SPEECH SYNTHESIS
    logger.info(f"\n--- STEP 3: KOKORO TTS SYNTHESIS (Voice: '{selected_voice}', Lang: '{selected_lang_code}', 24kHz) ---")
    tts = KokoroTTSEngine(voice=selected_voice, lang_code=selected_lang_code)
    audio_path = str(TEMP_DIR / f"voice_{selected_story.get('id', 'temp')}.wav")
    tts.synthesize_to_wav(script_with_pauses, audio_path)

    # STEP 4: WAN 1.3B TEXT-TO-VIDEO GENERATION
    logger.info(f"\n--- STEP 4: WAN 1.3B 9:16 TEXT-TO-VIDEO GENERATION ({num_scenes} clips) ---")
    director = SDArtDirector()
    image_paths = director.generate_storyboard(
        script_text=script_result['raw_script'],
        num_scenes=num_scenes,
        output_dir=str(TEMP_DIR / f"assets_{selected_story.get('id', 'temp')}"),
        raw_tags=raw_tags  # <--- PASSING THE TAGS TO VISUALS.PY HERE!
    )

    # STEP 5: WHISPER KINETIC TIMESTAMP ALIGNMENT
    logger.info(f"\n--- STEP 5: WHISPER WORD TIMESTAMP ALIGNMENT ---")
    aligner = WhisperCaptionAligner(model_name="base")
    word_timestamps = aligner.extract_word_timestamps(audio_path, script_result['raw_script'])

    # STEP 6: MOVIEPY V2 VIDEO ASSEMBLY & VARIANCE ENGINE
    logger.info(f"\n--- STEP 6: MOVIEPY V2 ALGORITHMIC RENDER ---")
    if not output_filename:
        output_filename = f"creepypasta_short_{selected_story.get('id', 'temp')}_{int(time.time())}.mp4"

    assembler = MoviePyAssembler()
    final_video_path = assembler.assemble_short_video(
        audio_path=audio_path,
        image_paths=image_paths,
        word_timestamps=word_timestamps,
        output_filename=output_filename
    )

    # STEP 7: STATE SEQUENCE ADVANCEMENT (AUTOMATED SEQUENTIAL RUNS)
    if not is_manual_override and current_idx is not None:
        next_story = loader.advance_sequential_state(current_idx)
        logger.info(f"Pipeline state sequence pointer advanced -> Next story index to run: {next_story.get('id')}")
    else:
        logger.info("Manual CLI story override execution complete — automated sequence state pointer preserved without corruption.")

    elapsed = time.time() - start_time
    logger.info(f"\n=============================================================")
    logger.info(f"🎉 PIPELINE SUCCESSFUL! Completed in {elapsed:.1f} seconds.")
    logger.info(f"Output File: {final_video_path}")
    logger.info(f"=============================================================\n")
    return True


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Archival Creepypasta Shorts Automation Pipeline")
    parser.add_argument("--excel-path", type=str, default=None, help="Path to local Excel dataset file (.xlsx)")
    parser.add_argument("--genre", type=str, default=None, help="Target specific story genre (e.g. Horror, Creepypasta)")
    parser.add_argument("--id", "--story-id", dest="story_id", type=str, default=None, help="Target specific story ID from dataset")
    parser.add_argument("--part", type=int, default=None, help="Target story part number (1 for scroll-stop hook, 2+ for transition + cliffhanger)")
    parser.add_argument("--openrouter-model", type=str, default=OPENROUTER_MODEL, help="OpenRouter LLM model name (default: openrouter/free)")
    parser.add_argument("--scenes", type=int, default=None, help="Number of SD 9:16 vertical images to generate")
    parser.add_argument("--out", type=str, default=None, help="Output MP4 filename")

    args = parser.parse_args()

    try:
        run_pipeline(
            excel_path=args.excel_path,
            genre=args.genre,
            story_id=args.story_id,
            part=args.part,
            openrouter_model=args.openrouter_model,
            num_scenes=args.scenes,
            output_filename=args.out
        )
    except KeyboardInterrupt:
        logger.warning("\nPipeline execution cancelled by user.")
    except Exception as e:
        if 'report_fatal_error' in globals():
            report_fatal_error("MAIN_ORCHESTRATOR", e, context={"excel_path": args.excel_path, "part": args.part})
        else:
            logger.error(f"Fatal error in pipeline execution: {e}", exc_info=True)
        sys.exit(1)