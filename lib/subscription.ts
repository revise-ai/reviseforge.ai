// lib/subscription.ts
// ─────────────────────────────────────────────────────────────
// Plan management — Stripe-ready.
// Currently stores plan in profiles.plan (free | pro).
// When you add Stripe, call upgradeToPro() from your webhook.
// ─────────────────────────────────────────────────────────────

import { supabase } from "./supabase";

export type PlanTier = "free" | "pro";

// ── Read current user's plan ───────────────────────────────
export async function getUserPlan(userId: string): Promise<PlanTier> {
  const { data, error } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", userId)
    .single();

  if (error || !data) return "free";
  return (data.plan as PlanTier) ?? "free";
}

// ── Upgrade user to Pro ────────────────────────────────────
// Call this from:
//   1. Your Stripe webhook (recommended): POST /api/webhooks/stripe
//   2. Or manually in your admin panel
export async function upgradeToPro(
  userId: string,
  expiresAt?: Date         // optional: set if plan is time-limited
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from("profiles")
    .update({
      plan: "pro",
      plan_expires_at: expiresAt?.toISOString() ?? null,
    })
    .eq("id", userId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

// ── Downgrade back to Free ─────────────────────────────────
export async function downgradeToFree(
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from("profiles")
    .update({ plan: "free", plan_expires_at: null })
    .eq("id", userId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

// ── Check if plan has expired (for scheduled jobs) ─────────
export async function expireOldPlans(): Promise<void> {
  // Find all pro users whose plan_expires_at has passed
  const { data: expiredUsers } = await supabase
    .from("profiles")
    .select("id")
    .eq("plan", "pro")
    .not("plan_expires_at", "is", null)
    .lt("plan_expires_at", new Date().toISOString());

  if (!expiredUsers?.length) return;

  const ids = expiredUsers.map((u) => u.id);
  await supabase
    .from("profiles")
    .update({ plan: "free", plan_expires_at: null })
    .in("id", ids);
}

// ─────────────────────────────────────────────────────────────
// STRIPE INTEGRATION GUIDE
// ─────────────────────────────────────────────────────────────
//
// 1. Install Stripe:
//    npm install stripe @stripe/stripe-js
//
// 2. Add env vars:
//    STRIPE_SECRET_KEY=sk_...
//    STRIPE_WEBHOOK_SECRET=whsec_...
//    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_...
//
// 3. Create a webhook route at app/api/webhooks/stripe/route.ts:
//
//    import Stripe from "stripe";
//    import { upgradeToPro, downgradeToFree } from "@/lib/subscription";
//
//    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
//
//    export async function POST(req: Request) {
//      const body = await req.text();
//      const sig  = req.headers.get("stripe-signature")!;
//      let event: Stripe.Event;
//
//      try {
//        event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
//      } catch (err) {
//        return new Response("Webhook error", { status: 400 });
//      }
//
//      const session = event.data.object as Stripe.Checkout.Session;
//      const userId  = session.metadata?.userId;     // pass userId in checkout session metadata
//
//      if (event.type === "checkout.session.completed" && userId) {
//        await upgradeToPro(userId);
//      }
//
//      if (event.type === "customer.subscription.deleted" && userId) {
//        await downgradeToFree(userId);
//      }
//
//      return new Response("OK", { status: 200 });
//    }
//
// 4. Create checkout session at app/api/checkout/route.ts:
//
//    import Stripe from "stripe";
//    import { createClient } from "@supabase/supabase-js";
//
//    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
//
//    export async function POST(req: Request) {
//      const supabase = createClient(...);
//      const { data: { user } } = await supabase.auth.getUser();
//      if (!user) return new Response("Unauthorized", { status: 401 });
//
//      const session = await stripe.checkout.sessions.create({
//        mode:        "subscription",
//        line_items:  [{ price: "price_YOUR_STRIPE_PRICE_ID", quantity: 1 }],
//        success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?upgraded=true`,
//        cancel_url:  `${process.env.NEXT_PUBLIC_APP_URL}/pricing`,
//        metadata:    { userId: user.id },   // ← key: used in webhook to upgrade plan
//      });
//
//      return Response.json({ url: session.url });
//    }
//
// 5. On your Upgrade button, call:
//    const res  = await fetch("/api/checkout", { method: "POST" });
//    const data = await res.json();
//    window.location.href = data.url;   // redirect to Stripe checkout
//
// ─────────────────────────────────────────────────────────────