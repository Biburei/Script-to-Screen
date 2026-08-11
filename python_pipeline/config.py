"""
Config settings for Script-to-Screen Automation Pipeline
Optimized for Google Colab Free Tier / Tesla T4 GPU (15GB VRAM) & Wan 1.3B Model
"""
import os
import json
import random
import re
import pandas as pd
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

# Paths
BASE_DIR = Path(__file__).parent.resolve()
DATA_DIR = BASE_DIR / "data"
ASSETS_DIR = BASE_DIR / "assets"
EXPORTS_DIR = BASE_DIR / "exports"
TEMP_DIR = BASE_DIR / "temp"

for directory in [DATA_DIR, ASSETS_DIR, EXPORTS_DIR, TEMP_DIR]:
    directory.mkdir(parents=True, exist_ok=True)

EXCEL_DATASET_PATH = DATA_DIR / "creepypastas.xlsx"
PIPELINE_STATE_FILE = DATA_DIR / "pipeline_state.json"

def get_random_num_scenes() -> int:
    """Randomly pick the target number of visual scene splits between 5 and 8."""
    return random.randint(5, 8)

def get_num_scenes() -> int:
    return get_random_num_scenes()

DEFAULT_NUM_SCENES = get_random_num_scenes()

# Hardware & VRAM Optimization Config for Tesla T4 GPU (15GB VRAM / Colab)
VRAM_LIMIT_GB = 14.0
USE_TORCH_FP16 = True
ENABLE_CPU_OFFLOAD = True

# Categorized Creepypasta Genre Pools
CREEPYPASTA_GENRES = {
    "Horror": ["Archival Horror", "Creepypasta", "Paranormal", "Urban Legends"],
    "Dark Fantasy": ["Eldritch", "Dark Fantasy", "Grimdark"],
    "Psychological": ["Psychological Thriller", "Uncanny Encounters"],
}

SUBREDDIT_GENRES = CREEPYPASTA_GENRES
SUBREDDITS = ["creepyencounters", "nosleep", "archival_creepypastas"]

MIN_POST_WORDS = 80
MAX_POST_WORDS = 3000
TARGET_SCRIPT_MIN_WORDS = 180
TARGET_SCRIPT_MAX_WORDS = 210

# OpenRouter LLM Settings
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions"
OPENROUTER_MODEL = os.getenv("OPENROUTER_MODEL", "openrouter/free")

# Kokoro TTS Settings
KOKORO_VOICES = [
    "af_heart", "af_sky", "af_nicole", "af_bella", "am_adam",
    "am_michael", "bf_emma", "bf_isabella", "bm_fable", "bm_george",
]
KOKORO_VOICE = KOKORO_VOICES[0]
KOKORO_LANG_CODE = "a"
SAMPLE_RATE = 24000

# Wan 1.3B Text-to-Video Model Settings (Hugging Face Diffusers)
WAN_MODEL_ID = "Wan-AI/Wan2.1-T2V-1.3B-Diffusers"
# Backward compatibility aliases
SD_MODEL_ID = WAN_MODEL_ID

IMAGE_WIDTH = 512
IMAGE_HEIGHT = 768  # 9:16 Vertical aspect ratio
WAN_NUM_FRAMES = 81
WAN_FPS = 16
WAN_NUM_INFERENCE_STEPS = 30
WAN_GUIDANCE_SCALE = 6.0

# Backward compatibility aliases
SD_STEPS = WAN_NUM_INFERENCE_STEPS
SD_GUIDANCE_SCALE = WAN_GUIDANCE_SCALE

# MoviePy v2 & Algorithmic Variance Profiles
ASPECT_RATIO = (9, 16)
OUTPUT_RESOLUTION = (1080, 1920)

