"use client";

import { useEffect, useState } from "react";
import { Download, CheckCircle, X } from "lucide-react";
import { getLoadProgress, isLoaded, isLoading, onLoadProgress, ensureEngine } from "@/services/browser-ai";

type Props = {
  open: boolean;
  onClose: () => void;
  onReady: () => void; // 模型就绪后回调
};

export function ModelDownloadModal({ open, onClose, onReady }: Props) {
  const [progress, setProgress] = useState(0);
  const [ready, setReady] = useState(false);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (isLoaded()) { setReady(true); onReady(); return; }
    onLoadProgress(setProgress);
  }, [onReady]);

  useEffect(() => {
    if (!open || started) return;
    setStarted(true);
    setProgress(getLoadProgress());

    if (!isLoading() && !isLoaded()) {
      ensureEngine()
        .then(() => { setProgress(1); setReady(true); onReady(); })
        .catch(() => {});
    }
  }, [open, started, onReady]);

  if (!open) return null;

  const pct = Math.round(progress * 100);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            {ready ? (
              <CheckCircle size={22} className="text-[var(--accent)]" />
            ) : progress > 0 ? (
              <div className="relative">
                <svg className="h-6 w-6 -rotate-90" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="14" fill="none" stroke="#eee" strokeWidth="3" />
                  <circle cx="18" cy="18" r="14" fill="none" stroke="var(--accent)" strokeWidth="3"
                    strokeDasharray={`${pct * 0.88} 88`} strokeLinecap="round" />
                </svg>
              </div>
            ) : (
              <Download size={22} className="text-[var(--muted)]" />
            )}
            <div>
              <p className="text-sm font-semibold text-[var(--fg)]">
                {ready ? "AI 模型就绪！" : progress > 0 ? "正在下载 AI 模型…" : "需要下载 AI 模型"}
              </p>
              <p className="text-xs text-[var(--accent-dim)] mt-0.5">
                {ready ? "即将开始处理…" : progress > 0 ? `${pct}% · 从免费 CDN 下载` : "首次使用需要下载 ~1.5GB"}
              </p>
            </div>
          </div>
          {ready && (
            <button onClick={onClose} className="rounded-full p-1 hover:bg-black/5">
              <X size={18} />
            </button>
          )}
        </div>

        {!ready && (
          <div className="h-2 w-full overflow-hidden rounded-full bg-black/5">
            <div
              className="h-full rounded-full bg-[var(--accent)] transition-all duration-500"
              style={{ width: `${Math.max(pct, 2)}%` }}
            />
          </div>
        )}

        <p className="mt-3 text-xs text-[var(--accent-dim)] text-center">
          {ready ? "模型已缓存，之后无需重新下载" : "模型缓存在浏览器中，之后可离线使用"}
        </p>

        {!ready && (
          <button
            onClick={onClose}
            className="mt-3 w-full rounded-lg py-2 text-xs text-[var(--muted)] hover:bg-black/5 transition-colors"
          >
            跳过，使用快速引擎
          </button>
        )}
      </div>
    </div>
  );
}
