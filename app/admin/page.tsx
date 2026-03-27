// File path: app/admin/page.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";

// ─── Types ─────────────────────────────────────────────────────────────────────
interface Stats {
  totalUsers: number; totalYoutube: number; totalRecordings: number;
  totalQuizzes: number; totalFlashcards: number; totalExams: number;
  totalFeedback: number; positiveFeedback: number; negativeFeedback: number;
  errorSessions: number; avgQuizScore: number; examCompletionRate: number;
}
interface UserRow  { id:string; youtube:number; recordings:number; quizzes:number; flashcards:number; exams:number; }
interface FeedbackRow { id:string; user_id:string; message_text:string; feedback_type:"up"|"down"; note:string; created_at:string; }
interface ErrorRow { id:string; type:string; title:string; created_at:string; user_id:string; }
interface Testimonial { id:string; user_id:string; message:string; rating:number; created_at:string; }
interface OnboardingRow { id:string; user_id:string; language:string; use_case:string; goal:string; referral_source:string; created_at:string; }

// ─── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (n:number) => n>=1000000?`${(n/1000000).toFixed(1)}M`:n>=1000?`${(n/1000).toFixed(1)}K`:String(n);
const timeAgo = (d:string) => {
  const diff=Date.now()-new Date(d).getTime(), m=Math.floor(diff/60000), h=Math.floor(diff/3600000), dy=Math.floor(diff/86400000);
  if(m<1)return"just now";if(m<60)return`${m}m ago`;if(h<24)return`${h}h ago`;if(dy<30)return`${dy}d ago`;
  return new Date(d).toLocaleDateString();
};

