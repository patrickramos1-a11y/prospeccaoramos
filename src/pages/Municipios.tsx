import { useState } from "react";
import { MUNICIPIOS, getStatusClass, getStatusLabel, getScoreLabel } from "@/data/mockData";
import { cn } from "@/lib/utils";
import {
  MapPin, Plus, Search, Filter, Star, Users, FileText, DollarSign,
  ChevronRight, Building2, Phone, Mail, ArrowUpRight
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

const STATUS_OPTIONS = ["todos", "visitado", "em andamento", "planejado", "não iniciado"];
const PRIORIDADE_OPTIONS = ["todas", "alta", "média", "baixa"];

export default function Municipios() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [prioridadeFilter, setPrioridadeFilter] = useState("todas");
  const [selected, setSelected] = useState<number | null>(null);

  const filtered = MUNICIPIOS.filter((m) => {
    const matchSearch = m.nome.toLowerCase().includes(search.toLowerCase()) ||
      m.regiao.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "todos" || m.status === statusFilter;
    const matchPrioridade = prioridadeFilter === "todas" || m.prioridade === prioridadeFilter;
    return matchSearch && matchStatus && matchPrioridade;
  }).sort((a, b) => b.score - a.score);

  const selectedM = MUNICIPIOS.find((m) => m.id === selected);

  return (
    <div className="flex h-full animate-fade-in">
      {/* List panel */}
      <div className={cn(
        "flex flex-col border-r border-border bg-card",
        selected ? "hidden lg:flex lg:w-[420px] flex-shrink-0" : "flex-1"
      )}>
        {/* Header */}
        <div className="px-4 lg:px-5 py-4 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="font-display text-xl font-bold">Municípios</h1>
              <p className="text-xs text-muted-foreground mt-0.5">{filtered.length} de {MUNICIPIOS.length} municípios</p>
            </div>
            <button className="flex items-center gap-1.5 bg-primary text-primary-foreground px-3 py-2 rounded-lg text-xs font-semibold hover:bg-primary/90 transition-colors shadow-sm">
              <Plus className="w-3.5 h-3.5" />
              Novo
            </button>
          </div>

          {/* Filters */}
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar município ou região..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
            </div>
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-8 text-xs flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s} className="text-xs capitalize">{s === "todos" ? "Todos os status" : getStatusLabel(s)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={prioridadeFilter} onValueChange={setPrioridadeFilter}>
                <SelectTrigger className="h-8 text-xs flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORIDADE_OPTIONS.map((p) => (
                    <SelectItem key={p} value={p} className="text-xs capitalize">{p === "todas" ? "Toda prioridade" : p.charAt(0).toUpperCase() + p.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {filtered.map((m, i) => {
            const scoreInfo = getScoreLabel(m.score);
            return (
              <button
                key={m.id}
                onClick={() => setSelected(m.id)}
                className={cn(
                  "w-full text-left px-4 lg:px-5 py-3.5 border-b border-border/50 hover:bg-muted/40 transition-colors",
                  selected === m.id && "bg-primary/5 border-l-2 border-l-primary"
                )}
                style={{ animationDelay: `${i * 30}ms` }}
              >
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <MapPin className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-sm text-foreground truncate">{m.nome}</p>
                      <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded border flex-shrink-0", getStatusClass(m.status))}>
                        {getStatusLabel(m.status)}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{m.regiao} · {m.estado}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <div className="flex items-center gap-1">
                        <div className="w-12 h-1.5 rounded-full bg-muted overflow-hidden">
                          <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${(m.score / 20) * 100}%` }} />
                        </div>
                        <span className={cn("text-[10px] font-bold", scoreInfo.color)}>{m.score}/20</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Users className="w-3 h-3" />{m.contatos}
                      </span>
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <FileText className="w-3 h-3" />{m.documentos}
                      </span>
                      {m.custoTotal > 0 && (
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <DollarSign className="w-3 h-3" />R${m.custoTotal}
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-2" />
                </div>
              </button>
            );
          })}
          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <MapPin className="w-8 h-8 mb-3 opacity-30" />
              <p className="text-sm">Nenhum município encontrado</p>
            </div>
          )}
        </div>
      </div>

      {/* Detail panel */}
      {selected && selectedM ? (
        <div className="flex-1 overflow-y-auto bg-background animate-slide-in">
          <div className="sticky top-0 z-10 bg-card/90 backdrop-blur-sm border-b border-border px-4 lg:px-6 py-3 flex items-center gap-3">
            <button
              onClick={() => setSelected(null)}
              className="lg:hidden text-muted-foreground hover:text-foreground"
            >
              ← Voltar
            </button>
            <h2 className="font-display font-bold text-lg text-foreground flex-1">{selectedM.nome}</h2>
            <button className="text-xs flex items-center gap-1 text-primary font-medium hover:underline">
              Editar <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>

          <div className="p-4 lg:p-6 space-y-5">
            {/* Status & Score */}
            <div className="flex flex-wrap gap-2">
              <span className={cn("text-xs font-semibold px-3 py-1.5 rounded-full border", getStatusClass(selectedM.status))}>
                {getStatusLabel(selectedM.status)}
              </span>
              <span className="text-xs font-semibold px-3 py-1.5 rounded-full border bg-primary/8 text-primary border-primary/20">
                Prioridade {selectedM.prioridade}
              </span>
              {selectedM.hasCliente && (
                <span className="text-xs font-semibold px-3 py-1.5 rounded-full border bg-accent/10 text-accent-foreground border-accent/30">
                  ✓ Cliente ativo
                </span>
              )}
            </div>

            {/* Score card */}
            <Card className="shadow-sm border-border/60">
              <CardContent className="p-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Score Estratégico</p>
                <div className="flex items-center gap-4 mb-3">
                  <div className="text-3xl font-display font-bold text-primary">{selectedM.score}</div>
                  <div>
                    <p className={cn("font-semibold text-sm", getScoreLabel(selectedM.score).color)}>{getScoreLabel(selectedM.score).label}</p>
                    <p className="text-xs text-muted-foreground">de 20 pontos</p>
                  </div>
                  <div className="flex-1">
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${(selectedM.score / 20) * 100}%` }} />
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: "Abertura Institucional", value: selectedM.abertura },
                    { label: "Potencial de Mercado", value: selectedM.potencial },
                    { label: "Qualidade Relacionamento", value: selectedM.relacionamento },
                    { label: "Facilidade Processual", value: selectedM.facilidade },
                  ].map((c) => (
                    <div key={c.label} className="p-2.5 bg-muted/50 rounded-lg">
                      <p className="text-[10px] text-muted-foreground">{c.label}</p>
                      <div className="flex items-center gap-1 mt-1">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <Star key={n} className={cn("w-3 h-3", n <= c.value ? "fill-accent text-accent" : "text-border")} />
                        ))}
                        <span className="text-xs font-bold text-foreground ml-1">{c.value}/5</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Info grid */}
            <div className="grid grid-cols-3 gap-3">
              <Card className="shadow-sm border-border/60">
                <CardContent className="p-3 text-center">
                  <Users className="w-4 h-4 text-primary mx-auto mb-1" />
                  <p className="font-bold text-lg text-foreground">{selectedM.contatos}</p>
                  <p className="text-[10px] text-muted-foreground">Contatos</p>
                </CardContent>
              </Card>
              <Card className="shadow-sm border-border/60">
                <CardContent className="p-3 text-center">
                  <FileText className="w-4 h-4 text-accent mx-auto mb-1" />
                  <p className="font-bold text-lg text-foreground">{selectedM.documentos}</p>
                  <p className="text-[10px] text-muted-foreground">Documentos</p>
                </CardContent>
              </Card>
              <Card className="shadow-sm border-border/60">
                <CardContent className="p-3 text-center">
                  <DollarSign className="w-4 h-4 text-status-planned mx-auto mb-1" />
                  <p className="font-bold text-base text-foreground">R${selectedM.custoTotal}</p>
                  <p className="text-[10px] text-muted-foreground">Investido</p>
                </CardContent>
              </Card>
            </div>

            {/* Dados da secretaria */}
            <Card className="shadow-sm border-border/60">
              <CardContent className="p-4 space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Secretaria de Meio Ambiente</p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Building2 className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-muted-foreground">Secretaria Municipal de Meio Ambiente</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-muted-foreground">Endereço a confirmar na visita</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-muted-foreground">A coletar</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-muted-foreground">A coletar</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Responsável */}
            <Card className="shadow-sm border-border/60">
              <CardContent className="p-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Responsável Interno</p>
                <p className="text-sm font-semibold text-foreground">{selectedM.responsavel ?? "Não atribuído"}</p>
                {selectedM.ultimaVisita && (
                  <p className="text-xs text-muted-foreground mt-1">Última visita: {selectedM.ultimaVisita}</p>
                )}
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex gap-3">
              <button className="flex-1 bg-primary text-primary-foreground py-2.5 rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors">
                + Nova Visita
              </button>
              <button className="flex-1 border border-border bg-card py-2.5 rounded-lg text-sm font-medium hover:bg-muted/50 transition-colors">
                Ver Histórico
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="hidden lg:flex flex-1 items-center justify-center text-muted-foreground bg-muted/20">
          <div className="text-center">
            <MapPin className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="text-sm font-medium">Selecione um município</p>
            <p className="text-xs mt-1">para ver a ficha completa</p>
          </div>
        </div>
      )}
    </div>
  );
}
