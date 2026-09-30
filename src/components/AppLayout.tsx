import { Outlet, NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard, MapPin, CalendarCheck, Landmark, Package, Gift,
  BarChart3, DollarSign, Settings, ChevronLeft, ChevronRight,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { MobileBottomNav } from "./MobileBottomNav";
import logoHorizontal from "@/assets/logo-horizontal.png";
import logoMark from "@/assets/logo-mark.png";

type NavItem = {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  end?: boolean;
  badge?: string | number;
  alert?: boolean;
};

type NavSection = { label: string; items: NavItem[] };

const STORAGE_KEY = "ramos:sidebar-collapsed";

export default function AppLayout() {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  });

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, collapsed ? "1" : "0");
  }, [collapsed]);

  // Fechar sheet ao trocar de rota
  useEffect(() => { setMobileMenuOpen(false); }, [location.pathname]);

  const { data: municipiosCount = 0 } = useQuery({
    queryKey: ["sidebar", "municipios-count"],
    queryFn: async () => {
      const { count } = await supabase.from("municipios").select("*", { count: "exact", head: true });
      return count ?? 0;
    },
    staleTime: 30_000,
  });
  const { data: contatosCount = 0 } = useQuery({
    queryKey: ["sidebar", "contatos-count"],
    queryFn: async () => {
      const { count } = await supabase.from("contatos").select("*", { count: "exact", head: true });
      return count ?? 0;
    },
    staleTime: 30_000,
  });
  const { data: orgaosCount = 0 } = useQuery({
    queryKey: ["sidebar", "orgaos-count"],
    queryFn: async () => {
      const { count } = await supabase.from("orgaos").select("*", { count: "exact", head: true });
      return count ?? 0;
    },
    staleTime: 30_000,
  });
  const { data: estoqueAlerta = false } = useQuery({
    queryKey: ["sidebar", "estoque-alerta"],
    queryFn: async () => {
      const { data } = await supabase.from("estoque_itens").select("saldo_atual, minimo").limit(1000);
      return (data ?? []).some(
        (i: { saldo_atual: number | null; minimo: number | null }) =>
          (i.saldo_atual ?? 0) <= (i.minimo ?? 0),
      );
    },
    staleTime: 30_000,
  });

  const sections: NavSection[] = [
    {
      label: "Operação",
      items: [
        { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
        { to: "/municipios", label: "Municípios", icon: MapPin, badge: municipiosCount || undefined },
        { to: "/orgaos", label: "Órgãos & Contatos", icon: Landmark, badge: (orgaosCount + contatosCount) || undefined },
        { to: "/visitas", label: "Visitas", icon: CalendarCheck },
      ],
    },
    {
      label: "Materiais",
      items: [
        { to: "/estoque", label: "Estoque", icon: Package, alert: estoqueAlerta },
        { to: "/kits", label: "Kits", icon: Gift },
      ],
    },
    {
      label: "Inteligência",
      items: [
        { to: "/inteligencia", label: "Inteligência", icon: BarChart3 },
        { to: "/financeiro", label: "Financeiro", icon: DollarSign },
      ],
    },
    {
      label: "Sistema",
      items: [
        { to: "/configuracoes", label: "Configurações", icon: Settings },
      ],
    },
  ];

  const allItems = sections.flatMap((s) => s.items);
  const currentTitle = allItems.find(
    (n) => n.end ? location.pathname === n.to : location.pathname.startsWith(n.to)
  )?.label ?? "Ramos";

  const renderNavItem = (item: NavItem, mini = false) => (
    <NavLink
      key={item.to}
      to={item.to}
      end={item.end}
      title={mini ? item.label : undefined}
      className={({ isActive }) =>
        cn(
          "relative flex items-center gap-3 rounded-lg text-sm font-medium transition-all duration-150 group",
          mini ? "justify-center px-2 py-2.5" : "px-3 py-2.5",
          isActive
            ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
            : "sidebar-nav-item-muted hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        )
      }
    >
      {({ isActive }) => (
        <>
          <item.icon className="w-[18px] h-[18px] flex-shrink-0 opacity-100" />
          {!mini && (
            <>
              <span className="flex-1 truncate">{item.label}</span>
              {item.badge && (
                <span className={cn(
                  "text-[10px] font-semibold px-1.5 py-0.5 rounded-full",
                  isActive ? "bg-white/20 text-white" : "bg-primary text-primary-foreground"
                )}>
                  {item.badge}
                </span>
              )}
              {item.alert && !item.badge && (
                <span className="w-2 h-2 rounded-full bg-destructive flex-shrink-0 animate-pulse" />
              )}
            </>
          )}
          {mini && item.alert && (
            <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-destructive" />
          )}
        </>
      )}
    </NavLink>
  );

  return (
    <div className="flex h-[100dvh] app-shell overflow-hidden">
      {/* Sidebar desktop */}
      <aside
        className={cn(
          "hidden lg:flex flex-col bg-sidebar border-r border-sidebar-border",
          "transition-[width] duration-300 ease-out flex-shrink-0",
          collapsed ? "w-[68px]" : "w-64"
        )}
      >
        {/* Logo */}
        <div className={cn(
          "flex h-[88px] items-center border-b border-sidebar-border bg-card",
          collapsed ? "justify-center px-2" : "px-5"
        )}>
          <img
            src={collapsed ? logoMark : logoHorizontal}
            alt="Ramos Engenharia"
            className={cn("object-contain", collapsed ? "h-9 w-9" : "h-12 w-auto max-w-[178px]")}
          />
        </div>

        {/* Nav agrupada */}
        <nav className="flex-1 overflow-y-auto py-4 px-2 no-scrollbar">
          {sections.map((section, idx) => (
            <div key={section.label} className={cn(idx > 0 && "mt-5")}>
              {!collapsed && (
                <p className="text-[10px] uppercase px-3 mb-2 sidebar-section-label">
                  {section.label}
                </p>
              )}
              {collapsed && idx > 0 && (
                <div className="mx-3 mb-2 border-t border-sidebar-border/40" />
              )}
              <div className="space-y-0.5">
                {section.items.map((item) => renderNavItem(item, collapsed))}
              </div>
            </div>
          ))}
        </nav>

        {/* Toggle + footer */}
        <div className="border-t border-sidebar-border/60">
          <button
            onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
            className={cn(
              "w-full flex items-center gap-2 px-3 py-2.5 text-xs text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors",
              collapsed && "justify-center"
            )}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            {!collapsed && <span>Recolher</span>}
          </button>
          <div className={cn("flex items-center gap-3 border-t border-sidebar-border bg-card px-4 py-3", collapsed && "justify-center px-2")}>
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-bold text-primary">GE</span>
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-foreground truncate">Gestor</p>
                <p className="text-[10px] text-muted-foreground truncate">ramos@consultoria.com</p>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Mobile "Mais" sheet */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="left" className="w-[290px] p-0 bg-sidebar border-sidebar-border">
          <SheetHeader className="px-5 py-4 border-b border-sidebar-border bg-card">
            <SheetTitle className="flex items-center text-left">
              <img src={logoHorizontal} alt="Ramos Engenharia" className="h-11 w-auto max-w-[180px] object-contain" />
            </SheetTitle>
          </SheetHeader>
          <nav className="py-3 px-2 overflow-y-auto h-[calc(100dvh-80px)]">
            {sections.map((section, idx) => (
              <div key={section.label} className={cn(idx > 0 && "mt-4")}>
                <p className="text-[10px] uppercase px-3 mb-1.5 sidebar-section-label">
                  {section.label}
                </p>
                <div className="space-y-0.5">
                  {section.items.map((item) => renderNavItem(item))}
                </div>
              </div>
            ))}
          </nav>
        </SheetContent>
      </Sheet>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="sticky top-0 z-30 flex h-14 flex-shrink-0 items-center gap-3 border-b border-border bg-card/90 px-4 backdrop-blur-sm lg:px-6">
          <div className="flex items-center gap-2 text-sm min-w-0">
            <span className="hidden sm:inline text-muted-foreground font-medium">Ramos Engenharia</span>
            <ChevronRight className="hidden sm:block w-3.5 h-3.5 text-muted-foreground/60" />
            <span className="text-foreground font-semibold font-display truncate">{currentTitle}</span>
          </div>
        </header>

        {/* Conteúdo */}
        <main className="flex-1 overflow-y-auto pb-nav">
          <Outlet />
        </main>
      </div>

      {/* Bottom nav mobile */}
      <MobileBottomNav onOpenMenu={() => setMobileMenuOpen(true)} hasEstoqueAlert={estoqueAlerta} />
    </div>
  );
}
