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
              // The `setAll` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing
              // user sessions.
            }
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error) {
      if (type === "recovery") {
        return NextResponse.redirect(`${origin}/forgot-password?mode=reset&code=${code}`, { status: 302 });
      }

      // Default redirect for signups/email confirmations
      return NextResponse.redirect(`${origin}/dashboard`, { status: 302 });
    }
  }

  if (invite) {
    return NextResponse.redirect(`${origin}/signin?invite=${invite}`, { status: 302 });
  }

  // fallback
  return NextResponse.redirect(`${origin}/signin`, { status: 302 });
}