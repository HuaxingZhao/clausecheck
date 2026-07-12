"use client";

/**
 * Dev-only visual preview of feedback button states (idle / compose / received).
 * Route: /en/dev/feedback-preview
 * Hardcoded EN mocks — no next-intl (en.json has string[] that fail AbstractIntlMessages).
 */

function MockIdle() {
  return (
    <div className="review-feedback" data-feedback-state="idle">
      <div className="review-feedback-btns" role="group">
        <button type="button" className="review-feedback-btn review-feedback-btn--accurate">
          <span aria-hidden>👍</span>
          <span>Accurate</span>
        </button>
        <button type="button" className="review-feedback-btn review-feedback-btn--missed_issue">
          <span aria-hidden>👎</span>
          <span>Missed Issue</span>
        </button>
        <button type="button" className="review-feedback-btn review-feedback-btn--false_positive">
          <span aria-hidden>👎</span>
          <span>False Positive</span>
        </button>
      </div>
    </div>
  );
}

function MockCompose() {
  return (
    <div className="review-feedback" data-feedback-state="compose">
      <div className="review-feedback-btns" role="group">
        <button
          type="button"
          className="review-feedback-btn review-feedback-btn--false_positive is-selected"
        >
          <span aria-hidden>👎</span>
          <span>False Positive</span>
        </button>
        <button type="button" className="review-feedback-btn review-feedback-btn--accurate">
          <span aria-hidden>👍</span>
          <span>Accurate</span>
        </button>
        <button type="button" className="review-feedback-btn review-feedback-btn--missed_issue">
          <span aria-hidden>👎</span>
          <span>Missed Issue</span>
        </button>
      </div>
      <div className="review-feedback-compose">
        <label className="review-feedback-comment-label">Brief description (optional)</label>
        <textarea
          className="review-feedback-comment"
          rows={2}
          readOnly
          value="Liability cap flagged but matches market standard for mid-market SaaS."
        />
        <div className="review-feedback-compose-actions">
          <button type="button" className="review-feedback-submit">
            Submit
          </button>
          <button type="button" className="review-feedback-cancel">
            Cancel
          </button>
        </div>
        <p className="review-feedback-anon-hint">
          Sign in to track your feedback history
        </p>
      </div>
    </div>
  );
}

function MockReceived() {
  return (
    <div className="review-feedback review-feedback--done" data-feedback-state="received">
      <span className="review-feedback-received">✓ Feedback received</span>
      <p className="review-feedback-anon-hint">Sign in to track your feedback history</p>
    </div>
  );
}

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border/50 bg-white p-4 shadow-sm">
      <h2 className="font-sans text-sm font-semibold text-ink mb-3">{title}</h2>
      <div className="flag-item flag-item--panel flag-medium rounded-lg border border-border/40 p-2">
        <p className="text-xs text-ink-light font-sans mb-2 px-1">
          Sample risk flag — liability cap / indemnity scope
        </p>
        {children}
      </div>
    </div>
  );
}

export default function FeedbackPreviewPage() {
  return (
    <main className="min-h-screen bg-paper-dark py-12 px-4">
      <div className="max-w-3xl mx-auto space-y-8">
        <header>
          <p className="section-label">Dev preview</p>
          <h1 className="font-serif text-2xl text-ink">Review feedback UI states</h1>
          <p className="text-sm text-ink-muted font-sans mt-1">
            Idle · Compose (False Positive) · Received
          </p>
        </header>
        <Card title="1. Idle — three dimensions">
          <MockIdle />
        </Card>
        <Card title="2. Compose — comment + Submit">
          <MockCompose />
        </Card>
        <Card title="3. Received — locked">
          <MockReceived />
        </Card>
      </div>
    </main>
  );
}
