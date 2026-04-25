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
  "/": DEFAULT_SEO,
  "/waitlist": {
    title: "Join the InsightHalo Waitlist",
    description:
      "Get early access to InsightHalo — the AI second brain that captures and organizes everything you think.",
    keywords: ["waitlist", "second brain", "early access"],
  },
  "/terms": {
    title: "Terms of Service — InsightHalo",
    description: "Terms of service for using InsightHalo.",
  },
  "/privacy": {
    title: "Privacy Policy — InsightHalo",
    description: "How InsightHalo handles your data and protects your privacy.",
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
];
