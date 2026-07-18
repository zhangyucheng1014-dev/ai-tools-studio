"use client";

import { Button } from "@/components/ui/base";

export default function ToolError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <main className="py-20">
      <div className="container text-center">
        <h1 className="text-xl font-semibold">工具加载失败</h1>
        <p className="mt-2 text-[var(--muted)]">{error.message}</p>
        <Button className="mt-5" onClick={reset}>重新加载</Button>
      </div>
    </main>
  );
}
