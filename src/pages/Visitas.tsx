import { useState } from "react";
import { VISITAS, getStatusClass, getStatusLabel } from "@/data/mockData";
import { cn } from "@/lib/utils";
import {
  CalendarCheck, Plus, Search, ChevronRight, CheckCircle2,
  Clock, MapPin, User, Package, DollarSign, ArrowRight, X
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

const CHECKLIST_STEPS = [
  {
    id: 1,
    titulo: "Preparação",
    itens: [
      { id: "p1", texto: "Confirmar kit montado", feito: true },
      { id: "p2", texto: "Conferir material gráfico", feito: true },
      { id: "p3", texto: "Confirmar rota e endereço", feito: true },
    ],
  },
  {
    id: 2,
    titulo: "Chegada",
    itens: [
      { id: "c1", texto: "Confirmou secretaria correta", feito: true },
      { id: "c2", texto: "Identificou setor responsável", feito: false },
      { id: "c3", texto: "Registrou recepção", feito: false },
    ],
  },
  {
    id: 3,
    titulo: "Coleta de Informações",
    itens: [
      { id: "i1", texto: "Solicitou TR (Termo de Referência)", feito: false },
      { id: "i2", texto: "Solicitou modelo de requerimento", feito: false },
      { id: "i3", texto: "Solicitou informações sobre taxas", feito: false },
      { id: "i4", texto: "Entendeu fluxo do licenciamento", feito: false },
    ],
  },
  {
    id: 4,
    titulo: "Relacionamento",
    itens: [
      { id: "r1", texto: "Entregou kit operacional", feito: false },
      { id: "r2", texto: "Tentou acesso ao secretário", feito: false },
      { id: "r3", texto: "Registrou nível de receptividade", feito: false },
    ],
  },
  {
    id: 5,
    titulo: "Encerramento",
    itens: [
      { id: "e1", texto: "Registrou observações da visita", feito: false },
      { id: "e2", texto: "Definiu próximo passo", feito: false },
      { id: "e3", texto: "Concluiu visita no sistema", feito: false },
    ],
  },
];

export default function Visitas() {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<number | null>(null);
  const [checkItems, setCheckItems] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    CHECKLIST_STEPS.forEach((s) => s.itens.forEach((i) => { init[i.id] = i.feito; }));
    return init;
  });

  const filtered = VISITAS.filter((v) =>
    v.municipio.toLowerCase().includes(search.toLowerCase()) ||
    v.responsavel.toLowerCase().includes(search.toLowerCase())
  );

  const selectedV = VISITAS.find((v) => v.id === selected);

  const toggleItem = (id: string) => setCheckItems((prev) => ({ ...prev, [id]: !prev[id] }));

  const totalChecked = Object.values(checkItems).filter(Boolean).length;
  const totalItems = Object.values(checkItems).length;
  const checkPct = Math.round((totalChecked / totalItems) * 100);

  return (
    <div className="flex h-full animate-fade-in">
      {/* List */}
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
            <button className="flex items-center gap-1.5 bg-primary text-primary-foreground px-3 py-2 rounded-lg text-xs font-semibold hover:bg-primary/90 transition-colors">
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
          {/* Grouping by status */}
          {["em andamento", "planejada", "concluída"].map((statusGroup) => {
            const group = filtered.filter((v) => v.status === statusGroup);
            if (!group.length) return null;
            return (
              <div key={statusGroup}>
                <div className="px-4 py-2 bg-muted/40 border-b border-border/40">
                  <span className={cn("text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border", getStatusClass(statusGroup))}>
                    {getStatusLabel(statusGroup)} · {group.length}
                  </span>
                </div>
                {group.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => setSelected(v.id)}
                    className={cn(
                      "w-full text-left px-4 lg:px-5 py-3.5 border-b border-border/50 hover:bg-muted/40 transition-colors",
                      selected === v.id && "bg-primary/5 border-l-2 border-l-primary"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
                        v.status === "concluída" ? "bg-status-visited/12 text-status-visited" :
                        v.status === "em andamento" ? "bg-status-in-progress/12 text-status-in-progress" :
                        "bg-status-planned/12 text-status-planned"
                      )}>
                        {v.status === "concluída"
                          ? <CheckCircle2 className="w-4 h-4" />
                          : v.status === "em andamento"
                          ? <ArrowRight className="w-4 h-4" />
                          : <Clock className="w-4 h-4" />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-foreground">{v.municipio}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">{v.tipo} · {v.data}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <User className="w-3 h-3 text-muted-foreground" />
                          <span className="text-[11px] text-muted-foreground">{v.responsavel}</span>
                          {v.status !== "planejada" && (
                            <>
                              <span className="text-muted-foreground">·</span>
                              <div className="flex items-center gap-1">
                                <div className="w-10 h-1 rounded-full bg-muted overflow-hidden">
                                  <div className="h-full bg-primary rounded-full" style={{ width: `${v.checklist}%` }} />
                                </div>
                                <span className="text-[10px] font-medium text-primary">{v.checklist}%</span>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground mt-2 flex-shrink-0" />
                    </div>
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      {/* Detail */}
      {selected && selectedV ? (
        <div className="flex-1 overflow-y-auto bg-background animate-slide-in">
          {/* Header */}
          <div className="sticky top-0 z-10 bg-card/90 backdrop-blur-sm border-b border-border px-4 lg:px-6 py-3 flex items-center gap-3">
            <button onClick={() => setSelected(null)} className="lg:hidden text-muted-foreground hover:text-foreground">
              ← Voltar
            </button>
            <div className="flex-1">
              <h2 className="font-display font-bold text-base">{selectedV.municipio}</h2>
              <p className="text-xs text-muted-foreground">{selectedV.tipo} · {selectedV.data}</p>
            </div>
            <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-full border", getStatusClass(selectedV.status))}>
              {getStatusLabel(selectedV.status)}
            </span>
          </div>

          <div className="p-4 lg:p-6 space-y-5">
            {/* Info cards */}
            <div className="grid grid-cols-3 gap-3">
              <Card className="shadow-sm">
                <CardContent className="p-3 text-center">
                  <User className="w-4 h-4 text-primary mx-auto mb-1" />
                  <p className="text-xs font-semibold text-foreground">{selectedV.responsavel}</p>
                  <p className="text-[10px] text-muted-foreground">Responsável</p>
                </CardContent>
              </Card>
              <Card className="shadow-sm">
                <CardContent className="p-3 text-center">
                  <Package className="w-4 h-4 text-accent mx-auto mb-1" />
                  <p className="text-xs font-semibold text-foreground">{selectedV.kits.length > 0 ? selectedV.kits.length : "—"}</p>
                  <p className="text-[10px] text-muted-foreground">Kits</p>
                </CardContent>
              </Card>
              <Card className="shadow-sm">
                <CardContent className="p-3 text-center">
                  <DollarSign className="w-4 h-4 text-status-planned mx-auto mb-1" />
                  <p className="text-xs font-semibold text-foreground">R${selectedV.custo}</p>
                  <p className="text-[10px] text-muted-foreground">Custo</p>
                </CardContent>
              </Card>
            </div>

            {/* Kits */}
            {selectedV.kits.length > 0 && (
              <Card className="shadow-sm">
                <CardContent className="p-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Materiais e Kits</p>
                  <div className="space-y-1.5">
                    {selectedV.kits.map((k) => (
                      <div key={k} className="flex items-center gap-2 text-sm">
                        <Package className="w-3.5 h-3.5 text-accent flex-shrink-0" />
                        <span className="text-foreground">{k}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Checklist */}
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
                  {CHECKLIST_STEPS.map((step) => {
                    const stepDone = step.itens.filter((i) => checkItems[i.id]).length;
                    return (
                      <div key={step.id}>
                        <div className="flex items-center gap-2 mb-2">
                          <div className={cn(
                            "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold",
                            stepDone === step.itens.length
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-muted-foreground"
                          )}>
                            {step.id}
                          </div>
                          <p className="text-xs font-semibold text-foreground">{step.titulo}</p>
                          <span className="text-[10px] text-muted-foreground ml-auto">{stepDone}/{step.itens.length}</span>
                        </div>
                        <div className="ml-7 space-y-1.5">
                          {step.itens.map((item) => (
                            <button
                              key={item.id}
                              onClick={() => toggleItem(item.id)}
                              className="flex items-center gap-2 w-full text-left group"
                            >
                              <div className={cn(
                                "w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors",
                                checkItems[item.id]
                                  ? "bg-primary border-primary text-primary-foreground"
                                  : "border-border group-hover:border-primary/50"
                              )}>
                                {checkItems[item.id] && <CheckCircle2 className="w-2.5 h-2.5" />}
                              </div>
                              <span className={cn(
                                "text-xs transition-colors",
                                checkItems[item.id] ? "line-through text-muted-foreground" : "text-foreground"
                              )}>
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

            {/* Actions */}
            {selectedV.status !== "concluída" && (
              <div className="flex gap-3">
                <button className="flex-1 bg-primary text-primary-foreground py-2.5 rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors">
                  {selectedV.status === "planejada" ? "Iniciar Visita" : "Continuar Visita"}
                </button>
                <button className="flex-1 border border-border bg-card py-2.5 rounded-lg text-sm font-medium hover:bg-muted/50 transition-colors">
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
    </div>
  );
}
