/**
 * useLinkPreview
 *
 * Extracts the first URL from a string, then fetches Open Graph metadata
 * via the fetch-link-preview Edge Function.
 *
 * Results are cached in a module-level Map so repeated renders of the same
 * URL don't trigger redundant network calls.
 */

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";

export interface LinkPreview {
  title: string | null;
  description: string | null;
  image: string | null;
  favicon: string | null;
  siteName: string | null;
  url: string;
}

// Module-level cache — survives component re-mounts
const previewCache = new Map<string, LinkPreview | null>();
const inFlight = new Map<string, Promise<LinkPreview | null>>();

// Regex to extract the first http(s) URL from arbitrary text
const URL_RE = /https?:\/\/[^\s<>"']+/i;

export function extractUrl(text: string): string | null {
  return text.match(URL_RE)?.[0]?.replace(/[.,;!?)]+$/, "") ?? null;
}

async function fetchPreview(url: string): Promise<LinkPreview | null> {
  if (previewCache.has(url)) return previewCache.get(url)!;
  if (inFlight.has(url)) return inFlight.get(url)!;

  const promise = (async (): Promise<LinkPreview | null> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const supabaseUrl = (supabase as any).supabaseUrl as string;
      const anonKey    = (supabase as any).supabaseKey  as string;

      const endpoint = `${supabaseUrl}/functions/v1/fetch-link-preview?url=${encodeURIComponent(url)}`;
      const res = await fetch(endpoint, {
        headers: {
          apikey: anonKey,
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        signal: AbortSignal.timeout(8_000),
      });

      if (!res.ok) { previewCache.set(url, null); return null; }
      const data = await res.json();
      if (data.error) { previewCache.set(url, null); return null; }

      const preview: LinkPreview = {
        title:       data.title       ?? null,
        description: data.description ?? null,
        image:       data.image       ?? null,
        favicon:     data.favicon     ?? null,
        siteName:    data.siteName    ?? null,
        url:         data.url         ?? url,
      };
      previewCache.set(url, preview);
      return preview;
    } catch {
      previewCache.set(url, null);
      return null;
    } finally {
      inFlight.delete(url);
    }
  })();

  inFlight.set(url, promise);
  return promise;
}

export function useLinkPreview(text: string) {
  const url = extractUrl(text);
  const [preview, setPreview] = useState<LinkPreview | null>(
    url && previewCache.has(url) ? previewCache.get(url)! : null
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!url) return;
    if (previewCache.has(url)) { setPreview(previewCache.get(url)!); return; }
    setLoading(true);
    fetchPreview(url).then((p) => { setPreview(p); setLoading(false); });
  }, [url]);

  return { preview, loading, url };
}
