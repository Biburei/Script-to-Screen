"""
Module B: OpenRouter LLM Script Writer (agent_llm.py)
Transforms raw Reddit stories into high-retention short scripts using OpenRouter Free Tier LLM.
Injects custom pause tags ([PAUSE=1.0], [PAUSE=0.5]) for Kokoro TTS audio pacing.
"""
import re
import json
import random
import logging
try:
    import requests
except ImportError:
    requests = None
from typing import Dict, Any, List, Optional
from config import OPENROUTER_API_KEY, OPENROUTER_API_URL, OPENROUTER_MODEL

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

# Randomized Call-To-Action (CTA) Pool for dark horror / mystery / short-form content
# Prevents repetitive template fingerprinting and avoids social platform spam filters
ATMOSPHERIC_CTA_POOL = [
    "Would you have stayed in that house, or run? Tell me in the comments.",
    "What would you do if you saw that smiling at you in the dark? Comment below.",
    "If you heard that tapping sound at 3 AM, what's your first move? Let me know.",
    "Tell me in the comments—what do you think was hiding behind that door?",
    "Was I wrong for leaving right then? Share your thoughts in the comments.",
    "Would you open that door? Drop a comment with what you would have done.",
    "What would you have done if you heard that whisper? Let me know below.",
    "Tell me in the comments: would you lock the door or check outside?",
    "Do you believe in cursed places? Leave a comment with your experience.",
    "If this happened to you in the dark, how would you survive? Share below."
]


# Organic Conclusion Generator Prompt System
ORGANIC_CONCLUSION_SYSTEM_PROMPT = """You are an expert dark fiction author and short-form video copywriter specializing in high-retention horror and psychological thriller narratives.

Your task is to craft a natural, chilling, and completely unique conclusion to the provided story.

Inputs you will receive:
1. The core story text.
2. A raw engagement concept seed (e.g., asking the viewer what they would do, or if they would stay/run).

Instructions for the ending:
- DO NOT use a rigid, robotic template like "What would you have done? Let me know in the comments."
- Subtly and organically weave the core idea of the engagement seed into the final sentences so it connects directly to the specific threat, object, or event described in the story.
- Ensure high linguistic variation and an eerie tone that matches the narrative.
- Output the final paragraph smoothly flowing into this custom engagement question, with no conversational filler or meta-commentary."""


class OrganicConclusionGenerator:
    """
    Expert dark fiction and short-form video copywriter module.
    Crafts natural, chilling, and unique conclusions that organically weave
    engagement seeds directly into the narrative threat without rigid templates.
    """

    def __init__(self, cta_pool: Optional[list] = None):
        self.cta_pool = cta_pool or ATMOSPHERIC_CTA_POOL

    def build_organic_prompt(self, story_body: str, engagement_seed: Optional[str] = None) -> str:
        selected_seed = engagement_seed or random.choice(self.cta_pool)
        return f"""{ORGANIC_CONCLUSION_SYSTEM_PROMPT}

CORE STORY TEXT:
{story_body}

RAW ENGAGEMENT CONCEPT SEED:
{selected_seed}

Output ONLY the final organic ending paragraph that seamlessly merges the narrative climax with the engagement hook:
"""
    def craft_fallback_organic_ending(self, text_body: str, target_words: int) -> str:
        """
        Algorithmic fallback that extracts key nouns/threats from story text
        and weaves them into a tailored closing hook.
        """
        words = text_body.split()
        if len(words) <= target_words:
            clean_text = text_body.strip()
        else:
            truncated_slice = " ".join(words[:target_words])
            match = re.search(r'^(.*[.!?])\s+[^.!?]*$', truncated_slice)
            clean_text = match.group(1).strip() if match else truncated_slice.strip() + "..."

        if not clean_text.endswith(('.', '!', '?', '...')):
            clean_text += "."

        # Pick random CTA seed and personalize
        seed = random.choice(self.cta_pool)
        return f"{clean_text} {seed}"


