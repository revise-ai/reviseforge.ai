// "use client";

// import { useState } from "react";

// // ─── Types ────────────────────────────────────────────────────────────────────

// type ActivityType = "flashcard" | "quiz" | "recording" | "youtube";

// interface HistoryItem {
//   id: number;
//   type: ActivityType;
//   title: string;
//   subtitle: string;
//   date: string;
//   time: string;
//   score?: string;
//   duration?: string;
//   cards?: number;
// }

// // ─── Mock Data ────────────────────────────────────────────────────────────────

// const HISTORY: HistoryItem[] = [
//   { id: 1, type: "quiz", title: "Organic Chemistry — Chapter 4", subtitle: "20 questions · Multiple choice", date: "Today", time: "2:14 PM", score: "85%" },
//   { id: 2, type: "flashcard", title: "Human Anatomy — Skeletal System", subtitle: "34 cards studied", date: "Today", time: "11:02 AM", cards: 34 },
//   { id: 3, type: "youtube", title: "MIT OpenCourseWare — Thermodynamics", subtitle: "youtube.com/watch?v=4i1MUWJoI0U", date: "Yesterday", time: "8:45 PM", duration: "1h 12m" },
//   { id: 4, type: "recording", title: "Lecture — Macroeconomics Week 6", subtitle: "Audio transcript · 47 min", date: "Yesterday", time: "3:30 PM", duration: "47m" },
//   { id: 5, type: "quiz", title: "World History — Cold War Era", subtitle: "15 questions · Mixed", date: "Mon, Feb 17", time: "10:00 AM", score: "73%" },
//   { id: 6, type: "flashcard", title: "Spanish Vocabulary — Unit 3", subtitle: "52 cards studied", date: "Mon, Feb 17", time: "9:15 AM", cards: 52 },
//   { id: 7, type: "youtube", title: "3Blue1Brown — Linear Algebra Essence", subtitle: "youtube.com/watch?v=kjBOesZCoqc", date: "Sun, Feb 16", time: "7:00 PM", duration: "22m" },
//   { id: 8, type: "recording", title: "Seminar — Bioethics & AI", subtitle: "Audio transcript · 1h 23m", date: "Sat, Feb 15", time: "2:00 PM", duration: "1h 23m" },
//   { id: 9, type: "quiz", title: "Calculus II — Integration by Parts", subtitle: "10 questions · Problem solving", date: "Fri, Feb 14", time: "4:45 PM", score: "90%" },
//   { id: 10, type: "flashcard", title: "French Revolution — Key Figures", subtitle: "28 cards studied", date: "Fri, Feb 14", time: "1:30 PM", cards: 28 },
// ];

// // ─── Config ───────────────────────────────────────────────────────────────────

// const TYPE_CONFIG: Record<ActivityType, { label: string; color: string; dot: string; icon: React.ReactNode }> = {
//   quiz: {
//     label: "Quiz",
//     color: "bg-yellow-50 text-yellow-600 border-yellow-200",
//     dot: "bg-yellow-400",
//     icon: (
//       <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
//         <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
//       </svg>
//     ),
//   },
//   flashcard: {
//     label: "Flashcard",
//     color: "bg-green-50 text-green-600 border-green-200",
//     dot: "bg-green-400",
//     icon: (
//       <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
//         <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
//       </svg>
//     ),
//   },
//   recording: {
//     label: "Recording",
//     color: "bg-sky-50 text-sky-600 border-sky-200",
//     dot: "bg-sky-400",
//     icon: (
//       <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
//         <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
//       </svg>
//     ),
//   },
//   youtube: {
//     label: "YouTube",
//     color: "bg-rose-50 text-rose-500 border-rose-200",
//     dot: "bg-rose-400",
//     icon: (
//       <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
//         <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
//       </svg>
//     ),
//   },
// };

// const FILTERS: { label: string; value: ActivityType | "all" }[] = [
//   { label: "All", value: "all" },
//   { label: "Quizzes", value: "quiz" },
//   { label: "Flashcards", value: "flashcard" },
//   { label: "Recordings", value: "recording" },
//   { label: "YouTube", value: "youtube" },
// ];

// // ─── History Row ──────────────────────────────────────────────────────────────

// function HistoryRow({ item, index }: { item: HistoryItem; index: number }) {
//   const cfg = TYPE_CONFIG[item.type];

//   return (
//     <div
//       className="group flex items-center gap-4 px-5 py-4 bg-white rounded-2xl border border-gray-100 hover:border-blue-100 hover:shadow-sm transition-all duration-200"
//       style={{ animationDelay: `${index * 40}ms` }}
//     >
//       {/* Icon */}
//       <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border ${cfg.color}`}>
//         {cfg.icon}
//       </div>

