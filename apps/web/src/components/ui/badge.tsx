import { cn } from "@/lib/cn";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "success" | "warning" | "danger";
  className?: string;
}

export const Badge = ({ children, variant = "success", className }: BadgeProps) => {
  return (
    <span
      className={cn(
        variant === "success" && "velor-badge-success",
        variant === "warning" && "velor-badge-warning",
        variant === "danger" && "velor-badge-danger",
        className
      )}
    >
      {children}
    </span>
  );
};
