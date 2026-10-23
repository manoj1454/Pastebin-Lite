"use client";

import { useState, useTransition, useId } from "react";
import Link from "next/link";
import {
  Clock,
  Eye,
  Copy,
  Check,
  ExternalLink,
  RotateCcw,
  Sparkles,
  AlertCircle,
  FileText,
  Flame,
  ShieldAlert,
} from "lucide-react";

const EXPIRATION_OPTIONS = [
  { label: "Never", value: "never" },
  { label: "10 Minutes", value: "10m" },
  { label: "1 Hour", value: "1h" },
  { label: "1 Day", value: "1d" },
  { label: "7 Days", value: "7d" },
  { label: "Custom", value: "custom" },
];

const VIEW_OPTIONS = [
  { label: "Unlimited", value: "unlimited" },
  { label: "1 View (Burn)", value: "1" },
  { label: "5 Views", value: "5" },
  { label: "10 Views", value: "10" },
  { label: "100 Views", value: "100" },
  { label: "Custom", value: "custom" },
];

interface CreatedPasteResult {
  id: string;
  url: string;
  expiresAt: string | null;
  maxViews: number | null;
  createdAt: string;
}

export default function HomePage() {
  const [content, setContent] = useState("");
  const [expirationPreset, setExpirationPreset] = useState("never");
  const [customExpiresAt, setCustomExpiresAt] = useState("");
  const [viewPreset, setViewPreset] = useState("unlimited");
  const [customMaxViews, setCustomMaxViews] = useState("");

  const [createdPaste, setCreatedPaste] = useState<CreatedPasteResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const customDateInputId = useId();
  const customViewsInputId = useId();

  // Helper to compute expiration ISO date
  const computeExpirationDate = (): string | null => {
    if (expirationPreset === "never") return null;
    if (expirationPreset === "custom") {
      return customExpiresAt ? new Date(customExpiresAt).toISOString() : null;
    }

    const now = new Date();
    switch (expirationPreset) {
      case "10m":
        return new Date(now.getTime() + 10 * 60 * 1000).toISOString();
      case "1h":
        return new Date(now.getTime() + 60 * 60 * 1000).toISOString();
      case "1d":
        return new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
      case "7d":
        return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
      default:
        return null;
    }
  };

  // Helper to compute max views
  const computeMaxViews = (): number | null => {
    if (viewPreset === "unlimited") return null;
    if (viewPreset === "custom") {
      const parsed = parseInt(customMaxViews, 10);
      return isNaN(parsed) || parsed < 1 ? null : parsed;
    }
    const parsed = parseInt(viewPreset, 10);
    return isNaN(parsed) ? null : parsed;
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);

    const trimmedContent = content.trim();
    if (!trimmedContent) {
      setError("Please enter some text or code before creating a paste.");
      return;
    }

    const computedExpiresAt = computeExpirationDate();
    const computedMaxViews = computeMaxViews();

    if (expirationPreset === "custom" && !computedExpiresAt) {
      setError("Please select a valid future custom expiration date.");
      return;
    }

    if (viewPreset === "custom" && (!computedMaxViews || computedMaxViews < 1)) {
      setError("Please enter a valid positive number of max views.");
      return;
    }

    startTransition(async () => {
      try {
        const response = await fetch("/api/pastes", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            content: trimmedContent,
            expiresAt: computedExpiresAt,
            maxViews: computedMaxViews,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to create paste");
        }

        setCreatedPaste(data);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "An unexpected error occurred";
        setError(msg);
      }
    });
  };

  const handleCopyLink = async () => {
    if (!createdPaste?.url) return;
    try {
      await navigator.clipboard.writeText(createdPaste.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
      setCopied(false);
    }
  };

  const handleReset = () => {
    setContent("");
    setCreatedPaste(null);
    setError(null);
    setCopied(false);
  };

  const lineCount = content ? content.split("\n").length : 1;
  const charCount = content.length;

  return (
    <div className="space-y-6">
      {/* Intro Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#212836]">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-400" />
            New Paste
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Instantly paste notes, snippets, or config files with optional expiration and view limits.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
          <span className="px-2 py-1 rounded bg-[#161c28] border border-[#232b3b]">
            {lineCount} {lineCount === 1 ? "line" : "lines"}
          </span>
          <span className="px-2 py-1 rounded bg-[#161c28] border border-[#232b3b]">
            {charCount.toLocaleString()} chars
          </span>
        </div>
      </div>

      {/* Success Modal / Banner when Paste is created */}
      {createdPaste && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-5 space-y-4 shadow-xl backdrop-blur">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-emerald-300">
                  Paste Created Successfully!
                </h3>
                <p className="text-xs text-slate-400">
                  Your paste is live and shareable via the link below.
                </p>
              </div>
            </div>

            <button
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-[#161c28] hover:bg-[#1f2737] text-slate-300 border border-[#2b3548] transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Create Another</span>
            </button>
          </div>

          {/* Share Link Input with Copy */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                readOnly
                value={createdPaste.url}
                className="w-full bg-[#0d121c] border border-emerald-500/40 rounded-lg px-3.5 py-2.5 text-xs font-mono text-emerald-200 selection:bg-emerald-500/30 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyLink}
                aria-label="Copy to Clipboard"
                title="Copy to Clipboard"
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-medium rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow transition-all active:scale-95 cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-200" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy to Clipboard</span>
                  </>
                )}
              </button>

              <Link
                href={`/p/${createdPaste.id}`}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-medium rounded-lg bg-[#1a2130] hover:bg-[#232c40] text-slate-200 border border-[#2e394f] transition-colors"
              >
                <span>View Paste</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Metadata Badges */}
          <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] font-mono text-slate-400">
            <span className="px-2 py-0.5 rounded bg-[#101724] border border-[#232d40] flex items-center gap-1">
              <Clock className="w-3 h-3 text-slate-400" />
              {createdPaste.expiresAt
                ? `Expires: ${new Date(createdPaste.expiresAt).toLocaleString()}`
                : "Never Expires"}
            </span>

            <span className="px-2 py-0.5 rounded bg-[#101724] border border-[#232d40] flex items-center gap-1">
              <Eye className="w-3 h-3 text-slate-400" />
              {createdPaste.maxViews
                ? `Max Views: ${createdPaste.maxViews}`
                : "Unlimited Views"}
            </span>

            {createdPaste.maxViews === 1 && (
              <span className="px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300 flex items-center gap-1">
                <Flame className="w-3 h-3" />
                Burn after reading
              </span>
            )}
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="rounded-lg border border-rose-500/30 bg-rose-950/20 p-4 text-xs text-rose-300 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold">Error</p>
            <p className="text-slate-300">{error}</p>
          </div>
        </div>
      )}

      {/* Main Creation Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Editor Container - Gist / Pastebin Lite Style */}
        <div className="rounded-xl border border-[#212836] bg-[#0e131d] shadow-lg overflow-hidden focus-within:border-emerald-500/50 transition-colors">
          <div className="bg-[#121824] px-4 py-2 border-b border-[#212836] flex items-center justify-between text-xs text-slate-400">
            <span className="font-mono text-[11px] text-slate-300 font-medium">
              paste_content.txt
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setContent("")}
                disabled={!content}
                className="px-2 py-0.5 rounded text-[11px] text-slate-400 hover:text-slate-200 disabled:opacity-30 disabled:hover:text-slate-400 disabled:cursor-not-allowed transition-colors"
                title="Clear content"
              >
                Clear
              </button>
            </div>
          </div>

          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                e.preventDefault();
                handleSubmit();
              }
            }}
            placeholder="Paste or write your text or code here... (Ctrl+Enter or Cmd+Enter to create)"
            rows={16}
            required
            className="w-full bg-[#0d121c] p-4 font-mono text-sm text-[#e6edf3] placeholder:text-slate-600 focus:outline-none resize-y selection:bg-emerald-500/30 leading-relaxed"
          />
        </div>

        {/* Options Toolbar: Expiration & Max Views */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Expiration Settings */}
          <div className="rounded-xl border border-[#212836] bg-[#0e131d] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-emerald-400" />
                Expiration Time
              </label>
              <span className="text-[11px] text-slate-400 font-mono">
                {expirationPreset === "never" ? "Permanent" : "Auto-destruct"}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-1.5">
              {EXPIRATION_OPTIONS.map((opt) => (
                <button
                  type="button"
                  key={opt.value}
                  onClick={() => setExpirationPreset(opt.value)}
                  className={`px-2.5 py-1.5 text-xs font-medium rounded-md border text-center transition-all ${
                    expirationPreset === opt.value
                      ? "bg-emerald-500/15 border-emerald-500/50 text-emerald-300 shadow-sm"
                      : "bg-[#131926] border-[#222b3d] text-slate-400 hover:bg-[#1a2333] hover:text-slate-200"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {expirationPreset === "custom" && (
              <div className="pt-2">
                <label
                  htmlFor={customDateInputId}
                  className="block text-[11px] text-slate-400 mb-1"
                >
                  Custom Expiration (Future Date & Time):
                </label>
                <input
                  id={customDateInputId}
                  type="datetime-local"
                  value={customExpiresAt}
                  onChange={(e) => setCustomExpiresAt(e.target.value)}
                  className="w-full bg-[#0d121c] border border-[#232d40] rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:border-emerald-500 focus:outline-none"
                />
              </div>
            )}
          </div>

          {/* Max Views Settings */}
          <div className="rounded-xl border border-[#212836] bg-[#0e131d] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-emerald-400" />
                Max Views (Burn-after-reading)
              </label>
              <span className="text-[11px] text-slate-400 font-mono">
                {viewPreset === "1" ? "🔥 1-time read" : "View Limit"}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-1.5">
              {VIEW_OPTIONS.map((opt) => (
                <button
                  type="button"
                  key={opt.value}
                  onClick={() => setViewPreset(opt.value)}
                  className={`px-2.5 py-1.5 text-xs font-medium rounded-md border text-center transition-all ${
                    viewPreset === opt.value
                      ? "bg-emerald-500/15 border-emerald-500/50 text-emerald-300 shadow-sm"
                      : "bg-[#131926] border-[#222b3d] text-slate-400 hover:bg-[#1a2333] hover:text-slate-200"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {viewPreset === "custom" && (
              <div className="pt-2">
                <label
                  htmlFor={customViewsInputId}
                  className="block text-[11px] text-slate-400 mb-1"
                >
                  Max Allowed Views:
                </label>
                <input
                  id={customViewsInputId}
                  type="number"
                  min={1}
                  step={1}
                  placeholder="e.g. 25"
                  value={customMaxViews}
                  onChange={(e) => setCustomMaxViews(e.target.value)}
                  className="w-full bg-[#0d121c] border border-[#232d40] rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:border-emerald-500 focus:outline-none"
                />
              </div>
            )}
          </div>
        </div>

        {/* Action Button & Help */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <ShieldAlert className="w-3.5 h-3.5 text-emerald-400" />
            <span>
              Pastes become inaccessible automatically once expired or view limit is reached.
            </span>
          </div>

          <button
            type="submit"
            disabled={isPending || !content.trim()}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white shadow-md transition-all active:scale-95 cursor-pointer disabled:cursor-not-allowed"
          >
            {isPending ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Creating Paste...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Create Paste</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
