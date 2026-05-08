import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import {
  Landmark, Plus, Search, MapPin, Users, Phone, Mail,
  Pencil, Trash2, Loader2, Check, MessageCircle, UserPlus, Building2, FileText,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import ContatoFormSheet from "@/components/ContatoFormSheet";

const ESTADOS_BR = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB",
  "PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
];

type OrgaoRow = {
  id: string;
  nome: string;
  sigla: string;
  tipo: string;
  estado: string;
  municipio_id: string | null;
  endereco: string;
  telefone: string;
  email: string;
  observacoes: string;
};

type MunicipioOpt = { id: string; nome: string; estado: string };
type ContatoOpt = { id: string; nome: string; cargo: string; nivel: string; municipio_id: string | null; telefone: string; email: string; whatsapp: boolean };
type Vinculo = { contato_id: string; papel: string };

type FormState = {
  nome: string;
  sigla: string;
  tipo: string;
  estado: string;
  municipio_id: string | null;
  endereco: string;
  telefone: string;
  email: string;
  observacoes: string;
  vinculos: Vinculo[];
};

const emptyForm: FormState = {
  nome: "", sigla: "", tipo: "", estado: "", municipio_id: null,
  endereco: "", telefone: "", email: "", observacoes: "", vinculos: [],
};

export default function Orgaos() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [contatoSheetOpen, setContatoSheetOpen] = useState(false);
  const [contatoSearch, setContatoSearch] = useState("");
  const [detailOrgaoId, setDetailOrgaoId] = useState<string | null>(null);

  const { data: orgaos = [], isLoading } = useQuery({
    queryKey: ["orgaos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orgaos")
        .select("*")
        .order("nome");
      if (error) throw error;
      return data as OrgaoRow[];
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

  const { data: contatos = [] } = useQuery({
    queryKey: ["contatos", "opts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contatos")
        .select("id, nome, cargo, nivel, municipio_id, telefone, email, whatsapp")
        .order("nome");
      if (error) throw error;
      return data as ContatoOpt[];
    },
  });

  const { data: vinculosAll = [] } = useQuery({
    queryKey: ["orgao_contatos", "all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orgao_contatos")
        .select("orgao_id, contato_id, papel");
      if (error) throw error;
      return data as { orgao_id: string; contato_id: string; papel: string }[];
    },
  });

  const munById = useMemo(() => {
    const map = new Map<string, MunicipioOpt>();
    municipios.forEach((m) => map.set(m.id, m));
    return map;
  }, [municipios]);

  const contatoById = useMemo(() => {
    const map = new Map<string, ContatoOpt>();
    contatos.forEach((c) => map.set(c.id, c));
    return map;
  }, [contatos]);

  const vinculosByOrgao = useMemo(() => {
    const map = new Map<string, { contato_id: string; papel: string }[]>();
    vinculosAll.forEach((v) => {
      const arr = map.get(v.orgao_id) ?? [];
      arr.push({ contato_id: v.contato_id, papel: v.papel });
      map.set(v.orgao_id, arr);
    });
    return map;
  }, [vinculosAll]);

  const munLabel = (id: string | null) => {
    if (!id) return "—";
    const m = munById.get(id);
    return m ? `${m.nome}/${m.estado}` : "—";
  };

  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    return orgaos.filter((o) =>
      o.nome.toLowerCase().includes(s) ||
      o.sigla.toLowerCase().includes(s) ||
      o.tipo.toLowerCase().includes(s) ||
      munLabel(o.municipio_id).toLowerCase().includes(s)
    );
  }, [orgaos, search, munById]);

  const municipiosDoEstado = useMemo(
    () => municipios.filter((m) => !form.estado || m.estado === form.estado),
    [municipios, form.estado],
  );

  const contatosDisponiveis = useMemo(() => {
    const base = !form.municipio_id
      ? contatos
      : contatos.filter((c) => !c.municipio_id || c.municipio_id === form.municipio_id);
    const s = contatoSearch.trim().toLowerCase();
    if (!s) return base;
    return base.filter((c) =>
      c.nome.toLowerCase().includes(s) ||
      (c.cargo ?? "").toLowerCase().includes(s) ||
      (c.email ?? "").toLowerCase().includes(s) ||
      (c.telefone ?? "").toLowerCase().includes(s)
    );
  }, [contatos, form.municipio_id, contatoSearch]);

  // Quando muda o estado, limpa município se não pertencer
  useEffect(() => {
    if (form.municipio_id) {
      const m = munById.get(form.municipio_id);
      if (m && form.estado && m.estado !== form.estado) {
        setForm((f) => ({ ...f, municipio_id: null }));
      }
    }
  }, [form.estado]); // eslint-disable-line

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!form.nome.trim()) throw new Error("Informe o nome do órgão.");
      if (!form.estado) throw new Error("Selecione o estado.");

      const payload = {
        nome: form.nome.trim(),
        sigla: form.sigla.trim(),
        tipo: form.tipo.trim(),
        estado: form.estado,
        municipio_id: form.municipio_id,
        endereco: form.endereco.trim(),
        telefone: form.telefone.trim(),
        email: form.email.trim(),
        observacoes: form.observacoes.trim(),
      };

      let orgaoId: string;
      if (editingId) {
        const { error } = await supabase.from("orgaos").update(payload).eq("id", editingId);
        if (error) throw error;
        orgaoId = editingId;
        // limpa vinculos antigos
        const { error: delErr } = await supabase.from("orgao_contatos").delete().eq("orgao_id", orgaoId);
        if (delErr) throw delErr;
      } else {
        const { data, error } = await supabase.from("orgaos").insert(payload).select("id").single();
        if (error) throw error;
        orgaoId = data.id;
      }

      if (form.vinculos.length > 0) {
        const rows = form.vinculos.map((v) => ({
          orgao_id: orgaoId,
          contato_id: v.contato_id,
          papel: v.papel ?? "",
        }));
        const { error } = await supabase.from("orgao_contatos").insert(rows);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast({ title: editingId ? "Órgão atualizado" : "Órgão cadastrado" });
      qc.invalidateQueries({ queryKey: ["orgaos"] });
      qc.invalidateQueries({ queryKey: ["orgao_contatos", "all"] });
      qc.invalidateQueries({ queryKey: ["sidebar", "orgaos-count"] });
      setSheetOpen(false);
      setEditingId(null);
      setForm(emptyForm);
    },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("orgaos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Órgão removido" });
      qc.invalidateQueries({ queryKey: ["orgaos"] });
      qc.invalidateQueries({ queryKey: ["orgao_contatos", "all"] });
      qc.invalidateQueries({ queryKey: ["sidebar", "orgaos-count"] });
    },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setSheetOpen(true);
  };

  const openEdit = (o: OrgaoRow) => {
    setEditingId(o.id);
    const vincs = vinculosByOrgao.get(o.id) ?? [];
    setForm({
      nome: o.nome, sigla: o.sigla, tipo: o.tipo, estado: o.estado,
      municipio_id: o.municipio_id, endereco: o.endereco, telefone: o.telefone,
      email: o.email, observacoes: o.observacoes,
      vinculos: vincs.map((v) => ({ contato_id: v.contato_id, papel: v.papel })),
    });
    setSheetOpen(true);
  };

  const toggleContato = (contatoId: string) => {
    setForm((f) => {
      const exists = f.vinculos.find((v) => v.contato_id === contatoId);
      if (exists) {
        return { ...f, vinculos: f.vinculos.filter((v) => v.contato_id !== contatoId) };
      }
      return { ...f, vinculos: [...f.vinculos, { contato_id: contatoId, papel: "" }] };
    });
  };

  const setPapel = (contatoId: string, papel: string) => {
    setForm((f) => ({
      ...f,
      vinculos: f.vinculos.map((v) => v.contato_id === contatoId ? { ...v, papel } : v),
    }));
  };

  const totalVinculos = vinculosAll.length;

  return (
    <div className="p-4 lg:p-6 space-y-5 animate-fade-in">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold">Órgãos Municipais</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {orgaos.length} órgãos · {totalVinculos} contatos vinculados
          </p>
        </div>
        <Button onClick={openCreate} size="sm" className="h-9 text-xs">
          <Plus className="w-3.5 h-3.5" /> Novo Órgão
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Órgãos", count: orgaos.length, color: "text-primary bg-primary/8 border-primary/15" },
          { label: "Municípios atendidos", count: new Set(orgaos.map((o) => o.municipio_id).filter(Boolean)).size, color: "text-accent-foreground bg-accent/8 border-accent/20" },
          { label: "Vínculos", count: totalVinculos, color: "text-status-visited bg-status-visited/8 border-status-visited/15" },
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
          placeholder="Buscar por nome, sigla, tipo ou município..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 h-9 text-sm"
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {filtered.map((o) => {
            const vincs = vinculosByOrgao.get(o.id) ?? [];
            return (
              <Card
                key={o.id}
                onClick={() => setDetailOrgaoId(o.id)}
                className="shadow-sm border-border/60 hover:shadow-md hover:border-primary/40 transition-all cursor-pointer group"
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/15 transition-colors">
                      <Landmark className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-foreground truncate">
                        {o.sigla ? `${o.sigla} — ` : ""}{o.nome}
                      </p>
                      {o.tipo && <p className="text-xs text-muted-foreground truncate">{o.tipo}</p>}
                      <div className="flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-muted-foreground" />
                        <span className="text-[11px] text-muted-foreground">
                          {munLabel(o.municipio_id)}{!o.municipio_id && o.estado ? ` · ${o.estado}` : ""}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-border/40">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
                        <Users className="w-3 h-3" /> Contatos ({vincs.length})
                      </div>
                      {vincs.length > 0 && (
                        <span className="text-[10px] text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                          Ver detalhes →
                        </span>
                      )}
                    </div>
                    {vincs.length === 0 ? (
                      <p className="text-[11px] text-muted-foreground/70 italic">Nenhum contato vinculado</p>
                    ) : (
                      <ul className="space-y-1.5">
                        {vincs.slice(0, 6).map((v) => {
                          const c = contatoById.get(v.contato_id);
                          if (!c) return null;
                          const initials = c.nome.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
                          return (
                            <li key={v.contato_id} className="flex items-center gap-2 min-w-0">
                              <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-[9px] font-bold text-primary">
                                {initials}
                              </span>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium text-foreground truncate leading-tight">{c.nome}</p>
                                {(v.papel || c.cargo) && (
                                  <p className="text-[10px] text-muted-foreground truncate leading-tight">
                                    {v.papel || c.cargo}
                                  </p>
                                )}
                              </div>
                            </li>
                          );
                        })}
                        {vincs.length > 6 && (
                          <li className="flex items-center gap-2 pt-0.5">
                            <div className="flex -space-x-1.5">
                              {vincs.slice(6, 9).map((v) => {
                                const c = contatoById.get(v.contato_id);
                                if (!c) return null;
                                const initials = c.nome.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
                                return (
                                  <span
                                    key={v.contato_id}
                                    title={c.nome}
                                    className="w-6 h-6 rounded-full bg-muted border-2 border-card flex items-center justify-center text-[9px] font-bold text-muted-foreground"
                                  >
                                    {initials}
                                  </span>
                                );
                              })}
                            </div>
                            <span className="text-[10px] font-medium text-primary">
                              +{vincs.length - 6} · ver todos
                            </span>
                          </li>
                        )}
                      </ul>
                    )}
                  </div>
                  <div className="mt-3 pt-3 border-t border-border/40 flex items-center gap-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); openEdit(o); }}
                      className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors py-1.5 rounded-md hover:bg-muted/60"
                    >
                      <Pencil className="w-3.5 h-3.5" /> Editar
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Excluir órgão "${o.sigla || o.nome}"?`)) deleteMutation.mutate(o.id);
                      }}
                      className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium text-destructive/80 hover:text-destructive transition-colors py-1.5 rounded-md hover:bg-destructive/10"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Excluir
                    </button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {!isLoading && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Landmark className="w-8 h-8 mb-3 opacity-30" />
          <p className="text-sm">Nenhum órgão cadastrado</p>
          <Button onClick={openCreate} variant="outline" size="sm" className="mt-3 h-8 text-xs">
            <Plus className="w-3.5 h-3.5" /> Cadastrar primeiro órgão
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
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editingId ? "Editar órgão" : "Novo órgão"}</SheetTitle>
            <SheetDescription>
              Cadastre o órgão municipal (SEMMA, SEMAS, SEFA, etc.) e vincule os contatos responsáveis.
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-4 mt-5">
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label className="text-xs">Sigla</Label>
                <Input value={form.sigla} onChange={(e) => setForm({ ...form, sigla: e.target.value })} placeholder="SEMMA" className="h-9 text-sm" />
              </div>
              <div className="space-y-2 col-span-2">
                <Label className="text-xs">Nome *</Label>
                <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Secretaria de Meio Ambiente" className="h-9 text-sm" />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Tipo</Label>
              <Input value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })} placeholder="Secretaria municipal" className="h-9 text-sm" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs">Estado *</Label>
                <Select value={form.estado || undefined} onValueChange={(v) => setForm({ ...form, estado: v })}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="UF" /></SelectTrigger>
                  <SelectContent>
                    {ESTADOS_BR.map((uf) => <SelectItem key={uf} value={uf} className="text-sm">{uf}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Município</Label>
                <Select
                  value={form.municipio_id ?? "__none__"}
                  onValueChange={(v) => setForm({ ...form, municipio_id: v === "__none__" ? null : v })}
                  disabled={!form.estado}
                >
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder={form.estado ? "Selecione" : "Escolha o estado"} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__" className="text-sm text-muted-foreground">Sem município</SelectItem>
                    {municipiosDoEstado.map((m) => (
                      <SelectItem key={m.id} value={m.id} className="text-sm">{m.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.estado && municipiosDoEstado.length === 0 && (
                  <p className="text-[11px] text-muted-foreground">Nenhum município cadastrado em {form.estado}.</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Endereço</Label>
              <Input value={form.endereco} onChange={(e) => setForm({ ...form, endereco: e.target.value })} className="h-9 text-sm" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs">Telefone</Label>
                <Input value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} className="h-9 text-sm" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Email</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="h-9 text-sm" />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Observações</Label>
              <Textarea
                value={form.observacoes}
                onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
                rows={2}
                className="text-sm resize-none"
              />
            </div>

            {/* Vínculos com contatos */}
            <div className="space-y-2 pt-2 border-t border-border/60">
              <div className="flex items-center justify-between gap-2">
                <Label className="text-xs flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" /> Contatos vinculados
                </Label>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-muted-foreground">
                    {form.vinculos.length} selecionado(s)
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setContatoSheetOpen(true)}
                    className="h-7 text-[11px] px-2"
                  >
                    <UserPlus className="w-3 h-3" /> Novo
                  </Button>
                </div>
              </div>

              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  value={contatoSearch}
                  onChange={(e) => setContatoSearch(e.target.value)}
                  placeholder="Buscar contato por nome, cargo, telefone ou email..."
                  className="pl-8 h-8 text-xs"
                />
              </div>

              {contatosDisponiveis.length === 0 ? (
                <div className="text-center py-4 bg-muted/30 rounded-lg space-y-2">
                  <p className="text-[11px] text-muted-foreground">
                    {contatoSearch
                      ? `Nenhum contato encontrado para "${contatoSearch}".`
                      : `Nenhum contato ${form.municipio_id ? "neste município" : "cadastrado"}.`}
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setContatoSheetOpen(true)}
                    className="h-7 text-[11px]"
                  >
                    <UserPlus className="w-3 h-3" /> Cadastrar contato
                  </Button>
                </div>
              ) : (
                <div className="max-h-80 overflow-y-auto rounded-lg border border-border/60 divide-y divide-border/40">
                  {contatosDisponiveis.map((c) => {
                    const v = form.vinculos.find((x) => x.contato_id === c.id);
                    const checked = !!v;
                    return (
                      <div key={c.id} className={cn("p-2.5 transition-colors", checked && "bg-primary/5")}>
                        <button
                          type="button"
                          onClick={() => toggleContato(c.id)}
                          className="w-full flex items-start gap-2.5 text-left"
                        >
                          <span className={cn(
                            "w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 mt-0.5",
                            checked ? "bg-primary border-primary" : "border-border"
                          )}>
                            {checked && <Check className="w-3 h-3 text-primary-foreground" />}
                          </span>
                          <div className="flex-1 min-w-0 space-y-0.5">
                            <div className="flex items-center gap-2">
                              <p className="text-xs font-semibold truncate">{c.nome}</p>
                              {c.nivel && (
                                <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                                  {c.nivel}
                                </span>
                              )}
                            </div>
                            {c.cargo && <p className="text-[11px] text-muted-foreground truncate">{c.cargo}</p>}
                            <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                              {c.telefone && (
                                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                  <Phone className="w-2.5 h-2.5" />{c.telefone}
                                  {c.whatsapp && <MessageCircle className="w-2.5 h-2.5 text-status-visited" />}
                                </span>
                              )}
                              {c.email && (
                                <span className="text-[10px] text-muted-foreground flex items-center gap-1 truncate max-w-full">
                                  <Mail className="w-2.5 h-2.5" />{c.email}
                                </span>
                              )}
                            </div>
                          </div>
                        </button>
                        {checked && (
                          <Input
                            value={v.papel}
                            onChange={(e) => setPapel(c.id, e.target.value)}
                            placeholder="Papel no órgão (ex: Secretário, Assessor)"
                            className="h-8 text-xs mt-2 ml-6"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <SheetFooter className="mt-6 gap-2">
            <Button variant="outline" onClick={() => setSheetOpen(false)} className="h-9 text-xs">Cancelar</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="h-9 text-xs">
              {saveMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {editingId ? "Salvar alterações" : "Cadastrar órgão"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <ContatoFormSheet
        open={contatoSheetOpen}
        onOpenChange={setContatoSheetOpen}
        defaultMunicipioId={form.municipio_id}
        onSaved={(id) => {
          setForm((f) =>
            f.vinculos.find((v) => v.contato_id === id)
              ? f
              : { ...f, vinculos: [...f.vinculos, { contato_id: id, papel: "" }] }
          );
        }}
      />

      {/* Detail dialog */}
      <Dialog open={!!detailOrgaoId} onOpenChange={(o) => !o && setDetailOrgaoId(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          {(() => {
            const o = orgaos.find((x) => x.id === detailOrgaoId);
            if (!o) return null;
            const vincs = vinculosByOrgao.get(o.id) ?? [];
            return (
              <>
                <DialogHeader>
                  <div className="flex items-start gap-3">
                    <div className="w-11 h-11 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Landmark className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <DialogTitle className="text-base">
                        {o.sigla ? `${o.sigla} — ` : ""}{o.nome}
                      </DialogTitle>
                      <DialogDescription className="text-xs mt-0.5">
                        {o.tipo || "Órgão municipal"}
                      </DialogDescription>
                    </div>
                  </div>
                </DialogHeader>

                <div className="space-y-4 mt-2">
                  {/* Localização */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div className="flex items-start gap-2 p-2.5 rounded-lg bg-muted/40">
                      <MapPin className="w-3.5 h-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Município</p>
                        <p className="font-medium">{munLabel(o.municipio_id)}{!o.municipio_id && o.estado ? ` · ${o.estado}` : ""}</p>
                      </div>
                    </div>
                    {o.endereco && (
                      <div className="flex items-start gap-2 p-2.5 rounded-lg bg-muted/40">
                        <Building2 className="w-3.5 h-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Endereço</p>
                          <p className="font-medium truncate">{o.endereco}</p>
                        </div>
                      </div>
                    )}
                    {o.telefone && (
                      <div className="flex items-start gap-2 p-2.5 rounded-lg bg-muted/40">
                        <Phone className="w-3.5 h-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Telefone</p>
                          <a href={`tel:${o.telefone}`} className="font-medium hover:text-primary">{o.telefone}</a>
                        </div>
                      </div>
                    )}
                    {o.email && (
                      <div className="flex items-start gap-2 p-2.5 rounded-lg bg-muted/40 min-w-0">
                        <Mail className="w-3.5 h-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Email</p>
                          <a href={`mailto:${o.email}`} className="font-medium hover:text-primary truncate block">{o.email}</a>
                        </div>
                      </div>
                    )}
                  </div>

                  {o.observacoes && (
                    <div className="flex items-start gap-2 p-2.5 rounded-lg bg-muted/40 text-xs">
                      <FileText className="w-3.5 h-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Observações</p>
                        <p className="whitespace-pre-wrap">{o.observacoes}</p>
                      </div>
                    </div>
                  )}

                  {/* Contatos detalhados */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-xs font-semibold flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-primary" />
                        Contatos vinculados ({vincs.length})
                      </h3>
                    </div>
                    {vincs.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic py-4 text-center bg-muted/30 rounded-lg">
                        Nenhum contato vinculado a este órgão.
                      </p>
                    ) : (
                      <ul className="space-y-2">
                        {vincs.map((v) => {
                          const c = contatoById.get(v.contato_id);
                          if (!c) return null;
                          const initials = c.nome.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
                          return (
                            <li key={v.contato_id} className="flex items-start gap-3 p-3 rounded-lg border border-border/60 hover:border-primary/40 transition-colors">
                              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-xs font-bold text-primary">
                                {initials}
                              </div>
                              <div className="flex-1 min-w-0 space-y-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="text-sm font-semibold truncate">{c.nome}</p>
                                  {c.nivel && (
                                    <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                                      {c.nivel}
                                    </span>
                                  )}
                                </div>
                                {(v.papel || c.cargo) && (
                                  <p className="text-[11px] text-muted-foreground">
                                    {v.papel ? <span className="font-medium text-foreground">{v.papel}</span> : null}
                                    {v.papel && c.cargo ? " · " : ""}
                                    {c.cargo}
                                  </p>
                                )}
                                <div className="flex flex-col gap-0.5 pt-1">
                                  {c.telefone && (
                                    <a href={`tel:${c.telefone}`} className="text-[11px] text-muted-foreground hover:text-primary flex items-center gap-1.5">
                                      <Phone className="w-3 h-3" />
                                      {c.telefone}
                                      {c.whatsapp && (
                                        <span className="inline-flex items-center gap-0.5 text-[9px] text-status-visited bg-status-visited/10 px-1 rounded">
                                          <MessageCircle className="w-2.5 h-2.5" /> WhatsApp
                                        </span>
                                      )}
                                    </a>
                                  )}
                                  {c.email && (
                                    <a href={`mailto:${c.email}`} className="text-[11px] text-muted-foreground hover:text-primary flex items-center gap-1.5 truncate">
                                      <Mail className="w-3 h-3 flex-shrink-0" />
                                      <span className="truncate">{c.email}</span>
                                    </a>
                                  )}
                                </div>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-border/60">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 h-9 text-xs"
                      onClick={() => { setDetailOrgaoId(null); openEdit(o); }}
                    >
                      <Pencil className="w-3.5 h-3.5" /> Editar órgão
                    </Button>
                  </div>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
