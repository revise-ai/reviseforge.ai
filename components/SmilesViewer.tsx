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

  useEffect(() => {
    if (!canvasRef.current || !smiles) return;
    setError(null);

    const canvas = canvasRef.current;
    
    // Clear canvas before redrawing
    const ctx = canvas.getContext("2d");
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);

    (async () => {
      try {
        // @ts-ignore
        const SmilesDrawerModule = await import("smiles-drawer");
        const SmilesDrawer = SmilesDrawerModule.default || SmilesDrawerModule;

        // Handle `smiles-drawer` v2 and v1 logic
        if (typeof SmilesDrawer === "function" || (SmilesDrawer && typeof SmilesDrawer.Drawer === "undefined")) {
          const SmiConstructor = typeof SmilesDrawer === "function" ? SmilesDrawer : SmilesDrawer.default || SmilesDrawer;
          const drawer = new SmiConstructor({ width, height });
          drawer.draw(smiles, canvas, theme);
        } 
        // Handle `smiles-drawer` v1 API style
        else if (SmilesDrawer && SmilesDrawer.Drawer) {
          const drawer = new SmilesDrawer.Drawer({ width, height });
          SmilesDrawer.parse(
            smiles,
            (tree: any) => {
              drawer.draw(tree, canvas, theme, false);
            },
            (err: any) => {
              setError("Invalid SMILES structure.");
              console.error("SMILES Parse Error", err);
            }
          );
        }
      } catch (err: any) {
        console.error("SMILES Draw Error", err);
        setError("Failed to draw chemical structure.");
      }
    })();
  }, [smiles, theme, width, height]);

  return (
    <div className="my-4 flex flex-col items-center bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden w-fit p-4">
      {error && (
        <div className="absolute bg-red-50 text-red-500 text-xs px-2 py-1 rounded">
          {error}
        </div>
      )}
      <canvas ref={canvasRef} width={width} height={height} className="max-w-full" />
      <div className="w-full mt-3 pt-3 border-t border-gray-50 flex items-center justify-between px-2">
        <span className="text-xs font-mono text-gray-400 truncate max-w-[200px]">
          {smiles}
        </span>
        <div className="text-[10px] font-bold text-blue-500 uppercase tracking-wider bg-blue-50 px-2 py-0.5 rounded-full">
          Molecule
        </div>
      </div>
    </div>
  );
}
