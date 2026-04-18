import { cn } from "@/lib/cn";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  muted?: boolean;
}

export const Card = ({ children, className, muted = false }: CardProps) => {
  return (
    <article className={cn(muted ? "velor-card-muted" : "velor-card", className)}>
      {children}
    </article>
  );
};
