import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import {
  DollarSign, TrendingUp, Package, AlertCircle, Filter, Users, Calendar,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";

interface Visita {
  id: string;
  municipio_id: string | null;
  responsavel_id: string | null;
  status: string;
  tipo: string;
  custo_total: number;
  data_visita: string;
  hora: string | null;
}
interface VisitaKit {
  id: string;
  visita_id: string;
  kit_id: string;
  quantidade: number;
  custo_unitario_snapshot: number;
}
interface Kit { id: string; nome: string; }
interface Municipio { id: string; nome: string; estado: string; }
interface Usuario { id: string; nome: string; cor: string; }

const tooltipStyle = {
  background: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "8px",
  fontSize: 12,
};

const PIE_COLORS = [
  "hsl(155, 45%, 32%)",
  "hsl(38, 85%, 52%)",
  "hsl(220, 60%, 50%)",
  "hsl(280, 50%, 50%)",
  "hsl(0, 65%, 55%)",
  "hsl(180, 50%, 40%)",
];

const fmt = (n: number) =>
  `R$ ${Number(n || 0).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`;

const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

export default function Financeiro() {
  const [visitas, setVisitas] = useState<Visita[]>([]);
  const [visitaKits, setVisitaKits] = useState<VisitaKit[]>([]);
  const [kits, setKits] = useState<Kit[]>([]);
  const [municipios, setMunicipios] = useState<Municipio[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);

  const [periodoFilter, setPeriodoFilter] = useState("12m");
  const [estadoFilter, setEstadoFilter] = useState("todos");
  const [responsavelFilter, setResponsavelFilter] = useState("todos");

  useEffect(() => {
    (async () => {
      const [vRes, vkRes, kRes, mRes, uRes] = await Promise.all([
        supabase.from("visitas").select("*").order("data_visita", { ascending: false }),
        supabase.from("visita_kits").select("*"),
        supabase.from("kits").select("id,nome"),
        supabase.from("municipios").select("id,nome,estado"),
        supabase.from("usuarios").select("id,nome,cor"),
      ]);
      setVisitas((vRes.data as Visita[]) || []);
      setVisitaKits((vkRes.data as VisitaKit[]) || []);
      setKits((kRes.data as Kit[]) || []);
      setMunicipios((mRes.data as Municipio[]) || []);
      setUsuarios((uRes.data as Usuario[]) || []);
      setLoading(false);
    })();
  }, []);

  const kitMap = useMemo(() => new Map(kits.map((k) => [k.id, k])), [kits]);

  const municipioMap = useMemo(
    () => new Map(municipios.map((m) => [m.id, m])),
    [municipios]
  );
  const usuarioMap = useMemo(
    () => new Map(usuarios.map((u) => [u.id, u])),
    [usuarios]
  );
  const kitsPorVisita = useMemo(() => {
    const map = new Map<string, VisitaKit[]>();
    for (const vk of visitaKits) {
      if (!map.has(vk.visita_id)) map.set(vk.visita_id, []);
      map.get(vk.visita_id)!.push(vk);
    }
    return map;
  }, [visitaKits]);

  const estados = useMemo(
    () => Array.from(new Set(municipios.map((m) => m.estado))).filter(Boolean).sort(),
    [municipios]
  );

  const cutoffDate = useMemo(() => {
    const now = new Date();
    if (periodoFilter === "30d") now.setDate(now.getDate() - 30);
    else if (periodoFilter === "90d") now.setDate(now.getDate() - 90);
    else if (periodoFilter === "12m") now.setMonth(now.getMonth() - 12);
    else return null;
    return now;
  }, [periodoFilter]);

  const fVisitas = useMemo(() => {
    return visitas.filter((v) => {
      if (cutoffDate && new Date(v.data_visita) < cutoffDate) return false;
      if (estadoFilter !== "todos") {
        const m = v.municipio_id ? municipioMap.get(v.municipio_id) : null;
        if (!m || m.estado !== estadoFilter) return false;
      }
      if (responsavelFilter !== "todos" && v.responsavel_id !== responsavelFilter) return false;
      return true;
    });
  }, [visitas, cutoffDate, estadoFilter, responsavelFilter, municipioMap]);

  const visitaIdsSet = useMemo(() => new Set(fVisitas.map((v) => v.id)), [fVisitas]);
  const fKits = useMemo(
    () => visitaKits.filter((vk) => visitaIdsSet.has(vk.visita_id)),
    [visitaKits, visitaIdsSet]
  );

  // KPIs
  const totalInvestido = useMemo(
    () => fVisitas.reduce((acc, v) => acc + Number(v.custo_total || 0), 0),
    [fVisitas]
  );
  const concluidasComCusto = useMemo(
    () => fVisitas.filter((v) => v.status === "concluída" && Number(v.custo_total) > 0),
    [fVisitas]
  );
  const concluidas = useMemo(
    () => fVisitas.filter((v) => v.status === "concluída"),
    [fVisitas]
  );
  const mediaVisita = concluidasComCusto.length
    ? totalInvestido / concluidasComCusto.length
    : 0;
  const custoMateriais = useMemo(
    () => fKits.reduce((acc, vk) => acc + Number(vk.quantidade) * Number(vk.custo_unitario_snapshot), 0),
    [fKits]
  );
  const custoOperacao = Math.max(0, totalInvestido - custoMateriais);
  const semCusto = concluidas.filter((v) => Number(v.custo_total) === 0).length;

  // Evolução mensal
  const evolucaoMensal = useMemo(() => {
    const map = new Map<string, number>();
    for (const v of fVisitas) {
      const d = new Date(v.data_visita);
      const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, "0")}`;
      map.set(key, (map.get(key) || 0) + Number(v.custo_total || 0));
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, total]) => {
        const [ano, mes] = k.split("-");
        return { mes: `${MESES[Number(mes)]}/${ano.slice(2)}`, total: Math.round(total) };
      });
  }, [fVisitas]);

  // Custo por município (top 10)
  const custoPorMunicipio = useMemo(() => {
    const map = new Map<string, { nome: string; uf: string; total: number; visitas: number }>();
    for (const v of fVisitas) {
      if (!v.municipio_id) continue;
      const m = municipioMap.get(v.municipio_id);
      if (!m) continue;
      const cur = map.get(v.municipio_id) || { nome: m.nome, uf: m.estado, total: 0, visitas: 0 };
      cur.total += Number(v.custo_total || 0);
      cur.visitas += 1;
      map.set(v.municipio_id, cur);
    }
    return Array.from(map.values())
      .filter((x) => x.total > 0)
      .sort((a, b) => b.total - a.total)
      .slice(0, 10)
      .map((x) => ({ ...x, label: `${x.nome}/${x.uf}` }));
  }, [fVisitas, municipioMap]);

  // Custo por tipo
  const custoPorTipo = useMemo(() => {
    const map = new Map<string, number>();
    for (const v of fVisitas) {
      const t = v.tipo || "Outros";
      map.set(t, (map.get(t) || 0) + Number(v.custo_total || 0));
    }
    return Array.from(map.entries())
      .filter(([, v]) => v > 0)
      .map(([name, value]) => ({ name, value: Math.round(value) }));
  }, [fVisitas]);

  // Custo por responsável
  const custoPorResponsavel = useMemo(() => {
    const map = new Map<string, { nome: string; cor: string; total: number }>();
    for (const v of fVisitas) {
      if (!v.responsavel_id) continue;
      const u = usuarioMap.get(v.responsavel_id);
      if (!u) continue;
      const cur = map.get(v.responsavel_id) || { nome: u.nome, cor: u.cor, total: 0 };
      cur.total += Number(v.custo_total || 0);
      map.set(v.responsavel_id, cur);
    }
    return Array.from(map.values())
      .filter((x) => x.total > 0)
      .sort((a, b) => b.total - a.total)
      .map((x) => ({ ...x, total: Math.round(x.total) }));
  }, [fVisitas, usuarioMap]);

  // Composição
  const composicao = totalInvestido > 0
    ? [
        { label: "Materiais e Kits", valor: custoMateriais, pct: (custoMateriais / totalInvestido) * 100 },
        { label: "Operação (logística, mão de obra, outros)", valor: custoOperacao, pct: (custoOperacao / totalInvestido) * 100 },
      ]
    : [];

  // Tabela
  const linhasTabela = useMemo(() => {
    return fVisitas
      .filter((v) => Number(v.custo_total) > 0)
      .map((v) => {
        const m = v.municipio_id ? municipioMap.get(v.municipio_id) : null;
        const u = v.responsavel_id ? usuarioMap.get(v.responsavel_id) : null;
        const kitNames = (kitsPorVisita.get(v.id) || []).map((k) => kitMap.get(k.kit_id)?.nome || "Kit");
        return {
          id: v.id,
          municipio: m ? `${m.nome}/${m.estado}` : "—",
          data: new Date(v.data_visita).toLocaleDateString("pt-BR"),
          tipo: v.tipo,
          responsavel: u?.nome || "—",
          cor: u?.cor || "hsl(var(--muted-foreground))",
          kits: kitNames,
          custo: Number(v.custo_total),
        };
      });
  }, [fVisitas, municipioMap, usuarioMap, kitsPorVisita, kitMap]);

  if (loading) {
    return (
      <div className="p-4 lg:p-6 space-y-4">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-72" />
        <Skeleton className="h-72" />
      </div>
    );
  }

  const kpis = [
    { label: "Total Investido", value: fmt(totalInvestido), icon: DollarSign, color: "text-primary bg-primary/10", sub: `${fVisitas.length} visitas no período` },
    { label: "Média por Visita", value: fmt(mediaVisita), icon: TrendingUp, color: "text-status-visited bg-status-visited/10", sub: `${concluidasComCusto.length} concluídas com custo` },
    { label: "Materiais / Kits", value: fmt(custoMateriais), icon: Package, color: "text-accent-foreground bg-accent/10", sub: `${fKits.length} kits entregues` },
    { label: "Operação", value: fmt(custoOperacao), icon: Users, color: "text-status-planned bg-status-planned/10", sub: "logística e mão de obra" },
  ];

  return (
    <div className="p-4 lg:p-6 space-y-5 animate-fade-in">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Controle Financeiro</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Custos por visita, materiais, responsável e território — dados reais
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Filter className="w-3.5 h-3.5" />
            <span>Filtros:</span>
          </div>
          <Select value={periodoFilter} onValueChange={setPeriodoFilter}>
            <SelectTrigger className="h-8 w-[130px] text-xs">
              <Calendar className="w-3 h-3 mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30d">Últimos 30d</SelectItem>
              <SelectItem value="90d">Últimos 90d</SelectItem>
              <SelectItem value="12m">Últimos 12 meses</SelectItem>
              <SelectItem value="tudo">Tudo</SelectItem>
            </SelectContent>
          </Select>
          <Select value={estadoFilter} onValueChange={setEstadoFilter}>
            <SelectTrigger className="h-8 w-[110px] text-xs">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos UF</SelectItem>
              {estados.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={responsavelFilter} onValueChange={setResponsavelFilter}>
            <SelectTrigger className="h-8 w-[150px] text-xs">
              <SelectValue placeholder="Responsável" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos responsáveis</SelectItem>
              {usuarios.map((u) => <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className="shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0", kpi.color)}>
                <kpi.icon className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="font-display font-bold text-xl text-foreground truncate">{kpi.value}</p>
                <p className="text-[11px] text-muted-foreground">{kpi.label}</p>
                <p className="text-[10px] text-muted-foreground/70 truncate">{kpi.sub}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Alerta sem custo */}
      {semCusto > 0 && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-accent/10 border border-accent/30">
          <AlertCircle className="w-4 h-4 text-accent-foreground flex-shrink-0 mt-0.5" />
          <p className="text-xs text-accent-foreground">
            <strong>{semCusto}</strong> visita{semCusto > 1 ? "s concluídas" : " concluída"} sem custo lançado no período. Registre os custos para ter controle completo da operação.
          </p>
        </div>
      )}

      {/* Evolução mensal */}
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="font-display text-base">Evolução do Investimento Mensal</CardTitle>
        </CardHeader>
        <CardContent>
          {evolucaoMensal.length === 0 ? (
            <p className="text-xs text-muted-foreground py-8 text-center">Sem dados no período</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={evolucaoMensal} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(155, 45%, 22%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(155, 45%, 22%)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="mes" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value: number) => [fmt(value), "Total"]}
                />
                <Area type="monotone" dataKey="total" stroke="hsl(155, 45%, 22%)" strokeWidth={2} fill="url(#colorTotal)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Custo por município */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="font-display text-base">Custo por Município (Top 10)</CardTitle>
          </CardHeader>
          <CardContent>
            {custoPorMunicipio.length === 0 ? (
              <p className="text-xs text-muted-foreground py-8 text-center">Sem dados no período</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={custoPorMunicipio} layout="vertical" margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis dataKey="label" type="category" width={120} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(v: number, _n, p: any) => [`${fmt(v)} (${p.payload.visitas} visita${p.payload.visitas > 1 ? "s" : ""})`, "Total"]}
                  />
                  <Bar dataKey="total" fill="hsl(155, 45%, 32%)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Custo por tipo */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="font-display text-base">Custo por Tipo de Visita</CardTitle>
          </CardHeader>
          <CardContent>
            {custoPorTipo.length === 0 ? (
              <p className="text-xs text-muted-foreground py-8 text-center">Sem dados no período</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={custoPorTipo}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={95}
                    paddingAngle={2}
                  >
                    {custoPorTipo.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => fmt(v)} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Custo por responsável */}
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="font-display text-base">Custo por Responsável</CardTitle>
        </CardHeader>
        <CardContent>
          {custoPorResponsavel.length === 0 ? (
            <p className="text-xs text-muted-foreground py-8 text-center">Sem dados no período</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={custoPorResponsavel} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="nome" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [fmt(v), "Total"]} />
                <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                  {custoPorResponsavel.map((r, i) => (
                    <Cell key={i} fill={r.cor || "hsl(155, 45%, 32%)"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Composição */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="font-display text-base">Composição dos Custos</CardTitle>
        </CardHeader>
        <CardContent>
          {composicao.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center">Sem dados no período</p>
          ) : (
            <div className="space-y-3">
              {composicao.map((c) => (
                <div key={c.label}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-muted-foreground">{c.label}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground">{fmt(c.valor)}</span>
                      <span className="text-muted-foreground">{c.pct.toFixed(0)}%</span>
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
          )}
        </CardContent>
      </Card>

      {/* Tabela */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="font-display text-base">Custo por Visita</CardTitle>
        </CardHeader>
        <CardContent>
          {linhasTabela.length === 0 ? (
            <p className="text-xs text-muted-foreground py-8 text-center">Nenhuma visita com custo lançado no período</p>
          ) : (
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
                  {linhasTabela.map((v) => (
                    <tr key={v.id} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                      <td className="px-3 py-3 font-medium text-foreground">{v.municipio}</td>
                      <td className="px-3 py-3 text-muted-foreground whitespace-nowrap">{v.data}</td>
                      <td className="px-3 py-3 text-muted-foreground text-xs">{v.tipo}</td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1.5">
                          <div
                            className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
                            style={{ background: v.cor }}
                          >
                            {v.responsavel.charAt(0)}
                          </div>
                          <span className="text-xs text-foreground">{v.responsavel}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-xs text-muted-foreground max-w-[200px] truncate">
                        {v.kits.length > 0 ? v.kits.join(", ") : "—"}
                      </td>
                      <td className="px-3 py-3">
                        <span className="font-bold text-primary whitespace-nowrap">{fmt(v.custo)}</span>
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-muted/30 border-t-2 border-border">
                    <td colSpan={5} className="px-3 py-2.5 text-xs font-bold text-foreground uppercase tracking-wide">
                      Total Geral
                    </td>
                    <td className="px-3 py-2.5 font-display font-bold text-lg text-primary whitespace-nowrap">
                      {fmt(totalInvestido)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
