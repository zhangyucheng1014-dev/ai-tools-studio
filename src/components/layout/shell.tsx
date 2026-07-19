import { site } from "@/lib/site";

export function Footer() {
  return (
    <footer className="border-t border-black/10 bg-white/35">
      <div className="container py-4 text-center text-xs text-[#6a7168]">
        {site.name} 桌面版 v2.0 · 全离线 · AI 模型本地运行
      </div>
    </footer>
  );
}
