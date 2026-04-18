import { cn } from "@/lib/cn";

interface SkeletonProps {
  className?: string;
}

export const Skeleton = ({ className }: SkeletonProps) => {
  return <div className={cn("animate-pulse rounded-lg bg-velor-elevated", className)} />;
};
