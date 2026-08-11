# 🚀 Keyless Reddit Shorts Automation Pipeline

A 100% local, offline, keyless Python automation pipeline that transforms Reddit stories into high-retention viral vertical Shorts (YouTube Shorts, TikTok, Instagram Reels).

Optimized for mid-tier consumer hardware (NVIDIA RTX 3050 4GB/6GB VRAM, AMD Ryzen 7 CPU).

---

## 🏗 System Architecture & Pipeline Modules

1. **`scraper.py` (Module A)**: Public JSON scraper for Reddit (`r/AITAH`, `r/TrueOffMyChest`). Zero API keys required. Filters NSFW, short text (<140 words), and media posts.
2. **`agent_llm.py` (Module B)**: Connects to OpenRouter (`openrouter/free`). Transforms stories into hook-driven scripts with automatic `[PAUSE=1.0]` and `[PAUSE=0.5]` breathing tags.
3. **`tts_engine.py` (Module C)**: Local Kokoro TTS pipeline (`24kHz`). Generates speech arrays and interleaves zero-padded NumPy arrays for exact millisecond pause injection.
4. **`visuals.py` (Module D)**: Local Stable Diffusion 1.5 in `torch.float16` with `enable_attention_slicing()` and VRAM garbage collection to run safely on RTX 3050 VRAM. Generates 9:16 vertical frames.
5. **`captions.py` (Module E)**: Local OpenAI Whisper base model transcribing audio with `word_timestamps=True` for word-by-word kinetic subtitle timing.
6. **`assembler.py` (Module F)**: MoviePy v2 assembly engine with **Algorithmic Variance Engine** (randomized colors/fonts/offsets to bypass platform duplicate filters) and Ken Burns motion zoom.
7. **`main.py`**: Central orchestrator with rich logging, CLI flags, and exception handling.

---

## 🛠 Quick Start Guide

### 1. Prerequisites
- **Python**: 3.10, 3.11, or 3.12
- **GPU**: NVIDIA GPU with CUDA support (e.g., RTX 3050)
- **OpenRouter API Key**: Optional/Free Tier supported (`OPENROUTER_API_KEY`)

### 2. Installation
```bash
# Clone or extract repository
cd python_pipeline

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

# Install PyTorch with CUDA support & dependencies
pip install -r requirements.txt
```

### 3. Execution & Scene Selection
The pipeline automatically rolls a random number of visual scene splits between 10 and 15 per run (`random.randint(10, 15)`).

Run the full pipeline:
```bash
python main.py
```

Target a specific genre or subreddit:
```bash
python main.py --genre "Horror"
python main.py --subreddit "nosleep"
```

Override scene count via CLI flag if desired:
```bash
python main.py --scenes 12
```

---

## ⚙ Hardware & VRAM Safety Tips (RTX 3050)
- The pipeline uses `torch.float16` and `.enable_attention_slicing()` by default in `visuals.py`.
- If running on a 4GB VRAM GPU, enable `self.pipe.enable_sequential_cpu_offload()` in `config.py`.
