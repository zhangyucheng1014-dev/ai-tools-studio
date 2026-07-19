"use client";

import { useState } from "react";
import { tools } from "@/config/tools";
import { ToolCard } from "@/components/tools/tool-card";
import { SetupWizard } from "@/components/setup/setup-wizard";
import { site } from "@/lib/site";
import { Wrench } from "lucide-react";
import { Button } from "@/components/ui/base";

export default function HomePage() {
  const [showSetup, setShowSetup] = useState(false);

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
          <div className="mt-6">
            <Button onClick={() => setShowSetup(!showSetup)} variant={showSetup ? "primary" : "secondary"}>
              <Wrench size={14} />
              {showSetup ? "收起设置" : "检测 & 安装外部引擎"}
            </Button>
          </div>
        </section>

        {showSetup && (
          <section className="mb-10">
            <SetupWizard onComplete={() => setShowSetup(false)} />
          </section>
        )}

        <section>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {tools.map(tool => (
              <ToolCard key={tool.slug} tool={tool} />
            ))}
          </div>
        </section>

        <p className="mt-12 text-center text-xs text-[var(--accent-dim)]">
          AI 模型本地运行 · 完全离线 · 无需联网
        </p>
      </div>
    </main>
  );
}
