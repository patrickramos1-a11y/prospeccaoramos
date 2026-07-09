import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { getGmailComposeUrl, getWhatsAppUrl, isUsefulContactValue } from "@/lib/contact-links";
import {
  BriefcaseBusiness,
  Building2,
  Loader2,
  Mail,
  MapPin,
  MessageCircle,
  Pencil,
  Phone,
  Plus,
  Search,
  ShieldCheck,
  Star,
  Trash2,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { toast } from "@/hooks/use-toast";

const CATEGORIAS = [
  "Gráfica",
  "Comunicação visual",
  "Brindes",
  "Transporte",
  "Alimentação",
  "Locação",
  "Técnico",
  "Consultoria",
  "Outro",
];

const STATUS_OPTIONS = ["ativo", "em avaliação", "inativo"];
const CONFIANCA_OPTIONS = ["preferencial", "comum", "evitar"];
const ALL_VALUE = "__all__";

type PrestadorRow = {
  id: string;
  nome: string;
  tipo: string;
  categoria: string;
  status: string;
  confianca: string;
  avaliacao: number;
  cidade: string;
  estado: string;
  cnpj: string;
  telefone: string;
  whatsapp: string;
  email: string;
  site: string;
  instagram: string;
  endereco: string;
  servicos: string;
  prazo_medio: string;
  forma_pagamento: string;
  observacoes: string;
  created_at: string;
  updated_at: string;
};

type PrestadorContatoRow = {
  id: string;
  prestador_id: string;
  nome: string;
  cargo: string;
  telefone: string;
  whatsapp: boolean;
  email: string;
  observacoes: string;
  created_at: string;
};

type PrestadorContatoForm = {
  localId: string;
  nome: string;
  cargo: string;
  telefone: string;
  whatsapp: boolean;
  email: string;
  observacoes: string;
};

type FormState = {
  nome: string;
  tipo: string;
  categoria: string;
  status: string;
  confianca: string;
  avaliacao: number;
  cidade: string;
  estado: string;
  cnpj: string;
  telefone: string;
  whatsapp: string;
  email: string;
  site: string;
  instagram: string;
  endereco: string;
  servicos: string;
  prazo_medio: string;
  forma_pagamento: string;
  observacoes: string;
  contatos: PrestadorContatoForm[];
};

const emptyForm: FormState = {
  nome: "",
  tipo: "",
  categoria: "",
  status: "ativo",
  confianca: "comum",
  avaliacao: 0,
  cidade: "",
  estado: "",
  cnpj: "",
  telefone: "",
  whatsapp: "",
  email: "",
  site: "",
  instagram: "",
  endereco: "",
  servicos: "",
  prazo_medio: "",
  forma_pagamento: "",
  observacoes: "",
  contatos: [],
};

const novoContato = (): PrestadorContatoForm => ({
  localId: crypto.randomUUID(),
  nome: "",
  cargo: "",
  telefone: "",
  whatsapp: false,
  email: "",
  observacoes: "",
});

const normalize = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const statusClass = (status: string) => {
  if (status === "ativo") return "bg-status-visited/12 text-status-visited border-status-visited/20";
  if (status === "em avaliação") return "bg-accent/25 text-accent-foreground border-accent/35";
  return "bg-muted text-muted-foreground border-border";
};

const confiancaClass = (confianca: string) => {
  if (confianca === "preferencial") return "bg-primary/12 text-primary border-primary/20";
  if (confianca === "evitar") return "bg-destructive/10 text-destructive border-destructive/20";
  return "bg-secondary text-secondary-foreground border-border";
};

export default function Prestadores() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [categoriaFilter, setCategoriaFilter] = useState(ALL_VALUE);
  const [statusFilter, setStatusFilter] = useState(ALL_VALUE);
  const [confiancaFilter, setConfiancaFilter] = useState(ALL_VALUE);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);

  const { data: prestadores = [], isLoading, isError } = useQuery({
    queryKey: ["prestadores"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("prestadores")
        .select("*")
        .order("nome");
      if (error) throw error;
      return data as PrestadorRow[];
    },
    retry: false,
  });

  const { data: contatos = [] } = useQuery({
    queryKey: ["prestador_contatos", "all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("prestador_contatos")
        .select("*")
        .order("nome");
      if (error) throw error;
      return data as PrestadorContatoRow[];
    },
    retry: false,
  });

  const contatosByPrestador = useMemo(() => {
    const map = new Map<string, PrestadorContatoRow[]>();
    contatos.forEach((contato) => {
      const arr = map.get(contato.prestador_id) ?? [];
      arr.push(contato);
      map.set(contato.prestador_id, arr);
    });
    return map;
  }, [contatos]);

  const filtered = useMemo(() => {
    const s = normalize(search.trim());
    return prestadores.filter((prestador) => {
      const linkedContacts = contatosByPrestador.get(prestador.id) ?? [];
      const haystack = normalize([
        prestador.nome,
        prestador.tipo,
        prestador.categoria,
        prestador.cidade,
        prestador.estado,
        prestador.cnpj,
        prestador.telefone,
        prestador.whatsapp,
        prestador.email,
        prestador.servicos,
        prestador.observacoes,
        ...linkedContacts.flatMap((c) => [c.nome, c.cargo, c.telefone, c.email, c.observacoes]),
      ].join(" "));

      return (
        (!s || haystack.includes(s)) &&
        (categoriaFilter === ALL_VALUE || prestador.categoria === categoriaFilter) &&
        (statusFilter === ALL_VALUE || prestador.status === statusFilter) &&
        (confiancaFilter === ALL_VALUE || prestador.confianca === confiancaFilter)
      );
    });
  }, [prestadores, contatosByPrestador, search, categoriaFilter, statusFilter, confiancaFilter]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!form.nome.trim()) throw new Error("Informe o nome do prestador.");
      if (!form.categoria) throw new Error("Selecione a categoria do serviço.");

      const payload = {
        nome: form.nome.trim(),
        tipo: form.tipo.trim(),
        categoria: form.categoria,
        status: form.status,
        confianca: form.confianca,
        avaliacao: Math.max(0, Math.min(5, Number(form.avaliacao) || 0)),
        cidade: form.cidade.trim(),
        estado: form.estado.trim().toUpperCase(),
        cnpj: form.cnpj.trim(),
        telefone: form.telefone.trim(),
        whatsapp: form.whatsapp.trim(),
        email: form.email.trim(),
        site: form.site.trim(),
        instagram: form.instagram.trim(),
        endereco: form.endereco.trim(),
        servicos: form.servicos.trim(),
        prazo_medio: form.prazo_medio.trim(),
        forma_pagamento: form.forma_pagamento.trim(),
        observacoes: form.observacoes.trim(),
      };

      let prestadorId = editingId;
      if (prestadorId) {
        const { error } = await supabase.from("prestadores").update(payload).eq("id", prestadorId);
        if (error) throw error;
        const { error: delError } = await supabase
          .from("prestador_contatos")
          .delete()
          .eq("prestador_id", prestadorId);
        if (delError) throw delError;
      } else {
        const { data, error } = await supabase.from("prestadores").insert(payload).select("id").single();
        if (error) throw error;
        prestadorId = data.id;
      }

      const contatosValidos = form.contatos
        .filter((contato) => contato.nome.trim())
        .map((contato) => ({
          prestador_id: prestadorId,
          nome: contato.nome.trim(),
          cargo: contato.cargo.trim(),
          telefone: contato.telefone.trim(),
          whatsapp: contato.whatsapp,
          email: contato.email.trim(),
          observacoes: contato.observacoes.trim(),
        }));

      if (contatosValidos.length > 0) {
        const { error } = await supabase.from("prestador_contatos").insert(contatosValidos);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast({ title: editingId ? "Prestador atualizado" : "Prestador cadastrado" });
      qc.invalidateQueries({ queryKey: ["prestadores"] });
      qc.invalidateQueries({ queryKey: ["prestador_contatos", "all"] });
      setSheetOpen(false);
      setEditingId(null);
      setForm(emptyForm);
    },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("prestadores").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Prestador removido" });
      qc.invalidateQueries({ queryKey: ["prestadores"] });
      qc.invalidateQueries({ queryKey: ["prestador_contatos", "all"] });
    },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...emptyForm, contatos: [novoContato()] });
    setSheetOpen(true);
  };

  const openEdit = (prestador: PrestadorRow) => {
    setEditingId(prestador.id);
    const linkedContacts = contatosByPrestador.get(prestador.id) ?? [];
    setForm({
      nome: prestador.nome,
      tipo: prestador.tipo,
      categoria: prestador.categoria,
      status: prestador.status,
      confianca: prestador.confianca,
      avaliacao: prestador.avaliacao,
      cidade: prestador.cidade,
      estado: prestador.estado,
      cnpj: prestador.cnpj,
      telefone: prestador.telefone,
      whatsapp: prestador.whatsapp,
      email: prestador.email,
      site: prestador.site,
      instagram: prestador.instagram,
      endereco: prestador.endereco,
      servicos: prestador.servicos,
      prazo_medio: prestador.prazo_medio,
      forma_pagamento: prestador.forma_pagamento,
      observacoes: prestador.observacoes,
      contatos: linkedContacts.map((contato) => ({
        localId: contato.id,
        nome: contato.nome,
        cargo: contato.cargo,
        telefone: contato.telefone,
        whatsapp: contato.whatsapp,
        email: contato.email,
        observacoes: contato.observacoes,
      })),
    });
    setSheetOpen(true);
  };

  const updateContato = (localId: string, patch: Partial<PrestadorContatoForm>) => {
    setForm((current) => ({
      ...current,
      contatos: current.contatos.map((contato) =>
        contato.localId === localId ? { ...contato, ...patch } : contato,
      ),
    }));
  };

  const totalPreferenciais = prestadores.filter((p) => p.confianca === "preferencial").length;

  return (
    <div className="page-shell space-y-5 animate-fade-in">
      <div className="page-hero rounded-lg p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary mb-1">
            Empresas e profissionais
          </p>
          <h1 className="font-display text-2xl font-bold">Prestadores de Serviços</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {prestadores.length} prestadores · {contatos.length} contatos internos vinculados
          </p>
        </div>
        <Button onClick={openCreate} size="sm" className="h-9 text-xs sm:self-center">
          <Plus className="w-3.5 h-3.5" /> Novo Prestador
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: "Prestadores", count: prestadores.length, icon: BriefcaseBusiness },
          { label: "Preferenciais", count: totalPreferenciais, icon: ShieldCheck },
          { label: "Contatos vinculados", count: contatos.length, icon: Users },
        ].map((metric) => (
          <Card key={metric.label} className="metric-card">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/12 text-primary flex items-center justify-center ring-1 ring-primary/15">
                <metric.icon className="w-4 h-4" />
              </div>
              <div>
                <p className="font-display font-bold text-2xl text-primary">{metric.count}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{metric.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="filter-bar rounded-lg p-2 grid grid-cols-1 lg:grid-cols-[minmax(240px,1fr)_180px_160px_170px] gap-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, servico, cidade, telefone, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>
        <Select value={categoriaFilter} onValueChange={setCategoriaFilter}>
          <SelectTrigger className="h-9 text-xs">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>Todas categorias</SelectItem>
            {CATEGORIAS.map((categoria) => (
              <SelectItem key={categoria} value={categoria}>
                {categoria}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-9 text-xs">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>Todos status</SelectItem>
            {STATUS_OPTIONS.map((status) => (
              <SelectItem key={status} value={status}>
                {status}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={confiancaFilter} onValueChange={setConfiancaFilter}>
          <SelectTrigger className="h-9 text-xs">
            <SelectValue placeholder="Confianca" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>Toda confianca</SelectItem>
            {CONFIANCA_OPTIONS.map((confianca) => (
              <SelectItem key={confianca} value={confianca}>
                {confianca}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {filtered.map((prestador) => {
            const linkedContacts = contatosByPrestador.get(prestador.id) ?? [];
            const whatsappUrl = getWhatsAppUrl(prestador.whatsapp || prestador.telefone);
            const gmailUrl = getGmailComposeUrl(prestador.email);
            const hasPhone = isUsefulContactValue(prestador.telefone || prestador.whatsapp);
            return (
              <Card key={prestador.id} className="entity-card group">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3 pb-3 border-b border-border/55">
                    <div className="w-11 h-11 rounded-lg bg-primary/12 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/18 transition-colors ring-1 ring-primary/15">
                      <BriefcaseBusiness className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-semibold text-sm text-foreground truncate">{prestador.nome}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {prestador.tipo || prestador.categoria || "Prestador de serviços"}
                          </p>
                        </div>
                        <div className="flex text-accent-foreground flex-shrink-0">
                          {Array.from({ length: 5 }).map((_, index) => (
                            <Star
                              key={index}
                              className={cn(
                                "w-3.5 h-3.5",
                                index < prestador.avaliacao ? "fill-accent text-accent-foreground" : "text-muted-foreground/35",
                              )}
                            />
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 mt-1">
                        <MapPin className="w-3 h-3 text-muted-foreground" />
                        <span className="text-[11px] text-muted-foreground">
                          {[prestador.cidade, prestador.estado].filter(Boolean).join("/ ") || "Local nao informado"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {prestador.categoria && (
                      <span className="px-2 py-1 rounded-full text-[10px] font-bold border bg-primary/8 text-primary border-primary/15">
                        {prestador.categoria}
                      </span>
                    )}
                    <span className={cn("px-2 py-1 rounded-full text-[10px] font-bold border", statusClass(prestador.status))}>
                      {prestador.status}
                    </span>
                    <span className={cn("px-2 py-1 rounded-full text-[10px] font-bold border", confiancaClass(prestador.confianca))}>
                      {prestador.confianca}
                    </span>
                  </div>

                  {prestador.servicos && (
                    <div className="mt-3 p-3 rounded-lg bg-secondary/55 border border-border/60">
                      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground mb-1">
                        Serviços
                      </p>
                      <p className="text-xs text-foreground line-clamp-3">{prestador.servicos}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 gap-1.5 mt-3 text-[11px]">
                    {hasPhone && (
                      <div className="flex items-center gap-2 text-muted-foreground min-w-0">
                        <Phone className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="truncate">{prestador.whatsapp || prestador.telefone}</span>
                      </div>
                    )}
                    {gmailUrl && (
                      <div className="flex items-center gap-2 text-muted-foreground min-w-0">
                        <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="truncate">{prestador.email}</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-3 pt-3 border-t border-border/55">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
                        <Users className="w-3 h-3" /> Contatos ({linkedContacts.length})
                      </div>
                      {(prestador.prazo_medio || prestador.forma_pagamento) && (
                        <span className="text-[10px] text-muted-foreground truncate max-w-[52%]">
                          {[prestador.prazo_medio, prestador.forma_pagamento].filter(Boolean).join(" · ")}
                        </span>
                      )}
                    </div>
                    {linkedContacts.length === 0 ? (
                      <p className="text-[11px] text-muted-foreground/70 italic">Nenhum contato interno</p>
                    ) : (
                      <ul className="space-y-1.5">
                        {linkedContacts.slice(0, 3).map((contato) => (
                          <li key={contato.id} className="flex items-center gap-2 min-w-0">
                            <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-[9px] font-bold text-primary">
                              {contato.nome.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="text-[11px] font-medium text-foreground truncate leading-tight">{contato.nome}</p>
                              <p className="text-[9px] text-muted-foreground truncate leading-tight">
                                {contato.cargo || contato.telefone || contato.email || "Sem detalhes"}
                              </p>
                            </div>
                          </li>
                        ))}
                        {linkedContacts.length > 3 && (
                          <li className="text-[10px] font-medium text-primary">+{linkedContacts.length - 3} contatos</li>
                        )}
                      </ul>
                    )}
                  </div>

                  <div className="mt-3 pt-3 border-t border-border/55 grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                    {whatsappUrl && (
                      <a
                        href={whatsappUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-center gap-1.5 text-xs font-semibold text-status-visited transition-colors py-2 rounded-md hover:bg-status-visited/10"
                      >
                        <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                      </a>
                    )}
                    {gmailUrl && (
                      <a
                        href={gmailUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-center gap-1.5 text-xs font-semibold text-primary transition-colors py-2 rounded-md hover:bg-primary/10"
                      >
                        <Mail className="w-3.5 h-3.5" /> Email
                      </a>
                    )}
                    <button
                      onClick={() => openEdit(prestador)}
                      className="flex items-center justify-center gap-1.5 text-xs font-semibold text-primary transition-colors py-2 rounded-md hover:bg-primary/10"
                    >
                      <Pencil className="w-3.5 h-3.5" /> Editar
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Excluir prestador "${prestador.nome}"?`)) deleteMutation.mutate(prestador.id);
                      }}
                      className="flex items-center justify-center gap-1.5 text-xs font-semibold text-destructive transition-colors py-2 rounded-md hover:bg-destructive/10"
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

      {isError && (
        <div className="content-card rounded-lg p-6 text-center">
          <BriefcaseBusiness className="w-8 h-8 mx-auto mb-3 text-muted-foreground/45" />
          <p className="text-sm font-semibold text-foreground">A base de prestadores ainda não está disponível.</p>
          <p className="text-xs text-muted-foreground mt-1">
            Depois que a migration nova for aplicada no Supabase, esta aba carrega os cadastros normalmente.
          </p>
        </div>
      )}

      {!isLoading && !isError && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <BriefcaseBusiness className="w-8 h-8 mb-3 opacity-30" />
          <p className="text-sm">Nenhum prestador encontrado</p>
          <Button onClick={openCreate} variant="outline" size="sm" className="mt-3 h-8 text-xs">
            <Plus className="w-3.5 h-3.5" /> Cadastrar prestador
          </Button>
        </div>
      )}

      <Sheet
        open={sheetOpen}
        onOpenChange={(open) => {
          setSheetOpen(open);
          if (!open) {
            setEditingId(null);
            setForm(emptyForm);
          }
        }}
      >
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto bg-background">
          <SheetHeader>
            <SheetTitle>{editingId ? "Editar prestador" : "Novo prestador"}</SheetTitle>
            <SheetDescription>
              Cadastre empresas e profissionais para serviços terceirizados, orçamentos e demandas operacionais.
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-5 mt-5">
            <section className="content-card rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-primary">
                <Building2 className="w-4 h-4" /> Dados principais
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs">Nome *</Label>
                  <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} className="h-9 text-sm" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Categoria *</Label>
                  <Select value={form.categoria || undefined} onValueChange={(v) => setForm({ ...form, categoria: v })}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIAS.map((categoria) => (
                        <SelectItem key={categoria} value={categoria}>{categoria}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Tipo</Label>
                  <Input value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })} placeholder="Empresa, MEI, profissional..." className="h-9 text-sm" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-xs">Status</Label>
                    <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                      <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map((status) => <SelectItem key={status} value={status}>{status}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                  <Label className="text-xs">Confiança</Label>
                    <Select value={form.confianca} onValueChange={(v) => setForm({ ...form, confianca: v })}>
                      <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CONFIANCA_OPTIONS.map((confianca) => <SelectItem key={confianca} value={confianca}>{confianca}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Avaliação</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={0}
                      max={5}
                      value={form.avaliacao}
                      onChange={(e) => setForm({ ...form, avaliacao: Number(e.target.value) })}
                      className="h-9 text-sm w-24"
                    />
                    <div className="flex text-accent-foreground">
                      {Array.from({ length: 5 }).map((_, index) => (
                        <button
                          type="button"
                          key={index}
                          onClick={() => setForm({ ...form, avaliacao: index + 1 })}
                          className="p-0.5"
                        >
                          <Star
                            className={cn(
                              "w-4 h-4",
                              index < form.avaliacao ? "fill-accent text-accent-foreground" : "text-muted-foreground/40",
                            )}
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">CNPJ</Label>
                  <Input value={form.cnpj} onChange={(e) => setForm({ ...form, cnpj: e.target.value })} className="h-9 text-sm" />
                </div>
              </div>
            </section>

            <section className="content-card rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-primary">
                <MapPin className="w-4 h-4" /> Localização e canais
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs">Cidade</Label>
                  <Input value={form.cidade} onChange={(e) => setForm({ ...form, cidade: e.target.value })} className="h-9 text-sm" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">UF</Label>
                  <Input value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value.slice(0, 2) })} className="h-9 text-sm uppercase" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Telefone</Label>
                  <Input value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} className="h-9 text-sm" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">WhatsApp</Label>
                  <Input value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} className="h-9 text-sm" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Email</Label>
                  <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="h-9 text-sm" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Site</Label>
                  <Input value={form.site} onChange={(e) => setForm({ ...form, site: e.target.value })} className="h-9 text-sm" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Instagram</Label>
                  <Input value={form.instagram} onChange={(e) => setForm({ ...form, instagram: e.target.value })} className="h-9 text-sm" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Endereço</Label>
                  <Input value={form.endereco} onChange={(e) => setForm({ ...form, endereco: e.target.value })} className="h-9 text-sm" />
                </div>
              </div>
            </section>

            <section className="content-card rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-primary">
                <BriefcaseBusiness className="w-4 h-4" /> Serviços e condições
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-2 sm:col-span-2">
                  <Label className="text-xs">Serviços</Label>
                  <Textarea
                    value={form.servicos}
                    onChange={(e) => setForm({ ...form, servicos: e.target.value })}
                    rows={3}
                    className="text-sm resize-none"
                    placeholder="Ex: impressão de adesivos, banners, placas, uniformes..."
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Prazo médio</Label>
                  <Input value={form.prazo_medio} onChange={(e) => setForm({ ...form, prazo_medio: e.target.value })} className="h-9 text-sm" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Forma de pagamento</Label>
                  <Input value={form.forma_pagamento} onChange={(e) => setForm({ ...form, forma_pagamento: e.target.value })} className="h-9 text-sm" />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label className="text-xs">Observações</Label>
                  <Textarea
                    value={form.observacoes}
                    onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
                    rows={2}
                    className="text-sm resize-none"
                  />
                </div>
              </div>
            </section>

            <section className="content-card rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs font-bold text-primary">
                  <Users className="w-4 h-4" /> Contatos do prestador
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setForm((current) => ({ ...current, contatos: [...current.contatos, novoContato()] }))}
                  className="h-8 text-xs"
                >
                  <UserPlus className="w-3.5 h-3.5" /> Adicionar
                </Button>
              </div>

              {form.contatos.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                  Nenhum contato interno cadastrado.
                </div>
              ) : (
                <div className="space-y-3">
                  {form.contatos.map((contato, index) => (
                    <div key={contato.localId} className="rounded-lg border border-border/70 bg-secondary/35 p-3 space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 text-xs font-semibold">
                          <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold">
                            {index + 1}
                          </span>
                          Contato
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => setForm((current) => ({
                            ...current,
                            contatos: current.contatos.filter((item) => item.localId !== contato.localId),
                          }))}
                          className="h-7 w-7 text-destructive hover:text-destructive"
                        >
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                      <div className="grid sm:grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label className="text-xs">Nome</Label>
                          <Input value={contato.nome} onChange={(e) => updateContato(contato.localId, { nome: e.target.value })} className="h-9 text-sm" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">Cargo</Label>
                          <Input value={contato.cargo} onChange={(e) => updateContato(contato.localId, { cargo: e.target.value })} className="h-9 text-sm" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">Telefone</Label>
                          <Input value={contato.telefone} onChange={(e) => updateContato(contato.localId, { telefone: e.target.value })} className="h-9 text-sm" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">Email</Label>
                          <Input type="email" value={contato.email} onChange={(e) => updateContato(contato.localId, { email: e.target.value })} className="h-9 text-sm" />
                        </div>
                        <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                          <input
                            type="checkbox"
                            checked={contato.whatsapp}
                            onChange={(e) => updateContato(contato.localId, { whatsapp: e.target.checked })}
                            className="h-4 w-4 accent-primary"
                          />
                          Tem WhatsApp
                        </label>
                        <div className="space-y-2 sm:col-span-2">
                          <Label className="text-xs">Observações</Label>
                          <Input value={contato.observacoes} onChange={(e) => updateContato(contato.localId, { observacoes: e.target.value })} className="h-9 text-sm" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          <SheetFooter className="mt-6 gap-2">
            <Button variant="outline" onClick={() => setSheetOpen(false)} className="h-9 text-xs">
              Cancelar
            </Button>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="h-9 text-xs">
              {saveMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {editingId ? "Salvar alterações" : "Cadastrar prestador"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
