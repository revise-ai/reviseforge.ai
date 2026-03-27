# ReviseForge

**ReviseForge** is a premium AI-powered learning platform designed to help students and professionals turn their study materials into interactive learning experiences.

##  Features

- **AI-Powered Learning**:
  - **Quizzes**: Automatically generate quizzes from PDFs, Word docs, or plain text.
  - **Flashcards**: Create spaced-repetition flashcards from your reading materials.
  - **YouTube to Study Guide**: Paste any YouTube link to process the video into a study session.
  - **Lecture Recording**: Record live lectures via microphone or browser tab audio.
- **Personalized Onboarding**: Tailored experience based on your language, use case, and learning goals.
- **Seamless Auth**: Fast and secure sign-in with Email or Google OAuth, redirecting you directly to your personalized dashboard.
- **Advanced Admin Dashboard**:
  - **Revenue Tracking**: Real-time MRR analytics based on user plan tiers (Pro/Student).
  - **Onboarding Insights**: Data-driven visualization of user preferences and referral sources.
  - **Session Management**: Track platform health across user sessions, quiz scores, and more.

##  Getting Started

### Prerequisites

- Node.js 18+ 
- Supabase Project (Auth, Database, Storage)

### Installation

1. Install dependencies:
   ```bash
   yarn install
   ```

2. Configure environment variables (`.local`):
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your-project-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```

3. Run the development server:
   ```bash
   yarn dev
   ```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

##  Tech Stack

- **Framework**: [Next.js 15](https://nextjs.org/) (App Router)
- **Database & Auth**: [Supabase](https://supabase.com/)
- **Styling**: Vanilla CSS / Tailwind (where requested)
- **Deployment**: [Vercel](https://vercel.com/)

##  License

This project is private and intended for internal use only.
