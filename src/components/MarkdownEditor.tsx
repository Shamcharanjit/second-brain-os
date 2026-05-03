/**
 * MarkdownEditor — simple write + preview markdown editor.
 * No external deps — uses @tailwindcss/typography prose class for rendering.
 */
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Eye, Pencil } from "lucide-react";

// Minimal safe markdown → HTML converter (user-owned content only)
function renderMarkdown(md: string): string {
  let html = md
    // Headings
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    // Bold / italic
    .replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/_(.+?)_/g, "<em>$1</em>")
    // Code blocks
    .replace(/```[\s\S]*?```/g, (m) => `<pre><code>${m.slice(3, -3).trim()}</code></pre>`)
    // Inline code
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    // Blockquote
    .replace(/^> (.+)$/gm, "<blockquote>$1</blockquote>")
    // Unordered list
    .replace(/^[-*] (.+)$/gm, "<li>$1</li>")
    // Ordered list
    .replace(/^\d+\. (.+)$/gm, "<li>$1</li>")
    // Horizontal rule
    .replace(/^---$/gm, "<hr>")
    // Line breaks → paragraphs (double newline)
    .replace(/\n\n/g, "</p><p>")
    .replace(/\n/g, "<br>");

  return `<p>${html}</p>`;
}

interface Props {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  minHeight?: string;
  className?: string;
}

export default function MarkdownEditor({ value, onChange, placeholder = "Write in Markdown…", minHeight = "min-h-[200px]", className = "" }: Props) {
  const [mode, setMode] = useState<"edit" | "preview">("edit");

  return (
    <div className={`rounded-xl border bg-card overflow-hidden ${className}`}>
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/30">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setMode("edit")}
            className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors ${mode === "edit" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            <Pencil className="h-3 w-3" /> Edit
          </button>
          <button
            onClick={() => setMode("preview")}
            className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors ${mode === "preview" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            <Eye className="h-3 w-3" /> Preview
          </button>
        </div>
        <span className="text-[10px] text-muted-foreground/50">Markdown supported</span>
      </div>

      {mode === "edit" ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full resize-none bg-transparent px-4 py-3 text-sm leading-relaxed outline-none font-mono ${minHeight}`}
        />
      ) : (
        <div
          className={`prose prose-sm dark:prose-invert max-w-none px-4 py-3 ${minHeight} overflow-y-auto`}
          dangerouslySetInnerHTML={{ __html: value ? renderMarkdown(value) : `<p class="text-muted-foreground italic">Nothing to preview yet.</p>` }}
        />
      )}
    </div>
  );
}
