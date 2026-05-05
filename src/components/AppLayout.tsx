import { Outlet, NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  MapPin,
  CalendarCheck,
  Users,
  Package,
  Gift,
  BarChart3,
  DollarSign,
  Leaf,
  Menu,
  X,
  Bell,
  ChevronRight,
} from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

type NavItem = {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  end?: boolean;
  badge?: string | number;
  alert?: boolean;
};

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const { data: municipiosCount = 0 } = useQuery({
    queryKey: ["sidebar", "municipios-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("municipios")
        .select("*", { count: "exact", head: true });
      if (error) throw error;
      return count ?? 0;
    },
    staleTime: 30_000,
  });

  const { data: estoqueAlerta = false } = useQuery({
    queryKey: ["sidebar", "estoque-alerta"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("estoque_itens")
        .select("quantidade, estoque_minimo")
        .limit(1000);
      if (error) throw error;
      return (data ?? []).some(
        (i: { quantidade: number | null; estoque_minimo: number | null }) =>
          (i.quantidade ?? 0) <= (i.estoque_minimo ?? 0),
      );
    },
    staleTime: 30_000,
  });

  const navItems: NavItem[] = [
    { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
    { to: "/municipios", label: "Municípios", icon: MapPin, badge: municipiosCount || undefined },
    { to: "/visitas", label: "Visitas", icon: CalendarCheck },
    { to: "/contatos", label: "Contatos", icon: Users },
    { to: "/estoque", label: "Estoque", icon: Package, alert: estoqueAlerta },
    { to: "/kits", label: "Kits", icon: Gift },
    { to: "/inteligencia", label: "Inteligência", icon: BarChart3 },
    { to: "/financeiro", label: "Financeiro", icon: DollarSign },
  ];

  const currentTitle = navItems.find(
    (n) => n.end ? location.pathname === n.to : location.pathname.startsWith(n.to)
  )?.label ?? "Ramos";

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-foreground/40 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed lg:static inset-y-0 left-0 z-50 w-64 flex flex-col",
          "bg-sidebar transition-transform duration-300 ease-in-out",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-sidebar-border">
          <div className="w-9 h-9 rounded-xl bg-sidebar-primary flex items-center justify-center flex-shrink-0">
            <Leaf className="w-5 h-5 text-sidebar-primary-foreground" />
          </div>
          <div>
            <p className="font-display font-bold text-sidebar-foreground text-base leading-tight">Ramos</p>
            <p className="text-[11px] text-sidebar-foreground/50 leading-tight">Prospecção Ambiental</p>
          </div>
          <button
            className="ml-auto lg:hidden text-sidebar-foreground/60 hover:text-sidebar-foreground"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group",
                  isActive
                    ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                    : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                )
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon className={cn("w-4.5 h-4.5 flex-shrink-0", isActive ? "opacity-100" : "opacity-70 group-hover:opacity-100")} />
                  <span className="flex-1 truncate">{item.label}</span>
                  {item.badge && (
                    <span className={cn(
                      "text-[10px] font-semibold px-1.5 py-0.5 rounded-full",
                      isActive ? "bg-sidebar-primary-foreground/20 text-sidebar-primary-foreground" : "bg-sidebar-accent text-sidebar-accent-foreground"
                    )}>
                      {item.badge}
                    </span>
                  )}
                  {item.alert && !item.badge && (
                    <span className="w-2 h-2 rounded-full bg-destructive flex-shrink-0" />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-4 py-4 border-t border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-sidebar-accent flex items-center justify-center">
              <span className="text-xs font-bold text-sidebar-accent-foreground">GE</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-sidebar-foreground truncate">Gestor</p>
              <p className="text-[10px] text-sidebar-foreground/45 truncate">ramos@consultoria.com</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="flex items-center gap-4 px-4 lg:px-6 h-14 border-b border-border bg-card/80 backdrop-blur-sm flex-shrink-0">
          <button
            className="lg:hidden text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="hidden sm:inline">Ramos</span>
            <ChevronRight className="hidden sm:block w-3.5 h-3.5" />
            <span className="text-foreground font-semibold font-display">{currentTitle}</span>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <button className="relative text-muted-foreground hover:text-foreground transition-colors">
              <Bell className="w-4.5 h-4.5" />
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-destructive rounded-full" />
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
