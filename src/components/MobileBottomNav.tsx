import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard, MapPin, CalendarCheck, Package, Menu,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface MobileBottomNavProps {
  onOpenMenu: () => void;
  hasEstoqueAlert?: boolean;
}

const items = [
  { to: "/", label: "Início", icon: LayoutDashboard, end: true },
  { to: "/visitas", label: "Visitas", icon: CalendarCheck },
  { to: "/municipios", label: "Mapa", icon: MapPin },
  { to: "/estoque", label: "Estoque", icon: Package, alertKey: "estoque" as const },
];

export function MobileBottomNav({ onOpenMenu, hasEstoqueAlert }: MobileBottomNavProps) {
  const { pathname } = useLocation();

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-40 lg:hidden glass border-t border-border/70 safe-bottom"
      style={{ height: "calc(var(--bottom-nav-h) + var(--safe-bottom))" }}
      aria-label="Navegação principal"
    >
      <div className="grid grid-cols-5 h-16 max-w-md mx-auto">
        {items.map((item) => {
          const isActive = item.end ? pathname === item.to : pathname.startsWith(item.to);
          const showAlert = item.alertKey === "estoque" && hasEstoqueAlert;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={cn(
                "relative flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors",
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {isActive && (
                <span className="absolute top-0 inset-x-3 h-0.5 rounded-full bg-primary" />
              )}
              <div className="relative">
                <item.icon className={cn("w-5 h-5 transition-transform", isActive && "scale-110")} />
                {showAlert && (
                  <span className="absolute -top-0.5 -right-1 w-2 h-2 rounded-full bg-destructive border border-card" />
                )}
              </div>
              <span>{item.label}</span>
            </NavLink>
          );
        })}
        <button
          onClick={onOpenMenu}
          aria-label="Abrir menu completo"
          className="relative flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <Menu className="w-5 h-5" />
          <span>Mais</span>
        </button>
      </div>
    </nav>
  );
}

export default MobileBottomNav;
