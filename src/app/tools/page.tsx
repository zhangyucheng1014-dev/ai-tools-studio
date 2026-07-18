import { tools } from "@/config/tools";
import { ToolCard } from "@/components/tools/tool-card";

export const metadata = { title: "工具中心" };

export default function ToolsPage() {
  return (
    <main className="py-12 md:py-16">
      <div className="container">
        <h1 className="mb-8 text-3xl font-semibold">工具中心</h1>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tools.map(tool => (
            <ToolCard key={tool.slug} tool={tool} />
          ))}
        </div>
      </div>
    </main>
  );
}
