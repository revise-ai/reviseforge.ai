"use client";

import { useState, useRef, useEffect } from "react";

interface Message {
  id: string;
  author: string;
  avatar: string;
  content: string;
  timestamp: string;
  date: string;
}

interface Member {
  id: string;
  name: string;
  initials: string;
  color: string;
  status: "online" | "away" | "offline";
  role?: string;
}

const MOCK_MEMBERS: Member[] = [
  { id: "1", name: "Addo Emmanuel", initials: "AE", color: "bg-green-700", status: "online", role: "Admin" },
  { id: "2", name: "Sarah Mensah", initials: "SM", color: "bg-blue-600", status: "online" },
  { id: "3", name: "Kwame Asante", initials: "KA", color: "bg-purple-600", status: "away" },
  { id: "4", name: "Ama Boateng", initials: "AB", color: "bg-rose-500", status: "online" },
  { id: "5", name: "Kofi Darko", initials: "KD", color: "bg-orange-500", status: "offline" },
];

const AVATAR_COLORS: Record<string, string> = {
  AE: "bg-green-700",
  SM: "bg-blue-600",
  KA: "bg-purple-600",
  AB: "bg-rose-500",
  KD: "bg-orange-500",
};

const INITIAL_MESSAGES: Message[] = [
  {
    id: "1",
    author: "Sarah Mensah",
    avatar: "SM",
    content: "Hey everyone! Welcome to the channel 🎉 Let's use this space to share study materials and help each other out.",
    timestamp: "9:15 AM",
    date: "Monday, February 16th",
  },
  {
    id: "2",
    author: "Kwame Asante",
    avatar: "KA",
    content: "Thanks for the invite! I've been struggling with chapter 4. Anyone have good notes on cellular respiration?",
    timestamp: "9:22 AM",
    date: "Monday, February 16th",
  },
  {
    id: "3",
    author: "Ama Boateng",
    avatar: "AB",
    content: "I have great notes on that! I'll upload them to the files section later today.",
    timestamp: "9:45 AM",
    date: "Monday, February 16th",
  },
  {
    id: "4",
    author: "Addo Emmanuel",
    avatar: "AE",
    content: "Perfect. Let's also plan a study session this week. How does Thursday evening work for everyone?",
    timestamp: "10:03 AM",
    date: "Tuesday, February 17th",
  },
];

function groupMessagesByDate(messages: Message[]) {
  const groups: { date: string; messages: Message[] }[] = [];
  messages.forEach((msg) => {
    const last = groups[groups.length - 1];
    if (last && last.date === msg.date) {
      last.messages.push(msg);
    } else {
      groups.push({ date: msg.date, messages: [msg] });
    }
  });
  return groups;
}