//       {/* Main content */}
//       <div className="flex-1 min-w-0">
//         <div className="flex items-center gap-2 mb-0.5">
//           <p className="text-sm font-semibold text-gray-800 truncate">{item.title}</p>
//           <span className={`hidden sm:inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border ${cfg.color} shrink-0`}>
//             <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
//             {cfg.label}
//           </span>
//         </div>
//         <p className="text-xs text-gray-400 truncate">{item.subtitle}</p>
//       </div>

//       {/* Stats */}
//       <div className="hidden sm:flex items-center gap-3 shrink-0">
//         {item.score && (
//           <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-100 rounded-lg px-3 py-1.5">
//             <svg className="w-3.5 h-3.5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
//               <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
//             </svg>
//             <span className="text-xs font-semibold text-blue-600">{item.score}</span>
//           </div>
//         )}
//         {item.cards && (
//           <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5">
//             <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
//               <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
//             </svg>
//             <span className="text-xs font-medium text-gray-500">{item.cards} cards</span>
//           </div>
//         )}
//         {item.duration && (
//           <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5">
//             <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
//               <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
//             </svg>
//             <span className="text-xs font-medium text-gray-500">{item.duration}</span>
//           </div>
//         )}
//       </div>

//       {/* Date/time */}
//       <div className="text-right shrink-0">
//         <p className="text-xs font-medium text-gray-500">{item.date}</p>
//         <p className="text-[11px] text-gray-300 mt-0.5">{item.time}</p>
//       </div>

//       {/* Arrow on hover */}
//       <div className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
//         <svg className="w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
//           <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
//         </svg>
//       </div>
//     </div>
//   );
// }

// // ─── Page ─────────────────────────────────────────────────────────────────────

// export default function HistoryPage() {
//   const [activeFilter, setActiveFilter] = useState<ActivityType | "all">("all");
//   const [search, setSearch] = useState("");

//   const filtered = HISTORY.filter((item) => {
//     const matchType = activeFilter === "all" || item.type === activeFilter;
//     const matchSearch =
//       item.title.toLowerCase().includes(search.toLowerCase()) ||
//       item.subtitle.toLowerCase().includes(search.toLowerCase());
//     return matchType && matchSearch;
//   });

//   // Group by date
//   const grouped = filtered.reduce<Record<string, HistoryItem[]>>((acc, item) => {
//     if (!acc[item.date]) acc[item.date] = [];
//     acc[item.date].push(item);
//     return acc;
//   }, {});

//   const totalItems = HISTORY.length;
//   const quizCount = HISTORY.filter((i) => i.type === "quiz").length;
//   const flashCount = HISTORY.filter((i) => i.type === "flashcard").length;

//   return (
//     <div className="min-h-screen w-full bg-gray-50">
//       <div className="max-w-4xl mx-auto px-8 py-8">

//       {/* Page header */}
//       <div className="mb-8">
//         <div className="flex items-center gap-3 mb-1">
//           <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0">
//            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//               <path
//                 strokeLinecap="round"
//                 strokeLinejoin="round"
//                 strokeWidth={2}
//                 d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
//               />
//             </svg>
//           </div>
//           <h1 className="text-2xl font-bold text-gray-900 tracking-tight">History</h1>
//         </div>
//         <p className="text-sm text-gray-400 ml-12">Your recent study sessions</p>
//       </div>

//       {/* Stats strip */}
//       <div className="grid grid-cols-3 gap-3 mb-7">
//         {[
//           { label: "Total Sessions", value: totalItems, icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2", color: "text-blue-500 bg-blue-50 border-blue-100" },
//           { label: "Quizzes Taken", value: quizCount, icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z", color: "text-yellow-500 bg-yellow-50 border-yellow-100" },
//           { label: "Cards Studied", value: flashCount * 38, icon: "M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10", color: "text-green-500 bg-green-50 border-green-100" },
//         ].map((stat) => (
//           <div key={stat.label} className="bg-white rounded-2xl border border-gray-100 px-5 py-4 flex items-center gap-3">
//             <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${stat.color}`}>
//               <svg className="w-4.5 h-4.5 w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
//                 <path strokeLinecap="round" strokeLinejoin="round" d={stat.icon} />
//               </svg>
//             </div>
//             <div>
//               <p className="text-xl font-bold text-gray-800 leading-none">{stat.value}</p>
//               <p className="text-[11px] text-gray-400 mt-0.5">{stat.label}</p>
//             </div>
//           </div>
//         ))}
//       </div>

