"use client";


import { useState } from "react";

const plans = [
  {
    name: "Free",
    price: { monthly: 0, yearly: 0 },
    description: "Get started with the basics",
    badge: null,
    highlight: false,
    features: [
      "5 YouTube sessions / month",
      "3 recordings (max 15 min each)",
      "20 AI chat messages / month",
      "Summary only",
      "Basic notes — no AI polish, no voice",
      "2 channel groups",
      "Messages deleted after 14 days",
      "3 file uploads / month (images only)",
      "Read @ReviseForge answers (can't tag)",
    ],
    cta: "Get Started Free",
  },
  {
    name: "Student",
    price: { monthly: 10, yearly: 80 },
    description: "For students who study seriously",
    badge: "Most Popular",
    highlight: true,
    features: [
      "Unlimited YouTube sessions",
      "10 recordings / month (max 1 hour)",
      "Unlimited AI chat",
      "Summary, Quiz & Flashcards unlocked",
      "Exam mode — 10 / month",
      "Notes with AI polish + voice typing",
      "10 channel groups",
      "Messages kept forever",
      "20 file uploads / month (image, PDF, audio)",
      "Tag @ReviseForge in channels",
    ],
    cta: "Start with Student",
  },
  {
    name: "Pro",
    price: { monthly: 15, yearly: 120 },
    description: "For students who want it all",
    badge: null,
    highlight: false,
    features: [
      "Everything in Student",
      "Unlimited recordings (max 3 hours)",
      "Unlimited exam mode",
      "Unlimited @ReviseForge tags in channels",
      "Unlimited channel file uploads",
      "Create your own study channel",
      "Unlimited AI polish in notes",
      "Export notes & flashcards as PDF",
      "Priority AI responses",
    ],
    cta: "Go Pro",
  },
];

const faqs = [
  {
    q: "Can I switch plans anytime?",
    a: "Yes, you can upgrade or downgrade at any time. Upgrades take effect immediately. Downgrades apply at the end of your current billing period.",
  },
  {
    q: "What payment methods do you accept?",
    a: "We accept Visa, Mastercard, MTN Mobile Money, Vodafone Cash, and bank transfers. Payments are processed securely through Paystack.",
  },
  {
    q: "Can students outside my country use ReviseForge?",
    a: "Absolutely. ReviseForge works for students worldwide. Anyone with a Visa or Mastercard can subscribe from any country.",
  },
  {
    q: "What happens when I hit the free tier limits?",
    a: "You'll see a prompt to upgrade. Your existing sessions and notes are never deleted — you just can't create new ones until you upgrade or the month resets.",
  },
  {
    q: "What is the @ReviseForge feature in channels?",
    a: "Inside any study group channel, members can tag @ReviseForge with a question and the AI answers it directly in the group chat for everyone to see.",
  },
  {
    q: "Is there a refund policy?",
    a: "Yes. If you're not satisfied within the first 7 days of your paid subscription, contact us and we'll issue a full refund — no questions asked.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. No long-term contracts. Cancel from your account settings and you won't be charged again. You keep access until the end of your billing period.",
  },
  {
    q: "Do you offer student discounts?",
    a: "Yes — the yearly plan is the best deal. Student at $80/year works out to $6.67/month and Pro at $120/year is just $10/month. That's 2 months free compared to paying monthly.",
  },
];

