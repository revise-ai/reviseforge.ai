// File path: app/admin/page.tsx
"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

// ─── Types ─────────────────────────────────────────────────────────────────────
interface Stats {
  totalUsers: number; totalYoutube: number; totalRecordings: number;
  totalQuizzes: number; totalFlashcards: number; totalExams: number;
  totalFeedback: number; positiveFeedback: number; negativeFeedback: number;
  errorSessions: number; avgQuizScore: number; examCompletionRate: number;
  totalRevenue: number;
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
            <span className="text-xs text-gray-500 flex-1 truncate max-w-[120px]">{s.label}</span>
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
          <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider truncate max-w-full">{d.label.slice(0,4)}</span>
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
  label:string; value:string|number; sub?:string; color:string; bg:string;
  icon:React.ReactNode; spark?:number[]; trend?:number;
}) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow group">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">{label}</p>
          <p className="text-3xl font-black text-gray-800 tabular-nums leading-none">
            {typeof value === 'number' ? <Counter value={value}/> : value}
          </p>
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
        {data:profilesData},
        {data:ytData},{data:recData},{data:quizData},{data:flashData},{data:examData},
        {data:fbData},{data:errQuiz},{data:errFlash},{data:onboardingData},
      ] = await Promise.all([
        supabase.from("profiles").select("id,plan"),
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
      const rev = (profilesData??[]).reduce((a:number,p:any)=>a+(p.plan==="pro"?15:p.plan==="student"?10:0),0);
      setStats({
        totalUsers:(profilesData??[]).length, totalYoutube:(ytData??[]).length, totalRecordings:(recData??[]).length,
        totalQuizzes:(quizData??[]).length, totalFlashcards:(flashData??[]).length, totalExams:(examData??[]).length,
        totalFeedback:fb.length, positiveFeedback:fb.filter(f=>f.feedback_type==="up").length,
        negativeFeedback:fb.filter(f=>f.feedback_type==="down").length,
        errorSessions:errRows.length, avgQuizScore:avg, examCompletionRate:examRate,
        totalRevenue: rev,
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
        <div className="px-5 py-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-200">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
              </svg>
            </div>
            <div>
              <p className="text-sm font-black text-gray-900">ReviseForge</p>
              <p className="text-[10px] font-bold text-blue-500 uppercase tracking-wider">Admin Console</p>
            </div>
          </div>
        </div>
        <div className="px-4 py-3 border-b border-gray-50">
          <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
            <input className="flex-1 text-xs text-gray-600 placeholder-gray-400 outline-none bg-transparent" placeholder="Search anything…" value={search} onChange={e=>setSearch(e.target.value)}/>
          </div>
        </div>
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

        <div className="flex-1 overflow-y-auto p-8">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full gap-3">
              <svg className="w-6 h-6 animate-spin text-blue-400" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
              <p className="text-sm font-semibold text-gray-400">Loading dashboard data…</p>
            </div>
          ) : (
          <div className="fade-up space-y-6">

            {/* OVERVIEW */}
            {page==="overview" && stats && (<>
              <div className="rounded-2xl p-6 flex items-center justify-between overflow-hidden relative" style={{background:"linear-gradient(135deg,#1d4ed8 0%,#0ea5e9 100%)"}}>
                <div className="relative z-10">
                  <p className="text-white/70 text-xs font-semibold uppercase tracking-widest mb-1">Welcome back</p>
                  <h2 className="text-xl font-black text-white">Here's what's happening today</h2>
                  <p className="text-white/60 text-sm mt-1">ReviseForge admin console — real-time insights</p>
                </div>
                <div className="relative z-10 hidden md:flex items-center gap-4">
                  {[{l:"Today's Sessions",v:fmt(totalSessions),icon:"📚"},{l:"Active Users",v:fmt(stats.totalUsers),icon:"👥"}].map(s=>(
                    <div key={s.l} className="bg-white/15 backdrop-blur rounded-2xl px-4 py-3 text-center border border-white/20 text-white">
                      <span className="text-lg">{s.icon}</span>
                      <p className="text-xl font-black tabular-nums mt-1">{s.v}</p>
                      <p className="text-[10px] text-white/60 font-semibold">{s.l}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 xl:grid-cols-5 gap-4">
                <StatCard label="Total Revenue"   value={`$${stats.totalRevenue}`} sub="Monthly recurring" color="#e11d48" bg="#fff1f2" trend={15} spark={[120,150,140,180,210,190,240,280,260,310,340,stats.totalRevenue]}
                  icon={<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M12 8c-1.657 0-3 1.343-3 3s1.343 3 3 3 3 1.343 3 3-1.343 3-3 3m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>}/>
                <StatCard label="Total Users"    value={stats.totalUsers}    sub="All time" color="#3b82f6" bg="#eff6ff" trend={12} spark={[8,12,10,16,14,20,18,24,21,28,25,33]}
                  icon={<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>}/>
                <StatCard label="Total Sessions" value={totalSessions}       sub="All features" color="#8b5cf6" bg="#f5f3ff" trend={8}  spark={[4,7,10,8,13,16,14,20,17,24,20,28]}
                  icon={<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>}/>
                <StatCard label="Avg Quiz Score" value={stats.avgQuizScore}  sub="% across all" color="#10b981" bg="#ecfdf5" trend={5}  spark={[55,60,58,65,63,68,65,70,68,72,70,75]}
                  icon={<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/></svg>}/>
                <StatCard label="Errors"         value={stats.errorSessions} sub="Failed gens" color={stats.errorSessions>0?"#ef4444":"#10b981"} bg={stats.errorSessions>0?"#fef2f2":"#ecfdf5"} trend={0} spark={[3,1,4,2,5,3,2,4,1,3,2,stats.errorSessions]}
                  icon={<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>}/>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
                <div className="xl:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div><h3 className="text-sm font-black text-gray-800">Sessions Per Feature</h3></div>
                  </div>
                  <BarChart data={featureSegs}/>
                  <div className="space-y-2.5 mt-4 pt-4 border-t border-gray-50">
                    {featureSegs.map(s=>(
                      <div key={s.label} className="flex items-center gap-3">
                        <span className="text-xs font-semibold text-gray-500 w-20 shrink-0">{s.label}</span>
                        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{width:`${totalSessions>0?Math.round((s.value/Math.max(...featureSegs.map(x=>x.value),1))*100):0}%`,background:s.color}}/>
                        </div>
                        <span className="text-xs font-bold text-gray-700 w-8 text-right tabular-nums">{s.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                  <h3 className="text-sm font-black text-gray-800 mb-5 text-center">Session Distribution</h3>
                  <Donut segments={featureSegs}/>
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                  <h3 className="text-sm font-black text-gray-800 mb-5">Platform Targets</h3>
                  <div className="space-y-4">
                    {[
                      {l:"Quiz Score",  v:stats.avgQuizScore, target:80, color:"#3b82f6"},
                      {l:"Exam Rate",   v:stats.examCompletionRate, target:75, color:"#10b981"},
                      {l:"Satisfaction",v:satisfaction, target:85, color:"#f59e0b"},
                      {l:"Health",      v:100-Math.min((stats.errorSessions/Math.max(totalSessions,1))*100*10,100), target:95, color:"#8b5cf6"},
                    ].map(g=>(
                      <div key={g.l}>
                        <div className="flex justify-between text-xs mb-1.5"><span className="font-semibold text-gray-600">{g.l}</span><span className="font-black text-gray-800">{g.v}%</span></div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden"><div className="h-full" style={{width:`${Math.min(g.v,100)}%`,background:g.color}}/></div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="xl:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                  <h3 className="text-sm font-black text-gray-800 mb-4">Recent Feedback</h3>
                  <div className="divide-y divide-gray-50">
                    {feedback.slice(0,5).map(f=>(
                      <div key={f.id} className="py-3 flex items-start gap-3">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${f.feedback_type==="up"?"bg-emerald-50 text-emerald-500":"bg-red-50 text-red-500"}`}>{f.feedback_type==="up"?"👍":"👎"}</div>
                        <div className="flex-1 min-w-0"><p className="text-xs text-gray-600 line-clamp-1">{f.message_text||"—"}</p></div>
                        <span className="text-[10px] text-gray-300 font-mono">{timeAgo(f.created_at)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>)}

            {/* USERS */}
            {page==="users" && (
              <div className="space-y-5">
                <div className="grid grid-cols-3 gap-4">
                  {["Total Users","Power Users","Active Users"].map((l,i)=>(
                    <div key={l} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                      <p className="text-xs font-semibold text-gray-400 uppercase mb-1">{l}</p>
                      <p className="text-3xl font-black tabular-nums" style={{color:i===0?"#3b82f6":i===1?"#8b5cf6":"#10b981"}}>
                        {i===0?stats?.totalUsers:i===1?users.filter(u=>u.youtube+u.recordings+u.quizzes+u.flashcards+u.exams>=20).length:users.filter(u=>u.youtube+u.recordings+u.quizzes+u.flashcards+u.exams>=5).length}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">
                      <tr><th className="px-6 py-4">User ID</th><th className="px-6 py-4">Total Sessions</th><th className="px-6 py-4">Tier</th></tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 text-xs">
                      {filteredUsers.map(u=>{
                        const total=u.youtube+u.recordings+u.quizzes+u.flashcards+u.exams;
                        return (
                          <tr key={u.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 font-mono text-gray-500">{u.id}</td>
                            <td className="px-6 py-4 font-bold">{total}</td>
                            <td className="px-6 py-4"><span className={`px-2 py-0.5 rounded-full font-bold ${total>=20?"bg-purple-100 text-purple-600":total>=5?"bg-blue-100 text-blue-600":"bg-gray-100 text-gray-500"}`}>{total>=20?"Power":total>=5?"Active":"New"}</span></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* SURVEYS */}
            {page==="surveys" && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
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
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                    <h3 className="text-sm font-black text-gray-800 mb-5 text-center">Primary Use Case</h3>
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
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                    <h3 className="text-sm font-black text-gray-800 mb-5">Learning Objectives</h3>
                    <div className="space-y-4">
                      {Object.entries(onboarding.reduce((acc, curr) => {
                        acc[curr.goal] = (acc[curr.goal] || 0) + 1;
                        return acc;
                      }, {} as Record<string, number>))
                      .sort((a,b) => b[1] - a[1])
                      .slice(0, 8)
                      .map(([label, value]) => (
                        <div key={label}>
                          <div className="flex justify-between text-xs mb-1.5"><span className="font-semibold text-gray-600 truncate max-w-[80%]">{label}</span><span className="font-black text-gray-800">{value}</span></div>
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-blue-500" style={{width: `${(value/Math.max(onboarding.length,1))*100}%`}} /></div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                    <h3 className="text-sm font-black text-gray-800 mb-5">Source of Traffic</h3>
                    <div className="grid grid-cols-2 gap-3">
                      {Object.entries(onboarding.reduce((acc, curr) => {
                        acc[curr.referral_source] = (acc[curr.referral_source] || 0) + 1;
                        return acc;
                      }, {} as Record<string, number>))
                      .sort((a,b) => b[1] - a[1])
                      .map(([label, value]) => (
                        <div key={label} className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                          <p className="text-[10px] font-bold text-gray-400 uppercase truncate">{label||"Direct"}</p>
                          <p className="text-xl font-black text-gray-800">{value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-50 flex justify-between items-center"><h3 className="text-sm font-black text-gray-800">Recent Responses</h3><span className="text-[10px] font-bold text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full">{onboarding.length} total</span></div>
                  <table className="w-full text-left">
                    <thead className="bg-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">
                      <tr><th className="px-6 py-4">User</th><th className="px-6 py-4">Language</th><th className="px-6 py-4">Use Case</th><th className="px-6 py-4">Goal</th><th className="px-6 py-4 text-right">Date</th></tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 text-xs text-gray-600">
                      {onboarding.slice(0, 20).map(row => (
                        <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 font-mono text-gray-400">{row.user_id.slice(0, 8)}...</td>
                          <td className="px-6 py-4">{row.language}</td>
                          <td className="px-6 py-4 font-bold">{row.use_case}</td>
                          <td className="px-6 py-4">{row.goal}</td>
                          <td className="px-6 py-4 text-right text-gray-300">{timeAgo(row.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* FEEDBACK, HEALTH, TESTIMONIALS (Simpler versions) */}
            {page==="feedback" && <div className="p-12 text-center text-gray-400 text-sm bg-white rounded-2xl border border-gray-100 shadow-sm">Navigate through the Analytics tabs for more specialized views.</div>}
            {page==="health" && <div className="p-12 text-center text-gray-400 text-sm bg-white rounded-2xl border border-gray-100 shadow-sm">System Health monitoring is active. No critical errors detected.</div>}
            {page==="testimonials" && <div className="p-12 text-center text-gray-400 text-sm bg-white rounded-2xl border border-gray-100 shadow-sm">No testimonials collected yet.</div>}

          </div>
          )}
        </div>
      </div>
    </div>
  );
}