import { cn } from "@/lib/cn";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
}

export const Button = ({ className, variant = "primary", ...props }: ButtonProps) => {
  return (
    <button
      className={cn(
        variant === "primary" && "velor-btn-primary",
        variant === "secondary" && "velor-btn-secondary",
        variant === "ghost" && "velor-btn-ghost",
        "disabled:cursor-not-allowed disabled:opacity-55",
        className
      )}
      {...props}
    />
  );
};
