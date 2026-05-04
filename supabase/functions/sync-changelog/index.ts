/**
 * sync-changelog
 *
 * Accepts a JSON array from public/changelog.json and upserts each entry
 * into the public.announcements table as type='feature_update'.
 * Called by GitHub Actions on every push to main.
 *
 * Auth: requires SUPABASE_SERVICE_ROLE_KEY (passed as Bearer token by CI).
 *
 * POST body: { entries: ChangelogEntry[] }
 *
 * Upsert key: `slug` (text, unique) — the human-readable id from changelog.json
 * The primary key (id UUID) is auto-generated and never touched.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ChangelogEntry {
  id: string;           // used as slug
  title: string;
  message: string;
  version_tag?: string | null;
  cta_label?: string | null;
  cta_link?: string | null;
  date: string;
  audience?: "user" | "admin" | "internal";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const body = await req.json() as { entries: ChangelogEntry[] };
    const { entries } = body;

    if (!Array.isArray(entries) || entries.length === 0) {
      return Response.json({ success: false, error: "entries array required" }, { status: 400, headers: corsHeaders });
    }

    // Build rows — do NOT include `id` (UUID auto-generated).
    // Use `slug` (the human-readable id from changelog.json) as upsert key.
    const rows = entries.map((e) => ({
      slug: e.id,                              // stable human-readable key
      type: "feature_update",
      status: "active",
      title: e.title,
      message: e.message,
      version_tag: e.version_tag ?? null,
      cta_label: e.cta_label ?? null,
      cta_link: e.cta_link ?? null,
      audience: e.audience ?? "user",
      created_at: e.date ? `${e.date}T00:00:00Z` : new Date().toISOString(),
      visible_from: null,
      visible_to: null,
    }));

    const { error, data } = await supabase
      .from("announcements")
      .upsert(rows, { onConflict: "slug", ignoreDuplicates: false })
      .select("slug");

    if (error) {
      console.error("Upsert error:", error);
      return Response.json({ success: false, error: error.message }, { status: 500, headers: corsHeaders });
    }

    console.log(`sync-changelog: upserted ${rows.length} entries`);
    return Response.json({ success: true, upserted: rows.length, slugs: data?.map((r: any) => r.slug) }, { headers: corsHeaders });
  } catch (err) {
    console.error("sync-changelog error:", err);
    return Response.json({ success: false, error: String(err) }, { status: 500, headers: corsHeaders });
  }
});
