"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Clock,
  Eye,
  Copy,
  Check,
  Download,
  AlertTriangle,
  FileText,
  Plus,
  Flame,
  ShieldAlert,
  Hash,
  WrapText,
} from "lucide-react";

interface PasteData {
  id: string;
  content: string;
  createdAt: string;
  expiresAt: string | null;
  maxViews: number | null;
  currentViews: number;
  remainingViews: number | null;
}

interface ApiError {
  error: string;
  reason?: string;
  expiresAt?: string;
  maxViews?: number;
  currentViews?: number;
}

export function PasteLoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse" aria-busy="true" aria-live="polite">
      <div className="flex items-center gap-2.5 text-xs text-slate-400 font-mono">
        <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
        <span>Loading paste...</span>
      </div>
      <div className="h-16 bg-[#141b27] rounded-xl w-full border border-[#212836]" />
      <div className="h-72 bg-[#0e131d] border border-[#212836] rounded-xl" />
    </div>
  );
}

export function PasteViewer({ id }: { id: string }) {
  const [paste, setPaste] = useState<PasteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState<ApiError | null>(null);
  const [copied, setCopied] = useState(false);
  const [wrapLines, setWrapLines] = useState(true);
  const [showLineNumbers, setShowLineNumbers] = useState(true);

  useEffect(() => {
    if (!id) return;

    let isMounted = true;

    async function fetchPaste() {
      setLoading(true);
      try {
        const res = await fetch(`/api/pastes/${id}`, {
          method: "GET",
          cache: "no-store",
        });

        const data = await res.json();

        if (!isMounted) return;

        if (!res.ok) {
          setApiError({
            error: data.error || "Unable to fetch paste",
            reason: data.reason,
            expiresAt: data.expiresAt,
            maxViews: data.maxViews,
            currentViews: data.currentViews,
          });
        } else {
          setPaste(data);
        }
      } catch (err: unknown) {
        if (!isMounted) return;
        setApiError({
          error: err instanceof Error ? err.message : "Failed to connect to server",
        });
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchPaste();

    return () => {
      isMounted = false;
    };
  }, [id]);

  const handleCopy = async () => {
    if (!paste?.content) return;
    try {
      await navigator.clipboard.writeText(paste.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const handleDownload = () => {
    if (!paste?.content) return;
    const blob = new Blob([paste.content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `paste-${paste.id}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Format expiration remaining time
  const getExpirationBadge = (expiresAt: string | null) => {
    if (!expiresAt) {
      return { text: "Permanent (No Expiry)", color: "text-slate-400 border-[#232d40]" };
    }

    const diff = new Date(expiresAt).getTime() - Date.now();
    if (diff <= 0) {
      return { text: "Expired", color: "text-rose-400 border-rose-500/30 bg-rose-500/10" };
    }

    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    let relativeStr = "";
    if (days > 0) relativeStr = `${days}d ${hours % 24}h left`;
    else if (hours > 0) relativeStr = `${hours}h ${minutes % 60}m left`;
    else relativeStr = `${minutes}m left`;

    return {
      text: `Expires in ${relativeStr}`,
      color: "text-amber-300 border-amber-500/30 bg-amber-500/10",
    };
  };

  if (loading) {
    return <PasteLoadingSkeleton />;
  }

  // Error / Expired / 404 / 410 View
  if (apiError) {
    const isBurned = apiError.reason === "max_views_reached";
    const isTimeExpired = apiError.reason === "expired_by_time";

    return (
      <div className="max-w-2xl mx-auto py-12 px-4 text-center space-y-6">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 shadow-xl">
          {isBurned ? (
            <Flame className="w-8 h-8 text-amber-400" />
          ) : isTimeExpired ? (
            <Clock className="w-8 h-8 text-rose-400" />
          ) : (
            <AlertTriangle className="w-8 h-8 text-rose-400" />
          )}
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-white">
            {isBurned
              ? "Paste Expired (View Limit Reached)"
              : isTimeExpired
              ? "Paste Expired"
              : "Paste Not Found"}
          </h1>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            {isBurned
              ? "This paste reached its maximum view limit and has expired."
              : isTimeExpired
              ? "This paste has expired and is no longer accessible."
              : apiError.error || "The requested paste is no longer accessible."}
          </p>
        </div>

        <div className="p-4 rounded-xl border border-[#212836] bg-[#0e131d] text-left text-xs font-mono space-y-2 max-w-md mx-auto">
          <div className="flex justify-between text-slate-400">
            <span>Paste ID:</span>
            <span className="text-slate-200">{id}</span>
          </div>
          <div className="flex justify-between text-slate-400">
            <span>Status:</span>
            <span className="text-rose-400 font-semibold">410 Gone / 404 Inactive</span>
          </div>
          {apiError.reason && (
            <div className="flex justify-between text-slate-400">
              <span>Reason:</span>
              <span className="text-amber-400">{apiError.reason}</span>
            </div>
          )}
        </div>

        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-md transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Create a New Paste</span>
          </Link>
        </div>
      </div>
    );
  }

  if (!paste) return null;

  const lines = paste.content.split("\n");
  const expiryBadge = getExpirationBadge(paste.expiresAt);

  return (
    <div className="space-y-6">
      {/* Paste Meta Header */}
      <div className="rounded-xl border border-[#212836] bg-[#0e131d] p-5 shadow-lg space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-base font-mono font-bold text-white flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-emerald-400" />
                p/{paste.id}
              </span>

              <span className={`px-2 py-0.5 rounded text-[11px] font-mono border ${expiryBadge.color}`}>
                {expiryBadge.text}
              </span>

              {paste.maxViews && paste.remainingViews === 0 && (
                <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-center gap-1">
                  <Flame className="w-3 h-3 text-rose-400" />
                  Burned (Last view used)
                </span>
              )}
            </div>

            <div className="flex items-center gap-4 text-xs text-slate-400 flex-wrap">
              <span>
                Created on {new Date(paste.createdAt).toLocaleString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>

              <span>•</span>

              <span className="flex items-center gap-1 font-mono text-slate-300">
                <Eye className="w-3.5 h-3.5 text-emerald-400" />
                {paste.currentViews}{" "}
                {paste.maxViews ? `/ ${paste.maxViews} views` : "views"}
                {paste.remainingViews !== null && ` (${paste.remainingViews} remaining)`}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setWrapLines(!wrapLines)}
              title="Toggle line wrapping"
              className={`p-2 rounded-lg border text-xs font-medium transition-colors ${
                wrapLines
                  ? "bg-[#18202e] border-emerald-500/40 text-emerald-300"
                  : "bg-[#121824] border-[#222b3d] text-slate-400 hover:text-slate-200"
              }`}
            >
              <WrapText className="w-4 h-4" />
            </button>

            <button
              onClick={() => setShowLineNumbers(!showLineNumbers)}
              title="Toggle line numbers"
              className={`p-2 rounded-lg border text-xs font-medium transition-colors ${
                showLineNumbers
                  ? "bg-[#18202e] border-emerald-500/40 text-emerald-300"
                  : "bg-[#121824] border-[#222b3d] text-slate-400 hover:text-slate-200"
              }`}
            >
              <Hash className="w-4 h-4" />
            </button>

            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-[#141b29] hover:bg-[#1d263a] text-slate-200 border border-[#2b354a] transition-all active:scale-95"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Raw</span>
                </>
              )}
            </button>

            <button
              onClick={handleDownload}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-[#141b29] hover:bg-[#1d263a] text-slate-200 border border-[#2b354a] transition-all active:scale-95"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download</span>
            </button>

            <Link
              href="/"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Burn-after-reading alert if this is the final view */}
      {paste.maxViews && paste.remainingViews === 0 && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-950/20 p-3.5 text-xs text-amber-200 flex items-center gap-2.5">
          <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            <strong>Burn after reading:</strong> You have viewed the final permitted view of this paste. Reloading or navigating away will permanently render this link expired.
          </span>
        </div>
      )}

      {/* Code Display Container with Gist styling */}
      <div className="rounded-xl border border-[#212836] bg-[#0d121c] shadow-xl overflow-hidden font-mono text-xs">
        {/* Editor Top Bar */}
        <div className="bg-[#121824] px-4 py-2 border-b border-[#212836] flex items-center justify-between text-slate-400">
          <span className="text-[11px] font-medium text-slate-300">
            {lines.length} {lines.length === 1 ? "line" : "lines"} ({paste.content.length.toLocaleString()} bytes)
          </span>
          <span className="text-[11px] text-slate-400">UTF-8 Plain Text</span>
        </div>

        {/* Content Box with Line Numbers */}
        <div className="overflow-x-auto flex text-slate-200 selection:bg-emerald-500/30 leading-relaxed">
          {showLineNumbers && (
            <div className="select-none bg-[#090d14] text-slate-600 px-3 py-4 text-right border-r border-[#1a2232] font-mono shrink-0">
              {lines.map((_, index) => (
                <div key={index} className="h-5 leading-5">
                  {index + 1}
                </div>
              ))}
            </div>
          )}

          <div
            className={`p-4 flex-1 ${
              wrapLines ? "whitespace-pre-wrap break-all" : "whitespace-pre"
            }`}
          >
            {lines.map((line, idx) => (
              <div key={idx} className="h-5 leading-5">
                {line || "\u00A0"}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
