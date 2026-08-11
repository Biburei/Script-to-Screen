import React, { useState, useEffect, useRef } from "react";
import { Play, Pause, RotateCcw, Volume2, VolumeX, Sparkles, Sliders, Check, Download } from "lucide-react";
import { WordTimestamp, SDSceneFrame, ColorProfile } from "../types";

interface VerticalShortPlayerProps {
  storyTitle: string;
  scriptText: string;
  wordTimestamps: WordTimestamp[];
  sceneFrames: SDSceneFrame[];
  colorProfiles: ColorProfile[];
  selectedProfileIndex: number;
  onSelectProfileIndex: (idx: number) => void;
}

export const VerticalShortPlayer: React.FC<VerticalShortPlayerProps> = ({
  storyTitle,
  scriptText,
  wordTimestamps,
  sceneFrames,
  colorProfiles,
  selectedProfileIndex,
  onSelectProfileIndex,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const animationFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);

  // Total duration derived from word timestamps or script length
  const totalDuration = wordTimestamps.length > 0
    ? Math.max(15, wordTimestamps[wordTimestamps.length - 1].end + 1.0)
    : Math.max(15, scriptText.split(/\s+/).length * 0.4);

  const activeProfile = colorProfiles[selectedProfileIndex] || colorProfiles[0];

  // Current active word for kinetic caption
  const currentWordObj = wordTimestamps.find(
    (w) => currentTime >= w.start && currentTime <= w.end
  );

  // Current active image frame based on timeline progress
  const frameIndex = Math.min(
    sceneFrames.length - 1,
    Math.floor((currentTime / totalDuration) * sceneFrames.length)
  );
  const currentFrame = sceneFrames[frameIndex] || sceneFrames[0];

  // Calculate Ken Burns scale factor (1.0 -> 1.15 smooth scale per frame window)
  const frameSegmentDuration = totalDuration / Math.max(1, sceneFrames.length);
  const frameLocalTime = currentTime % frameSegmentDuration;
  const zoomFactor = 1.0 + 0.12 * (frameLocalTime / Math.max(0.1, frameSegmentDuration));

  useEffect(() => {
    if (isPlaying) {
      const step = (timestamp: number) => {
        if (!startTimeRef.current) startTimeRef.current = timestamp - currentTime * 1000;
        const elapsedSec = (timestamp - startTimeRef.current) / 1000;

        if (elapsedSec >= totalDuration) {
          setCurrentTime(0);
          setIsPlaying(false);
          startTimeRef.current = null;
        } else {
          setCurrentTime(elapsedSec);
          animationFrameRef.current = requestAnimationFrame(step);
        }
      };

      animationFrameRef.current = requestAnimationFrame(step);
    } else {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      startTimeRef.current = null;
    }

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [isPlaying, totalDuration]);

  // Speech synthesis audio simulator for preview
  const speakCurrentText = () => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const cleanScript = scriptText.replace(/\[PAUSE=[\d.]+\]/g, "");
      const utterance = new SpeechSynthesisUtterance(cleanScript);
      utterance.rate = 1.1;
      utterance.pitch = 1.0;

      utterance.onend = () => {
        setIsPlaying(false);
        setCurrentTime(0);
      };

      window.speechSynthesis.speak(utterance);
    }
  };

  const handleTogglePlay = () => {
    if (!isPlaying) {
      if (currentTime >= totalDuration) {
        setCurrentTime(0);
      }
      setIsPlaying(true);
      if (!isMuted) speakCurrentText();
    } else {
      setIsPlaying(false);
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
    startTimeRef.current = null;
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col md:flex-row gap-6">
      {/* 9:16 Vertical Video Frame */}
      <div className="relative mx-auto w-full max-w-[280px] sm:max-w-[320px] aspect-[9/16] rounded-2xl overflow-hidden bg-black border-2 border-slate-700 shadow-2xl group flex-shrink-0">
        {/* Background Visual Image with Ken Burns Zoom Effect */}
        <div
          className="absolute inset-0 bg-cover bg-center transition-transform duration-300 ease-out"
          style={{
            backgroundImage: `url(${currentFrame?.bg_gradient || "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=600&auto=format&fit=crop"})`,
            transform: `scale(${isPlaying ? zoomFactor : 1.05})`,
          }}
        >
          {/* Subtle vignette shadow overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-black/40" />
        </div>

        {/* Top Header Overlay: Reddit Subreddit Badge */}
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-20">
          <div className="flex items-center space-x-2 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 text-xs text-white font-medium">
            <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
            <span>r/AITAH Story</span>
          </div>

          <div className="bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10 text-[10px] text-cyan-400 font-mono">
            9:16 vertical
          </div>
        </div>

        {/* Scene Act Indicator Badge */}
        <div className="absolute top-14 left-4 z-20">
          <span className="text-[10px] font-mono uppercase bg-indigo-950/80 border border-indigo-700 text-indigo-300 px-2 py-0.5 rounded-md backdrop-blur-sm">
            Scene Frame {frameIndex + 1}/{sceneFrames.length}
          </span>
        </div>

        {/* Center Kinetic Caption Subtitle Overlay */}
        <div
          className="absolute left-4 right-4 z-30 flex flex-col items-center justify-center text-center transition-all duration-75"
          style={{
            top: `${activeProfile.y_position * 100}%`,
            transform: "translateY(-50%)",
          }}
        >
          {currentWordObj ? (
            <div className="animate-in zoom-in-90 duration-100">
              <span
                className="font-black uppercase tracking-wider block drop-shadow-[0_4px_12px_rgba(0,0,0,0.9)] transition-all"
                style={{
                  fontSize: `${activeProfile.font_size * 0.7}px`,
                  color: currentWordObj.word.length > 5 ? activeProfile.highlight : activeProfile.primary,
                  WebkitTextStroke: `${activeProfile.stroke_width}px ${activeProfile.bg_stroke}`,
                  fontFamily: "Impact, system-ui, sans-serif",
                  letterSpacing: "0.05em",
                }}
              >
                {currentWordObj.word}
              </span>
            </div>
          ) : (
            <div className="opacity-80">
              <span
                className="font-extrabold uppercase text-xs tracking-widest px-3 py-1 rounded bg-black/50 backdrop-blur-sm border border-white/10"
                style={{ color: activeProfile.primary }}
              >
                [ Kinetic Captions Active ]
              </span>
            </div>
          )}
        </div>

        {/* Bottom Playback Overlay */}
        <div className="absolute bottom-4 left-4 right-4 z-30 flex items-center justify-between">
          <button
            onClick={handleTogglePlay}
            className="w-10 h-10 rounded-full bg-white/90 hover:bg-white text-slate-950 flex items-center justify-center shadow-lg transition-transform active:scale-95"
          >
            {isPlaying ? <Pause className="w-5 h-5 fill-slate-950" /> : <Play className="w-5 h-5 fill-slate-950 ml-0.5" />}
          </button>

          <div className="font-mono text-xs text-white/90 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
            {currentTime.toFixed(1)}s / {totalDuration.toFixed(1)}s
          </div>

          <button
            onClick={() => setIsMuted(!isMuted)}
            className="w-9 h-9 rounded-full bg-black/60 backdrop-blur-md text-white border border-white/10 flex items-center justify-center hover:bg-black/80"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Side Controls & Algorithmic Variance Inspector */}
      <div className="flex-1 flex flex-col justify-between space-y-4">
        <div>
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-400" /> MoviePy v2 Render Preview
              </h3>
              <p className="text-xs text-slate-400">
                Algorithmic Variance Engine active • 1080x1920 (9:16) Vertical Export
              </p>
            </div>
            <span className="px-2.5 py-1 text-[11px] font-mono bg-emerald-950 text-emerald-400 border border-emerald-800/60 rounded-lg">
              30 FPS • H.264
            </span>
          </div>

          {/* Scrubber Timeline */}
          <div className="space-y-2 mb-6">
            <div className="flex justify-between text-xs font-mono text-slate-400">
              <span>Timeline Progress</span>
              <span>
                {Math.round((currentTime / totalDuration) * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max={totalDuration}
              step="0.1"
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
          </div>

          {/* Subtitle Color Variance Profile Selector */}
          <div className="space-y-3 mb-6">
            <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-indigo-400" /> Algorithmic Subtitle Color Profile
              </span>
              <span className="text-[10px] text-slate-500">Bypasses platform fingerprinting</span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {colorProfiles.map((profile, idx) => (
                <button
                  key={idx}
                  onClick={() => onSelectProfileIndex(idx)}
                  className={`p-3 rounded-xl border text-left transition-all relative ${
                    selectedProfileIndex === idx
                      ? "bg-indigo-950/60 border-indigo-500 text-white shadow-md shadow-indigo-500/10"
                      : "bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700"
                  }`}
                >
                  {selectedProfileIndex === idx && (
                    <span className="absolute top-2 right-2 w-4 h-4 rounded-full bg-indigo-500 text-white flex items-center justify-center text-[10px]">
                      <Check className="w-3 h-3" />
                    </span>
                  )}
                  <div className="text-xs font-bold text-white mb-1.5">{profile.name}</div>
                  <div className="flex items-center space-x-1.5">
                    <span
                      className="w-4 h-4 rounded-full border border-black shadow-sm"
                      style={{ backgroundColor: profile.primary }}
                    />
                    <span
                      className="w-4 h-4 rounded-full border border-black shadow-sm"
                      style={{ backgroundColor: profile.highlight }}
                    />
                    <span className="text-[10px] font-mono text-slate-400 ml-1">
                      Stroke {profile.stroke_width}px
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Current Frame SD Prompt Preview */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider font-mono">
                Stable Diffusion 1.5 Frame Prompt ({frameIndex + 1}/{sceneFrames.length})
              </span>
              <span className="text-[10px] text-slate-500">512x768 • FP16</span>
            </div>
            <p className="text-xs text-slate-300 font-mono leading-relaxed line-clamp-2">
              {currentFrame?.prompt || "Cinematic graphic novel art style, dramatic lighting"}
            </p>
          </div>
        </div>

        {/* Export / Actions Footer */}
        <div className="flex items-center justify-between border-t border-slate-800 pt-4">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                setCurrentTime(0);
                setIsPlaying(false);
              }}
              className="px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset Player
            </button>
          </div>

          <a
            href="#code"
            className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-500/20 flex items-center gap-2"
          >
            <Download className="w-3.5 h-3.5" /> Download Python Render Script
          </a>
        </div>
      </div>
    </div>
  );
};
