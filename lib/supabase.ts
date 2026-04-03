import { createBrowserClient } from "@supabase/ssr";

export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Fix the AI answer quality first — everything else comes after
// You are doing this right now with the structured prompt. Do not launch to new users until maths, chemistry, and nursing answers look exactly like YouLearn. One bad answer = lost user forever. 
// The first is AI answer quality — if a student sends a maths question and gets a paragraph back instead of structured working, they close the tab and never return. That is why what we have been fixing today is the most important work you could be doing.

// the prompt it bad , it should be something like the image and work on reading subjects too, you see the repsonf im geeting fo rthe math questions which is reaaly bad, update all the prompt and especially the chat genearal infact all, i want it to be like the image 