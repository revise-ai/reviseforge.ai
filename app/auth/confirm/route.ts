import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type");

  if (token_hash && type === "recovery") {
    return NextResponse.redirect(
      `${origin}/forgot-password?mode=reset&token_hash=${token_hash}`,
      { status: 302 }
    );
  }

  if (token_hash && type === "signup") {
    return NextResponse.redirect(`${origin}/signin`, { status: 302 });
  }

  return NextResponse.redirect(`${origin}/signin`, { status: 302 });
}
// ```

// ---

// **4. Go to Supabase → Authentication → Email Templates → Reset Password and update the `{{ .ConfirmationURL }}` — Supabase uses this URL directly.** 

// The key thing: go to **Supabase Dashboard → Authentication → URL Configuration** and make sure your redirect URLs include:
// ```
// http://localhost:3000/auth/callback
// https://reviseforge-psi.vercel.app/auth/callback