// ─── Sparkline ─────────────────────────────────────────────────────────────────
function Spark({ values, color }: { values:number[]; color:string }) {
  const max = Math.max(...values,1);
  const W=80, H=30;
  const pts = values.map((v,i)=>`${(i/(values.length-1))*W},${H-(v/max)*(H-4)+2}`).join(" ");
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="overflow-visible">
      <defs>
        <linearGradient id={`g${color.replace("#","")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25"/>
          <stop offset="100%" stopColor={color} stopOpacity="0"/>
        </linearGradient>
      </defs>
      <polygon points={`${pts} ${W},${H} 0,${H}`} fill={`url(#g${color.replace("#","")})`}/>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

// ─── Donut ─────────────────────────────────────────────────────────────────────
function Donut({ segments }: { segments:{label:string;value:number;color:string}[] }) {
  const total = segments.reduce((a,b)=>a+b.value,0)||1;
  const r=44, circ=2*Math.PI*r; let cum=0;
  return (
    <div className="flex items-center gap-5">
      <div className="relative shrink-0">
        <svg width="110" height="110" viewBox="0 0 110 110" className="-rotate-90">
          <circle cx="55" cy="55" r={r} fill="none" stroke="#f1f5f9" strokeWidth="14"/>
          {segments.map((s,i)=>{
            const dash=(s.value/total)*circ, offset=circ-cum; cum+=dash;
            return <circle key={i} cx="55" cy="55" r={r} fill="none" stroke={s.color} strokeWidth="14"
              strokeDasharray={`${dash} ${circ-dash}`} strokeDashoffset={offset}/>;
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-base font-black text-gray-800">{fmt(total)}</span>
          <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">total</span>
        </div>
      </div>
      <div className="space-y-2 flex-1">
        {segments.map((s,i)=>(
          <div key={i} className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{background:s.color}}/>
            <span className="text-xs text-gray-500 flex-1">{s.label}</span>
            <span className="text-xs font-bold text-gray-800 tabular-nums">{s.value}</span>
            <span className="text-[10px] text-gray-400 w-8 text-right">{Math.round((s.value/total)*100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Bar Chart ─────────────────────────────────────────────────────────────────
function BarChart({ data }: { data:{label:string;value:number;color:string}[] }) {
  const max = Math.max(...data.map(d=>d.value),1);
  return (
    <div className="flex items-end gap-3 h-32 pt-2">
      {data.map((d,i)=>(
        <div key={i} className="flex-1 flex flex-col items-center gap-1.5 group">
          <span className="text-[10px] font-bold text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity tabular-nums">{d.value}</span>
          <div className="w-full rounded-lg transition-all duration-700 relative overflow-hidden"
            style={{height:`${Math.max((d.value/max)*100,4)}px`, background:`${d.color}20`}}>
            <div className="absolute inset-x-0 bottom-0 rounded-lg" style={{height:"65%",background:d.color}}/>
          </div>
          <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">{d.label.slice(0,4)}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Animated counter ─────────────────────────────────────────────────────────
function Counter({ value }: { value:number }) {
  const [n, setN] = useState(0);
  useEffect(()=>{
    let i=0; const steps=40;
    const t=setInterval(()=>{ i++; setN(Math.round((i/steps)*value)); if(i>=steps)clearInterval(t); },16);
    return ()=>clearInterval(t);
  },[value]);
  return <>{fmt(n)}</>;
}

// ─── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, color, bg, icon, spark, trend }: {
  label:string; value:number; sub?:string; color:string; bg:string;
  icon:React.ReactNode; spark?:number[]; trend?:number;
}) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow group">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">{label}</p>
          <p className="text-3xl font-black text-gray-800 tabular-nums leading-none"><Counter value={value}/></p>
          {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
          {trend!=null && (
            <div className="flex items-center gap-1 mt-1.5">
              <span className={`text-xs font-bold ${trend>=0?"text-emerald-500":"text-red-500"}`}>
                {trend>=0?"↑":"↓"} {Math.abs(trend)}%
              </span>
              <span className="text-[10px] text-gray-400">vs last week</span>
            </div>
          )}
        </div>
        <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{background:bg}}>
          <div style={{color}}>{icon}</div>
        </div>
      </div>
      {spark && <Spark values={spark} color={color}/>}
    </div>
  );
}

// ─── Nav Item ──────────────────────────────────────────────────────────────────
function NavItem({ label, icon, active, onClick, badge }: {
  label:string; icon:React.ReactNode; active:boolean; onClick:()=>void; badge?:number;
}) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 cursor-pointer text-left ${
      active ? "bg-blue-600 text-white shadow-lg shadow-blue-200" : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"
    }`}>
      <span className={`shrink-0 ${active?"text-white":"text-gray-400"}`}>{icon}</span>
      <span className="flex-1">{label}</span>
      {badge!=null&&badge>0&&(
        <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${active?"bg-white/20 text-white":"bg-red-100 text-red-600"}`}>{badge}</span>
      )}
    </button>
  );
}

type Page = "overview"|"users"|"content"|"feedback"|"health"|"testimonials"|"surveys";

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const [page, setPage]           = useState<Page>("overview");
  const [stats, setStats]         = useState<Stats|null>(null);
  const [users, setUsers]         = useState<UserRow[]>([]);
  const [feedback, setFeedback]   = useState<FeedbackRow[]>([]);
  const [errors, setErrors]       = useState<ErrorRow[]>([]);
  const [testimonials]            = useState<Testimonial[]>([]);
  const [onboarding, setOnboarding] = useState<OnboardingRow[]>([]);
  const [loading, setLoading]     = useState(true);
  const [fbFilter, setFbFilter]   = useState<"all"|"up"|"down">("all");
  const [search, setSearch]       = useState("");

  useEffect(()=>{ load(); },[]);

  async function load() {
    setLoading(true);
    try {
      const [
        {count:totalUsers},
        {data:ytData},{data:recData},{data:quizData},{data:flashData},{data:examData},
        {data:fbData},{data:errQuiz},{data:errFlash},{data:onboardingData},
      ] = await Promise.all([
        supabase.from("profiles").select("*",{count:"exact",head:true}),
        supabase.from("youtube_sessions").select("user_id,created_at"),
        supabase.from("recording_sessions").select("user_id,created_at"),
        supabase.from("quiz_sessions").select("user_id,created_at,status,score,total"),
        supabase.from("flashcard_sessions").select("user_id,created_at,status"),
        supabase.from("exam_sessions").select("user_id,created_at,status,mcq_score,total_mcq"),
        supabase.from("message_feedback").select("id,user_id,message_text,feedback_type,note,created_at").order("created_at",{ascending:false}).limit(200),
        supabase.from("quiz_sessions").select("id,file_name,status,created_at,user_id").eq("status","error"),
        supabase.from("flashcard_sessions").select("id,file_name,status,created_at,user_id").eq("status","error"),
        supabase.from("user_onboarding").select("*").order("created_at",{ascending:false}),
      ]);
      const fb=(fbData??[]) as FeedbackRow[];
      const qScores=(quizData??[]).filter((q:any)=>q.score!=null&&q.total>0).map((q:any)=>Math.round((q.score/q.total)*100));
      const avg=qScores.length?Math.round(qScores.reduce((a:number,b:number)=>a+b,0)/qScores.length):0;
      const examDone=(examData??[]).filter((e:any)=>e.status==="done").length;
      const examRate=(examData??[]).length?Math.round((examDone/(examData??[]).length)*100):0;
      const errRows:ErrorRow[]=[
        ...(errQuiz??[]).map((e:any)=>({id:e.id,type:"Quiz",title:e.file_name||"Quiz",created_at:e.created_at,user_id:e.user_id})),
        ...(errFlash??[]).map((e:any)=>({id:e.id,type:"Flashcard",title:e.file_name||"Flashcard",created_at:e.created_at,user_id:e.user_id})),
      ];
      setStats({
        totalUsers:totalUsers??0, totalYoutube:(ytData??[]).length, totalRecordings:(recData??[]).length,
        totalQuizzes:(quizData??[]).length, totalFlashcards:(flashData??[]).length, totalExams:(examData??[]).length,
        totalFeedback:fb.length, positiveFeedback:fb.filter(f=>f.feedback_type==="up").length,
        negativeFeedback:fb.filter(f=>f.feedback_type==="down").length,
        errorSessions:errRows.length, avgQuizScore:avg, examCompletionRate:examRate,
      });
      setFeedback(fb); setErrors(errRows); setOnboarding((onboardingData as OnboardingRow[])??[]);
      const map:Record<string,UserRow>={};
      const add=(arr:any[],field:keyof UserRow)=>(arr??[]).forEach((s:any)=>{
        if(!map[s.user_id])map[s.user_id]={id:s.user_id,youtube:0,recordings:0,quizzes:0,flashcards:0,exams:0};
        (map[s.user_id][field] as number)++;
      });
      add(ytData??[],"youtube"); add(recData??[],"recordings"); add(quizData??[],"quizzes");
      add(flashData??[],"flashcards"); add(examData??[],"exams");
      setUsers(Object.values(map).sort((a,b)=>(b.youtube+b.recordings+b.quizzes+b.flashcards+b.exams)-(a.youtube+a.recordings+a.quizzes+a.flashcards+a.exams)).slice(0,60));
    } finally { setLoading(false); }
  }

  const totalSessions = stats ? stats.totalYoutube+stats.totalRecordings+stats.totalQuizzes+stats.totalFlashcards+stats.totalExams : 0;
  const satisfaction  = feedback.length ? Math.round((stats?.positiveFeedback??0)/feedback.length*100) : 0;
  const filteredFb    = feedback.filter(f=>fbFilter==="all"||f.feedback_type===fbFilter);
  const filteredUsers = users.filter(u=>!search||u.id.includes(search));

  const featureSegs = stats ? [
    {label:"YouTube",    value:stats.totalYoutube,    color:"#ef4444"},
    {label:"Recordings", value:stats.totalRecordings, color:"#3b82f6"},
    {label:"Quizzes",    value:stats.totalQuizzes,    color:"#f59e0b"},
    {label:"Flashcards", value:stats.totalFlashcards, color:"#f97316"},
    {label:"Exams",      value:stats.totalExams,      color:"#8b5cf6"},
  ] : [];

  // icons
  const Ic = {
    grid:    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>,
    users:   <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path strokeLinecap="round" strokeLinejoin="round" d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>,
    chart:   <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>,
    msg:     <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"/></svg>,
    shield:  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>,
    star:    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/></svg>,
  };

  return (
    <div className="flex h-screen overflow-hidden" style={{fontFamily:"'Plus Jakarta Sans',system-ui,sans-serif", background:"#f8fafc"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');
        ::-webkit-scrollbar{width:5px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:#e2e8f0;border-radius:4px}
        .fade-up{animation:fadeUp 0.35s ease both}
        @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
      `}</style>

      {/* ── SIDEBAR ─────────────────────────────────────────────────────────── */}
      <aside className="w-60 shrink-0 bg-white border-r border-gray-100 flex flex-col shadow-sm">

        {/* Logo */}
        <div className="px-5 py-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-200">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
              </svg>
            </div>
            <div>
              <p className="text-sm font-black text-gray-900">StudyForge</p>
              <p className="text-[10px] font-bold text-blue-500 uppercase tracking-wider">Admin Console</p>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="px-4 py-3 border-b border-gray-50">
          <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
            <input className="flex-1 text-xs text-gray-600 placeholder-gray-400 outline-none bg-transparent" placeholder="Search anything…" value={search} onChange={e=>setSearch(e.target.value)}/>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-3 py-2">Overview</p>
          <NavItem label="Dashboard"     icon={Ic.grid}   active={page==="overview"}      onClick={()=>setPage("overview")}/>
          <NavItem label="Users"         icon={Ic.users}  active={page==="users"}          onClick={()=>setPage("users")}/>

          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-3 py-2 mt-3">Analytics</p>
          <NavItem label="Content"       icon={Ic.chart}  active={page==="content"}        onClick={()=>setPage("content")}/>
          <NavItem label="Feedback"      icon={Ic.msg}    active={page==="feedback"}       onClick={()=>setPage("feedback")} badge={stats?.negativeFeedback}/>
          <NavItem label="Health"        icon={Ic.shield} active={page==="health"}         onClick={()=>setPage("health")} badge={stats?.errorSessions}/>
          <NavItem label="Surveys"       icon={Ic.star}   active={page==="surveys"}        onClick={()=>setPage("surveys")}/>

          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-3 py-2 mt-3">Community</p>
          <NavItem label="Testimonials"  icon={Ic.star}   active={page==="testimonials"}   onClick={()=>setPage("testimonials")}/>
        </nav>

        {/* Bottom user */}
        <div className="px-4 py-4 border-t border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white text-xs font-black shadow-md shadow-blue-200">A</div>
            <div className="flex-1">
              <p className="text-xs font-bold text-gray-800">Admin</p>
              <p className="text-[10px] font-semibold text-gray-400">Super user</p>
            </div>
            <button onClick={load} className="text-gray-300 hover:text-gray-500 transition cursor-pointer">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
            </button>
          </div>
        </div>
      </aside>

      {/* ── MAIN ────────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Top Bar */}
        <header className="bg-white border-b border-gray-100 px-8 py-4 flex items-center justify-between shrink-0 shadow-sm">
          <div>
            <h1 className="text-base font-black text-gray-900">
              {page==="overview"?"Dashboard":page==="users"?"User Management":page==="content"?"Content Analytics":page==="feedback"?"Feedback Center":page==="health"?"System Health":page==="surveys"?"Survey Analytics":"Testimonials"}
            </h1>
            <p className="text-xs text-gray-400 mt-0.5">
              {new Date().toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric",year:"numeric"})}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {stats && (
              <div className="hidden md:flex items-center gap-3">
                {[
                  {l:"Sessions",v:fmt(totalSessions),c:"text-blue-600"},
                  {l:"Users",   v:fmt(stats.totalUsers),c:"text-emerald-600"},
                  {l:"Errors",  v:String(stats.errorSessions),c:stats.errorSessions>0?"text-red-500":"text-emerald-500"},
                ].map(s=>(
                  <div key={s.l} className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 rounded-xl border border-gray-100">
                    <span className="text-[10px] font-semibold text-gray-400">{s.l}</span>
                    <span className={`text-xs font-black ${s.c}`}>{s.v}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-xl">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"/>
              <span className="text-[10px] font-bold text-emerald-600 tracking-wider uppercase">Live</span>
            </div>
          </div>
        </header>

        {/* Page Body */}
        <div className="flex-1 overflow-y-auto p-8">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full gap-3">
              <svg className="w-6 h-6 animate-spin text-blue-400" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
              <p className="text-sm font-semibold text-gray-400">Loading dashboard data…</p>
            </div>
          ) : (
          <div className="fade-up space-y-6">

            {/* ═══════════════ OVERVIEW ═══════════════ */}
            {page==="overview" && stats && (<>

              {/* Welcome banner */}
              <div className="rounded-2xl p-6 flex items-center justify-between overflow-hidden relative" style={{background:"linear-gradient(135deg,#1d4ed8 0%,#0ea5e9 100%)"}}>
                <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-white/10"/>
                <div className="absolute -right-2 bottom-0 w-24 h-24 rounded-full bg-white/5"/>
                <div className="relative z-10">
                  <p className="text-white/70 text-xs font-semibold uppercase tracking-widest mb-1">Welcome back</p>
                  <h2 className="text-xl font-black text-white">Here's what's happening today</h2>
                  <p className="text-white/60 text-sm mt-1">StudyForge admin console — real-time insights</p>
                </div>
                <div className="relative z-10 hidden md:flex items-center gap-4">
                  {[{l:"Today's Sessions",v:fmt(totalSessions),icon:"📚"},{l:"Active Users",v:fmt(stats.totalUsers),icon:"👥"}].map(s=>(
                    <div key={s.l} className="bg-white/15 backdrop-blur rounded-2xl px-4 py-3 text-center border border-white/20">
                      <span className="text-lg">{s.icon}</span>
                      <p className="text-xl font-black text-white tabular-nums mt-1">{s.v}</p>
                      <p className="text-[10px] text-white/60 font-semibold">{s.l}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* KPI cards */}
              <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
                <StatCard label="Total Users"    value={stats.totalUsers}    sub="All time"            color="#3b82f6" bg="#eff6ff" trend={12} spark={[8,12,10,16,14,20,18,24,21,28,25,33]}
                  icon={<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path strokeLinecap="round" strokeLinejoin="round" d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>}/>
                <StatCard label="Total Sessions" value={totalSessions}       sub="All features"        color="#8b5cf6" bg="#f5f3ff" trend={8}  spark={[4,7,10,8,13,16,14,20,17,24,20,28]}
                  icon={<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>}/>
                <StatCard label="Avg Quiz Score" value={stats.avgQuizScore}  sub="% across all users"  color="#10b981" bg="#ecfdf5" trend={5}  spark={[55,60,58,65,63,68,65,70,68,72,70,75]}
                  icon={<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/></svg>}/>
                <StatCard label="Error Sessions" value={stats.errorSessions} sub="Failed generations"   color={stats.errorSessions>0?"#ef4444":"#10b981"} bg={stats.errorSessions>0?"#fef2f2":"#ecfdf5"} trend={stats.errorSessions>0?-5:0} spark={[3,1,4,2,5,3,2,4,1,3,2,stats.errorSessions]}
                  icon={<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>}/>
              </div>

              {/* Charts row */}
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
                {/* Sessions per feature */}
                <div className="xl:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                  <div className="flex items-start justify-between mb-1">
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Overview</p>
                      <h3 className="text-sm font-black text-gray-800 mt-0.5">Sessions Per Feature</h3>
                    </div>
                    <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100">All time</span>
                  </div>
                  <BarChart data={featureSegs.map(s=>({label:s.label,value:s.value,color:s.color}))}/>
                  {/* Horizontal progress bars */}
                  <div className="space-y-2.5 mt-4 pt-4 border-t border-gray-50">
                    {featureSegs.map(s=>(
                      <div key={s.label} className="flex items-center gap-3">
                        <span className="text-xs font-semibold text-gray-500 w-20 shrink-0">{s.label}</span>
                        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-700" style={{width:`${totalSessions>0?Math.round((s.value/Math.max(...featureSegs.map(x=>x.value),1))*100):0}%`,background:s.color}}/>
                        </div>
                        <span className="text-xs font-bold text-gray-700 w-8 text-right tabular-nums">{s.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Traffic / distribution */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Distribution</p>
                  <h3 className="text-sm font-black text-gray-800 mt-0.5 mb-5">Session Split</h3>
                  <Donut segments={featureSegs}/>
                </div>
              </div>

              {/* Monthly goals style + feedback */}
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

                {/* Monthly targets */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Goals</p>
                  <h3 className="text-sm font-black text-gray-800 mt-0.5 mb-5">Platform Targets</h3>
                  <div className="space-y-4">
                    {[
                      {l:"Quiz Completion",  v:stats.avgQuizScore,    target:80,  color:"#3b82f6"},
                      {l:"Exam Completion",  v:stats.examCompletionRate, target:75, color:"#10b981"},
                      {l:"User Satisfaction",v:satisfaction,          target:85,  color:"#f59e0b"},
                      {l:"Error Rate",       v:100-Math.min((stats.errorSessions/Math.max(totalSessions,1))*100*10,100), target:95, color:"#8b5cf6"},
                    ].map(g=>(
                      <div key={g.l}>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-semibold text-gray-600">{g.l}</span>
                          <span className="text-xs font-black text-gray-800">{g.v}%<span className="text-gray-400 font-normal text-[10px] ml-1">/ {g.target}%</span></span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-700" style={{width:`${Math.min(g.v,100)}%`,background:g.color}}/>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recent feedback */}
                <div className="xl:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Latest</p>
                      <h3 className="text-sm font-black text-gray-800 mt-0.5">Recent Feedback</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">{stats.positiveFeedback} 👍</span>
                      <span className="text-xs font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded-full">{stats.negativeFeedback} 👎</span>
                      <button onClick={()=>setPage("feedback")} className="text-[10px] font-bold text-blue-600 hover:underline cursor-pointer ml-2">View all →</button>
                    </div>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {feedback.slice(0,5).map(f=>(
                      <div key={f.id} className="py-3 flex items-start gap-3">
                        <div className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${f.feedback_type==="up"?"bg-emerald-50":"bg-red-50"}`}>
                          <span className="text-sm">{f.feedback_type==="up"?"👍":"👎"}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-gray-600 leading-relaxed line-clamp-1">{f.message_text||"—"}</p>
                          {f.note&&<p className="text-[10px] text-gray-400 mt-0.5 italic line-clamp-1">"{f.note}"</p>}
                        </div>
                        <span className="text-[10px] text-gray-300 shrink-0 font-mono">{timeAgo(f.created_at)}</span>
                      </div>
                    ))}
                    {feedback.length===0&&<p className="text-xs text-gray-400 py-6 text-center">No feedback yet</p>}
                  </div>
                </div>
              </div>
            </>)}

            {/* ═══════════════ USERS ═══════════════ */}
            {page==="users" && (
              <div className="space-y-5">
                <div className="grid grid-cols-3 gap-4">
                  {[{l:"Total Users",v:stats?.totalUsers??0,c:"#3b82f6",bg:"#eff6ff"},{l:"Power Users (20+ sessions)",v:users.filter(u=>u.youtube+u.recordings+u.quizzes+u.flashcards+u.exams>=20).length,c:"#8b5cf6",bg:"#f5f3ff"},{l:"Active Users (5+ sessions)",v:users.filter(u=>u.youtube+u.recordings+u.quizzes+u.flashcards+u.exams>=5).length,c:"#10b981",bg:"#ecfdf5"}].map(s=>(
                    <div key={s.l} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">{s.l}</p>
                      <p className="text-3xl font-black tabular-nums" style={{color:s.c}}>{s.v}</p>
                    </div>
                  ))}
                </div>
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-50 flex items-center gap-3">
                    <h3 className="text-sm font-black text-gray-800 flex-1">User Activity Table</h3>
                    <span className="text-xs text-gray-400">{filteredUsers.length} users</span>
                  </div>
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100">
                        {["#","User ID","YouTube","Recordings","Quizzes","Flashcards","Exams","Total","Tier"].map((h,i)=>(
                          <th key={h} className={`px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest ${i===0?"text-center":"text-left"}`}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {filteredUsers.map((u,i)=>{
                        const total=u.youtube+u.recordings+u.quizzes+u.flashcards+u.exams;
                        const tier=total>=20?"Power":total>=5?"Active":"New";
                        const tierStyle=tier==="Power"?{bg:"#f5f3ff",c:"#8b5cf6"}:tier==="Active"?{bg:"#eff6ff",c:"#3b82f6"}:{bg:"#f8fafc",c:"#94a3b8"};
                        return (
                          <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3 text-center text-xs text-gray-300 font-semibold">{i+1}</td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-lg text-[9px] font-black flex items-center justify-center" style={{background:tierStyle.bg,color:tierStyle.c}}>{u.id.slice(0,2).toUpperCase()}</div>
                                <span className="text-[11px] font-mono text-gray-500">{u.id.slice(0,14)}…</span>
                              </div>
                            </td>
                            {[u.youtube,u.recordings,u.quizzes,u.flashcards,u.exams].map((v,ci)=>(
                              <td key={ci} className="px-4 py-3 text-xs font-semibold text-gray-500 tabular-nums">{v||"—"}</td>
                            ))}
                            <td className="px-4 py-3"><span className="text-xs font-black tabular-nums px-2 py-0.5 rounded-full" style={{background:tierStyle.bg,color:tierStyle.c}}>{total}</span></td>
                            <td className="px-4 py-3"><span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{background:tierStyle.bg,color:tierStyle.c}}>{tier}</span></td>
                          </tr>
                        );
                      })}
                      {filteredUsers.length===0&&<tr><td colSpan={9} className="px-4 py-10 text-center text-sm text-gray-400">No users found</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ═══════════════ CONTENT ═══════════════ */}
            {page==="content" && stats && (
              <div className="space-y-5">
                <div className="grid grid-cols-2 xl:grid-cols-5 gap-3">
                  {featureSegs.map(s=>(
                    <div key={s.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{s.label}</p>
                      <p className="text-3xl font-black tabular-nums" style={{color:s.color}}><Counter value={s.value}/></p>
                      <div className="h-1 rounded-full mt-3" style={{background:`${s.color}20`}}>
                        <div className="h-full rounded-full" style={{width:`${totalSessions>0?Math.round((s.value/totalSessions)*100):0}%`,background:s.color}}/>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="grid xl:grid-cols-2 gap-5">
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Comparison</p>
                    <h3 className="text-sm font-black text-gray-800 mt-0.5 mb-2">Feature Usage</h3>
                    <BarChart data={featureSegs.map(s=>({label:s.label,value:s.value,color:s.color}))}/>
                  </div>
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Split</p>
                    <h3 className="text-sm font-black text-gray-800 mt-0.5 mb-4">Distribution</h3>
                    <Donut segments={featureSegs}/>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  {[{l:"Total Feedback",v:stats.totalFeedback,c:"#3b82f6",bg:"#eff6ff"},{l:"Positive 👍",v:stats.positiveFeedback,c:"#10b981",bg:"#ecfdf5"},{l:"Negative 👎",v:stats.negativeFeedback,c:"#ef4444",bg:"#fef2f2"}].map(s=>(
                    <div key={s.l} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{s.l}</p>
                      <p className="text-3xl font-black tabular-nums" style={{color:s.c}}><Counter value={s.v}/></p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ═══════════════ FEEDBACK ═══════════════ */}
            {page==="feedback" && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  {([["all","All",stats?.totalFeedback],["up","Positive 👍",stats?.positiveFeedback],["down","Negative 👎",stats?.negativeFeedback]] as const).map(([v,l,cnt])=>(
                    <button key={v} onClick={()=>setFbFilter(v as any)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition ${fbFilter===v?"bg-blue-600 text-white shadow-md shadow-blue-200":"bg-white border border-gray-200 text-gray-500 hover:border-gray-300"}`}>
                      {l} <span className="ml-1 opacity-60">{cnt}</span>
                    </button>
                  ))}
                </div>
                <div className="space-y-3">
                  {filteredFb.map(f=>(
                    <div key={f.id} className="bg-white rounded-2xl border shadow-sm p-5 hover:shadow-md transition-shadow" style={{borderColor:f.feedback_type==="up"?"#d1fae5":"#fee2e2"}}>
                      <div className="flex items-start gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-base ${f.feedback_type==="up"?"bg-emerald-50":"bg-red-50"}`}>
                          {f.feedback_type==="up"?"👍":"👎"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest ${f.feedback_type==="up"?"bg-emerald-100 text-emerald-700":"bg-red-100 text-red-600"}`}>{f.feedback_type==="up"?"Positive":"Negative"}</span>
                            <span className="text-[10px] text-gray-400 font-mono">{f.user_id.slice(0,12)}…</span>
                            <span className="text-[10px] text-gray-300 ml-auto">{timeAgo(f.created_at)}</span>
                          </div>
                          <p className="text-sm text-gray-700 leading-relaxed">{f.message_text||"—"}</p>
                          {f.note&&<div className="mt-2 bg-gray-50 border border-gray-100 rounded-xl px-3 py-2"><p className="text-xs text-gray-500 italic">"{f.note}"</p></div>}
                        </div>
                      </div>
                    </div>
                  ))}
                  {filteredFb.length===0&&<div className="bg-white rounded-2xl border border-gray-100 p-12 text-center shadow-sm"><p className="text-sm text-gray-400">No feedback in this category</p></div>}
                </div>
              </div>
            )}

            {/* ═══════════════ HEALTH ═══════════════ */}
            {page==="health" && stats && (
              <div className="space-y-5">
                <div className="grid grid-cols-3 gap-4">
                  {[
                    {l:"Failed Generations",  v:stats.errorSessions,   c:stats.errorSessions>0?"#ef4444":"#10b981", bg:stats.errorSessions>0?"#fef2f2":"#ecfdf5", sub:stats.errorSessions===0?"All clear ✓":"Needs attention"},
                    {l:"Satisfaction Rate",   v:satisfaction,          c:satisfaction>=70?"#10b981":satisfaction>=50?"#f59e0b":"#ef4444", bg:"#f8fafc", sub:"% positive ratings"},
                    {l:"Total Feedback",      v:stats.totalFeedback,   c:"#3b82f6", bg:"#eff6ff", sub:"User ratings collected"},
                  ].map(s=>(
                    <div key={s.l} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{s.l}</p>
                      <p className="text-4xl font-black tabular-nums" style={{color:s.c}}>{s.v}{s.l==="Satisfaction Rate"?"%":""}</p>
                      <p className="text-xs text-gray-400 mt-1">{s.sub}</p>
                    </div>
                  ))}
                </div>
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
                    <div><p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Log</p><h3 className="text-sm font-black text-gray-800">Failed Sessions</h3></div>
                    <span className={`text-[10px] font-black px-2.5 py-1 rounded-full ${errors.length>0?"bg-red-100 text-red-600":"bg-emerald-100 text-emerald-600"}`}>{errors.length} errors</span>
                  </div>
                  {errors.length===0 ? (
                    <div className="px-6 py-12 text-center">
                      <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                      </div>
                      <p className="text-sm font-bold text-gray-600">All systems operational</p>
                      <p className="text-xs text-gray-400 mt-1">No failed generations detected</p>
                    </div>
                  ) : (
                    <table className="w-full">
                      <thead><tr className="bg-gray-50 border-b border-gray-100">{["Type","Title","Time","User ID"].map(h=><th key={h} className="px-5 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">{h}</th>)}</tr></thead>
                      <tbody className="divide-y divide-gray-50">
                        {errors.map(e=>(
                          <tr key={e.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-5 py-3"><span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${e.type==="Quiz"?"bg-yellow-100 text-yellow-700":"bg-orange-100 text-orange-700"}`}>{e.type}</span></td>
                            <td className="px-5 py-3 text-xs text-gray-600 max-w-[220px] truncate">{e.title}</td>
                            <td className="px-5 py-3 text-xs text-gray-400 font-mono">{timeAgo(e.created_at)}</td>
                            <td className="px-5 py-3 text-xs text-gray-400 font-mono">{e.user_id.slice(0,12)}…</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}

            {/* ═══════════════ TESTIMONIALS ═══════════════ */}
            {page==="testimonials" && (
              <div className="space-y-5">
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-yellow-50 rounded-xl flex items-center justify-center text-xl">⭐</div>
                    <div>
                      <h3 className="text-sm font-black text-gray-800">User Testimonials</h3>
                      <p className="text-xs text-gray-400">This section will display testimonials submitted by your users</p>
                    </div>
                  </div>
                </div>

                {testimonials.length===0 ? (
                  <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-16 text-center">
                    <div className="w-16 h-16 bg-yellow-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-3xl">💬</div>
                    <h3 className="text-base font-black text-gray-700 mb-2">No testimonials yet</h3>
                    <p className="text-sm text-gray-400 max-w-sm mx-auto leading-relaxed">
                      Once you add the testimonial submission feature to your app, user testimonials will appear here automatically.
                    </p>
                    <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded-xl">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                      <span className="text-xs font-semibold text-blue-600">Feature coming soon — connect a <code className="font-mono text-blue-700">testimonials</code> table in Supabase</span>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                    {testimonials.map(t=>(
                      <div key={t.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                        <div className="flex items-center gap-2 mb-3">
                          {Array.from({length:5}).map((_,i)=>(
                            <svg key={i} width="14" height="14" viewBox="0 0 24 24" fill={i<t.rating?"#f59e0b":"#e5e7eb"} stroke="none"><path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/></svg>
                          ))}
                        </div>
                        <p className="text-sm text-gray-700 leading-relaxed mb-3">"{t.message}"</p>
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-mono text-gray-400">{t.user_id.slice(0,12)}…</span>
                          <span className="text-[10px] text-gray-300">{timeAgo(t.created_at)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ═══════════════ SURVEYS ═══════════════ */}
            {page==="surveys" && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                  {/* Language Distribution */}
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                    <h3 className="text-sm font-black text-gray-800 mb-5">Preferred Languages</h3>
                    <Donut segments={Object.entries(onboarding.reduce((acc, curr) => {
                      acc[curr.language] = (acc[curr.language] || 0) + 1;
                      return acc;
                    }, {} as Record<string, number>))
                      .sort((a,b) => b[1] - a[1])
                      .slice(0, 5)
                      .map(([label, value], i) => ({
                        label, value, color: ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"][i % 5]
                      }))
                    }/>
                  </div>

                  {/* Use Case Distribution */}
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                    <h3 className="text-sm font-black text-gray-800 mb-5">Primary Use Case</h3>
                    <BarChart data={Object.entries(onboarding.reduce((acc, curr) => {
                      acc[curr.use_case] = (acc[curr.use_case] || 0) + 1;
                      return acc;
                    }, {} as Record<string, number>))
                      .map(([label, value], i) => ({
                        label, value, color: ["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b"][i % 4]
                      }))
                    }/>
                  </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                   {/* Learning Goals */}
                   <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                    <h3 className="text-sm font-black text-gray-800 mb-5">Learning Objectives</h3>
                    <div className="space-y-4">
                      {Object.entries(onboarding.reduce((acc, curr) => {
                        acc[curr.goal] = (acc[curr.goal] || 0) + 1;
                        return acc;
                      }, {} as Record<string, number>))
                      .sort((a,b) => b[1] - a[1])
                      .map(([label, value]) => (
                        <div key={label}>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs font-semibold text-gray-600">{label}</span>
                            <span className="text-xs font-black text-gray-800">{value}</span>
                          </div>
                          <div className="h-2 bg-gray-50 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500 rounded-full" style={{width: `${(value/Math.max(onboarding.length,1))*100}%`}} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Referral Sources */}
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                    <h3 className="text-sm font-black text-gray-800 mb-5">Discovery Sources</h3>
                    <div className="grid grid-cols-2 gap-4">
                      {Object.entries(onboarding.reduce((acc, curr) => {
                        acc[curr.referral_source] = (acc[curr.referral_source] || 0) + 1;
                        return acc;
                      }, {} as Record<string, number>))
                      .sort((a,b) => b[1] - a[1])
                      .map(([label, value]) => (
                        <div key={label} className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                          <p className="text-[10px] font-bold text-gray-400 uppercase truncate">{label}</p>
                          <p className="text-xl font-black text-gray-800">{value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-50">
                    <h3 className="text-sm font-black text-gray-800">Recent Responses</h3>
                  </div>
                  <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b border-gray-100 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      <tr>
                        <th className="px-6 py-3">User</th>
                        <th className="px-6 py-3">Language</th>
                        <th className="px-6 py-3">Use Case</th>
                        <th className="px-6 py-3">Goal</th>
                        <th className="px-6 py-3">Source</th>
                        <th className="px-6 py-3 text-right">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {onboarding.slice(0, 20).map(row => (
                        <tr key={row.id} className="text-xs hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 font-mono text-gray-400">{row.user_id.slice(0, 8)}...</td>
                          <td className="px-6 py-4 text-gray-600">{row.language}</td>
                          <td className="px-6 py-4"><span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full font-bold">{row.use_case}</span></td>
                          <td className="px-6 py-4 text-gray-600">{row.goal}</td>
                          <td className="px-6 py-4 text-gray-600">{row.referral_source}</td>
                          <td className="px-6 py-4 text-right text-gray-400">{timeAgo(row.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          </div>
          )}
        </div>
      </div>
    </div>
  );
}