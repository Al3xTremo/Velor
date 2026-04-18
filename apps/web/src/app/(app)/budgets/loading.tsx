import { Skeleton } from "@/components/ui/skeleton";

export default function BudgetsLoading() {
  return (
    <div className="velor-page px-4 py-6 md:px-6 md:py-8">
      <div className="mx-auto w-full max-w-7xl space-y-6">
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-28 w-full" />
        <div className="grid gap-4 xl:grid-cols-[1.3fr_1fr]">
          <Skeleton className="h-[520px]" />
          <Skeleton className="h-[520px]" />
        </div>
      </div>
    </div>
  );
}
