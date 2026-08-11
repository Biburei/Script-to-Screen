import React, { useState } from 'react';
import { Image as ImageIcon, Layers, Tag, Camera, Sparkles, RefreshCw, Eye, ArrowRight } from 'lucide-react';
import { Story, FramePrompt } from '../types';
import { TAG_CATEGORIES } from '../data/voices';

interface StoryboardViewProps {
  selectedStory: Story;
  framePrompts: FramePrompt[];
  onGeneratePrompts: (numScenes: number) => Promise<void>;
  onNavigateTab: (tab: string) => void;
  isProcessing: boolean;
}

export const StoryboardView: React.FC<StoryboardViewProps> = ({
  selectedStory,
  framePrompts,
  onGeneratePrompts,
  onNavigateTab,
  isProcessing
}) => {
  const [numScenes, setNumScenes] = useState<number>(10);
  const [selectedCategory, setSelectedCategory] = useState<string>(TAG_CATEGORIES[0].category);

  const activeBlueprint = TAG_CATEGORIES.find(c => c.category === selectedCategory) || TAG_CATEGORIES[0];

  // Selected story pre-rendered assets
  const assets = selectedStory?.assets || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-display font-bold text-white flex items-center gap-2">
            <ImageIcon className="w-6 h-6 text-amber-400" />
            <span>Local Stable Diffusion 9:16 Art Director Studio</span>
          </h1>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Generates 10-15 vertical artboard frames (512x768) mapped to category style blueprints.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={numScenes}
            onChange={(e) => setNumScenes(parseInt(e.target.value, 10))}
            className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-red-500 cursor-pointer"
          >
            <option value={10}>10 Visual Frames</option>
            <option value={12}>12 Visual Frames</option>
            <option value={15}>15 Visual Frames</option>
          </select>

          <button
            onClick={() => onGeneratePrompts(numScenes)}
            disabled={isProcessing}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-red-600 to-red-800 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-red-950 hover:from-red-500 hover:to-red-700 transition-all cursor-pointer disabled:opacity-50"
          >
            {isProcessing ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            <span>Generate Storyboard</span>
          </button>
        </div>
      </div>

      {/* Category Visual Style Blueprint Selector */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-3">
        <span className="text-xs font-mono text-amber-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
          <Tag className="w-3.5 h-3.5" />
          <span>Category Visual Style Blueprints</span>
        </span>

        <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
          {TAG_CATEGORIES.map(cat => (
            <button
              key={cat.category}
              onClick={() => setSelectedCategory(cat.category)}
              className={`px-3.5 py-2 rounded-xl text-xs font-mono transition-all shrink-0 cursor-pointer ${
                selectedCategory === cat.category
                  ? 'bg-red-950 text-red-200 border border-red-600 shadow-md shadow-red-950'
                  : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-slate-200'
              }`}
            >
              {cat.category}
            </button>
          ))}
        </div>

        <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-xs font-mono text-slate-300">
          <span className="text-amber-400 font-bold">Master Style Blueprint: </span>
          <span>{activeBlueprint.blueprint}</span>
        </div>
      </div>

      {/* Storyboard Gallery & Scene Breakdown */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-display font-bold text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-red-500" />
            <span>9:16 Vertical Scene Frames ({assets.length > 0 ? assets.length : framePrompts.length || numScenes} Scenes)</span>
          </h2>

          <button
            onClick={() => onNavigateTab('player')}
            className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-red-600 to-red-800 text-white font-semibold text-xs flex items-center gap-1.5 hover:from-red-500 hover:to-red-700 transition-all cursor-pointer shadow-md shadow-red-950"
          >
            <span>Preview in Short Player</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Frames Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {Array.from({ length: Math.max(assets.length, framePrompts.length || numScenes) }, (_, idx) => {
            const frame = framePrompts[idx] || {
              frame_id: idx + 1,
              prompt: `Scene ${idx + 1}: ${selectedStory?.title || 'Horror Story'} visual frame`,
              scene_type: idx === 0 ? 'new_location' : (idx % 2 === 1 ? 'camera_cut' : 'continuous_action'),
              suggested_denoising: idx === 0 ? 1.0 : (idx % 2 === 1 ? 0.80 : 0.45)
            };

            const imageSrc = assets[idx] || `/temp/assets_${encodeURIComponent(selectedStory?.id || 'temp')}/scene_${idx + 1}.png`;

            return (
              <div
                key={idx}
                className="bg-slate-900 border border-slate-800 rounded-xl p-3 space-y-3 hover:border-red-600/50 transition-all"
              >
                {/* 9:16 Aspect Image Frame */}
                <div className="aspect-[9/16] bg-slate-950 rounded-lg overflow-hidden relative border border-slate-800/80">
                  <img
                    src={imageSrc}
                    alt={`Frame ${idx + 1}`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      // Fallback placeholder if file image missing
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />

                  {/* Fallback frame placeholder view */}
                  <div className="w-full h-full flex flex-col items-center justify-center p-3 text-center bg-gradient-to-b from-slate-900 to-slate-950 text-slate-400 font-mono text-[11px] space-y-2">
                    <Camera className="w-6 h-6 text-red-500/70" />
                    <span>Frame #{idx + 1}</span>
                    <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-black/80 text-amber-300 border border-amber-900/50">
                      {frame.scene_type}
                    </span>
                  </div>

                  <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/80 backdrop-blur-md text-[10px] font-mono font-bold text-white border border-slate-700">
                    #{idx + 1}
                  </div>
                </div>

                {/* Prompt Details */}
                <div className="space-y-1 font-mono text-[11px]">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-red-400 font-semibold">{frame.scene_type}</span>
                    <span>Denoise: {frame.suggested_denoising}</span>
                  </div>
                  <p className="text-slate-300 text-[10px] line-clamp-3 leading-tight font-sans">
                    {frame.prompt}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
