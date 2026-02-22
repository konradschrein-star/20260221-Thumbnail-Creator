/**
 * ============================================================================
 * AI Thumbnail Rendering Farm — Main Dashboard
 * ============================================================================
 * Premium dark-mode dashboard for submitting and monitoring thumbnail jobs.
 *
 * Features:
 *  - Glassmorphism panel design
 *  - SSE real-time status streaming with polling fallback
 *  - Live job history sidebar (calls GET /api/v1/thumbnails)
 *  - Variant gallery with one-click download
 *  - LIFO priority regeneration button
 * ============================================================================
 */

"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  type FormEvent,
} from "react";

// ---------------------------------------------------------------------------
// API Base URL
// ---------------------------------------------------------------------------
const API_BASE_URL =
  typeof window !== "undefined" &&
    window.location.hostname.includes("vercel.app")
    ? ""
    : process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// ---------------------------------------------------------------------------
// Type Definitions
// ---------------------------------------------------------------------------

interface ThumbnailVariant {
  variant_id: string;
  image_url: string;
  storage_key?: string;
  metadata?: {
    prompt?: string;
    style?: string;
    provider?: string;
  };
}

interface JobStatus {
  job_id: string;
  status: "pending" | "processing" | "completed" | "failed" | "unknown";
  progress: number;
  message?: string;
  variants?: ThumbnailVariant[];
  error?: string;
  timestamp?: string;
}

interface JobListItem {
  job_id: string;
  status: string;
  progress: number;
  video_title: string;
  channel_id: string;
  num_variants: number;
  created_at: string;
}

interface GenerationRequest {
  channel_id: string;
  video_title: string;
  video_description?: string;
  reference_thumbnail_url?: string;
  num_variants: number;
}

// ---------------------------------------------------------------------------
// API Client
// ---------------------------------------------------------------------------

async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err as { error?: string }).error ?? `HTTP ${res.status}`
    );
  }
  return res.json() as Promise<T>;
}

async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err as { error?: string }).error ?? `HTTP ${res.status}`
    );
  }
  return res.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// SSE / Polling Hook
// ---------------------------------------------------------------------------

function useJobStream(jobId: string | null) {
  const [status, setStatus] = useState<JobStatus | null>(null);
  const [live, setLive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const esRef = useRef<EventSource | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!jobId) {
      setStatus(null);
      setLive(false);
      setError(null);
      return;
    }

    esRef.current?.close();
    if (pollRef.current) clearInterval(pollRef.current);

    const isVercel =
      typeof window !== "undefined" &&
      window.location.hostname.includes("vercel.app");

    function startPolling() {
      setLive(true);
      apiGet<JobStatus>(`/api/v1/thumbnails/status/${jobId}`)
        .then(setStatus)
        .catch(console.error);
      pollRef.current = setInterval(async () => {
        try {
          const s = await apiGet<JobStatus>(
            `/api/v1/thumbnails/status/${jobId}`
          );
          setStatus(s);
          if (s.status === "completed" || s.status === "failed") {
            if (pollRef.current) clearInterval(pollRef.current);
            setLive(false);
          }
        } catch {
          setError("Failed to reach the API");
        }
      }, 2000);
    }

    if (isVercel) {
      startPolling();
    } else {
      const es = new EventSource(
        `${API_BASE_URL}/api/v1/thumbnails/stream/${jobId}`
      );
      esRef.current = es;

      es.onopen = () => {
        setLive(true);
        setError(null);
      };

      es.addEventListener("status", (e: MessageEvent) => {
        try {
          setStatus((prev) => ({
            ...prev,
            ...JSON.parse(e.data as string),
            job_id: jobId,
          }));
        } catch { }
      });

      es.addEventListener("complete", (e: MessageEvent) => {
        try {
          const d = JSON.parse(e.data as string) as { final_status: string };
          setStatus((prev) =>
            prev ? { ...prev, status: d.final_status as JobStatus["status"] } : prev
          );
        } catch { }
        es.close();
        setLive(false);
      });

      es.onerror = () => {
        es.close();
        setLive(false);
        startPolling();
      };
    }

    return () => {
      esRef.current?.close();
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [jobId]);

  return { status, live, error };
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, string> = {
    completed: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    failed: "bg-red-500/20 text-red-300 border-red-500/30",
    processing: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    pending: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    unknown: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold uppercase tracking-wide ${cfg[status] ?? cfg.unknown}`}
    >
      {status === "processing" && (
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-400" />
      )}
      {status}
    </span>
  );
}

function ProgressBar({
  progress,
  status,
}: {
  progress: number;
  status: string;
}) {
  const fill =
    status === "completed"
      ? "from-emerald-500 to-teal-400"
      : status === "failed"
        ? "from-red-500 to-rose-400"
        : "from-violet-500 to-indigo-400";

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-zinc-400">
        <span>{status}</span>
        <span className="font-mono">{progress}%</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-700">
        <div
          className={`h-full rounded-full bg-gradient-to-r transition-all duration-500 ${fill}`}
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
      </div>
    </div>
  );
}

function VariantCard({
  variant,
  selected,
  onSelect,
}: {
  variant: ThumbnailVariant;
  selected: boolean;
  onSelect: () => void;
}) {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetch(variant.image_url);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${variant.variant_id}.png`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      window.open(variant.image_url, "_blank");
    }
  };

  return (
    <div
      onClick={onSelect}
      className={`group cursor-pointer overflow-hidden rounded-xl border transition-all duration-200 ${selected
          ? "border-violet-500 ring-2 ring-violet-500/40 shadow-violet-500/20 shadow-lg"
          : "border-zinc-700 hover:border-zinc-500"
        }`}
    >
      <div className="relative aspect-video bg-zinc-800">
        {!loaded && !errored && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-600 border-t-violet-500" />
          </div>
        )}
        {errored && (
          <div className="absolute inset-0 flex items-center justify-center text-zinc-500 text-sm">
            Failed to load
          </div>
        )}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={variant.image_url}
          alt={variant.variant_id}
          className={`h-full w-full object-cover transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`}
          onLoad={() => setLoaded(true)}
          onError={() => setErrored(true)}
        />
        {loaded && (
          <button
            onClick={handleDownload}
            className="absolute bottom-2 right-2 rounded-lg bg-black/60 px-2.5 py-1.5 text-xs font-medium text-white opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100"
          >
            ↓ Download
          </button>
        )}
      </div>
      <div className="bg-zinc-900 px-3 py-2">
        <p className="text-sm font-medium text-zinc-200">{variant.variant_id}</p>
        {variant.metadata?.style && (
          <p className="mt-0.5 text-xs text-zinc-500">
            {variant.metadata.style}
          </p>
        )}
      </div>
    </div>
  );
}

