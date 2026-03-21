"use client";

import { useState, useRef, useEffect, useCallback, use } from "react";
import { supabase } from "@/lib/supabase";
import { validateFileSize, getFileType, getStorageBucket, formatBytes, TIER_LIMITS, type PlanTier, type MessageFileType } from "@/lib/tierLimits";

function slugToName(slug: string) { return slug.replace(/-/g, " "); }

function renderTextWithLinks(text: string) {
  const tokenRegex = /(https?:\/\/[^\s]+|@reviseforge)/gi;
  const parts = text.split(tokenRegex);
  return parts.map((part, i) => {
    if (/^https?:\/\//i.test(part)) return <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-blue-500 underline hover:text-blue-700 break-all cursor-pointer">{part}</a>;
    if (part.toLowerCase() === "@reviseforge") return <span key={i} className="text-blue-500 font-semibold">{part}</span>;
    return <span key={i}>{part}</span>;
  });
}

interface Profile { id: string; full_name: string; initials: string; avatar_color: string; plan: PlanTier; }
interface ChannelMember { user_id: string; role: "admin" | "member"; profile: Profile; status?: "online" | "away" | "offline"; }
interface ChannelInfo { id: string; name: string; created_by: string; }
interface Message { id: string; channel_id: string; user_id: string; content: string | null; message_type: "text" | "file" | "image" | "audio" | "video"; file_url: string | null; file_name: string | null; file_size: number | null; file_mime_type: string | null; duration_seconds: number | null; created_at: string; expires_at: string | null; reply_to_id?: string | null; reply_to_content?: string | null; reply_to_name?: string | null; is_deleted?: boolean; profile?: Profile; _optimistic?: boolean; }
interface InviteData { id: string; invite_code: string; expires_at: string; use_count: number; max_uses: number | null; }
interface Toast { id: number; message: string; type: "error" | "info" | "success"; }

const AVATAR_COLORS = ["bg-green-700","bg-blue-600","bg-purple-600","bg-rose-500","bg-orange-500","bg-teal-600","bg-indigo-600"];
const EMOJI_LIST = ["😀","😂","😍","🥰","😎","🤔","😢","😡","👍","👎","❤️","🔥","🎉","🙏","💯","😅","🤣","😊","😏","🥳","👏","🚀","💡","📚","✅","❌","⭐","🎯","💬","🤝"];

function colorForId(id: string) { let h = 0; for (let i = 0; i < id.length; i++) h = id.charCodeAt(i) + ((h << 5) - h); return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length]; }
function groupMessagesByDate(messages: Message[]) { const g: {date:string;messages:Message[]}[]=[]; messages.forEach(m=>{ const l=new Date(m.created_at).toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"}); const last=g[g.length-1]; if(last&&last.date===l)last.messages.push(m); else g.push({date:l,messages:[m]}); }); return g; }
function formatTime(iso: string) { return new Date(iso).toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"}); }
function formatDuration(s: number) { return `${Math.floor(s/60)}:${(s%60).toString().padStart(2,"0")}`; }
function daysLeft(e: string) { const d=Math.ceil((new Date(e).getTime()-Date.now())/(1000*60*60*24)); if(d<=0)return"⚠️ Expired"; if(d===1)return"Expires tomorrow"; return`Expires in ${d} days`; }
async function getSignedUrl(fileUrl: string): Promise<string> { try { const m=fileUrl.match(/\/storage\/v1\/object\/(?:public|sign)\/([^/]+)\/(.+?)(\?|$)/); if(!m)return fileUrl; const {data,error}=await supabase.storage.from(m[1]).createSignedUrl(m[2],3600); if(error||!data?.signedUrl)return fileUrl; return data.signedUrl; } catch{return fileUrl;} }

function SharePopup({channelId,channelName,isAdmin,onClose}:{channelId:string;channelName:string;isAdmin:boolean;onClose:()=>void}) {
  const [invite,setInvite]=useState<InviteData|null>(null); const [loading,setLoading]=useState(true); const [copied,setCopied]=useState(false); const [resetting,setResetting]=useState(false);
  const inviteUrl=invite?`${window.location.origin}/join/${invite.invite_code}`:"";
  useEffect(()=>{fetchInvite();},[channelId]);
  const fetchInvite=async()=>{ setLoading(true); const{data}=await supabase.from("channel_invites").select("id,invite_code,expires_at,use_count,max_uses").eq("channel_id",channelId).eq("is_revoked",false).gt("expires_at",new Date().toISOString()).order("created_at",{ascending:false}).limit(1).single(); setInvite(data??null); setLoading(false); };
  const handleCopy=async()=>{ if(!inviteUrl)return; await navigator.clipboard.writeText(inviteUrl); setCopied(true); setTimeout(()=>setCopied(false),2500); };
  const handleReset=async()=>{ if(!invite||!isAdmin)return; setResetting(true); await supabase.from("channel_invites").update({is_revoked:true}).eq("id",invite.id); await supabase.rpc("create_channel_invite",{p_channel_id:channelId,p_max_uses:null,p_expire_days:7}); await fetchInvite(); setResetting(false); };
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4" onClick={e=>e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 pt-6 pb-2"><div><h2 className="text-lg font-bold text-gray-900">Invite to #{channelName}</h2><p className="text-xs text-gray-500 mt-0.5">Share this link — anyone who opens it will join.</p></div><button onClick={onClose} className="p-1.5 cursor-pointer rounded-lg hover:bg-gray-100 text-gray-400 ml-3 shrink-0"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg></button></div>
        <div className="px-6 pb-6 mt-4">
          {loading?<div className="flex items-center justify-center py-8"><div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"/></div>:invite?(
            <><div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3"><svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/></svg><p className="text-xs text-gray-600 truncate flex-1 font-mono">{inviteUrl}</p></div>
            <div className="flex items-center justify-between mt-2 mb-3 px-1"><div className="flex items-center gap-1.5"><svg className="w-3.5 h-3.5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg><span className="text-xs text-amber-600 font-medium">{daysLeft(invite.expires_at)}</span></div><span className="text-xs text-gray-400">{invite.use_count}{invite.max_uses?` / ${invite.max_uses}`:""} uses</span></div>
            <button onClick={handleCopy} className={`mt-1 w-full py-3 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer ${copied?"bg-green-500 text-white":"bg-blue-600 hover:bg-blue-700 text-white"}`}>{copied?<><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>Link Copied!</>:<><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>Copy Invite Link</>}</button>
            {isAdmin&&<button onClick={handleReset} disabled={resetting} className="mt-2 w-full py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100 border border-gray-200 transition-colors flex items-center justify-center gap-2 cursor-pointer">{resetting?<div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"/>:<><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>Reset Invite Link</>}</button>}
            <p className="text-[11px] text-gray-400 text-center mt-3 leading-relaxed">Friends without an account will be asked to sign up first,<br/>then automatically join this channel.</p></>
          ):<div className="text-center py-4"><p className="text-sm text-gray-500 mb-4">No active invite link.</p>{isAdmin&&<button onClick={async()=>{setResetting(true);await supabase.rpc("create_channel_invite",{p_channel_id:channelId,p_max_uses:null,p_expire_days:7});await fetchInvite();setResetting(false);}} disabled={resetting} className="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors cursor-pointer">{resetting?"Creating…":"Generate Invite Link"}</button>}</div>}
        </div>
      </div>
    </div>
  );
}

function LeaveConfirmDialog({channelName,onConfirm,onCancel,leaving}:{channelName:string;onConfirm:()=>void;onCancel:()=>void;leaving:boolean}) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4" onClick={onCancel}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={e=>e.stopPropagation()}>
        <div className="flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mb-4"><svg className="w-7 h-7 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg></div>
          <h3 className="text-lg font-bold text-gray-900 mb-1">Exit #{channelName}?</h3>
          <p className="text-sm text-gray-500 mb-6">You will no longer receive messages from this channel. You can rejoin with an invite link.</p>
          <div className="flex gap-3 w-full">
            <button onClick={onCancel} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer">Cancel</button>
            <button onClick={onConfirm} disabled={leaving} className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-semibold transition-colors cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2">{leaving?<div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>:"Exit Channel"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AudioPlayer({url,duration}:{url:string;duration:number|null}) {
  const audioRef=useRef<HTMLAudioElement>(null); const [playing,setPlaying]=useState(false); const [progress,setProgress]=useState(0); const [currentTime,setCurrentTime]=useState(0); const [resolvedUrl,setResolvedUrl]=useState(url);
  useEffect(()=>{getSignedUrl(url).then(setResolvedUrl);},[url]);
  const togglePlay=()=>{ if(!audioRef.current)return; if(playing){audioRef.current.pause();setPlaying(false);}else{audioRef.current.play().catch(()=>{});setPlaying(true);} };
  useEffect(()=>{ const a=audioRef.current; if(!a)return; const u=()=>{setCurrentTime(Math.floor(a.currentTime));setProgress(a.duration?(a.currentTime/a.duration)*100:0);}; const e=()=>{setPlaying(false);setProgress(0);setCurrentTime(0);}; a.addEventListener("timeupdate",u);a.addEventListener("ended",e); return()=>{a.removeEventListener("timeupdate",u);a.removeEventListener("ended",e);}; },[]);
  return (<div className="flex items-center gap-3 bg-gray-100 rounded-xl px-4 py-2.5 max-w-xs"><audio ref={audioRef} src={resolvedUrl} preload="metadata"/><button onClick={togglePlay} className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white shrink-0 hover:bg-blue-700 transition-colors cursor-pointer">{playing?<svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>:<svg className="w-3 h-3 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>}</button><div className="flex-1 min-w-0"><div className="w-full h-1 bg-gray-300 rounded-full cursor-pointer" onClick={e=>{if(!audioRef.current?.duration)return;const r=e.currentTarget.getBoundingClientRect();audioRef.current.currentTime=((e.clientX-r.left)/r.width)*audioRef.current.duration;}}><div className="h-1 bg-blue-600 rounded-full transition-all pointer-events-none" style={{width:`${progress}%`}}/></div><p className="text-xs text-gray-500 mt-1">{formatDuration(currentTime)} / {duration?formatDuration(duration):"--:--"}</p></div></div>);
}

function FileIcon({mime}:{mime:string}) {
  if(mime.startsWith("image/"))return<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>;
  if(mime.startsWith("audio/"))return<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"/></svg>;
  if(mime.startsWith("video/"))return<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.069A1 1 0 0121 8.882v6.236a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>;
  return<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>;
}

function EmojiPicker({onSelect,onClose}:{onSelect:(e:string)=>void;onClose:()=>void}) {
  return(<div className="absolute bottom-full mb-2 left-0 z-50 bg-white border border-gray-200 rounded-2xl shadow-xl p-3 w-72"><div className="grid grid-cols-10 gap-1">{EMOJI_LIST.map(e=><button key={e} onClick={()=>{onSelect(e);onClose();}} className="text-xl hover:bg-gray-100 rounded-lg p-1 cursor-pointer transition-colors">{e}</button>)}</div></div>);
}

function MessageBubble({msg,currentUserId,onReply,onDelete}:{msg:Message;currentUserId:string;onReply:(m:Message)=>void;onDelete:(m:Message)=>void}) {
  const name=msg.profile?.full_name??"Unknown"; const initials=msg.profile?.initials??"??"; const color=msg.profile?colorForId(msg.profile.id):"bg-gray-400"; const isOwn=msg.user_id===currentUserId;
  const [showMsgEmoji,setShowMsgEmoji]=useState(false); const [reactions,setReactions]=useState<string[]>([]); const [resolvedImgUrl,setResolvedImgUrl]=useState(msg.file_url??"");
  useEffect(()=>{ if((msg.message_type==="image"||msg.message_type==="video")&&msg.file_url){getSignedUrl(msg.file_url).then(setResolvedImgUrl);} },[msg.file_url,msg.message_type]);
  return (
    <div className={`flex gap-3 group hover:bg-gray-50 rounded-xl px-3 py-2 -mx-3 transition-colors ${msg._optimistic?"opacity-60":""}`}>
      <div className={`w-9 h-9 rounded-full ${color} flex items-center justify-center text-white text-xs font-semibold shrink-0 mt-0.5`}>{initials}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 flex-wrap"><span className="text-sm font-semibold text-gray-900">{name}</span><span className="text-xs text-gray-400">{formatTime(msg.created_at)}</span></div>
        {msg.reply_to_id&&msg.reply_to_content&&(<div className="mt-1 mb-1 pl-3 border-l-2 border-blue-400 bg-blue-50 rounded-r-lg py-1.5 pr-3 max-w-sm overflow-hidden"><p className="text-[11px] font-semibold text-blue-600 truncate">{msg.reply_to_name??"Someone"}</p><p className="text-xs text-gray-500 line-clamp-2 break-words">{msg.reply_to_content}</p></div>)}
        {msg.content&&(<p className="text-sm text-gray-700 mt-0.5 leading-relaxed break-words">{msg.content.startsWith("@ReviseForge:")?(<><span className="text-blue-600 font-semibold">@ReviseForge</span><span className="text-gray-900">{msg.content.slice("@ReviseForge".length)}</span></>):renderTextWithLinks(msg.content)}</p>)}
        {msg.message_type==="image"&&resolvedImgUrl&&(<div className="mt-2"><img src={resolvedImgUrl} alt={msg.file_name??"Image"} className="max-w-xs rounded-xl border border-gray-200 object-cover cursor-pointer hover:opacity-95" style={{maxHeight:280}} onClick={()=>window.open(resolvedImgUrl,"_blank")} onError={e=>{(e.target as HTMLImageElement).src=msg.file_url??"";}} />{msg.file_name&&<p className="text-xs text-gray-400 mt-1">{msg.file_name} · {formatBytes(msg.file_size??0)}</p>}</div>)}
        {msg.message_type==="audio"&&msg.file_url&&<div className="mt-2"><AudioPlayer url={msg.file_url} duration={msg.duration_seconds}/></div>}
        {msg.message_type==="video"&&resolvedImgUrl&&<div className="mt-2"><video src={resolvedImgUrl} controls className="max-w-xs rounded-xl border border-gray-200" style={{maxHeight:240}}/></div>}
        {msg.message_type==="file"&&msg.file_url&&(<a href={msg.file_url} target="_blank" rel="noopener noreferrer" className="mt-2 flex items-center gap-3 bg-gray-100 hover:bg-gray-200 rounded-xl px-4 py-3 max-w-xs transition-colors no-underline cursor-pointer"><div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0"><FileIcon mime={msg.file_mime_type??""}/></div><div className="min-w-0"><p className="text-sm font-medium text-gray-800 truncate">{msg.file_name}</p><p className="text-xs text-gray-500">{formatBytes(msg.file_size??0)}</p></div><svg className="w-4 h-4 text-gray-400 shrink-0 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg></a>)}
        {reactions.length>0&&<div className="flex flex-wrap gap-1 mt-1">{reactions.map((r,i)=><span key={i} className="text-base bg-gray-100 rounded-full px-2 py-0.5 cursor-default">{r}</span>)}</div>}
      </div>
      <div className="relative flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 self-start mt-1">
        <div className="relative">{showMsgEmoji&&(<div className="absolute bottom-full right-0 mb-2 z-50 bg-white border border-gray-200 rounded-2xl shadow-xl p-2 w-64"><div className="grid grid-cols-8 gap-1">{EMOJI_LIST.map(e=><button key={e} onClick={()=>{setReactions(r=>[...r,e]);setShowMsgEmoji(false);}} className="text-lg hover:bg-gray-100 rounded-lg p-1 cursor-pointer transition-colors">{e}</button>)}</div></div>)}<button className="p-1.5 cursor-pointer rounded-lg hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors" title="React" onClick={e=>{e.stopPropagation();setShowMsgEmoji(v=>!v);}}><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg></button></div>
        <button className="p-1.5 cursor-pointer rounded-lg hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors" title="Reply" onClick={()=>onReply(msg)}><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"/></svg></button>
        {isOwn&&<button className="p-1.5 cursor-pointer rounded-lg hover:bg-red-100 text-gray-400 hover:text-red-500 transition-colors" title="Delete" onClick={()=>onDelete(msg)}><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></button>}
      </div>
    </div>
  );
}

function ToastContainer({toasts,onDismiss}:{toasts:Toast[];onDismiss:(id:number)=>void}) {
  return(<div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 pointer-events-none">{toasts.map(t=><div key={t.id} className={`pointer-events-auto px-4 py-2.5 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2 ${t.type==="error"?"bg-red-600 text-white":t.type==="success"?"bg-green-600 text-white":"bg-gray-900 text-white"}`}>{t.message}<button onClick={()=>onDismiss(t.id)} className="ml-1 opacity-70 hover:opacity-100 cursor-pointer">✕</button></div>)}</div>);
}

export default function ChannelPage({params}:{params:Promise<{name:string}>}) {
  const {name}=use(params); const channelSlug=name??"";
  const [channel,setChannel]=useState<ChannelInfo|null>(null); const [currentUser,setCurrentUser]=useState<Profile|null>(null); const [currentUserRole,setCurrentUserRole]=useState<"admin"|"member">("member"); const [members,setMembers]=useState<ChannelMember[]>([]); const [messages,setMessages]=useState<Message[]>([]); const [loading,setLoading]=useState(true); const [notFound,setNotFound]=useState(false);
  const [inputValue,setInputValue]=useState(""); const [sending,setSending]=useState(false); const [uploadFile,setUploadFile]=useState<File|null>(null); const [uploading,setUploading]=useState(false); const [replyTo,setReplyTo]=useState<Message|null>(null); const [aiThinking,setAiThinking]=useState(false); const [showEmojiPicker,setShowEmojiPicker]=useState(false);
  const [isRecording,setIsRecording]=useState(false); const [recordingTime,setRecordingTime]=useState(0); const mediaRecorderRef=useRef<MediaRecorder|null>(null); const recordingChunks=useRef<Blob[]>([]); const recordingTimer=useRef<ReturnType<typeof setInterval>|null>(null);
  const [showMembers,setShowMembers]=useState(false); const [showAllMembers,setShowAllMembers]=useState(false); const [showShare,setShowShare]=useState(false); const [showLeaveConfirm,setShowLeaveConfirm]=useState(false); const [leaving,setLeaving]=useState(false); const [toasts,setToasts]=useState<Toast[]>([]);
  const messagesEndRef=useRef<HTMLDivElement>(null); const fileInputRef=useRef<HTMLInputElement>(null); const textareaRef=useRef<HTMLTextAreaElement>(null);

  const toast=useCallback((message:string,type:Toast["type"]="info")=>{ const id=Date.now(); setToasts(p=>[...p,{id,message,type}]); setTimeout(()=>setToasts(p=>p.filter(t=>t.id!==id)),4000); },[]);

  useEffect(()=>{ (async()=>{ const{data:{user}}=await supabase.auth.getUser(); if(!user)return; const{data:profile}=await supabase.from("profiles").select("*").eq("id",user.id).single(); if(profile)setCurrentUser(profile as Profile); const nameFromSlug=slugToName(channelSlug); const{data:ch}=await supabase.from("channels").select("id,name,created_by").ilike("name",nameFromSlug).single(); if(!ch){setNotFound(true);setLoading(false);return;} setChannel(ch as ChannelInfo); const{data:membersData}=await supabase.from("channel_members").select(`user_id,role,profiles(id,full_name,initials,avatar_color,plan)`).eq("channel_id",ch.id); if(membersData){const list=membersData.map((m:any)=>({user_id:m.user_id,role:m.role,profile:m.profiles,status:"offline" as const}));setMembers(list);const mine=membersData.find((m:any)=>m.user_id===user.id);if(mine)setCurrentUserRole(mine.role);} const{data:msgs}=await supabase.from("messages").select(`*,profile:profiles(id,full_name,initials,avatar_color,plan)`).eq("channel_id",ch.id).eq("is_deleted",false).order("created_at",{ascending:true}).limit(100); if(msgs)setMessages(msgs as Message[]); setLoading(false); })(); },[channelSlug]);

  useEffect(()=>{ if(!channel||!currentUser)return; const sub=supabase.channel(`room:${channel.id}`).on("postgres_changes",{event:"INSERT",schema:"public",table:"messages",filter:`channel_id=eq.${channel.id}`},async payload=>{ const newMsg=payload.new as Message; const{data:prof}=await supabase.from("profiles").select("id,full_name,initials,avatar_color,plan").eq("id",newMsg.user_id).single(); setMessages(prev=>{ const optIdx=prev.findIndex(m=>m._optimistic&&m.user_id===newMsg.user_id&&m.content===newMsg.content); if(optIdx!==-1){const next=[...prev];next[optIdx]={...newMsg,profile:prof??undefined};return next;} if(prev.some(m=>m.id===newMsg.id))return prev; return[...prev,{...newMsg,profile:prof??undefined}]; }); }).on("postgres_changes",{event:"UPDATE",schema:"public",table:"messages",filter:`channel_id=eq.${channel.id}`},payload=>{ const u=payload.new as any; if(u.is_deleted===true)setMessages(prev=>prev.filter(m=>m.id!==u.id)); }).on("presence",{event:"sync"},()=>{ const state=sub.presenceState<{user_id:string}>(); const onlineIds=new Set(Object.values(state).flat().map(p=>p.user_id)); setMembers(prev=>prev.map(m=>({...m,status:onlineIds.has(m.user_id)?"online":"offline" as const}))); }).on("presence",{event:"join"},({newPresences})=>{ const ids=new Set(newPresences.map((p:any)=>p.user_id as string)); setMembers(prev=>prev.map(m=>({...m,status:ids.has(m.user_id)?"online":m.status}))); }).on("presence",{event:"leave"},({leftPresences})=>{ const ids=new Set(leftPresences.map((p:any)=>p.user_id as string)); setMembers(prev=>prev.map(m=>({...m,status:ids.has(m.user_id)?"offline" as const:m.status}))); }).subscribe(async status=>{if(status==="SUBSCRIBED")await sub.track({user_id:currentUser.id});}); return()=>{supabase.removeChannel(sub);}; },[channel,currentUser]);

  useEffect(()=>{messagesEndRef.current?.scrollIntoView({behavior:"smooth"});},[messages]);
  useEffect(()=>{ if(!showEmojiPicker)return; const h=()=>setShowEmojiPicker(false); document.addEventListener("click",h); return()=>document.removeEventListener("click",h); },[showEmojiPicker]);

  const handleLeaveChannel=async()=>{ if(!currentUser||!channel)return; setLeaving(true); const{error}=await supabase.from("channel_members").delete().eq("channel_id",channel.id).eq("user_id",currentUser.id); if(error){toast("Failed to leave channel","error");setLeaving(false);return;} window.location.href="/dashboard"; };

  const uploadToStorage=async(file:File,fileType:MessageFileType)=>{ const bucket=getStorageBucket(fileType); const path=`${currentUser?.id??"anon"}/${Date.now()}_${file.name.replace(/\s+/g,"_")}`; const{error}=await supabase.storage.from(bucket).upload(path,file,{cacheControl:"3600"}); if(error){toast(`Upload failed: ${error.message}`,"error");return null;} const{data:{publicUrl}}=supabase.storage.from(bucket).getPublicUrl(path); return publicUrl; };

  const insertMessage=async(payload:Partial<Message&{is_deleted?:boolean}>)=>{ if(!currentUser||!channel)return null; const{data,error}=await supabase.from("messages").insert({channel_id:channel.id,user_id:currentUser.id,...payload}).select(`*,profile:profiles(id,full_name,initials,avatar_color,plan)`).single(); if(error){toast(`Send failed: ${error.message}`,"error");return null;} return data as Message; };

  const handleDelete=async(msg:Message)=>{ setMessages(prev=>prev.filter(m=>m.id!==msg.id)); if(msg._optimistic)return; const{error}=await supabase.from("messages").update({is_deleted:true}).eq("id",msg.id); if(error){setMessages(prev=>{const copy=[...prev,msg];return copy.sort((a,b)=>new Date(a.created_at).getTime()-new Date(b.created_at).getTime());});toast("Could not delete message","error");} };

  const handleSend=async()=>{ const text=inputValue.trim(); if(!text||sending||!currentUser)return; const aiMatch=text.match(/@reviseforge\s+([\s\S]*)/i); if(aiMatch){ const q=aiMatch[1].trim(); if(!q){toast("Add a question after @reviseforge","info");return;} const rs=replyTo; const ctx=[]; if(rs){const qt=rs.message_type==="text"?rs.content??"":rs.message_type==="image"?"[Photo]":rs.message_type==="audio"?"[Voice message]":rs.message_type==="video"?"[Video]":`[File: ${rs.file_name}]`;ctx.push(`The student is asking about this message from ${rs.profile?.full_name??"someone"}: "${qt}"`);}ctx.push(`Student question: ${q}`); setSending(true);setInputValue("");setReplyTo(null); const oid=`opt-${Date.now()}`; const opt:Message={id:oid,channel_id:channel?.id??"",user_id:currentUser.id,content:text,message_type:"text",file_url:null,file_name:null,file_size:null,file_mime_type:null,duration_seconds:null,created_at:new Date().toISOString(),expires_at:null,reply_to_id:rs?.id??null,reply_to_content:rs?.content??rs?.file_name??null,reply_to_name:rs?.profile?.full_name??null,profile:currentUser,_optimistic:true}; setMessages(p=>[...p,opt]); const saved=await insertMessage({content:text,message_type:"text",reply_to_id:rs?.id??null,reply_to_content:rs?.content??rs?.file_name??null,reply_to_name:rs?.profile?.full_name??null}); if(saved){setMessages(p=>{if(p.some(m=>m.id===saved.id))return p.filter(m=>m.id!==oid);return p.map(m=>m.id===oid?{...saved}:m);});}else{setMessages(p=>p.filter(m=>m.id!==oid));} setAiThinking(true); try{const res=await fetch("/api/chat-general",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({question:ctx.join("\n\n"),history:[]})}); const json=await res.json(); const aiMsg=await insertMessage({content:`@ReviseForge: ${json.answer??json.error??"Sorry, I couldn't get an answer."}`,message_type:"text",reply_to_id:saved?.id??null,reply_to_content:text,reply_to_name:currentUser.full_name}); if(aiMsg){setMessages(p=>{if(p.some(m=>m.id===aiMsg.id))return p;return[...p,{...aiMsg,profile:currentUser}];});}}catch{toast("AI failed to respond. Try again.","error");}finally{setAiThinking(false);setSending(false);} return; }
    setSending(true); const oid=`opt-${Date.now()}`; const opt:Message={id:oid,channel_id:channel?.id??"",user_id:currentUser.id,content:text,message_type:"text",file_url:null,file_name:null,file_size:null,file_mime_type:null,duration_seconds:null,created_at:new Date().toISOString(),expires_at:null,reply_to_id:replyTo?.id??null,reply_to_content:replyTo?.content??replyTo?.file_name??null,reply_to_name:replyTo?.profile?.full_name??null,profile:currentUser,_optimistic:true}; setMessages(p=>[...p,opt]); setInputValue("");setReplyTo(null); const saved=await insertMessage({content:text,message_type:"text",reply_to_id:replyTo?.id??null,reply_to_content:replyTo?.content??replyTo?.file_name??null,reply_to_name:replyTo?.profile?.full_name??null}); if(saved){setMessages(p=>{if(p.some(m=>m.id===saved.id))return p.filter(m=>m.id!==oid);return p.map(m=>m.id===oid?{...saved}:m);});}else{setMessages(p=>p.filter(m=>m.id!==oid));} setSending(false); };

  const handleKeyDown=(e:React.KeyboardEvent<HTMLTextAreaElement>)=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();handleSend();}};
  const handleFileSelect=(e:React.ChangeEvent<HTMLInputElement>)=>{ const f=e.target.files?.[0]; if(!f||!currentUser)return; const v=validateFileSize(f,currentUser.plan); if(!v.valid){toast(v.error!,"error");e.target.value="";return;} setUploadFile(f); };
  const handleFileSend=async()=>{ if(!uploadFile||!currentUser)return; const ft=getFileType(uploadFile.type); if(!ft){toast("Unsupported file type.","error");return;} setUploading(true); const url=await uploadToStorage(uploadFile,ft); setUploading(false);setUploadFile(null); if(fileInputRef.current)fileInputRef.current.value=""; if(!url)return; const mt=ft==="image"?"image":ft==="audio"?"audio":ft==="video"?"video":"file"; await insertMessage({message_type:mt as Message["message_type"],file_url:url,file_name:uploadFile.name,file_size:uploadFile.size,file_mime_type:uploadFile.type}); toast("File sent!","success"); };
  const startRecording=async()=>{ try{ const stream=await navigator.mediaDevices.getUserMedia({audio:true}); const recorder=new MediaRecorder(stream,{mimeType:"audio/webm"}); recordingChunks.current=[]; recorder.ondataavailable=e=>{if(e.data.size>0)recordingChunks.current.push(e.data);}; recorder.onstop=async()=>{ stream.getTracks().forEach(t=>t.stop()); const blob=new Blob(recordingChunks.current,{type:"audio/webm"}); const file=new File([blob],`voice_${Date.now()}.webm`,{type:"audio/webm"}); if(!currentUser)return; const v=validateFileSize(file,currentUser.plan); if(!v.valid){toast(v.error!,"error");return;} setUploading(true); const url=await uploadToStorage(file,"audio"); setUploading(false); if(!url)return; await insertMessage({message_type:"audio",file_url:url,file_name:file.name,file_size:file.size,file_mime_type:file.type,duration_seconds:recordingTime}); setRecordingTime(0);toast("Voice message sent!","success"); }; recorder.start();mediaRecorderRef.current=recorder;setIsRecording(true); recordingTimer.current=setInterval(()=>setRecordingTime(t=>t+1),1000); }catch{toast("Microphone access denied.","error");} };
  const stopAndSend=()=>{ mediaRecorderRef.current?.stop(); if(recordingTimer.current){clearInterval(recordingTimer.current);recordingTimer.current=null;} setIsRecording(false); };
  const cancelRecording=()=>{ if(mediaRecorderRef.current){mediaRecorderRef.current.ondataavailable=null;mediaRecorderRef.current.onstop=null;mediaRecorderRef.current.stop();} if(recordingTimer.current){clearInterval(recordingTimer.current);recordingTimer.current=null;} recordingChunks.current=[];setIsRecording(false);setRecordingTime(0);toast("Recording cancelled","info"); };

  const planLimits=TIER_LIMITS[currentUser?.plan??"free"]; const onlineMembers=members.filter(m=>m.status==="online"); const grouped=groupMessagesByDate(messages);
  const PREVIEW_COUNT=10; const displayedMembers=showAllMembers?members:members.slice(0,PREVIEW_COUNT); const remainingCount=members.length-PREVIEW_COUNT;

  if(notFound)return(<div className="flex h-screen items-center justify-center bg-white"><div className="text-center"><p className="text-4xl mb-3">🔍</p><h2 className="text-lg font-bold text-gray-900 mb-1">Channel not found</h2><p className="text-sm text-gray-500">The channel "{slugToName(channelSlug)}" doesn't exist.</p></div></div>);

  return (
    <div className="flex h-screen bg-white overflow-hidden">
      <ToastContainer toasts={toasts} onDismiss={id=>setToasts(p=>p.filter(t=>t.id!==id))}/>
      {showShare&&channel&&<SharePopup channelId={channel.id} channelName={channel.name} isAdmin={currentUserRole==="admin"} onClose={()=>setShowShare(false)}/>}
      {showLeaveConfirm&&channel&&<LeaveConfirmDialog channelName={channel.name} onConfirm={handleLeaveChannel} onCancel={()=>setShowLeaveConfirm(false)} leaving={leaving}/>}

      <div className="flex flex-col flex-1 min-w-0">
        {/* Top bar */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200 bg-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5"><span className="text-gray-400 text-lg font-light">#</span><h1 className="text-base font-bold text-gray-900">{channel?.name??"Loading…"}</h1></div>
            <div className="w-px h-4 bg-gray-200"/>
            <p className="text-xs text-gray-500 hidden sm:block">Study channel · {members.length} members</p>
            {currentUserRole==="admin"&&<span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">Admin</span>}
            {currentUser&&<span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${currentUser.plan==="pro"?"bg-yellow-100 text-yellow-700":"bg-gray-100 text-gray-500"}`}>{currentUser.plan==="pro"?"⭐ Pro":"Free"}</span>}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={()=>setShowMembers(!showMembers)} className="flex cursor-pointer items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors">
              <div className="flex -space-x-2">{members.slice(0,3).map(m=><div key={m.user_id} className={`w-7 h-7 rounded-full ${colorForId(m.user_id)} flex items-center justify-center text-white text-[10px] font-semibold border-2 border-white`}>{m.profile?.initials??"?"}</div>)}</div>
              <span className="text-sm font-semibold text-gray-700">{members.length}</span>
              <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-500"/><span className="text-xs text-gray-500">{onlineMembers.length} online</span></div>
            </button>
            <button className="p-2 cursor-pointer rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg></button>
            <button className="p-2 cursor-pointer rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/></svg></button>
            <button onClick={()=>setShowShare(true)} className="p-2 cursor-pointer rounded-lg hover:bg-blue-50 text-blue-500 transition-colors"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 12v7a1 1 0 001 1h14a1 1 0 001-1v-7M16 6l-4-4m0 0L8 6m4-4v14"/></svg></button>
          </div>
        </div>

        {currentUser?.plan==="free"&&(
          <div className="px-6 py-2.5 bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-100 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5 min-w-0"><div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center shrink-0"><svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg></div><div className="min-w-0"><p className="text-xs font-semibold text-amber-800">Free Plan — Messages delete after 14 days</p><p className="text-[11px] text-amber-600 truncate">File limits: images {planLimits.label.image} · docs {planLimits.label.document} · audio {planLimits.label.audio} · video {planLimits.label.video}</p></div></div>
            <button className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>Upgrade to Pro</button>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {loading?(<div className="flex items-center justify-center h-full"><div className="flex flex-col items-center gap-3"><div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"/><p className="text-sm text-gray-400">Loading messages…</p></div></div>):messages.length===0?(<div className="flex flex-col items-center justify-center h-full gap-2 text-center"><div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-2xl">💬</div><p className="text-sm font-medium text-gray-600">No messages yet</p><p className="text-xs text-gray-400">Be the first to say something in #{channel?.name}!</p></div>):(grouped.map(group=>(
            <div key={group.date}>
              <div className="flex items-center gap-3 mb-4"><div className="flex-1 h-px bg-gray-200"/><span className="text-xs font-medium text-gray-500 bg-white px-3 py-1 border border-gray-200 rounded-full shrink-0">{group.date}</span><div className="flex-1 h-px bg-gray-200"/></div>
              <div className="space-y-4">{group.messages.map(msg=><MessageBubble key={msg.id} msg={msg} currentUserId={currentUser?.id??""} onReply={m=>{setReplyTo(m);textareaRef.current?.focus();}} onDelete={handleDelete}/>)}</div>
            </div>
          )))}
          {aiThinking&&(<div className="flex gap-3 px-3 py-2"><div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-semibold shrink-0">AI</div><div className="flex items-center gap-2 bg-gray-100 rounded-xl px-4 py-2.5"><div className="flex gap-1"><span className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{animationDelay:"0ms"}}/><span className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{animationDelay:"150ms"}}/><span className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{animationDelay:"300ms"}}/></div><span className="text-xs text-gray-500">@ReviseForge is thinking…</span></div></div>)}
          <div ref={messagesEndRef}/>
        </div>

        {uploadFile&&!uploading&&(<div className="px-6 py-3 border-t border-blue-100 bg-blue-50 flex items-center gap-3"><div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0"><FileIcon mime={uploadFile.type}/></div><div className="flex-1 min-w-0"><p className="text-sm font-medium text-gray-800 truncate">{uploadFile.name}</p><p className="text-xs text-gray-500">{formatBytes(uploadFile.size)}</p></div><button onClick={handleFileSend} className="px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition-colors cursor-pointer">Send</button><button onClick={()=>{setUploadFile(null);if(fileInputRef.current)fileInputRef.current.value="";}} className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg></button></div>)}

        {/* Input */}
        <div className="px-6 py-4 border-t border-gray-200 bg-white shrink-0">
          <input ref={fileInputRef} type="file" accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt" className="hidden" onChange={handleFileSelect}/>
          {isRecording?(
            <div className="border border-red-200 bg-red-50 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3"><span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse shrink-0"/><span className="text-sm font-semibold text-red-600 tabular-nums">{formatDuration(recordingTime)}</span><span className="text-xs text-red-400">Recording…</span></div>
              <div className="flex items-center gap-2"><button onClick={cancelRecording} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-gray-600 text-xs font-medium hover:bg-gray-50 transition-colors cursor-pointer"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>Cancel</button><button onClick={stopAndSend} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors cursor-pointer"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg>Send</button></div>
            </div>
          ):(
            <div className="border border-gray-200 rounded-xl overflow-visible focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent transition-all">
              {replyTo&&(<div className="flex items-center gap-2 px-4 pt-3 pb-2 border-b border-gray-100"><div className="w-0.5 h-8 bg-blue-500 rounded-full shrink-0"/><div className="flex-1 min-w-0"><p className="text-[11px] font-semibold text-blue-600">{replyTo.profile?.full_name??"Someone"}</p><p className="text-xs text-gray-500 truncate">{replyTo.message_type==="text"?replyTo.content:replyTo.message_type==="image"?"📷 Photo":replyTo.message_type==="audio"?"🎤 Voice message":replyTo.message_type==="video"?"🎥 Video":`📎 ${replyTo.file_name}`}</p></div><button onClick={()=>setReplyTo(null)} className="p-1 cursor-pointer text-gray-400 hover:text-gray-600 shrink-0"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg></button></div>)}
              <div className="flex items-center gap-1 px-3 pt-2 pb-1 border-b border-gray-100"><button className="p-1.5 rounded cursor-pointer hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors text-xs font-bold w-7 h-7 flex items-center justify-center">B</button><button className="p-1.5 rounded cursor-pointer hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors text-xs italic w-7 h-7 flex items-center justify-center">I</button><button className="p-1.5 rounded cursor-pointer hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors w-7 h-7 flex items-center justify-center"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/></svg></button><div className="w-px h-4 bg-gray-200 mx-1"/><button className="p-1.5 rounded cursor-pointer hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors w-7 h-7 flex items-center justify-center"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"/></svg></button></div>
              <textarea ref={textareaRef} value={inputValue} onChange={e=>setInputValue(e.target.value)} onKeyDown={handleKeyDown} placeholder={replyTo?`Reply to ${replyTo.profile?.full_name??"message"}… or type @reviseforge to ask AI`:`Message #${channel?.name?.toLowerCase().replace(/\s+/g,"-")??"channel"} · @reviseforge to ask AI`} rows={2} className="w-full px-4 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none resize-none bg-white"/>
              <div className="flex items-center justify-between px-3 pb-2 relative">
                <div className="flex items-center gap-1">
                  <button onClick={()=>fileInputRef.current?.click()} disabled={uploading} className="p-1.5 cursor-pointer rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-40"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"/></svg></button>
                  <div className="relative">{showEmojiPicker&&<EmojiPicker onSelect={e=>setInputValue(v=>v+e)} onClose={()=>setShowEmojiPicker(false)}/>}<button onClick={ev=>{ev.stopPropagation();setShowEmojiPicker(v=>!v);}} className="p-1.5 cursor-pointer rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg></button></div>
                  <button onClick={()=>{setInputValue("@reviseforge ");textareaRef.current?.focus();}} className="p-1.5 cursor-pointer rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207"/></svg></button>
                  <button onClick={startRecording} disabled={uploading} className="p-1.5 cursor-pointer rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-40"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"/></svg></button>
                </div>
                <button onClick={handleSend} disabled={!inputValue.trim()||sending} className="p-2 cursor-pointer rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">{sending?<div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>:<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg>}</button>
              </div>
            </div>
          )}
          <div className="mt-1.5 text-center space-y-0.5">
            <p className="text-xs text-gray-400">Press <kbd className="bg-gray-100 px-1 py-0.5 rounded text-gray-500 text-[10px]">Enter</kbd> to send · <kbd className="bg-gray-100 px-1 py-0.5 rounded text-gray-500 text-[10px]">Shift+Enter</kbd> for new line · <span className="text-blue-400">@reviseforge</span> to ask AI</p>
            <p className="text-[11px] text-gray-400"><span className="text-blue-400 font-medium">@reviseforge</span> is AI and can make mistakes. Please double-check responses.</p>
          </div>
        </div>
      </div>

      {/* ── Members sidebar — WhatsApp Group Info style ── */}
      {showMembers&&(
        <div className="w-72 border-l border-gray-200 bg-white flex flex-col shrink-0">
          {/* Header */}
          <div className="px-4 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
            <h3 className="text-sm font-semibold text-gray-900">Group info</h3>
            <button onClick={()=>setShowMembers(false)} className="p-1 cursor-pointer rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg></button>
          </div>

          {/* Channel avatar + name */}
          <div className="flex flex-col items-center py-5 px-4 border-b border-gray-100 shrink-0">
            <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center mb-3"><svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/></svg></div>
            <h4 className="text-base font-bold text-gray-900">#{channel?.name}</h4>
            <p className="text-xs text-gray-500 mt-0.5">Study channel · {members.length} members</p>
            <div className="flex items-center gap-1.5 mt-1.5"><div className="w-2 h-2 rounded-full bg-green-500"/><span className="text-xs text-green-600 font-medium">{onlineMembers.length} online now</span></div>
          </div>

          {/* Members list */}
          <div className="flex-1 overflow-y-auto">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-100"><p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{members.length} members</p></div>
            <div className="divide-y divide-gray-50">
              {displayedMembers.map(member=>(
                <div key={member.user_id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
                  <div className="relative shrink-0">
                    <div className={`w-10 h-10 rounded-full ${colorForId(member.user_id)} flex items-center justify-center text-white text-sm font-semibold`}>{member.profile?.initials??"?"}</div>
                    <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${member.status==="online"?"bg-green-500":"bg-gray-300"}`}/>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{member.profile?.full_name??"Unknown"}</p>
                    <p className="text-xs text-gray-400">{member.status==="online"?"online":"offline"}</p>
                  </div>
                  {member.role==="admin"&&<span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-600 shrink-0">Admin</span>}
                </div>
              ))}
            </div>

            {/* View all / show less */}
            {!showAllMembers&&remainingCount>0&&(
              <button onClick={()=>setShowAllMembers(true)} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left border-t border-gray-100 cursor-pointer">
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center shrink-0"><svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg></div>
                <span className="text-sm font-medium text-blue-600">View all ({remainingCount} more)</span>
              </button>
            )}
            {showAllMembers&&members.length>PREVIEW_COUNT&&(
              <button onClick={()=>setShowAllMembers(false)} className="w-full px-4 py-3 text-sm text-gray-500 hover:bg-gray-50 transition-colors text-left border-t border-gray-100 cursor-pointer">Show less</button>
            )}
          </div>

          {/* Exit Channel */}
          <div className="border-t border-gray-100 shrink-0">
            <button onClick={()=>setShowLeaveConfirm(true)} className="w-full flex items-center gap-3 px-4 py-4 hover:bg-red-50 transition-colors text-left cursor-pointer group">
              <div className="w-9 h-9 rounded-full bg-red-100 group-hover:bg-red-200 flex items-center justify-center shrink-0 transition-colors"><svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg></div>
              <span className="text-sm font-semibold text-red-500">Exit channel</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}