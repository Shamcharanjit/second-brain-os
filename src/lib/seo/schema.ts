/**
 * schema.org JSON-LD builders.
 */

import { SITE_NAME, SITE_URL } from "./config";

export function softwareApplicationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: SITE_NAME,
    applicationCategory: "ProductivityApplication",
    operatingSystem: "Web, iOS, Android",
    description:
      "AI second brain that captures thoughts, voice notes, screenshots and files and organizes them automatically.",
    url: SITE_URL,
    screenshot: `${SITE_URL}/og-image.png`,
    featureList: [
      "AI-powered thought capture",
      "Voice capture and transcription",
      "Automatic tagging and routing",
      "Project tracking",
      "Memory layer with semantic search",
      "Daily and weekly review rituals",
      "Team workspaces",
      "Goal tracking",
    ],
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      description: "Free plan available. Pro plan with unlimited AI features.",
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.8",
      ratingCount: "140",
      bestRating: "5",
      worstRating: "1",
    },
  };
}

export function webApplicationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: SITE_NAME,
    url: SITE_URL,
    browserRequirements: "Requires JavaScript. Requires HTML5.",
    applicationCategory: "ProductivityApplication",
    operatingSystem: "Web",
  };
}

export function faqPageSchema(faqs: { q: string; a: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
}

export function breadcrumbSchema(items: { name: string; url: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: it.url,
    })),
  };
}

export function articleSchema(opts: {
  title: string;
  description: string;
  url: string;
  datePublished?: string;
  keywords?: string[];
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: opts.title,
    description: opts.description,
    url: opts.url,
    datePublished: opts.datePublished ?? "2026-01-01",
    dateModified: new Date().toISOString().split("T")[0],
    keywords: opts.keywords?.join(", "),
    author: {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
    },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
      logo: {
        "@type": "ImageObject",
        url: `${SITE_URL}/favicon-v2.svg`,
      },
    },
    image: `${SITE_URL}/og-image.png`,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": opts.url,
    },
  };
}

export function howToSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "How to use InsightHalo as your second brain",
    description: "Get started with InsightHalo in 3 simple steps — capture, let AI organize, then recall and act.",
    step: [
      {
        "@type": "HowToStep",
        position: 1,
        name: "Capture",
        text: "Press the Quick Capture button or use voice capture to dump any thought, task, or idea in seconds — without worrying about where it goes.",
        image: `${SITE_URL}/og-image.png`,
      },
      {
        "@type": "HowToStep",
        position: 2,
        name: "AI organizes it",
        text: "InsightHalo AI automatically reads your capture, tags it, assigns a priority, and routes it to the right place — Today, Projects, Ideas Vault, or Memory.",
        image: `${SITE_URL}/og-image.png`,
      },
      {
        "@type": "HowToStep",
        position: 3,
        name: "Recall and act",
        text: "Search across all your captures instantly. Review your Today queue, run a weekly review ritual, and turn your best ideas into tracked projects.",
        image: `${SITE_URL}/og-image.png`,
      },
    ],
  };
}
