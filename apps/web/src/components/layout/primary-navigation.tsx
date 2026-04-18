"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/analytics", label: "Analitica" },
  { href: "/budgets", label: "Presupuestos" },
  { href: "/transactions", label: "Movimientos" },
  { href: "/categories", label: "Categorias" },
  { href: "/goals", label: "Objetivos" },
  { href: "/settings", label: "Ajustes" },
];

export const SidebarNavigation = () => {
  const pathname = usePathname();

  return (
    <nav>
      <ul className="space-y-1.5">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  "flex items-center justify-between rounded-xl px-3 py-2 text-sm font-semibold transition",
                  isActive
                    ? "bg-velor-primary text-white"
                    : "text-velor-muted hover:bg-velor-elevated hover:text-velor-text"
                )}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};

export const MobileNavigation = () => {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-3 bottom-3 z-40 rounded-2xl border border-velor-border bg-velor-surface/95 p-2 backdrop-blur md:hidden">
      <ul className="grid grid-cols-7 gap-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  "flex h-10 items-center justify-center rounded-lg text-[11px] font-semibold",
                  isActive ? "bg-velor-primary text-white" : "text-velor-muted"
                )}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};
