import { Skeleton } from "@/components/ui/skeleton";

export default function TransactionsLoading() {
  return (
    <div className="velor-page px-4 py-6 md:px-6 md:py-8">
      <div className="mx-auto w-full max-w-7xl space-y-6">
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-[520px] w-full" />
        <Skeleton className="h-36 w-full" />
        <Skeleton className="h-[420px] w-full" />
      </div>
    </div>
  );
}
