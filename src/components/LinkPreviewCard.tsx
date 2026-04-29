/**
 * LinkPreviewCard
 *
 * Compact inline link preview shown below a capture's content when its
 * raw_input contains a URL. Fetches OG metadata via the fetch-link-preview
 * Edge Function through useLinkPreview.
 *
 * Shows: favicon + site name, title, description (truncated), and the
 * bare domain. Clicking opens the URL in a new tab.
 *
 * Renders nothing if:
 *   - No URL found in the text
 *   - Preview fetch fails
 *   - Still loading on first render (avoids layout shift; fades in)
 */

import { ExternalLink } from "lucide-react";
import { useLinkPreview } from "@/hooks/useLinkPreview";

interface Props {
  text: string;
}

export default function LinkPreviewCard({ text }: Props) {
  const { preview, loading, url } = useLinkPreview(text);

  if (!url) return null;
  if (loading && !preview) return null; // don't show skeleton — just wait silently
  if (!preview) return null;

  const domain = (() => { try { return new URL(url).hostname.replace("www.", ""); } catch { return url; } })();

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className="group mt-2 flex items-start gap-3 rounded-lg border bg-muted/30 hover:bg-muted/60 p-3 transition-colors no-underline"
    >
      {/* Favicon */}
      <div className="shrink-0 mt-0.5">
        {preview.favicon ? (
          <img
            src={preview.favicon}
            alt=""
            className="h-4 w-4 rounded-sm object-contain"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        ) : (
          <ExternalLink className="h-4 w-4 text-muted-foreground" />
        )}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1 space-y-0.5">
        <p className="text-xs font-medium text-foreground leading-snug line-clamp-2 group-hover:text-primary transition-colors">
          {preview.title ?? domain}
        </p>
        {preview.description && (
          <p className="text-[11px] text-muted-foreground leading-snug line-clamp-2">
            {preview.description}
          </p>
        )}
        <p className="text-[10px] text-muted-foreground/60 font-mono">{domain}</p>
      </div>

      {/* OG image thumbnail */}
      {preview.image && (
        <div className="shrink-0 h-14 w-20 rounded-md overflow-hidden bg-muted">
          <img
            src={preview.image}
            alt=""
            className="h-full w-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).parentElement!.style.display = "none"; }}
          />
        </div>
      )}
    </a>
  );
}
