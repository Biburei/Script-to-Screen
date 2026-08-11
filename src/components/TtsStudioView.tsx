import React, { useState } from 'react';
import { Volume2, Play, Pause, Sparkles, Sliders, CheckCircle2, ArrowRight, Radio, Mic, Activity } from 'lucide-react';
import { VoicePreset, ScriptResult } from '../types';
import { KOKORO_VOICES } from '../data/voices';

interface TtsStudioViewProps {
  scriptResult: ScriptResult | null;
  selectedVoice: string;
  onSelectVoice: (voiceId: string) => void;
  onNavigateTab: (tab: string) => void;
}

export const TtsStudioView: React.FC<TtsStudioViewProps> = ({
  scriptResult,
  selectedVoice,
  onSelectVoice,
  onNavigateTab
}) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [speechRate, setSpeechRate] = useState<number>(1.05);
  const [speechPitch, setSpeechPitch] = useState<number>(0.95);

  const activeVoicePreset = KOKORO_VOICES.find(v => v.id === selectedVoice) || KOKORO_VOICES[0];

  const handlePlayPreview = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();

      if (isPlaying) {
        setIsPlaying(false);
        return;
      }

      // Strip pause tags for Web Speech API preview
      const cleanText = text.replace(/\[PAUSE=[\d.]+\]/g, ' ... ');
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.rate = speechRate;
      utterance.pitch = speechPitch;

      utterance.onend = () => setIsPlaying(false);
      utterance.onerror = () => setIsPlaying(false);

      setIsPlaying(true);
      window.speechSynthesis.speak(utterance);
    } else {
      alert("Web Speech API preview not supported in this browser environment.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-display font-bold text-white flex items-center gap-2">
            <Volume2 className="w-6 h-6 text-cyan-400" />
            <span>Kokoro 24kHz TTS Speech Synthesis Studio</span>
          </h1>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Audition high-retention narration voices with breathing pause tag pacing ([PAUSE=1.0s], [PAUSE=0.5s]).
          </p>
        </div>

        <button
          onClick={() => handlePlayPreview(scriptResult?.script_with_pauses || activeVoicePreset.sampleText)}
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-700 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-cyan-950 hover:from-cyan-500 hover:to-blue-600 transition-all cursor-pointer"
        >
          {isPlaying ? <Pause className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white" />}
          <span>{isPlaying ? 'Stop Audio Preview' : 'Audition Voice Narration'}</span>
        </button>
      </div>

      {/* Main Grid: Voice Selection Pool & Audio Parameters */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Voice Selection Pool */}
        <div className="lg:col-span-7 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <span className="text-xs font-mono font-bold text-slate-200 flex items-center gap-1.5">
              <Mic className="w-4 h-4 text-cyan-400" />
              <span>Kokoro Voice Presets ({KOKORO_VOICES.length} Voices)</span>
            </span>
            <span className="text-[11px] font-mono text-slate-400">24,000 Hz Native Quality</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[460px] overflow-y-auto pr-1 no-scrollbar">
            {KOKORO_VOICES.map(voice => {
              const isSelected = selectedVoice === voice.id;
              return (
                <div
                  key={voice.id}
                  onClick={() => onSelectVoice(voice.id)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer space-y-2 ${
                    isSelected
                      ? 'bg-cyan-950/40 border-cyan-500/80 ring-1 ring-cyan-500/50 shadow-md shadow-cyan-950'
                      : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-white flex items-center gap-1.5">
                      {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />}
                      {voice.name}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                      {voice.accent} {voice.gender}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-400 italic line-clamp-2 leading-relaxed">
                    "{voice.sampleText}"
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Audio Tuning & Pause Tag Inspector */}
        <div className="lg:col-span-5 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-5 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="text-xs font-mono font-bold text-slate-200 flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-amber-400" />
                <span>Pacing & Acoustic Controls</span>
              </span>
              <span className="text-xs font-mono text-cyan-400 font-bold">{activeVoicePreset.id}</span>
            </div>

            {/* Sliders */}
            <div className="space-y-4 bg-slate-950 p-4 rounded-xl border border-slate-800">
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-mono text-slate-300">
                  <span>Speech Rate (Pacing)</span>
                  <span className="text-cyan-400">{speechRate}x</span>
                </div>
                <input
                  type="range"
                  min="0.8"
                  max="1.3"
                  step="0.05"
                  value={speechRate}
                  onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
                  className="w-full accent-cyan-500 cursor-pointer"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-mono text-slate-300">
                  <span>Voice Pitch / Gravity</span>
                  <span className="text-cyan-400">{speechPitch}x</span>
                </div>
                <input
                  type="range"
                  min="0.7"
                  max="1.2"
                  step="0.05"
                  value={speechPitch}
                  onChange={(e) => setSpeechPitch(parseFloat(e.target.value))}
                  className="w-full accent-cyan-500 cursor-pointer"
                />
              </div>
            </div>

            {/* Pause Tag Inspector */}
            <div className="space-y-2">
              <span className="text-xs font-mono text-slate-400 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-cyan-400" />
                <span>Kokoro Breathing Pause Tag Ingestion:</span>
              </span>

              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 font-mono text-xs text-slate-300 space-y-2 leading-relaxed">
                <div className="flex items-center justify-between text-[11px] text-slate-400 border-b border-slate-800 pb-1.5">
                  <span>[PAUSE=1.0s] Paragraph Gap</span>
                  <span className="text-emerald-400 font-bold">1,000 ms</span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>[PAUSE=0.5s] Ellipsis / Dash Gap</span>
                  <span className="text-emerald-400 font-bold">500 ms</span>
                </div>
              </div>
            </div>
          </div>

          {/* Forward Action Button */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-400 font-mono">Next: Visual storyboard generation</span>
            <button
              onClick={() => onNavigateTab('storyboard')}
              className="px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 hover:bg-slate-700 transition-all cursor-pointer"
            >
              <span>Art Director Studio</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
