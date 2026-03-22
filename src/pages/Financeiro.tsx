import { VISITAS } from "@/data/mockData";
import { cn } from "@/lib/utils";
import { DollarSign, TrendingUp, Fuel, Users, Package, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

const custoMes = [
  { mes: "Jan", total: 0 },
  { mes: "Fev", total: 1100 },
  { mes: "Mar", total: 1860 },
  { mes: "Abr", total: 0 },
];

const visitasComCusto = VISITAS.filter((v) => v.custo > 0);
const totalInvestido = visitasComCusto.reduce((acc, v) => acc + v.custo, 0);
const mediaVisita = totalInvestido / visitasComCusto.length;

export default function Financeiro() {
  return (
    <div className="p-4 lg:p-6 space-y-5 animate-fade-in">
      <div>
        <h1 className="font-display text-2xl font-bold">Controle Financeiro</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Custos por visita, operação e materiais</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Total Investido", value: `R$ ${totalInvestido.toLocaleString("pt-BR")}`, icon: DollarSign, color: "text-primary bg-primary/10", sub: "operação total" },
          { label: "Média por Visita", value: `R$ ${mediaVisita.toFixed(0)}`, icon: TrendingUp, color: "text-status-visited bg-status-visited/10", sub: "6 visitas realizadas" },
          { label: "Custo em Materiais", value: "R$ 680", icon: Package, color: "text-accent-foreground bg-accent/10", sub: "kits entregues" },
          { label: "Logística", value: "R$ 1.420", icon: Fuel, color: "text-status-planned bg-status-planned/10", sub: "combustível + outros" },
        ].map((kpi) => (
          <Card key={kpi.label} className="shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0", kpi.color)}>
                <kpi.icon className="w-4.5 h-4.5" />
              </div>
              <div>
                <p className="font-display font-bold text-xl text-foreground">{kpi.value}</p>
                <p className="text-[11px] text-muted-foreground">{kpi.label}</p>
                <p className="text-[10px] text-muted-foreground/70">{kpi.sub}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Evolução mensal */}
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="font-display text-base">Evolução do Investimento Mensal</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={custoMes} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
              <defs>
                <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(155, 45%, 22%)" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="hsl(155, 45%, 22%)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="mes" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: 12,
                }}
                formatter={(value: number) => [`R$ ${value}`, "Total"]}
              />
              <Area
                type="monotone"
                dataKey="total"
                stroke="hsl(155, 45%, 22%)"
                strokeWidth={2}
                fill="url(#colorTotal)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Tabela de visitas com custo */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="font-display text-base">Custo por Visita</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  {["Município", "Data", "Tipo", "Responsável", "Kits Usados", "Custo Total"].map((h) => (
                    <th key={h} className="text-left px-3 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visitasComCusto.map((v) => (
                  <tr key={v.id} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                    <td className="px-3 py-3 font-medium text-foreground">{v.municipio}</td>
                    <td className="px-3 py-3 text-muted-foreground">{v.data}</td>
                    <td className="px-3 py-3 text-muted-foreground text-xs">{v.tipo}</td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
                          <Users className="w-2.5 h-2.5 text-primary" />
                        </div>
                        <span className="text-xs text-foreground">{v.responsavel}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-xs text-muted-foreground">{v.kits.length > 0 ? v.kits.join(", ") : "—"}</td>
                    <td className="px-3 py-3">
                      <span className="font-bold text-primary">R$ {v.custo}</span>
                    </td>
                  </tr>
                ))}
                <tr className="bg-muted/30 border-t-2 border-border">
                  <td colSpan={5} className="px-3 py-2.5 text-xs font-bold text-foreground uppercase tracking-wide">
                    Total Geral
                  </td>
                  <td className="px-3 py-2.5 font-display font-bold text-lg text-primary">
                    R$ {totalInvestido.toLocaleString("pt-BR")}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Visitas sem custo lançado */}
          {VISITAS.filter((v) => v.status !== "planejada" && v.custo === 0).length > 0 && (
            <div className="mt-4 flex items-start gap-2 p-3 rounded-lg bg-accent/8 border border-accent/20">
              <AlertCircle className="w-4 h-4 text-accent-foreground flex-shrink-0 mt-0.5" />
              <p className="text-xs text-accent-foreground">
                Existem visitas realizadas sem custo lançado. Registre os custos para ter controle completo da operação.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Breakdown de categorias de custo */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="font-display text-base">Composição dos Custos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { label: "Logística (combustível, pedágio, alimentação)", valor: 1420, pct: 48 },
              { label: "Materiais e Kits", valor: 680, pct: 23 },
              { label: "Mão de Obra (horas de campo)", valor: 750, pct: 25 },
              { label: "Imprevistos / Outros", valor: 110, pct: 4 },
            ].map((c) => (
              <div key={c.label}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-muted-foreground">{c.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground">R$ {c.valor.toLocaleString("pt-BR")}</span>
                    <span className="text-muted-foreground">{c.pct}%</span>
                  </div>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${c.pct}%`, opacity: 0.6 + (c.pct / 100) * 0.4 }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
