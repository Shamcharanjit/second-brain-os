import { useNavigate } from "react-router-dom";
import { Brain, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";

export default function PrivacyPage() {
  const navigate = useNavigate();

  useEffect(() => {
    const html = document.documentElement;
    const hadDark = html.classList.contains("dark");
    html.classList.add("dark");
    return () => { if (!hadDark) html.classList.remove("dark"); };
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="mx-auto max-w-3xl px-5 md:px-8 flex items-center justify-between h-14">
          <button onClick={() => navigate("/")} className="flex items-center gap-2 group">
            <Brain className="h-5 w-5 text-primary transition-transform group-hover:scale-105" />
            <span className="text-base font-bold tracking-tight">InsightHalo</span>
          </button>
          <Button variant="ghost" size="sm" onClick={() => navigate(-1 as any)} className="gap-1.5 text-sm">
            <ArrowLeft className="h-3.5 w-3.5" /> Back
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 md:px-8 py-12 md:py-16">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground mb-10">Last updated: April 6, 2026</p>

        <div className="space-y-8 text-sm md:text-base text-muted-foreground leading-relaxed">
          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">1. Information We Collect</h2>
            <p>When you use InsightHalo, we collect information you provide directly: your email address and password for account creation, and the content you capture including text notes, voice recordings, uploaded files, screenshots, and other materials.</p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">2. Uploaded Content & Notes</h2>
            <p>All content you upload or capture — including text, voice recordings, images, documents, and files — is stored securely in your personal account. Your original content is always preserved exactly as entered and is never modified.</p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">3. How We Use Your Data</h2>
            <p>Your data is used exclusively to provide the InsightHalo service to you. This includes storing your captures, processing content through AI for enrichment and organization, enabling search across your content, and syncing across your devices.</p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">4. AI Processing</h2>
            <p>InsightHalo uses artificial intelligence to analyze, categorize, and enrich your captured content. AI processing is additive — it generates summaries, tags, and organizational suggestions alongside your original content without altering it. AI-generated insights are for your personal use within the Service.</p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">5. Search & Indexing</h2>
            <p>Your content is indexed to enable search functionality within your personal account. This index is private to your account and is not shared with other users or used for any purpose beyond providing you with search capabilities.</p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">6. Data Retention</h2>
            <p>Your data is retained for as long as your account is active. If you delete specific captures, they are removed from our active systems. If you delete your account, all associated data will be removed in accordance with our data retention schedule.</p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">7. Security</h2>
            <p>We implement industry-standard security measures to protect your data, including encrypted connections, secure authentication, and access controls. While no system is perfectly secure, we are committed to protecting your information.</p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">8. Third-Party Services</h2>
            <p>InsightHalo may use third-party services for infrastructure, AI processing, and authentication. These services process data solely on our behalf and are bound by their own privacy obligations. We do not sell your personal data to third parties.</p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">9. Your Rights</h2>
            <p>You have the right to access, export, and delete your data at any time. You can request a copy of your data or request account deletion by contacting us through the application.</p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">10. Changes to This Policy</h2>
            <p>We may update this Privacy Policy from time to time. We will notify you of any material changes. Your continued use of the Service after changes constitutes acceptance of the updated policy.</p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">11. Contact</h2>
            <p>For questions or concerns about this Privacy Policy or your data, please contact us through the application or visit our website.</p>
          </section>
        </div>
      </main>

      <footer className="border-t border-border/50 bg-muted/10">
        <div className="mx-auto max-w-3xl px-5 md:px-8 py-6 flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Brain className="h-3.5 w-3.5 text-primary" />
            <span className="font-medium">InsightHalo</span>
          </div>
          <p>© {new Date().getFullYear()} InsightHalo. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