function FormField({
  label,
  id,
  required,
  children,
}: {
  label: string;
  id: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label
        htmlFor={id}
        className="block text-sm font-medium text-zinc-300"
      >
        {label}
        {required && <span className="ml-1 text-violet-400">*</span>}
      </label>
      {children}
    </div>
  );
}

const inputCls =
  "w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500/50 transition-colors";

// ---------------------------------------------------------------------------
// Main Dashboard
// ---------------------------------------------------------------------------

export default function Dashboard() {
  // Form state
  const [form, setForm] = useState<GenerationRequest>({
    channel_id: "",
    video_title: "",
    video_description: "",
    reference_thumbnail_url: "",
    num_variants: 3,
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState(false);

  // Job tracking
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);

  // Job history
  const [history, setHistory] = useState<JobListItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // SSE / polling
  const { status, live, error: streamError } = useJobStream(currentJobId);

  // Derived state
  const isComplete = status?.status === "completed";
  const isFailed = status?.status === "failed";
  const isActive =
    status?.status === "processing" || status?.status === "pending";

  // Fetch job history
  const refreshHistory = useCallback(() => {
    setHistoryLoading(true);
    apiGet<JobListItem[]>("/api/v1/thumbnails?limit=20")
      .then(setHistory)
      .catch(console.error)
      .finally(() => setHistoryLoading(false));
  }, []);

  useEffect(() => {
    refreshHistory();
  }, [refreshHistory]);

  // Refresh history when job completes
  useEffect(() => {
    if (isComplete || isFailed) {
      setTimeout(refreshHistory, 1000);
    }
  }, [isComplete, isFailed, refreshHistory]);

  // Form submit
  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      setSubmitting(true);
      setSubmitError(null);
      setSelectedVariant(null);

      const payload: GenerationRequest = {
        ...form,
        video_description: form.video_description || undefined,
        reference_thumbnail_url: form.reference_thumbnail_url || undefined,
      };

      try {
        const res = await apiPost<{ job_id: string }>(
          "/api/v1/thumbnails/generate",
          payload
        );
        setCurrentJobId(res.job_id);
      } catch (err) {
        setSubmitError(
          err instanceof Error ? err.message : "Failed to submit"
        );
      } finally {
        setSubmitting(false);
      }
    },
    [form]
  );

  // Regenerate
  const handleRegenerate = useCallback(async () => {
    if (!currentJobId) return;
    setRegenerating(true);
    setSubmitError(null);
    setSelectedVariant(null);
    try {
      const res = await apiPost<{ job_id: string }>(
        `/api/v1/thumbnails/regenerate/${currentJobId}`
      );
      setCurrentJobId(res.job_id);
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Failed to regenerate"
      );
    } finally {
      setRegenerating(false);
    }
  }, [currentJobId]);

  return (
    <div className="min-h-screen bg-zinc-950 font-sans text-zinc-100">
      {/* ── Animated gradient header ────────────────────────────────────── */}
      <header className="relative overflow-hidden border-b border-zinc-800 bg-zinc-900/80 backdrop-blur-sm">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_rgba(124,58,237,0.18)_0%,_transparent_60%)]"
        />
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight">
              <span className="bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">
                AI Thumbnail
              </span>{" "}
              Rendering Farm
            </h1>
            <p className="text-xs text-zinc-500">
              Leonardo AI · LIFO Priority Queue · Real-time SSE
            </p>
          </div>

          <div className="flex items-center gap-3">
            {live && (
              <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400 border border-emerald-500/20">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                Live
              </span>
            )}
            <button
              onClick={refreshHistory}
              disabled={historyLoading}
              className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-700 disabled:opacity-50 transition-colors"
            >
              {historyLoading ? "Refreshing…" : "Refresh History"}
            </button>
          </div>
        </div>
      </header>

      {/* ── Main layout ───────────────────────────────────────────────── */}
      <main className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-6 py-8 lg:grid-cols-7">

        {/* ── Left column: form + status ─────────────────────────────── */}
        <div className="space-y-5 lg:col-span-2">

          {/* Submission form */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 backdrop-blur-sm">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-zinc-400">
              Generate Thumbnails
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4" id="gen-form">
              <FormField label="Channel ID" id="channel_id" required>
                <input
                  type="text"
                  id="channel_id"
                  className={inputCls}
                  placeholder="UC…"
                  required
                  value={form.channel_id}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, channel_id: e.target.value }))
                  }
                />
              </FormField>

              <FormField label="Video Title" id="video_title" required>
                <input
                  type="text"
                  id="video_title"
                  className={inputCls}
                  placeholder="10x Your Python Speed"
                  required
                  value={form.video_title}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, video_title: e.target.value }))
                  }
                />
              </FormField>

              <FormField label="Description" id="video_description">
                <textarea
                  id="video_description"
                  rows={3}
                  className={inputCls}
                  placeholder="Optional — improves prompt quality"
                  value={form.video_description}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      video_description: e.target.value,
                    }))
                  }
                />
              </FormField>

              <FormField label="Reference Thumbnail URL" id="ref_url">
                <input
                  type="url"
                  id="ref_url"
                  className={inputCls}
                  placeholder="https://…"
                  value={form.reference_thumbnail_url}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      reference_thumbnail_url: e.target.value,
                    }))
                  }
                />
              </FormField>

              <FormField label="Variants" id="num_variants">
                <select
                  id="num_variants"
                  className={inputCls}
                  value={form.num_variants}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      num_variants: parseInt(e.target.value),
                    }))
                  }
                >
                  {[1, 2, 3, 4, 5].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </FormField>

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/20 transition-all hover:from-violet-500 hover:to-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg
                      className="h-4 w-4 animate-spin"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                    Submitting…
                  </span>
                ) : (
                  "⚡ Generate"
                )}
              </button>
            </form>
          </div>

          {/* Job status card */}
          {currentJobId && (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 backdrop-blur-sm">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
                  Current Job
                </h3>
                {status && <StatusBadge status={status.status} />}
              </div>
              <p className="mb-3 break-all font-mono text-xs text-zinc-600">
                {currentJobId}
              </p>

              {status && (
                <div className="space-y-3">
                  <ProgressBar
                    progress={status.progress}
                    status={status.status}
                  />
                  {status.message && (
                    <p className="text-xs text-zinc-400">{status.message}</p>
                  )}
                  {(isComplete || isFailed) && (
                    <button
                      onClick={handleRegenerate}
                      disabled={regenerating}
                      className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-800 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-700 disabled:opacity-50 transition-colors"
                    >
                      {regenerating ? "Queuing…" : "⟳ Regenerate (LIFO Priority)"}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Error alerts */}
          {(submitError ?? streamError) && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
              {submitError ?? streamError}
            </div>
          )}
        </div>

        {/* ── Center column: variant gallery / empty state ────────────── */}
        <div className="space-y-5 lg:col-span-3">
          {/* Loading state */}
          {isActive && !status?.variants && (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900/60 py-20 backdrop-blur-sm">
              <div className="h-14 w-14 animate-spin rounded-full border-2 border-zinc-700 border-t-violet-500" />
              <p className="mt-5 text-base font-medium text-zinc-300">
                Generating via Leonardo AI…
              </p>
              <p className="mt-1 text-sm text-zinc-500">
                ~30–90s · {status?.progress ?? 0}% complete
              </p>
            </div>
          )}

          {/* Failure state */}
          {isFailed && (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/5 py-16">
              <span className="text-4xl">❌</span>
              <h3 className="mt-4 text-base font-semibold text-red-400">
                Generation Failed
              </h3>
              <p className="mt-1 text-sm text-zinc-500">
                {status?.error ?? "Unknown error — check worker logs"}
              </p>
              <button
                onClick={handleRegenerate}
                className="mt-5 rounded-lg bg-red-500/20 border border-red-500/30 px-5 py-2 text-sm font-semibold text-red-300 hover:bg-red-500/30 transition-colors"
              >
                Try Again
              </button>
            </div>
          )}

          {/* Variant gallery */}
          {isComplete && status?.variants && (
            <div>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
                  Generated Variants
                </h2>
                <span className="text-xs text-zinc-600">
                  {status.variants.length} variant
                  {status.variants.length !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
                {status.variants.map((v) => (
                  <VariantCard
                    key={v.variant_id}
                    variant={v}
                    selected={selectedVariant === v.variant_id}
                    onSelect={() => setSelectedVariant(v.variant_id)}
                  />
                ))}
              </div>

              {selectedVariant && (
                <div className="mt-5 flex items-center justify-between rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3">
                  <p className="text-sm font-medium text-emerald-300">
                    {selectedVariant} selected
                  </p>
                  <button
                    onClick={async () => {
                      const v = status.variants?.find(
                        (x) => x.variant_id === selectedVariant
                      );
                      if (!v) return;
                      try {
                        const res = await fetch(v.image_url);
                        const blob = await res.blob();
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = `${v.variant_id}.png`;
                        a.click();
                        URL.revokeObjectURL(url);
                      } catch {
                        window.open(v.image_url, "_blank");
                      }
                    }}
                    className="rounded-lg bg-emerald-500/20 border border-emerald-500/30 px-4 py-1.5 text-sm font-semibold text-emerald-300 hover:bg-emerald-500/30 transition-colors"
                  >
                    ↓ Download PNG
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Empty state */}
          {!currentJobId && (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900/40 py-20 text-center backdrop-blur-sm">
              <span className="text-5xl">🎨</span>
              <h3 className="mt-4 text-base font-semibold text-zinc-300">
                Ready to generate
              </h3>
              <p className="mt-1 max-w-xs text-sm text-zinc-500">
                Fill in the form and click Generate. Results stream back
                live via Server-Sent Events.
              </p>
            </div>
          )}
        </div>

        {/* ── Right column: job history ───────────────────────────────── */}
        <div className="lg:col-span-2">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 backdrop-blur-sm">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-zinc-400">
              Job History
            </h2>

            {historyLoading && history.length === 0 && (
              <div className="flex justify-center py-8">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-700 border-t-violet-500" />
              </div>
            )}

            {!historyLoading && history.length === 0 && (
              <p className="py-6 text-center text-xs text-zinc-600">
                No jobs yet
              </p>
            )}

            <ul className="space-y-2">
              {history.map((j) => (
                <li
                  key={j.job_id}
                  onClick={() => {
                    setCurrentJobId(j.job_id);
                    setSelectedVariant(null);
                  }}
                  className={`cursor-pointer rounded-lg border p-3 transition-all hover:border-zinc-600 ${currentJobId === j.job_id
                      ? "border-violet-500/40 bg-violet-500/10"
                      : "border-zinc-800 bg-zinc-800/40 hover:bg-zinc-800/70"
                    }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="flex-1 truncate text-xs font-medium text-zinc-200">
                      {j.video_title}
                    </p>
                    <StatusBadge status={j.status} />
                  </div>
                  <p className="mt-1 font-mono text-xs text-zinc-600">
                    {j.job_id.slice(0, 8)}…
                  </p>
                  <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-zinc-700">
                    <div
                      className={`h-full rounded-full transition-all ${j.status === "completed"
                          ? "bg-emerald-500"
                          : j.status === "failed"
                            ? "bg-red-500"
                            : "bg-violet-500"
                        }`}
                      style={{ width: `${j.progress}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
}
