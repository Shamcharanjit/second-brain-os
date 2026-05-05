/**
 * Central SEO configuration for InsightHalo.
 * Static defaults — supplemented dynamically by `seo_metadata` table.
 */

export const SITE_URL = "https://insighthalo.com";
export const SITE_NAME = "InsightHalo";
export const DEFAULT_OG_IMAGE = `${SITE_URL}/og-default.png`;

export interface SeoConfig {
  title: string;
  description: string;
  keywords?: string[];
  canonical?: string;
  ogImage?: string;
  ogType?: "website" | "article";
  noindex?: boolean;
}

export const DEFAULT_SEO: SeoConfig = {
  title: "InsightHalo — Your AI Second Brain",
  description:
    "Capture thoughts, voice notes, screenshots, and files instantly. AI enriches, organizes, and makes everything searchable so you never lose a valuable idea again.",
  keywords: ["second brain", "ai notes", "voice capture", "productivity", "memory assistant"],
  ogType: "website",
};

/** Static fallback metadata per public route. */
export const ROUTE_SEO: Record<string, SeoConfig> = {
  "/": {
    title: "InsightHalo — AI Second Brain App | Capture, Organize & Recall",
    description:
      "Capture thoughts, voice notes and ideas in 10 seconds. AI automatically tags, organizes and routes everything to the right place. Your second brain that never forgets — free to start.",
    keywords: ["second brain app", "AI note taking app", "capture thoughts", "voice capture", "productivity app", "memory assistant", "AI planner", "personal knowledge management"],
  },
  "/waitlist": {
    title: "Join the InsightHalo Waitlist — Early Access",
    description:
      "Get early access to InsightHalo — the AI second brain that captures and organizes everything you think. Join 140+ early adopters.",
    keywords: ["second brain app waitlist", "AI notes early access", "productivity app beta"],
  },
  "/learn": {
    title: "Learn — InsightHalo Knowledge Base",
    description: "Explore how InsightHalo works as a second brain, voice capture tool, AI planner and memory assistant. Guides, use cases and FAQs.",
    keywords: ["second brain guide", "AI productivity", "knowledge management", "voice capture guide"],
  },
  "/help": {
    title: "Help & Guide — InsightHalo",
    description: "Everything you need to get the most out of InsightHalo. Browse features, keyboard shortcuts and frequently asked questions.",
    keywords: ["InsightHalo help", "second brain guide", "how to use InsightHalo"],
  },
  "/terms": {
    title: "Terms of Service — InsightHalo",
    description: "Terms of service for using InsightHalo — the AI second brain app.",
  },
  "/privacy": {
    title: "Privacy Policy — InsightHalo",
    description: "How InsightHalo handles your data and protects your privacy. Your captures are private and never used to train AI models.",
  },
  "/auth": {
    title: "Sign in to InsightHalo",
    description: "Sign in to your InsightHalo second brain.",
    noindex: true,
  },
};

/** Programmatic /learn pages — keyword landing pages. */
export interface LearnPage {
  slug: string;
  keyword: string;
  title: string;
  hero: { heading: string; subheading: string };
  useCases: string[];
  benefits: string[];
  faq: { q: string; a: string }[];
}

