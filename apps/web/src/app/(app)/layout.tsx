import { requireUserSession } from "@/server/application/session-service";

interface PrivateLayoutProps {
  children: React.ReactNode;
}

export default async function PrivateLayout({ children }: PrivateLayoutProps) {
  await requireUserSession();

  return children;
}
