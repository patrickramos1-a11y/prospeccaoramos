import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { getGmailComposeUrl, getWhatsAppUrl, isUsefulContactValue } from "@/lib/contact-links";
import {
  Landmark, Plus, Search, MapPin, Users, Phone, Mail,
  Pencil, Trash2, Loader2, Check, MessageCircle, UserPlus, Building2, FileText,
  ChevronDown, ChevronRight, Layers3, List, X,
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

const ALL_VALUE = "__all__";
type ViewMode = "lista" | "tipo" | "municipio";

export default function Orgaos() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [municipioFilter, setMunicipioFilter] = useState(ALL_VALUE);
  const [estadoFilter, setEstadoFilter] = useState(ALL_VALUE);
  const [tipoFilter, setTipoFilter] = useState(ALL_VALUE);
  const [vinculoFilter, setVinculoFilter] = useState(ALL_VALUE);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [contatoSheetOpen, setContatoSheetOpen] = useState(false);
  const [contatoSearch, setContatoSearch] = useState("");
  const [detailOrgaoId, setDetailOrgaoId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("lista");
  const [expandedOrgaoIds, setExpandedOrgaoIds] = useState<string[]>([]);

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

  const munLabel = useCallback((id: string | null) => {
    if (!id) return "—";
    const m = munById.get(id);
    return m ? `${m.nome}/${m.estado}` : "—";
  }, [munById]);

  const tipoOptions = useMemo(() => {
    return Array.from(new Set(orgaos.map((o) => o.tipo.trim()).filter(isUsefulContactValue))).sort((a, b) =>
      a.localeCompare(b),
    );
  }, [orgaos]);

  const estadosComCadastro = useMemo(
    () => Array.from(new Set(orgaos.map((o) => o.estado).filter(isUsefulContactValue))).sort(),
    [orgaos],
  );

  const municipiosComCadastro = useMemo(() => {
    const ids = new Set(orgaos.map((o) => o.municipio_id).filter(Boolean) as string[]);
    return municipios
      .filter((m) => ids.has(m.id) && (estadoFilter === ALL_VALUE || m.estado === estadoFilter))
      .sort((a, b) => a.nome.localeCompare(b.nome));
  }, [orgaos, municipios, estadoFilter]);

  const hasActiveFilters =
    municipioFilter !== ALL_VALUE ||
    estadoFilter !== ALL_VALUE ||
    tipoFilter !== ALL_VALUE ||
    vinculoFilter !== ALL_VALUE;

  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    return orgaos.filter((o) => {
      const vinculosCount = vinculosByOrgao.get(o.id)?.length ?? 0;
      const matchesSearch =
        o.nome.toLowerCase().includes(s) ||
        o.sigla.toLowerCase().includes(s) ||
        o.tipo.toLowerCase().includes(s) ||
        munLabel(o.municipio_id).toLowerCase().includes(s);

      return (
        matchesSearch &&
        (municipioFilter === ALL_VALUE || o.municipio_id === municipioFilter) &&
        (estadoFilter === ALL_VALUE || o.estado === estadoFilter) &&
        (tipoFilter === ALL_VALUE || o.tipo === tipoFilter) &&
        (vinculoFilter === ALL_VALUE ||
          (vinculoFilter === "com" && vinculosCount > 0) ||
          (vinculoFilter === "sem" && vinculosCount === 0))
      );
    });
  }, [orgaos, search, munLabel, municipioFilter, estadoFilter, tipoFilter, vinculoFilter, vinculosByOrgao]);

  const groupedOrgaos = useMemo(() => {
    if (viewMode === "lista") {
      return [{ key: "lista", label: "Todos os órgãos", detail: `${filtered.length} resultado(s)`, items: filtered }];
    }

    const groups = new Map<string, OrgaoRow[]>();
    filtered.forEach((orgao) => {
      const key = viewMode === "tipo"
        ? orgao.tipo.trim() || "Sem tipo informado"
        : orgao.municipio_id || "__sem_municipio__";
      groups.set(key, [...(groups.get(key) ?? []), orgao]);
    });

    return Array.from(groups.entries())
      .map(([key, items]) => {
        if (viewMode === "tipo") {
          return { key, label: key, detail: `${items.length} órgão(s)`, items };
        }
        const contatosDoGrupo = items.reduce(
          (total, orgao) => total + (vinculosByOrgao.get(orgao.id)?.length ?? 0),
          0,
        );
        return {
          key,
          label: key === "__sem_municipio__" ? "Sem município informado" : munLabel(key),
          detail: `${items.length} órgão(s) · ${contatosDoGrupo} contato(s)`,
          items,
        };
      })
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [filtered, viewMode, vinculosByOrgao, munLabel]);

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

  useEffect(() => {
    if (municipioFilter !== ALL_VALUE && !municipiosComCadastro.some((m) => m.id === municipioFilter)) {
      setMunicipioFilter(ALL_VALUE);
    }
  }, [estadoFilter, municipioFilter, municipiosComCadastro]);

  const toggleExpanded = (id: string) => {
    setExpandedOrgaoIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  };

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
    <div className="page-shell space-y-5 animate-fade-in">
      <div className="page-hero rounded-lg p-4 sm:p-5 flex items-center justify-between gap-4">
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

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: "Órgãos", hint: "Agrupar por tipo", count: orgaos.length, mode: "tipo" as ViewMode, color: "text-primary bg-primary/8 border-primary/15" },
          { label: "Municípios atendidos", hint: "Agrupar por município", count: new Set(orgaos.map((o) => o.municipio_id).filter(Boolean)).size, mode: "municipio" as ViewMode, color: "text-accent-foreground bg-accent/8 border-accent/20" },
          { label: "Vínculos", hint: "Ver órgãos com contatos", count: totalVinculos, mode: "lista" as ViewMode, color: "text-status-visited bg-status-visited/8 border-status-visited/15" },
        ].map((s) => (
          <Card
            key={s.label}
            role="button"
            tabIndex={0}
            aria-pressed={viewMode === s.mode && (s.label !== "Vínculos" || vinculoFilter === "com")}
            onClick={() => {
              setViewMode(s.mode);
              if (s.label === "Vínculos") setVinculoFilter("com");
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                setViewMode(s.mode);
                if (s.label === "Vínculos") setVinculoFilter("com");
              }
            }}
            className={cn(
              "metric-card border cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
              s.color.split(" ").at(-1),
              viewMode === s.mode && (s.label !== "Vínculos" || vinculoFilter === "com") && "ring-2 ring-primary/35 shadow-sm",
            )}
          >
            <CardContent className="p-3 text-center">
              <p className={cn("font-display font-bold text-2xl", s.color.split(" ")[0])}>{s.count}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{s.label}</p>
              <p className="text-[9px] font-semibold text-primary/75 mt-1">{s.hint}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="filter-bar rounded-lg p-2 grid grid-cols-1 lg:grid-cols-[minmax(240px,1fr)_180px_110px_160px_150px_auto] gap-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, sigla, tipo ou município..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>
        <Select value={municipioFilter} onValueChange={setMunicipioFilter}>
          <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Município" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>Todos municípios</SelectItem>
            {municipiosComCadastro.map((m) => <SelectItem key={m.id} value={m.id}>{m.nome}/{m.estado}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={estadoFilter} onValueChange={setEstadoFilter}>
          <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="UF" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>Todas UFs</SelectItem>
            {estadosComCadastro.map((uf) => <SelectItem key={uf} value={uf}>{uf}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={tipoFilter} onValueChange={setTipoFilter}>
          <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Tipo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>Todos tipos</SelectItem>
            {tipoOptions.map((tipo) => <SelectItem key={tipo} value={tipo}>{tipo}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={vinculoFilter} onValueChange={setVinculoFilter}>
          <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Contatos" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>Todos contatos</SelectItem>
            <SelectItem value="com">Com contatos</SelectItem>
            <SelectItem value="sem">Sem contatos</SelectItem>
          </SelectContent>
        </Select>
        {hasActiveFilters && (
          <Button
            variant="outline"
            size="sm"
            className="h-9 text-xs"
            onClick={() => {
              setMunicipioFilter(ALL_VALUE);
              setEstadoFilter(ALL_VALUE);
              setTipoFilter(ALL_VALUE);
              setVinculoFilter(ALL_VALUE);
            }}
          >
            Limpar filtros
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 px-1">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {viewMode === "lista" ? <List className="w-3.5 h-3.5" /> : <Layers3 className="w-3.5 h-3.5" />}
              <span>
                {viewMode === "lista" && "Lista compacta"}
                {viewMode === "tipo" && "Agrupado por tipo de órgão"}
                {viewMode === "municipio" && "Agrupado por município"}
              </span>
              <strong className="text-foreground">{filtered.length} resultado(s)</strong>
            </div>
            {viewMode !== "lista" && (
              <Button variant="ghost" size="sm" className="h-7 text-[11px]" onClick={() => setViewMode("lista")}>
                <X className="w-3 h-3" /> Remover agrupamento
              </Button>
            )}
          </div>

          {groupedOrgaos.map((group) => (
            <section key={group.key} className="content-card rounded-lg overflow-hidden">
              {viewMode !== "lista" && (
                <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-primary/[0.045] border-b border-border/60">
                  <div className="flex items-center gap-2 min-w-0">
                    {viewMode === "municipio" ? <MapPin className="w-3.5 h-3.5 text-primary flex-shrink-0" /> : <Landmark className="w-3.5 h-3.5 text-primary flex-shrink-0" />}
                    <h2 className="text-xs font-bold text-foreground truncate">{group.label}</h2>
                  </div>
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap">{group.detail}</span>
                </div>
              )}

              <div className="hidden lg:grid grid-cols-[minmax(280px,1.8fr)_minmax(170px,1fr)_minmax(170px,1fr)_90px_88px] gap-3 px-4 py-2 border-b border-border/55 bg-muted/25 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                <span>Órgão</span>
                <span>Tipo</span>
                <span>Município</span>
                <span>Contatos</span>
                <span className="text-right">Ações</span>
              </div>

              <div className="divide-y divide-border/55">
                {group.items.map((o) => {
                  const vincs = vinculosByOrgao.get(o.id) ?? [];
                  const expanded = expandedOrgaoIds.includes(o.id);
                  return (
                    <div key={o.id} className={cn("transition-colors", expanded && "bg-primary/[0.025]")}>
                      <div className="grid grid-cols-[minmax(0,1fr)_auto] lg:grid-cols-[minmax(280px,1.8fr)_minmax(170px,1fr)_minmax(170px,1fr)_90px_88px] gap-3 items-center px-3 sm:px-4 py-3 hover:bg-muted/30">
                        <button
                          type="button"
                          onClick={() => toggleExpanded(o.id)}
                          aria-expanded={expanded}
                          className="flex items-center gap-2.5 min-w-0 text-left rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                        >
                          <span className="w-7 h-7 rounded-md bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                            {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                          </span>
                          <div className="min-w-0">
                            <p className="text-xs sm:text-sm font-semibold text-foreground truncate">
                              {o.sigla ? `${o.sigla} — ` : ""}{o.nome}
                            </p>
                            <p className="lg:hidden text-[10px] text-muted-foreground truncate mt-0.5">
                              {[o.tipo, munLabel(o.municipio_id)].filter(Boolean).join(" · ")}
                            </p>
                          </div>
                        </button>

                        <span className="hidden lg:block text-xs text-muted-foreground truncate">{o.tipo || "Sem tipo"}</span>
                        <span className="hidden lg:flex items-center gap-1 text-xs text-muted-foreground truncate">
                          <MapPin className="w-3 h-3 flex-shrink-0" />
                          {munLabel(o.municipio_id)}{!o.municipio_id && o.estado ? ` · ${o.estado}` : ""}
                        </span>
                        <button
                          type="button"
                          onClick={() => toggleExpanded(o.id)}
                          className="hidden lg:inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                        >
                          <Users className="w-3 h-3" /> {vincs.length}
                        </button>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            title="Editar órgão"
                            aria-label={`Editar ${o.sigla || o.nome}`}
                            onClick={() => openEdit(o)}
                            className="w-8 h-8 inline-flex items-center justify-center rounded-md text-primary hover:bg-primary/10"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            title="Excluir órgão"
                            aria-label={`Excluir ${o.sigla || o.nome}`}
                            onClick={() => {
                              if (confirm(`Excluir órgão "${o.sigla || o.nome}"?`)) deleteMutation.mutate(o.id);
                            }}
                            className="w-8 h-8 inline-flex items-center justify-center rounded-md text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {expanded && (
                        <div className="px-3 sm:px-4 pb-4 lg:pl-[58px] animate-fade-in">
                          <div className="rounded-lg border border-border/60 bg-background overflow-hidden">
                            <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-muted/30 border-b border-border/55">
                              <span className="text-[11px] font-semibold text-foreground flex items-center gap-1.5">
                                <Users className="w-3.5 h-3.5 text-primary" /> Contatos vinculados ({vincs.length})
                              </span>
                              <Button variant="ghost" size="sm" className="h-7 text-[10px]" onClick={() => setDetailOrgaoId(o.id)}>
                                Ver ficha completa
                              </Button>
                            </div>
                            {vincs.length === 0 ? (
                              <p className="px-3 py-4 text-[11px] text-muted-foreground italic">Nenhum contato vinculado a este órgão.</p>
                            ) : (
                              <div className="grid md:grid-cols-2 xl:grid-cols-3 bg-background">
                                {vincs.map((v) => {
                                  const c = contatoById.get(v.contato_id);
                                  if (!c) return null;
                                  const whatsappUrl = c.whatsapp ? getWhatsAppUrl(c.telefone) : null;
                                  const emailUrl = getGmailComposeUrl(c.email);
                                  return (
                                    <div key={v.contato_id} className="p-3 bg-background min-w-0 border-b border-r border-border/45 last:border-b-0">
                                      <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0">
                                          <p className="text-xs font-semibold text-foreground truncate">{c.nome}</p>
                                          <p className="text-[10px] text-muted-foreground truncate">{v.papel || c.cargo || "Contato"}</p>
                                        </div>
                                        {c.nivel && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">{c.nivel}</span>}
                                      </div>
                                      <div className="flex flex-wrap gap-1.5 mt-2">
                                        {isUsefulContactValue(c.telefone) && (
                                          <a href={`tel:${c.telefone}`} className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline">
                                            <Phone className="w-3 h-3" /> {c.telefone}
                                          </a>
                                        )}
                                        {whatsappUrl && (
                                          <a href={whatsappUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[10px] text-status-visited hover:underline">
                                            <MessageCircle className="w-3 h-3" /> WhatsApp
                                          </a>
                                        )}
                                        {emailUrl && (
                                          <a href={emailUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline max-w-full">
                                            <Mail className="w-3 h-3 flex-shrink-0" /> <span className="truncate">{c.email}</span>
                                          </a>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
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
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto bg-background">
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
                <div className="text-center py-4 bg-secondary/45 border border-border/60 rounded-lg space-y-2">
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
            const orgEmailUrl = getGmailComposeUrl(o.email);
            const hasOrgPhone = isUsefulContactValue(o.telefone);
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
                    {hasOrgPhone && (
                      <div className="flex items-start gap-2 p-2.5 rounded-lg bg-muted/40">
                        <Phone className="w-3.5 h-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Telefone</p>
                          <a href={`tel:${o.telefone}`} className="font-medium hover:text-primary">{o.telefone}</a>
                        </div>
                      </div>
                    )}
                    {orgEmailUrl && (
                      <div className="flex items-start gap-2 p-2.5 rounded-lg bg-muted/40 min-w-0">
                        <Mail className="w-3.5 h-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Email</p>
                          <a href={orgEmailUrl} target="_blank" rel="noreferrer" className="font-medium hover:text-primary truncate block">{o.email}</a>
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
                      <p className="text-xs text-muted-foreground italic py-4 text-center bg-secondary/45 rounded-lg border border-border/60">
                        Nenhum contato vinculado a este órgão.
                      </p>
                    ) : (
                      <ul className="space-y-2">
                        {vincs.map((v) => {
                          const c = contatoById.get(v.contato_id);
                          if (!c) return null;
                          const initials = c.nome.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
                          const contatoEmailUrl = getGmailComposeUrl(c.email);
                          const contatoWhatsappUrl = c.whatsapp ? getWhatsAppUrl(c.telefone) : null;
                          const hasContatoPhone = isUsefulContactValue(c.telefone);
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
                                  {hasContatoPhone && (
                                    <div className="text-[11px] text-muted-foreground flex flex-wrap items-center gap-1.5">
                                      <Phone className="w-3 h-3" />
                                      <a href={`tel:${c.telefone}`} className="hover:text-primary">{c.telefone}</a>
                                      {contatoWhatsappUrl && (
                                        <a
                                          href={contatoWhatsappUrl}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="inline-flex items-center gap-0.5 text-[9px] text-status-visited bg-status-visited/10 px-1 rounded hover:bg-status-visited/20 transition-colors"
                                        >
                                          <MessageCircle className="w-2.5 h-2.5" /> WhatsApp
                                        </a>
                                      )}
                                    </div>
                                  )}
                                  {contatoEmailUrl && (
                                    <a href={contatoEmailUrl} target="_blank" rel="noreferrer" className="text-[11px] text-muted-foreground hover:text-primary flex items-center gap-1.5 truncate">
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
