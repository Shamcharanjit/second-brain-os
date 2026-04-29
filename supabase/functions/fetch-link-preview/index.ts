/**
 * fetch-link-preview
 *
 * Fetches Open Graph / meta tag data for a given URL and returns a JSON summary.
 * Called from the client to sidestep CORS restrictions on direct URL fetching.
 *
 * Query params:
 *   url — the URL to preview (required)
 *
 * Returns:
 *   { title, description, image, favicon, siteName, url }
 *
 * Security:
 *   - Only fetches http/https URLs (blocks file://, data:, etc.)
 *   - 5-second timeout
 *   - Response capped at 500KB to prevent memory abuse
 *   - Cache-Control: public, max-age=86400 so the CDN/browser caches results
 */

const ALLOWED_PROTOCOLS = ["http:", "https:"];
const MAX_BYTES = 500_000;
const TIMEOUT_MS = 5_000;

Deno.serve(async (req) => {
  // CORS — allow the InsightHalo origin
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const { searchParams } = new URL(req.url);
  const rawUrl = searchParams.get("url");

  if (!rawUrl) {
    return new Response(JSON.stringify({ error: "url param required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return new Response(JSON.stringify({ error: "invalid url" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!ALLOWED_PROTOCOLS.includes(parsed.protocol)) {
    return new Response(JSON.stringify({ error: "protocol not allowed" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const res = await fetch(parsed.toString(), {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; InsightHaloBot/1.0; +https://insighthalo.com)",
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
      },
      redirect: "follow",
    });

    clearTimeout(timer);

    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("html")) {
      // Non-HTML (PDF, image, etc.) — return minimal preview from URL
      return new Response(JSON.stringify({
        title: parsed.hostname,
        description: null,
        image: null,
        favicon: `${parsed.origin}/favicon.ico`,
        siteName: parsed.hostname,
        url: parsed.toString(),
      }), {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=86400",
        },
      });
    }

    // Read up to MAX_BYTES
    const reader = res.body?.getReader();
    if (!reader) throw new Error("no body");

    let html = "";
    let bytesRead = 0;
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done || bytesRead > MAX_BYTES) break;
      html += decoder.decode(value, { stream: true });
      bytesRead += value?.length ?? 0;
      // Stop once we have the <head> — no need for the full page
      if (html.includes("</head>")) break;
    }
    reader.cancel();

    // Parse tags
    const get = (prop: string): string | null => {
      const patterns = [
        new RegExp(`<meta[^>]+property=["']${prop}["'][^>]+content=["']([^"']+)["']`, "i"),
        new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${prop}["']`, "i"),
        new RegExp(`<meta[^>]+name=["']${prop.replace("og:", "")}["'][^>]+content=["']([^"']+)["']`, "i"),
        new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${prop.replace("og:", "")}["']`, "i"),
      ];
      for (const re of patterns) {
        const m = html.match(re);
        if (m?.[1]) return decodeEntities(m[1].trim());
      }
      return null;
    };

    const titleMatch = html.match(/<title[^>]*>([^<]{1,300})<\/title>/i);
    const title     = get("og:title") ?? (titleMatch ? decodeEntities(titleMatch[1].trim()) : parsed.hostname);
    const description = get("og:description") ?? get("description");
    const image     = get("og:image") ?? get("twitter:image");
    const siteName  = get("og:site_name") ?? parsed.hostname;

    // Favicon: try og:image first, fall back to /favicon.ico
    const faviconMatch = html.match(/<link[^>]+rel=["'][^"']*icon[^"']*["'][^>]+href=["']([^"']+)["']/i)
                      ?? html.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["'][^"']*icon[^"']*["']/i);
    let favicon = faviconMatch?.[1] ?? `${parsed.origin}/favicon.ico`;
    if (favicon.startsWith("/")) favicon = `${parsed.origin}${favicon}`;
    else if (!favicon.startsWith("http")) favicon = `${parsed.origin}/${favicon}`;

    // Resolve relative image URL
    let resolvedImage = image;
    if (resolvedImage && resolvedImage.startsWith("/")) {
      resolvedImage = `${parsed.origin}${resolvedImage}`;
    }

    return new Response(JSON.stringify({ title, description, image: resolvedImage, favicon, siteName, url: parsed.toString() }), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (err: any) {
    const msg = err?.name === "AbortError" ? "timeout" : "fetch_failed";
    return new Response(JSON.stringify({ error: msg }), {
      status: 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function decodeEntities(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}
