import { Skeleton } from "@/components/ui/base";

export default function Loading() {
  return (
    <main className="py-12 md:py-16">
      <div className="container">
        <div className="mb-14 text-center">
          <Skeleton className="mx-auto h-10 w-48" />
          <Skeleton className="mx-auto mt-4 h-6 w-80" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-48 w-full rounded-2xl" />
          ))}
        </div>
      </div>
    </main>
  );
}
