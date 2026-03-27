// // import { createServerClient } from "@supabase/ssr";
// // import { cookies } from "next/headers";
// // import { NextRequest, NextResponse } from "next/server";

// // export async function GET(request: NextRequest) {
// //   const { searchParams, origin } = new URL(request.url);
// //   const code = searchParams.get("code");

// //   if (code) {
// //     const supabase = createServerClient(
// //       process.env.NEXT_PUBLIC_SUPABASE_URL!,
// //       process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
// //       {
// //         cookies: {
// //           async getAll() {
// //             const cookieStore = await cookies();
// //             return cookieStore.getAll();
// //           },
// //           async setAll(cookiesToSet) {
// //             try {
// //               const cookieStore = await cookies();
// //               cookiesToSet.forEach(({ name, value, options }) => {
// //                 cookieStore.set(name, value, options);
// //               });
// //             } catch (error) {
// //               // The `setAll` method was called from a Server Component.
// //               // This can be ignored if you have middleware refreshing
// //               // user sessions.
// //             }
// //           },
// //         },
// //       },
// //     );

// //     await supabase.auth.exchangeCodeForSession(code);
// //   }

// //   return NextResponse.redirect(`${origin}/dashboard`, { status: 302 });
// // }

// import { createServerClient } from "@supabase/ssr";
// import { cookies } from "next/headers";
// import { NextRequest, NextResponse } from "next/server";

// export async function GET(request: NextRequest) {
//   const { searchParams, origin } = new URL(request.url);
//   const code = searchParams.get("code");
//   const type = searchParams.get("type");
//   const invite = searchParams.get("invite");

//   if (code) {
//     const supabase = createServerClient(
//       process.env.NEXT_PUBLIC_SUPABASE_URL!,
//       process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
//       {
//         cookies: {
//           async getAll() {
//             const cookieStore = await cookies();
//             return cookieStore.getAll();
//           },
//           async setAll(cookiesToSet) {
//             try {
//               const cookieStore = await cookies();
//               cookiesToSet.forEach(({ name, value, options }) => {
//                 cookieStore.set(name, value, options);
//               });
//             } catch {}
//           },
//         },
//       }
//     );

//     await supabase.auth.exchangeCodeForSession(code);

//     // If type=recovery is in the URL, go to reset mode
//     if (type === "recovery") {
//       return NextResponse.redirect(`${origin}/forgot-password?mode=reset`, { status: 302 });
//     }
//   }

//   if (invite) {
//     return NextResponse.redirect(`${origin}/signin?invite=${invite}`, { status: 302 });
//   }

//   return NextResponse.redirect(`${origin}/signin`, { status: 302 });
// }



import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const type = searchParams.get("type");
  const invite = searchParams.get("invite");

  if (code && type === "recovery") {
    return NextResponse.redirect(
      `${origin}/forgot-password?mode=reset&code=${code}`,
      { status: 302 }
    );
  }

  if (code) {
    return NextResponse.redirect(`${origin}/dashboard`, { status: 302 });
  }

  if (invite) {
    return NextResponse.redirect(`${origin}/signin?invite=${invite}`, { status: 302 });
  }

  return NextResponse.redirect(`${origin}/signin`, { status: 302 });
}