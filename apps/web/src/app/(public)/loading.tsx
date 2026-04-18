import { Skeleton } from "@/components/ui/skeleton";

export default function PublicLoading() {
  return (
    <div className="velor-page flex min-h-screen items-center px-4 py-8 md:px-6 md:py-10">
      <div className="mx-auto w-full max-w-md space-y-4">
        <Skeleton className="h-10 w-40 mx-auto" />
        <Skeleton className="h-5 w-64 mx-auto" />
        <Skeleton className="h-72 w-full" />
      </div>
    </div>
  );
}
