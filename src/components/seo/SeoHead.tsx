import { useEffect } from "react";
import { applySeo } from "@/lib/seo/head";
import { DEFAULT_SEO, ROUTE_SEO, type SeoConfig } from "@/lib/seo/config";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  slug?: string;
  config?: Partial<SeoConfig>;
  jsonLd?: unknown[];
}

/**
 * Mount once per page. Resolves SEO data from:
 *   1. explicit `config` prop
 *   2. `seo_metadata` table by slug
 *   3. ROUTE_SEO static fallback
 *   4. DEFAULT_SEO
 */
export default function SeoHead({ slug, config, jsonLd }: Props) {
  useEffect(() => {
    let cancelled = false;
    const path = slug || window.location.pathname;
    const fallback: SeoConfig = { ...DEFAULT_SEO, ...(ROUTE_SEO[path] || {}), ...config };

    // Apply fallback immediately for first paint
    applySeo(fallback, jsonLd);

    // Then enrich from DB if available
    (async () => {
      try {
        const { data } = await supabase
          .from("seo_metadata" as any)
          .select("title, description, keywords")
          .eq("page_slug", path)
          .maybeSingle();
        if (cancelled || !data) return;
        const merged: SeoConfig = {
          ...fallback,
          title: (data as any).title || fallback.title,
          description: (data as any).description || fallback.description,
          keywords: (data as any).keywords?.length ? (data as any).keywords : fallback.keywords,
        };
        applySeo(merged, jsonLd);
      } catch {
        /* fall back silently */
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, JSON.stringify(config), JSON.stringify(jsonLd)]);

  return null;
}
