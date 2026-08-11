import React, { useState } from 'react';
import { Settings, Cpu, Database, Key, ShieldCheck, Save, RefreshCw } from 'lucide-react';
import { PipelineState } from '../types';

interface ConfigViewProps {
  pipelineState: PipelineState;
  onUpdateState: (index: number) => Promise<void>;
}

export const ConfigView: React.FC<ConfigViewProps> = ({
  pipelineState,
  onUpdateState
}) => {
  const [newIndex, setNewIndex] = useState<number>(pipelineState.current_index);
  const [openRouterModel, setOpenRouterModel] = useState('openrouter/free');
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveState = async () => {
    setIsSaving(true);
    await onUpdateState(newIndex);
    setIsSaving(false);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="border-b border-slate-800 pb-5">
        <h1 className="text-2xl font-display font-bold text-white flex items-center gap-2">
          <Settings className="w-6 h-6 text-slate-400" />
          <span>Pipeline & Hardware Configuration</span>
        </h1>
        <p className="text-xs text-slate-400 font-mono mt-1">
          Hardware profiles, LLM models, and dataset pointer state manager.
        </p>
      </div>

      {/* Dataset State Pointer */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <span className="text-sm font-mono font-bold text-white flex items-center gap-2">
            <Database className="w-4 h-4 text-red-400" />
            <span>Dataset Sequence Pointer (pipeline_state.json)</span>
          </span>
          <span className="text-xs font-mono text-slate-400">Total Stories: 3,510</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
          <div>
            <label className="block text-xs font-mono text-slate-400 mb-1">Set Current Sequence Index</label>
            <input
              type="number"
              min={0}
              max={pipelineState.total_stories - 1}
              value={newIndex}
              onChange={(e) => setNewIndex(parseInt(e.target.value, 10) || 0)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-red-500"
            />
          </div>

          <button
            onClick={handleSaveState}
            disabled={isSaving}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-red-800 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-md shadow-red-950 hover:from-red-500 hover:to-red-700 transition-all cursor-pointer disabled:opacity-50"
          >
            {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>Update Pointer State</span>
          </button>
        </div>
      </div>

      {/* Hardware Profile Settings */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <span className="text-sm font-mono font-bold text-white flex items-center gap-2">
            <Cpu className="w-4 h-4 text-emerald-400" />
            <span>NVIDIA RTX 3050 / AMD Ryzen 7 Optimization Profile</span>
          </span>
          <span className="text-xs font-mono text-emerald-400 font-bold">FP16 Mode Active</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1">
            <div className="text-slate-400">VRAM Safety Target</div>
            <div className="text-emerald-400 font-bold text-sm">3.5 GB (FP16 VRAM Protection)</div>
          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1">
            <div className="text-slate-400">Cross-Attention Slicing</div>
            <div className="text-emerald-400 font-bold text-sm">Enabled (Prevents Spikes)</div>
          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1">
            <div className="text-slate-400">VAE Tiling Engine</div>
            <div className="text-emerald-400 font-bold text-sm">Enabled (9:16 vertical 512x768)</div>
          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1">
            <div className="text-slate-400">Whisper STT Engine</div>
            <div className="text-emerald-400 font-bold text-sm">faster-whisper (0 STT Typos)</div>
          </div>
        </div>
      </div>
    </div>
  );
};
