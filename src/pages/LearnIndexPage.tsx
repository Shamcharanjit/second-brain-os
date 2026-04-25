import { Link } from "react-router-dom";
import SeoHead from "@/components/seo/SeoHead";
import { LEARN_PAGES } from "@/lib/seo/config";
import { breadcrumbSchema, webApplicationSchema } from "@/lib/seo/schema";
import { SITE_URL } from "@/lib/seo/config";
import { ArrowRight } from "lucide-react";

export default function LearnIndexPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SeoHead
        slug="/learn"
        config={{
          title: "Learn — InsightHalo Knowledge Base",
          description:
            "Explore how InsightHalo works as a second brain, voice capture tool, AI planner and memory assistant.",
          keywords: ["second brain", "ai planner", "voice capture", "memory assistant"],
        }}
        jsonLd={[
          webApplicationSchema(),
          breadcrumbSchema([
            { name: "Home", url: SITE_URL },
            { name: "Learn", url: `${SITE_URL}/learn` },
          ]),
        ]}
      />
      <header className="border-b">
        <div className="max-w-5xl mx-auto px-6 py-12">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Knowledge base</p>
          <h1 className="text-4xl font-bold mt-2">Learn what InsightHalo can do</h1>
          <p className="text-muted-foreground mt-3 max-w-2xl">
            Deep dives into how InsightHalo works as your second brain, voice capture tool, planner and memory layer.
          </p>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-6 py-12 grid sm:grid-cols-2 gap-4">
        {LEARN_PAGES.map((p) => (
          <Link
            key={p.slug}
            to={`/learn/${p.slug}`}
            className="group rounded-xl border bg-card p-6 hover:border-primary/40 transition-all"
          >
            <p className="text-xs uppercase tracking-wider text-muted-foreground">{p.keyword}</p>
            <h2 className="text-xl font-semibold mt-2 group-hover:text-primary transition-colors">
              {p.hero.heading}
            </h2>
            <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{p.hero.subheading}</p>
            <span className="inline-flex items-center gap-1 text-sm text-primary mt-4">
              Read more <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </Link>
        ))}
      </main>
    </div>
  );
}
