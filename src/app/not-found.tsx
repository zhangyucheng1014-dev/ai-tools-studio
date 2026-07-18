import Link from "next/link";
import { Button } from "@/components/ui/base";

export default function NotFound() {
  return (
    <main className="py-20">
      <div className="container text-center">
        <h1 className="text-6xl font-bold text-[var(--accent)]">404</h1>
        <p className="mt-4 text-lg text-[var(--muted)]">页面不存在</p>
        <Link href="/" className="mt-6 inline-block">
          <Button>返回首页</Button>
        </Link>
      </div>
    </main>
  );
}
