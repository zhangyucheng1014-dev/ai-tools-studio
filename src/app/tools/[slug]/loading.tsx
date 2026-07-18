import { Skeleton } from "@/components/ui/base";

export default function ToolLoading() {
  return (
    <main className="py-10 md:py-16">
      <div className="container">
        <div className="grid gap-6 lg:grid-cols-[1fr_0.6fr]">
          <div>
            <Skeleton className="h-6 w-24 rounded-full" />
            <div className="mt-4 flex items-center gap-4">
              <Skeleton className="h-14 w-14 rounded-lg" />
              <div>
                <Skeleton className="h-8 w-48" />
                <Skeleton className="mt-2 h-4 w-64" />
              </div>
            </div>
            <Skeleton className="mt-4 h-16 w-full" />
          </div>
          <Skeleton className="h-40 w-full rounded-2xl" />
        </div>
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-64 w-full rounded-2xl" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      </div>
    </main>
  );
}