//       {/* Search + Filters */}
//       <div className="flex flex-col sm:flex-row gap-3 mb-6">
//         {/* Search */}
//         <div className="relative flex-1">
//           <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
//             <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
//           </svg>
//           <input
//             type="text"
//             value={search}
//             onChange={(e) => setSearch(e.target.value)}
//             placeholder="Search your history..."
//             className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 placeholder-gray-300 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-50 transition"
//           />
//         </div>

//         {/* Filter pills */}
//         <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-xl px-2 py-1.5">
//           {FILTERS.map((f) => (
//             <button
//               key={f.value}
//               onClick={() => setActiveFilter(f.value)}
//               className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
//                 activeFilter === f.value
//                   ? "bg-blue-600 text-white shadow-sm"
//                   : "text-gray-400 hover:text-gray-600 hover:bg-gray-50"
//               }`}
//             >
//               {f.label}
//             </button>
//           ))}
//         </div>
//       </div>

//       {/* History list */}
//       {Object.keys(grouped).length === 0 ? (
//         <div className="flex flex-col items-center justify-center py-24 text-center">
//           <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
//             <svg className="w-7 h-7 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
//               <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
//             </svg>
//           </div>
//           <p className="text-gray-500 font-medium">No results found</p>
//           <p className="text-gray-300 text-sm mt-1">Try a different search or filter</p>
//         </div>
//       ) : (
//         <div className="space-y-7">
//           {Object.entries(grouped).map(([date, items]) => (
//             <div key={date}>
//               {/* Date label */}
//               <div className="flex items-center gap-3 mb-3">
//                 <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest">{date}</span>
//                 <div className="flex-1 h-px bg-gray-100" />
//                 <span className="text-xs text-gray-300">{items.length} session{items.length > 1 ? "s" : ""}</span>
//               </div>

//               {/* Rows */}
//               <div className="space-y-2">
//                 {items.map((item, i) => (
//                   <HistoryRow key={item.id} item={item} index={i} />
//                 ))}
//               </div>
//             </div>
//           ))}
//         </div>
//       )}

//       {/* Footer */}
//       {filtered.length > 0 && (
//         <div className="mt-10 text-center">
//           <p className="text-xs text-gray-300">
//             Showing {filtered.length} of {totalItems} sessions
//           </p>
//         </div>
//       )}

//       </div>
//     </div>
//   );
// }

"use client";

import { useState } from "react";

type ActivityType = "flashcard" | "quiz" | "recording" | "youtube";

interface HistoryItem {
  id: number;
  type: ActivityType;
  title: string;
  subtitle: string;
  date: string;
  time: string;
  meta?: string;
}

const HISTORY: HistoryItem[] = [
  {
    id: 1,
    type: "quiz",
    title: "Organic Chemistry — Chapter 4",
    subtitle: "20 questions · Multiple choice",
    date: "Today",
    time: "2:14 PM",
    meta: "85%",
  },
  {
    id: 2,
    type: "flashcard",
    title: "Human Anatomy — Skeletal System",
    subtitle: "34 cards studied",
    date: "Today",
    time: "11:02 AM",
    meta: "34 cards",
  },
  {
    id: 3,
    type: "youtube",
    title: "MIT OpenCourseWare — Thermodynamics",
    subtitle: "youtube.com/watch?v=4i1MUWJoI0U",
    date: "Yesterday",
    time: "8:45 PM",
    meta: "1h 12m",
  },
  {
    id: 4,
    type: "recording",
    title: "Lecture — Macroeconomics Week 6",
    subtitle: "Audio transcript · 47 min",
    date: "Yesterday",
    time: "3:30 PM",
    meta: "47m",
  },
  {
    id: 5,
    type: "quiz",
    title: "World History — Cold War Era",
    subtitle: "15 questions · Mixed",
    date: "Mon, Feb 17",
    time: "10:00 AM",
    meta: "73%",
  },
  {
    id: 6,
    type: "flashcard",
    title: "Spanish Vocabulary — Unit 3",
    subtitle: "52 cards studied",
    date: "Mon, Feb 17",
    time: "9:15 AM",
    meta: "52 cards",
  },
  {
    id: 7,
    type: "youtube",
    title: "3Blue1Brown — Linear Algebra",
    subtitle: "youtube.com/watch?v=kjBOesZCoqc",
    date: "Sun, Feb 16",
    time: "7:00 PM",
    meta: "22m",
  },
  {
    id: 8,
    type: "recording",
    title: "Seminar — Bioethics & AI",
    subtitle: "Audio transcript · 1h 23m",
    date: "Sat, Feb 15",
    time: "2:00 PM",
    meta: "1h 23m",
  },
  {
    id: 9,
    type: "quiz",
    title: "Calculus II — Integration by Parts",
    subtitle: "10 questions · Problem solving",
    date: "Fri, Feb 14",
    time: "4:45 PM",
    meta: "90%",
  },
  {
    id: 10,
    type: "flashcard",
    title: "French Revolution — Key Figures",
    subtitle: "28 cards studied",
    date: "Fri, Feb 14",
    time: "1:30 PM",
    meta: "28 cards",
  },
];

