import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import {
  MapPin, CalendarCheck, Users, TrendingUp, AlertTriangle,
  ArrowUpRight, Clock, CheckCircle2, AlertCircle, Boxes,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface Municipio {
  id: string; nome: string; estado: string; status: string; prioridade: string;
  score: number; responsavel: string | null; ultima_visita: string | null;
}
interface Visita {
  id: string; municipio_id: string | null; responsavel_id: string | null;
  status: string; data_visita: string; custo_total: number;
}
interface Contato { id: string; nivel: string; }
interface EstoqueItem { id: string; nome: string; saldo_atual: number; minimo: number; ideal: number; }
interface Kit { id: string; nome: string; disponiveis: number; }
interface Usuario { id: string; nome: string; }

const STATUS_LABELS: Record<string, string> = {
  "visitado": "Visitado",
  "em andamento": "Em Andamento",
  "planejado": "Planejado",
  "não iniciado": "Não Iniciado",
};

const STATUS_CLASSES: Record<string, string> = {
  "visitado": "bg-status-visited/15 text-status-visited border-status-visited/30",
  "em andamento": "bg-status-in-progress/15 text-status-in-progress border-status-in-progress/30",
  "planejado": "bg-status-planned/15 text-status-planned border-status-planned/30",
  "não iniciado": "bg-muted text-muted-foreground border-border",
};

const fmtBRL = (n: number) =>
  `R$ ${Number(n || 0).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`;

export default function Dashboard() {
  const [municipios, setMunicipios] = useState<Municipio[]>([]);
  const [visitas, setVisitas] = useState<Visita[]>([]);
  const [contatos, setContatos] = useState<Contato[]>([]);
  const [estoque, setEstoque] = useState<EstoqueItem[]>([]);
  const [kits, setKits] = useState<Kit[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [horaAtual] = useState(() =>
    new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
  );

  useEffect(() => {
    (async () => {
      const [mRes, vRes, cRes, eRes, kRes, uRes] = await Promise.all([
        supabase.from("municipios").select("id,nome,estado,status,prioridade,score,responsavel,ultima_visita"),
        supabase.from("visitas").select("id,municipio_id,responsavel_id,status,data_visita,custo_total"),
        supabase.from("contatos").select("id,nivel"),
        supabase.from("estoque_itens").select("id,nome,saldo_atual,minimo,ideal"),
        supabase.from("kits").select("id,nome,disponiveis"),
        supabase.from("usuarios").select("id,nome"),
      ]);
      setMunicipios((mRes.data as Municipio[]) || []);
      setVisitas((vRes.data as Visita[]) || []);
      setContatos((cRes.data as Contato[]) || []);
      setEstoque((eRes.data as EstoqueItem[]) || []);
      setKits((kRes.data as Kit[]) || []);
      setUsuarios((uRes.data as Usuario[]) || []);
      setLoading(false);
    })();
  }, []);

  const municipioMap = useMemo(
    () => new Map(municipios.map((m) => [m.id, m])),
    [municipios]
  );
  const usuarioMap = useMemo(
    () => new Map(usuarios.map((u) => [u.id, u])),
    [usuarios]
  );

  const statusCount = useMemo(() => {
    const c: Record<string, number> = { "visitado": 0, "em andamento": 0, "planejado": 0, "não iniciado": 0 };
    for (const m of municipios) {
      const k = (m.status || "não iniciado").toLowerCase();
      c[k] = (c[k] || 0) + 1;
    }
    return c;
  }, [municipios]);

  const hoje = useMemo(() => {
    const d = new Date(); d.setHours(0, 0, 0, 0); return d;
  }, []);
  const inicioMes = useMemo(() => {
    const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0); return d;
  }, []);

  const visitasMes = useMemo(
    () => visitas.filter((v) => new Date(v.data_visita) >= inicioMes),
    [visitas, inicioMes]
  );
  const visitasRealizadas = useMemo(
    () => visitasMes.filter((v) => v.status === "concluída" || v.status === "concluida"),
    [visitasMes]
  );
  const visitasPlanejadas = useMemo(
    () => visitas.filter((v) => v.status === "planejada" || v.status === "em andamento"),
    [visitas]
  );
  const investimentoMes = useMemo(
    () => visitasMes.reduce((acc, v) => acc + Number(v.custo_total || 0), 0),
    [visitasMes]
  );

  const decisores = contatos.filter((c) => c.nivel === "Decisor" || c.nivel === "Alto").length;

  // Alertas calculados
  const visitasVencidas = useMemo(
    () => visitas.filter((v) => v.status === "planejada" && new Date(v.data_visita) < hoje),
    [visitas, hoje]
  );
  const estoqueAlerta = useMemo(
    () => estoque.filter((e) => e.saldo_atual < e.minimo),
    [estoque]
  );
  const municipiosSemContato = useMemo(() => {
    const limite = new Date(); limite.setDate(limite.getDate() - 30);
    return municipios.filter(
      (m) => m.prioridade === "alta" && (!m.ultima_visita || new Date(m.ultima_visita) < limite)
    );
  }, [municipios]);

  const alertas = useMemo(() => {
    const list: { id: string; mensagem: string; urgencia: "alta" | "média" | "baixa"; acao: string; rota: string }[] = [];
    if (visitasVencidas.length > 0) {
      list.push({
        id: "vencidas",
        mensagem: `${visitasVencidas.length} visita${visitasVencidas.length > 1 ? "s" : ""} planejada${visitasVencidas.length > 1 ? "s" : ""} com data vencida`,
        urgencia: "alta",
        acao: "Reagendar",
        rota: "/visitas",
      });
    }
    if (estoqueAlerta.length > 0) {
      list.push({
        id: "estoque",
        mensagem: `${estoqueAlerta.length} ite${estoqueAlerta.length > 1 ? "ns" : "m"} de estoque abaixo do mínimo`,
        urgencia: "alta",
        acao: "Repor",
        rota: "/estoque",
      });
    }
    if (municipiosSemContato.length > 0) {
      list.push({
        id: "sem-contato",
        mensagem: `${municipiosSemContato.length} município${municipiosSemContato.length > 1 ? "s" : ""} de alta prioridade sem visita há +30 dias`,
        urgencia: "média",
        acao: "Planejar",
        rota: "/municipios",
      });
    }
    return list;
  }, [visitasVencidas, estoqueAlerta, municipiosSemContato]);

  const alertasAltos = alertas.filter((a) => a.urgencia === "alta");
  const proximasVisitas = useMemo(
    () => [...visitasPlanejadas].sort((a, b) => a.data_visita.localeCompare(b.data_visita)).slice(0, 4),
    [visitasPlanejadas]
  );
  const topMunicipios = useMemo(
    () => [...municipios].sort((a, b) => b.score - a.score).slice(0, 4),
    [municipios]
  );
  const topKits = useMemo(
    () => [...kits].sort((a, b) => b.disponiveis - a.disponiveis).slice(0, 4),
    [kits]
  );

  if (loading) {
    return (
      <div className="p-4 lg:p-6 space-y-4">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <div className="grid lg:grid-cols-3 gap-4">
          <Skeleton className="h-96 lg:col-span-2" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  const total = municipios.length || 1;
  const kpis = [
    {
      label: "Municípios Cadastrados",
      value: String(municipios.length),
      sub: `${statusCount["visitado"]} visitados · ${statusCount["em andamento"]} em andamento`,
      icon: MapPin,
      color: "text-primary bg-primary/10",
      trend: `${statusCount["planejado"]} planejados`,
    },
    {
      label: "Visitas Realizadas",
      value: String(visitasRealizadas.length),
      sub: `${visitasPlanejadas.length} pendentes este mês`,
      icon: CalendarCheck,
      color: "text-status-visited bg-status-visited/10",
      trend: "Este mês",
    },
    {
      label: "Contatos Cadastrados",
      value: String(contatos.length),
      sub: `${decisores} decisores`,
      icon: Users,
      color: "text-accent-foreground bg-accent/10",
      trend: "Total",
    },
    {
      label: "Investimento do Mês",
      value: fmtBRL(investimentoMes),
      sub: visitasRealizadas.length > 0
        ? `Média ${fmtBRL(investimentoMes / Math.max(visitasRealizadas.length, 1))}/visita`
        : "Sem visitas concluídas",
      icon: TrendingUp,
      color: "text-status-planned bg-status-planned/10",
      trend: "Mês atual",
    },
  ];

  return (
    <div className="p-4 lg:p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Visão Geral</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Prospecção em Secretarias Ambientais — Dados em tempo real
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-card border rounded-lg px-3 py-1.5 shadow-sm">
          <Clock className="w-3.5 h-3.5" />
          <span>Atualizado às {horaAtual}</span>
        </div>
      </div>

      {/* Alertas críticos */}
      {alertasAltos.length > 0 && (
        <div className="flex items-start gap-3 p-3.5 rounded-xl bg-destructive/10 border border-destructive/20">
          <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-destructive">
              {alertasAltos.length} alerta{alertasAltos.length > 1 ? "s" : ""} crítico{alertasAltos.length > 1 ? "s" : ""}
            </p>
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
        {kpis.map((kpi) => (
          <Card key={kpi.label} className="shadow-sm border-border/60 hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0", kpi.color)}>
                  <kpi.icon className="w-4 h-4" />
                </div>
                <span className="text-[10px] text-muted-foreground bg-muted rounded px-1.5 py-0.5 flex-shrink-0">
                  {kpi.trend}
                </span>
              </div>
              <p className="font-display font-bold text-2xl text-foreground mt-3 truncate">{kpi.value}</p>
              <p className="text-xs font-medium text-foreground mt-0.5">{kpi.label}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{kpi.sub}</p>
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
              <Link to="/municipios" className="text-xs text-primary font-medium flex items-center gap-1 hover:underline">
                Ver todos <ArrowUpRight className="w-3 h-3" />
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {municipios.length === 0 ? (
              <p className="text-xs text-muted-foreground py-6 text-center">
                Nenhum município cadastrado ainda. <Link to="/municipios" className="text-primary hover:underline">Cadastrar →</Link>
              </p>
            ) : (
              <>
                <div className="flex rounded-full overflow-hidden h-3 mb-4 bg-muted">
                  <div className="bg-status-visited transition-all" style={{ width: `${(statusCount["visitado"] / total) * 100}%` }} />
                  <div className="bg-status-in-progress transition-all" style={{ width: `${(statusCount["em andamento"] / total) * 100}%` }} />
                  <div className="bg-status-planned transition-all" style={{ width: `${(statusCount["planejado"] / total) * 100}%` }} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: "Visitados", count: statusCount["visitado"], color: "bg-status-visited", desc: "Com histórico" },
                    { label: "Em Andamento", count: statusCount["em andamento"], color: "bg-status-in-progress", desc: "Processo ativo" },
                    { label: "Planejados", count: statusCount["planejado"], color: "bg-status-planned", desc: "Aguardando visita" },
                    { label: "Não Iniciados", count: statusCount["não iniciado"], color: "bg-muted-foreground/40", desc: "Sem atividade" },
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

                <div className="mt-4 space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Top por Score Estratégico
                  </p>
                  {topMunicipios.map((m) => {
                    const statusKey = (m.status || "não iniciado").toLowerCase();
                    return (
                      <div key={m.id} className="flex items-center gap-3 py-2 border-b border-border/40 last:border-0">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{m.nome}/{m.estado}</p>
                          <p className="text-[11px] text-muted-foreground">{m.responsavel || "Sem responsável"}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                            <div className="h-full bg-primary rounded-full" style={{ width: `${(m.score / 20) * 100}%` }} />
                          </div>
                          <span className="text-xs font-bold text-primary w-6 text-right">{m.score}</span>
                        </div>
                        <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full border whitespace-nowrap", STATUS_CLASSES[statusKey])}>
                          {STATUS_LABELS[statusKey] || m.status}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Right column */}
        <div className="space-y-4">
          {/* Próximas visitas */}
          <Card className="shadow-sm border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="font-display text-base flex items-center justify-between">
                <span>Próximas Visitas</span>
                <Link to="/visitas" className="text-xs text-primary font-medium flex items-center gap-1 hover:underline">
                  Ver <ArrowUpRight className="w-3 h-3" />
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {proximasVisitas.length === 0 ? (
                <p className="text-xs text-muted-foreground py-3 text-center">Nenhuma visita agendada</p>
              ) : (
                proximasVisitas.map((v) => {
                  const m = v.municipio_id ? municipioMap.get(v.municipio_id) : null;
                  const u = v.responsavel_id ? usuarioMap.get(v.responsavel_id) : null;
                  const isPlanejada = v.status === "planejada";
                  return (
                    <div key={v.id} className="flex items-start gap-2.5">
                      <div className={cn(
                        "w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5",
                        isPlanejada
                          ? "bg-status-planned/15 text-status-planned"
                          : "bg-status-in-progress/15 text-status-in-progress"
                      )}>
                        {isPlanejada ? <Clock className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-foreground truncate">
                          {m ? `${m.nome}/${m.estado}` : "Município —"}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {new Date(v.data_visita).toLocaleDateString("pt-BR")} · {u?.nome || "—"}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>

          {/* Estoque em alerta */}
          <Card className="shadow-sm border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="font-display text-base flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Boxes className="w-4 h-4 text-destructive" />
                  Estoque Crítico
                </span>
                <Link to="/estoque" className="text-xs text-primary font-medium flex items-center gap-1 hover:underline">
                  Ver <ArrowUpRight className="w-3 h-3" />
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {estoqueAlerta.length === 0 ? (
                <p className="text-xs text-muted-foreground">Nenhum item abaixo do mínimo ✓</p>
              ) : (
                estoqueAlerta.slice(0, 5).map((e) => (
                  <div key={e.id} className="flex items-center gap-2.5">
                    <AlertCircle className="w-3.5 h-3.5 text-destructive flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-foreground truncate">{e.nome}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full bg-destructive rounded-full"
                            style={{ width: `${Math.min((e.saldo_atual / Math.max(e.ideal, 1)) * 100, 100)}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                          {e.saldo_atual}/{e.minimo}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}

              {topKits.length > 0 && (
                <div className="pt-2 border-t border-border/40 mt-2">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-2">Kits Disponíveis</p>
                  {topKits.map((k) => (
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
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Todos os alertas */}
      <Card className="shadow-sm border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="font-display text-base flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-accent-foreground" />
            Alertas e Pendências
          </CardTitle>
        </CardHeader>
        <CardContent>
          {alertas.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center">
              Nenhuma pendência no momento ✓
            </p>
          ) : (
            <div className="space-y-2">
              {alertas.map((a) => (
                <div key={a.id} className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border text-sm",
                  a.urgencia === "alta" ? "bg-destructive/5 border-destructive/20" :
                  a.urgencia === "média" ? "bg-accent/10 border-accent/20" :
                  "bg-muted/60 border-border/40"
                )}>
                  <span className={cn(
                    "w-1.5 h-1.5 rounded-full flex-shrink-0",
                    a.urgencia === "alta" ? "bg-destructive" :
                    a.urgencia === "média" ? "bg-accent" : "bg-muted-foreground"
                  )} />
                  <p className="flex-1 text-foreground">{a.mensagem}</p>
                  <Link to={a.rota} className="text-xs font-medium text-primary hover:underline flex-shrink-0">
                    {a.acao}
                  </Link>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
