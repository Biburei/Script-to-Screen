import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Download, Sparkles, Sliders, Palette, Volume2, Film, Check } from 'lucide-react';
import { Story, ScriptResult, ColorProfile } from '../types';
import { COLOR_PROFILES } from '../data/colorProfiles';

interface VideoPlayerViewProps {
  selectedStory: Story;
  scriptResult: ScriptResult | null;
  selectedVoice: string;
}

export const VideoPlayerView: React.FC<VideoPlayerViewProps> = ({
  selectedStory,
  scriptResult,
  selectedVoice
}) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentWordIndex, setCurrentWordIndex] = useState<number>(0);
  const [activeFrameIndex, setActiveFrameIndex] = useState<number>(0);
  const [selectedColorProfile, setSelectedColorProfile] = useState<ColorProfile>(COLOR_PROFILES[0]);
  const [fontSize, setFontSize] = useState<number>(COLOR_PROFILES[0].font_size);
  const [yPosition, setYPosition] = useState<number>(COLOR_PROFILES[0].y_position);

  const images = selectedStory?.assets && selectedStory.assets.length > 0
    ? selectedStory.assets
    : Array.from({ length: 10 }, (_, i) => `/temp/assets_${encodeURIComponent(selectedStory?.id || 'temp')}/scene_${i + 1}.png`);

  const rawText = scriptResult?.raw_script || selectedStory?.body.slice(0, 300) || "I couldn't believe my eyes when I walked into the dark hallway.";
  const words = rawText.split(/\s+/).filter(Boolean);

  // Playback timer loop
  useEffect(() => {
    let interval: any;
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentWordIndex((prev) => {
          const next = prev + 1;
          if (next >= words.length) {
            setIsPlaying(false);
            return 0;
          }
          // Cycle frame every ~15 words
          setActiveFrameIndex(Math.floor((next / words.length) * images.length) % images.length);
          return next;
        });
      }, 300); // ~200 WPM pacing
    }
    return () => clearInterval(interval);
  }, [isPlaying, words.length, images.length]);

  const togglePlay = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      if (!isPlaying) {
        const cleanText = rawText.replace(/\[PAUSE=[\d.]+\]/g, ' ... ');
        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.rate = 1.05;
        utterance.onend = () => setIsPlaying(false);
        utterance.onerror = () => setIsPlaying(false);
        window.speechSynthesis.speak(utterance);
      }
    }
    setIsPlaying(!isPlaying);
  };

  const handleRestart = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsPlaying(false);
    setCurrentWordIndex(0);
    setActiveFrameIndex(0);
  };

  // Slice 3 words around current word for kinetic subtitle block
  const visibleWordsStart = Math.max(0, currentWordIndex - 1);
  const visibleWords = words.slice(visibleWordsStart, visibleWordsStart + 3);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-display font-bold text-white flex items-center gap-2">
            <Film className="w-6 h-6 text-red-500" />
            <span>MoviePy v2 Short Video Renderer & Subtitle Studio</span>
          </h1>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Real-time preview of 9:16 vertical short video with kinetic word highlight subtitles.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleRestart}
            className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 text-xs font-mono flex items-center gap-1.5 hover:bg-slate-800 transition-all cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Playhead</span>
          </button>

          <button
            onClick={() => alert(`Exporting Short Video MP4 for "${selectedStory?.title}"...`)}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-red-600 to-red-800 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-red-950 hover:from-red-500 hover:to-red-700 transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Export MP4 Short</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Left 9:16 Phone Player, Right Subtitle Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* 9:16 Vertical Video Phone Frame Player */}
        <div className="lg:col-span-5 flex justify-center">
          <div className="w-[320px] sm:w-[360px] aspect-[9/16] bg-black rounded-[36px] p-3 border-4 border-slate-800 shadow-2xl shadow-red-950/40 relative overflow-hidden flex flex-col justify-between">
            {/* Top Speaker / Camera Notch Bar */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 w-28 h-4 bg-slate-900 rounded-full z-30 border border-slate-800"></div>

            {/* Active Scene Frame Image Background */}
            <div className="absolute inset-0 z-0">
              <img
                src={images[activeFrameIndex % images.length]}
                alt="Active Frame"
                className="w-full h-full object-cover transition-all duration-700 filter brightness-90"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
              <div className="w-full h-full bg-gradient-to-t from-black/90 via-black/20 to-black/60 absolute inset-0"></div>
            </div>

            {/* Top Overlay Meta */}
            <div className="relative z-20 pt-8 px-4 flex items-center justify-between text-[11px] font-mono text-white/90">
              <span className="px-2 py-0.5 rounded bg-black/60 backdrop-blur-md border border-white/20">
                Part {selectedStory?.part || 1}
              </span>
              <span className="px-2 py-0.5 rounded bg-red-950/80 backdrop-blur-md text-red-300 border border-red-800/60 font-bold">
                Frame #{activeFrameIndex + 1}/{images.length}
              </span>
            </div>

            {/* Kinetic Subtitles Layer */}
            <div
              className="relative z-20 px-6 text-center transition-all pointer-events-none"
              style={{
                position: 'absolute',
                top: `${yPosition * 100}%`,
                left: 0,
                right: 0,
                transform: 'translateY(-50%)'
              }}
            >
              <div className="flex flex-wrap items-center justify-center gap-2 uppercase tracking-wide font-black"
                style={{
                  fontSize: `${fontSize * 0.55}px`,
                  fontFamily: 'Inter, sans-serif'
                }}
              >
                {visibleWords.map((word, idx) => {
                  const absoluteIdx = visibleWordsStart + idx;
                  const isHighlighted = absoluteIdx === currentWordIndex;
                  return (
                    <span
                      key={idx}
                      className="px-1.5 py-0.5 rounded transition-transform"
                      style={{
                        color: isHighlighted ? selectedColorProfile.highlight : selectedColorProfile.primary,
                        textShadow: `-2px -2px 0 ${selectedColorProfile.bg_stroke}, 2px -2px 0 ${selectedColorProfile.bg_stroke}, -2px 2px 0 ${selectedColorProfile.bg_stroke}, 2px 2px 0 ${selectedColorProfile.bg_stroke}, 0 4px 10px rgba(0,0,0,0.9)`,
                        transform: isHighlighted ? 'scale(1.15)' : 'scale(1.0)'
                      }}
                    >
                      {word}
                    </span>
                  );
                })}
              </div>
            </div>

            {/* Bottom Controls Bar */}
            <div className="relative z-20 pb-4 px-4 flex items-center justify-between border-t border-white/10 pt-3 backdrop-blur-md bg-black/40 rounded-b-[28px]">
              <button
                onClick={togglePlay}
                className="w-10 h-10 rounded-full bg-red-600 text-white flex items-center justify-center shadow-lg shadow-red-950 hover:bg-red-500 transition-all cursor-pointer"
              >
                {isPlaying ? <Pause className="w-5 h-5 fill-white" /> : <Play className="w-5 h-5 fill-white ml-0.5" />}
              </button>

              <div className="text-right text-[11px] font-mono text-white/90">
                <div className="font-bold truncate max-w-[160px]">"{selectedStory?.title}"</div>
                <div className="text-slate-400 text-[10px]">Kokoro {selectedVoice} • 24kHz</div>
              </div>
            </div>
          </div>
        </div>

        {/* Subtitle Styling & Controls */}
        <div className="lg:col-span-7 bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-6">
          <div className="border-b border-slate-800 pb-4">
            <h2 className="text-lg font-display font-bold text-white flex items-center gap-2">
              <Palette className="w-5 h-5 text-amber-400" />
              <span>Algorithmic Variance & Color Profiles</span>
            </h2>
            <p className="text-xs text-slate-400 font-mono mt-1">
              Select subtitle color palettes and vertical positioning on the 9:16 canvas.
            </p>
          </div>

          {/* Color Profiles Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {COLOR_PROFILES.map((profile) => {
              const isSelected = selectedColorProfile.name === profile.name;
              return (
                <div
                  key={profile.name}
                  onClick={() => {
                    setSelectedColorProfile(profile);
                    setFontSize(profile.font_size);
                    setYPosition(profile.y_position);
                  }}
                  className={`p-4 rounded-xl border transition-all cursor-pointer space-y-2 ${
                    isSelected
                      ? 'bg-red-950/40 border-red-500/80 ring-1 ring-red-500 shadow-md shadow-red-950'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-bold text-white">
                    <span>{profile.name}</span>
                    {isSelected && <Check className="w-4 h-4 text-red-400" />}
                  </div>

                  {/* Palette Sample */}
                  <div className="flex items-center gap-1.5 pt-1">
                    <span className="w-4 h-4 rounded-full border border-black/40" style={{ backgroundColor: profile.primary }}></span>
                    <span className="w-4 h-4 rounded-full border border-black/40" style={{ backgroundColor: profile.highlight }}></span>
                    <span className="w-4 h-4 rounded-full border border-black/40" style={{ backgroundColor: profile.bg_stroke }}></span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Positioning Sliders */}
          <div className="space-y-4 bg-slate-950 p-4 rounded-xl border border-slate-800">
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono text-slate-300">
                <span>Vertical Canvas Position (y_position)</span>
                <span className="text-red-400 font-bold">{(yPosition * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min="0.60"
                max="0.88"
                step="0.01"
                value={yPosition}
                onChange={(e) => setYPosition(parseFloat(e.target.value))}
                className="w-full accent-red-500 cursor-pointer"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono text-slate-300">
                <span>Subtitle Font Size</span>
                <span className="text-red-400 font-bold">{fontSize}px</span>
              </div>
              <input
                type="range"
                min="38"
                max="60"
                step="1"
                value={fontSize}
                onChange={(e) => setFontSize(parseInt(e.target.value, 10))}
                className="w-full accent-red-500 cursor-pointer"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
