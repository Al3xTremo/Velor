import { AppShell } from "@/components/layout/app-shell";
import { EmptyState } from "@/components/ui/empty-state";

export const dynamic = "force-dynamic";

export default function SettingsPage() {
  return (
    <AppShell
      title="Perfil y ajustes"
      subtitle="Administra tu perfil, preferencias de moneda, zona horaria y configuracion general."
    >
      <EmptyState
        title="Ajustes listos para configurar"
        description="Esta base ya esta preparada para conectar preferencias de cuenta, notificaciones y seguridad."
      />
    </AppShell>
  );
}