def clean_excel_artifacts(text: str) -> str:
    """Clean leftover Excel export artifacts, headers, quotes, markdown asterisks, and HTML/encoding clutter."""
    if not text:
        return ""
    text = str(text)
    text = text.replace("&amp;", "&").replace("&quot;", '"').replace("&#39;", "'")
    text = re.sub(r'\[EXCEL_EXPORT_[^\]]*\]', '', text, flags=re.IGNORECASE)
    text = text.replace('""', '"')
    # Strip markdown asterisks (*italic*, **bold**, ***bold italic***) and standalone/escaped asterisks
    text = re.sub(r'\*{1,3}(.*?)\*{1,3}', r'\1', text)
    text = re.sub(r'\\?\*', '', text)
    text = re.sub(r'\r\n|\r', '\n', text)
    text = re.sub(r'\s+', ' ', text)
    return text.strip()


def sanitize_script_output(text: str) -> str:
    """Ensure raw script contains NO conversational fluff, headers, or intro commentary."""
    text = re.sub(r'```(?:text|markdown)?', '', text).replace('```', '')
    text = re.sub(r'(?i)^(here is (the|your) script[:\s]*|script[:\s]*|part \d+[:\s]*|narration[:\s]*|output[:\s]*)\s*', '', text.strip())
    if (text.startswith('"') and text.endswith('"')) or (text.startswith("'") and text.endswith("'")):
        text = text[1:-1].strip()
    return text.strip()


# 2-STAGE SCRIPT GENERATION PIPELINE PROMPT TEMPLATES

STAGE_1_PROMPT_TEMPLATE = """You are an expert horror and creepypasta scriptwriter specializing in viral YouTube Shorts, TikToks, and Reels.

TASK:
Take the provided long-form creepypasta story and draft a high-retention 1st-person ("I") narration script strictly between 180 and 210 words.

HOOK INSTRUCTION (CRITICAL):
Model your opening sentence by selecting and adapting the technique from ONE of these 7 Few-Shot Gold Standards that best matches the atmosphere of the story:

1. Cosmic / Unnoticed Infiltration (The Exorcist):
   "Like the brief doomed flare of exploding suns that register dimly on the farthest edge of the galaxy, the beginning of the horror passed almost unnoticed."
2. Timeline of Dread (IT):
   "The terror, which would not end for another twenty-eight years—if it ever did end—began, so far as I know or can tell, with a boat made from a sheet of newspaper floating down a gutter swollen with rain."
3. Sudden Physical Reaction / Jump-Scare (Psycho):
   "Norman Bates heard the noise and a shock went through him."
4. Absolute Truth / Ominous Fact (Ghost Story):
   "Because, as everyone knows, when death comes, it comes in darkness."
5. Abrupt Body Horror / Sudden Shift (The Metamorphosis):
   "As Gregor Samsa awoke one morning from uneasy dreams he found himself transformed in his bed into a monstrous vermin."
6. Atmospheric Environmental Warning (American Psycho):
   "ABANDON ALL HOPE YE WHO ENTER HERE is scrawled in blood red lettering on the side of the Chemical Bank."
7. Foreboding Character / Tragedy Setup (Pet Sematary):
   "Louis Creed, who had lost his father at three and who had never known a grandfather, came to Ludlow with his wife and his two young children and a raggedy cat."

NARRATIVE RULES:
- Word Count: Strictly between 180 and 210 words.
- Tone: Gripping, atmospheric, urgent, terrifying.
- Perspective: 1st Person ("I").
- Output: Provide ONLY the raw draft script. Do not include introductory text, meta-commentary, or conversational filler.

RAW STORY TITLE: {clean_title}
RAW STORY CONTENT:
{clean_body}"""


