import React, { useState, useEffect } from "react";
import {
  RefreshCw,
  BookOpen,
  FileText,
  Clock,
  Mic,
  Palette,
  Captions,
  Film,
  Sparkles,
  ChevronRight,
  AlertCircle,
  Wand2,
  CheckCircle2,
  Sliders,
  Play
} from "lucide-react";
import { RedditStory, ScriptResult, WordTimestamp, SDSceneFrame, ColorProfile, PipelineConfig } from "../types";
import { VerticalShortPlayer } from "./VerticalShortPlayer";

interface PipelineStudioProps {
  config: PipelineConfig;
  onChangeConfig: (newConfig: PipelineConfig) => void;
  colorProfiles: ColorProfile[];
  onAddLog: (module: any, level: any, message: string) => void;
  onExecutePipeline: () => void;
  isExecuting: boolean;
}

export const PipelineStudio: React.FC<PipelineStudioProps> = ({
  config,
  onChangeConfig,
  colorProfiles,
  onAddLog,
  onExecutePipeline,
  isExecuting,
}) => {
  const [stories, setStories] = useState<RedditStory[]>([]);
  const [selectedStory, setSelectedStory] = useState<RedditStory | null>(null);
  const [isLoadingStories, setIsLoadingStories] = useState(false);
  const [activeStep, setActiveStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  // Module B Script state
  const [scriptResult, setScriptResult] = useState<ScriptResult | null>(null);
  const [isTransformingScript, setIsTransformingScript] = useState(false);
  const [editedPauseScript, setEditedPauseScript] = useState<string>("");

  // Module E Word Timestamps state
  const [wordTimestamps, setWordTimestamps] = useState<WordTimestamp[]>([]);

  // Module D SD Scene Frames state
  const [sceneFrames, setSceneFrames] = useState<SDSceneFrame[]>([]);

  // Fetch Reddit Stories from server API or fallback
  const fetchStories = async (sub: string) => {
    setIsLoadingStories(true);
    onAddLog("SCRAPER", "INFO", `Fetching top stories from r/${sub} via public .json...`);
    try {
      const res = await fetch(`/api/reddit/posts?subreddit=${sub}&limit=12`);
      if (!res.ok) throw new Error("Server error");
      const data = await res.json();
      if (data.posts && data.posts.length > 0) {
        setStories(data.posts);
        setSelectedStory(data.posts[0]);
        onAddLog("SCRAPER", "SUCCESS", `Loaded ${data.posts.length} stories from r/${sub}`);
      } else {
        throw new Error("No stories returned");
      }
    } catch (e: any) {
      onAddLog("SCRAPER", "WARN", `Reddit live fetch notice (${e.message}). Loading curated stories.`);
      const fallbackStories: RedditStory[] = [
        {
          id: "aitah_101",
          subreddit: sub,
          title: "AITA for leaving my brother's wedding reception early after my sister-in-law's speech?",
          body: `My brother got married yesterday. During the maid of honor speech, his new wife decided to announce to all 150 guests that I was fired from my job last week. She played it off as a joke, but everyone laughed. I stood up, left the venue immediately, and turned off my phone. Now my whole family is spamming me calling me selfish for ruining their special day.`,
          author: "throwaway_reddit99",
          score: 14200,
          num_comments: 1850,
          url: "https://reddit.com/r/AITAH/comments/sample1",
          word_count: 185,
        },
        {
          id: "trueoffmychest_202",
          subreddit: "TrueOffMyChest",
          title: "I discovered a secret room behind the bookshelf in my new rented house",
          body: `I moved into an old 1920s house three weeks ago. Yesterday while cleaning the study, I bumped into the heavy wooden bookshelf and heard a hollow click. I pushed it aside and found a small concealed wooden door. Inside was a dusty wooden trunk with old letters from 1944.`,
          author: "mystery_tenant",
          score: 9800,
          num_comments: 940,
          url: "https://reddit.com/r/TrueOffMyChest/comments/sample2",
          word_count: 162,
        },
        {
          id: "askreddit_303",
          subreddit: "AskReddit",
          title: "What is the most unexpected piece of advice an old stranger ever gave you?",
          body: `I was sitting at a bus station in Chicago during a heavy rainstorm feeling completely lost in life. An old man with a vintage suit sat down next to me and said: 'Never sacrifice your peace for someone else's chaos.' That single sentence changed my entire decade.`,
          author: "urban_traveler",
          score: 22400,
          num_comments: 3100,
          url: "https://reddit.com/r/AskReddit/comments/sample3",
          word_count: 142,
        },
      ];
      setStories(fallbackStories);
      setSelectedStory(fallbackStories[0]);
    } finally {
      setIsLoadingStories(false);
    }
  };

  useEffect(() => {
    fetchStories(config.subreddit);
  }, [config.subreddit]);

  // When story is selected, auto-transform script
  useEffect(() => {
    if (selectedStory) {
      transformScript(selectedStory);
    }
  }, [selectedStory]);

  const transformScript = async (story: RedditStory) => {
    setIsTransformingScript(true);
    onAddLog("OPENROUTER_LLM", "INFO", `Connecting to OpenRouter LLM (${config.openrouterModel || "openrouter/free"}) to rewrite script...`);
    try {
      const res = await fetch("/api/transform-script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: story.title,
          body: story.body,
          source_word_count: story.word_count,
        }),
      });
      const data = await res.json();
      setScriptResult(data);
      setEditedPauseScript(data.script_with_pauses);
      onAddLog(
        "OPENROUTER_LLM",
        "SUCCESS",
        `Script rewritten (${data.word_count} words, ~${data.estimated_duration}s duration). Custom pause tags injected.`
      );

      // Generate Whisper Word Timestamps simulation
      generateWordTimestamps(data.raw_script);

      // Generate SD Scene Frames
      generateSDFrames(data.raw_script);
    } catch (e: any) {
      onAddLog("OPENROUTER_LLM", "ERROR", `Script transformation failed: ${e.message}`);
    } finally {
      setIsTransformingScript(false);
    }
  };

  const generateWordTimestamps = (rawScript: string) => {
    const words = rawScript
      .replace(/[^\w\s]/g, "")
      .split(/\s+/)
      .filter(Boolean);
    const durationPerWord = 0.36; // avg word speed
    let curTime = 0.1;

    const ts: WordTimestamp[] = words.map((w) => {
      const start = parseFloat(curTime.toFixed(2));
      const end = parseFloat((curTime + durationPerWord * 0.9).toFixed(2));
      curTime += durationPerWord;
      return { word: w.toUpperCase(), start, end, probability: 0.98 };
    });

    setWordTimestamps(ts);
    onAddLog("WHISPER", "SUCCESS", `Mapped ${ts.length} word timestamps for kinetic captions.`);
  };

  const generateSDFrames = (rawScript: string) => {
    const gradients = [
      "linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)",
      "linear-gradient(135deg, #18181b 0%, #312e81 100%)",
      "linear-gradient(135deg, #09090b 0%, #1e293b 100%)",
      "linear-gradient(135deg, #172554 0%, #1e1b4b 100%)",
      "linear-gradient(135deg, #1e1b4b 0%, #4c1d95 100%)",
    ];

    const sentences = rawScript.split(".").filter((s) => s.trim().length > 5);
    const frames: SDSceneFrame[] = [];

    const numSc = Math.min(config.numScenes, Math.max(3, sentences.length));
    for (let i = 0; i < numSc; i++) {
      const sentence = sentences[i] || rawScript.slice(0, 50);
      frames.push({
        scene_id: i + 1,
        text_context: sentence.trim(),
        prompt: `Dramatic graphic novel comic art of ${sentence.trim().slice(0, 80)}, vertical 9:16 frame, 8k resolution, cinematic atmosphere, sharp outlines`,
        negative_prompt: "low quality, horizontal, blurry, text, ugly, bad hands",
        bg_gradient: gradients[i % gradients.length],
      });
    }

    setSceneFrames(frames);
    onAddLog("STABLE_DIFFUSION", "SUCCESS", `Generated ${frames.length} 9:16 SD scene prompts (FP16 VRAM mode).`);
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Top Workflow Navigator */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-1 text-xs">
            <button
              onClick={() => setActiveStep(1)}
              className={`flex items-center space-x-2 px-3 py-2 rounded-xl transition-all ${
                activeStep === 1
                  ? "bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/30"
                  : "bg-slate-950 text-slate-400 hover:text-white"
              }`}
            >
              <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px]">1</span>
              <span>Module A: Scraper</span>
            </button>
            <ChevronRight className="w-4 h-4 text-slate-600" />

            <button
              onClick={() => setActiveStep(2)}
              className={`flex items-center space-x-2 px-3 py-2 rounded-xl transition-all ${
                activeStep === 2
                  ? "bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/30"
                  : "bg-slate-950 text-slate-400 hover:text-white"
              }`}
            >
              <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px]">2</span>
              <span>Module B: LLM Script</span>
            </button>
            <ChevronRight className="w-4 h-4 text-slate-600" />

            <button
              onClick={() => setActiveStep(3)}
              className={`flex items-center space-x-2 px-3 py-2 rounded-xl transition-all ${
                activeStep === 3
                  ? "bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/30"
                  : "bg-slate-950 text-slate-400 hover:text-white"
              }`}
            >
              <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px]">3</span>
              <span>Module C: Kokoro TTS</span>
            </button>
            <ChevronRight className="w-4 h-4 text-slate-600" />

            <button
              onClick={() => setActiveStep(4)}
              className={`flex items-center space-x-2 px-3 py-2 rounded-xl transition-all ${
                activeStep === 4
                  ? "bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/30"
                  : "bg-slate-950 text-slate-400 hover:text-white"
              }`}
            >
              <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px]">4</span>
              <span>Module D: SD Art</span>
            </button>
            <ChevronRight className="w-4 h-4 text-slate-600" />

            <button
              onClick={() => setActiveStep(5)}
              className={`flex items-center space-x-2 px-3 py-2 rounded-xl transition-all ${
                activeStep === 5
                  ? "bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/30"
                  : "bg-slate-950 text-slate-400 hover:text-white"
              }`}
            >
              <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px]">5</span>
              <span>Module E & F: MoviePy Render</span>
            </button>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-xs text-slate-400 font-mono">Subreddit Target:</span>
            <select
              value={config.subreddit}
              onChange={(e) => onChangeConfig({ ...config, subreddit: e.target.value })}
              className="bg-slate-950 border border-slate-700 text-white text-xs font-bold px-3 py-1.5 rounded-xl focus:ring-2 focus:ring-indigo-500"
            >
              <option value="AITAH">r/AITAH</option>
              <option value="TrueOffMyChest">r/TrueOffMyChest</option>
              <option value="AskReddit">r/AskReddit</option>
              <option value="confession">r/confession</option>
              <option value="tifu">r/tifu</option>
            </select>
            <button
              onClick={() => fetchStories(config.subreddit)}
              disabled={isLoadingStories}
              className="p-1.5 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
              title="Refresh Reddit feed"
            >
              <RefreshCw className={`w-4 h-4 ${isLoadingStories ? "animate-spin text-indigo-400" : ""}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Studio Content Area based on Active Step */}
      {activeStep === 1 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-indigo-400" /> Module A: Reddit Public JSON Scraper
              </h2>
              <p className="text-xs text-slate-400">
                Keyless scraper targeting Reddit public endpoints. Filters NSFW, short text (&lt;140 words), and non-text posts.
              </p>
            </div>
            <button
              onClick={() => setActiveStep(2)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5"
            >
              <span>Next: LLM Scripting</span> <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Stories Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stories.map((story) => {
              const isSelected = selectedStory?.id === story.id;
              return (
                <div
                  key={story.id}
                  onClick={() => setSelectedStory(story)}
                  className={`p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between space-y-4 ${
                    isSelected
                      ? "bg-indigo-950/40 border-indigo-500 shadow-xl shadow-indigo-500/10 ring-2 ring-indigo-500/50"
                      : "bg-slate-900 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40"
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-mono">
                      <span className="px-2 py-0.5 rounded-full bg-slate-950 border border-slate-800 text-indigo-400 font-bold">
                        r/{story.subreddit}
                      </span>
                      <span className="text-emerald-400 font-bold flex items-center gap-1">
                        ★ {story.score.toLocaleString()}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-white line-clamp-2 leading-snug">
                      {story.title}
                    </h3>

                    <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed">
                      {story.body}
                    </p>
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-800/80 pt-3 text-[11px] text-slate-500">
                    <span className="flex items-center gap-1 font-mono">
                      <FileText className="w-3.5 h-3.5 text-slate-400" /> {story.word_count} words
                    </span>

                    {isSelected ? (
                      <span className="text-indigo-400 font-bold flex items-center gap-1 text-xs">
                        <CheckCircle2 className="w-4 h-4" /> Selected
                      </span>
                    ) : (
                      <span className="text-slate-400 group-hover:text-white text-xs">Click to select</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeStep === 2 && selectedStory && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Wand2 className="w-5 h-5 text-indigo-400" /> Module B: OpenRouter LLM Script & Breathing Pause Tags
              </h2>
              <p className="text-xs text-slate-400">
                Transforms Reddit narrative into high-retention short scripts with custom regular expression pause tags ([PAUSE=1.0], [PAUSE=0.5]).
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => transformScript(selectedStory)}
                disabled={isTransformingScript}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl flex items-center gap-2"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isTransformingScript ? "animate-spin text-indigo-400" : ""}`} />
                <span>Regenerate Script</span>
              </button>
              <button
                onClick={() => setActiveStep(3)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5"
              >
                <span>Next: Kokoro TTS</span> <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Raw Story Input Box */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <span className="text-xs font-bold text-slate-300 font-mono">ORIGINAL REDDIT STORY</span>
                <span className="text-xs text-slate-500 font-mono">{selectedStory.word_count} words</span>
              </div>
              <h4 className="text-sm font-bold text-indigo-300">{selectedStory.title}</h4>
              <p className="text-xs text-slate-300 font-mono leading-relaxed whitespace-pre-wrap max-h-80 overflow-y-auto pr-2">
                {selectedStory.body}
              </p>
            </div>

            {/* Generated Script with Breathing Pause Tags */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
                  <span className="text-xs font-bold text-emerald-400 font-mono flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" /> REWRITTEN SCRIPT WITH BREATHING PAUSE TAGS
                  </span>
                  <span className="text-xs text-cyan-400 font-mono">
                    {scriptResult?.word_count || 0} words (~{scriptResult?.estimated_duration || 0}s)
                  </span>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] text-slate-400 font-mono block">
                    Edit Script & Pause Tags:
                  </label>
                  <textarea
                    value={editedPauseScript}
                    onChange={(e) => setEditedPauseScript(e.target.value)}
                    rows={8}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs font-mono text-emerald-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 leading-relaxed"
                  />
                </div>
              </div>

              {/* Pause Tags Guide */}
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
                <span className="font-semibold text-slate-300">Pacing Injections:</span>
                <div className="flex items-center space-x-2 font-mono">
                  <span className="px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800">
                    [PAUSE=1.0] Paragraph Break
                  </span>
                  <span className="px-2 py-0.5 rounded bg-teal-950 text-teal-300 border border-teal-800">
                    [PAUSE=0.5] Ellipsis / Dash
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeStep === 3 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Mic className="w-5 h-5 text-indigo-400" /> Module C: Kokoro TTS & Zero-Padded Audio Silence
              </h2>
              <p className="text-xs text-slate-400">
                Synthesizes 24kHz PyTorch audio streams. Interleaves exact NumPy arrays of zeros matching the sample rate for natural breathing pauses.
              </p>
            </div>
            <button
              onClick={() => setActiveStep(4)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5"
            >
              <span>Next: SD Art Generation</span> <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
                <Sliders className="w-4 h-4 text-indigo-400" /> Kokoro Audio Parameters
              </h3>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-slate-400 block mb-1">Voice Preset:</label>
                  <select
                    value={config.kokoroVoice}
                    onChange={(e) => onChangeConfig({ ...config, kokoroVoice: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 text-white font-mono rounded-xl p-2.5"
                  >
                    <option value="af_heart">af_heart (American Female)</option>
                    <option value="af_bella">af_bella (American Female Warm)</option>
                    <option value="am_adam">am_adam (American Male Deep)</option>
                    <option value="am_michael">am_michael (American Male Narrative)</option>
                    <option value="bf_emma">bf_emma (British Female)</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Sample Rate:</label>
                  <input
                    type="text"
                    disabled
                    value="24,000 Hz (24kHz Native PCM)"
                    className="w-full bg-slate-950 border border-slate-800 text-slate-400 font-mono rounded-xl p-2.5"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Pause Padding Engine:</label>
                  <input
                    type="text"
                    disabled
                    value="np.zeros(int(24000 * pause_sec), float32)"
                    className="w-full bg-slate-950 border border-slate-800 text-emerald-400 font-mono rounded-xl p-2.5"
                  />
                </div>
              </div>
            </div>

            {/* Audio Waveform Simulator */}
            <div className="md:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <span className="text-xs font-bold text-white font-mono flex items-center gap-2">
                    <Mic className="w-4 h-4 text-emerald-400" /> KOKORO 24KHZ AUDIO SYNTHESIZER
                  </span>
                  <span className="text-xs text-emerald-400 font-mono font-bold">24,000 Hz PCM • 16-bit WAV</span>
                </div>

                {/* Simulated Audio Waveform Bars */}
                <div className="h-28 bg-slate-950 rounded-xl border border-slate-800 p-4 flex items-center justify-center space-x-1.5 overflow-hidden">
                  {Array.from({ length: 48 }).map((_, i) => {
                    const isPauseBar = i % 10 === 0 || i % 11 === 0;
                    const height = isPauseBar ? 4 : Math.max(12, Math.sin(i * 0.4) * 45 + 50);
                    return (
                      <div
                        key={i}
                        className={`w-1.5 rounded-full transition-all duration-300 ${
                          isPauseBar ? "bg-slate-700" : "bg-gradient-to-t from-indigo-500 to-cyan-400"
                        }`}
                        style={{ height: `${height}%` }}
                      />
                    );
                  })}
                </div>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 text-xs text-slate-300 space-y-1 font-mono">
                <div className="flex justify-between text-slate-400">
                  <span>Audio Peak Normalization:</span>
                  <span className="text-emerald-400 font-bold">-1.0 dBFS (0.9 Amplitude)</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Concatenated Audio Chunks:</span>
                  <span className="text-cyan-400">14 Speech Arrays + 4 Zero-Silence Arrays</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeStep === 4 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Palette className="w-5 h-5 text-indigo-400" /> Module D: Local Stable Diffusion Art Director
              </h2>
              <p className="text-xs text-slate-400">
                Generates 9:16 vertical images (512x768) locally using SD 1.5 FP16 mode with attention slicing VRAM safety.
              </p>
            </div>
            <button
              onClick={() => setActiveStep(5)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5"
            >
              <span>Next: MoviePy Assembly</span> <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {sceneFrames.map((frame) => (
              <div
                key={frame.scene_id}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 flex flex-col justify-between shadow-lg"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-mono border-b border-slate-800 pb-2">
                    <span className="text-indigo-400 font-bold">FRAME #{frame.scene_id}</span>
                    <span className="text-slate-500">512x768</span>
                  </div>

                  {/* 9:16 Frame Mockup Box */}
                  <div
                    className="w-full aspect-[9/16] rounded-xl border border-slate-700/80 p-3 flex flex-col justify-between text-center relative overflow-hidden"
                    style={{ background: frame.bg_gradient }}
                  >
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px]" />
                    <div className="relative z-10 text-[10px] font-mono text-cyan-300 font-bold uppercase">
                      9:16 Vertical SD Frame
                    </div>
                    <div className="relative z-10 text-xs font-bold text-white drop-shadow line-clamp-4">
                      "{frame.text_context}"
                    </div>
                    <div className="relative z-10 text-[9px] font-mono text-slate-400">
                      FP16 • DPMSolver
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] text-slate-500 font-mono block uppercase">Prompt Modifier:</span>
                  <p className="text-[11px] text-slate-300 font-mono line-clamp-2 leading-tight">
                    {frame.prompt}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeStep === 5 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Film className="w-5 h-5 text-indigo-400" /> Module E & F: Whisper Captions & MoviePy v2 Assembler
              </h2>
              <p className="text-xs text-slate-400">
                Randomized Algorithmic Variance Engine with Ken Burns motion zoom and word-by-word dynamic kinetic captions.
              </p>
            </div>
            <button
              onClick={onExecutePipeline}
              disabled={isExecuting}
              className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-500/20 flex items-center gap-2"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>Execute Full Pipeline Test</span>
            </button>
          </div>

          {/* Render Player Component */}
          <VerticalShortPlayer
            storyTitle={selectedStory?.title || "Reddit Story"}
            scriptText={editedPauseScript || scriptResult?.raw_script || ""}
            wordTimestamps={wordTimestamps}
            sceneFrames={sceneFrames}
            colorProfiles={colorProfiles}
            selectedProfileIndex={config.selectedColorProfileIndex}
            onSelectProfileIndex={(idx) => onChangeConfig({ ...config, selectedColorProfileIndex: idx })}
          />
        </div>
      )}
    </div>
  );
};
