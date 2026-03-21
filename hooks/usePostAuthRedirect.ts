// ─────────────────────────────────────────────────────────────
// INVITE-AWARE AUTH REDIRECT HELPER
//
// Add this to BOTH your login page and signup page.
// After successful sign-in / sign-up, call redirectAfterAuth()
// instead of router.push("/dashboard").
// ─────────────────────────────────────────────────────────────

import { useSearchParams, useRouter } from "next/navigation";

export function usePostAuthRedirect() {
  const searchParams = useSearchParams();
  const router = useRouter();

  function redirectAfterAuth() {
    // Check URL param first, then sessionStorage fallback
    const inviteCode =
      searchParams.get("invite") ?? sessionStorage.getItem("pendingInviteCode");

    if (inviteCode) {
      sessionStorage.removeItem("pendingInviteCode");
      router.replace(`/join/${inviteCode}`);
    } else {
      router.replace("/dashboard");
    }
  }

  return { redirectAfterAuth };
}

// ─────────────────────────────────────────────────────────────
// USAGE IN YOUR LOGIN PAGE:
// ─────────────────────────────────────────────────────────────
//
// import { usePostAuthRedirect } from "@/hooks/usePostAuthRedirect";
//
// export default function LoginPage() {
//   const { redirectAfterAuth } = usePostAuthRedirect();
//
//   const handleLogin = async () => {
//     const { error } = await supabase.auth.signInWithPassword({ email, password });
//     if (!error) redirectAfterAuth();   // ← replaces router.push("/dashboard")
//   };
// }
//
// ─────────────────────────────────────────────────────────────
// USAGE IN YOUR SIGNUP PAGE:
// ─────────────────────────────────────────────────────────────
//
// Same pattern — call redirectAfterAuth() on successful signup.
// ─────────────────────────────────────────────────────────────