TAG_CATEGORIES = {
    "Occult and Supernatural": {
        "blueprint": "VHS found-footage aesthetic, grainy analog media distortion, CRT scanlines, 90s low-budget horror, eerie static, shadow-drenched composition",
        "tags": [
            "Beings and Entities", "Demons and Possession", "Ghosts and Spirits",
            "Occult", "Magic and Witchcraft", "Religion and Spirituality",
            "Rites and Rituals", "Hell and the Afterlife", "Myths and Legends", "Folklore and Folktales"
        ]
    },
    "Psicological and mental": {
        "blueprint": "Arkham Asylum graphic novel art style, expressionist distorted angles, clinical bleakness, harsh flickering fluorescent lights, heavy surreal shadows",
        "tags": [
            "Psychological Horror", "Madness and Mental Illness", "Paranoia", "Dreams and Nightmares"
        ]
    },
    "Crime and Violence": {
        "blueprint": "Gritty 80s slasher cinema art style, high-contrast chiaroscuro, autumn atmosphere, harsh neon red and deep blue rim lighting, suburban horror vibe",
        "tags": [
            "Deaths, Murders, and Disappearances", "Investigations and Crimes",
            "Torture and Cannibalism", "Slashers and Gore"
        ]
    },
    "Bio Horror": {
        "blueprint": "The Last of Us post-apocalyptic concept art style, overgrown ruined environments, tactile decay, gritty realism, mute earthy tones, visceral texture",
        "tags": [
            "Monsters", "Creatures and Cryptids", "Zombies and the Undead",
            "Body Horror", "Insects and Spiders", "Animals and Wildlife"
        ]
    },
    "Cosmic": {
        "blueprint": "Bloodborne gothic art style, dark Victorian architecture, towering cosmic dread, swirling ominous sky, eldritch moonlight, painterly digital art",
        "tags": ["Space and Cosmic Horror"]
    },
    "SciFI": {
        "blueprint": "1979 Alien industrial sci-fi aesthetic, cold claustrophobic spaceships, clunky retro-futuristic machinery, H.R. Giger biomechanical details, amber screens",
        "tags": ["Science Fiction and Aliens", "Science and Experimentation"]
    }
}

TAG_TO_CATEGORY = {
    tag: category
    for category, data in TAG_CATEGORIES.items()
    for tag in data["tags"]
}

CATEGORY_CONFIG = TAG_CATEGORIES

def extract_matched_tags(raw_text):
    if pd.isna(raw_text) or not str(raw_text).strip():
        return []
    text = str(raw_text)
    matched_tags = []
    for tag in TAG_TO_CATEGORY.keys():
        pattern = rf"\b{re.escape(tag)}\b"
        if re.search(pattern, text, flags=re.IGNORECASE):
            matched_tags.append(tag)
    return matched_tags

def generate_hybrid_prompt(raw_text):
    matched_tags = extract_matched_tags(raw_text)
    if not matched_tags:
        return "Style: Cinematic dark atmospheric horror | Details: Standard Horror"
    category_groups = {}
    for tag in matched_tags:
        cat = TAG_TO_CATEGORY[tag]
        category_groups.setdefault(cat, []).append(tag)
    prompt_outputs = []
    for category, tags in category_groups.items():
        master_blueprint = TAG_CATEGORIES[category]["blueprint"]
        specific_accents = ", ".join(tags)
        formatted_prompt = f"Master Style: [{master_blueprint}] | Subject Accents: [{specific_accents}]"
        prompt_outputs.append(formatted_prompt)
    return " || ".join(prompt_outputs)

COLOR_PROFILES = [
    {
        "name": "Neon Cyan & Yellow",
        "primary": "#FFE600",
        "highlight": "#00E5FF",
        "bg_stroke": "#000000",
        "stroke_width": 4,
        "y_position": 0.72,
        "font_size": 52,
    },
    {
        "name": "Bold White & Yellow",
        "primary": "#FFFFFF",
        "highlight": "#FFEA00",
        "bg_stroke": "#0B0B0B",
        "stroke_width": 4,
        "y_position": 0.73,
        "font_size": 49,
    },
    {
        "name": "Vibrant Red & White",
        "primary": "#FFFFFF",
        "highlight": "#FF2A5F",
        "bg_stroke": "#000000",
        "stroke_width": 3,
        "y_position": 0.75,
        "font_size": 50,
    },
]
