"use client";
import React, { useEffect, useRef, useState, useMemo } from "react";
import mermaid from "mermaid";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";

interface MermaidViewerProps {
  chart: string;
}

export default function MermaidViewer({ chart }: MermaidViewerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [svgRender, setSvgRender] = useState<string>("");
  const [previewSvg, setPreviewSvg] = useState<string>("");
  const [error, setError] = useState<string>("");

  const chartTitle = useMemo(() => {
    const titleMatch = chart.match(/title:\s*(.*)/i);
    if (titleMatch) return titleMatch[1].trim();
    const rootMatch = chart.match(/root.*?['"([]+([^'"\])]+)['"\])]+/);
    if (rootMatch) return rootMatch[1].trim();
    const lines = chart.split('\n').map(l => l.trim()).filter(l => l && l !== 'mindmap' && !l.startsWith('%%'));
    if (lines.length > 0) {
      const lineMatch = lines[0].match(/['"([]+([^'"\])]+)['"\])]+/) || lines[0].match(/([a-zA-Z0-9_ -]+)/);
      if (lineMatch && lineMatch[1]) return lineMatch[1].trim();
      return lines[0];
    }
    return "Interactive Diagram";
  }, [chart]);

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: "base",
      themeVariables: {
        primaryColor: "#6366f1",
        primaryTextColor: "#ffffff",
        primaryBorderColor: "#4f46e5",
        lineColor: "#94a3b8",
        secondaryColor: "#ec4899",
        tertiaryColor: "#10b981",
        edgeLabelBackground: "#ffffff",
        fontFamily: "Outfit, sans-serif",
        fontSize: "16px",
      },
      securityLevel: "loose",
    });

    const renderPreview = async () => {
      try {
        const id = `preview-${Math.random().toString(36).substring(2, 11)}`;
        const { svg } = await mermaid.render(id, chart);
        setPreviewSvg(svg);
      } catch (e) {
        console.error("Preview render failed", e);
      }
    };
    renderPreview();
  }, [chart]);

  useEffect(() => {
    if (isOpen) {
      renderMermaid();
    }
  }, [isOpen, chart]);

  const renderMermaid = async () => {
    try {
      const id = `mermaid-${Date.now()}`;
      mermaid.render(id, chart).then(({ svg }: { svg: string }) => {
        setSvgRender(svg);
      }).catch((err: any) => {
        setError(err.message || "Failed to render diagram.");
      });
    } catch (err: any) {
      setError(err.message || "Failed to render diagram.");
    }
  };

  const handleDownload = () => {
    if (!svgRender) return;
    const blob = new Blob([svgRender], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `mindmap-${Date.now()}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <div className="my-4 border border-blue-100 bg-blue-50/50 rounded-2xl p-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-white border border-blue-100 flex items-center justify-center text-blue-600 shrink-0 overflow-hidden shadow-sm relative group">
            {previewSvg ? (
              <div 
                className="w-full h-full scale-[3.5] flex items-center justify-center opacity-80 group-hover:opacity-100 transition-opacity"
                dangerouslySetInnerHTML={{ __html: previewSvg }}
              />
            ) : (
              <svg className="w-6 h-6 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            )}
            <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/5 to-transparent pointer-events-none" />
          </div>
          <div>
            <p className="font-bold text-gray-800 text-[15px] whitespace-pre-line break-words max-w-[400px] leading-tight">{chartTitle}</p>
            <p className="text-xs text-blue-500 font-medium mt-1">Interactive Mind Map</p>
          </div>
        </div>
        <button
          onClick={() => setIsOpen(true)}
          className="px-5 py-2 bg-black text-white text-sm font-semibold rounded-full cursor-pointer hover:scale-105 shadow-md active:scale-95 transition-all shrink-0"
        >
          Open
        </button>
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[32px] w-full max-w-6xl h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 text-sm font-bold text-gray-600 bg-gray-100 rounded-full cursor-pointer hover:bg-gray-200 transition-colors"
                >
                  &larr; Back
                </button>
                <span className="font-bold text-gray-900 ml-2 max-w-[300px] md:max-w-[500px] truncate tracking-tight">{chartTitle}</span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleDownload}
                  className="p-2.5 text-gray-500 cursor-pointer hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-all border border-transparent hover:border-gray-200"
                  title="Download SVG"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2.5 text-gray-400 cursor-pointer hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                  title="Close"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="flex-1 relative bg-slate-50/50 overflow-hidden" ref={containerRef}>
              {error ? (
                <div className="absolute inset-0 flex items-center justify-center text-red-500 p-8 text-center bg-white">
                  <div>
                    <svg className="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="font-semibold mb-2">Could not render diagram</p>
                    <pre className="text-xs text-left bg-red-50 p-4 rounded-xl border border-red-100 max-w-xl overflow-auto">{error}</pre>
                  </div>
                </div>
              ) : svgRender ? (
                <TransformWrapper initialScale={2.2} minScale={0.5} maxScale={5} centerOnInit>
                  <TransformComponent wrapperStyle={{ width: "100%", height: "100%", cursor: "grab" }}>
                    <div 
                      className="flex items-center justify-center p-4 min-w-full min-h-full"
                      dangerouslySetInnerHTML={{ __html: svgRender }} 
                      style={{
                        fontFamily: "'Outfit', sans-serif",
                      }}
                    />
                    <style jsx global>{`
                      /* Generic Node Styling for all Mermaid Types */
                      .node rect, .node circle, .node polygon, .node path,
                      .mindmap-node rect, .mindmap-node circle, .mindmap-node path {
                        filter: drop-shadow(0 4px 6px rgba(0,0,0,0.05));
                        stroke-width: 2px !important;
                      }

                      /* Standard Flowchart Nodes */
                      .node rect { fill: #f8fafc !important; stroke: #6366f1 !important; }
                      .node text { fill: #1e293b !important; font-weight: 600 !important; }

                      /* Mind Map Specific - Vibrant & Colorful */
                      .mindmap-node text {
                        fill: white !important;
                        font-weight: 700 !important;
                        font-size: 14px !important;
                        letter-spacing: -0.01em;
                      }
                      .mindmap-node.root text { font-size: 18px !important; }

                      /* Level-based Coloring for Mind Maps */
                      .mindmap-node[data-level="0"] rect { fill: #4f46e5 !important; stroke: #4338ca !important; }
                      .mindmap-node[data-level="1"] rect { fill: #8b5cf6 !important; stroke: #7c3aed !important; }
                      .mindmap-node[data-level="2"] rect { fill: #ec4899 !important; stroke: #db2777 !important; }
                      .mindmap-node[data-level="3"] rect { fill: #f59e0b !important; stroke: #d97706 !important; }
                      .mindmap-node[data-level="4"] rect { fill: #10b981 !important; stroke: #059669 !important; }

                      /* Edge/Line Styling */
                      .edgePath path { stroke: #94a3b8 !important; stroke-width: 2px !important; }
                    `}</style>
                  </TransformComponent>
                </TransformWrapper>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                  <svg className="w-8 h-8 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                </div>
              )}
              
              {/* Tooltip hint */}
              {!error && svgRender && (
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 bg-black/80 backdrop-blur text-white text-[10px] uppercase tracking-widest font-bold rounded-full opacity-0 animate-in fade-in slide-in-from-bottom-2 delay-500 fill-mode-forwards pointer-events-none shadow-xl">
                  Scroll to Zoom • Drag to Pan
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
