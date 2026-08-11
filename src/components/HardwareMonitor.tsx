import React from "react";
import { Cpu, HardDrive, ShieldCheck, Zap, Gauge, Sliders, AlertTriangle, Layers } from "lucide-react";
import { PipelineConfig } from "../types";

interface HardwareMonitorProps {
  config: PipelineConfig;
  onChangeConfig: (newConfig: PipelineConfig) => void;
}

export const HardwareMonitor: React.FC<HardwareMonitorProps> = ({ config, onChangeConfig }) => {
  return (
    <div className="space-y-6 pb-12">
      <div className="border-b border-slate-800 pb-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Cpu className="w-5 h-5 text-indigo-400" /> Hardware Optimization & VRAM Safety Monitor
        </h2>
        <p className="text-xs text-slate-400">
          Tailored specifically for mid-tier consumer hardware (NVIDIA RTX 3050 4GB/6GB VRAM GPU & AMD Ryzen 7 CPU).
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* GPU Target Specs Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <span className="text-xs font-bold text-white font-mono flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-emerald-400" /> GPU MEMORY PROFILE
            </span>
            <span className="text-xs font-mono text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
              CUDA Active
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
              <span className="text-slate-400 font-mono">Target GPU:</span>
              <div className="text-sm font-bold text-white font-mono">NVIDIA GeForce RTX 3050</div>
              <span className="text-[11px] text-slate-500">Ampere Architecture • 2048 CUDA Cores</span>
            </div>

            <div className="space-y-1">
              <label className="text-slate-400 font-mono block">VRAM Buffer Limit:</label>
              <select
                value={config.vramLimitGb}
                onChange={(e) => onChangeConfig({ ...config, vramLimitGb: parseFloat(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-800 text-white font-mono rounded-xl p-2.5"
              >
                <option value={4.0}>4.0 GB VRAM (Strict Memory Saver)</option>
                <option value={6.0}>6.0 GB VRAM (Standard RTX 3050)</option>
                <option value={8.0}>8.0 GB VRAM (Expanded Memory)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Stable Diffusion Memory Switches Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <span className="text-xs font-bold text-white font-mono flex items-center gap-2">
              <Gauge className="w-4 h-4 text-cyan-400" /> SD 1.5 MEMORY SAFEGUARDS
            </span>
            <span className="text-xs font-mono text-cyan-400">FP16 Mode</span>
          </div>

          <div className="space-y-3 text-xs">
            <label className="flex items-center justify-between p-3 bg-slate-950 rounded-xl border border-slate-800 cursor-pointer">
              <div>
                <div className="font-bold text-white font-mono">torch.float16 Precision</div>
                <div className="text-[10px] text-slate-500">Halves VRAM footprint for SD 1.5</div>
              </div>
              <input
                type="checkbox"
                checked={config.useFp16}
                onChange={(e) => onChangeConfig({ ...config, useFp16: e.target.checked })}
                className="w-4 h-4 accent-indigo-500 rounded"
              />
            </label>

            <label className="flex items-center justify-between p-3 bg-slate-950 rounded-xl border border-slate-800 cursor-pointer">
              <div>
                <div className="font-bold text-white font-mono">enable_attention_slicing()</div>
                <div className="text-[10px] text-slate-500">Prevents memory spikes during attention</div>
              </div>
              <input
                type="checkbox"
                checked={config.enableAttentionSlicing}
                onChange={(e) => onChangeConfig({ ...config, enableAttentionSlicing: e.target.checked })}
                className="w-4 h-4 accent-indigo-500 rounded"
              />
            </label>

            <label className="flex items-center justify-between p-3 bg-slate-950 rounded-xl border border-slate-800 cursor-pointer">
              <div>
                <div className="font-bold text-white font-mono">enable_vae_tiling()</div>
                <div className="text-[10px] text-slate-500">Tiles VAE decode for 9:16 vertical images</div>
              </div>
              <input
                type="checkbox"
                checked={config.enableVaeTiling}
                onChange={(e) => onChangeConfig({ ...config, enableVaeTiling: e.target.checked })}
                className="w-4 h-4 accent-indigo-500 rounded"
              />
            </label>
          </div>
        </div>

        {/* CPU & Memory Offloading Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <span className="text-xs font-bold text-white font-mono flex items-center gap-2">
              <Zap className="w-4 h-4 text-purple-400" /> CPU & SYSTEM THREADS
            </span>
            <span className="text-xs font-mono text-purple-400">8 Cores / 16 Threads</span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
              <span className="text-slate-400 font-mono">Target CPU:</span>
              <div className="text-sm font-bold text-white font-mono">AMD Ryzen 7 5700X / 7800X3D</div>
              <span className="text-[11px] text-slate-500">Multithreaded MoviePy v2 & Whisper rendering</span>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80 text-[11px] text-slate-400 space-y-1 font-mono">
              <div className="flex justify-between text-slate-300 font-bold">
                <span>Memory Garbage Collection:</span>
                <span className="text-emerald-400">torch.cuda.empty_cache()</span>
              </div>
              <p className="text-[10px] text-slate-500">
                Executed automatically after every SD image frame render.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
