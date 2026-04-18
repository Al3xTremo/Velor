import { Card } from "@/components/ui/card";

interface AuthPanelProps {
  eyebrow?: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}

export const AuthPanel = ({ eyebrow = "Velor", title, subtitle, children }: AuthPanelProps) => {
  return (
    <Card className="space-y-6 p-6 md:p-7">
      <header className="space-y-2 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-velor-primary">
          {eyebrow}
        </p>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-velor-text">
          {title}
        </h1>
        <p className="text-sm text-velor-muted">{subtitle}</p>
      </header>

      {children}
    </Card>
  );
};
