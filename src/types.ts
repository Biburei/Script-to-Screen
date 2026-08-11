export interface RedditStory {
  id: string;
  subreddit: string;
  title: string;
  body: string;
  author: string;
  score: number;
  num_comments: number;
  url: string;
  word_count: number;
  over_18?: boolean;
}

export interface Story {
  id: string;
  subreddit: string;
  title: string;
  body: string;
  author: string;
  score: number;
  num_comments: number;
  url: string;
  word_count: number;
  over_18?: boolean;
  part?: number;
  genre: string;
  tags: string;
  has_pre_rendered_assets?: boolean;
  assets?: string[];
}

export interface PipelineState {
  current_index: number;
  total_stories: number;
  current_story_id: string;
}

export interface FramePrompt {
  frame_id: number;
  prompt: string;
  scene_type: string;
  suggested_denoising: number;
}

export interface VoicePreset {
  id: string;
  name: string;
  accent: string;
  gender: string;
  sampleText: string;
}

export interface TagCategory {
  category: string;
  blueprint: string;
  tags: string[];
}

export interface ScriptResult {
  raw_script: string;
  script_with_pauses: string;
  word_count: number;
  estimated_duration: number;
  provider: string;
}

export interface WordTimestamp {
  word: string;
  start: number;
  end: number;
  probability?: number;
}

export interface SDSceneFrame {
  scene_id: number;
  prompt: string;
  negative_prompt: string;
  text_context: string;
  bg_gradient: string;
}

export interface ColorProfile {
  name: string;
  primary: string;
  highlight: string;
  bg_stroke: string;
  stroke_width: number;
  y_position: number;
  font_size: number;
}

export interface PipelineConfig {
  subreddit: string;
  openrouterModel: string;
  vramLimitGb: number;
  useFp16: boolean;
  enableAttentionSlicing: boolean;
  enableVaeTiling: boolean;
  kokoroVoice: string;
  numScenes: number;
  selectedColorProfileIndex: number;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  module: "SCRAPER" | "OPENROUTER_LLM" | "KOKORO_TTS" | "STABLE_DIFFUSION" | "WHISPER" | "MOVIEPY_V2" | "SYSTEM" | "SERVER" | "PIPELINE" | "DEPENDENCY";
  level: "INFO" | "SUCCESS" | "WARN" | "ERROR" | "FATAL";
  message: string;
  stack?: string;
  context?: Record<string, any>;
}

export interface FatalErrorReport {
  id: string;
  timestamp: string;
  module: string;
  errorName: string;
  message: string;
  stack?: string;
  recovered: boolean;
  context?: Record<string, any>;
  processId?: number;
}
