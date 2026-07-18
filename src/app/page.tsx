import { tools } from "@/config/tools";
import { ToolCard } from "@/components/tools/tool-card";
import { site } from "@/lib/site";

export default function HomePage() {
  return (
    <main className="py-12 md:py-16">
      <div className="container">
        <section className="mb-14 text-center">
          <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
            {site.name}
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-[var(--muted)]">
            {site.description}
          </p>
        </section>

        <section>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {tools.map(tool => (
              <ToolCard key={tool.slug} tool={tool} />
            ))}
          </div>
        </section>

        <p className="mt-12 text-center text-xs text-[var(--accent-dim)]">
          AI 模型在浏览器端运行 · 首次使用自动下载 · 之后永久离线可用
        </p>
      </div>
    </main>
  );
}
