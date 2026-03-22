"use client";

import React, { useState } from "react";

interface TextCardData {
  id: number;
  logo: string;
  rating: number;
  quote: string;
  highlightedPart: string;
  name: string;
  school: string;
}

interface VideoCardData {
  id: number;
  name: string;
  role: string;
  school: string;
  followers: string;
  rating: number;
  videoUrl: string;
  thumbnail: string;
}

const textCards: TextCardData[] = [
  {
    id: 1,
    logo: "AO",
    rating: 5,
    quote: "ReviseForge completely changed how I prepare for exams. I recorded my lecturer and within minutes had a full summary, quiz and flashcards. I went from struggling to top of my class.",
    highlightedPart: "I went from struggling to top of my class.",
    name: "Ama Owusu",
    school: "University of Ghana, Legon",
  },
  {
    id: 2,
    logo: "KM",
    rating: 5,
    quote: "The @ReviseForge feature in our study group is insane. Someone drops a past question and the AI answers it for everyone. It's like having a private tutor in the group chat.",
    highlightedPart: "It's like having a private tutor in the group chat.",
    name: "Kofi Mensah",
    school: "KNUST",
  },
  {
    id: 3,
    logo: "ZA",
    rating: 5,
    quote: "I used to spend hours re-watching lecture recordings. Now I paste the YouTube link and get chapters, transcripts and a quiz instantly. Saves me so much time before exams.",
    highlightedPart: "Saves me so much time before exams.",
    name: "Zara Ahmed",
    school: "University of Cape Town",
  },
  {
    id: 4,
    logo: "EB",
    rating: 5,
    quote: "The flashcard feature is genuinely the best study tool I have used. It picks out key terms automatically and I can flip through them on my phone anywhere.",
    highlightedPart: "The best study tool I have used.",
    name: "Emmanuel Boateng",
    school: "University of Lagos",
  },
  {
    id: 5,
    logo: "TN",
    rating: 5,
    quote: "Absolutely worth it. The AI summaries save me hours every week and the exam mode helped me pass my finals.",
    highlightedPart: "Absolutely worth it.",
    name: "Tunde Nwosu",
    school: "University of Ibadan",
  },
];

const videoCards: VideoCardData[] = [
  {
    id: 1,
    name: "Sarah K.",
    role: "Medical Student",
    school: "University of Edinburgh",
    followers: "2.1K followers",
    rating: 5,
    thumbnail: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=600&h=800&fit=crop",
    videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4",
  },
  {
    id: 2,
    name: "James O.",
    role: "Engineering Student",
    school: "MIT",
    followers: "1.8K followers",
    rating: 5,
    thumbnail: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=500&fit=crop",
    videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4",
  },
  {
    id: 3,
    name: "Priya S.",
    role: "Law Student",
    school: "University of Oxford",
    followers: "3.2K followers",
    rating: 5,
    thumbnail: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&h=500&fit=crop",
    videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4",
  },
];

function StarIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="#FACC15" stroke="#FACC15" strokeWidth="1">
      <path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z" />
    </svg>
  );
}

function TextCard({ card }: { card: TextCardData }) {
  const parts = card.quote.split(card.highlightedPart);
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-end mb-3">
        <div className="flex items-center gap-1">
          <span className="text-sm font-semibold text-gray-700">{card.rating}.0</span>
          <StarIcon />
        </div>
      </div>
      <p className="text-sm text-gray-600 leading-relaxed mb-4">
        &ldquo;{parts[0]}
        <span className="text-blue-600 font-medium">{card.highlightedPart}</span>
        {parts[1]}&rdquo;
      </p>
      <div>
        <p className="text-sm font-semibold text-gray-800">{card.name}</p>
        <p className="text-xs text-gray-400">{card.school}</p>
      </div>
    </div>
  );
}

function VideoCard({ card, height }: { card: VideoCardData; height: string }) {
  const [playing, setPlaying] = useState(false);
  const videoRef = React.useRef<HTMLVideoElement>(null);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (playing) {
      videoRef.current.pause();
      setPlaying(false);
    } else {
      videoRef.current.play();
      setPlaying(true);
    }
  };

  return (
    <div className={`relative rounded-2xl overflow-hidden ${height} bg-gray-900 cursor-pointer`} onClick={togglePlay}>
      {/* Thumbnail always behind */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={card.thumbnail}
        alt={card.name}
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${playing ? "opacity-0" : "opacity-100"}`}
      />

      {/* Video — no controls */}
      <video
        ref={videoRef}
        src={card.videoUrl}
        className="w-full h-full object-cover"
        onEnded={() => setPlaying(false)}
        playsInline
      />

      {/* Dark overlay — hidden when playing */}
      <div className={`absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent transition-opacity duration-300 ${playing ? "opacity-0" : "opacity-100"}`} />

      {/* Play / Pause button */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className={`w-12 h-12 rounded-full bg-white/90 flex items-center justify-center shadow-lg hover:bg-white hover:scale-105 transition-all ${playing ? "opacity-0 hover:opacity-100" : "opacity-100"}`}>
          {playing ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="#111">
              <rect x="6" y="4" width="4" height="16" rx="1" />
              <rect x="14" y="4" width="4" height="16" rx="1" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#111" className="ml-0.5">
              <path d="M5 3l14 9-14 9V3z" />
            </svg>
          )}
        </div>
      </div>

      {/* Bottom info — hidden when playing */}
      <div className={`absolute bottom-0 left-0 right-0 p-4 pointer-events-none transition-opacity duration-300 ${playing ? "opacity-0" : "opacity-100"}`}>
        <div className="flex items-center gap-1.5 mb-0.5">
          <p className="text-white font-semibold text-sm">{card.name}</p>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="#60a5fa">
            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p className="text-white/70 text-xs">{card.role}</p>
        <div className="flex items-center gap-1.5 mt-1.5">
          <span className="text-white/50 text-[11px]">{card.school}</span>
          <span className="text-white/30 text-[11px]">•</span>
          <span className="text-white/50 text-[11px]">{card.followers}</span>
        </div>
        <div className="flex gap-0.5 mt-1">
          {Array.from({ length: card.rating }).map((_, i) => (
            <StarIcon key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Testimonials() {
  return (
    <section className="bg-[#f8f9fb] py-20 px-4">
      {/* Header */}
      <div className="text-center mb-12">
       
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3 tracking-tight">
          What Students Are Saying
        </h2>
        <p className="text-gray-400 text-base max-w-md mx-auto">
          Real results from students using ReviseForge every day.
        </p>
      </div>

      {/* 3-column masonry grid */}
      <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4 items-start">

        {/* Column 1 */}
        <div className="flex flex-col gap-4">
          <TextCard card={textCards[0]} />
          <VideoCard card={videoCards[1]} height="h-[320px]" />
          <TextCard card={textCards[2]} />
        </div>

        {/* Column 2 — large video centre */}
        <div className="flex flex-col gap-4">
          <VideoCard card={videoCards[0]} height="h-[440px]" />
          <TextCard card={textCards[1]} />
        </div>

        {/* Column 3 */}
        <div className="flex flex-col gap-4">
          <TextCard card={textCards[3]} />
          <VideoCard card={videoCards[2]} height="h-[350px]" />
          <TextCard card={textCards[4]} />
        </div>

      </div>
    </section>
  );
}