export default function PricingPage() {
  const [billing, setBilling] = useState<"monthly" | "yearly">("monthly");
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div style={{ minHeight: "100vh", background: "#ffffff", fontFamily: "'DM Sans', sans-serif", color: "#111" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&family=DM+Serif+Display&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }

        .pricing-wrap { max-width: 1080px; margin: 0 auto; padding: 0 24px; }

        /* Hero */
        .hero {
          text-align: center;
          padding: 72px 24px 56px;
          background: #fff;
        }
        .hero h1 {
          font-family: 'DM Serif Display', serif;
          font-size: clamp(32px, 5vw, 52px);
          color: #0a0a0a;
          letter-spacing: -0.02em;
          line-height: 1.1;
          margin-bottom: 14px;
        }
        .hero p {
          color: #6b7280;
          font-size: 16px;
          max-width: 440px;
          margin: 0 auto 36px;
          line-height: 1.6;
        }

        /* Toggle */
        .toggle-wrap {
          display: inline-flex;
          align-items: center;
          background: #f3f4f6;
          border-radius: 100px;
          padding: 4px;
          gap: 2px;
        }
        .toggle-btn {
          padding: 8px 22px;
          border-radius: 100px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          border: none;
          background: transparent;
          color: #6b7280;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .toggle-btn.active {
          background: #111;
          color: #fff;
        }
        .save-pill {
          background: #16a34a;
          color: #fff;
          font-size: 10px;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 100px;
        }

        /* Plans */
        .plans-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
          padding: 0 24px 64px;
          max-width: 1080px;
          margin: 0 auto;
        }
        @media(max-width: 860px) {
          .plans-grid { grid-template-columns: 1fr; max-width: 420px; margin: 0 auto; }
        }

        .plan-card {
          border-radius: 18px;
          padding: 28px;
          position: relative;
          transition: box-shadow 0.2s, transform 0.2s;
        }
        .plan-card.normal {
          background: #fff;
          border: 1.5px solid #e5e7eb;
        }
        .plan-card.normal:hover {
          box-shadow: 0 8px 32px rgba(0,0,0,0.08);
          transform: translateY(-3px);
        }
        .plan-card.featured {
          background: #0a0a0a;
          border: 1.5px solid #0a0a0a;
          box-shadow: 0 12px 48px rgba(0,0,0,0.18);
        }
        .plan-card.featured:hover {
          box-shadow: 0 20px 60px rgba(0,0,0,0.25);
          transform: translateY(-3px);
        }

        .popular-tag {
          position: absolute;
          top: -11px;
          left: 50%;
          transform: translateX(-50%);
          background: #2563eb;
          color: #fff;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.07em;
          text-transform: uppercase;
          padding: 3px 14px;
          border-radius: 100px;
          white-space: nowrap;
        }

        .plan-label {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          margin-bottom: 16px;
        }
        .plan-label.normal { color: #9ca3af; }
        .plan-label.featured { color: #60a5fa; }

        .plan-price {
          display: flex;
          align-items: baseline;
          gap: 4px;
          margin-bottom: 4px;
        }
        .price-num {
          font-family: 'DM Serif Display', serif;
          font-size: 44px;
          line-height: 1;
          letter-spacing: -0.02em;
        }
        .price-num.normal { color: #0a0a0a; }
        .price-num.featured { color: #fff; }

        .price-suffix {
          font-size: 14px;
          font-weight: 500;
        }
        .price-suffix.normal { color: #9ca3af; }
        .price-suffix.featured { color: #6b7280; }

        .yearly-per-mo {
          font-size: 12px;
          font-weight: 600;
          color: #16a34a;
          margin-bottom: 4px;
        }

        .plan-desc {
          font-size: 13px;
          line-height: 1.5;
          margin-bottom: 20px;
        }
        .plan-desc.normal { color: #6b7280; }
        .plan-desc.featured { color: #9ca3af; }

        .divider {
          height: 1px;
          margin-bottom: 20px;
        }
        .divider.normal { background: #f3f4f6; }
        .divider.featured { background: rgba(255,255,255,0.1); }

        .feature-list {
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 11px;
          margin-bottom: 24px;
        }
        .feature-row {
          display: flex;
          align-items: flex-start;
          gap: 9px;
          font-size: 13px;
          line-height: 1.4;
        }
        .feature-row.normal { color: #374151; }
        .feature-row.featured { color: #d1d5db; }

        .check-wrap {
          width: 15px;
          height: 15px;
          border-radius: 50%;
          flex-shrink: 0;
          margin-top: 1px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .check-wrap.normal { background: #eff6ff; }
        .check-wrap.featured { background: rgba(96,165,250,0.15); }

        .cta-btn {
          width: 100%;
          padding: 12px;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          border: none;
          transition: all 0.18s;
          letter-spacing: 0.01em;
        }
        .cta-btn.normal {
          background: #0a0a0a;
          color: #fff;
        }
        .cta-btn.normal:hover {
          background: #1f2937;
        }
        .cta-btn.featured {
          background: #fff;
          color: #0a0a0a;
        }
        .cta-btn.featured:hover {
          background: #f3f4f6;
        }

        /* FAQ */
        .faq-section {
          max-width: 680px;
          margin: 0 auto;
          padding: 0 24px 80px;
        }
        .faq-title {
          font-family: 'DM Serif Display', serif;
          font-size: clamp(26px, 3.5vw, 36px);
          color: #0a0a0a;
          text-align: center;
          margin-bottom: 8px;
          letter-spacing: -0.02em;
        }
        .faq-sub {
          text-align: center;
          color: #6b7280;
          font-size: 14px;
          margin-bottom: 40px;
        }
        .faq-sub a { color: #2563eb; text-decoration: none; font-weight: 600; }

        .faq-list {
          border-top: 1px solid #e5e7eb;
        }
        .faq-item {
          border-bottom: 1px solid #e5e7eb;
        }
        .faq-q-row {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 18px 0;
          background: none;
          border: none;
          cursor: pointer;
          text-align: left;
          gap: 16px;
        }
        .faq-q-text {
          font-size: 15px;
          font-weight: 600;
          color: #0a0a0a;
          line-height: 1.4;
        }
        .faq-icon-btn {
          width: 26px;
          height: 26px;
          border-radius: 50%;
          background: #f3f4f6;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: all 0.2s;
          color: #374151;
        }
        .faq-icon-btn.open {
          background: #0a0a0a;
          color: #fff;
          transform: rotate(45deg);
        }
        .faq-answer {
          overflow: hidden;
          max-height: 0;
          transition: max-height 0.3s ease, padding-bottom 0.3s ease;
        }
        .faq-answer.open {
          max-height: 160px;
          padding-bottom: 18px;
        }
        .faq-answer p {
          font-size: 14px;
          color: #4b5563;
          line-height: 1.7;
        }

        /* Bottom strip */
        .bottom-strip {
          background: #0a0a0a;
          padding: 64px 24px;
          text-align: center;
        }
        .bottom-strip h2 {
          font-family: 'DM Serif Display', serif;
          font-size: clamp(26px, 4vw, 40px);
          color: #fff;
          margin-bottom: 12px;
          letter-spacing: -0.02em;
        }
        .bottom-strip p {
          color: #6b7280;
          font-size: 15px;
          margin-bottom: 28px;
        }
        .bottom-btns {
          display: flex;
          gap: 10px;
          justify-content: center;
          flex-wrap: wrap;
        }
        .bb-primary {
          padding: 13px 26px;
          background: #fff;
          color: #0a0a0a;
          border: none;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.18s;
        }
        .bb-primary:hover { background: #f3f4f6; }
        .bb-ghost {
          padding: 13px 26px;
          background: transparent;
          color: #9ca3af;
          border: 1px solid #374151;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.18s;
        }
        .bb-ghost:hover { border-color: #6b7280; color: #d1d5db; }
        .cancel-note {
          margin-top: 16px;
          font-size: 12px;
          color: #4b5563;
        }
        .cancel-note strong { color: #16a34a; }
      `}</style>

      {/* Hero */}
      <div className="hero">
        <h1>Simple, honest pricing</h1>
        <p>Pick the plan that fits how you study. Upgrade or cancel anytime.</p>
        <div className="toggle-wrap">
          <button
            className={`toggle-btn ${billing === "monthly" ? "active" : ""}`}
            onClick={() => setBilling("monthly")}
          >
            Monthly
          </button>
          <button
            className={`toggle-btn ${billing === "yearly" ? "active" : ""}`}
            onClick={() => setBilling("yearly")}
          >
            Yearly
            <span className="save-pill">Save 33%</span>
          </button>
        </div>
      </div>

      {/* Plan cards */}
      <div className="plans-grid">
        {plans.map((plan) => {
          const v = plan.highlight ? "featured" : "normal";
          const price = plan.price[billing];
          return (
            <div key={plan.name} className={`plan-card ${v}`}>
              {plan.badge && <div className="popular-tag">{plan.badge}</div>}

              <div className={`plan-label ${v}`}>{plan.name}</div>

              <div className="plan-price">
                <span className={`price-num ${v}`}>
                  {price === 0 ? "Free" : `$${price}`}
                </span>
                {price > 0 && (
                  <span className={`price-suffix ${v}`}>
                    /{billing === "monthly" ? "mo" : "yr"}
                  </span>
                )}
              </div>

              {billing === "yearly" && price > 0 && (
                <p className="yearly-per-mo">
                  ${(price / 12).toFixed(2)}/month · 2 months free
                </p>
              )}

              <p className={`plan-desc ${v}`}>{plan.description}</p>

              <div className={`divider ${v}`} />

              <ul className="feature-list">
                {plan.features.map((f, i) => (
                  <li key={i} className={`feature-row ${v}`}>
                    <div className={`check-wrap ${v}`}>
                      <svg width="8" height="8" viewBox="0 0 10 10" fill="none">
                        <path
                          d="M1.5 5l2.5 2.5 4.5-4.5"
                          stroke={plan.highlight ? "#60a5fa" : "#2563eb"}
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                    {f}
                  </li>
                ))}
              </ul>

              <button className={`cta-btn ${v}`}>{plan.cta}</button>
            </div>
          );
        })}
      </div>

      {/* FAQ */}
      <div className="faq-section">
        <h2 className="faq-title">Frequently asked questions</h2>
        <p className="faq-sub">
          Still have questions?{" "}
          <a href="mailto:support@reviseforge.com">Contact us</a>
        </p>

        <div className="faq-list">
          {faqs.map((faq, i) => (
            <div key={i} className="faq-item">
              <button
                className="faq-q-row"
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
              >
                <span className="faq-q-text">{faq.q}</span>
                <div className={`faq-icon-btn ${openFaq === i ? "open" : ""}`}>
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M5 1v8M1 5h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                </div>
              </button>
              <div className={`faq-answer ${openFaq === i ? "open" : ""}`}>
                <p>{faq.a}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="bottom-strip">
        <h2>Start studying smarter today</h2>
        <p>Join students already using ReviseForge to ace their exams.</p>
        <div className="bottom-btns">
          <button className="bb-primary">Get Started Free</button>
          <button className="bb-ghost">View Student Plan</button>
        </div>
        <p className="cancel-note">
          Yearly plans save you up to <strong>$60</strong> · Cancel anytime
        </p>
      </div>
    </div>
  );
}