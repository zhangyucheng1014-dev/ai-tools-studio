"use client";

import { useEffect, useState } from "react";
import { LoaderCircle, Download, CheckCircle, X } from "lucide-react";
import { getLoadProgress, isLoaded, onLoadProgress, preloadModel } from "@/services/browser-ai";

export function ModelLoader() {
  const [progress, setProgress] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setLoaded(isLoaded());
    onLoadProgress((p) => {
      setProgress(p);
      if (p >= 1) {
        setLoaded(true);
        // 3秒后自动消失
        setTimeout(() => setDismissed(true), 3000);
      }
    });
    preloadModel();
  }, []);

  // 加载中显示
  if (!loaded && progress > 0 && !dismissed) {
    return (
      <div className="fixed bottom-4 right-4 z-50 rounded-2xl glass p-4 shadow-xl max-w-xs">
        <div className="flex items-start gap-3">
          <LoaderCircle size={18} className="mt-0.5 animate-spin text-[var(--accent)]" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-[var(--fg)]">正在加载 AI 模型…</p>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-black/10">
              <div className="h-full rounded-full bg-[var(--accent)] transition-all duration-300"
                style={{ width: `${Math.round(progress * 100)}%` }} />
            </div>
            <p className="mt-1 text-xs text-[var(--accent-dim)]">
              从 CDN 下载中（免费）· {Math.round(progress * 100)}%
            </p>
          </div>
        </div>
      </div>
    );
  }

  // 加载完成 3 秒内显示绿色对勾
  if (loaded && !dismissed) {
    return (
      <div className="fixed bottom-4 right-4 z-50 rounded-2xl glass p-4 shadow-xl max-w-xs">
        <div className="flex items-start gap-3">
          <CheckCircle size={18} className="mt-0.5 text-[var(--accent)]" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-[var(--fg)]">AI 模型就绪</p>
            <p className="mt-1 text-xs text-[var(--accent-dim)]">所有 AI 功能可用 · 之后离线使用</p>
          </div>
          <button onClick={() => setDismissed(true)} className="rounded-full p-1 hover:bg-black/5">
            <X size={14} />
          </button>
        </div>
      </div>
    );
  }

  return null;
}
