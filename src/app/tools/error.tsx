"use client";

import { Button } from "@/components/ui/base";

export default function ToolsError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <main className="py-20">
      <div className="container text-center">
        <h1 className="text-xl font-semibold">工具列表加载失败</h1>
        <p className="mt-2 text-[var(--muted)]">{error.message}</p>
        <Button className="mt-5" onClick={reset}>重试</Button>
      </div>
    </main>
  );
}
