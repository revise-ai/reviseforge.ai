"use client";

import React, { useState } from "react";

export default function IntegrationPage() {
  const [activeIntegration, setActiveIntegration] = useState<"gdrive" | "zoom" | "notion" | "canvas" | "dropbox" | "gmail" | "meet" | "docs" | "slides" | "teams" | "word" | "sheets" | null>(null);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [rating, setRating] = useState(0);

  const integrations = [
    {
      id: "gdrive" as const,
      name: "Google Drive",
      slug: "Google-drive",
      provider: "ReviseForge",
      description: "Seamlessly backup generated notes, flashcards, and pull source materials.",
      headerSubtitle: "Effortlessly connect your cloud storage with your study workspace.",
      overview: "Link your Google Drive account to easily upload PDFs, lecture slides, and notes into ReviseForge for instant analysis. You can also configure it to automatically backup your generated summaries and flashcards to a secure Google Drive folder.",
      features: [
        "Pull assigned readings and lecture slides seamlessly into ReviseForge",
        "Automatically backup all generated study guides and flashcards",
        "Keep your entire academic workspace perfectly synchronized"
      ],
      icon: (
        <svg viewBox="0 0 87.3 78" className="w-[52px] h-[52px]" xmlns="http://www.w3.org/2000/svg">
          <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
          <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0 -1.2 4.5h27.5z" fill="#00ac47"/>
          <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335"/>
          <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d"/>
          <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc"/>
          <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 27h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00"/>
        </svg>
      ),
      cardIcon: (
        <svg viewBox="0 0 87.3 78" className="w-7 h-7" xmlns="http://www.w3.org/2000/svg">
          <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
          <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0 -1.2 4.5h27.5z" fill="#00ac47"/>
          <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335"/>
          <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d"/>
          <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc"/>
          <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 27h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00"/>
        </svg>
      )
    },
    {
      id: "zoom" as const,
      name: "Zoom",
      slug: "Zoom",
      provider: "ReviseForge",
      description: "Automatically capture, transcribe, and generate study notes for lectures.",
      headerSubtitle: "Automatically capture and transcribe Zoom lectures.",
      overview: "Connect your Zoom account to automatically fetch, transcribe, and analyze class recordings. Turn long lectures into concise notes and interactive quizzes immediately after class.",
      features: [
        "Automatically pull cloud recordings from your Zoom account",
        "Generate intelligent summaries of your professors' lectures",
        "Create instant flashcards from verbal discussions"
      ],
      icon: (
        <div className="w-[52px] h-[52px] rounded-full bg-[#2D8CFF] flex items-center justify-center">
          <svg className="w-8 h-8 ml-[-1px]" viewBox="0 0 24 24" fill="none">
            <path d="M16 10.5V8.5C16 7.67 15.33 7 14.5 7H5.5C4.67 7 4 7.67 4 8.5V15.5C4 16.33 4.67 17 5.5 17H14.5C15.33 17 16 16.33 16 15.5V13.5L20 16V8L16 10.5Z" fill="white"/>
          </svg>
        </div>
      ),
      cardIcon: (
        <div className="w-7 h-7 rounded-full bg-[#2D8CFF] flex items-center justify-center">
          <svg className="w-4 h-4 ml-[-1px]" viewBox="0 0 24 24" fill="none">
            <path d="M16 10.5V8.5C16 7.67 15.33 7 14.5 7H5.5C4.67 7 4 7.67 4 8.5V15.5C4 16.33 4.67 17 5.5 17H14.5C15.33 17 16 16.33 16 15.5V13.5L20 16V8L16 10.5Z" fill="white"/>
          </svg>
        </div>
      )
    },
    {
      id: "notion" as const,
      name: "Notion",
      slug: "Notion",
      provider: "ReviseForge",
      description: "Search, access, and pull your private Notion study databases.",
      headerSubtitle: "Pull study notes directly from your Notion workspace.",
      overview: "Sync your Notion workspace with ReviseForge to seamlessly access your text notes and convert them into adaptive learning tools.",
      features: [
        "Import pages and nested pages securely",
        "Transform written notes into flashcards and quizzes",
        "Sync updates directly from your workspace"
      ],
      icon: (
        <div className="w-[52px] h-[52px] flex items-center justify-center p-1">
          <span className="text-[52px] font-black font-serif text-black leading-none">N</span>
        </div>
      ),
      cardIcon: (
        <span className="text-[28px] font-black font-serif text-black leading-none ml-0.5">N</span>
      )
    },
    {
      id: "canvas" as const,
      name: "Canvas LMS",
      slug: "Canvas",
      provider: "ReviseForge",
      description: "Sync assignments and extract PDF readings directly from Canvas LMS.",
      headerSubtitle: "Deep integration with your Canvas LMS student account.",
      overview: "Connect ReviseForge to Canvas LMS to automatically track your assignments, download readings, and generate targeted study material for upcoming exams.",
      features: [
        "Automatically sync upcoming assignment deadlines",
        "Pull syllabus and reading PDFs directly into your dashboard",
        "Organize study materials by course and module"
      ],
      icon: (
        <div className="w-[52px] h-[52px] rounded-full bg-[#E72429] flex items-center justify-center">
          <span className="text-[20px] font-black text-white leading-none pt-0.5">CV</span>
        </div>
      ),
      cardIcon: (
        <div className="w-7 h-7 rounded-full bg-[#E72429] flex items-center justify-center pt-0.5">
          <span className="text-[12px] font-black text-white leading-none">CV</span>
        </div>
      )
    },
    {
      id: "dropbox" as const,
      name: "Dropbox",
      slug: "Dropbox",
      provider: "ReviseForge",
      description: "Securely sync study documents and research papers from your Dropbox folders.",
      headerSubtitle: "Sync your research and document library.",
      overview: "Integrate your Dropbox folders with ReviseForge to automatically analyze synchronized research papers and academic drafts.",
      features: [
        "Direct folder-to-session synchronization",
        "Auto-upload research PDF documents",
        "Maintain document versioning for study notes"
      ],
      icon: (
        <svg viewBox="0 0 24 24" className="w-[52px] h-[52px]" fill="#0061FF" xmlns="http://www.w3.org/2000/svg">
          <path d="M6 2L12 6L6 10L0 6L6 2ZM18 2L24 6L18 10L12 6L18 2ZM6 10L12 14L6 18L0 14L6 10ZM18 10L24 14L18 18L12 14L18 10ZM12 15L18 19L12 23L6 19L12 15Z"/>
        </svg>
      ),
      cardIcon: (
        <svg viewBox="0 0 24 24" className="w-7 h-7" fill="#0061FF" xmlns="http://www.w3.org/2000/svg">
          <path d="M6 2L12 6L6 10L0 6L6 2ZM18 2L24 6L18 10L12 6L18 2ZM6 10L12 14L6 18L0 14L6 10ZM18 10L24 14L18 18L12 14L18 10ZM12 15L18 19L12 23L6 19L12 15Z"/>
        </svg>
      )
    },
    {
      id: "gmail" as const,
      name: "Gmail",
      slug: "Gmail",
      provider: "ReviseForge",
      description: "Import academic newsletters, feedback, and course updates from your inbox.",
      headerSubtitle: "Digest course updates from your inbox.",
      overview: "Sync your academic Gmail account to extract important lecture summaries, professor emails, and course notifications directly into study guides.",
      features: [
        "Extract course material from attachments",
        "Summarize academic newsletters",
        "Auto-organize professor feedback"
      ],
      icon: (
        <svg viewBox="0 0 24 24" className="w-[52px] h-[52px]" xmlns="http://www.w3.org/2000/svg">
          <path d="M24 4.5v15c0 .85-.65 1.5-1.5 1.5H21V7.38l-9 5.62-9-5.62V21H1.5c-.85 0-1.5-.65-1.5-1.5v-15c0-.85.65-1.5 1.5-1.5H3l9 5.62L21 3h1.5c.85 0 1.5.65 1.5 1.5z" fill="#EA4335"/>
        </svg>
      ),
      cardIcon: (
        <svg viewBox="0 0 24 24" className="w-7 h-7" xmlns="http://www.w3.org/2000/svg">
          <path d="M24 4.5v15c0 .85-.65 1.5-1.5 1.5H21V7.38l-9 5.62-9-5.62V21H1.5c-.85 0-1.5-.65-1.5-1.5v-15c0-.85.65-1.5 1.5-1.5H3l9 5.62L21 3h1.5c.85 0 1.5.65 1.5 1.5z" fill="#EA4335"/>
        </svg>
      )
    },
    {
      id: "meet" as const,
      name: "Google Meet",
      slug: "Google-Meet",
      provider: "ReviseForge",
      description: "Automatically capture meeting transcripts and generate context-aware notes.",
      headerSubtitle: "Capture discussion-based learning.",
      overview: "Connect Google Meet to record and analyze seminars, study groups, and office hours. Never miss a detail from verbal academic discussions.",
      features: [
        "Real-time transcription for active sessions",
        "Participant-based highlights and notes",
        "Integration with Google Calendar for scheduled classes"
      ],
      icon: (
        <svg viewBox="0 0 24 24" className="w-[52px] h-[52px]" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M15 12.5V9c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v6c0 .55.45 1 1 1h10c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z" fill="#00AC47"/>
        </svg>
      ),
      cardIcon: (
        <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M15 12.5V9c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v6c0 .55.45 1 1 1h10c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z" fill="#00AC47"/>
        </svg>
      )
    },
    {
      id: "docs" as const,
      name: "Google Docs",
      slug: "Google-Docs",
      provider: "ReviseForge",
      description: "Live sync your collaborative study documents and convert them into flashcards.",
      headerSubtitle: "Seamlessly analyze collaborative notes.",
      overview: "Link your Google Docs to pull collaborative writing, essay drafts, and group notes into the ReviseForge AI engine for structure analysis.",
      features: [
        "Live sync between Doc and Study Session",
        "Import revision history for deep learning",
        "Convert doc headers into quiz sections"
      ],
      icon: (
        <svg viewBox="0 0 24 24" className="w-[52px] h-[52px]" fill="#4285F4" xmlns="http://www.w3.org/2000/svg">
          <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
        </svg>
      ),
      cardIcon: (
        <svg viewBox="0 0 24 24" className="w-7 h-7" fill="#4285F4" xmlns="http://www.w3.org/2000/svg">
          <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
        </svg>
      )
    },
    {
      id: "slides" as const,
      name: "Google Slides",
      slug: "Google-Slides",
      provider: "ReviseForge",
      description: "Import lecture presentations and generate slide-by-slide summaries.",
      headerSubtitle: "Master presentation content instantly.",
      overview: "Fetch slide decks from your professor and generate concise explanations for every slide, complete with visual context markers.",
      features: [
        "Slide-by-slide content extraction",
        "Automatic diagram-to-text conversion",
        "Flashcard generation from key bullet points"
      ],
      icon: (
        <svg viewBox="0 0 24 24" className="w-[52px] h-[52px]" fill="#FBBC04" xmlns="http://www.w3.org/2000/svg">
          <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
        </svg>
      ),
      cardIcon: (
        <svg viewBox="0 0 24 24" className="w-7 h-7" fill="#FBBC04" xmlns="http://www.w3.org/2000/svg">
          <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
        </svg>
      )
    },
    {
      id: "teams" as const,
      name: "Microsoft Teams",
      slug: "Teams",
      provider: "ReviseForge",
      description: "Sync study group chats and meeting recordings for instant analysis.",
      headerSubtitle: "Connect your academic collaboration hub.",
      overview: "Import conversations and lecture recordings from your institutional Microsoft Teams account to keep all collaborative learning in one place.",
      features: [
        "Message-to-Note transformation",
        "Recording transcription and summary",
        "Shared channel document extraction"
      ],
      icon: (
        <div className="w-[52px] h-[52px] bg-[#6264A7] rounded-[10px] flex items-center justify-center pt-0.5">
          <span className="text-white font-black text-2xl">T</span>
        </div>
      ),
      cardIcon: (
        <div className="w-7 h-7 bg-[#6264A7] rounded-[6px] flex items-center justify-center pt-0.5">
          <span className="text-white font-black text-[14px]">T</span>
        </div>
      )
    },
    {
      id: "word" as const,
      name: "Microsoft Word",
      slug: "Word",
      provider: "ReviseForge",
      description: "Analyze your thesis drafts and research papers with AI-powered insights.",
      headerSubtitle: "Deep analysis for your written work.",
      overview: "Import .docx files to check for academic consistency, generate references, and create comprehensive study summaries for your long-form writing.",
      features: [
        "Academic tone and structure analysis",
        "Bibliography and citation extraction",
        "Structural outlining based on content"
      ],
      icon: (
        <div className="w-[52px] h-[52px] bg-[#2B579A] rounded-[10px] flex items-center justify-center pt-0.5">
          <span className="text-white font-black text-2xl">W</span>
        </div>
      ),
      cardIcon: (
        <div className="w-7 h-7 bg-[#2B579A] rounded-[6px] flex items-center justify-center pt-0.5">
          <span className="text-white font-black text-[14px]">W</span>
        </div>
      )
    },
    {
      id: "sheets" as const,
      name: "Google Sheets",
      slug: "Google-Sheets",
      provider: "ReviseForge",
      description: "Transform data-heavy spreadsheets into clear academic explanations.",
      headerSubtitle: "Analyze data-based study material.",
      overview: "Sync your Google Sheets to explain complex datasets, generate study questions from rows, and understand academic data tables.",
      features: [
        "Table-to-Text explanation logic",
        "Data-driven quiz generation",
        "Sync updates for research spreadsheets"
      ],
      icon: (
        <svg viewBox="0 0 24 24" className="w-[52px] h-[52px]" fill="#0F9D58" xmlns="http://www.w3.org/2000/svg">
          <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
        </svg>
      ),
      cardIcon: (
        <svg viewBox="0 0 24 24" className="w-7 h-7" fill="#0F9D58" xmlns="http://www.w3.org/2000/svg">
          <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
        </svg>
      )
    }
  ];

  const renderIntegrationDetail = () => {
    const integration = integrations.find(i => i.id === activeIntegration);
    if (!integration) return null;

    return (
      <div className="flex-1 overflow-y-auto w-full bg-white relative">
        {/* Breadcrumb Top Header */}
        <div className="sticky top-0 z-20 bg-white border-b border-gray-100 flex items-center px-8 py-4">
           <button 
             onClick={() => setActiveIntegration(null)} 
             className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-800 transition-colors cursor-pointer"
           >
             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
             Integrations
           </button>
           <span className="text-gray-300 mx-2 text-sm">/</span>
           <span className="text-sm font-medium text-gray-800">{integration.slug}</span>
        </div>

        <div className="max-w-[800px] mx-auto px-8 py-12 relative">
           
           {/* Title Block */}
           <div className="flex items-start justify-between mb-12">
              <div className="flex items-center gap-6">
                 <div className="w-14 h-14 flex items-center justify-center shrink-0">
                    {integration.icon}
                 </div>
                 <div>
                    <h2 className="text-[22px] font-bold text-gray-900 mb-1 leading-tight">{integration.name}</h2>
                    <p className="text-[14px] text-gray-500 max-w-[400px] leading-snug">{integration.headerSubtitle}</p>
                 </div>
              </div>
              
              <button className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-[8px] font-medium transition-all shadow-sm active:scale-95 cursor-pointer text-[13.5px]">
                Connect
              </button>
           </div>

           {/* Content Body */}
           <div className="max-w-[650px]">
              <h3 className="text-[14px] font-bold text-gray-900 mb-3">Overview</h3>
              <p className="text-[14px] text-gray-600 mb-10 leading-relaxed">
                {integration.overview}
              </p>

              <h3 className="text-[14px] font-bold text-gray-900 mb-5">With {integration.name} + ReviseForge, you can:</h3>
              
              <div className="space-y-4 mb-14 border-b border-white pb-8">
                {integration.features.map((feature, idx) => (
                  <div key={idx} className="flex items-center gap-3.5">
                    <div className="w-5 h-5 rounded-full bg-blue-50/80 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <p className="text-[14px] text-gray-600">{feature}</p>
                  </div>
                ))}
              </div>

              <button 
                onClick={() => setIsFeedbackOpen(true)}
                className="text-blue-500 font-medium text-[13px] flex items-center gap-2 hover:text-blue-600 hover:underline cursor-pointer transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                Share Feedback
              </button>
           </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 w-full bg-white min-h-screen flex flex-col pt-2 relative">
      {/* Top Header */}
      {!activeIntegration && (
        <>
          <div className="sticky top-0 z-30 bg-white border-b border-gray-100 flex items-center justify-between px-8 py-3.5">
            <h1 className="text-[15px] font-medium text-gray-800 tracking-wide">Integrations</h1>
            
            {/* Search Bar */}
            <div className="flex-1 max-w-[450px] mx-6 relative">
              <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input 
                type="text" 
                placeholder="Search by title or keyword" 
                className="w-full bg-gray-50/50 border border-gray-100 rounded-[8px] py-2 pl-10 pr-4 text-[13px] text-gray-700 placeholder-gray-400 focus:outline-none focus:bg-white focus:border-blue-200 transition-all shadow-sm"
              />
            </div>
            <div className="w-[100px]" /> {/* Spacer for alignment */}
          </div>
          
          {/* Content Grid */}
          <div className="flex-1 overflow-y-auto px-8 py-10 fade-in duration-300">
            <div className="max-w-[1400px] mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {integrations.map((integration, index) => (
                <div 
                  key={index}
                  onClick={() => integration.id && setActiveIntegration(integration.id)}
                  className="bg-white border border-gray-100 hover:border-gray-200 hover:shadow-[0_4px_12px_rgba(0,0,0,0.05)] transition-all duration-200 rounded-[10px] p-6 flex flex-col cursor-pointer group h-[200px]"
                >
                  <div className="flex items-center gap-3 mb-4">
                    {integration.cardIcon}
                  </div>
                  <h3 className="text-[15px] font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                    {integration.name}
                  </h3>
                  <p className="text-[13px] text-gray-400 mt-0.5 mb-4">
                    {integration.provider}
                  </p>
                  <p className="text-[13px] text-gray-500 leading-relaxed line-clamp-3">
                    {integration.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Render the details view if an integration is selected */}
      {activeIntegration && renderIntegrationDetail()}

      {/* Share Feedback Modal */}
      {isFeedbackOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[100] p-4 backdrop-blur-sm shadow-2xl">
          <div className="bg-white rounded-[16px] shadow-2xl w-full max-w-[550px] overflow-hidden animate-in fade-in zoom-in-[0.98] duration-200">
             {/* Modal Header */}
             <div className="flex items-center justify-between px-6 pt-5 pb-2">
                <h2 className="text-[16px] font-bold text-gray-900">Share Feedback</h2>
                <button 
                  onClick={() => setIsFeedbackOpen(false)} 
                  className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer p-1"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
             </div>

             {/* Modal Body */}
             <div className="px-6 py-4 max-h-[80vh] overflow-y-auto">
                <p className="text-[14px] text-gray-600 leading-relaxed mb-4">
                  Share your thoughts with us! We deeply appreciate your insights to help make ReviseForge even better.
                </p>

                <p className="text-[14px] text-gray-500 mb-6">
                  Need support? <button className="text-[#6366f1] hover:text-indigo-600 font-medium cursor-pointer">Contact our team</button>
                </p>

                {/* Form Elements */}
                <div className="space-y-5">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[13.5px] font-medium text-gray-800">Type:</label>
                    <div className="relative">
                       <select className="w-full appearance-none bg-white border border-gray-200 rounded-[8px] px-3 py-2 text-[14px] text-gray-800 focus:outline-none focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1] cursor-pointer shadow-sm">
                         <option>I want to share something I liked</option>
                         <option>I have a suggestion for an improvement</option>
                         <option>I encountered a bug or issue</option>
                       </select>
                       <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[13.5px] font-medium text-gray-800">Category:</label>
                    <div className="relative">
                       <select className="w-full appearance-none bg-white border border-gray-200 rounded-[8px] px-3 py-2 text-[14px] text-gray-800 focus:outline-none focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1] cursor-pointer shadow-sm">
                         <option>Integrations</option>
                         <option>Dashboard</option>
                         <option>AI Summaries</option>
                         <option>Other</option>
                       </select>
                       <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 pt-1">
                    <label className="text-[13.5px] font-medium text-gray-800">Rate your experience:</label>
                    <div className="flex items-center gap-1">
                       {[1, 2, 3, 4, 5].map((star) => (
                         <button 
                           key={star}
                           onClick={() => setRating(star)}
                           onMouseEnter={() => setRating(star)}
                           className="text-gray-300 hover:text-yellow-400 focus:outline-none cursor-pointer p-0.5 transition-colors"
                         >
                           <svg className={`w-5 h-5 ${star <= rating ? "text-yellow-400 fill-current" : "fill-none stroke-current"}`} viewBox="0 0 24 24" strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round">
                             <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                           </svg>
                         </button>
                       ))}
                    </div>
                  </div>

                  <div className="pt-2">
                    <textarea 
                      placeholder="Share anything you would like..." 
                      className="w-full bg-white border border-gray-200 rounded-[8px] px-3 py-2.5 text-[14px] text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1] min-h-[100px] resize-y shadow-sm"
                    />
                  </div>
                </div>
             </div>

             {/* Modal Footer */}
             <div className="px-6 py-4 flex items-center justify-end gap-3 bg-white mt-2">
               <button 
                 onClick={() => setIsFeedbackOpen(false)}
                 className="px-4 py-2 text-[13.5px] font-semibold text-gray-600 bg-white hover:bg-gray-50 rounded-[8px] transition-colors cursor-pointer"
               >
                 Cancel
               </button>
               <button 
                 onClick={() => setIsFeedbackOpen(false)}
                 className="px-6 py-2 text-[13.5px] font-medium text-white bg-[#6366f1] hover:bg-indigo-600 shadow-sm rounded-[8px] transition-all active:scale-95 cursor-pointer disabled:bg-[#f3f4f6] disabled:text-gray-400 disabled:shadow-none disabled:active:scale-100 disabled:cursor-not-allowed"
                 disabled={rating === 0}
               >
                 Submit
               </button>
             </div>
          </div>
        </div>
      )}

    </div>
  );
}
