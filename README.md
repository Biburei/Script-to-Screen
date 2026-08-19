Horror Content Automation Engine


A high-performance, asynchronous Python ETL and media-processing pipeline designed to automate end-to-end video production.
The engine processes unstructured horror narratives, manages persistent pipeline states, coordinates multi-stage AI microservices, and programmatically renders vertical short-form media. Optimized to run locally on NVIDIA T4 GPUs, the pipeline executes hardware-bound diffusion rendering within strict VRAM limits

 Architecture & Data Flow

[ Data Ingestion ] ──► [ LLM Refinement ] ──► [ Parallel Media Services ] ──► [ Alignment & Rendering ]
  scraper.py            agent_llm.py           ├── tts_engine.py                ├── captions.py
  (Cleaning & State)    (Prompt & Script)      └── visuals.py                   └── assembler.py


Ingestion & State Tracking (scraper.py): Ingests raw narrative data from local datasets, cleans text artifacts, and updates a state machine (pipeline_state.json) to track processing status and episode continuity.

Script Generation (agent_llm.py): Interacts with OpenRouter LLM endpoints via a 2-stage prompt structure to rewrite raw text into retention-optimized scripts with embedded timing markers ([PAUSE=X]).

Parallel Asset Generation:Audio (tts_engine.py): Synthesizes 24kHz audio via Kokoro TTS, parsing timing tags into frame delays.  Visuals (visuals.py): Generates vertical 9:16 background scenes using Wan2.1-T2V-1.3B with memory-optimized VAE slicing and offloading.  Timestamp Synchronization (captions.py): Runs faster-whisper speech recognition against original scripts, using difflib.SequenceMatcher to correct OCR/transcription errors and map exact word-level time offsets. 

Programmatic Compositing (assembler.py): Assembles visual assets, audio streams, dynamic kinetic subtitles, and randomized UI parameters into a single MP4 via MoviePy v2.  

Key Technical FeaturesState Persistence & Fault Tolerance: 
Uses local JSON state management to ensure multi-step execution recovery during pipeline failures.  

Determinism Engine:
Employs sequence matching algorithms (difflib) to eliminate AI transcription hallucinations in subtitle timing.  

Algorithmic Variance Engine: Randomizes font parameters, overlay colors, and layout positioning per video batch to avoid automated platform duplication detection.  

Low-Resource Neural Execution: 
Implements VAE slicing, 8-bit quantization, local diffusion inference.  

Tech Stack & DependenciesLanguage:
Python 3.10+Data Processing: pandas, openpyxl, json, difflib  AI & Machine Learning: torch, diffusers (Wan 1.3B), faster-whisper, OpenRouter API  Media & Synthesis: moviepy (v2), Kokoro TTS, ffmpeg