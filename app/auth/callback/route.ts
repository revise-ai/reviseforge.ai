import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const type = searchParams.get("type");
  const invite = searchParams.get("invite");
  const next = searchParams.get("next") ?? "/dashboard";

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