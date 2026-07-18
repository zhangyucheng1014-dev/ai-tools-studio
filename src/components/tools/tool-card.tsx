"use client";

import Link from "next/link";
import {
  ArrowRight, Bot, Captions, CloudUpload, Download, Film, Mic, Pen, Sparkles
} from "lucide-react";
import type { Tool } from "@/config/types";
import { Card } from "@/components/ui/base";

const iconMap: Record<string, React.ComponentType<{ size?: number }>> = {
  download: Download, pen: Pen, bot: Bot, mic: Mic,
  captions: Captions, film: Film, sparkles: Sparkles,
  "cloud-upload": CloudUpload
};

export function ToolCard({ tool }: { tool: Tool }) {
  const Icon = iconMap[tool.icon] ?? Sparkles;

  return (
    <Link href={`/tools/${tool.slug}`} className="group block">
      <Card className="h-full transition duration-300 hover:-translate-y-1 hover:border-[#0f8b6f]/30 hover:shadow-xl">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#121512] text-white">
          <Icon size={20} />
        </span>
        <h3 className="mt-4 text-lg font-semibold">{tool.name}</h3>
        <p className="mt-2 text-sm leading-6 text-[#5b655d]">{tool.tagline}</p>
        <div className="mt-5 flex items-center gap-2 text-sm font-medium text-[#0f8b6f]">
          打开工具 <ArrowRight size={14} className="transition group-hover:translate-x-1" />
        </div>
      </Card>
    </Link>
  );
}
