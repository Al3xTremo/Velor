import { logoutAction } from "@/features/auth/actions";
import { Button } from "@/components/ui/button";

export const LogoutForm = () => {
  return (
    <form action={logoutAction}>
      <Button type="submit" variant="secondary" className="px-3 py-2">
        Cerrar sesion
      </Button>
    </form>
  );
};
