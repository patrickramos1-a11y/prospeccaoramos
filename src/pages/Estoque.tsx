import { useState } from "react";
import { ESTOQUE_ITENS } from "@/data/mockData";
import { cn } from "@/lib/utils";
import {
  Package, Plus, Search, AlertCircle, CheckCircle, ArrowDown, ArrowUp,
  TrendingDown, Boxes
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

export default function Estoque() {
  const [search, setSearch] = useState("");
  const [categoriaFilter, setCategoriaFilter] = useState("todas");

  const categorias = ["todas", ...Array.from(new Set(ESTOQUE_ITENS.map((i) => i.categoria)))];

  const filtered = ESTOQUE_ITENS.filter((item) => {
    const matchSearch = item.nome.toLowerCase().includes(search.toLowerCase());
    const matchCat = categoriaFilter === "todas" || item.categoria === categoriaFilter;
    return matchSearch && matchCat;
  });

  const totalItens = ESTOQUE_ITENS.length;
  const alertaCount = ESTOQUE_ITENS.filter((i) => i.alerta).length;
  const valorTotal = ESTOQUE_ITENS.reduce((acc, i) => acc + i.saldoAtual * i.custoUnitario, 0);

  const getEstoqueStatus = (item: typeof ESTOQUE_ITENS[0]) => {
    const pct = item.saldoAtual / item.minimo;
    if (pct < 1) return { label: "Crítico", color: "status-alert", barColor: "bg-destructive" };
    if (pct < 1.3) return { label: "Atenção", color: "status-in-progress", barColor: "bg-accent" };
    return { label: "OK", color: "status-visited", barColor: "bg-status-visited" };
  };

  return (
    <div className="p-4 lg:p-6 space-y-5 animate-fade-in">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold">Estoque de Materiais</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Controle de brindes, papelaria e embalagens</p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-1.5 border border-border bg-card px-3 py-2 rounded-lg text-xs font-medium hover:bg-muted/50 transition-colors">
            <ArrowDown className="w-3.5 h-3.5" /> Entrada
          </button>
          <button className="flex items-center gap-1.5 bg-primary text-primary-foreground px-3 py-2 rounded-lg text-xs font-semibold hover:bg-primary/90 transition-colors shadow-sm">
            <Plus className="w-3.5 h-3.5" /> Novo Item
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="shadow-sm">
          <CardContent className="p-3.5 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <Boxes className="w-4.5 h-4.5 text-primary" />
            </div>
            <div>
              <p className="font-bold text-xl text-foreground">{totalItens}</p>
              <p className="text-[11px] text-muted-foreground">Tipos de item</p>
            </div>
          </CardContent>
        </Card>
        <Card className={cn("shadow-sm", alertaCount > 0 ? "border-destructive/30" : "")}>
          <CardContent className="p-3.5 flex items-center gap-3">
            <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center", alertaCount > 0 ? "bg-destructive/10" : "bg-muted")}>
              <AlertCircle className={cn("w-4.5 h-4.5", alertaCount > 0 ? "text-destructive" : "text-muted-foreground")} />
            </div>
            <div>
              <p className={cn("font-bold text-xl", alertaCount > 0 ? "text-destructive" : "text-foreground")}>{alertaCount}</p>
              <p className="text-[11px] text-muted-foreground">Em alerta</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-3.5 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center">
              <TrendingDown className="w-4.5 h-4.5 text-accent-foreground" />
            </div>
            <div>
              <p className="font-bold text-xl text-foreground">R${valorTotal.toFixed(0)}</p>
              <p className="text-[11px] text-muted-foreground">Valor em estoque</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar item..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>
        <Select value={categoriaFilter} onValueChange={setCategoriaFilter}>
          <SelectTrigger className="h-9 text-xs w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {categorias.map((c) => (
              <SelectItem key={c} value={c} className="text-xs capitalize">{c === "todas" ? "Todas categorias" : c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card className="shadow-sm border-border/60">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Item</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden sm:table-cell">Categoria</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Saldo</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden md:table-cell">Saúde do Estoque</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden lg:table-cell">Custo Unit.</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => {
                const st = getEstoqueStatus(item);
                const pct = Math.min((item.saldoAtual / item.ideal) * 100, 100);
                return (
                  <tr key={item.id} className="border-b border-border/40 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                          <Package className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground text-sm">{item.nome}</p>
                          <p className="text-[11px] text-muted-foreground">{item.fornecedor}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className="text-xs bg-muted px-2 py-0.5 rounded text-muted-foreground">{item.categoria}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <p className="font-bold text-foreground">{item.saldoAtual}</p>
                      <p className="text-[10px] text-muted-foreground">{item.unidade}</p>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden min-w-[60px]">
                          <div className={cn("h-full rounded-full transition-all", st.barColor)} style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                          mín {item.minimo}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center hidden lg:table-cell">
                      <span className="text-xs text-muted-foreground">R$ {item.custoUnitario.toFixed(2)}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full border", st.color)}>
                        {st.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button className="p-1 hover:bg-muted rounded transition-colors text-muted-foreground hover:text-foreground" title="Entrada">
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                        <button className="p-1 hover:bg-muted rounded transition-colors text-muted-foreground hover:text-foreground" title="Saída">
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Package className="w-8 h-8 mb-3 opacity-30" />
            <p className="text-sm">Nenhum item encontrado</p>
          </div>
        )}
      </Card>
    </div>
  );
}
