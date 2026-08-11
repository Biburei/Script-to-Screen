import React, { useState } from 'react';
import { Play, CheckCircle2, AlertCircle, Sparkles, Film, Database, Cpu, ShieldCheck, Terminal, ArrowRight, RefreshCw } from 'lucide-react';
import { PipelineState, Story } from '../types';

interface DashboardViewProps {
  pipelineState: PipelineState;
  stories: Story[];
  selectedStory: Story;
  onSelectStory: (story: Story) => void;
  onNavigateTab: (tab: string) => void;
  onRunPipeline: () => Promise<void>;
  pipelineLogs: string[];
  isProcessing: boolean;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  pipelineState,
  stories,
  selectedStory,
  onSelectStory,
  onNavigateTab,
  onRunPipeline,
  pipelineLogs,
  isProcessing
}) => {
  const [activeStage, setActiveStage] = useState<number>(0);

  const stages = [
    { title: 'Excel Dataset Engine', desc: 'Pulling from 3,510 archival stories', status: 'ready' },
    { title: '2-Stage LLM Rewrite', desc: 'Gold Standard hooks (180-210 words)', status: 'ready' },
    { title: 'Kokoro 24kHz TTS', desc: 'Breathing pause tag injection', status: 'ready' },
    { title: 'SD 9:16 Art Director', desc: 'Category visual style blueprint', status: 'ready' },
    { title: 'Whisper Caption Align', desc: 'Word-level timestamp mapping', status: 'ready' },
    { title: 'MoviePy Short Render', desc: 'Kinetic subtitles & variance', status: 'ready' },
  ];

  return (
    <div className="space-y-8">
      {/* Hero Banner */}
      <div className="relative rounded-2xl bg-gradient-to-r from-red-950 via-slate-900 to-slate-950 border border-red-900/40 p-6 sm:p-8 overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-red-600/10 rounded-full blur-3xl -z-0 pointer-events-none"></div>
        <div className="relative z-10 space-y-4 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-950/80 border border-red-800/60 text-red-300 text-xs font-mono">
            <ShieldCheck className="w-3.5 h-3.5 text-red-400" />
            <span>NVIDIA RTX 3050 & AMD Ryzen 7 Optimized (FP16 VRAM Protection)</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-display font-black tracking-wide text-white leading-tight">
            Archival Creepypasta Shorts Automation Pipeline
          </h1>
          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
            Fully automated end-to-end pipeline generating viral 9:16 dark horror shorts.
            Incorporate local Excel dataset scraping, Few-Shot Gold Standard scriptwriting, Kokoro TTS pacing, Stable Diffusion artboards, and kinetic subtitle rendering.
          </p>

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              id="run-pipeline-btn"
              onClick={onRunPipeline}
              disabled={isProcessing}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-red-600 to-red-800 text-white font-semibold text-sm shadow-lg shadow-red-950 hover:from-red-500 hover:to-red-700 transition-all disabled:opacity-50 cursor-pointer"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Processing Short Video...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-white" />
                  <span>Run Automated Pipeline</span>
                </>
              )}
            </button>

            <button
              id="browse-dataset-btn"
              onClick={() => onNavigateTab('explorer')}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 text-sm font-medium hover:bg-slate-800 transition-all cursor-pointer"
            >
              <Database className="w-4 h-4 text-slate-400" />
              <span>Browse 3,510 Stories</span>
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
            <span>SEQUENCE INDEX</span>
            <Database className="w-4 h-4 text-red-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white">
            #{pipelineState.current_index} <span className="text-sm font-normal text-slate-400">/ {pipelineState.total_stories}</span>
          </div>
          <p className="text-xs text-slate-400 truncate">Current Story: <span className="text-red-300 font-medium">{pipelineState.current_story_id}</span></p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
            <span>TARGET LLM MODEL</span>
            <Sparkles className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-300">
            Gemini 2.5
          </div>
          <p className="text-xs text-slate-400">180-210 word target length scriptwriter</p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
            <span>VOICE ENGINE</span>
            <Film className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-cyan-300">
            Kokoro 24kHz
          </div>
          <p className="text-xs text-slate-400">Breathing pause tag [PAUSE=0.5s] injection</p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
            <span>HARDWARE PROFILE</span>
            <Cpu className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-300">
            RTX 3050 FP16
          </div>
          <p className="text-xs text-slate-400">Attention slicing & VAE tiling enabled</p>
        </div>
      </div>

      {/* Pipeline Architecture Stage Tracker */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-display font-bold text-white flex items-center gap-2">
            <Film className="w-5 h-5 text-red-500" />
            <span>6-Stage Execution Pipeline Architecture</span>
          </h2>
          <span className="text-xs font-mono text-slate-400 bg-slate-800 px-2.5 py-1 rounded">
            Auto Sequential Run Mode
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {stages.map((stage, idx) => (
            <div
              key={idx}
              className={`p-4 rounded-xl border transition-all ${
                isProcessing && activeStage === idx
                  ? 'bg-red-950/40 border-red-500/60 ring-1 ring-red-500'
                  : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="w-6 h-6 rounded-full bg-slate-800 text-xs font-mono font-bold flex items-center justify-center text-slate-300">
                  0{idx + 1}
                </span>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </div>
              <h3 className="font-semibold text-sm text-slate-200">{stage.title}</h3>
              <p className="text-xs text-slate-400 mt-1">{stage.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Live Terminal Audit Logs */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 space-y-4 font-mono text-xs">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2 text-slate-300">
            <Terminal className="w-4 h-4 text-red-400" />
            <span className="font-bold">Pipeline Execution Audit Terminal</span>
          </div>
          <span className="text-slate-500">main.py --excel-path data/creepypastas.xlsx</span>
        </div>

        <div className="bg-black/60 rounded-xl p-4 h-48 overflow-y-auto space-y-1 text-slate-300 leading-relaxed font-mono">
          {pipelineLogs.length > 0 ? (
            pipelineLogs.map((log, i) => (
              <div key={i} className={log.includes('SUCCESS') ? 'text-emerald-400 font-semibold' : log.includes('STEP') ? 'text-red-400 font-bold' : ''}>
                {log}
              </div>
            ))
          ) : (
            <div className="text-slate-500 italic">
              Ready to execute. Click "Run Automated Pipeline" above to run story #{pipelineState.current_index} ("{selectedStory?.title || 'Selected Story'}").
            </div>
          )}
        </div>
      </div>

      {/* Stories Ready for Preview */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-display font-bold text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <span>Pre-Rendered Storyboard Library ({stories.filter(s => s.has_pre_rendered_assets).length} Stories)</span>
          </h2>
          <button
            onClick={() => onNavigateTab('explorer')}
            className="text-xs font-mono text-red-400 hover:text-red-300 flex items-center gap-1 cursor-pointer"
          >
            <span>View All Stories</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stories.slice(0, 4).map((story) => (
            <div
              key={story.id}
              onClick={() => {
                onSelectStory(story);
                onNavigateTab('storyboard');
              }}
              className="group bg-slate-900 border border-slate-800 rounded-xl p-4 hover:border-red-600/50 transition-all cursor-pointer space-y-3"
            >
              <div className="aspect-[9/16] bg-slate-950 rounded-lg overflow-hidden relative border border-slate-800/80">
                {story.assets && story.assets.length > 0 ? (
                  <img
                    src={story.assets[0]}
                    alt={story.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-600 font-mono text-xs">
                    9:16 Vertical Scene
                  </div>
                )}
                <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/80 backdrop-blur-md text-[10px] font-mono text-red-300 border border-red-900/50">
                  {story.genre}
                </div>
              </div>

              <div>
                <h3 className="font-bold text-sm text-white group-hover:text-red-400 transition-colors line-clamp-1">
                  {story.title}
                </h3>
                <p className="text-xs text-slate-400 line-clamp-2 mt-1">
                  {story.body}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
