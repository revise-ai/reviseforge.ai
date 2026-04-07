"use client";

import React from "react";

const Integrations = () => {
  return (
    <section className="py-24 bg-[#F8FAFF] relative overflow-hidden border-t border-b border-[#E0E7FF]">
      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-sm font-bold tracking-widest text-blue-600 uppercase mb-3">
            Seamless Workflow
          </h2>
          <h3 className="text-3xl md:text-5xl font-extrabold text-gray-900 mb-4 tracking-tight">
            Connects with your entire <br className="hidden sm:block" /> academic stack.
          </h3>
          <p className="text-gray-500 max-w-2xl mx-auto text-lg">
            Pull lectures from Zoom, import readings from Google Drive, and push your AI-generated summaries directly to Notion.
          </p>
        </div>

        {/* Integration Graphic Container */}
        <div className="relative max-w-4xl mx-auto h-[350px] sm:h-[450px] flex items-center justify-center mt-10">
          
          {/* Connecting Lines (Background SVG) */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
             <svg width="100%" height="100%" viewBox="0 0 800 400" className="absolute opacity-30">
               {/* Lines radiating from center (400, 200) */}
               <path d="M400 200 L200 100" stroke="#3B82F6" strokeWidth="2.5" strokeDasharray="6,6" fill="none" className="animate-[pulse_3s_ease-in-out_infinite]" />
               <path d="M400 200 L600 100" stroke="#3B82F6" strokeWidth="2.5" strokeDasharray="6,6" fill="none" className="animate-[pulse_3s_ease-in-out_infinite]" style={{ animationDelay: '0.5s' }} />
               <path d="M400 200 L200 300" stroke="#3B82F6" strokeWidth="2.5" strokeDasharray="6,6" fill="none" className="animate-[pulse_3s_ease-in-out_infinite]" style={{ animationDelay: '1s' }} />
               <path d="M400 200 L600 300" stroke="#3B82F6" strokeWidth="2.5" strokeDasharray="6,6" fill="none" className="animate-[pulse_3s_ease-in-out_infinite]" style={{ animationDelay: '1.5s' }} />
               <path d="M400 200 L400 40" stroke="#3B82F6" strokeWidth="2.5" strokeDasharray="6,6" fill="none" className="animate-[pulse_3s_ease-in-out_infinite]" style={{ animationDelay: '2s' }} />
             </svg>
          </div>

          {/* Central Hub (ReviseForge) */}
          <div className="relative z-20 w-32 h-32 sm:w-40 sm:h-40 bg-white rounded-full shadow-2xl flex items-center justify-center border-[6px] border-blue-50 group">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-[1.5rem] overflow-hidden flex items-center justify-center bg-[#131314] shadow-inner transform transition-transform group-hover:scale-105">
               <img src="/assets/reviseforge-icon-only.png" alt="ReviseForge Logo" className="w-12 h-12 sm:w-14 sm:h-14 object-contain" />
            </div>
            {/* Ambient Glow */}
            <div className="absolute inset-0 rounded-full shadow-[0_0_60px_rgba(59,130,246,0.4)] pointer-events-none animate-pulse"></div>
          </div>

          {/* Satellites */}
          {/* Top Left: Google Drive (Pull) */}
          <div className="absolute top-[60px] left-[15%] sm:top-[80px] sm:left-[20%] z-10 w-16 h-16 sm:w-20 sm:h-20 bg-white rounded-2xl shadow-xl flex flex-col items-center justify-center border border-gray-100 hover:scale-110 hover:-translate-y-2 transition-all cursor-default">
             <div className="w-6 h-6 sm:w-8 sm:h-8 bg-[#0F9D58]/10 rounded-full flex items-center justify-center mb-1">
                 <span className="font-black text-[#0F9D58] text-[10px] sm:text-xs">GD</span>
             </div>
             <span className="font-semibold text-gray-500 text-[9px] sm:text-[10px]">Drive</span>
          </div>

          {/* Top Right: Zoom (Pull) */}
          <div className="absolute top-[60px] right-[15%] sm:top-[80px] sm:right-[20%] z-10 w-16 h-16 sm:w-20 sm:h-20 bg-white rounded-2xl shadow-xl flex flex-col items-center justify-center border border-gray-100 hover:scale-110 hover:-translate-y-2 transition-all cursor-default">
             <div className="w-6 h-6 sm:w-8 sm:h-8 bg-[#2D8CFF]/10 rounded-full flex items-center justify-center mb-1">
                 <span className="font-black text-[#2D8CFF] text-[10px] sm:text-xs">ZM</span>
             </div>
             <span className="font-semibold text-gray-500 text-[9px] sm:text-[10px]">Zoom</span>
          </div>

          {/* Bottom Left: Canvas (Pull) */}
          <div className="absolute bottom-[60px] left-[15%] sm:bottom-[80px] sm:left-[20%] z-10 w-16 h-16 sm:w-20 sm:h-20 bg-white rounded-2xl shadow-xl flex flex-col items-center justify-center border border-gray-100 hover:scale-110 hover:translate-y-2 transition-all cursor-default">
             <div className="w-6 h-6 sm:w-8 sm:h-8 bg-[#E72429]/10 rounded-full flex items-center justify-center mb-1">
                 <span className="font-black text-[#E72429] text-[10px] sm:text-xs">CV</span>
             </div>
             <span className="font-semibold text-gray-500 text-[9px] sm:text-[10px]">Canvas</span>
          </div>

          {/* Bottom Right: Notion (Push) */}
          <div className="absolute bottom-[60px] right-[15%] sm:bottom-[80px] sm:right-[20%] z-10 w-16 h-16 sm:w-20 sm:h-20 bg-white rounded-2xl shadow-xl flex flex-col items-center justify-center border border-gray-100 hover:scale-110 hover:translate-y-2 transition-all cursor-default">
             <div className="w-6 h-6 sm:w-8 sm:h-8 bg-black/5 rounded-full flex items-center justify-center mb-1">
                 <span className="font-black text-black text-[10px] sm:text-xs">N</span>
             </div>
             <span className="font-semibold text-gray-500 text-[9px] sm:text-[10px]">Notion</span>
          </div>

          {/* Top Center: Quizlet/Anki (Push) */}
          <div className="absolute top-[0px] sm:top-[20px] left-1/2 transform -translate-x-1/2 z-10 w-16 h-16 sm:w-20 sm:h-20 bg-white rounded-2xl shadow-xl flex flex-col items-center justify-center border border-gray-100 hover:scale-110 hover:-translate-y-2 transition-all cursor-default">
             <div className="w-6 h-6 sm:w-8 sm:h-8 bg-[#4255ff]/10 rounded-full flex items-center justify-center mb-1">
                 <span className="font-black text-[#4255ff] text-[10px] sm:text-xs">QZ</span>
             </div>
             <span className="font-semibold text-gray-500 text-[9px] sm:text-[10px]">Quizlet</span>
          </div>

        </div>
      </div>
    </section>
  );
};

export default Integrations;
