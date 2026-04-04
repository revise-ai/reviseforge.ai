"use client";

import React, { useEffect, useRef, useState } from "react";

interface SmilesViewerProps {
  smiles: string;
  theme?: "light" | "dark";
  width?: number;
  height?: number;
}

export default function SmilesViewer({
  smiles,
  theme = "light",
  width = 400,
  height = 300,
}: SmilesViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!canvasRef.current || !smiles) return;
    setError(null);

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);

    (async () => {
      try {
        // @ts-ignore
        const SmilesDrawerModule = await import("smiles-drawer");
        const SmilesDrawer = SmilesDrawerModule.default || SmilesDrawerModule;

        // Configuration for professional look
        const options = {
          width,
          height,
          compactDrawing: true,
          terminalCarbons: true,
          explicitHydrogens: false,
        };

        if (typeof SmilesDrawer === "function" || (SmilesDrawer && typeof SmilesDrawer.Drawer === "undefined")) {
          const SmiConstructor = typeof SmilesDrawer === "function" ? SmilesDrawer : SmilesDrawer.default || SmilesDrawer;
          const drawer = new SmiConstructor(options);
          drawer.draw(smiles, canvas, theme);
        } else if (SmilesDrawer && SmilesDrawer.Drawer) {
          const drawer = new SmilesDrawer.Drawer(options);
          SmilesDrawer.parse(
            smiles,
            (tree: any) => {
              drawer.draw(tree, canvas, theme, false);
            },
            (err: any) => {
              setError("Invalid structure");
              console.error(err);
            }
          );
        }
      } catch (err) {
        setError("Rendering failed");
      }
    })();
  }, [smiles, theme, width, height]);

  const handleDownload = () => {
    if (!canvasRef.current) return;
    const link = document.createElement("a");
    link.download = `molecule-${smiles.slice(0, 10)}.png`;
    link.href = canvasRef.current.toDataURL("image/png");
    link.click();
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(smiles);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-6 group relative max-w-full inline-block">
      {/* ── Visual Card Shell ── */}
      <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-gray-100 shadow-xl shadow-blue-900/5 overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/10 hover:-translate-y-0.5">
        
        {/* Header/Toolbar */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-gray-50 bg-gray-50/50">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Molecular Visualization</span>
          </div>
          <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button 
              onClick={handleCopy}
              className="p-1.5 rounded-lg hover:bg-white hover:shadow-sm text-gray-400 hover:text-blue-600 transition-all cursor-pointer"
              title="Copy SMILES"
            >
              {copied ? (
                <svg className="w-3.5 h-3.5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
              ) : (
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
              )}
            </button>
            <button 
              onClick={handleDownload}
              className="p-1.5 rounded-lg hover:bg-white hover:shadow-sm text-gray-400 hover:text-blue-600 transition-all cursor-pointer"
              title="Download PNG"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="relative p-6 bg-white">
          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/90 z-10">
              <span className="text-xs font-medium text-red-400 bg-red-50 px-3 py-1.5 rounded-full border border-red-100">{error}</span>
            </div>
          )}
          <div className="flex items-center justify-center">
            <canvas ref={canvasRef} width={width} height={height} className="max-w-full h-auto mix-blend-multiply" />
          </div>
        </div>

        {/* Footer Area */}
        <div className="px-4 py-3 border-t border-gray-50 flex items-center justify-between gap-4 bg-gray-50/30">
          <div className="flex-1 min-w-0">
            <div className="text-[10px] text-gray-400 mb-0.5 font-medium">SMILES STRING</div>
            <div className="text-[11px] font-mono text-gray-500 truncate" title={smiles}>
              {smiles}
            </div>
          </div>
          <div className="shrink-0 flex items-center gap-2">
            <span className="text-[10px] font-bold text-white bg-blue-500 px-2.5 py-1 rounded-lg">2D</span>
            <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg">VECTOR</span>
          </div>
        </div>
      </div>

      {/* Decorative Accents */}
      <div className="absolute -bottom-2 -right-2 w-24 h-24 bg-blue-100 rounded-full blur-3xl opacity-20 -z-10 group-hover:opacity-40 transition-opacity" />
      <div className="absolute -top-2 -left-2 w-24 h-24 bg-indigo-100 rounded-full blur-3xl opacity-20 -z-10 group-hover:opacity-40 transition-opacity" />
    </div>
  );
}
