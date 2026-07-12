"use client";

/**
 * Dev preview: free watermarked DPA preview vs Pro full document.
 * Route: /en/dev/dpa-preview
 */
import { generateDpaDraftStub } from "@/lib/dpa/generate-dpa";

const input = {
  jurisdiction: "us_california",
  dataCategories: ["Personal information / PII", "Usage / analytics data"],
  processingPurpose: "Provide hosted analytics SaaS",
  controllerName: "Customer Co.",
  processorName: "CloudForge Analytics, Inc.",
  locale: "en" as const,
};

export default function DpaPreviewPage() {
  const free = generateDpaDraftStub(input, false);
  const pro = generateDpaDraftStub(input, true);

  return (
    <main className="min-h-screen bg-paper-dark py-10 px-4">
      <div className="max-w-5xl mx-auto space-y-8">
        <header>
          <p className="section-label">Dev preview</p>
          <h1 className="font-serif text-2xl text-ink">DPA free vs Pro</h1>
          <p className="text-sm text-ink-muted font-sans mt-1">
            Watermarked ~30% preview · Full unlocked document
          </p>
          <button type="button" className="dpa-generate-cta mt-4">
            Generate Compliant DPA Template →
          </button>
        </header>

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-xl border border-border/50 bg-white p-4 shadow-sm">
            <h2 className="font-sans text-sm font-semibold text-ink mb-3">
              Free — watermarked preview
            </h2>
            <div className="dpa-result-panel">
              <div className="dpa-watermark">{free.watermarkText}</div>
              <pre className="dpa-preview-body">{free.preview}</pre>
              <p className="dpa-disclaimer-foot">
                AI-generated draft. Review by qualified counsel before use.
              </p>
              <button type="button" className="btn btn-primary mt-3">
                Upgrade to Download
              </button>
            </div>
          </section>

          <section className="rounded-xl border border-border/50 bg-white p-4 shadow-sm">
            <h2 className="font-sans text-sm font-semibold text-ink mb-3">
              Pro — full document
            </h2>
            <div className="dpa-result-panel">
              <div className="dpa-unlocked-badge">Full document unlocked (Pro)</div>
              <pre className="dpa-preview-body">{pro.fullContent}</pre>
              <p className="dpa-disclaimer-foot">
                AI-generated draft. Review by qualified counsel before use.
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                <button type="button" className="btn btn-primary">
                  Download Word
                </button>
                <button type="button" className="btn btn-outline">
                  Download PDF
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