const FILTERS: { label: string; value: ActivityType | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Quizzes", value: "quiz" },
  { label: "Flashcards", value: "flashcard" },
  { label: "Recordings", value: "recording" },
  { label: "YouTube", value: "youtube" },
];

const TYPE_ICONS: Record<ActivityType, React.ReactNode> = {
  quiz: (
    <svg
      className="w-4 h-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.8}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
      />
    </svg>
  ),
  flashcard: (
    <svg
      className="w-4 h-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.8}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
      />
    </svg>
  ),
  recording: (
    <svg
      className="w-4 h-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.8}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
      />
    </svg>
  ),
  youtube: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  ),
};

const TYPE_LABEL: Record<ActivityType, string> = {
  quiz: "Quiz",
  flashcard: "Flashcard",
  recording: "Recording",
  youtube: "YouTube",
};

export default function HistoryPage() {
  const [activeFilter, setActiveFilter] = useState<ActivityType | "all">("all");
  const [search, setSearch] = useState("");

  const filtered = HISTORY.filter((item) => {
    const matchType = activeFilter === "all" || item.type === activeFilter;
    const matchSearch =
      item.title.toLowerCase().includes(search.toLowerCase()) ||
      item.subtitle.toLowerCase().includes(search.toLowerCase());
    return matchType && matchSearch;
  });

  const grouped = filtered.reduce<Record<string, HistoryItem[]>>(
    (acc, item) => {
      if (!acc[item.date]) acc[item.date] = [];
      acc[item.date].push(item);
      return acc;
    },
    {},
  );

  return (
    <div className="min-h-screen w-full bg-gray-50">
      <div className="max-w-4xl mx-auto px-8 py-10">
        {/* Header */}
        <h1 className="text-2xl font-semibold text-gray-800 mb-1">History</h1>
        <p className="text-sm text-gray-400 mb-8">Your recent study sessions</p>

        {/* Search + Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-8">
          {/* Search */}
          <div className="relative flex-1">
            <svg
              className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search your history..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-600 placeholder-gray-300 outline-none focus:border-blue-300 transition"
            />
          </div>

          {/* Filter tabs */}
          <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl px-1.5 py-1.5">
            {FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setActiveFilter(f.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  activeFilter === f.value
                    ? "bg-blue-600 text-white"
                    : "text-gray-400 hover:text-gray-600"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        {Object.keys(grouped).length === 0 ? (
          <div className="flex flex-col items-center justify-center py-28">
            <svg
              className="w-8 h-8 text-gray-200 mb-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-sm text-gray-400">No results found</p>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(grouped).map(([date, items]) => (
              <div key={date}>
                {/* Date divider */}
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
                    {date}
                  </span>
                  <div className="flex-1 h-px bg-gray-200" />
                  <span className="text-xs text-gray-300">
                    {items.length} session{items.length > 1 ? "s" : ""}
                  </span>
                </div>

                {/* Rows */}
                <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden divide-y divide-gray-50">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition cursor-pointer group"
                    >
                      {/* Icon */}
                      <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400 shrink-0">
                        {TYPE_ICONS[item.type]}
                      </div>

                      {/* Text */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-gray-700 truncate">
                            {item.title}
                          </p>
                          <span className="text-xs text-gray-300 shrink-0">
                            {TYPE_LABEL[item.type]}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 truncate mt-0.5">
                          {item.subtitle}
                        </p>
                      </div>

                      {/* Meta */}
                      {item.meta && (
                        <span className="text-xs text-gray-400 bg-gray-50 border border-gray-100 rounded-lg px-3 py-1.5 shrink-0">
                          {item.meta}
                        </span>
                      )}

                      {/* Time */}
                      <div className="text-right shrink-0 hidden sm:block">
                        <p className="text-xs text-gray-400">{item.time}</p>
                      </div>

                      {/* Arrow */}
                      <svg
                        className="w-3.5 h-3.5 text-gray-200 group-hover:text-gray-400 transition shrink-0"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer count */}
        {filtered.length > 0 && (
          <p className="text-center text-xs text-gray-300 mt-10">
            {filtered.length} of {HISTORY.length} sessions
          </p>
        )}
      </div>
    </div>
  );
}
