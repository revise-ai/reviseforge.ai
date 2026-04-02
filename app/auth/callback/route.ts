import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { applyRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { AuthCallbackSchema, validationError } from "@/lib/validation";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const params = Object.fromEntries(searchParams.entries());
  const result = AuthCallbackSchema.safeParse(params);
  if (!result.success) return validationError(result.error);
  const { code, type, invite, next } = result.data;

  const blocked = await applyRateLimit(request, RATE_LIMITS.auth, "auth-callback");
  if (blocked) return blocked;

  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // This can be ignored if you have middleware refreshing user sessions.
            }
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error) {
      if (type === "recovery") {
        return NextResponse.redirect(`${request.nextUrl.origin}/forgot-password?mode=reset&code=${code}`);
      }

      // If there's an invite, ensure we keep it in mind, though session exchange usually suffices
      // Redirect to the intended 'next' destination (defaults to /dashboard)
      return NextResponse.redirect(`${request.nextUrl.origin}${next}`);
    }
  }

  // If we have an invite but no code/session yet, go to signin
  if (invite) {
    return NextResponse.redirect(`${request.nextUrl.origin}/signin?invite=${invite}`);
  }

  // Default fallback to signin
  return NextResponse.redirect(`${request.nextUrl.origin}/signin`);
}