export const LEARN_PAGES: LearnPage[] = [
  {
    slug: "second-brain-app",
    keyword: "second brain app",
    title: "Second Brain App — InsightHalo",
    hero: {
      heading: "A second brain app that actually remembers for you",
      subheading:
        "InsightHalo captures your thoughts, voice notes, screenshots and files — then organizes them into projects, ideas and memory you can search instantly.",
    },
    useCases: [
      "Capture meeting notes the moment they happen",
      "Save research links and let AI summarize them",
      "Turn fleeting ideas into tracked projects",
      "Build a personal knowledge base that grows with you",
    ],
    benefits: [
      "Never lose a thought again",
      "AI organizes captures automatically",
      "Voice, text and image input — all in one place",
      "Searchable memory across everything you save",
    ],
    faq: [
      { q: "What is a second brain app?", a: "A second brain app is a digital system that captures, organizes, and resurfaces your thoughts, ideas, and reference material so you can think more clearly." },
      { q: "How is InsightHalo different?", a: "InsightHalo combines instant capture (text, voice, files), AI enrichment, and a structured memory layer with projects and ideas in one place." },
      { q: "Is my data private?", a: "Yes — your captures are stored under your account and are only visible to you." },
    ],
  },
  {
    slug: "capture-thoughts-fast",
    keyword: "capture thoughts fast",
    title: "Capture Thoughts Fast — InsightHalo",
    hero: {
      heading: "Capture thoughts the moment they happen",
      subheading:
        "Speak it, type it, snap it. InsightHalo turns fleeting ideas into structured memory in seconds.",
    },
    useCases: [
      "Voice capture while driving or walking",
      "Quick text capture during meetings",
      "Screenshot capture from any device",
      "File capture for documents and audio",
    ],
    benefits: [
      "Sub-second capture flow",
      "Auto-routed to inbox, ideas, today, or memory",
      "AI summary appears instantly",
      "Works on phone and desktop",
    ],
    faq: [
      { q: "How fast is voice capture?", a: "Voice capture starts in under a second and saves the moment you stop speaking." },
      { q: "Can I capture without typing?", a: "Yes — voice and screenshot capture work hands-free." },
    ],
  },
  {
    slug: "voice-capture-productivity",
    keyword: "voice capture productivity",
    title: "Voice Capture for Productivity — InsightHalo",
    hero: {
      heading: "Speak it. InsightHalo organizes it.",
      subheading:
        "Voice capture for productivity that transcribes, classifies and routes your spoken thoughts automatically.",
    },
    useCases: [
      "Driving mode for hands-free capture",
      "Quick reminders and tasks",
      "Brainstorm sessions on the go",
      "Long-form thought dumping",
    ],
    benefits: [
      "Native browser voice — no app install",
      "Auto-release microphone after natural pause",
      "AI classifies tasks vs ideas vs memory",
      "Reminder follow-ups for important captures",
    ],
    faq: [
      { q: "Does voice capture need an app?", a: "No — InsightHalo voice capture runs in any modern browser." },
      { q: "Is the audio stored?", a: "Only the transcribed text is saved by default." },
    ],
  },
  {
    slug: "ai-planner-assistant",
    keyword: "ai planner assistant",
    title: "AI Planner Assistant — InsightHalo",
    hero: {
      heading: "An AI planner that thinks ahead with you",
      subheading:
        "InsightHalo organizes your day, tracks your projects, and reminds you about what actually matters.",
    },
    useCases: [
      "Daily Top Focus pinning",
      "Weekly review rituals",
      "Project health tracking",
      "Smart reminder follow-ups",
    ],
    benefits: [
      "Today queue auto-prioritized by AI",
      "Project at-risk and stalled detection",
      "Day-2 retention reminder loop",
      "Memory layer surfaces what you forgot",
    ],
    faq: [
      { q: "Is this a calendar app?", a: "No — InsightHalo focuses on capture, planning and memory rather than time-blocking." },
      { q: "How does the AI prioritize?", a: "It uses signals from capture text, project status, and review history." },
    ],
  },
  {
    slug: "memory-assistant-software",
    keyword: "memory assistant software",
    title: "Memory Assistant Software — InsightHalo",
    hero: {
      heading: "Memory assistant software that remembers for you",
      subheading:
        "InsightHalo stores your decisions, references, ideas and SOPs — and resurfaces them at the right moment.",
    },
    useCases: [
      "Save decisions and the reasoning behind them",
      "Build a personal SOP library",
      "Pin important references for later",
      "Link memory to active projects",
    ],
    benefits: [
      "Bidirectional links between projects and memory",
      "Tags, pinning and importance scoring",
      "Search across enriched context",
      "Timeline view of when memory was added",
    ],
    faq: [
      { q: "Is this just note-taking?", a: "No — memory entries are typed (decision, reference, SOP, etc.) and linked to projects and ideas." },
      { q: "Can I search across everything?", a: "Yes — search spans captures, ideas, memory and project notes." },
    ],
  },
  {
    slug: "note-taking-app-ai",
    keyword: "AI note taking app",
    title: "AI Note Taking App — InsightHalo",
    hero: {
      heading: "The note taking app that organizes itself",
      subheading:
        "Stop manually sorting notes. InsightHalo uses AI to read, tag, and route every note to exactly where it belongs — automatically.",
    },
    useCases: [
      "Meeting notes that file themselves into the right project",
      "Research notes linked to relevant ideas and memory",
      "Quick thoughts captured by voice and transcribed instantly",
      "Book summaries saved to your personal knowledge base",
    ],
    benefits: [
      "No folders to manage — AI builds the structure",
      "Every note is enriched with context and tags",
      "Search across all notes by meaning, not just keywords",
      "Works from phone, desktop, or email forward",
    ],
    faq: [
      { q: "How is this different from Notion or Apple Notes?", a: "InsightHalo doesn't require you to build a system — the AI does it for you. Capture in 10 seconds and your note is already tagged, prioritized, and filed." },
      { q: "Can I capture notes by voice?", a: "Yes — tap the microphone, speak naturally, and the transcript is saved and organized automatically." },
      { q: "Does it work offline?", a: "Captures queue locally and sync when you're back online." },
      { q: "Is there a web clipper?", a: "Yes — install the bookmarklet from Settings to save any webpage to your second brain in one click." },
    ],
  },
  {
    slug: "personal-knowledge-management",
    keyword: "personal knowledge management",
    title: "Personal Knowledge Management Software — InsightHalo",
    hero: {
      heading: "PKM software built for people who think fast",
      subheading:
        "InsightHalo is a personal knowledge management system that captures, connects, and resurfaces everything you know — without the setup overhead.",
    },
    useCases: [
      "Build a living knowledge base from daily captures",
      "Connect related ideas across projects and memory",
      "Surface past decisions when you face similar problems",
      "Track what you've learned week over week",
    ],
    benefits: [
      "No manual linking — AI connects related content",
      "Memory layer grows automatically over time",
      "Semantic search finds concepts, not just keywords",
      "Weekly review ritual keeps knowledge active",
    ],
    faq: [
      { q: "What is personal knowledge management?", a: "PKM is the practice of capturing, organizing, and using information you encounter — so your knowledge compounds rather than getting lost." },
      { q: "How is InsightHalo different from Obsidian or Roam?", a: "InsightHalo is fully automatic. You don't build a graph or write backlinks — the AI finds connections and organizes your knowledge for you." },
      { q: "Can I export my knowledge base?", a: "Yes — export everything as Markdown, JSON, Notion-compatible JSON, or CSV at any time from Settings." },
      { q: "Does it work for teams?", a: "Yes — create a shared Team Workspace and share any capture to a live team feed with one tap." },
    ],
  },
  {
    slug: "daily-planner-app",
    keyword: "AI daily planner app",
    title: "AI Daily Planner App — InsightHalo",
    hero: {
      heading: "Your AI daily planner that knows what matters most",
      subheading:
        "InsightHalo builds your daily priority list automatically — surfacing overdue tasks, follow-ups, and goals so you always know what to focus on.",
    },
    useCases: [
      "Start every morning with a clear, AI-curated Today list",
      "Pin the 3 most important tasks and focus with Pomodoro",
      "Review what was completed and what rolled over",
      "Plan your week with the built-in weekly review ritual",
    ],
    benefits: [
      "AI surfaces what needs attention each day",
      "Drag-to-reorder your daily queue",
      "Built-in Pomodoro focus timer",
      "Streak tracking to build consistent habits",
    ],
    faq: [
      { q: "Is this a calendar replacement?", a: "No — InsightHalo focuses on task and thought capture rather than time-blocking. It surfaces what to do, not when to do it." },
      { q: "How does AI decide what goes into Today?", a: "It considers due dates, urgency scores, project status, and review history to surface the most important items." },
      { q: "Can I use it alongside my calendar?", a: "Yes — export to Google Calendar (.ics) format from Settings to sync due dates with your existing calendar." },
      { q: "Does it work on mobile?", a: "Yes — InsightHalo is a progressive web app. Add it to your home screen for a native-app experience." },
    ],
  },
  {
    slug: "gtd-app",
    keyword: "GTD app",
    title: "GTD App — Getting Things Done with InsightHalo",
    hero: {
      heading: "A GTD app powered by AI — capture everything, decide nothing twice",
      subheading:
        "InsightHalo applies Getting Things Done principles automatically. Capture every thought, let AI triage it, then work from a trusted system.",
    },
    useCases: [
      "Capture inbox — dump everything into one place first",
      "AI-powered clarify step — every capture gets a next action",
      "Organize into Today, Projects, Someday, and Reference",
      "Weekly review ritual built into the app",
    ],
    benefits: [
      "Inbox Zero is achievable in 2 minutes per day",
      "AI writes the next action for every capture",
      "Someday/Maybe list for ideas not ready to act on",
      "Projects with milestones and progress tracking",
    ],
    faq: [
      { q: "Does InsightHalo follow the GTD method exactly?", a: "InsightHalo is inspired by GTD — it has a capture inbox, AI-powered clarify and organize steps, a Someday list, and a weekly review. It adapts the system to work automatically." },
      { q: "What is the GTD method?", a: "Getting Things Done (GTD) by David Allen is a productivity framework based on capturing all tasks and thoughts into a trusted system, then deciding the next action for each one." },
      { q: "Can I customize how captures are categorized?", a: "Yes — you can edit the AI triage result for any capture from the Inbox and reassign it to any category." },
      { q: "Is the weekly review guided?", a: "Yes — the Weekly Review page walks you through reviewing all active projects, clearing your inbox, and setting intentions for the week ahead." },
    ],
  },
];
