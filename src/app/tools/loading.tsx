import { Skeleton } from "@/components/ui/base";

export default function ToolsLoading() {
  return (
    <main className="py-12 md:py-16">
      <div className="container">
        <Skeleton className="mb-8 h-9 w-32 rounded-lg" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-44 w-full rounded-2xl" />
          ))}
        </div>
      </div>
    </main>
  );
}
