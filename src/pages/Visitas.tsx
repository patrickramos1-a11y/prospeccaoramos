import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import {
  CalendarCheck, Plus, Search, ChevronRight, CheckCircle2,
  Clock, User, Package, DollarSign, ArrowRight,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import VisitaFormSheet from "@/components/VisitaFormSheet";
import { toast } from "@/hooks/use-toast";

type Visita = {
  id: string;
  municipio_id: string | null;
  orgao_id: string | null;
  responsavel_id: string | null;
  data_visita: string;
  hora: string | null;
  tipo: string;
  status: string;
  observacoes: string;
  custo_total: number;
  progresso: number;
  municipio?: { nome: string; estado: string } | null;
  orgao?: { nome: string; sigla: string } | null;
  responsavel?: { nome: string; cor: string } | null;
};

type ChecklistItem = {
  id: string;
  visita_id: string;
  step_id: number;
  step_titulo: string;
  item_key: string;
  texto: string;
  feito: boolean;
  ordem: number;
};

type VisitaKit = {
  id: string;
  kit_id: string;
  quantidade: number;
  custo_unitario_snapshot: number;
  kit?: { nome: string } | null;
};

const STATUS_CFG: Record<string, { label: string; cls: string; icon: typeof Clock }> = {
  planejada: { label: "Planejada", cls: "bg-status-planned/15 text-status-planned border-status-planned/30", icon: Clock },
  em_andamento: { label: "Em andamento", cls: "bg-status-in-progress/15 text-status-in-progress border-status-in-progress/30", icon: ArrowRight },
  concluida: { label: "Concluída", cls: "bg-status-visited/15 text-status-visited border-status-visited/30", icon: CheckCircle2 },
  cancelada: { label: "Cancelada", cls: "bg-muted text-muted-foreground border-border", icon: Clock },
};

export default function Visitas() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const { data: visitas = [], isLoading } = useQuery({
    queryKey: ["visitas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("visitas")
        .select("*")
        .order("data_visita", { ascending: false });
      if (error) throw error;
      const visitasRaw = (data ?? []) as Visita[];
      if (!visitasRaw.length) return visitasRaw;

      const munIds = Array.from(new Set(visitasRaw.map((v) => v.municipio_id).filter(Boolean) as string[]));
      const orgIds = Array.from(new Set(visitasRaw.map((v) => v.orgao_id).filter(Boolean) as string[]));
      const respIds = Array.from(new Set(visitasRaw.map((v) => v.responsavel_id).filter(Boolean) as string[]));

      const [muns, orgs, resps] = await Promise.all([
        munIds.length ? supabase.from("municipios").select("id, nome, estado").in("id", munIds) : Promise.resolve({ data: [], error: null }),
        orgIds.length ? supabase.from("orgaos").select("id, nome, sigla").in("id", orgIds) : Promise.resolve({ data: [], error: null }),
        respIds.length ? supabase.from("usuarios").select("id, nome, cor").in("id", respIds) : Promise.resolve({ data: [], error: null }),
      ]);
      const munMap = new Map((muns.data ?? []).map((m: any) => [m.id, m]));
      const orgMap = new Map((orgs.data ?? []).map((o: any) => [o.id, o]));
      const respMap = new Map((resps.data ?? []).map((r: any) => [r.id, r]));

      return visitasRaw.map((v) => ({
        ...v,
        municipio: v.municipio_id ? munMap.get(v.municipio_id) ?? null : null,
        orgao: v.orgao_id ? orgMap.get(v.orgao_id) ?? null : null,
        responsavel: v.responsavel_id ? respMap.get(v.responsavel_id) ?? null : null,
      }));
    },
  });

  const { data: checklist = [] } = useQuery({
    queryKey: ["visita_checklist", selected],
    enabled: !!selected,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("visita_checklist").select("*")
        .eq("visita_id", selected!).order("ordem");
      if (error) throw error;
      return data as ChecklistItem[];
    },
  });

  const { data: visitaKits = [] } = useQuery({
    queryKey: ["visita_kits", selected],
    enabled: !!selected,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("visita_kits").select("*")
        .eq("visita_id", selected!);
      if (error) throw error;
      const items = (data ?? []) as VisitaKit[];
      const ids = Array.from(new Set(items.map((i) => i.kit_id)));
      if (ids.length) {
        const { data: kdata } = await supabase.from("kits").select("id, nome").in("id", ids);
        const kmap = new Map((kdata ?? []).map((k: any) => [k.id, k]));
        return items.map((i) => ({ ...i, kit: kmap.get(i.kit_id) ?? null }));
      }
      return items;
    },
  });

  const toggleItem = useMutation({
    mutationFn: async (item: ChecklistItem) => {
      const novo = !item.feito;
      const { error } = await supabase
        .from("visita_checklist").update({ feito: novo }).eq("id", item.id);
      if (error) throw error;
      const { data: all } = await supabase
        .from("visita_checklist").select("id, feito").eq("visita_id", item.visita_id);
      const total = all?.length ?? 0;
      const done = (all ?? []).filter((x: any) => x.id === item.id ? novo : x.feito).length;
      const pct = total ? Math.round((done / total) * 100) : 0;
      await supabase.from("visitas").update({ progresso: pct }).eq("id", item.visita_id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["visita_checklist", selected] });
      qc.invalidateQueries({ queryKey: ["visitas"] });
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("visitas").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["visitas"] });
      toast({ title: "Status atualizado" });
    },
  });

  const filtered = useMemo(() => visitas.filter((v) => {
    const q = search.toLowerCase();
    return (
      (v.municipio?.nome ?? "").toLowerCase().includes(q) ||
      (v.responsavel?.nome ?? "").toLowerCase().includes(q) ||
      (v.orgao?.nome ?? "").toLowerCase().includes(q)
    );
  }), [visitas, search]);

  const selectedV = visitas.find((v) => v.id === selected);
  const checkPct = useMemo(() => {
    if (!checklist.length) return 0;
    return Math.round((checklist.filter((c) => c.feito).length / checklist.length) * 100);
  }, [checklist]);

  const stepsGrouped = useMemo(() => {
    const map = new Map<number, { titulo: string; itens: ChecklistItem[] }>();
    checklist.forEach((c) => {
      if (!map.has(c.step_id)) map.set(c.step_id, { titulo: c.step_titulo, itens: [] });
      map.get(c.step_id)!.itens.push(c);
    });
    return Array.from(map.entries()).sort(([a], [b]) => a - b);
  }, [checklist]);

  const formatData = (d: string) => {
    try { return format(parseISO(d), "dd/MM/yyyy"); } catch { return d; }
  };

  return (
    <div className="flex h-full animate-fade-in">
      <div className={cn(
        "flex flex-col border-r border-border bg-card",
        selected ? "hidden lg:flex lg:w-[400px] flex-shrink-0" : "flex-1"
      )}>
        <div className="px-4 lg:px-5 py-4 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="font-display text-xl font-bold">Visitas</h1>
              <p className="text-xs text-muted-foreground">{filtered.length} registros</p>
            </div>
            <button
              onClick={() => setSheetOpen(true)}
              className="flex items-center gap-1.5 bg-primary text-primary-foreground px-3 py-2 rounded-lg text-xs font-semibold hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Nova Visita
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar visita..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <p className="p-4 text-sm text-muted-foreground">Carregando...</p>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              Nenhuma visita cadastrada.
            </div>
          ) : (
            ["em_andamento", "planejada", "concluida", "cancelada"].map((statusGroup) => {
              const group = filtered.filter((v) => v.status === statusGroup);
              if (!group.length) return null;
              const cfg = STATUS_CFG[statusGroup];
              return (
                <div key={statusGroup}>
                  <div className="px-4 py-2 bg-muted/40 border-b border-border/40">
                    <span className={cn("text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border", cfg.cls)}>
                      {cfg.label} · {group.length}
                    </span>
                  </div>
                  {group.map((v) => {
                    const Icon = cfg.icon;
                    return (
                      <button
                        key={v.id}
                        onClick={() => setSelected(v.id)}
                        className={cn(
                          "w-full text-left px-4 lg:px-5 py-3.5 border-b border-border/50 hover:bg-muted/40 transition-colors",
                          selected === v.id && "bg-primary/5 border-l-2 border-l-primary"
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0", cfg.cls)}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm text-foreground">{v.municipio?.nome ?? "—"}</p>
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              {v.tipo} · {formatData(v.data_visita)}
                            </p>
                            <div className="flex items-center gap-2 mt-1.5">
                              <User className="w-3 h-3 text-muted-foreground" />
                              <span className="text-[11px] text-muted-foreground">{v.responsavel?.nome ?? "—"}</span>
                              {v.status !== "planejada" && (
                                <>
                                  <span className="text-muted-foreground">·</span>
                                  <div className="flex items-center gap-1">
                                    <div className="w-10 h-1 rounded-full bg-muted overflow-hidden">
                                      <div className="h-full bg-primary rounded-full" style={{ width: `${v.progresso}%` }} />
                                    </div>
                                    <span className="text-[10px] font-medium text-primary">{v.progresso}%</span>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-muted-foreground mt-2 flex-shrink-0" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>
      </div>

      {selected && selectedV ? (
        <div className="flex-1 overflow-y-auto bg-background animate-slide-in">
          <div className="sticky top-0 z-10 bg-card/90 backdrop-blur-sm border-b border-border px-4 lg:px-6 py-3 flex items-center gap-3">
            <button onClick={() => setSelected(null)} className="lg:hidden text-muted-foreground hover:text-foreground">← Voltar</button>
            <div className="flex-1">
              <h2 className="font-display font-bold text-base">{selectedV.municipio?.nome ?? "—"}</h2>
              <p className="text-xs text-muted-foreground">
                {selectedV.tipo} · {formatData(selectedV.data_visita)}{selectedV.hora ? ` · ${selectedV.hora.slice(0,5)}` : ""}
              </p>
            </div>
            <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-full border", STATUS_CFG[selectedV.status]?.cls)}>
              {STATUS_CFG[selectedV.status]?.label}
            </span>
          </div>

          <div className="p-4 lg:p-6 space-y-5">
            <div className="grid grid-cols-3 gap-3">
              <Card className="shadow-sm">
                <CardContent className="p-3 text-center">
                  <User className="w-4 h-4 text-primary mx-auto mb-1" />
                  <p className="text-xs font-semibold text-foreground truncate">{selectedV.responsavel?.nome ?? "—"}</p>
                  <p className="text-[10px] text-muted-foreground">Responsável</p>
                </CardContent>
              </Card>
              <Card className="shadow-sm">
                <CardContent className="p-3 text-center">
                  <Package className="w-4 h-4 text-accent mx-auto mb-1" />
                  <p className="text-xs font-semibold text-foreground">{visitaKits.length || "—"}</p>
                  <p className="text-[10px] text-muted-foreground">Kits</p>
                </CardContent>
              </Card>
              <Card className="shadow-sm">
                <CardContent className="p-3 text-center">
                  <DollarSign className="w-4 h-4 text-status-planned mx-auto mb-1" />
                  <p className="text-xs font-semibold text-foreground">R$ {Number(selectedV.custo_total).toFixed(2)}</p>
                  <p className="text-[10px] text-muted-foreground">Custo</p>
                </CardContent>
              </Card>
            </div>

            {selectedV.orgao && (
              <Card className="shadow-sm">
                <CardContent className="p-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Órgão</p>
                  <p className="text-sm">{selectedV.orgao.sigla ? `${selectedV.orgao.sigla} - ` : ""}{selectedV.orgao.nome}</p>
                </CardContent>
              </Card>
            )}

            {visitaKits.length > 0 && (
              <Card className="shadow-sm">
                <CardContent className="p-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Materiais e Kits</p>
                  <div className="space-y-1.5">
                    {visitaKits.map((k) => (
                      <div key={k.id} className="flex items-center gap-2 text-sm">
                        <Package className="w-3.5 h-3.5 text-accent flex-shrink-0" />
                        <span className="text-foreground flex-1">{k.kit?.nome ?? "Kit"}</span>
                        <span className="text-xs text-muted-foreground">×{k.quantidade}</span>
                        <span className="text-xs font-medium text-primary w-20 text-right">
                          R$ {(Number(k.custo_unitario_snapshot) * k.quantidade).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {selectedV.observacoes && (
              <Card className="shadow-sm">
                <CardContent className="p-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Observações</p>
                  <p className="text-sm whitespace-pre-wrap">{selectedV.observacoes}</p>
                </CardContent>
              </Card>
            )}

            <Card className="shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Roteiro de Campo</p>
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-2 rounded-full bg-muted overflow-hidden">
                      <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${checkPct}%` }} />
                    </div>
                    <span className="text-xs font-bold text-primary">{checkPct}%</span>
                  </div>
                </div>
                <div className="space-y-4">
                  {stepsGrouped.map(([stepId, step]) => {
                    const done = step.itens.filter((i) => i.feito).length;
                    return (
                      <div key={stepId}>
                        <div className="flex items-center gap-2 mb-2">
                          <div className={cn(
                            "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold",
                            done === step.itens.length ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                          )}>
                            {stepId}
                          </div>
                          <p className="text-xs font-semibold text-foreground">{step.titulo}</p>
                          <span className="text-[10px] text-muted-foreground ml-auto">{done}/{step.itens.length}</span>
                        </div>
                        <div className="ml-7 space-y-1.5">
                          {step.itens.map((item) => (
                            <button
                              key={item.id}
                              onClick={() => toggleItem.mutate(item)}
                              className="flex items-center gap-2 w-full text-left group"
                            >
                              <div className={cn(
                                "w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors",
                                item.feito ? "bg-primary border-primary text-primary-foreground" : "border-border group-hover:border-primary/50"
                              )}>
                                {item.feito && <CheckCircle2 className="w-2.5 h-2.5" />}
                              </div>
                              <span className={cn("text-xs transition-colors", item.feito ? "line-through text-muted-foreground" : "text-foreground")}>
                                {item.texto}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {selectedV.status !== "concluida" && selectedV.status !== "cancelada" && (
              <div className="flex gap-3">
                <button
                  onClick={() => updateStatus.mutate({ id: selectedV.id, status: selectedV.status === "planejada" ? "em_andamento" : "em_andamento" })}
                  className="flex-1 bg-primary text-primary-foreground py-2.5 rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors"
                >
                  {selectedV.status === "planejada" ? "Iniciar Visita" : "Continuar Visita"}
                </button>
                <button
                  onClick={() => updateStatus.mutate({ id: selectedV.id, status: "concluida" })}
                  className="flex-1 border border-border bg-card py-2.5 rounded-lg text-sm font-medium hover:bg-muted/50 transition-colors"
                >
                  Concluir
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="hidden lg:flex flex-1 items-center justify-center text-muted-foreground bg-muted/20">
          <div className="text-center">
            <CalendarCheck className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="text-sm font-medium">Selecione uma visita</p>
            <p className="text-xs mt-1">para ver o roteiro de campo</p>
          </div>
        </div>
      )}

      <VisitaFormSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onSaved={(id) => setSelected(id)}
      />
    </div>
  );
}
