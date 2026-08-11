import React, { useState, useEffect } from "react";
import { Terminal, Copy, Check, Trash2, ShieldAlert, AlertTriangle, AlertCircle, RefreshCw, Flame, ChevronDown, ChevronRight } from "lucide-react";
import { LogEntry, FatalErrorReport } from "../types";

interface TerminalLogsProps {
  logs: LogEntry[];
  onClearLogs: () => void;
}

export const TerminalLogs: React.FC<TerminalLogsProps> = ({ logs, onClearLogs }) => {
  const [copied, setCopied] = useState(false);
  const [moduleFilter, setModuleFilter] = useState<string>("ALL");
  const [fatalReports, setFatalReports] = useState<FatalErrorReport[]>([]);
  const [expandedStackId, setExpandedStackId] = useState<string | null>(null);
  const [isLoadingFatal, setIsLoadingFatal] = useState(false);

  const fetchFatalReports = async () => {
    setIsLoadingFatal(true);
    try {
      const res = await fetch("/api/logs/fatal");
      if (res.ok) {
        const data = await res.json();
        if (data.status === "success" && Array.isArray(data.logs)) {
          setFatalReports(data.logs);
        }
      }
    } catch (e) {
      console.error("Failed to fetch fatal reports:", e);
    } finally {
      setIsLoadingFatal(false);
    }
  };

  useEffect(() => {
    fetchFatalReports();
    const interval = setInterval(fetchFatalReports, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleSimulateFatalError = async () => {
    try {
      const res = await fetch("/api/logs/simulate-fatal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          module: "STABLE_DIFFUSION",
          message: "Fatal VRAM allocation failure: CUDA out of memory in UNet forward pass (allocated 7.8GB / 8.0GB limit)",
        }),
      });
      if (res.ok) {
        fetchFatalReports();
      }
    } catch (e) {
      console.error("Simulation failed:", e);
    }
  };

  const handleResetFatalLogs = async () => {
    try {
      await fetch("/api/logs/fatal", { method: "DELETE" });
      setFatalReports([]);
    } catch (e) {
      console.error("Reset failed:", e);
    }
  };

  const filteredLogs = moduleFilter === "ALL" ? logs : logs.filter((l) => l.module === moduleFilter);
  const fatalCount = logs.filter((l) => l.level === "FATAL").length + fatalReports.length;

  const handleCopyLogs = () => {
    const text = logs.map((l) => `[${l.timestamp}] [${l.module}] [${l.level}] ${l.message}`).join("\n");
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Terminal className="w-5 h-5 text-emerald-400" /> Pipeline Terminal Execution & Fatal Error Logs
          </h2>
          <p className="text-xs text-slate-400">
            Real-time process output logging, uncaught process exception hooks, and persistent fatal error telemetry.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleSimulateFatalError}
            className="px-3 py-1.5 bg-red-950/80 hover:bg-red-900 border border-red-800/80 text-red-300 text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5 shadow-lg shadow-red-950/30"
            title="Simulate a fatal pipeline exception to verify telemetry"
          >
            <Flame className="w-3.5 h-3.5 text-red-400 animate-pulse" />
            <span>Simulate Fatal Error</span>
          </button>

          <select
            value={moduleFilter}
            onChange={(e) => setModuleFilter(e.target.value)}
            className="bg-slate-900 border border-slate-800 text-slate-300 text-xs font-mono rounded-xl px-3 py-1.5"
          >
            <option value="ALL">All Modules ({logs.length})</option>
            <option value="SCRAPER">SCRAPER</option>
            <option value="OPENROUTER_LLM">OPENROUTER_LLM</option>
            <option value="KOKORO_TTS">KOKORO_TTS</option>
            <option value="STABLE_DIFFUSION">STABLE_DIFFUSION</option>
            <option value="WHISPER">WHISPER</option>
            <option value="MOVIEPY_V2">MOVIEPY_V2</option>
            <option value="SERVER">SERVER</option>
            <option value="PIPELINE">PIPELINE</option>
          </select>

          <button
            onClick={handleCopyLogs}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-xl transition-colors flex items-center gap-1.5"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? "Copied" : "Copy Logs"}</span>
          </button>

          <button
            onClick={onClearLogs}
            className="p-1.5 text-slate-400 hover:text-red-400 bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors border border-slate-800"
            title="Clear logs"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Fatal Error Monitor Banner */}
      <div className={`border rounded-2xl p-4 transition-all ${fatalCount > 0 ? "bg-red-950/30 border-red-800/60" : "bg-slate-900/60 border-slate-800"}`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2.5">
            <ShieldAlert className={`w-5 h-5 ${fatalCount > 0 ? "text-red-400 animate-pulse" : "text-emerald-400"}`} />
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                Fatal Error Reporter & Crash Sentinel
                {fatalCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-red-500/20 text-red-400 border border-red-500/40">
                    {fatalCount} Incident{fatalCount > 1 ? "s" : ""} Reported
                  </span>
                )}
              </h3>
              <p className="text-[11px] text-slate-400">
                Monitors uncaught process exceptions, memory panics, stack traces, and writes to <code className="text-red-300 font-mono">logs/fatal_errors.log</code>.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={fetchFatalReports}
              disabled={isLoadingFatal}
              className="p-1.5 text-slate-400 hover:text-white bg-slate-800 rounded-lg text-xs flex items-center gap-1"
              title="Refresh fatal error telemetry"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingFatal ? "animate-spin" : ""}`} />
            </button>
            {fatalReports.length > 0 && (
              <button
                onClick={handleResetFatalLogs}
                className="text-[11px] text-red-400 hover:text-red-300 bg-red-950/50 hover:bg-red-900/50 border border-red-800/50 px-2.5 py-1 rounded-lg"
              >
                Reset Reports
              </button>
            )}
          </div>
        </div>

        {/* Backend Reported Fatal Errors */}
        {fatalReports.length > 0 && (
          <div className="mt-3 space-y-2 max-h-48 overflow-y-auto">
            {fatalReports.map((report) => {
              const isExpanded = expandedStackId === report.id;
              return (
                <div key={report.id} className="bg-red-950/40 border border-red-900/60 rounded-xl p-2.5 font-mono text-xs">
                  <div className="flex items-start justify-between cursor-pointer" onClick={() => setExpandedStackId(isExpanded ? null : report.id)}>
                    <div className="flex items-center space-x-2">
                      <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
                      <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-red-900/60 text-red-200 border border-red-700/60">
                        {report.module}
                      </span>
                      <span className="font-semibold text-red-300">{report.errorName}: {report.message}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-[10px] text-red-400">
                      <span>{new Date(report.timestamp).toLocaleTimeString()}</span>
                      {report.stack && (isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />)}
                    </div>
                  </div>

                  {isExpanded && report.stack && (
                    <div className="mt-2 pt-2 border-t border-red-900/40 text-[10px] text-red-300/90 whitespace-pre-wrap overflow-x-auto bg-black/40 p-2 rounded-lg">
                      <div className="text-slate-400 mb-1 font-sans font-bold">Stack Trace:</div>
                      {report.stack}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Terminal Window Box */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl font-mono text-xs">
        <div className="bg-slate-900 px-4 py-2.5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="w-3 h-3 rounded-full bg-red-500/80 inline-block" />
            <span className="w-3 h-3 rounded-full bg-yellow-500/80 inline-block" />
            <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
            <span className="text-slate-400 ml-2 font-bold">bash - python main.py --subreddit AITAH</span>
          </div>
          <span className="text-[10px] text-emerald-400">Process Exit 0</span>
        </div>

        <div className="p-4 space-y-2 max-h-[500px] overflow-y-auto">
          {filteredLogs.length === 0 ? (
            <div className="text-slate-600 py-12 text-center">
              No live logs recorded yet. Execute the pipeline to stream live logs.
            </div>
          ) : (
            filteredLogs.map((log) => {
              let levelColor = "text-slate-300";
              let badgeStyle = "bg-slate-900 text-indigo-400 border-slate-800";

              if (log.level === "SUCCESS") {
                levelColor = "text-emerald-400";
                badgeStyle = "bg-emerald-950/60 text-emerald-400 border-emerald-800/60";
              } else if (log.level === "WARN") {
                levelColor = "text-yellow-400";
                badgeStyle = "bg-yellow-950/60 text-yellow-400 border-yellow-800/60";
              } else if (log.level === "ERROR") {
                levelColor = "text-red-400";
                badgeStyle = "bg-red-950/60 text-red-400 border-red-800/60";
              } else if (log.level === "FATAL") {
                levelColor = "text-red-400 font-bold bg-red-950/30 p-1 rounded border border-red-800/60";
                badgeStyle = "bg-red-600 text-white border-red-500 animate-pulse font-extrabold";
              }

              return (
                <div key={log.id} className="flex items-start space-x-2 leading-relaxed hover:bg-slate-900/50 p-1 rounded">
                  <span className="text-slate-500 flex-shrink-0">[{log.timestamp}]</span>
                  <span className={`px-1.5 py-0.5 text-[10px] rounded border font-bold flex-shrink-0 ${badgeStyle}`}>
                    {log.level === "FATAL" ? `FATAL:${log.module}` : log.module}
                  </span>
                  <span className={`${levelColor} flex-1`}>{log.message}</span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
