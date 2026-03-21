// ─────────────────────────────────────────────────────────────
// JoinedToast — drop this component into your channel page.
// It reads ?joined=true from the URL, shows the toast, then
// cleans up the query param.
//
// Usage inside ChannelPage (add near the top of the JSX return):
//   <JoinedToast channelName={channel?.name ?? ""} />
// ─────────────────────────────────────────────────────────────

"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";

export default function JoinedToast({ channelName }: { channelName: string }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (searchParams.get("joined") === "true") {
      setVisible(true);
      // Remove ?joined=true from URL without re-render
      router.replace(pathname, { scroll: false });
      const t = setTimeout(() => setVisible(false), 4000);
      return () => clearTimeout(t);
    }
  }, [searchParams]);

  if (!visible) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
      <div className="pointer-events-auto flex items-center gap-3 bg-green-600 text-white px-5 py-3 rounded-2xl shadow-xl text-sm font-medium animate-in slide-in-from-top-2 duration-300">
        <svg
          className="w-4 h-4 shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 13l4 4L19 7"
          />
        </svg>
        Joined <span className="font-bold">#{channelName}</span> successfully!
      </div>
    </div>
  );
}