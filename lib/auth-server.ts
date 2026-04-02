// lib/auth-server.ts
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

/**
 * Shared helper to verify a user's session on the server-side (API Routes/Server Actions).
 * Returns the user object if authenticated, or null if not.
 */
export async function getServerUser() {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch (error) {
            // The `set` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: "", ...options });
          } catch (error) {
            // The `remove` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    },
  );

  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

/**
 * Standardized 401 Unauthorized response for API routes.
 */
export function unauthorizedError() {
  return NextResponse.json(
    { error: "Unauthorized. Please sign in to access this feature." },
    { status: 401 }
  );
}
