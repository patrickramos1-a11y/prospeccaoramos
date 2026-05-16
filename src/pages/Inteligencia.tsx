import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import {
  MapPin, TrendingUp, Award, Target, Eye, Filter, Map as MapIcon, DollarSign, Activity,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, RadarChart, Radar, PolarGrid, PolarAngleAxis,
  ScatterChart, Scatter, ZAxis,
} from "recharts";

interface Municipio {
  id: string; nome: string; estado: string; regiao: string | null;
  score: number; abertura: number; potencial: number; relacionamento: number; facilidade: number;
  status: string; prioridade: string;
}
interface Visita {
  id: string; municipio_id: string | null; status: string; tipo: string;
  custo_total: number; data_visita: string;
}

const STATUS_COLORS: Record<string, string> = {
  concluida: "hsl(155, 45%, 38%)",
  em_andamento: "hsl(38, 85%, 52%)",
  planejada: "hsl(220, 70%, 55%)",
};
const STATUS_LABELS: Record<string, string> = {
  concluida: "Concluídas",
  em_andamento: "Em Andamento",
  planejada: "Planejadas",
};

const tooltipStyle = {
  background: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "8px",
  fontSize: 11,
};

export default function Inteligencia() {
  const [municipios, setMunicipios] = useState<Municipio[]>([]);
  const [visitas, setVisitas] = useState<Visita[]>([]);
  const [loading, setLoading] = useState(true);
  const [estadoFilter, setEstadoFilter] = useState<string>("todos");
  const [periodoFilter, setPeriodoFilter] = useState<string>("tudo");

  useEffect(() => {
    (async () => {
      const [mRes, vRes] = await Promise.all([
        supabase.from("municipios").select("*"),
        supabase.from("visitas").select("*"),
      ]);
      setMunicipios((mRes.data as Municipio[]) || []);
      setVisitas((vRes.data as Visita[]) || []);
      setLoading(false);
    })();
  }, []);

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

  const fMunicipios = useMemo(
    () => municipios.filter((m) => estadoFilter === "todos" || m.estado === estadoFilter),
    [municipios, estadoFilter]
  );

  const fVisitas = useMemo(() => {
    const munIds = new Set(fMunicipios.map((m) => m.id));
    return visitas.filter((v) => {
      if (estadoFilter !== "todos" && (!v.municipio_id || !munIds.has(v.municipio_id))) return false;
      if (cutoffDate && new Date(v.data_visita) < cutoffDate) return false;
      return true;
    });
  }, [visitas, fMunicipios, estadoFilter, cutoffDate]);

  // KPIs
  const kpis = useMemo(() => {
    const scoreMedio = fMunicipios.length
      ? fMunicipios.reduce((a, m) => a + m.score, 0) / fMunicipios.length
      : 0;
    const concluidas = fVisitas.filter((v) => v.status === "concluida").length;
    const planejadas = fVisitas.filter((v) => v.status === "planejada").length;
    const custoTotal = fVisitas.reduce((a, v) => a + Number(v.custo_total || 0), 0);
    const custoMedio = concluidas
      ? fVisitas.filter((v) => v.status === "concluida").reduce((a, v) => a + Number(v.custo_total || 0), 0) / concluidas
      : 0;
    return { scoreMedio, concluidas, planejadas, custoTotal, custoMedio };
  }, [fMunicipios, fVisitas]);

  // Status pie
  const statusData = useMemo(() => {
    return ["planejada", "em_andamento", "concluida"].map((s) => ({
      name: STATUS_LABELS[s],
      value: fVisitas.filter((v) => v.status === s).length,
      color: STATUS_COLORS[s],
    })).filter((d) => d.value > 0);
  }, [fVisitas]);

  // Top score
  const scoreData = useMemo(
    () => fMunicipios
      .filter((m) => m.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map((m) => ({
        municipio: m.nome.length > 10 ? m.nome.slice(0, 10) + "…" : m.nome,
        score: m.score, abertura: m.abertura, potencial: m.potencial,
        relacionamento: m.relacionamento, facilidade: m.facilidade,
      })),
    [fMunicipios]
  );

  // Radar
  const radarData = useMemo(() => {
    if (!fMunicipios.length) return [];
    const avg = (k: keyof Municipio) =>
      fMunicipios.reduce((a, m) => a + Number(m[k] || 0), 0) / fMunicipios.length;
    return [
      { subject: "Abertura", A: Number(avg("abertura").toFixed(2)) },
      { subject: "Potencial", A: Number(avg("potencial").toFixed(2)) },
      { subject: "Relacionamento", A: Number(avg("relacionamento").toFixed(2)) },
      { subject: "Facilidade", A: Number(avg("facilidade").toFixed(2)) },
    ];
  }, [fMunicipios]);

  // Heatmap por UF
  const heatmap = useMemo(() => {
    const byUf: Record<string, { uf: string; count: number; scoreSum: number; visitas: number; custo: number }> = {};
    fMunicipios.forEach((m) => {
      if (!byUf[m.estado]) byUf[m.estado] = { uf: m.estado, count: 0, scoreSum: 0, visitas: 0, custo: 0 };
      byUf[m.estado].count += 1;
      byUf[m.estado].scoreSum += m.score;
    });
    fVisitas.forEach((v) => {
      const m = municipios.find((mu) => mu.id === v.municipio_id);
      if (!m || !byUf[m.estado]) return;
      if (v.status === "concluida") byUf[m.estado].visitas += 1;
      byUf[m.estado].custo += Number(v.custo_total || 0);
    });
    return Object.values(byUf)
      .map((u) => ({ ...u, scoreMedio: u.count ? u.scoreSum / u.count : 0 }))
      .sort((a, b) => b.scoreMedio - a.scoreMedio);
  }, [fMunicipios, fVisitas, municipios]);

  const maxScoreMedio = Math.max(1, ...heatmap.map((h) => h.scoreMedio));

  // Custo por município
  const custoPorMun = useMemo(() => {
    const map: Record<string, number> = {};
    fVisitas.forEach((v) => {
      if (!v.municipio_id) return;
      map[v.municipio_id] = (map[v.municipio_id] || 0) + Number(v.custo_total || 0);
    });
    return Object.entries(map)
      .map(([id, custo]) => {
        const m = municipios.find((mu) => mu.id === id);
        return { municipio: m?.nome.slice(0, 12) || "—", custo: Math.round(custo) };
      })
      .sort((a, b) => b.custo - a.custo)
      .slice(0, 8);
  }, [fVisitas, municipios]);

  // Custo × Score scatter
  const efficiencyData = useMemo(() => {
    const custos: Record<string, number> = {};
    fVisitas.forEach((v) => {
      if (!v.municipio_id) return;
      custos[v.municipio_id] = (custos[v.municipio_id] || 0) + Number(v.custo_total || 0);
    });
    return fMunicipios
      .filter((m) => custos[m.id])
      .map((m) => ({ nome: m.nome, custo: Math.round(custos[m.id]), score: m.score }));
  }, [fVisitas, fMunicipios]);

  // Custo por tipo
  const custoPorTipo = useMemo(() => {
    const map: Record<string, number> = {};
    fVisitas.forEach((v) => {
      map[v.tipo] = (map[v.tipo] || 0) + Number(v.custo_total || 0);
    });
    return Object.entries(map)
      .map(([tipo, custo]) => ({ tipo, custo: Math.round(custo) }))
      .sort((a, b) => b.custo - a.custo);
  }, [fVisitas]);

  // Ranking com nº visitas
  const ranking = useMemo(() => {
    const visitCount: Record<string, number> = {};
    const visitCusto: Record<string, number> = {};
    fVisitas.forEach((v) => {
      if (!v.municipio_id) return;
      visitCount[v.municipio_id] = (visitCount[v.municipio_id] || 0) + 1;
      visitCusto[v.municipio_id] = (visitCusto[v.municipio_id] || 0) + Number(v.custo_total || 0);
    });
    return [...fMunicipios]
      .sort((a, b) => b.score - a.score)
      .map((m) => ({
        ...m,
        nVisitas: visitCount[m.id] || 0,
        custoTotal: Math.round(visitCusto[m.id] || 0),
      }));
  }, [fMunicipios, fVisitas]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const Empty = ({ label }: { label: string }) => (
    <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
      <Activity className="w-8 h-8 opacity-30 mb-2" />
      <p className="text-xs">{label}</p>
    </div>
  );

  return (
    <div className="p-4 lg:p-6 space-y-5 animate-fade-in pb-24">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Inteligência Territorial</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Análise estratégica baseada em dados reais</p>
        </div>
        <div className="flex gap-2">
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-muted-foreground" />
            <Select value={estadoFilter} onValueChange={setEstadoFilter}>
              <SelectTrigger className="h-9 text-xs w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos" className="text-xs">Todos UF</SelectItem>
                {estados.map((e) => (
                  <SelectItem key={e} value={e} className="text-xs">{e}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Select value={periodoFilter} onValueChange={setPeriodoFilter}>
            <SelectTrigger className="h-9 text-xs w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="tudo" className="text-xs">Todo período</SelectItem>
              <SelectItem value="30d" className="text-xs">Últimos 30 dias</SelectItem>
              <SelectItem value="90d" className="text-xs">Últimos 90 dias</SelectItem>
              <SelectItem value="12m" className="text-xs">Últimos 12 meses</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Score Médio", value: kpis.scoreMedio.toFixed(1), sub: "de 20 pts", icon: Award, color: "text-primary bg-primary/10" },
          { label: "Visitas Concluídas", value: kpis.concluidas, sub: `${kpis.planejadas} planejadas`, icon: Target, color: "text-status-visited bg-status-visited/10" },
          { label: "Custo Acumulado", value: `R$ ${kpis.custoTotal.toFixed(0)}`, sub: "investido", icon: DollarSign, color: "text-accent-foreground bg-accent/10" },
          { label: "Custo/Visita", value: `R$ ${kpis.custoMedio.toFixed(0)}`, sub: "média concluída", icon: TrendingUp, color: "text-status-planned bg-status-planned/10" },
        ].map((kpi) => (
          <Card key={kpi.label} className="shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0", kpi.color)}>
                <kpi.icon className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="font-display font-bold text-xl text-foreground truncate">{kpi.value}</p>
                <p className="text-[11px] text-muted-foreground">{kpi.label}</p>
                <p className="text-[10px] text-muted-foreground/70">{kpi.sub}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        {/* Score Top */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2"><CardTitle className="font-display text-base">Top 10 — Score Estratégico</CardTitle></CardHeader>
          <CardContent>
            {scoreData.length ? (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={scoreData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="municipio" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} angle={-25} textAnchor="end" height={50} />
                  <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} domain={[0, 20]} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="score" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <Empty label="Nenhum município com score ainda" />}
          </CardContent>
        </Card>

        {/* Status */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2"><CardTitle className="font-display text-base">Distribuição de Visitas</CardTitle></CardHeader>
          <CardContent>
            {statusData.length ? (
              <div className="flex items-center gap-4">
                <ResponsiveContainer width={170} height={170}>
                  <PieChart>
                    <Pie data={statusData} innerRadius={45} outerRadius={75} paddingAngle={3} dataKey="value">
                      {statusData.map((entry, idx) => <Cell key={idx} fill={entry.color} />)}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2 flex-1">
                  {statusData.map((s) => (
                    <div key={s.name} className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: s.color }} />
                      <span className="text-xs text-muted-foreground">{s.name}</span>
                      <span className="text-xs font-bold text-foreground ml-auto">{s.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : <Empty label="Nenhuma visita cadastrada" />}
          </CardContent>
        </Card>

        {/* Radar */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2"><CardTitle className="font-display text-base">Perfil Médio Territorial</CardTitle></CardHeader>
          <CardContent className="flex items-center justify-center">
            {radarData.length ? (
              <ResponsiveContainer width="100%" height={220}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="hsl(var(--border))" />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                  <Radar dataKey="A" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.2} />
                  <Tooltip contentStyle={tooltipStyle} />
                </RadarChart>
              </ResponsiveContainer>
            ) : <Empty label="Sem dados de scoring" />}
          </CardContent>
        </Card>

        {/* Custo por tipo */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2"><CardTitle className="font-display text-base">Custo por Tipo de Visita</CardTitle></CardHeader>
          <CardContent>
            {custoPorTipo.length ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={custoPorTipo} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="tipo" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} angle={-15} textAnchor="end" height={50} />
                  <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v) => `R$ ${v}`} />
                  <Bar dataKey="custo" fill="hsl(38 85% 52%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <Empty label="Nenhum custo registrado" />}
          </CardContent>
        </Card>
      </div>

      {/* Heatmap por UF */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="font-display text-base flex items-center gap-2">
            <MapIcon className="w-4 h-4 text-primary" />
            Mapa de Calor por Estado
          </CardTitle>
        </CardHeader>
        <CardContent>
          {heatmap.length ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
              {heatmap.map((uf) => {
                const intensity = uf.scoreMedio / maxScoreMedio;
                const opacity = Math.max(0.08, intensity * 0.85);
                return (
                  <div
                    key={uf.uf}
                    className="rounded-xl border border-border p-3 transition-transform hover:scale-[1.02]"
                    style={{ background: `hsl(var(--primary) / ${opacity})` }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-display font-bold text-lg text-foreground">{uf.uf}</span>
                      <span className="text-[10px] text-muted-foreground">{uf.count} mun.</span>
                    </div>
                    <p className="text-xs font-semibold text-foreground mt-1">Score {uf.scoreMedio.toFixed(1)}</p>
                    <div className="flex justify-between mt-1.5">
                      <span className="text-[10px] text-muted-foreground">{uf.visitas} visitas</span>
                      <span className="text-[10px] text-muted-foreground">R$ {uf.custo.toFixed(0)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : <Empty label="Nenhum município cadastrado" />}
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-5">
        {/* Custo por município */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2"><CardTitle className="font-display text-base">Custo por Município (Top 8)</CardTitle></CardHeader>
          <CardContent>
            {custoPorMun.length ? (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={custoPorMun} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis dataKey="municipio" type="category" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} width={80} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v) => `R$ ${v}`} />
                  <Bar dataKey="custo" fill="hsl(38 85% 52%)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <Empty label="Sem custos registrados" />}
          </CardContent>
        </Card>

        {/* Eficiência scatter */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="font-display text-base">Eficiência: Custo × Score</CardTitle>
            <p className="text-[10px] text-muted-foreground">Quadrante superior esquerdo = melhor ROI</p>
          </CardHeader>
          <CardContent>
            {efficiencyData.length ? (
              <ResponsiveContainer width="100%" height={240}>
                <ScatterChart margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" dataKey="custo" name="Custo" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} label={{ value: "Custo (R$)", position: "insideBottom", offset: -2, fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis type="number" dataKey="score" name="Score" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} domain={[0, 20]} />
                  <ZAxis range={[60, 60]} />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    cursor={{ strokeDasharray: "3 3" }}
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const p = payload[0].payload;
                      return (
                        <div className="rounded-lg border border-border bg-card p-2 text-xs">
                          <p className="font-semibold">{p.nome}</p>
                          <p className="text-muted-foreground">Score: {p.score}</p>
                          <p className="text-muted-foreground">Custo: R$ {p.custo}</p>
                        </div>
                      );
                    }}
                  />
                  <Scatter data={efficiencyData} fill="hsl(var(--primary))" />
                </ScatterChart>
              </ResponsiveContainer>
            ) : <Empty label="Precisa de visitas com custo" />}
          </CardContent>
        </Card>
      </div>

      {/* Ranking */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="font-display text-base flex items-center gap-2">
            <Award className="w-4 h-4 text-accent-foreground" />
            Ranking Estratégico de Municípios
          </CardTitle>
        </CardHeader>
        <CardContent>
          {ranking.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    {["#", "Município", "UF", "Score", "Abert.", "Pot.", "Relac.", "Visitas", "Custo", "Prioridade"].map((h) => (
                      <th key={h} className="text-left px-3 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ranking.map((m, i) => (
                    <tr key={m.id} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                      <td className="px-3 py-2.5 text-xs font-bold text-muted-foreground">#{i + 1}</td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-3 h-3 text-muted-foreground" />
                          <span className="font-medium text-foreground">{m.nome}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-xs text-muted-foreground">{m.estado}</td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <div className="w-12 h-1.5 rounded-full bg-muted overflow-hidden">
                            <div className="h-full bg-primary" style={{ width: `${(m.score / 20) * 100}%` }} />
                          </div>
                          <span className="text-xs font-bold text-primary">{m.score}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-xs text-center">{m.abertura > 0 ? `${m.abertura}/5` : "—"}</td>
                      <td className="px-3 py-2.5 text-xs text-center">{m.potencial > 0 ? `${m.potencial}/5` : "—"}</td>
                      <td className="px-3 py-2.5 text-xs text-center">{m.relacionamento > 0 ? `${m.relacionamento}/5` : "—"}</td>
                      <td className="px-3 py-2.5 text-xs text-center">{m.nVisitas}</td>
                      <td className="px-3 py-2.5 text-xs">{m.custoTotal > 0 ? `R$${m.custoTotal}` : "—"}</td>
                      <td className="px-3 py-2.5">
                        <span className={cn(
                          "text-[10px] font-semibold px-2 py-0.5 rounded-full",
                          m.prioridade === "alta" ? "bg-destructive/10 text-destructive" :
                          m.prioridade === "média" ? "bg-accent/10 text-accent-foreground" :
                          "bg-muted text-muted-foreground"
                        )}>
                          {m.prioridade}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <Empty label="Nenhum município cadastrado" />}
        </CardContent>
      </Card>
    </div>
  );
}
