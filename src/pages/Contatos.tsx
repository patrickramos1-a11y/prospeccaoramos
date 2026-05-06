import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import {
  Users, Search, Phone, Mail, Building2, MessageCircle, Plus, Pencil, Trash2, Loader2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { toast } from "@/hooks/use-toast";

const NIVEL_COLORS: Record<string, string> = {
  "Decisor": "bg-primary/10 text-primary border-primary/20",
  "Relevante": "bg-accent/10 text-accent-foreground border-accent/30",
  "Básico": "bg-muted text-muted-foreground border-border",
};

const NIVEIS = ["Decisor", "Relevante", "Básico"] as const;

type ContatoRow = {
  id: string;
  nome: string;
  cargo: string;
  nivel: string;
  municipio_id: string | null;
  telefone: string;
  email: string;
  whatsapp: boolean;
  observacoes: string;
};

type MunicipioOpt = { id: string; nome: string; estado: string };

type FormState = {
  nome: string;
  cargo: string;
  nivel: string;
  municipio_id: string | null;
  telefone: string;
  email: string;
  whatsapp: boolean;
  observacoes: string;
};

const emptyForm: FormState = {
  nome: "", cargo: "", nivel: "Básico", municipio_id: null,
  telefone: "", email: "", whatsapp: false, observacoes: "",
};

export default function Contatos() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);

  const { data: contatos = [], isLoading } = useQuery({
    queryKey: ["contatos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contatos")
        .select("*")
        .order("nome", { ascending: true });
      if (error) throw error;
      return data as ContatoRow[];
    },
  });

  const { data: municipios = [] } = useQuery({
    queryKey: ["municipios", "opts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("municipios")
        .select("id, nome, estado")
        .order("nome");
      if (error) throw error;
      return data as MunicipioOpt[];
    },
  });

  const munById = useMemo(() => {
    const map = new Map<string, MunicipioOpt>();
    municipios.forEach((m) => map.set(m.id, m));
    return map;
  }, [municipios]);

  const munLabel = (id: string | null) => {
    if (!id) return "—";
    const m = munById.get(id);
    return m ? `${m.nome}/${m.estado}` : "—";
  };

  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    return contatos.filter((c) => {
      const munTxt = munLabel(c.municipio_id).toLowerCase();
      return (
        c.nome.toLowerCase().includes(s) ||
        c.cargo.toLowerCase().includes(s) ||
        munTxt.includes(s)
      );
    });
  }, [contatos, search, munById]);

  const decisores = filtered.filter((c) => c.nivel === "Decisor").length;
  const relevantes = filtered.filter((c) => c.nivel === "Relevante").length;
  const comWpp = filtered.filter((c) => c.whatsapp).length;

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!form.nome.trim()) throw new Error("Informe o nome do contato.");
      const payload = {
        nome: form.nome.trim(),
        cargo: form.cargo.trim(),
        nivel: form.nivel,
        municipio_id: form.municipio_id,
        telefone: form.telefone.trim(),
        email: form.email.trim(),
        whatsapp: form.whatsapp,
        observacoes: form.observacoes.trim(),
      };
      if (editingId) {
        const { error } = await supabase.from("contatos").update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("contatos").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast({ title: editingId ? "Contato atualizado" : "Contato cadastrado" });
      qc.invalidateQueries({ queryKey: ["contatos"] });
      qc.invalidateQueries({ queryKey: ["sidebar", "contatos-count"] });
      setSheetOpen(false);
      setEditingId(null);
      setForm(emptyForm);
    },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("contatos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Contato removido" });
      qc.invalidateQueries({ queryKey: ["contatos"] });
      qc.invalidateQueries({ queryKey: ["sidebar", "contatos-count"] });
    },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setSheetOpen(true);
  };

  const openEdit = (c: ContatoRow) => {
    setEditingId(c.id);
    setForm({
      nome: c.nome, cargo: c.cargo, nivel: c.nivel,
      municipio_id: c.municipio_id, telefone: c.telefone, email: c.email,
      whatsapp: c.whatsapp, observacoes: c.observacoes,
    });
    setSheetOpen(true);
  };

  return (
    <div className="p-4 lg:p-6 space-y-5 animate-fade-in">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold">Contatos Institucionais</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {decisores} decisores · {relevantes} relevantes · {filtered.length} total
          </p>
        </div>
        <Button onClick={openCreate} size="sm" className="h-9 text-xs">
          <Plus className="w-3.5 h-3.5" /> Novo Contato
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Decisores", count: decisores, color: "text-primary bg-primary/8 border-primary/15" },
          { label: "Relevantes", count: relevantes, color: "text-accent-foreground bg-accent/8 border-accent/20" },
          { label: "Com WhatsApp", count: comWpp, color: "text-status-visited bg-status-visited/8 border-status-visited/15" },
        ].map((s) => (
          <Card key={s.label} className={cn("shadow-sm border", s.color.split(" ").at(-1))}>
            <CardContent className="p-3 text-center">
              <p className={cn("font-display font-bold text-2xl", s.color.split(" ")[0])}>{s.count}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome, cargo ou município..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 h-9 text-sm"
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {filtered.map((c) => (
            <Card key={c.id} className="shadow-sm border-border/60 hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-primary">
                      {c.nome.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold text-sm text-foreground truncate">{c.nome}</p>
                      <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full border flex-shrink-0", NIVEL_COLORS[c.nivel] ?? NIVEL_COLORS["Básico"])}>
                        {c.nivel}
                      </span>
                    </div>
                    {c.cargo && <p className="text-xs text-muted-foreground truncate">{c.cargo}</p>}
                    <div className="flex items-center gap-1 mt-0.5">
                      <Building2 className="w-3 h-3 text-muted-foreground" />
                      <span className="text-[11px] text-muted-foreground">{munLabel(c.municipio_id)}</span>
                    </div>
                  </div>
                </div>
                <div className="mt-3 space-y-1.5">
                  {c.telefone && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Phone className="w-3.5 h-3.5 flex-shrink-0" />
                      <a href={`tel:${c.telefone}`} className="hover:text-primary transition-colors truncate">{c.telefone}</a>
                      {c.whatsapp && (
                        <span className="ml-auto bg-status-visited/12 text-status-visited text-[10px] px-1.5 rounded">WhatsApp</span>
                      )}
                    </div>
                  )}
                  {c.email && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                      <a href={`mailto:${c.email}`} className="hover:text-primary transition-colors truncate">{c.email}</a>
                    </div>
                  )}
                </div>
                <div className="mt-3 pt-3 border-t border-border/40 flex items-center gap-2">
                  <button
                    onClick={() => openEdit(c)}
                    className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors py-1.5 rounded-md hover:bg-muted/60"
                  >
                    <Pencil className="w-3.5 h-3.5" /> Editar
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Excluir contato "${c.nome}"?`)) deleteMutation.mutate(c.id);
                    }}
                    className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium text-destructive/80 hover:text-destructive transition-colors py-1.5 rounded-md hover:bg-destructive/10"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Excluir
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!isLoading && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Users className="w-8 h-8 mb-3 opacity-30" />
          <p className="text-sm">Nenhum contato encontrado</p>
          <Button onClick={openCreate} variant="outline" size="sm" className="mt-3 h-8 text-xs">
            <Plus className="w-3.5 h-3.5" /> Cadastrar primeiro contato
          </Button>
        </div>
      )}

      <Sheet
        open={sheetOpen}
        onOpenChange={(o) => {
          setSheetOpen(o);
          if (!o) { setEditingId(null); setForm(emptyForm); }
        }}
      >
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editingId ? "Editar contato" : "Novo contato"}</SheetTitle>
            <SheetDescription>
              {editingId ? "Atualize os dados do contato." : "Cadastre um contato institucional."}
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-4 mt-5">
            <div className="space-y-2">
              <Label className="text-xs">Nome *</Label>
              <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} className="h-9 text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs">Cargo</Label>
                <Input value={form.cargo} onChange={(e) => setForm({ ...form, cargo: e.target.value })} className="h-9 text-sm" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Nível</Label>
                <Select value={form.nivel} onValueChange={(v) => setForm({ ...form, nivel: v })}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {NIVEIS.map((n) => <SelectItem key={n} value={n} className="text-sm">{n}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Município</Label>
              <Select
                value={form.municipio_id ?? "__none__"}
                onValueChange={(v) => setForm({ ...form, municipio_id: v === "__none__" ? null : v })}
              >
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__" className="text-sm text-muted-foreground">Sem município</SelectItem>
                  {municipios.map((m) => (
                    <SelectItem key={m.id} value={m.id} className="text-sm">
                      {m.nome}/{m.estado}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {municipios.length === 0 && (
                <p className="text-[11px] text-muted-foreground">Cadastre um município antes para vincular.</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs">Telefone</Label>
                <Input value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} className="h-9 text-sm" placeholder="(00) 00000-0000" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Email</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="h-9 text-sm" />
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2">
              <div>
                <Label className="text-xs">WhatsApp</Label>
                <p className="text-[11px] text-muted-foreground">Telefone disponível no WhatsApp</p>
              </div>
              <Switch checked={form.whatsapp} onCheckedChange={(v) => setForm({ ...form, whatsapp: v })} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Observações</Label>
              <Textarea
                value={form.observacoes}
                onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
                rows={3}
                className="text-sm resize-none"
              />
            </div>
          </div>

          <SheetFooter className="mt-6 gap-2">
            <Button variant="outline" onClick={() => setSheetOpen(false)} className="h-9 text-xs">Cancelar</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="h-9 text-xs">
              {saveMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {editingId ? "Salvar alterações" : "Cadastrar"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
