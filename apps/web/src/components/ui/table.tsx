import { cn } from "@/lib/cn";

interface TableProps {
  children: React.ReactNode;
  className?: string;
}

export const Table = ({ children, className }: TableProps) => {
  return <table className={cn("velor-table", className)}>{children}</table>;
};
