import { Link, useParams, Navigate } from "react-router-dom";
import SeoHead from "@/components/seo/SeoHead";
import { LEARN_PAGES, SITE_URL } from "@/lib/seo/config";
import {
  breadcrumbSchema,
  faqPageSchema,
  softwareApplicationSchema,
} from "@/lib/seo/schema";
import { ArrowRight, CheckCircle2, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LearnDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const page = LEARN_PAGES.find((p) => p.slug === slug);
  if (!page) return <Navigate to="/learn" replace />;

  const url = `${SITE_URL}/learn/${page.slug}`;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SeoHead
        slug={`/learn/${page.slug}`}
        config={{
          title: page.title,
          description: page.hero.subheading,
          keywords: [page.keyword],
          canonical: url,
        }}
        jsonLd={[
          softwareApplicationSchema(),
          faqPageSchema(page.faq),
          breadcrumbSchema([
            { name: "Home", url: SITE_URL },
            { name: "Learn", url: `${SITE_URL}/learn` },
            { name: page.title, url },
          ]),
        ]}
      />

      <header className="border-b">
        <div className="max-w-4xl mx-auto px-6 py-6">
          <Link to="/learn" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ChevronLeft className="h-4 w-4" /> All topics
          </Link>
        </div>
      </header>

      <section className="max-w-4xl mx-auto px-6 py-16">
        <p className="text-xs uppercase tracking-widest text-primary">{page.keyword}</p>
        <h1 className="text-4xl md:text-5xl font-bold mt-3 leading-tight">{page.hero.heading}</h1>
        <p className="text-lg text-muted-foreground mt-4 max-w-2xl">{page.hero.subheading}</p>
        <div className="mt-6 flex gap-3">
          <Link to="/waitlist">
            <Button size="lg">Get early access <ArrowRight className="ml-2 h-4 w-4" /></Button>
          </Link>
          <Link to="/">
            <Button size="lg" variant="outline">See InsightHalo</Button>
          </Link>
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-6 py-12 grid md:grid-cols-2 gap-8">
        <div>
          <h2 className="text-2xl font-semibold mb-4">Use cases</h2>
          <ul className="space-y-3">
            {page.useCases.map((u) => (
              <li key={u} className="flex items-start gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <span>{u}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="text-2xl font-semibold mb-4">Benefits</h2>
          <ul className="space-y-3">
            {page.benefits.map((b) => (
              <li key={b} className="flex items-start gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-6 py-12 border-t">
        <h2 className="text-2xl font-semibold mb-6">Frequently asked questions</h2>
        <div className="space-y-4">
          {page.faq.map((f) => (
            <div key={f.q} className="rounded-lg border bg-card p-5">
              <h3 className="font-medium">{f.q}</h3>
              <p className="text-muted-foreground mt-2 text-sm">{f.a}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="max-w-4xl mx-auto px-6 py-12 text-center border-t">
        <h2 className="text-2xl font-semibold">Ready to try InsightHalo?</h2>
        <p className="text-muted-foreground mt-2">Capture your first thought in seconds.</p>
        <Link to="/waitlist" className="inline-block mt-4">
          <Button size="lg">Join the waitlist</Button>
        </Link>
      </footer>
    </div>
  );
}