export default function ChannelPage({ params }: { params: { id: string } }) {
  // In a real app, fetch channel name by params.id from your DB
  const channelName = "Study Channel";

  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [inputValue, setInputValue] = useState("");
  const [showMembers, setShowMembers] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!inputValue.trim()) return;
    const now = new Date();
    const time = now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    const raw = now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
    setMessages((prev) => [
      ...prev,
      { id: Date.now().toString(), author: "Addo Emmanuel", avatar: "AE", content: inputValue.trim(), timestamp: time, date: raw },
    ]);
    setInputValue("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const grouped = groupMessagesByDate(messages);
  const onlineCount = MOCK_MEMBERS.filter((m) => m.status === "online").length;

  return (
    <div className="flex h-screen bg-white overflow-hidden">
      {/* ── Main channel area ── */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Top bar */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200 bg-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-gray-400 text-lg font-light">#</span>
              <h1 className="text-base font-bold text-gray-900">{channelName}</h1>
            </div>
            <div className="w-px h-4 bg-gray-200" />
            <p className="text-xs text-gray-500 hidden sm:block">
              Study channel · {MOCK_MEMBERS.length} members
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowMembers(!showMembers)}
              className="flex cursor-pointer items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="flex -space-x-2">
                {MOCK_MEMBERS.slice(0, 3).map((m) => (
                  <div key={m.id} className={`w-7 h-7 rounded-full ${m.color} flex items-center justify-center text-white text-[10px] font-semibold border-2 border-white`}>
                    {m.initials}
                  </div>
                ))}
              </div>
              <span className="text-sm font-semibold text-gray-700">{MOCK_MEMBERS.length}</span>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-xs text-gray-500">{onlineCount} online</span>
              </div>
            </button>

            <button className="p-2 cursor-pointer rounded-lg hover:bg-gray-100 text-gray-500 transition-colors" title="Start video call">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.069A1 1 0 0121 8.882v6.236a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
            <button className="p-2 cursor-pointer rounded-lg hover:bg-gray-100 text-gray-500 transition-colors" title="Search">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
            <button className="p-2 cursor-pointer rounded-lg hover:bg-gray-100 text-gray-500 transition-colors" title="Pinned messages">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {grouped.map((group) => (
            <div key={group.date}>
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-xs font-medium text-gray-500 bg-white px-3 py-1 border border-gray-200 rounded-full shrink-0">
                  {group.date}
                </span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>
              <div className="space-y-4">
                {group.messages.map((msg) => (
                  <div key={msg.id} className="flex gap-3 group hover:bg-gray-50 rounded-xl px-3 py-2 -mx-3 transition-colors">
                    <div className={`w-9 h-9 rounded-full ${AVATAR_COLORS[msg.avatar] ?? "bg-gray-400"} flex items-center justify-center text-white text-xs font-semibold shrink-0 mt-0.5`}>
                      {msg.avatar}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2">
                        <span className="text-sm font-semibold text-gray-900">{msg.author}</span>
                        <span className="text-xs text-gray-400">{msg.timestamp}</span>
                      </div>
                      <p className="text-sm text-gray-700 mt-0.5 leading-relaxed">{msg.content}</p>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button className="p-1.5 cursor-pointer rounded-lg hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors" title="React">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </button>
                      <button className="p-1.5 cursor-pointer rounded-lg hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors" title="Reply">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div className="px-6 py-4 border-t border-gray-200 bg-white shrink-0">
          <div className="border border-gray-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent transition-all">
            <div className="flex items-center gap-1 px-3 pt-2 pb-1 border-b border-gray-100">
              <button className="p-1.5 rounded cursor-pointer hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors text-xs font-bold w-7 h-7 flex items-center justify-center">B</button>
              <button className="p-1.5 rounded cursor-pointer hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors text-xs italic w-7 h-7 flex items-center justify-center">I</button>
              <button className="p-1.5 rounded cursor-pointer hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors w-7 h-7 flex items-center justify-center" title="Link">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              </button>
              <div className="w-px h-4 bg-gray-200 mx-1" />
              <button className="p-1.5 rounded cursor-pointer hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors w-7 h-7 flex items-center justify-center" title="Code">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
              </button>
            </div>

            <textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Message #${channelName.toLowerCase().replace(/\s+/g, "-")}`}
              rows={2}
              className="w-full px-4 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none resize-none bg-white"
            />

            <div className="flex items-center justify-between px-3 pb-2">
              <div className="flex items-center gap-1">
                <button className="p-1.5 cursor-pointer rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors" title="Attach file">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                </button>
                <button className="p-1.5 cursor-pointer rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors" title="Emoji">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </button>
                <button className="p-1.5 cursor-pointer rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors" title="Mention">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                  </svg>
                </button>
                <button
                  onClick={() => setIsRecording(!isRecording)}
                  className={`p-1.5 cursor-pointer rounded-lg transition-colors ${isRecording ? "bg-red-100 text-red-500 hover:bg-red-200" : "hover:bg-gray-100 text-gray-400 hover:text-gray-600"}`}
                  title="Record audio"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                </button>
              </div>

              <button
                onClick={handleSend}
                disabled={!inputValue.trim()}
                className="p-2 cursor-pointer rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                title="Send"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-1.5 text-center">
            Press <kbd className="bg-gray-100 px-1 py-0.5 rounded text-gray-500 text-[10px]">Enter</kbd> to send ·{" "}
            <kbd className="bg-gray-100 px-1 py-0.5 rounded text-gray-500 text-[10px]">Shift+Enter</kbd> for new line
          </p>
        </div>
      </div>

      {/* ── Members sidebar ── */}
      {showMembers && (
        <div className="w-64 border-l border-gray-200 bg-gray-50 flex flex-col shrink-0">
          <div className="px-4 py-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">Members · {MOCK_MEMBERS.length}</h3>
            <button onClick={() => setShowMembers(false)} className="p-1 cursor-pointer rounded-lg hover:bg-gray-200 text-gray-400 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-2 mb-2">Online — {onlineCount}</p>
            {MOCK_MEMBERS.filter((m) => m.status === "online").map((member) => (
              <div key={member.id} className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
                <div className="relative">
                  <div className={`w-8 h-8 rounded-full ${member.color} flex items-center justify-center text-white text-xs font-semibold`}>{member.initials}</div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-500 border-2 border-gray-50" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-800">{member.name}</p>
                  {member.role && <p className="text-xs text-blue-500">{member.role}</p>}
                </div>
              </div>
            ))}

            {MOCK_MEMBERS.filter((m) => m.status === "away").length > 0 && (
              <>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-2 mt-4 mb-2">
                  Away — {MOCK_MEMBERS.filter((m) => m.status === "away").length}
                </p>
                {MOCK_MEMBERS.filter((m) => m.status === "away").map((member) => (
                  <div key={member.id} className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
                    <div className="relative">
                      <div className={`w-8 h-8 rounded-full ${member.color} flex items-center justify-center text-white text-xs font-semibold opacity-70`}>{member.initials}</div>
                      <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-yellow-400 border-2 border-gray-50" />
                    </div>
                    <p className="text-sm font-medium text-gray-600">{member.name}</p>
                  </div>
                ))}
              </>
            )}

            {MOCK_MEMBERS.filter((m) => m.status === "offline").length > 0 && (
              <>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-2 mt-4 mb-2">
                  Offline — {MOCK_MEMBERS.filter((m) => m.status === "offline").length}
                </p>
                {MOCK_MEMBERS.filter((m) => m.status === "offline").map((member) => (
                  <div key={member.id} className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
                    <div className="relative">
                      <div className={`w-8 h-8 rounded-full ${member.color} flex items-center justify-center text-white text-xs font-semibold opacity-40`}>{member.initials}</div>
                      <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-gray-300 border-2 border-gray-50" />
                    </div>
                    <p className="text-sm font-medium text-gray-400">{member.name}</p>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}