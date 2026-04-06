import { useNavigate } from "react-router-dom";
import { Brain, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";

export default function TermsPage() {
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
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">Terms of Service</h1>
        <p className="text-sm text-muted-foreground mb-10">Last updated: April 6, 2026</p>

        <div className="space-y-8 text-sm md:text-base text-muted-foreground leading-relaxed">
          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">1. Acceptance of Terms</h2>
            <p>By accessing or using InsightHalo ("the Service"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Service.</p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">2. Description of Service</h2>
            <p>InsightHalo is an AI-powered second brain application that helps you capture, organize, and retrieve thoughts, notes, files, and ideas. The Service includes text capture, voice notes, file attachments, AI-assisted enrichment, and organizational tools.</p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">3. User Accounts</h2>
            <p>You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You must provide accurate and complete information when creating an account.</p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">4. User Content</h2>
            <p>You retain ownership of all content you submit to InsightHalo, including text, voice recordings, images, files, and other materials ("User Content"). By using the Service, you grant InsightHalo a limited license to process your content solely for the purpose of providing the Service to you.</p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">5. AI-Generated Insights</h2>
            <p>InsightHalo uses artificial intelligence to enrich, categorize, and analyze your content. AI-generated insights, summaries, and suggestions are provided as assistive features and should not be relied upon as authoritative or complete. Your original content is always preserved unmodified.</p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">6. Acceptable Use</h2>
            <p>You agree not to use the Service for any unlawful purpose, to upload malicious content, to attempt to access other users' data, or to interfere with the operation of the Service.</p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">7. Service Availability</h2>
            <p>InsightHalo strives to maintain high availability but does not guarantee uninterrupted access. The Service may be temporarily unavailable for maintenance, updates, or due to circumstances beyond our control.</p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">8. Limitation of Liability</h2>
            <p>To the maximum extent permitted by law, InsightHalo shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the Service. The Service is provided "as is" without warranties of any kind.</p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">9. Changes to Terms</h2>
            <p>We reserve the right to modify these terms at any time. Continued use of the Service after changes constitutes acceptance of the modified terms. We will make reasonable efforts to notify users of significant changes.</p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">10. Contact</h2>
            <p>For questions about these Terms of Service, please contact us through the application or visit our website.</p>
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
