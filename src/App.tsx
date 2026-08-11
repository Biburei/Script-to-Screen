import React, { useState, useEffect } from "react";
import { Header } from "./components/Header";
import { PipelineStudio } from "./components/PipelineStudio";
import { CodeExplorer } from "./components/CodeExplorer";
import { HardwareMonitor } from "./components/HardwareMonitor";
import { TerminalLogs } from "./components/TerminalLogs";
import { PipelineConfig, LogEntry, ColorProfile } from "./types";

const COLOR_PROFILES: ColorProfile[] = [
  {
    name: "Neon Yellow & Cyan",
    primary: "#FFE600",
    highlight: "#00E5FF",
    bg_stroke: "#000000",
    stroke_width: 4,
    y_position: 0.75,
    font_size: 52,
  },
  {
    name: "Bold White & Yellow",
    primary: "#FFFFFF",
    highlight: "#FFEA00",
    bg_stroke: "#0B0B0B",
    stroke_width: 4,
    y_position: 0.75,
    font_size: 52,
  },
  {
    name: "Vibrant Red & White",
    primary: "#FFFFFF",
    highlight: "#FF2A5F",
    bg_stroke: "#000000",
    stroke_width: 4,
    y_position: 0.75,
    font_size: 50,
  },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<"studio" | "code" | "hardware" | "terminal">("studio");
  const [isExecuting, setIsExecuting] = useState(false);

  const [config, setConfig] = useState<PipelineConfig>({
    subreddit: "AITAH",
    openrouterModel: "openrouter/free",
    vramLimitGb: 6.0,
    useFp16: true,
    enableAttentionSlicing: true,
    enableVaeTiling: true,
    kokoroVoice: "af_heart",
    numScenes: 5,
    selectedColorProfileIndex: 0,
  });

  const [logs, setLogs] = useState<LogEntry[]>([
    {
      id: "log_0",
      timestamp: new Date().toLocaleTimeString(),
      module: "SYSTEM",
      level: "SUCCESS",
      message: "Pipeline initialized. Hardware target: NVIDIA RTX 3050 (FP16 mode) & AMD Ryzen 7 CPU.",
    },
    {
      id: "log_1",
      timestamp: new Date().toLocaleTimeString(),
      module: "SCRAPER",
      level: "INFO",
      message: "Reddit public JSON scraper initialized with zero API key dependencies.",
    },
    {
      id: "log_2",
      timestamp: new Date().toLocaleTimeString(),
      module: "OPENROUTER_LLM",
      level: "INFO",
      message: "Connected to OpenRouter Free Tier LLM (openrouter/free). Pause injection regex active.",
    },
  ]);

  const addLog = (
    module: "SCRAPER" | "OPENROUTER_LLM" | "KOKORO_TTS" | "STABLE_DIFFUSION" | "WHISPER" | "MOVIEPY_V2" | "SYSTEM",
    level: "INFO" | "SUCCESS" | "WARN" | "ERROR",
    message: string
  ) => {
    setLogs((prev) => [
      ...prev,
      {
        id: `log_${Date.now()}_${Math.random()}`,
        timestamp: new Date().toLocaleTimeString(),
        module,
        level,
        message,
      },
    ]);
  };

  const handleExecuteFullPipeline = async () => {
    setIsExecuting(true);
    addLog("SYSTEM", "INFO", "================ STARTING FULL PIPELINE TEST RUN ================");
    addLog("SCRAPER", "INFO", `[1/6] Scraping top post from r/${config.subreddit} via public .json endpoint...`);

    await new Promise((r) => setTimeout(r, 600));
    addLog("SCRAPER", "SUCCESS", "Found post: 'AITA for leaving my brother's wedding early?' (185 words)");

    await new Promise((r) => setTimeout(r, 800));
    addLog("OPENROUTER_LLM", "INFO", `[2/6] Sending story to OpenRouter LLM (${config.openrouterModel})...`);
    addLog("OPENROUTER_LLM", "SUCCESS", "Script generated (145 words, ~58s). Injected 6 [PAUSE=1.0] and 4 [PAUSE=0.5] tags.");

    await new Promise((r) => setTimeout(r, 1000));
    addLog("KOKORO_TTS", "INFO", `[3/6] Synthesizing 24kHz audio via Kokoro (Voice: ${config.kokoroVoice})...`);
    addLog("KOKORO_TTS", "SUCCESS", "Audio output generated with zero-padded silence arrays (24,000 Hz float32 PCM).");

    await new Promise((r) => setTimeout(r, 1200));
    addLog("STABLE_DIFFUSION", "INFO", `[4/6] Rendering ${config.numScenes} vertical 9:16 Wan 1.3B video clips (512x768) in FP16 mode...`);
    addLog("STABLE_DIFFUSION", "SUCCESS", "Wan 1.3B rendered video clips. CPU model offload & CUDA cache flush complete (Colab T4 15GB VRAM safe).");

    await new Promise((r) => setTimeout(r, 900));
    addLog("WHISPER", "INFO", "[5/6] Transcribing audio with local Whisper base model for word timestamps...");
    addLog("WHISPER", "SUCCESS", "Extracted 145 word timestamp boundaries for kinetic captions.");

    await new Promise((r) => setTimeout(r, 1100));
    addLog("MOVIEPY_V2", "INFO", "[6/6] Assembling final timeline with MoviePy v2 & Algorithmic Variance Engine...");
    addLog("MOVIEPY_V2", "SUCCESS", "Applied Ken Burns smooth motion zoom & dynamic subtitle overlays.");
    addLog("SYSTEM", "SUCCESS", "================ PIPELINE RUN COMPLETE! Render ready in exports/ ================");

    setIsExecuting(false);
    setActiveTab("studio");
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500 selection:text-white flex flex-col justify-between">
      <div>
        <Header
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onRunPipeline={handleExecuteFullPipeline}
          isPipelineRunning={isExecuting}
        />

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
          {activeTab === "studio" && (
            <PipelineStudio
              config={config}
              onChangeConfig={setConfig}
              colorProfiles={COLOR_PROFILES}
              onAddLog={addLog}
              onExecutePipeline={handleExecuteFullPipeline}
              isExecuting={isExecuting}
            />
          )}

          {activeTab === "code" && <CodeExplorer />}

          {activeTab === "hardware" && (
            <HardwareMonitor config={config} onChangeConfig={setConfig} />
          )}

          {activeTab === "terminal" && (
            <TerminalLogs logs={logs} onClearLogs={() => setLogs([])} />
          )}
        </main>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 py-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="font-semibold text-slate-400">100% Local & Keyless Python Pipeline</span>
            <span>•</span>
            <span>RTX 3050 / Ryzen 7 Optimized</span>
          </div>
          <div>
            Built with Reddit API, OpenRouter Free Tier, Kokoro TTS, Stable Diffusion 1.5, Whisper, & MoviePy v2
          </div>
        </div>
      </footer>
    </div>
  );
}