STAGE_2_PROMPT_TEMPLATE = """You are an expert Text-to-Speech (TTS) script editor and audio engineer.

TASK:
Perform a final anti-fluff polish pass on the draft script to ensure maximum spoken performance for automated TTS narration engines.

RULES:
1. Strip out any AI fluff, clichés, or buzzwords (e.g., "delve", "tapestry", "chilling realization", "testament").
2. Remove any conversational preambles or postscripts (e.g., "Here is your script:", "Hope you like it!").
3. Eliminate ALL non-spoken formatting: asterisks, quotes, markdown symbols, brackets, or stage directions.
4. Ensure the final word count remains strictly between 180 and 210 words.
5. Output ONLY raw speakable text ready for immediate voice narration.

DRAFT SCRIPT:
{draft_script}"""


def run_two_stage_script_pipeline(
    title: str,
    body: str,
    api_key: str = OPENROUTER_API_KEY,
    model: str = OPENROUTER_MODEL,
    host: str = OPENROUTER_API_URL
) -> Dict[str, Any]:
    """
    Sequential 2-Stage Script Generation Pipeline:
    Stage 1: Primary Smart LLM drafts script using Few-Shot Gold Standard Hook selection.
    Stage 2: Fast/Deterministic LLM performs TTS & Anti-Fluff Polish pass.
    """
    clean_t = clean_excel_artifacts(title)
    clean_b = clean_excel_artifacts(body)

    headers = {
        "Authorization": f"Bearer {api_key}",
        "HTTP-Referer": "https://github.com/autoshorts-pipeline",
        "X-Title": "AutoShorts Pipeline",
        "Content-Type": "application/json"
    }

    # ----------------------------------------------------
    # STAGE 1: Script Writer with Few-Shot Gold Standard Hooks
    # ----------------------------------------------------
    stage_1_prompt = STAGE_1_PROMPT_TEMPLATE.format(clean_title=clean_t, clean_body=clean_b)
    
    payload_stage_1 = {
        "model": model or "openrouter/free",
        "messages": [
            {"role": "system", "content": "You are a master horror scriptwriter. Output ONLY the raw 1st-person draft script between 180 and 210 words."},
            {"role": "user", "content": stage_1_prompt}
        ],
        "temperature": 0.7
    }

    try:
        if not requests or not api_key:
            raise ValueError("Requests module or OpenRouter API key not available")

        logger.info(f"[STAGE 1] Drafting script with Few-Shot Gold Standard Hooks via {model}...")
        res1 = requests.post(host, headers=headers, json=payload_stage_1, timeout=30)
        res1.raise_for_status()
        raw_draft = res1.json().get("choices", [{}])[0].get("message", {}).get("content", "").strip()
        draft_script = sanitize_script_output(raw_draft)
    except Exception as e:
        logger.warning(f"Stage 1 LLM call notice ({e}). Falling back to algorithmic script generation.")
        writer = LLMScriptWriter(host=host, model=model, api_key=api_key)
        return writer._fallback_script_formatter(clean_t, clean_b)

    # ----------------------------------------------------
    # STAGE 2: TTS & Anti-Fluff Polish (Fast / Deterministic)
    # ----------------------------------------------------
    stage_2_prompt = STAGE_2_PROMPT_TEMPLATE.format(draft_script=draft_script)

    payload_stage_2 = {
        "model": model or "openrouter/free",
        "messages": [
            {"role": "system", "content": "You are an expert TTS script editor. Return ONLY raw speakable text with ZERO markdown or fluff."},
            {"role": "user", "content": stage_2_prompt}
        ],
        "temperature": 0.2
    }

    try:
        logger.info(f"[STAGE 2] Performing TTS & Anti-Fluff polish pass via {model}...")
        res2 = requests.post(host, headers=headers, json=payload_stage_2, timeout=20)
        res2.raise_for_status()
        raw_polished = res2.json().get("choices", [{}])[0].get("message", {}).get("content", "").strip()
        polished_script = sanitize_script_output(raw_polished)
    except Exception as e:
        logger.warning(f"Stage 2 LLM polish notice ({e}). Using Stage 1 draft directly.")
        polished_script = draft_script

    # Inject Kokoro breathing pause tags & calculate word count
    writer = LLMScriptWriter(host=host, model=model, api_key=api_key)
    script_with_pauses = writer.inject_pause_tags(polished_script)
    word_count = len(re.findall(r'\b\w+\b', polished_script))

    return {
        "raw_script": polished_script,
        "script_with_pauses": script_with_pauses,
        "word_count": word_count,
        "estimated_duration": 55,
        "stage_1_draft": draft_script,
        "status": "success"
    }


