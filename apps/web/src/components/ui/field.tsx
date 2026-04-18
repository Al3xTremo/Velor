import { cn } from "@/lib/cn";

interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  children: React.ReactNode;
}

export const Label = ({ className, children, ...props }: LabelProps) => {
  return (
    <label className={cn("velor-label", className)} {...props}>
      {children}
    </label>
  );
};

export const TextInput = ({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) => {
  return <input className={cn("velor-input", className)} {...props} />;
};

export const SelectInput = ({
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) => {
  return (
    <select className={cn("velor-input", className)} {...props}>
      {children}
    </select>
  );
};

interface FieldErrorProps {
  message: string | undefined;
}

export const FieldError = ({ message }: FieldErrorProps) => {
  if (!message) {
    return null;
  }

  return <p className="mt-1.5 text-xs font-medium text-rose-600">{message}</p>;
};
