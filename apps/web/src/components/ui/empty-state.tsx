import { Card } from "@/components/ui/card";

interface EmptyStateProps {
  title: string;
  description: string;
  action?: React.ReactNode;
}

export const EmptyState = ({ title, description, action }: EmptyStateProps) => {
  return (
    <Card className="p-8 text-center">
      <h3 className="font-display text-xl font-semibold text-velor-text">{title}</h3>
      <p className="mx-auto mt-2 max-w-xl text-sm text-velor-muted">{description}</p>
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </Card>
  );
};
