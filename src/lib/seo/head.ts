/**
 * Lightweight document head manager (no react-helmet dependency).
 * Used by <SeoHead /> to set title, meta tags, canonical, OG, Twitter, JSON-LD.
 */

import { DEFAULT_OG_IMAGE, SITE_NAME, SITE_URL, type SeoConfig } from "./config";

const MANAGED_ATTR = "data-seo-managed";

function upsertMeta(selector: string, attrs: Record<string, string>) {
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(MANAGED_ATTR, "true");
    document.head.appendChild(el);
  }
  Object.entries(attrs).forEach(([k, v]) => el!.setAttribute(k, v));
}

function upsertLink(rel: string, href: string) {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"][${MANAGED_ATTR}]`);
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    el.setAttribute(MANAGED_ATTR, "true");
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

function clearJsonLd() {
  document.head
    .querySelectorAll(`script[type="application/ld+json"][${MANAGED_ATTR}]`)
    .forEach((n) => n.remove());
}

function appendJsonLd(data: unknown) {
  const script = document.createElement("script");
  script.setAttribute("type", "application/ld+json");
  script.setAttribute(MANAGED_ATTR, "true");
  script.text = JSON.stringify(data);
  document.head.appendChild(script);
}

export function applySeo(config: SeoConfig, jsonLd?: unknown[]) {
  const fullTitle = config.title;
  const description = config.description;
  const canonical = config.canonical || `${SITE_URL}${window.location.pathname}`;
  const ogImage = config.ogImage || DEFAULT_OG_IMAGE;
  const ogType = config.ogType || "website";

  document.title = fullTitle;

  upsertMeta('meta[name="description"]', { name: "description", content: description });
  if (config.keywords?.length) {
    upsertMeta('meta[name="keywords"]', { name: "keywords", content: config.keywords.join(", ") });
  }
  upsertMeta('meta[name="robots"]', {
    name: "robots",
    content: config.noindex ? "noindex, nofollow" : "index, follow",
  });

  upsertLink("canonical", canonical);

  // OpenGraph
  upsertMeta('meta[property="og:title"]', { property: "og:title", content: fullTitle });
  upsertMeta('meta[property="og:description"]', { property: "og:description", content: description });
  upsertMeta('meta[property="og:type"]', { property: "og:type", content: ogType });
  upsertMeta('meta[property="og:url"]', { property: "og:url", content: canonical });
  upsertMeta('meta[property="og:image"]', { property: "og:image", content: ogImage });
  upsertMeta('meta[property="og:site_name"]', { property: "og:site_name", content: SITE_NAME });

  // Twitter
  upsertMeta('meta[name="twitter:card"]', { name: "twitter:card", content: "summary_large_image" });
  upsertMeta('meta[name="twitter:title"]', { name: "twitter:title", content: fullTitle });
  upsertMeta('meta[name="twitter:description"]', { name: "twitter:description", content: description });
  upsertMeta('meta[name="twitter:image"]', { name: "twitter:image", content: ogImage });

  // JSON-LD
  clearJsonLd();
  if (jsonLd?.length) jsonLd.forEach(appendJsonLd);
}
