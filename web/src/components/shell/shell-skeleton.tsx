import { Skeleton } from "@/components/ui/skeleton";
import { Wordmark } from "@/components/brand/wordmark";

export function ShellSkeleton() {
  return (
    <div className="min-h-dvh">
      <div className="mx-auto flex h-16 max-w-[1120px] items-center justify-between px-5 sm:px-8">
        <Wordmark href={null} />
        <Skeleton className="size-8 rounded-full" />
      </div>
      <div className="mx-auto max-w-[1120px] px-5 pt-10 sm:px-8">
        <Skeleton className="h-3 w-40" />
        <Skeleton className="mt-4 h-12 w-[60%]" />
        <Skeleton className="mt-3 h-5 w-[40%]" />
        <div className="mt-10 grid gap-4 md:grid-cols-2">
          <Skeleton className="h-72 rounded-md" />
          <Skeleton className="h-72 rounded-md" />
        </div>
      </div>
    </div>
  );
}
