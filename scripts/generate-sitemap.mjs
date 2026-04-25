// Build-time sitemap generator. Run via `node scripts/generate-sitemap.mjs`.
// Vite build hook calls this through `postbuild` script if wired.
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

const SITE_URL = "https://insighthalo.com";

const STATIC_ROUTES = [
  "/",
  "/waitlist",
  "/terms",
  "/privacy",
  "/learn",
];

const LEARN_SLUGS = [
  "second-brain-app",
  "capture-thoughts-fast",
  "voice-capture-productivity",
  "ai-planner-assistant",
  "memory-assistant-software",
];

const urls = [
  ...STATIC_ROUTES,
  ...LEARN_SLUGS.map((s) => `/learn/${s}`),
];

const today = new Date().toISOString().slice(0, 10);
const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) => `  <url>
    <loc>${SITE_URL}${u}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${u === "/" ? "daily" : "weekly"}</changefreq>
    <priority>${u === "/" ? "1.0" : "0.7"}</priority>
  </url>`
  )
  .join("\n")}
</urlset>
`;

const out = resolve(process.cwd(), "public/sitemap.xml");
writeFileSync(out, xml);
console.log(`✅ sitemap.xml written with ${urls.length} URLs`);
