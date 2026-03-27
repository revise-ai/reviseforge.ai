"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/context/LanguageContext";
import { languages } from "@/lib/translations";
import AddNotePanel from "./AddNotePanel";
import CreateChannelModal from "./CreateChannelModal";

interface Channel { id: string; name: string; members: number; }
interface Note { id: string; name: string; }
interface SidebarProps { userName?: string; userEmail?: string; }

function nameToSlug(name: string) { return name.toLowerCase().replace(/\s+/g, "-"); }

function getInitials(name: string) {
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
}

// ── Inner sidebar that uses useSearchParams ───────────────────
function SidebarInner({ userName: propName, userEmail: propEmail }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [showAddNote, setShowAddNote] = useState(false);
  const [showChannelsPanel, setShowChannelsPanel] = useState(false);
  const [showCreateChannelModal, setShowCreateChannelModal] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loadingChannels, setLoadingChannels] = useState(false);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loggingOut, setLoggingOut] = useState(false);
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);

  const { language, setLanguage, t } = useLanguage();

  // Real user data from Supabase
  const [userName, setUserName] = useState(propName ?? "");
  const [userEmail, setUserEmail] = useState(propEmail ?? "");
  const [userInitials, setUserInitials] = useState("");

  // ── Load real user from Supabase auth ────────────────────
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Try profile table first for full_name
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, initials")
        .eq("id", user.id)
        .single();

      const name = profile?.full_name ?? user.user_metadata?.full_name ?? user.email?.split("@")[0] ?? "User";
      const email = user.email ?? "";
      const initials = profile?.initials ?? getInitials(name);

      setUserName(name);
      setUserEmail(email);
      setUserInitials(initials);
    })();
  }, []);

  // ── Fetch channels ────────────────────────────────────────
  const fetchChannels = async () => {
    setLoadingChannels(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoadingChannels(false); return; }
    const { data, error } = await supabase
      .from("channel_members")
      .select(`channel_id, channels (id, name)`)
      .eq("user_id", user.id);
    if (!error && data) {
      const list: Channel[] = data.map((row: any) => ({ id: row.channels?.id ?? "", name: row.channels?.name ?? "", members: 1 })).filter(c => c.id);
      setChannels(list);
    }
    setLoadingChannels(false);
  };

  useEffect(() => { fetchChannels(); }, []);

  // ── Re-fetch channels when ?joined=true appears in URL ────
  useEffect(() => {
    if (searchParams.get("joined") === "true") { fetchChannels(); }
  }, [searchParams]);

  // ── Load notes ────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data, error } = await supabase.from("notes").select("id, name").eq("user_id", user.id).order("created_at", { ascending: false });
      if (!error && data) setNotes(data as Note[]);
    })();
  }, []);

  // ── Logout ────────────────────────────────────────────────
  const handleLogout = async () => {
    setLoggingOut(true);
    await supabase.auth.signOut();
    router.replace("/");
  };

  const handleChannelCreated = (channel: Channel) => {
    setChannels(prev => [...prev, channel]);
    router.push(`/dashboard/channel/${nameToSlug(channel.name)}`);
    setShowChannelsPanel(false);
  };

  const deleteChannel = async (id: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("channel_members").delete().eq("channel_id", id).eq("user_id", user.id);
    setChannels(prev => prev.filter(c => c.id !== id));
  };

  const handleNoteCreated = async (name: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data, error } = await supabase.from("notes").insert({ name, user_id: user.id, content: "" }).select("id, name").single();
    if (!error && data) { setNotes(prev => [data as Note, ...prev]); setShowAddNote(false); router.push(`/dashboard/note/${encodeURIComponent(data.name)}`); }
  };

  const handleNoteSelected = (note: Note) => { setShowAddNote(false); router.push(`/dashboard/note/${encodeURIComponent(note.name)}`); };
  const handleNoteDeleted = async (id: string) => { await supabase.from("notes").delete().eq("id", id); setNotes(prev => prev.filter(n => n.id !== id)); };

  // ── Avatar color based on initials ───────────────────────
  const avatarColors = ["bg-green-700","bg-blue-600","bg-purple-600","bg-rose-500","bg-orange-500","bg-teal-600","bg-indigo-600"];
  const avatarColor = avatarColors[(userInitials.charCodeAt(0) || 0) % avatarColors.length];

  return (
    <>
      {/* ── Collapsed icon sidebar ── */}
      <aside className="fixed left-0 top-0 bottom-0 w-22.5 bg-white border-r border-gray-200 flex flex-col z-40">
        {/* Logo */}
        <div className="flex items-center justify-center py-5 shrink-0">
          <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center">
            <div className="w-6 h-6 bg-white rounded-md" />
          </div>
        </div>

        {/* Nav items */}
        <div className="flex-1 flex flex-col items-center gap-1 px-3">
          <Link href="/dashboard" className={`flex flex-col items-center justify-center w-full py-1.5 rounded-lg transition-colors gap-0.5 ${pathname==="/dashboard"?"bg-gray-100 text-gray-700":"hover:bg-gray-100 text-gray-400"}`}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>
            <span className="text-[10px] font-medium leading-tight">{t('sidebar_home')}</span>
          </Link>

          <div className="text-[10px] text-gray-400 font-medium mt-1 mb-0.5">{t('sidebar_notes')}</div>

          <button onClick={()=>{setShowChannelsPanel(false);setShowAddNote(v=>!v);}} className={`flex flex-col items-center justify-center w-full py-1.5 rounded-lg transition-colors gap-0.5 cursor-pointer ${showAddNote||pathname.startsWith("/dashboard/note")?"bg-gray-100 text-gray-700":"hover:bg-gray-100 text-gray-400"}`}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
            <span className="text-[10px] font-medium leading-tight">{t('sidebar_add_note')}</span>
          </button>

          <div className="w-8 h-px bg-gray-200 my-2"/>

          <Link href="/dashboard/exam-mode" className={`flex flex-col items-center justify-center w-full py-1.5 rounded-lg transition-colors gap-0.5 ${pathname==="/dashboard/exam-mode"?"bg-gray-100 text-gray-700":"hover:bg-gray-100 text-gray-400"}`}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"/></svg>
            <span className="text-[10px] font-medium leading-tight">{t('sidebar_exam_mode')}</span>
          </Link>

          <Link href="/dashboard/collections" className={`flex flex-col items-center justify-center w-full py-1.5 rounded-lg transition-colors gap-0.5 ${pathname==="/dashboard/collections"?"bg-gray-100 text-gray-700":"hover:bg-gray-100 text-gray-400"}`}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>
            <span className="text-[10px] font-medium leading-tight">{t('sidebar_collections')}</span>
          </Link>

          <button onClick={()=>{setShowAddNote(false);setShowChannelsPanel(v=>!v);}} className={`flex flex-col items-center justify-center w-full py-1.5 rounded-lg transition-colors gap-0.5 cursor-pointer ${showChannelsPanel||pathname.startsWith("/dashboard/channel")?"bg-gray-100 text-gray-700":"hover:bg-gray-100 text-gray-400"}`}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
            <span className="text-[10px] font-medium leading-tight">{t('sidebar_channels')}</span>
          </button>

          <Link href="/dashboard/history" className={`flex flex-col items-center justify-center w-full py-1.5 rounded-lg transition-colors gap-0.5 ${pathname==="/dashboard/history"?"bg-gray-100 text-gray-700":"hover:bg-gray-100 text-gray-400"}`}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            <span className="text-[10px] font-medium leading-tight">{t('sidebar_history')}</span>
          </Link>

          <Link href="/info" className={`flex flex-col items-center justify-center w-full py-1.5 rounded-lg transition-colors gap-0.5 ${pathname==="/info"?"bg-gray-100 text-gray-700":"hover:bg-gray-100 text-gray-400"}`}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            <span className="text-[10px] font-medium leading-tight">{t('sidebar_info')}</span>
          </Link>
        </div>

        {/* ── User avatar + menu ── */}
        <div className="shrink-0 py-4 px-3">
          <div className="relative flex flex-col items-center gap-0.5">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className={`cursor-pointer w-10 h-10 rounded-full ${avatarColor} flex items-center justify-center text-white font-semibold text-sm hover:ring-2 hover:ring-gray-300 transition-all`}
            >
              {userInitials || "?"}
            </button>
            <span className="text-[10px] text-gray-400 font-medium leading-tight text-center truncate w-full">
              {userName.split(" ")[0] || "User"}
            </span>

            {/* ── User menu popup ── */}
            {showUserMenu && (
              <>
                {/* Backdrop */}
                <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />

                <div className="absolute bottom-full left-full ml-2 mb-2 w-72 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50">
                  {/* User info header */}
                  <div className="px-4 py-4 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-full ${avatarColor} flex items-center justify-center text-white font-bold text-base shrink-0`}>
                        {userInitials || "?"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{userName || "User"}</p>
                        <p className="text-xs text-gray-500 truncate">{userEmail || "No email"}</p>
                      </div>
                    </div>
                  </div>

                  {/* Menu items */}
                  <div className="py-1">
                    {/* Language Selection */}
                    <div className="relative group/lang">
                      <button 
                        onMouseEnter={() => setShowLanguageMenu(true)}
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowLanguageMenu(!showLanguageMenu);
                        }}
                        className={`cursor-pointer w-full flex items-center gap-3 px-4 py-3 text-left text-sm transition-colors ${showLanguageMenu ? 'bg-gray-50 text-blue-600' : 'text-gray-700 hover:bg-gray-50'}`}
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${showLanguageMenu ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-600'}`}>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"/></svg>
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{t('sidebar_language')}</p>
                          <p className="text-[11px] opacity-70 truncate">{language}</p>
                        </div>
                        <svg className="w-3.5 h-3.5 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                      </button>

                      {showLanguageMenu && (
                        <div 
                          onMouseLeave={() => setShowLanguageMenu(false)}
                          className="absolute left-full top-[-80px] ml-1 w-64 bg-white border border-gray-100 rounded-2xl shadow-2xl py-2 z-[60] animate-in fade-in slide-in-from-left-2 duration-200"
                        >
                          <div className="px-4 py-2 border-b border-gray-50 mb-1">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none py-1">{t('sidebar_select_language')}</p>
                          </div>
                          <div className="py-1">
                            {Object.entries(languages).map(([code, details]) => (
                              <button
                                key={code}
                                onClick={() => {
                                  setLanguage(code as any);
                                  setShowLanguageMenu(false);
                                  setShowUserMenu(false);
                                }}
                                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-gray-50 transition-colors group/item cursor-pointer ${language === code ? 'text-blue-600 font-semibold bg-blue-50/50' : 'text-gray-600'}`}
                              >
                                <span className="text-base shrink-0 select-none">{details.flag}</span>
                                <span className="flex-1 truncate select-none">{code}</span>
                                {language === code && (
                                  <svg className="w-4 h-4 text-blue-500 animate-in zoom-in duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                                )}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Divider */}
                    <div className="h-px bg-gray-100 mx-4 my-1" />

                    {/* Logout */}
                    <button
                      onClick={handleLogout}
                      disabled={loggingOut}
                      className="cursor-pointer w-full flex items-center gap-3 px-4 py-3 text-left text-sm text-red-600 hover:bg-red-50 transition-colors disabled:opacity-60"
                    >
                      <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center shrink-0">
                        {loggingOut ? (
                          <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
                        )}
                      </div>
                      <p className="font-semibold">{loggingOut ? "Signing out…" : t('sidebar_logout')}</p>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </aside>

      {/* ── Channels slide-out panel ── */}
      {showChannelsPanel && (
        <>
          <div className="fixed inset-0 z-30 bg-black/20" onClick={() => setShowChannelsPanel(false)} />
          <div className="fixed left-22.5 top-0 bottom-0 w-90 bg-white border-r border-gray-200 shadow-lg z-40 flex flex-col">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center"><div className="w-4 h-4 bg-white rounded"/></div>
                <span className="text-lg font-bold"><span className="text-gray-900">Revise</span><span className="text-blue-600">Forge</span></span>
              </div>
              <button onClick={() => setShowChannelsPanel(false)} className="cursor-pointer p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-2 mb-3">My Channels</p>
              {loadingChannels ? (
                <div className="flex items-center justify-center py-8"><div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"/></div>
              ) : (
                <div className="space-y-0.5">
                  {channels.length === 0 && (
                    <p className="text-sm text-gray-400 px-3 py-4 text-center">No channels yet. Create or join one!</p>
                  )}
                  {channels.map(channel => {
                    const slug = nameToSlug(channel.name);
                    const isActive = pathname === `/dashboard/channel/${slug}`;
                    return (
                      <div key={channel.id} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors group cursor-pointer ${isActive?"bg-blue-50 text-blue-700":"hover:bg-gray-100 text-gray-700"}`}>
                        <div className="w-2 h-2 rounded-full bg-green-500 shrink-0"/>
                        <Link href={`/dashboard/channel/${slug}`} onClick={() => setShowChannelsPanel(false)} className="flex-1 text-sm font-medium truncate">{channel.name}</Link>
                        <span className="text-xs text-gray-400 shrink-0">{channel.members}</span>
                        <button onClick={() => deleteChannel(channel.id)} className="cursor-pointer opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 rounded-lg transition-all" title="Leave channel">
                          <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                        </button>
                      </div>
                    );
                  })}
                  <button onClick={() => setShowCreateChannelModal(true)} className="cursor-pointer w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-100 transition-colors text-left group mt-1">
                    <div className="w-6 h-6 rounded-lg bg-gray-100 group-hover:bg-gray-200 flex items-center justify-center transition-colors shrink-0"><svg className="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg></div>
                    <span className="text-sm text-gray-600 font-medium">Add Channel</span>
                  </button>
                </div>
              )}
            </div>

            <div className="border-t border-gray-100 p-4 shrink-0">
              <div className="flex items-center justify-between mb-1 px-2">
                <span className="text-xs text-gray-500">Current Plan</span>
                <span className="px-2 py-0.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-full">Free plan</span>
              </div>
              <Link href="/upgrade" className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-gray-50 transition-colors">
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                <div><p className="text-sm font-semibold text-gray-800">{t('sidebar_upgrade')}</p><p className="text-xs text-gray-400">Get more generations and more</p></div>
              </Link>
            </div>
          </div>
        </>
      )}

      {/* ── Add Note panel ── */}
      <AddNotePanel
        show={showAddNote}
        notes={notes}
        onClose={() => setShowAddNote(false)}
        onNoteSelected={handleNoteSelected}
        onNoteCreated={handleNoteCreated}
        onNoteDeleted={handleNoteDeleted}
      />

      {/* ── Create Channel Modal ── */}
      <CreateChannelModal
        show={showCreateChannelModal}
        onClose={() => setShowCreateChannelModal(false)}
        onChannelCreated={channel => { handleChannelCreated(channel); setShowCreateChannelModal(false); }}
      />
    </>
  );
}

// ── Wrap in Suspense for useSearchParams ─────────────────────
export default function Sidebar(props: SidebarProps) {
  return (
    <Suspense fallback={
      <aside className="fixed left-0 top-0 bottom-0 w-22.5 bg-white border-r border-gray-200 flex flex-col z-40">
        <div className="flex items-center justify-center py-5">
          <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center">
            <div className="w-6 h-6 bg-white rounded-md"/>
          </div>
        </div>
      </aside>
    }>
      <SidebarInner {...props} />
    </Suspense>
  );
}