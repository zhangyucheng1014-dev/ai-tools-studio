import { notFound } from "next/navigation";
import { getTool } from "@/config/tools";
import { ToolRunner } from "@/components/tools/tool-runner";
import { Card, Badge } from "@/components/ui/base";
import {
  Bot, Captions, CloudUpload, Download, Film, Mic, Pen, Sparkles
} from "lucide-react";

const iconMap: Record<string, React.ComponentType<{ size?: number }>> = {
  download: Download, pen: Pen, bot: Bot, mic: Mic,
  captions: Captions, film: Film, sparkles: Sparkles,
  "cloud-upload": CloudUpload
};

export async function generateStaticParams() {
  const { tools } = await import("@/config/tools");
  return tools.map(t => ({ slug: t.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tool = getTool(slug);
  return { title: tool?.name ?? "工具详情" };
}

export default async function ToolPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tool = getTool(slug);
  if (!tool) notFound();

  const Icon = iconMap[tool.icon] ?? Sparkles;

  return (
    <main className="py-10 md:py-16">
      <div className="container">
        {/* Header */}
        <div className="mb-8 grid gap-6 lg:grid-cols-[1fr_0.6fr]">
          <div>
            <Badge>{tool.provider}</Badge>
            <div className="mt-4 flex items-center gap-4">
              <span className="flex h-14 w-14 items-center justify-center rounded-lg bg-[#121512] text-white">
                <Icon size={26} />
              </span>
              <div>
                <h1 className="text-3xl font-semibold">{tool.name}</h1>
                <p className="mt-1 text-[var(--muted)]">{tool.tagline}</p>
              </div>
            </div>
            <p className="mt-4 max-w-2xl leading-7 text-[var(--muted)]">{tool.description}</p>
          </div>

          <Card>
            <h2 className="text-lg font-semibold">使用说明</h2>
            <ol className="mt-3 grid gap-2 text-sm text-[var(--muted)]">
              {tool.instructions.map((item, i) => (
                <li key={item} className="flex gap-2">
                  <span className="font-semibold text-[var(--accent)]">{i + 1}.</span>
                  <span>{item}</span>
                </li>
              ))}
            </ol>
          </Card>
        </div>

        {/* Runner */}
        <ToolRunner tool={{ slug: tool.slug, name: tool.name, inputs: tool.inputs, fileBased: tool.fileBased }} />
      </div>
    </main>
  );
}
