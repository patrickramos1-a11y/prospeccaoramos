import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  actions?: ReactNode;
  className?: string;
  children?: ReactNode;
}

/**
 * Cabeçalho padronizado de páginas — responsivo.
 * Mobile: título compacto, ações abaixo. Desktop: tudo em linha.
 */
export function PageHeader({ title, subtitle, icon: Icon, actions, className, children }: PageHeaderProps) {
  return (
    <header className={cn("surface-panel rounded-lg p-4 sm:p-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between", className)}>
      <div className="flex items-start gap-3 min-w-0">
        {Icon && (
          <div className="hidden sm:flex w-11 h-11 rounded-lg bg-primary/10 text-primary items-center justify-center flex-shrink-0 kpi-icon">
            <Icon className="w-5 h-5" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-xl sm:text-2xl font-bold text-foreground tracking-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 line-clamp-2">
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {(actions || children) && (
        <div className="flex flex-wrap items-center gap-2 lg:flex-shrink-0">
          {children}
          {actions}
        </div>
      )}
    </header>
  );
}

export default PageHeader;
