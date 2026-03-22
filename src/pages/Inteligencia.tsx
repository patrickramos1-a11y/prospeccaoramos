import { MUNICIPIOS, VISITAS } from "@/data/mockData";
import { cn } from "@/lib/utils";
import { BarChart3, MapPin, TrendingUp, Award, Target, Eye } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, RadarChart, Radar, PolarGrid, PolarAngleAxis,
} from "recharts";

const STATUS_COLORS: Record<string, string> = {
  "visitado": "hsl(155, 45%, 38%)",
  "em andamento": "hsl(38, 85%, 52%)",
  "planejado": "hsl(220, 70%, 55%)",
  "não iniciado": "hsl(220, 10%, 65%)",
};

const statusData = [
  { name: "Visitados", value: 5, color: STATUS_COLORS["visitado"] },
  { name: "Em Andamento", value: 3, color: STATUS_COLORS["em andamento"] },
  { name: "Planejados", value: 3, color: STATUS_COLORS["planejado"] },
  { name: "Não Iniciados", value: 3, color: STATUS_COLORS["não iniciado"] },
];

const scoreData = MUNICIPIOS
  .filter((m) => m.score > 0)
  .sort((a, b) => b.score - a.score)
  .slice(0, 8)
  .map((m) => ({ municipio: m.nome.split(" ")[0], score: m.score }));

const custoData = MUNICIPIOS
  .filter((m) => m.custoTotal > 0)
  .sort((a, b) => b.custoTotal - a.custoTotal)
  .map((m) => ({ municipio: m.nome.split(" ")[0], custo: m.custoTotal }));

const radarData = [
  { subject: "Abertura", A: 3.4 },
  { subject: "Potencial", A: 3.8 },
  { subject: "Relacionamento", A: 2.9 },
  { subject: "Facilidade", A: 3.1 },
  { subject: "Prioridade", A: 3.5 },
];

export default function Inteligencia() {
  const topMunicipios = MUNICIPIOS.sort((a, b) => b.score - a.score).slice(0, 5);
  const visitados = MUNICIPIOS.filter((m) => m.status === "visitado");
  const avgCusto = VISITAS.filter((v) => v.custo > 0).reduce((acc, v) => acc + v.custo, 0) / VISITAS.filter((v) => v.custo > 0).length;

  return (
    <div className="p-4 lg:p-6 space-y-5 animate-fade-in">
      <div>
        <h1 className="font-display text-2xl font-bold">Inteligência Territorial</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Análise estratégica da operação de prospecção</p>
      </div>

      {/* KPIs analíticos */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Score Médio", value: (MUNICIPIOS.reduce((a, m) => a + m.score, 0) / MUNICIPIOS.length).toFixed(1), icon: Award, color: "text-primary bg-primary/10", sub: "de 20 pts" },
          { label: "Municípios Ativos", value: visitados.length + 3, icon: Target, color: "text-status-visited bg-status-visited/10", sub: "com atuação" },
          { label: "Custo Médio/Visita", value: `R$${avgCusto.toFixed(0)}`, icon: TrendingUp, color: "text-accent-foreground bg-accent/10", sub: "por operação" },
          { label: "Taxa de Abertura", value: "68%", icon: Eye, color: "text-status-planned bg-status-planned/10", sub: "municípios abertos" },
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

      <div className="grid lg:grid-cols-2 gap-5">
        {/* Score por município */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="font-display text-base">Score Estratégico por Município</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={scoreData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="municipio" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} domain={[0, 20]} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: 12,
                  }}
                  labelStyle={{ color: "hsl(var(--foreground))" }}
                />
                <Bar dataKey="score" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Status pie */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="font-display text-base">Distribuição por Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <ResponsiveContainer width={160} height={160}>
                <PieChart>
                  <Pie
                    data={statusData}
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {statusData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2">
                {statusData.map((s) => (
                  <div key={s.name} className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: s.color }} />
                    <span className="text-xs text-muted-foreground">{s.name}</span>
                    <span className="text-xs font-bold text-foreground ml-auto pl-3">{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Custo por município */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="font-display text-base">Custo por Município (R$)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={custoData} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis dataKey="municipio" type="category" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} width={65} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: 11 }} />
                <Bar dataKey="custo" fill="hsl(38 85% 52%)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Radar análise */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="font-display text-base">Perfil Médio Territorial</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center">
            <ResponsiveContainer width="100%" height={200}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="hsl(var(--border))" />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <Radar dataKey="A" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.15} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: 11 }} />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Ranking tabela */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="font-display text-base flex items-center gap-2">
            <Award className="w-4 h-4 text-accent-foreground" />
            Ranking Estratégico de Municípios
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  {["#", "Município", "Score", "Abertura", "Potencial", "Relacionamento", "Custo Total", "Prioridade"].map((h) => (
                    <th key={h} className="text-left px-3 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {MUNICIPIOS.sort((a, b) => b.score - a.score).map((m, i) => (
                  <tr key={m.id} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                    <td className="px-3 py-2.5 text-xs font-bold text-muted-foreground">#{i + 1}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3 h-3 text-muted-foreground" />
                        <span className="font-medium text-foreground">{m.nome}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <div className="w-12 h-1.5 rounded-full bg-muted overflow-hidden">
                          <div className="h-full bg-primary" style={{ width: `${(m.score / 20) * 100}%` }} />
                        </div>
                        <span className="text-xs font-bold text-primary">{m.score}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-center">{m.abertura > 0 ? `${m.abertura}/5` : "—"}</td>
                    <td className="px-3 py-2.5 text-xs text-center">{m.potencial}/5</td>
                    <td className="px-3 py-2.5 text-xs text-center">{m.relacionamento > 0 ? `${m.relacionamento}/5` : "—"}</td>
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
        </CardContent>
      </Card>
    </div>
  );
}
