import { site } from "@/lib/site";

export function Footer() {
  return (
    <footer className="border-t border-black/10 bg-white/35">
      <div className="container py-6 text-center text-sm text-[#6a7168]">
        {site.name} · AI 内容创作工具平台
      </div>
    </footer>
  );
}
