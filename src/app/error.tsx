"use client";

import { Button } from "@/components/ui/base";

export default function ErrorPage({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <main className="py-20">
      <div className="container text-center">
        <h1 className="text-2xl font-semibold">页面出错了</h1>
        <p className="mt-3 text-[var(--muted)]">{error.message || "未知错误"}</p>
        <Button className="mt-6" onClick={reset}>重试</Button>
      </div>
    </main>
  );
}