class LLMScriptWriter:
    def __init__(self, host: str = OPENROUTER_API_URL, model: str = OPENROUTER_MODEL, api_key: str = OPENROUTER_API_KEY):
        self.host = host
        self.model = model or "openrouter/free"
        self.api_key = api_key

    def calculate_target_length(self, source_word_count: int) -> Dict[str, Any]:
        """Target length strictly between 180 and 210 words for 50-60 second narration."""
        return {
            "target_words": 195,
            "estimated_seconds": 55
        }

    def generate_script_prompt(
        self,
        title: str,
        body: str,
        part: int = 1,
        is_continuation: bool = False
    ) -> str:
        clean_t = clean_excel_artifacts(title)
        clean_b = clean_excel_artifacts(body)
        return STAGE_1_PROMPT_TEMPLATE.format(clean_title=clean_t, clean_body=clean_b)

    def inject_pause_tags(self, script_text: str) -> str:
        """
        Regex post-processing: Auto-inject custom breathing pause tags for Kokoro TTS.
        """
        text = script_text.strip()
        text = re.sub(r'\n{2,}', ' [PAUSE=1.0] ', text)
        text = re.sub(r'\n', ' ', text)
        text = re.sub(r'\.{3,}', '... [PAUSE=0.5] ', text)
        text = re.sub(r'—|--', ' — [PAUSE=0.5] ', text)
        text = re.sub(r'(\[PAUSE=[\d.]+\]\s*){2,}', r'\1', text)
        text = re.sub(r'\s+', ' ', text).strip()
        return text

    def rewrite_story(
        self,
        title: str,
        body: str,
        source_word_count: int = 0,
        part: int = 1,
        is_continuation: bool = False
    ) -> Dict[str, Any]:
        """Call 2-Stage Script Generation Pipeline with fallback capability."""
        return run_two_stage_script_pipeline(
            title=title,
            body=body,
            api_key=self.api_key,
            model=self.model,
            host=self.host
        )

    def _fallback_script_formatter(
        self,
        title: str,
        body: str,
        part: int = 1,
        is_continuation: bool = False
    ) -> Dict[str, Any]:
        """Algorithmic fallback generating a strictly 180-210 word script preserving the true dataset chunk ending."""
        clean_t = clean_excel_artifacts(title)
        clean_b = clean_excel_artifacts(body)

        sentences = [s.strip() for s in re.split(r'(?<=[.!?])\s+', clean_b) if s.strip()]
        if len(sentences) >= 2:
            literal_source_ending = " ".join(sentences[-2:])
            body_sentences = sentences[:-2]
        elif len(sentences) == 1:
            literal_source_ending = sentences[0]
            body_sentences = sentences
        else:
            literal_source_ending = clean_b[-120:].strip()
            body_sentences = [clean_b]

        if part >= 2 or is_continuation:
            opening = "As the horror deepened, I realized the terrifying truth behind what was happening."
            closing_cliffhanger = f"Before I could react or escape, dread overwhelmed me as {literal_source_ending}"
        else:
            opening = f"I never believed in true horror until I found what was hidden inside {clean_t}."
            closing_cliffhanger = f"As the shadows closed in around me, the chill became unbearable as {literal_source_ending}"

        body_text = " ".join(body_sentences) if body_sentences else clean_b
        raw_words = re.findall(r'\b\w+\b', body_text)

        target_total = 195
        prefix_words = len(re.findall(r'\b\w+\b', opening))
        suffix_words = len(re.findall(r'\b\w+\b', closing_cliffhanger))
        needed_body_words = max(20, target_total - prefix_words - suffix_words)

        if len(raw_words) >= needed_body_words:
            selected_body = " ".join(raw_words[:needed_body_words])
            if not selected_body.endswith(('.', '!', '?')):
                selected_body += "."
        else:
            multiplier = (needed_body_words // max(1, len(raw_words))) + 2
            repeated_body = (body_text + " ") * multiplier
            rep_words = re.findall(r'\b\w+\b', repeated_body)
            selected_body = " ".join(rep_words[:needed_body_words]) + "."

        raw_script = f"{opening} {selected_body} {closing_cliffhanger}"

        words = re.findall(r'\b\w+\b', raw_script)
        if len(words) < 180:
            fillers = ["The", "chilling", "silence", "grew", "heavy", "in", "the", "darkness", "as", "fear", "paralyzed", "every", "single", "breath"]
            idx = 0
            while len(words) < 180:
                words.insert(-5, fillers[idx % len(fillers)])
                idx += 1
            raw_script = " ".join(words)
        elif len(words) > 210:
            front = words[:170]
            back = words[-25:]
            raw_script = " ".join(front + back)

        raw_script = sanitize_script_output(raw_script)
        script_with_pauses = self.inject_pause_tags(raw_script)
        word_count = len(re.findall(r'\b\w+\b', raw_script))

        return {
            "raw_script": raw_script,
            "script_with_pauses": script_with_pauses,
            "word_count": word_count,
            "estimated_duration": 55,
            "part": part,
            "openrouter_model": "fallback_transformer",
            "status": "fallback_applied"
        }

    def generate_scene_prompts(self, script_text: str, num_scenes: int) -> List[Dict[str, Any]]:
        """Convenience method on LLMScriptWriter to generate scene prompts via OpenRouter."""
        return generate_scene_prompts(
            text=script_text,
            num_scenes=num_scenes,
            host=self.host,
            model=self.model,
            api_key=self.api_key
        )


def generate_scene_prompts(
    text: str,
    num_scenes: int,
    host: str = OPENROUTER_API_URL,
    model: str = OPENROUTER_MODEL,
    api_key: str = OPENROUTER_API_KEY
) -> List[Dict[str, Any]]:
    """
    Sends a request to OpenRouter to dynamically break down a story narrative into
    exactly `num_scenes` sequential visual storyboard frame objects (Film Director role).
    """
    clean_text = re.sub(r'\[PAUSE=[\d.]+\]', '', text).strip()
    prompt = f"""You are an expert film director and artistic director for high-retention video stories.

TASK:
Analyze the following story narrative and split it into EXACTLY {num_scenes} sequential storyboard frame objects for an AI image generator (Stable Diffusion).

INSTRUCTIONS:
1. Divide the story chronologically from start to end into {num_scenes} key frames.
2. For each frame, return a JSON object with these EXACT keys:
   - "frame_id": (integer) Sequential frame number starting at 1.
   - "prompt": (string) Dense, highly descriptive physical visual prompt for Stable Diffusion focusing on subject, environment, spatial composition, and lighting. Keep strictly under 30 words.
   - "scene_type": (string) Must be EXACTLY one of: "new_location", "camera_cut", or "continuous_action".
     * "new_location": Major setting shift or brand new environment (always use for frame 1).
     * "camera_cut": Same location/scene, but with a significant angle, view, or perspective shift.
     * "continuous_action": Same shot and angle with continuous character apperarance and motion, or minor physical updates.
   - "suggested_denoising": (float) Denoising strength for image generation based on scene_type:
     * 1.0 for "new_location"
     * 0.75 to 0.85 for "camera_cut"
     * 0.35 to 0.50 for "continuous_action"
3. COMMA-SEPARATED TAGS ONLY: Do not write sentences. Extract the core action/subject from the script and convert it into comma-separated visual keywords (e.g., "abandoned farm, dark night, rotting wood").
4. STRICT WORD LIMIT: The "prompt" string MUST be 15 words or less to prevent token truncation.
5. FRONT-LOAD THE SUBJECT: Put the main character, monster, or focal point at the very beginning of the tag list.
6. CHARACTER CONSISTENCY: If the script features the same entity across multiple frames, use the exact same descriptive tags for them each time so the AI maintains their identity.

7. Output MUST be a strict, valid JSON array containing exactly {num_scenes} objects. No conversational commentary, introductory text, or markdown outside the JSON array.

EXAMPLE OUTPUT FORMAT:
[
  {{
    
    "frame_id": 1,
    "prompt": "comma, separated, tags, based, on, script, max, fifteen, words",
    "scene_type": "new_location",
    "suggested_denoising": 1.0
  
  }},
  {{
    "frame_id": 2,
    "prompt": "Low angle close-up of the figure's face turning towards a glowing doorway at the end of the alley.",
    "scene_type": "camera_cut",
    "suggested_denoising": 0.80
  }},
  {{
    "frame_id": 3,
    "prompt": "Medium shot of the figure slowly pushing open the heavy metallic door, shadows stretching behind them.",
    "scene_type": "continuous_action",
    "suggested_denoising": 0.40
  }}
]

STORY TEXT:
{clean_text}"""

    headers = {
        "Authorization": f"Bearer {api_key}",
        "HTTP-Referer": "https://github.com/Biburei/Script-to-Screen",
        "X-Title": "Script-to-Screen",
        "Content-Type": "application/json"
    }

    payload = {
        "model": model or "openrouter/free",
        "messages": [
            {"role": "system", "content": "You are an expert film director that splits story narratives into JSON arrays of storyboard frame objects."},
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.7
    }

    try:
        if not requests or not api_key:
            raise ValueError("Requests or API key unavailable")
        logger.info(f"Requesting OpenRouter ({model}) to split story into {num_scenes} semantic visual frame objects...")
        response = requests.post(host, headers=headers, json=payload, timeout=30)
        response.raise_for_status()
        res_json = response.json()
        raw_output = res_json.get("choices", [{}])[0].get("message", {}).get("content", "").strip()

        prompts = _parse_llm_scene_prompts(raw_output)
        if len(prompts) == num_scenes:
            logger.info(f"Successfully generated {num_scenes} semantic frame objects via OpenRouter.")
            return prompts
        else:
            logger.info(f"LLM returned {len(prompts)} prompts for requested {num_scenes}. Normalizing list...")
            return _normalize_prompt_count(prompts, clean_text, num_scenes)

    except Exception as e:
        logger.warning(f"OpenRouter scene prompt generation notice ({e}). Using rule-based fallback generator.")
        return _fallback_scene_prompts(clean_text, num_scenes)


def _parse_llm_scene_prompts(raw_output: str) -> List[Dict[str, Any]]:
    """Parse JSON array of frame objects from LLM output."""
    if not raw_output:
        return []

    # Clean markdown formatting like ```json ... ```
    cleaned = re.sub(r'```(?:json)?', '', raw_output).replace('```', '').strip()

    # Try JSON parsing
    try:
        data = json.loads(cleaned)
        if isinstance(data, list):
            result = []
            for idx, item in enumerate(data):
                if isinstance(item, dict):
                    prompt_str = item.get("prompt") or item.get("description") or item.get("visual") or item.get("scene") or ""
                    scene_type = str(item.get("scene_type", "new_location" if idx == 0 else "continuous_action")).lower()
                    if scene_type not in ["new_location", "camera_cut", "continuous_action"]:
                        scene_type = "new_location" if idx == 0 else "continuous_action"

                    denoising = item.get("suggested_denoising")
                    if denoising is None or not isinstance(denoising, (int, float)):
                        if scene_type == "new_location":
                            denoising = 1.0
                        elif scene_type == "camera_cut":
                            denoising = 0.80
                        else:
                            denoising = 0.45

                    frame_id = item.get("frame_id", idx + 1)

                    if prompt_str:
                        result.append({
                            "frame_id": int(frame_id),
                            "prompt": str(prompt_str).strip(),
                            "scene_type": scene_type,
                            "suggested_denoising": float(denoising)
                        })
                elif isinstance(item, str) and item.strip():
                    scene_type = "new_location" if idx == 0 else "continuous_action"
                    result.append({
                        "frame_id": idx + 1,
                        "prompt": item.strip(),
                        "scene_type": scene_type,
                        "suggested_denoising": 1.0 if idx == 0 else 0.45
                    })
            if result:
                return result
    except Exception as e:
        logger.debug(f"JSON parsing notice: {e}")

    # Fallback parsing for line items / string lists
    lines = [line.strip() for line in cleaned.split('\n') if line.strip()]
    parsed = []
    for idx, line in enumerate(lines):
        match = re.sub(r'^(?:Scene\s*\d+[:\s]*|\d+[\.\)\:]\s*|[\-\*]\s*|\[.*?\]\s*)', '', line, flags=re.I).strip()
        match = match.strip('"`\'')
        if len(match) > 10:
            scene_type = "new_location" if idx == 0 else "continuous_action"
            parsed.append({
                "frame_id": idx + 1,
                "prompt": match,
                "scene_type": scene_type,
                "suggested_denoising": 1.0 if idx == 0 else 0.45
            })

    return parsed


def _normalize_prompt_count(prompts: List[Dict[str, Any]], text: str, num_scenes: int) -> List[Dict[str, Any]]:
    """Ensure exactly num_scenes prompt dicts are returned."""
    if not prompts:
        return _fallback_scene_prompts(text, num_scenes)

    if len(prompts) > num_scenes:
        return prompts[:num_scenes]

    while len(prompts) < num_scenes:
        idx = len(prompts)
        base = prompts[idx % len(prompts)]
        prompts.append({
            "frame_id": idx + 1,
            "prompt": f"{base['prompt']}, detailed alternate perspective",
            "scene_type": "continuous_action",
            "suggested_denoising": 0.45
        })

    return prompts[:num_scenes]


def _fallback_scene_prompts(text: str, num_scenes: int) -> List[Dict[str, Any]]:
    """Rule-based fallback segmentation if OpenRouter is unreachable."""
    sentences = [s.strip() for s in text.split('.') if len(s.strip()) > 10]
    if not sentences:
        sentences = [text]

    chunk_size = max(1, len(sentences) // num_scenes)
    prompts = []

    for idx in range(num_scenes):
        start_i = idx * chunk_size
        end_i = (idx + 1) * chunk_size if idx < num_scenes - 1 else len(sentences)
        scene_text = " ".join(sentences[start_i:end_i])
        scene_type = "new_location" if idx == 0 else ("camera_cut" if idx % 2 == 1 else "continuous_action")
        denoising = 1.0 if idx == 0 else (0.80 if scene_type == "camera_cut" else 0.45)

        prompts.append({
            "frame_id": idx + 1,
            "prompt": scene_text[:140],
            "scene_type": scene_type,
            "suggested_denoising": denoising
        })

    return prompts

if __name__ == "__main__":
    writer = LLMScriptWriter()
    sample_title = "AITA for leaving my brother's wedding after my sister-in-law's speech?"
    sample_body = "My brother got married yesterday. During the speech, his new wife decided to announce to everyone that I was fired from my job last week... I stood up, left the venue, and turned off my phone. Now my whole family is spamming me calling me selfish."
    result = writer.rewrite_story(sample_title, sample_body, len(sample_body.split()))
    print("\n--- GENERATED SCRIPT WITH PAUSE TAGS ---")
    print(result["script_with_pauses"])