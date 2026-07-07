import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { CalendarIcon, Loader2, Plus, X, UserPlus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import UsuarioFormSheet from "@/components/UsuarioFormSheet";

const TIPOS = ["Primeira abordagem", "Coleta documental", "Follow-up", "Entrega", "Apresentação"];

const CHECKLIST_TEMPLATE = [
  { step_id: 1, step_titulo: "Preparação", itens: [
    { item_key: "p1", texto: "Confirmar kit montado" },
    { item_key: "p2", texto: "Conferir material gráfico" },
    { item_key: "p3", texto: "Confirmar rota e endereço" },
  ]},
  { step_id: 2, step_titulo: "Chegada", itens: [
    { item_key: "c1", texto: "Confirmou secretaria correta" },
    { item_key: "c2", texto: "Identificou setor responsável" },
    { item_key: "c3", texto: "Registrou recepção" },
  ]},
  { step_id: 3, step_titulo: "Coleta de Informações", itens: [
    { item_key: "i1", texto: "Solicitou TR (Termo de Referência)" },
    { item_key: "i2", texto: "Solicitou modelo de requerimento" },
    { item_key: "i3", texto: "Solicitou informações sobre taxas" },
    { item_key: "i4", texto: "Entendeu fluxo do licenciamento" },
  ]},
  { step_id: 4, step_titulo: "Relacionamento", itens: [
    { item_key: "r1", texto: "Entregou kit operacional" },
    { item_key: "r2", texto: "Tentou acesso ao secretário" },
    { item_key: "r3", texto: "Registrou nível de receptividade" },
  ]},
  { step_id: 5, step_titulo: "Encerramento", itens: [
    { item_key: "e1", texto: "Registrou observações da visita" },
    { item_key: "e2", texto: "Definiu próximo passo" },
    { item_key: "e3", texto: "Concluiu visita no sistema" },
  ]},
];

type KitSel = { kit_id: string; quantidade: number };

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSaved?: (visitaId: string) => void;
};

