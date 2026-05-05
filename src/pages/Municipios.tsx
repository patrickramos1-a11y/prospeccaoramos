import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { getStatusClass, getStatusLabel, getScoreLabel } from "@/data/mockData";
import { cn } from "@/lib/utils";
import {
  MapPin, Plus, Search, Star, Users, FileText, DollarSign,
  ChevronRight, Building2, Phone, Mail, ArrowUpRight, Loader2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { toast } from "@/hooks/use-toast";
import { IbgeMunicipioPicker, type MunicipioSelection } from "@/components/IbgeMunicipioPicker";

const STATUS_OPTIONS = ["todos", "visitado", "em andamento", "planejado", "não iniciado"];
const PRIORIDADE_OPTIONS = ["todas", "alta", "média", "baixa"];

type MunicipioRow = {
  id: string;
  nome: string;
  estado: string;
  regiao: string | null;
  ibge_codigo: string | null;
  status: string;
  prioridade: string;
  responsavel: string | null;
  score: number;
  abertura: number;
  potencial: number;
  relacionamento: number;
  facilidade: number;
  ultima_visita: string | null;
  has_cliente: boolean;
};

const formSchema = z.object({
  ibge: z.object({
    nome: z.string().min(1),
    estado: z.string().min(2),
    regiao: z.string(),
    ibge_codigo: z.string(),
  }, { message: "Selecione um município" }),
  status: z.enum(["visitado", "em andamento", "planejado", "não iniciado"]),
  prioridade: z.enum(["alta", "média", "baixa"]),
  responsavel: z.string().max(120).optional(),
  abertura: z.number().min(0).max(5),
  potencial: z.number().min(0).max(5),
  relacionamento: z.number().min(0).max(5),
  facilidade: z.number().min(0).max(5),
});

type FormState = {
  ibge: MunicipioSelection | null;
  status: string;
  prioridade: string;
  responsavel: string;
  abertura: number;
  potencial: number;
  relacionamento: number;
  facilidade: number;
};

const emptyForm: FormState = {
  ibge: null,
  status: "não iniciado",
  prioridade: "média",
  responsavel: "",
  abertura: 0,
  potencial: 0,
  relacionamento: 0,
  facilidade: 0,
};

export default function Municipios() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [prioridadeFilter, setPrioridadeFilter] = useState("todas");
  const [selected, setSelected] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);

  const { data: municipios = [], isLoading } = useQuery({
    queryKey: ["municipios"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("municipios")
        .select("*")
        .order("score", { ascending: false });
      if (error) throw error;
      return data as MunicipioRow[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (state: FormState) => {
      const parsed = formSchema.safeParse(state);
      if (!parsed.success) {
        throw new Error(parsed.error.issues[0]?.message ?? "Dados inválidos");
      }
      const { ibge, ...rest } = parsed.data;
      const score = rest.abertura + rest.potencial + rest.relacionamento + rest.facilidade;
      const { error } = await supabase.from("municipios").insert({
        nome: ibge.nome,
        estado: ibge.estado,
        regiao: ibge.regiao,
        ibge_codigo: ibge.ibge_codigo,
        status: rest.status,
        prioridade: rest.prioridade,
        responsavel: rest.responsavel || null,
        abertura: rest.abertura,
        potencial: rest.potencial,
        relacionamento: rest.relacionamento,
        facilidade: rest.facilidade,
        score,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Município cadastrado", description: "Adicionado ao banco com sucesso." });
      qc.invalidateQueries({ queryKey: ["municipios"] });
      setSheetOpen(false);
      setForm(emptyForm);
    },
    onError: (err: Error) => {
      const msg = err.message.includes("duplicate") || err.message.includes("unique")
        ? "Esse município já está cadastrado."
        : err.message;
      toast({ title: "Erro ao cadastrar", description: msg, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, state }: { id: string; state: FormState }) => {
      const parsed = formSchema.safeParse(state);
      if (!parsed.success) {
        throw new Error(parsed.error.issues[0]?.message ?? "Dados inválidos");
      }
      const { ibge, ...rest } = parsed.data;
      const score = rest.abertura + rest.potencial + rest.relacionamento + rest.facilidade;
      const { error } = await supabase.from("municipios").update({
        nome: ibge.nome,
        estado: ibge.estado,
        regiao: ibge.regiao,
        ibge_codigo: ibge.ibge_codigo,
        status: rest.status,
        prioridade: rest.prioridade,
        responsavel: rest.responsavel || null,
        abertura: rest.abertura,
        potencial: rest.potencial,
        relacionamento: rest.relacionamento,
        facilidade: rest.facilidade,
        score,
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Município atualizado", description: "Alterações salvas com sucesso." });
      qc.invalidateQueries({ queryKey: ["municipios"] });
      setSheetOpen(false);
      setEditingId(null);
      setForm(emptyForm);
    },
    onError: (err: Error) => {
      toast({ title: "Erro ao atualizar", description: err.message, variant: "destructive" });
    },
  });

  const openEdit = (m: MunicipioRow) => {
    setEditingId(m.id);
    setForm({
      ibge: {
        nome: m.nome,
        estado: m.estado,
        regiao: m.regiao ?? "",
        ibge_codigo: m.ibge_codigo ?? "",
      },
      status: m.status,
      prioridade: m.prioridade,
      responsavel: m.responsavel ?? "",
      abertura: m.abertura,
      potencial: m.potencial,
      relacionamento: m.relacionamento,
      facilidade: m.facilidade,
    });
    setSheetOpen(true);
  };

  const filtered = useMemo(() => {
    return municipios.filter((m) => {
      const matchSearch =
        m.nome.toLowerCase().includes(search.toLowerCase()) ||
        (m.regiao ?? "").toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === "todos" || m.status === statusFilter;
      const matchPrioridade = prioridadeFilter === "todas" || m.prioridade === prioridadeFilter;
      return matchSearch && matchStatus && matchPrioridade;
    });
  }, [municipios, search, statusFilter, prioridadeFilter]);

  const selectedM = municipios.find((m) => m.id === selected);
  const previewScore = form.abertura + form.potencial + form.relacionamento + form.facilidade;

  return (
    <div className="flex h-full animate-fade-in">
      {/* List panel */}
      <div className={cn(
        "flex flex-col border-r border-border bg-card",
        selected ? "hidden lg:flex lg:w-[420px] flex-shrink-0" : "flex-1"
      )}>
        <div className="px-4 lg:px-5 py-4 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="font-display text-xl font-bold">Municípios</h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                {filtered.length} de {municipios.length} municípios
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => { setForm(emptyForm); setSheetOpen(true); }}
              className="h-8 text-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              Novo
            </Button>
          </div>

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
                <SelectTrigger className="h-8 text-xs flex-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s} className="text-xs capitalize">
                      {s === "todos" ? "Todos os status" : getStatusLabel(s)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={prioridadeFilter} onValueChange={setPrioridadeFilter}>
                <SelectTrigger className="h-8 text-xs flex-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRIORIDADE_OPTIONS.map((p) => (
                    <SelectItem key={p} value={p} className="text-xs capitalize">
                      {p === "todas" ? "Toda prioridade" : p.charAt(0).toUpperCase() + p.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground px-6 text-center">
              <MapPin className="w-8 h-8 mb-3 opacity-30" />
              <p className="text-sm">
                {municipios.length === 0
                  ? "Nenhum município cadastrado. Clique em \"Novo\" para começar."
                  : "Nenhum município encontrado com esses filtros."}
              </p>
            </div>
          ) : (
            filtered.map((m) => {
              const scoreInfo = getScoreLabel(m.score);
              return (
                <button
                  key={m.id}
                  onClick={() => setSelected(m.id)}
                  className={cn(
                    "w-full text-left px-4 lg:px-5 py-3.5 border-b border-border/50 hover:bg-muted/40 transition-colors",
                    selected === m.id && "bg-primary/5 border-l-2 border-l-primary"
                  )}
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
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {m.regiao ? `${m.regiao} · ` : ""}{m.estado}
                      </p>
                      <div className="flex items-center gap-3 mt-2">
                        <div className="flex items-center gap-1">
                          <div className="w-12 h-1.5 rounded-full bg-muted overflow-hidden">
                            <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${(m.score / 20) * 100}%` }} />
                          </div>
                          <span className={cn("text-[10px] font-bold", scoreInfo.color)}>{m.score}/20</span>
                        </div>
                        <span className="text-[10px] text-muted-foreground capitalize">
                          Prioridade {m.prioridade}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-2" />
                  </div>
                </button>
              );
            })
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
            <div className="flex flex-wrap gap-2">
              <span className={cn("text-xs font-semibold px-3 py-1.5 rounded-full border", getStatusClass(selectedM.status))}>
                {getStatusLabel(selectedM.status)}
              </span>
              <span className="text-xs font-semibold px-3 py-1.5 rounded-full border bg-primary/8 text-primary border-primary/20">
                Prioridade {selectedM.prioridade}
              </span>
              {selectedM.has_cliente && (
                <span className="text-xs font-semibold px-3 py-1.5 rounded-full border bg-accent/10 text-accent-foreground border-accent/30">
                  ✓ Cliente ativo
                </span>
              )}
            </div>

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

            <Card className="shadow-sm border-border/60">
              <CardContent className="p-4 space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Localização</p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Building2 className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-muted-foreground">{selectedM.regiao || "Região não informada"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-muted-foreground">{selectedM.estado}{selectedM.ibge_codigo ? ` · IBGE ${selectedM.ibge_codigo}` : ""}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-border/60">
              <CardContent className="p-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Responsável Interno</p>
                <p className="text-sm font-semibold text-foreground">{selectedM.responsavel ?? "Não atribuído"}</p>
                {selectedM.ultima_visita && (
                  <p className="text-xs text-muted-foreground mt-1">Última visita: {selectedM.ultima_visita}</p>
                )}
              </CardContent>
            </Card>
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

      {/* Cadastro */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Cadastrar Município</SheetTitle>
            <SheetDescription>
              Selecione o estado e busque o município pela base oficial do IBGE.
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-5 py-5">
            <IbgeMunicipioPicker
              value={form.ibge}
              onChange={(ibge) => setForm((f) => ({ ...f, ibge }))}
            />

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Status inicial</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}
                >
                  <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.filter((s) => s !== "todos").map((s) => (
                      <SelectItem key={s} value={s} className="capitalize">{getStatusLabel(s)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Prioridade</Label>
                <Select
                  value={form.prioridade}
                  onValueChange={(v) => setForm((f) => ({ ...f, prioridade: v }))}
                >
                  <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PRIORIDADE_OPTIONS.filter((p) => p !== "todas").map((p) => (
                      <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Responsável interno (opcional)</Label>
              <Input
                value={form.responsavel}
                onChange={(e) => setForm((f) => ({ ...f, responsavel: e.target.value }))}
                placeholder="Nome do responsável"
                maxLength={120}
              />
            </div>

            <div className="space-y-3 rounded-lg border border-border/60 bg-muted/30 p-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Score Estratégico
                </p>
                <span className="text-sm font-bold text-primary">{previewScore}/20</span>
              </div>
              {([
                ["abertura", "Abertura Institucional"],
                ["potencial", "Potencial de Mercado"],
                ["relacionamento", "Qualidade Relacionamento"],
                ["facilidade", "Facilidade Processual"],
              ] as const).map(([key, label]) => (
                <div key={key} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-[11px] text-muted-foreground">{label}</Label>
                    <span className="text-xs font-bold">{form[key]}/5</span>
                  </div>
                  <Slider
                    value={[form[key]]}
                    min={0}
                    max={5}
                    step={1}
                    onValueChange={([v]) => setForm((f) => ({ ...f, [key]: v }))}
                  />
                </div>
              ))}
            </div>
          </div>

          <SheetFooter className="gap-2">
            <Button variant="outline" onClick={() => setSheetOpen(false)}>Cancelar</Button>
            <Button
              onClick={() => createMutation.mutate(form)}
              disabled={!form.ibge || createMutation.isPending}
            >
              {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Cadastrar
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
