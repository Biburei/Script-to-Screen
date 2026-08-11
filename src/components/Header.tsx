import React from "react";
import { Cpu, Film, Code, HardDrive, Terminal, Zap, ShieldCheck } from "lucide-react";

interface HeaderProps {
  activeTab: "studio" | "code" | "hardware" | "terminal";
  setActiveTab: (tab: "studio" | "code" | "hardware" | "terminal") => void;
  onRunPipeline: () => void;
  isPipelineRunning: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onRunPipeline,
  isPipelineRunning,
}) => {
  return (
    <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Identity */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 via-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Film className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-lg font-bold text-white tracking-tight">AutoShorts Studio</h1>
                <span className="px-2 py-0.5 text-xs font-semibold bg-cyan-950 text-cyan-400 border border-cyan-800/60 rounded-full flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-cyan-400" /> Keyless & Local
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Reddit Stories → OpenRouter LLM → Kokoro TTS → SD1.5 → Whisper → MoviePy v2
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="hidden md:flex items-center space-x-1 bg-slate-950/70 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTab("studio")}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === "studio"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Pipeline Studio</span>
            </button>

            <button
              onClick={() => setActiveTab("code")}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === "code"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              }`}
            >
              <Code className="w-3.5 h-3.5" />
              <span>Python Codebase</span>
            </button>

            <button
              onClick={() => setActiveTab("hardware")}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === "hardware"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>Hardware & VRAM</span>
            </button>

            <button
              onClick={() => setActiveTab("terminal")}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === "terminal"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>Live Console</span>
            </button>
          </nav>

          {/* Hardware Badge & Quick Execute Button */}
          <div className="flex items-center space-x-3">
            <div className="hidden lg:flex items-center space-x-2 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 text-xs">
              <HardDrive className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-slate-400">Target GPU:</span>
              <span className="font-mono text-emerald-400 font-semibold">RTX 3050 (FP16)</span>
            </div>

            <button
              onClick={onRunPipeline}
              disabled={isPipelineRunning}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-lg ${
                isPipelineRunning
                  ? "bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700"
                  : "bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white shadow-emerald-500/20 active:scale-95"
              }`}
            >
              <Zap className={`w-4 h-4 ${isPipelineRunning ? "animate-spin" : ""}`} />
              <span>{isPipelineRunning ? "Processing Pipeline..." : "Execute Full Pipeline"}</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