export default function VisitaFormSheet({ open, onOpenChange, onSaved }: Props) {
  const qc = useQueryClient();

  const [estado, setEstado] = useState<string>("");
  const [municipioId, setMunicipioId] = useState<string>("");
  const [orgaoId, setOrgaoId] = useState<string>("");
  const [tipo, setTipo] = useState<string>(TIPOS[0]);
  const [data, setData] = useState<Date | undefined>(new Date());
  const [hora, setHora] = useState<string>("");
  const [responsavelId, setResponsavelId] = useState<string>("");
  const [kits, setKits] = useState<KitSel[]>([]);
  const [observacoes, setObservacoes] = useState<string>("");
  const [usuarioSheetOpen, setUsuarioSheetOpen] = useState(false);

  useEffect(() => {
    if (open) {
      setEstado(""); setMunicipioId(""); setOrgaoId("");
      setTipo(TIPOS[0]); setData(new Date()); setHora("");
      setResponsavelId(""); setKits([]); setObservacoes("");
    }
  }, [open]);

  const { data: municipios = [] } = useQuery({
    queryKey: ["municipios", "opts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("municipios").select("id, nome, estado").order("nome");
      if (error) throw error;
      return data as { id: string; nome: string; estado: string }[];
    },
  });

  const estados = useMemo(() => {
    const s = new Set(municipios.map((m) => m.estado).filter(Boolean));
    return Array.from(s).sort();
  }, [municipios]);

  const municipiosFiltrados = useMemo(
    () => municipios.filter((m) => !estado || m.estado === estado),
    [municipios, estado],
  );

  const { data: orgaos = [] } = useQuery({
    queryKey: ["orgaos", "opts", municipioId],
    enabled: !!municipioId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orgaos").select("id, nome, sigla")
        .eq("municipio_id", municipioId).order("nome");
      if (error) throw error;
      return data as { id: string; nome: string; sigla: string }[];
    },
  });

  const { data: usuarios = [] } = useQuery({
    queryKey: ["usuarios", "ativos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("usuarios").select("id, nome, cargo, cor").eq("ativo", true).order("nome");
      if (error) throw error;
      return data as { id: string; nome: string; cargo: string; cor: string }[];
    },
  });

  const { data: kitsCatalog = [] } = useQuery({
    queryKey: ["kits", "catalog-com-custo"],
    queryFn: async () => {
      const { data: ks, error } = await supabase
        .from("kits").select("id, nome, disponiveis, ativo").eq("ativo", true).order("nome");
      if (error) throw error;
      const { data: items, error: e2 } = await supabase
        .from("kit_itens").select("kit_id, quantidade, item_id");
      if (e2) throw e2;
      const itemIds = Array.from(new Set((items ?? []).map((i) => i.item_id)));
      let custosMap = new Map<string, number>();
      if (itemIds.length) {
        const { data: estoque, error: e3 } = await supabase
          .from("estoque_itens").select("id, custo_unitario").in("id", itemIds);
        if (e3) throw e3;
        custosMap = new Map((estoque ?? []).map((e) => [e.id, Number(e.custo_unitario) || 0]));
      }
      const custoPorKit = new Map<string, number>();
      (items ?? []).forEach((it) => {
        const c = (custosMap.get(it.item_id) ?? 0) * (it.quantidade ?? 0);
        custoPorKit.set(it.kit_id, (custoPorKit.get(it.kit_id) ?? 0) + c);
      });
      return (ks ?? []).map((k) => ({
        ...k, custo_unitario: custoPorKit.get(k.id) ?? 0,
      })) as { id: string; nome: string; disponiveis: number; custo_unitario: number }[];
    },
  });

  const custoTotal = useMemo(
    () => kits.reduce((acc, k) => {
      const cat = kitsCatalog.find((c) => c.id === k.kit_id);
      return acc + (cat?.custo_unitario ?? 0) * k.quantidade;
    }, 0),
    [kits, kitsCatalog],
  );

  const addKit = () => setKits([...kits, { kit_id: "", quantidade: 1 }]);
  const removeKit = (i: number) => setKits(kits.filter((_, idx) => idx !== i));
  const updateKit = (i: number, patch: Partial<KitSel>) =>
    setKits(kits.map((k, idx) => idx === i ? { ...k, ...patch } : k));

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!municipioId) throw new Error("Selecione o município.");
      if (!orgaoId) throw new Error("Selecione o órgão.");
      if (!data) throw new Error("Selecione a data.");
      if (!responsavelId) throw new Error("Selecione o responsável.");

      const payload = {
        municipio_id: municipioId,
        orgao_id: orgaoId,
        responsavel_id: responsavelId,
        data_visita: format(data, "yyyy-MM-dd"),
        hora: hora || null,
        tipo,
        status: "planejada",
        observacoes: observacoes.trim(),
        custo_total: custoTotal,
        progresso: 0,
      };
      const { data: v, error } = await supabase
        .from("visitas").insert(payload).select("id").single();
      if (error) throw error;
      const visitaId = v.id as string;

      const validKits = kits.filter((k) => k.kit_id);
      if (validKits.length) {
        const rows = validKits.map((k) => {
          const cat = kitsCatalog.find((c) => c.id === k.kit_id);
          return {
            visita_id: visitaId,
            kit_id: k.kit_id,
            quantidade: k.quantidade,
            custo_unitario_snapshot: cat?.custo_unitario ?? 0,
          };
        });
        const { error: ek } = await supabase.from("visita_kits").insert(rows);
        if (ek) throw ek;
      }

      const checklistRows: Array<{
        visita_id: string; step_id: number; step_titulo: string;
        item_key: string; texto: string; ordem: number;
      }> = [];
      let ordem = 0;
      CHECKLIST_TEMPLATE.forEach((s) => {
        s.itens.forEach((i) => {
          checklistRows.push({
            visita_id: visitaId,
            step_id: s.step_id,
            step_titulo: s.step_titulo,
            item_key: i.item_key,
            texto: i.texto,
            ordem: ordem++,
          });
        });
      });
      const { error: ec } = await supabase.from("visita_checklist").insert(checklistRows);
      if (ec) throw ec;

      return visitaId;
    },
    onSuccess: (id) => {
      toast({ title: "Visita cadastrada" });
      qc.invalidateQueries({ queryKey: ["visitas"] });
      onOpenChange(false);
      onSaved?.(id);
    },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto bg-background">
        <SheetHeader>
          <SheetTitle>Nova visita</SheetTitle>
          <SheetDescription>Cadastre uma visita de campo a um órgão municipal.</SheetDescription>
        </SheetHeader>

        <div className="space-y-4 mt-5">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-xs">Estado *</Label>
              <Select value={estado} onValueChange={(v) => { setEstado(v); setMunicipioId(""); setOrgaoId(""); }}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="UF" /></SelectTrigger>
                <SelectContent>
                  {estados.map((e) => <SelectItem key={e} value={e} className="text-sm">{e}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Município *</Label>
              <Select
                value={municipioId}
                onValueChange={(v) => { setMunicipioId(v); setOrgaoId(""); }}
                disabled={!estado}
              >
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {municipiosFiltrados.map((m) => (
                    <SelectItem key={m.id} value={m.id} className="text-sm">{m.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Órgão *</Label>
            <Select value={orgaoId} onValueChange={setOrgaoId} disabled={!municipioId}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder={municipioId ? "Selecione" : "Escolha o município primeiro"} />
              </SelectTrigger>
              <SelectContent>
                {orgaos.length === 0 ? (
                  <div className="px-2 py-1.5 text-xs text-muted-foreground">Nenhum órgão cadastrado.</div>
                ) : orgaos.map((o) => (
                  <SelectItem key={o.id} value={o.id} className="text-sm">
                    {o.sigla ? `${o.sigla} - ` : ""}{o.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-xs">Tipo</Label>
              <Select value={tipo} onValueChange={setTipo}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TIPOS.map((t) => <SelectItem key={t} value={t} className="text-sm">{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Data *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("h-9 text-xs justify-start w-full font-normal", !data && "text-muted-foreground")}>
                    <CalendarIcon className="w-3.5 h-3.5 mr-1.5" />
                    {data ? format(data, "dd/MM/yyyy") : "Selecione"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={data} onSelect={setData} initialFocus className={cn("p-3 pointer-events-auto")} />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-xs">Hora (opcional)</Label>
              <Input type="time" value={hora} onChange={(e) => setHora(e.target.value)} className="h-9 text-sm" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Responsável *</Label>
                <button
                  type="button"
                  onClick={() => setUsuarioSheetOpen(true)}
                  className="text-[10px] text-primary hover:underline flex items-center gap-0.5"
                >
                  <UserPlus className="w-3 h-3" /> Novo
                </button>
              </div>
              <Select value={responsavelId} onValueChange={setResponsavelId}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {usuarios.length === 0 ? (
                    <div className="px-2 py-1.5 text-xs text-muted-foreground">Cadastre um usuário</div>
                  ) : usuarios.map((u) => (
                    <SelectItem key={u.id} value={u.id} className="text-sm">{u.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Kits</Label>
              <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={addKit}>
                <Plus className="w-3 h-3 mr-1" /> Adicionar
              </Button>
            </div>
            {kits.length === 0 ? (
              <p className="text-[11px] text-muted-foreground">Nenhum kit selecionado.</p>
            ) : (
              <div className="space-y-2">
                {kits.map((k, i) => {
                  const cat = kitsCatalog.find((c) => c.id === k.kit_id);
                  return (
                    <div key={i} className="flex items-end gap-2 rounded-lg border border-border/60 p-2">
                      <div className="flex-1">
                        <Select value={k.kit_id} onValueChange={(v) => updateKit(i, { kit_id: v })}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecione kit" /></SelectTrigger>
                          <SelectContent>
                            {kitsCatalog.map((c) => (
                              <SelectItem key={c.id} value={c.id} className="text-xs">
                                {c.nome} · R$ {c.custo_unitario.toFixed(2)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Input
                        type="number" min={1} value={k.quantidade}
                        onChange={(e) => updateKit(i, { quantidade: Math.max(1, Number(e.target.value) || 1) })}
                        className="h-8 text-xs w-16"
                      />
                      <div className="text-[11px] text-muted-foreground w-16 text-right">
                        R$ {((cat?.custo_unitario ?? 0) * k.quantidade).toFixed(2)}
                      </div>
                      <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => removeKit(i)}>
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  );
                })}
                <div className="flex justify-between items-center pt-1 px-1 text-xs font-semibold">
                  <span className="text-muted-foreground">Custo total</span>
                  <span className="text-primary">R$ {custoTotal.toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Observações</Label>
            <Textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              rows={3}
              className="text-sm resize-none"
            />
          </div>
        </div>

        <SheetFooter className="mt-6 gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="h-9 text-xs">Cancelar</Button>
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="h-9 text-xs">
            {saveMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Cadastrar visita
          </Button>
        </SheetFooter>

        <UsuarioFormSheet
          open={usuarioSheetOpen}
          onOpenChange={setUsuarioSheetOpen}
          onSaved={(id) => {
            qc.invalidateQueries({ queryKey: ["usuarios", "ativos"] });
            setResponsavelId(id);
          }}
        />
      </SheetContent>
    </Sheet>
  );
}
