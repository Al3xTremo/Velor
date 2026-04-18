import { MobileNavigation, SidebarNavigation } from "@/components/layout/primary-navigation";

interface AppShellProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

export const AppShell = ({ title, subtitle, actions, children }: AppShellProps) => {
  return (
    <div className="velor-page">
      <div className="mx-auto grid min-h-screen w-full max-w-7xl grid-cols-1 gap-6 px-4 pb-20 pt-6 md:grid-cols-[240px_minmax(0,1fr)] md:px-6 md:pb-8 md:pt-8">
        <aside className="velor-card hidden h-fit p-5 md:block">
          <p className="font-display text-xl font-semibold text-velor-text">Velor</p>
          <p className="mt-1 text-sm text-velor-muted">Finanzas personales, con claridad.</p>
          <div className="mt-6">
            <SidebarNavigation />
          </div>
        </aside>

        <section className="space-y-6">
          <header className="velor-card flex flex-wrap items-start justify-between gap-4 p-5 md:p-6">
            <div>
              <h1 className="font-display text-2xl font-semibold tracking-tight text-velor-text md:text-3xl">
                {title}
              </h1>
              {subtitle ? (
                <p className="mt-2 text-sm text-velor-muted md:text-base">{subtitle}</p>
              ) : null}
            </div>
            {actions ? <div className="shrink-0">{actions}</div> : null}
          </header>

          <div className="space-y-6">{children}</div>
        </section>
      </div>

      <MobileNavigation />
    </div>
  );
};
