import { MUNICIPIOS, VISITAS, ALERTAS, ESTOQUE_ITENS, KITS, getStatusClass, getStatusLabel } from "@/data/mockData";
import { cn } from "@/lib/utils";
import {
  MapPin, CalendarCheck, Users, Package, TrendingUp, AlertTriangle,
  ArrowUpRight, Clock, CheckCircle2, AlertCircle, Boxes
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const kpiData = [
  {
    label: "Municípios Cadastrados",
    value: "12",
    sub: "5 visitados · 3 em andamento",
    icon: MapPin,
    color: "text-primary bg-primary/10",
    trend: "+2 este mês",
  },
  {
    label: "Visitas Realizadas",
    value: "6",
    sub: "3 planejadas · 2 em andamento",
    icon: CalendarCheck,
    color: "text-status-visited bg-status-visited/10",
    trend: "+4 este mês",
  },
  {
    label: "Contatos Coletados",
    value: "21",
    sub: "4 decisores · 8 relevantes",
    icon: Users,
    color: "text-accent bg-accent/10",
    trend: "+8 este mês",
  },
  {
    label: "Investimento Total",
    value: "R$ 2.960",
    sub: "Média R$ 493/visita",
    icon: TrendingUp,
    color: "text-status-planned bg-status-planned/10",
    trend: "Este mês",
  },
];

export default function Dashboard() {
  const alertasAltos = ALERTAS.filter((a) => a.urgencia === "alta");
  const visitasPendentes = VISITAS.filter((v) => v.status === "planejada" || v.status === "em andamento");
  const estoqueAlerta = ESTOQUE_ITENS.filter((e) => e.alerta);

  return (
    <div className="p-4 lg:p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Visão Geral</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Prospecção em Secretarias Ambientais — Pará</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-card border rounded-lg px-3 py-1.5 shadow-sm">
          <Clock className="w-3.5 h-3.5" />
          <span>Atualizado agora</span>
        </div>
      </div>

      {/* Alertas críticos */}
      {alertasAltos.length > 0 && (
        <div className="flex items-start gap-3 p-3.5 rounded-xl bg-destructive/8 border border-destructive/20">
          <AlertTriangle className="w-4.5 h-4.5 text-destructive flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-destructive">{alertasAltos.length} alertas críticos</p>
            <div className="mt-1 space-y-0.5">
              {alertasAltos.map((a) => (
                <p key={a.id} className="text-xs text-destructive/80">{a.mensagem}</p>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        {kpiData.map((kpi) => (
          <Card key={kpi.label} className="shadow-sm border-border/60 hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0", kpi.color)}>
                  <kpi.icon className="w-4.5 h-4.5" />
                </div>
                <span className="text-[10px] text-muted-foreground bg-muted rounded px-1.5 py-0.5 flex-shrink-0">{kpi.trend}</span>
              </div>
              <p className="font-display font-bold text-2xl text-foreground mt-3">{kpi.value}</p>
              <p className="text-xs font-medium text-foreground mt-0.5">{kpi.label}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{kpi.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-4 lg:gap-6">
        {/* Municípios - status breakdown */}
        <Card className="shadow-sm border-border/60 lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="font-display text-base flex items-center justify-between">
              <span>Municípios por Status</span>
              <a href="/municipios" className="text-xs text-primary font-medium flex items-center gap-1 hover:underline">
                Ver todos <ArrowUpRight className="w-3 h-3" />
              </a>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Progress bar visual */}
            <div className="flex rounded-full overflow-hidden h-3 mb-4">
              <div className="bg-status-visited transition-all" style={{ width: `${(5/12)*100}%` }} title="Visitados" />
              <div className="bg-status-in-progress transition-all" style={{ width: `${(3/12)*100}%` }} title="Em andamento" />
              <div className="bg-status-planned transition-all" style={{ width: `${(3/12)*100}%` }} title="Planejados" />
              <div className="bg-status-inactive/40 transition-all flex-1" title="Não iniciados" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "Visitados", count: 5, color: "bg-status-visited", desc: "Com histórico" },
                { label: "Em Andamento", count: 3, color: "bg-status-in-progress", desc: "Processo ativo" },
                { label: "Planejados", count: 3, color: "bg-status-planned", desc: "Aguardando visita" },
                { label: "Não Iniciados", count: 3, color: "bg-status-inactive/50", desc: "Sem atividade" },
              ].map((s) => (
                <div key={s.label} className="flex items-center gap-2.5 p-2.5 rounded-lg bg-muted/50">
                  <div className={cn("w-2.5 h-2.5 rounded-full flex-shrink-0", s.color)} />
                  <div>
                    <p className="text-sm font-semibold text-foreground">{s.count} — {s.label}</p>
                    <p className="text-[11px] text-muted-foreground">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Top municípios */}
            <div className="mt-4 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Top por Score Estratégico</p>
              {MUNICIPIOS.sort((a, b) => b.score - a.score).slice(0, 4).map((m) => (
                <div key={m.id} className="flex items-center gap-3 py-2 border-b border-border/40 last:border-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{m.nome}</p>
                    <p className="text-[11px] text-muted-foreground">{m.responsavel ?? "Sem responsável"}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${(m.score / 20) * 100}%` }} />
                    </div>
                    <span className="text-xs font-bold text-primary w-6 text-right">{m.score}</span>
                  </div>
                  <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full border", getStatusClass(m.status))}>
                    {getStatusLabel(m.status)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Right column */}
        <div className="space-y-4">
          {/* Próximas visitas */}
          <Card className="shadow-sm border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="font-display text-base">Próximas Visitas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {visitasPendentes.slice(0, 4).map((v) => (
                <div key={v.id} className="flex items-start gap-2.5">
                  <div className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5",
                    v.status === "planejada" ? "bg-status-planned/15 text-status-planned" : "bg-status-in-progress/15 text-status-in-progress"
                  )}>
                    {v.status === "planejada"
                      ? <Clock className="w-3 h-3" />
                      : <CheckCircle2 className="w-3 h-3" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">{v.municipio}</p>
                    <p className="text-[10px] text-muted-foreground">{v.data} · {v.responsavel}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Estoque em alerta */}
          <Card className="shadow-sm border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="font-display text-base flex items-center gap-2">
                <Boxes className="w-4 h-4 text-destructive" />
                Estoque Crítico
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {estoqueAlerta.map((e) => (
                <div key={e.id} className="flex items-center gap-2.5">
                  <AlertCircle className="w-3.5 h-3.5 text-destructive flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">{e.nome}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full bg-destructive rounded-full"
                          style={{ width: `${Math.min((e.saldoAtual / e.ideal) * 100, 100)}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-muted-foreground">{e.saldoAtual}/{e.minimo}</span>
                    </div>
                  </div>
                </div>
              ))}

              {/* Kits disponíveis */}
              <div className="pt-2 border-t border-border/40 mt-2">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-2">Kits Disponíveis</p>
                {KITS.map((k) => (
                  <div key={k.id} className="flex justify-between items-center mb-1.5">
                    <p className="text-xs text-foreground truncate flex-1">{k.nome}</p>
                    <span className={cn(
                      "text-xs font-bold ml-2",
                      k.disponiveis < 10 ? "text-destructive" : "text-status-visited"
                    )}>
                      {k.disponiveis} un.
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Todos os alertas */}
      <Card className="shadow-sm border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="font-display text-base flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-accent" />
            Alertas e Pendências
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {ALERTAS.map((a) => (
              <div key={a.id} className={cn(
                "flex items-center gap-3 p-3 rounded-lg border text-sm",
                a.urgencia === "alta" ? "bg-destructive/6 border-destructive/20" :
                a.urgencia === "média" ? "bg-accent/8 border-accent/20" :
                "bg-muted/60 border-border/40"
              )}>
                <span className={cn(
                  "w-1.5 h-1.5 rounded-full flex-shrink-0",
                  a.urgencia === "alta" ? "bg-destructive" :
                  a.urgencia === "média" ? "bg-accent" : "bg-muted-foreground"
                )} />
                <p className="flex-1 text-foreground">{a.mensagem}</p>
                <button className="text-xs font-medium text-primary hover:underline flex-shrink-0">{a.acao}</button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
