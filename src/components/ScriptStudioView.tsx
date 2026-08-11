import React, { useState } from 'react';
import { Sparkles, FileText, CheckCircle2, Clock, Volume2, ArrowRight, RefreshCw, Wand2, MessageSquare, AlertTriangle } from 'lucide-react';
import { Story, ScriptResult } from '../types';

interface ScriptStudioViewProps {
  selectedStory: Story;
  scriptResult: ScriptResult | null;
  onRewriteScript: (title: string, body: string, part: number) => Promise<void>;
  onNavigateTab: (tab: string) => void;
  isProcessing: boolean;
}

export const ScriptStudioView: React.FC<ScriptStudioViewProps> = ({
  selectedStory,
  scriptResult,
  onRewriteScript,
  onNavigateTab,
  isProcessing
}) => {
  const [customTitle, setCustomTitle] = useState(selectedStory?.title || '');
  const [customBody, setCustomBody] = useState(selectedStory?.body || '');
  const [selectedHook, setSelectedHook] = useState('Cosmic / Unnoticed Infiltration');

  const goldHooks = [
    { name: 'Cosmic / Unnoticed Infiltration', example: '"Like the brief doomed flare of exploding suns... the horror passed almost unnoticed."' },
    { name: 'Timeline of Dread', example: '"The terror which would not end for another 28 years began with a newspaper boat floating down a gutter."' },
    { name: 'Sudden Physical Jump-Scare', example: '"Norman Bates heard the noise and a shock went through him."' },
    { name: 'Absolute Truth / Ominous Fact', example: '"Because, as everyone knows, when death comes, it comes in darkness."' },
    { name: 'Abrupt Body Horror / Shift', example: '"As Gregor Samsa awoke one morning, he found himself transformed in his bed."' },
    { name: 'Environmental Warning', example: '"ABANDON ALL HOPE YE WHO ENTER HERE is scrawled in blood red lettering."' },
    { name: 'Foreboding Setup', example: '"Louis Creed, who had lost his father at three, came to Ludlow with his family."' },
  ];

  const handleRewrite = () => {
    onRewriteScript(customTitle || selectedStory?.title, customBody || selectedStory?.body, selectedStory?.part || 1);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-display font-bold text-white flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-amber-400" />
            <span>2-Stage LLM Script Generation Studio</span>
          </h1>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Transforms raw creepypastas into 180-210 word high-retention 1st-person scripts with Kokoro TTS pause tags.
          </p>
        </div>

        <button
          onClick={handleRewrite}
          disabled={isProcessing}
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-red-800 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-red-950 hover:from-red-500 hover:to-red-700 transition-all cursor-pointer disabled:opacity-50"
        >
          {isProcessing ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Generating Script...</span>
            </>
          ) : (
            <>
              <Wand2 className="w-4 h-4" />
              <span>Generate 180-210 Word Script</span>
            </>
          )}
        </button>
      </div>

      {/* Few-Shot Gold Standard Hook Selector */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono text-amber-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Stage 1: Few-Shot Gold Standard Hook Strategy</span>
          </span>
          <span className="text-[11px] font-mono text-slate-400">7 Viral Narrative Hooks</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {goldHooks.map((hook, i) => (
            <div
              key={i}
              onClick={() => setSelectedHook(hook.name)}
              className={`p-3 rounded-xl border transition-all cursor-pointer text-xs space-y-1 ${
                selectedHook === hook.name
                  ? 'bg-red-950/50 border-red-500/80 text-white shadow-sm shadow-red-950'
                  : 'bg-slate-950/60 border-slate-800/80 text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="font-semibold text-slate-200">{hook.name}</div>
              <p className="text-[10px] italic text-slate-400 truncate">{hook.example}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Main Grid: Left Source Story Input, Right Generated Polished Script */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Source Text Input */}
        <div className="lg:col-span-6 bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <span className="text-xs font-mono font-bold text-slate-300 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-slate-400" />
              <span>Raw Source Material</span>
            </span>
            <span className="text-xs font-mono text-slate-500">
              {customBody.split(/\s+/).filter(Boolean).length} Words
            </span>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-[11px] font-mono text-slate-400 mb-1">Story Title</label>
              <input
                type="text"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-red-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono text-slate-400 mb-1">Source Story Text</label>
              <textarea
                rows={12}
                value={customBody}
                onChange={(e) => setCustomBody(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs font-sans text-slate-300 leading-relaxed focus:outline-none focus:border-red-500 resize-none font-normal"
              />
            </div>
          </div>
        </div>

        {/* Polished Script Output */}
        <div className="lg:col-span-6 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="text-xs font-mono font-bold text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Stage 2: Polished Script & Kokoro Pause Tags</span>
              </span>

              {scriptResult && (
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold ${
                    scriptResult.word_count >= 180 && scriptResult.word_count <= 210
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      : 'bg-amber-950 text-amber-300 border border-amber-800'
                  }`}>
                    {scriptResult.word_count} Words (Target 180-210)
                  </span>
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[11px] font-mono flex items-center gap-1">
                    <Clock className="w-3 h-3 text-cyan-400" />
                    ~{scriptResult.estimated_duration}s
                  </span>
                </div>
              )}
            </div>

            {scriptResult ? (
              <div className="space-y-4 mt-4">
                {/* Script Display */}
                <div className="bg-slate-950 rounded-xl p-4 border border-slate-800 text-xs font-mono text-slate-200 leading-relaxed min-h-[220px] whitespace-pre-wrap">
                  {scriptResult.script_with_pauses}
                </div>

                {/* Word Count Indicator Bar */}
                <div className="space-y-1 font-mono text-[11px]">
                  <div className="flex justify-between text-slate-400">
                    <span>Target Word Count Range (180 - 210 words)</span>
                    <span className="text-white font-bold">{scriptResult.word_count} words</span>
                  </div>
                  <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                    <div
                      className={`h-full transition-all ${
                        scriptResult.word_count >= 180 && scriptResult.word_count <= 210
                          ? 'bg-emerald-500'
                          : 'bg-amber-500'
                      }`}
                      style={{ width: `${Math.min(100, (scriptResult.word_count / 210) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-64 flex flex-col items-center justify-center text-slate-500 italic space-y-2 text-xs">
                <Wand2 className="w-8 h-8 text-slate-700 animate-pulse" />
                <p>Click "Generate 180-210 Word Script" above to run the 2-stage rewrite.</p>
              </div>
            )}
          </div>

          {/* Forward Action Button */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-400 font-mono">Next: Synthesize speech audio in TTS Studio</span>
            <button
              onClick={() => onNavigateTab('tts')}
              className="px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 hover:bg-slate-700 transition-all cursor-pointer"
            >
              <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
              <span>Proceed to TTS Studio</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
