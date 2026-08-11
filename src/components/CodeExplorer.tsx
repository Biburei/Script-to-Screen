import React, { useState, useEffect } from "react";
import { Code, Download, Copy, Check, FileCode, FolderArchive, Terminal, ExternalLink } from "lucide-react";
import JSZip from "jszip";
import saveAs from "file-saver";

export const CodeExplorer: React.FC = () => {
  const [codebase, setCodebase] = useState<Record<string, string>>({});
  const [activeFile, setActiveFile] = useState<string>("main.py");
  const [copied, setCopied] = useState(false);
  const [isZipping, setIsZipping] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchCodebase();
  }, []);

  const fetchCodebase = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/codebase");
      if (res.ok) {
        const data = await res.json();
        if (data.files && Object.keys(data.files).length > 0) {
          setCodebase(data.files);
          if (data.files["main.py"]) setActiveFile("main.py");
          setIsLoading(false);
          return;
        }
      }
    } catch (e) {
      console.warn("API codebase fetch fallback:", e);
    }
    setIsLoading(false);
  };

  const handleCopyCode = () => {
    const code = codebase[activeFile] || "";
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadZip = async () => {
    setIsZipping(true);
    try {
      const zip = new JSZip();
      const folder = zip.folder("python_pipeline");

      Object.entries(codebase).forEach(([fileName, content]) => {
        if (folder && typeof content === "string") {
          folder.file(fileName, content);
        }
      });

      const blob = await zip.generateAsync({ type: "blob" });
      saveAs(blob, "reddit_shorts_pipeline.zip");
    } catch (e) {
      console.error("Zip export error:", e);
    } finally {
      setIsZipping(false);
    }
  };

  const fileList = Object.keys(codebase).sort();

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Code className="w-5 h-5 text-indigo-400" /> Keyless Python Pipeline Codebase
          </h2>
          <p className="text-xs text-slate-400">
            100% offline, modular Python architecture targeting NVIDIA RTX 3050 GPU & AMD Ryzen 7 CPU.
          </p>
        </div>

        <button
          onClick={handleDownloadZip}
          disabled={isZipping || Object.keys(codebase).length === 0}
          className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 transition-transform active:scale-95"
        >
          <FolderArchive className="w-4 h-4" />
          <span>{isZipping ? "Creating ZIP Package..." : "Download Project (.zip)"}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Sidebar File List */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2">
          <span className="text-xs font-bold text-slate-400 font-mono uppercase tracking-wider block px-2 pb-2 border-b border-slate-800">
            Pipeline Files ({fileList.length})
          </span>

          <div className="space-y-1">
            {fileList.map((fileName) => {
              const isSelected = activeFile === fileName;
              return (
                <button
                  key={fileName}
                  onClick={() => setActiveFile(fileName)}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-mono flex items-center space-x-2 transition-all ${
                    isSelected
                      ? "bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/30"
                      : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                  }`}
                >
                  <FileCode className={`w-4 h-4 ${isSelected ? "text-white" : "text-slate-500"}`} />
                  <span className="truncate">{fileName}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Code View Canvas */}
        <div className="md:col-span-3 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden flex flex-col justify-between shadow-xl">
          {/* Header Bar */}
          <div className="bg-slate-950 px-5 py-3 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center space-x-2 font-mono text-xs text-indigo-300">
              <Terminal className="w-4 h-4 text-emerald-400" />
              <span className="font-bold">{activeFile}</span>
            </div>

            <button
              onClick={handleCopyCode}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? "Copied!" : "Copy Code"}</span>
            </button>
          </div>

          {/* Code Text Window */}
          <div className="p-5 overflow-x-auto bg-slate-950 text-slate-300 font-mono text-xs leading-relaxed max-h-[550px] overflow-y-auto">
            <pre>
              <code>{codebase[activeFile] || "# Loading module..."}</code>
            </pre>
          </div>

          {/* Code Footer */}
          <div className="bg-slate-950 px-5 py-3 border-t border-slate-800 text-[11px] text-slate-500 font-mono flex items-center justify-between">
            <span>Encoding: UTF-8 • Module System: Python 3.10+</span>
            <span className="text-emerald-400">Zero External API Keys Required</span>
          </div>
        </div>
      </div>
    </div>
  );
};
