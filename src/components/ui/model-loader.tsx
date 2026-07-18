"use client";

import { useEffect, useState } from "react";
import { LoaderCircle, Download, CheckCircle } from "lucide-react";
import { getLoadProgress, isLoaded, onLoadProgress, preloadModel } from "@/services/browser-ai";

export function ModelLoader() {
  const [progress, setProgress] = useState(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setLoaded(isLoaded());

    onLoadProgress((p) => {
      setProgress(p);
      if (p >= 1) setLoaded(true);
    });

    // 预加载模型
    preloadModel();
  }, []);

  if (loaded) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 rounded-2xl glass p-4 shadow-xl max-w-xs">
      <div className="flex items-start gap-3">
        {progress >= 1 ? (
          <CheckCircle size={18} className="mt-0.5 text-[var(--accent)]" />
        ) : progress > 0 ? (
          <LoaderCircle size={18} className="mt-0.5 animate-spin text-[var(--accent)]" />
        ) : (
          <Download size={18} className="mt-0.5 text-[var(--muted)]" />
        )}
        <div className="min-w-0">
          <p className="text-sm font-medium text-[var(--fg)]">
            {progress >= 1
              ? "AI 模型就绪"
              : progress > 0
                ? "正在加载 AI 模型…"
                : "准备加载 AI 模型"}
          </p>
          {progress > 0 && progress < 1 && (
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-black/10">
              <div
                className="h-full rounded-full bg-[var(--accent)] transition-all duration-300"
                style={{ width: `${Math.round(progress * 100)}%` }}
              />
            </div>
          )}
          <p className="mt-1 text-xs text-[var(--accent-dim)]">
            {progress >= 1
              ? "所有 AI 功能可用"
              : progress > 0
                ? `从 CDN 下载中 (免费) · ${Math.round(progress * 100)}%`
                : "首次使用需要下载模型 (~1.5GB, 仅一次)"}
          </p>
        </div>
      </div>
    </div>
  );
}
