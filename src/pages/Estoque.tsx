import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import {
  Package, Plus, Search, AlertCircle, ArrowDown, ArrowUp,
  TrendingDown, Boxes, Pencil, Trash2, X, Check, Layers, Upload, Paperclip,
  Eye, ExternalLink, Link2, ShoppingCart, MoreHorizontal, Clock3, Store, Link2Off,
  ClipboardList, Wrench, Send, CircleCheckBig, Palette, Truck, Building2, FileUp, CalendarDays, DollarSign
} from "lucide-react";
import { EstoqueDocumentosManager } from "@/components/EstoqueDocumentosManager";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { toast } from "@/hooks/use-toast";

interface EstoqueItem {
  id: string;
  nome: string;
  categoria: string;
  unidade: string;
  saldo_atual: number;
  minimo: number;
  ideal: number;
  custo_unitario: number;
  fornecedor: string | null;
  imagem_url: string | null;
  compra_url: string | null;
  created_at: string;
}

interface PackItem {
  id: string;
  item_id: string;
  quantidade: number;
}

interface Pack {
  id: string;
  nome: string;
  descricao: string | null;
  saldo_atual: number;
  itens: PackItem[];
}

interface Solicitacao {
  id: string;
  finalidade: "cadastro" | "reposicao" | "consumo";
  alvo_tipo: "item" | "pack" | "livre";
  item_id: string | null;
  pack_id: string | null;
  titulo: string;
  quantidade: number;
  unidade: string;
  observacao: string | null;
  status: "pendente" | "aprovada" | "atendida" | "cancelada";
  created_at: string;
  workflow?: SolicitacaoWorkflow | null;
}

type WorkflowStage = "solicitacao" | "cotacao" | "aprovacao" | "arte" | "producao" | "concluida";

interface SolicitacaoWorkflowItem {
  item_id: string;
  nome: string;
  quantidade: number;
  unidade: string;
  valor_unitario: number;
}

interface SolicitacaoWorkflow {
  version: 1;
  origem: "externa" | "interna";
  etapa: WorkflowStage;
  itens: SolicitacaoWorkflowItem[];
  fornecedor: string;
  frete: number;
  arte: "mesma" | "nova" | "desenvolver";
  arte_url: string | null;
  observacao: string;
  etapas_em: Partial<Record<WorkflowStage, string>>;
}

const WORKFLOW_MARKER = "[[SOLICITACAO_WORKFLOW_V1]]";
const WORKFLOW_STAGES: { value: WorkflowStage; label: string }[] = [
  { value: "solicitacao", label: "Solicitação" },
  { value: "cotacao", label: "Cotação" },
  { value: "aprovacao", label: "Aprovação" },
  { value: "arte", label: "Arte" },
  { value: "producao", label: "Produção" },
  { value: "concluida", label: "Concluída" },
];

function parseWorkflow(value: string | null): SolicitacaoWorkflow | null {
  if (!value?.startsWith(WORKFLOW_MARKER)) return null;
  try { return JSON.parse(value.slice(WORKFLOW_MARKER.length)) as SolicitacaoWorkflow; } catch { return null; }
}

function serializeWorkflow(value: SolicitacaoWorkflow) {
  return `${WORKFLOW_MARKER}${JSON.stringify(value)}`;
}

interface PackMovimentacao {
  id: string;
  pack_id: string;
  tipo: "entrada" | "saida";
  quantidade: number;
  saldo_resultante: number;
  observacao: string | null;
  created_at: string;
}

const CATEGORIAS = ["Brinde", "Papelaria", "Sacos plásticos", "Embalagem"];

export default function Estoque() {
  const [itens, setItens] = useState<EstoqueItem[]>([]);
  const [packs, setPacks] = useState<Pack[]>([]);
  const [solicitacoes, setSolicitacoes] = useState<Solicitacao[]>([]);
  const [packMovimentacoes, setPackMovimentacoes] = useState<PackMovimentacao[]>([]);
  const [docCounts, setDocCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoriaFilter, setCategoriaFilter] = useState("todas");
  const [quickFilter, setQuickFilter] = useState<"todos" | "criticos" | "recentes" | "sem_fornecedor" | "sem_link">("todos");
  const [sortBy, setSortBy] = useState<"recentes" | "nome" | "estoque" | "maior-estoque" | "menor-custo" | "maior-custo">("recentes");
  const [activeTab, setActiveTab] = useState<"itens" | "packs" | "solicitacoes">("itens");

  // Sheets
  const [showNewItem, setShowNewItem] = useState(false);
  const [editingItem, setEditingItem] = useState<EstoqueItem | null>(null);
  const [isEditingItemDetails, setIsEditingItemDetails] = useState(false);
  const [showEntrada, setShowEntrada] = useState(false);
  const [showSaida, setShowSaida] = useState(false);
  const [movItemId, setMovItemId] = useState<string | null>(null);
  const [movQtd, setMovQtd] = useState(0);
  const [showNewPack, setShowNewPack] = useState(false);
  const [editingPack, setEditingPack] = useState<Pack | null>(null);
  const [movingPack, setMovingPack] = useState<Pack | null>(null);
  const [packMovType, setPackMovType] = useState<"entrada" | "saida">("entrada");
  const [packMovQtd, setPackMovQtd] = useState(1);
  const [packMovObs, setPackMovObs] = useState("");
  const [showNewSolicitacao, setShowNewSolicitacao] = useState(false);
  const [requestItemPickerOpen, setRequestItemPickerOpen] = useState(false);
  const [requestNewItemId, setRequestNewItemId] = useState("");
  const [requestNewItemQtd, setRequestNewItemQtd] = useState(1);
  const [requestItems, setRequestItems] = useState<SolicitacaoWorkflowItem[]>([]);
  const [requestOrigin, setRequestOrigin] = useState<"externa" | "interna">("externa");
  const [requestSupplier, setRequestSupplier] = useState("");
  const [requestShipping, setRequestShipping] = useState(0);
  const [requestArt, setRequestArt] = useState<"mesma" | "nova" | "desenvolver">("mesma");
  const [requestArtFile, setRequestArtFile] = useState<File | null>(null);
  const [managingSolicitacao, setManagingSolicitacao] = useState<Solicitacao | null>(null);
  const [manageWorkflow, setManageWorkflow] = useState<SolicitacaoWorkflow | null>(null);
  const [manageArtFile, setManageArtFile] = useState<File | null>(null);
  const [editingSolicitacao, setEditingSolicitacao] = useState<Solicitacao | null>(null);
  const [editSolicitacaoForm, setEditSolicitacaoForm] = useState({ titulo: "", observacao: "", comentario: "" });

  // New item form
  const [newItem, setNewItem] = useState({
    nome: "", categoria: "", unidade: "unidade", saldo_atual: 0,
    minimo: 0, ideal: 0, custo_unitario: 0, fornecedor: "", compra_url: "",
  });
  const [newItemImage, setNewItemImage] = useState<File | null>(null);

  // Edit form
  const [editForm, setEditForm] = useState({
    nome: "", categoria: "", unidade: "", saldo_atual: 0,
    minimo: 0, ideal: 0, custo_unitario: 0, fornecedor: "", compra_url: "",
  });
  const [editImage, setEditImage] = useState<File | null>(null);

  // Pack form
  const [packForm, setPackForm] = useState({ nome: "", descricao: "" });
  const [packItensForm, setPackItensForm] = useState<{ item_id: string; quantidade: number }[]>([]);
  const [packNewItemId, setPackNewItemId] = useState("");
  const [packNewItemQtd, setPackNewItemQtd] = useState(1);
  const [packItemPickerOpen, setPackItemPickerOpen] = useState(false);
  const [packBagChoice, setPackBagChoice] = useState("sem_saco");
  const [solicitacaoForm, setSolicitacaoForm] = useState({
    finalidade: "cadastro" as "cadastro" | "reposicao" | "consumo",
    alvo_tipo: "livre" as "item" | "pack" | "livre",
    alvo_id: "",
    titulo: "",
    quantidade: 1,
    unidade: "unidade",
    observacao: "",
  });

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    const [itensRes, packsRes, packItensRes, docsRes, solicitacoesRes, packMovimentacoesRes] = await Promise.all([
      supabase.from("estoque_itens").select("*").order("nome"),
      supabase.from("packs").select("*").order("nome"),
      supabase.from("pack_itens").select("*"),
      supabase.from("estoque_itens_documentos").select("item_id"),
      supabase.from("estoque_solicitacoes").select("*").order("created_at", { ascending: false }),
      supabase.from("pack_movimentacoes").select("*").order("created_at", { ascending: false }),
    ]);
    if (itensRes.data) setItens(itensRes.data);

    const counts: Record<string, number> = {};
    (docsRes.data || []).forEach((d: { item_id: string }) => {
      counts[d.item_id] = (counts[d.item_id] || 0) + 1;
    });
    setDocCounts(counts);

    const packList = packsRes.data || [];
    const packItensList = packItensRes.data || [];
    const packsWithItens: Pack[] = packList.map(p => ({
      ...p,
      itens: packItensList.filter(pi => pi.pack_id === p.id),
    }));
    setPacks(packsWithItens);
    if (solicitacoesRes.data) setSolicitacoes(solicitacoesRes.data.map((solicitacao) => {
      const isCadastroRequest = solicitacao.alvo_tipo === "livre" && solicitacao.titulo.startsWith("[CADASTRO] ");
      const workflow = parseWorkflow(solicitacao.observacao);
      return {
        ...solicitacao,
        finalidade: isCadastroRequest ? "cadastro" : solicitacao.finalidade,
        titulo: isCadastroRequest ? solicitacao.titulo.replace(/^\[CADASTRO\]\s*/, "") : solicitacao.titulo,
        observacao: workflow?.observacao || solicitacao.observacao,
        workflow,
      } as Solicitacao;
    }));
    if (packMovimentacoesRes.data) setPackMovimentacoes(packMovimentacoesRes.data);
    setLoading(false);
  };

  const isRecent = (createdAt: string) => Date.now() - new Date(createdAt).getTime() <= 7 * 24 * 60 * 60 * 1000;
  const categorias = Array.from(new Set([...CATEGORIAS, ...itens.map((i) => i.categoria)])).sort((a, b) => a.localeCompare(b, "pt-BR"));
  const categoryCounts = itens.reduce<Record<string, number>>((counts, item) => {
    counts[item.categoria] = (counts[item.categoria] || 0) + 1;
    return counts;
  }, {});
  const quickCounts = {
    criticos: itens.filter((item) => item.saldo_atual < item.minimo).length,
    recentes: itens.filter((item) => isRecent(item.created_at)).length,
    sem_fornecedor: itens.filter((item) => !item.fornecedor?.trim()).length,
    sem_link: itens.filter((item) => !item.compra_url?.trim()).length,
  };
  const filtered = itens
    .filter((item) => {
      const query = search.trim().toLowerCase();
      const matchSearch = !query
        || item.nome.toLowerCase().includes(query)
        || item.categoria.toLowerCase().includes(query)
        || item.fornecedor?.toLowerCase().includes(query)
        || item.compra_url?.toLowerCase().includes(query);
      const matchCat = categoriaFilter === "todas" || item.categoria === categoriaFilter;
      const matchQuick = quickFilter === "todos"
        || (quickFilter === "criticos" && item.saldo_atual < item.minimo)
        || (quickFilter === "recentes" && isRecent(item.created_at))
        || (quickFilter === "sem_fornecedor" && !item.fornecedor?.trim())
        || (quickFilter === "sem_link" && !item.compra_url?.trim());
      return matchSearch && matchCat && matchQuick;
    })
    .sort((a, b) => {
      if (sortBy === "recentes") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sortBy === "estoque") return a.saldo_atual - b.saldo_atual;
      if (sortBy === "maior-estoque") return b.saldo_atual - a.saldo_atual;
      if (sortBy === "menor-custo") return a.custo_unitario - b.custo_unitario;
      if (sortBy === "maior-custo") return b.custo_unitario - a.custo_unitario;
      return a.nome.localeCompare(b.nome, "pt-BR");
    });
  const filteredPacks = packs.filter((pack) => {
    const query = search.trim().toLowerCase();
    return !query
      || pack.nome.toLowerCase().includes(query)
      || pack.descricao?.toLowerCase().includes(query)
      || pack.itens.some((packItem) => getItemName(packItem.item_id).toLowerCase().includes(query));
  });
  const filteredSolicitacoes = solicitacoes.filter((solicitacao) => {
    const query = search.trim().toLowerCase();
    return !query
      || solicitacao.titulo.toLowerCase().includes(query)
      || solicitacao.observacao?.toLowerCase().includes(query)
      || getSolicitacaoTarget(solicitacao).toLowerCase().includes(query);
  });

  const totalItens = itens.length;
  const alertaCount = itens.filter((i) => i.saldo_atual < i.minimo).length;
  const valorTotal = itens.reduce((acc, i) => acc + i.saldo_atual * i.custo_unitario, 0);

  const getEstoqueStatus = (item: EstoqueItem) => {
    const pct = item.minimo > 0 ? item.saldo_atual / item.minimo : 2;
    if (pct < 1) return { label: "Crítico", color: "text-destructive bg-destructive/10", barColor: "bg-destructive" };
    if (pct < 1.3) return { label: "Atenção", color: "text-accent-foreground bg-accent/20", barColor: "bg-accent" };
    return { label: "OK", color: "text-status-visited bg-status-visited/10", barColor: "bg-status-visited" };
  };

  function getItemName(id: string) {
    return itens.find((item) => item.id === id)?.nome || "—";
  }

  function getSolicitacaoTarget(solicitacao: Solicitacao) {
    if (solicitacao.item_id) return getItemName(solicitacao.item_id);
    if (solicitacao.pack_id) return packs.find((pack) => pack.id === solicitacao.pack_id)?.nome || "Pack removido";
    return solicitacao.titulo;
  }

  const getPackCoverItem = (pack: Pack) => pack.itens
    .map((packItem) => itens.find((item) => item.id === packItem.item_id))
    .find((item) => item?.imagem_url)
    || pack.itens.map((packItem) => itens.find((item) => item.id === packItem.item_id)).find(Boolean);

  const getPackCapacity = (pack: Pack) => {
    if (pack.itens.length === 0) return 0;
    return Math.min(...pack.itens.map((packItem) => {
      const item = itens.find((candidate) => candidate.id === packItem.item_id);
      return item && packItem.quantidade > 0 ? Math.floor(item.saldo_atual / packItem.quantidade) : 0;
    }));
  };

  const getPackCost = (pack: Pack) => pack.itens.reduce((total, packItem) => {
    const item = itens.find((candidate) => candidate.id === packItem.item_id);
    return total + (item?.custo_unitario || 0) * packItem.quantidade;
  }, 0);

  const isBagItem = (item?: EstoqueItem) => item?.categoria === "Sacos plásticos";
  const getPackBag = (pack: Pack) => pack.itens
    .map((packItem) => itens.find((item) => item.id === packItem.item_id))
    .find(isBagItem);

  // Image upload helper
  const uploadImage = async (file: File): Promise<string | null> => {
    const ext = file.name.split('.').pop();
    const fileName = `${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("item-images").upload(fileName, file);
    if (error) {
      toast({ title: "Erro ao enviar imagem", description: error.message, variant: "destructive" });
      return null;
    }
    const { data: urlData } = supabase.storage.from("item-images").getPublicUrl(fileName);
    return urlData.publicUrl;
  };

  const normalizePurchaseUrl = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    try {
      const parsed = new URL(withProtocol);
      return ["http:", "https:"].includes(parsed.protocol) ? parsed.toString() : null;
    } catch {
      return null;
    }
  };

  const uploadRequestArt = async (file: File) => {
    const safeName = file.name.replace(/[^\w.-]+/g, "_");
    const path = `solicitacoes/${crypto.randomUUID()}-${safeName}`;
    const { error } = await supabase.storage.from("estoque-documentos").upload(path, file);
    if (error) {
      toast({ title: "Erro ao enviar arte", description: error.message, variant: "destructive" });
      return null;
    }
    return supabase.storage.from("estoque-documentos").getPublicUrl(path).data.publicUrl;
  };

  // CRUD handlers
  const handleCreateItem = async () => {
    if (!newItem.nome.trim() || !newItem.categoria) {
      toast({ title: "Preencha nome e categoria", variant: "destructive" });
      return;
    }
    const compra_url = normalizePurchaseUrl(newItem.compra_url);
    if (newItem.compra_url.trim() && !compra_url) {
      toast({ title: "Link de compra inválido", description: "Informe um endereço como loja.com/produto ou https://loja.com/produto.", variant: "destructive" });
      return;
    }
    let imagem_url: string | null = null;
    if (newItemImage) {
      imagem_url = await uploadImage(newItemImage);
    }
    const { error } = await supabase.from("estoque_itens").insert({
      nome: newItem.nome, categoria: newItem.categoria, unidade: newItem.unidade,
      saldo_atual: newItem.saldo_atual, minimo: newItem.minimo, ideal: newItem.ideal,
      custo_unitario: newItem.custo_unitario, fornecedor: newItem.fornecedor || null,
      imagem_url, compra_url,
    });
    if (error) {
      toast({ title: "Erro ao cadastrar", description: error.message, variant: "destructive" });
      return;
    }
    setNewItem({ nome: "", categoria: "", unidade: "unidade", saldo_atual: 0, minimo: 0, ideal: 0, custo_unitario: 0, fornecedor: "", compra_url: "" });
    setNewItemImage(null);
    setShowNewItem(false);
    toast({ title: "Item cadastrado!" });
    fetchAll();
  };

  const openEdit = (item: EstoqueItem) => {
    setEditForm({
      nome: item.nome, categoria: item.categoria, unidade: item.unidade,
      saldo_atual: item.saldo_atual, minimo: item.minimo, ideal: item.ideal,
      custo_unitario: item.custo_unitario, fornecedor: item.fornecedor || "",
      compra_url: item.compra_url || "",
    });
    setEditImage(null);
    setIsEditingItemDetails(false);
    setEditingItem(item);
  };

  const handleSaveEdit = async () => {
    if (!editingItem) return;
    const compra_url = normalizePurchaseUrl(editForm.compra_url);
    if (editForm.compra_url.trim() && !compra_url) {
      toast({ title: "Link de compra inválido", description: "Informe um endereço como loja.com/produto ou https://loja.com/produto.", variant: "destructive" });
      return;
    }
    let imagem_url = editingItem.imagem_url;
    if (editImage) {
      imagem_url = await uploadImage(editImage);
    }
    const { error } = await supabase.from("estoque_itens").update({
      nome: editForm.nome, categoria: editForm.categoria, unidade: editForm.unidade,
      saldo_atual: editForm.saldo_atual, minimo: editForm.minimo, ideal: editForm.ideal,
      custo_unitario: editForm.custo_unitario, fornecedor: editForm.fornecedor || null,
      imagem_url, compra_url,
    }).eq("id", editingItem.id);
    if (error) {
      toast({ title: "Erro ao atualizar", description: error.message, variant: "destructive" });
      return;
    }
    setEditingItem(null);
    toast({ title: "Item atualizado!" });
    fetchAll();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("estoque_itens").delete().eq("id", id);
    toast({ title: "Item removido do estoque" });
    fetchAll();
  };

  const openEntrada = (id: string) => { setMovItemId(id); setMovQtd(0); setShowEntrada(true); };
  const openSaida = (id: string) => { setMovItemId(id); setMovQtd(0); setShowSaida(true); };

  const handleEntrada = async () => {
    if (!movItemId || movQtd <= 0) return;
    const item = itens.find(i => i.id === movItemId);
    if (!item) return;
    const { error } = await supabase.from("estoque_itens").update({ saldo_atual: item.saldo_atual + movQtd }).eq("id", movItemId);
    if (!error) { setShowEntrada(false); toast({ title: `+${movQtd} unidades registradas` }); fetchAll(); }
  };

  const handleSaida = async () => {
    if (!movItemId || movQtd <= 0) return;
    const item = itens.find(i => i.id === movItemId);
    if (!item) return;
    const { error } = await supabase.from("estoque_itens").update({ saldo_atual: Math.max(0, item.saldo_atual - movQtd) }).eq("id", movItemId);
    if (!error) { setShowSaida(false); toast({ title: `-${movQtd} unidades registradas` }); fetchAll(); }
  };

  // Pack CRUD
  const getPackCompositionForSave = () => {
    if (packItensForm.length === 0) {
      toast({ title: "Adicione pelo menos um item principal ao pack", variant: "destructive" });
      return null;
    }
    if (!packBagChoice) {
      toast({ title: "Informe o saco do pack ou marque “Sem saco”", variant: "destructive" });
      return null;
    }
    const composition = packItensForm.filter((component) => !isBagItem(itens.find((item) => item.id === component.item_id)));
    if (packBagChoice !== "sem_saco") {
      composition.push({ item_id: packBagChoice, quantidade: 1 });
    }
    return composition;
  };

  const handleCreatePack = async () => {
    if (!packForm.nome.trim()) {
      toast({ title: "Informe o nome do pack", variant: "destructive" });
      return;
    }
    const composition = getPackCompositionForSave();
    if (!composition) return;
    const { data, error } = await supabase.from("packs").insert({
      nome: packForm.nome, descricao: packForm.descricao || null,
    }).select().single();
    if (error || !data) {
      toast({ title: "Erro ao criar pack", description: error?.message, variant: "destructive" });
      return;
    }
    const inserts = composition.map(pi => ({ pack_id: data.id, item_id: pi.item_id, quantidade: pi.quantidade }));
    await supabase.from("pack_itens").insert(inserts);
    setPackForm({ nome: "", descricao: "" });
    setPackItensForm([]);
    setPackBagChoice("sem_saco");
    setShowNewPack(false);
    toast({ title: "Pack criado!" });
    fetchAll();
  };

  const handleSavePack = async () => {
    if (!editingPack) return;
    const composition = getPackCompositionForSave();
    if (!composition) return;
    await supabase.from("packs").update({
      nome: packForm.nome, descricao: packForm.descricao || null,
    }).eq("id", editingPack.id);
    // Replace pack items
    await supabase.from("pack_itens").delete().eq("pack_id", editingPack.id);
    if (composition.length > 0) {
      const inserts = composition.map(pi => ({ pack_id: editingPack.id, item_id: pi.item_id, quantidade: pi.quantidade }));
      await supabase.from("pack_itens").insert(inserts);
    }
    setEditingPack(null);
    toast({ title: "Pack atualizado!" });
    fetchAll();
  };

  const handleDeletePack = async (id: string) => {
    await supabase.from("packs").delete().eq("id", id);
    toast({ title: "Pack removido" });
    fetchAll();
  };

  const openEditPack = (pack: Pack) => {
    setPackForm({ nome: pack.nome, descricao: pack.descricao || "" });
    const bag = getPackBag(pack);
    setPackBagChoice(bag?.id || "sem_saco");
    setPackItensForm(pack.itens
      .filter((component) => component.item_id !== bag?.id)
      .map(pi => ({ item_id: pi.item_id, quantidade: pi.quantidade })));
    setEditingPack(pack);
  };

  const handleAddPackItem = () => {
    if (!packNewItemId) return;
    if (packItensForm.some(i => i.item_id === packNewItemId)) {
      toast({ title: "Item já adicionado", variant: "destructive" });
      return;
    }
    setPackItensForm(prev => [...prev, { item_id: packNewItemId, quantidade: packNewItemQtd }]);
    setPackNewItemId("");
    setPackNewItemQtd(1);
  };

  const openPackMovement = (pack: Pack, type: "entrada" | "saida") => {
    setMovingPack(pack);
    setPackMovType(type);
    setPackMovQtd(1);
    setPackMovObs("");
  };

  const handlePackMovement = async () => {
    if (!movingPack || packMovQtd <= 0) return;
    const { error } = await supabase.rpc("movimentar_pack", {
      p_pack_id: movingPack.id,
      p_tipo: packMovType,
      p_quantidade: packMovQtd,
      p_observacao: packMovObs || null,
    });
    if (error) {
      toast({ title: "Não foi possível movimentar o pack", description: error.message, variant: "destructive" });
      return;
    }
    toast({
      title: packMovType === "entrada" ? `${packMovQtd} pack(s) montado(s)` : `${packMovQtd} pack(s) retirado(s)`,
      description: packMovType === "entrada" ? "Os itens da composição foram baixados do estoque." : "A saída foi registrada no histórico.",
    });
    setMovingPack(null);
    fetchAll();
  };

  const openSolicitacao = (target?: EstoqueItem | Pack, targetType?: "item" | "pack", finalidade: "cadastro" | "reposicao" | "consumo" = "cadastro") => {
    const isCadastro = finalidade === "cadastro";
    const isPurchaseWorkflow = finalidade === "reposicao";
    setSolicitacaoForm({
      finalidade,
      alvo_tipo: isCadastro || isPurchaseWorkflow ? "livre" : targetType || "item",
      alvo_id: isCadastro || isPurchaseWorkflow ? "" : target?.id || "",
      titulo: target ? `${finalidade === "reposicao" ? "Repor" : finalidade === "consumo" ? "Consumir" : "Cadastrar"} ${target.nome}` : "",
      quantidade: 1,
      unidade: targetType === "pack" ? "pack" : target && "unidade" in target ? target.unidade : "unidade",
      observacao: "",
    });
    setRequestItems(target ? [{
      item_id: target.id,
      nome: target.nome,
      quantidade: 1,
      unidade: targetType === "pack" ? "pack" : "unidade" in target ? target.unidade : "unidade",
      valor_unitario: "custo_unitario" in target ? target.custo_unitario : getPackCost(target as Pack),
    }] : []);
    setRequestNewItemId("");
    setRequestNewItemQtd(1);
    setRequestOrigin("externa");
    setRequestSupplier("");
    setRequestShipping(0);
    setRequestArt("mesma");
    setRequestArtFile(null);
    setShowNewSolicitacao(true);
  };

  const handleCreateSolicitacao = async () => {
    const isPurchaseWorkflow = solicitacaoForm.finalidade === "reposicao";
    if (isPurchaseWorkflow && requestItems.length === 0) {
      toast({ title: "Adicione pelo menos um item à solicitação", variant: "destructive" });
      return;
    }
    if (!solicitacaoForm.titulo.trim() || (solicitacaoForm.alvo_tipo !== "livre" && !solicitacaoForm.alvo_id)) {
      toast({ title: "Informe o pedido e o item ou pack", variant: "destructive" });
      return;
    }
    let arteUrl: string | null = null;
    if (isPurchaseWorkflow && requestArt === "nova" && requestArtFile) {
      arteUrl = await uploadRequestArt(requestArtFile);
      if (!arteUrl) return;
    }
    const workflow: SolicitacaoWorkflow | null = isPurchaseWorkflow ? {
      version: 1,
      origem: requestOrigin,
      etapa: "solicitacao",
      itens: requestItems,
      fornecedor: requestSupplier.trim(),
      frete: requestShipping,
      arte: requestArt,
      arte_url: arteUrl,
      observacao: solicitacaoForm.observacao.trim(),
      etapas_em: { solicitacao: new Date().toISOString() },
    } : null;
    const { error } = await supabase.from("estoque_solicitacoes").insert({
      finalidade: solicitacaoForm.finalidade === "cadastro" ? "reposicao" : solicitacaoForm.finalidade,
      alvo_tipo: isPurchaseWorkflow ? "livre" : solicitacaoForm.alvo_tipo,
      item_id: !isPurchaseWorkflow && solicitacaoForm.alvo_tipo === "item" ? solicitacaoForm.alvo_id : null,
      pack_id: !isPurchaseWorkflow && solicitacaoForm.alvo_tipo === "pack" ? solicitacaoForm.alvo_id : null,
      titulo: solicitacaoForm.finalidade === "cadastro" ? `[CADASTRO] ${solicitacaoForm.titulo.trim()}` : solicitacaoForm.titulo.trim(),
      quantidade: isPurchaseWorkflow ? requestItems.reduce((total, item) => total + item.quantidade, 0) : solicitacaoForm.quantidade,
      unidade: isPurchaseWorkflow ? "itens" : solicitacaoForm.unidade,
      observacao: workflow ? serializeWorkflow(workflow) : solicitacaoForm.observacao.trim() || null,
    });
    if (error) {
      toast({ title: "Erro ao criar solicitação", description: error.message, variant: "destructive" });
      return;
    }
    setShowNewSolicitacao(false);
    toast({
      title: solicitacaoForm.finalidade === "cadastro" ? "Solicitação de cadastro registrada" : "Solicitação registrada",
      description: solicitacaoForm.finalidade === "cadastro" ? "Ela poderá ser concluída sem alterar o estoque." : undefined,
    });
    fetchAll();
  };

  const updateSolicitacaoStatus = async (id: string, status: Solicitacao["status"]) => {
    const { error } = await supabase.from("estoque_solicitacoes").update({ status }).eq("id", id);
    if (error) {
      toast({ title: "Erro ao atualizar solicitação", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Status atualizado" });
    fetchAll();
  };

  const openEditSolicitacao = (solicitacao: Solicitacao) => {
    setEditingSolicitacao(solicitacao);
    setEditSolicitacaoForm({
      titulo: solicitacao.titulo,
      observacao: solicitacao.observacao || "",
      comentario: "",
    });
  };

  const handleSaveSolicitacao = async () => {
    if (!editingSolicitacao || !editSolicitacaoForm.titulo.trim()) return;
    const comentario = editSolicitacaoForm.comentario.trim();
    const timestamp = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date());
    const observacao = [
      editSolicitacaoForm.observacao.trim(),
      comentario ? `[Comentário · ${timestamp}]\n${comentario}` : "",
    ].filter(Boolean).join("\n\n");
    const workflow = editingSolicitacao.workflow
      ? { ...editingSolicitacao.workflow, observacao }
      : null;
    const storedTitle = editingSolicitacao.finalidade === "cadastro"
      ? `[CADASTRO] ${editSolicitacaoForm.titulo.trim()}`
      : editSolicitacaoForm.titulo.trim();
    const { error } = await supabase.from("estoque_solicitacoes").update({
      titulo: storedTitle,
      observacao: workflow ? serializeWorkflow(workflow) : observacao || null,
    }).eq("id", editingSolicitacao.id);
    if (error) {
      toast({ title: "Erro ao editar solicitação", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Solicitação atualizada", description: comentario ? "O novo comentário foi acrescentado ao histórico." : undefined });
    setEditingSolicitacao(null);
    fetchAll();
  };

  const addRequestItem = () => {
    const item = itens.find((candidate) => candidate.id === requestNewItemId);
    if (!item) return;
    if (requestItems.some((candidate) => candidate.item_id === item.id)) {
      toast({ title: "Este item já está na solicitação", variant: "destructive" });
      return;
    }
    setRequestItems((current) => [...current, {
      item_id: item.id,
      nome: item.nome,
      quantidade: requestNewItemQtd,
      unidade: item.unidade,
      valor_unitario: item.custo_unitario,
    }]);
    setRequestNewItemId("");
    setRequestNewItemQtd(1);
  };

  const openManageWorkflow = (solicitacao: Solicitacao) => {
    if (!solicitacao.workflow) return;
    setManagingSolicitacao(solicitacao);
    setManageWorkflow(structuredClone(solicitacao.workflow));
    setManageArtFile(null);
  };

  const saveManagedWorkflow = async (nextStage?: WorkflowStage) => {
    if (!managingSolicitacao || !manageWorkflow) return;
    let arteUrl = manageWorkflow.arte_url;
    if (manageArtFile) {
      arteUrl = await uploadRequestArt(manageArtFile);
      if (!arteUrl) return;
    }
    const etapa = nextStage || manageWorkflow.etapa;
    const updated: SolicitacaoWorkflow = {
      ...manageWorkflow,
      etapa,
      arte_url: arteUrl,
      etapas_em: { ...manageWorkflow.etapas_em, [etapa]: manageWorkflow.etapas_em[etapa] || new Date().toISOString() },
    };
    const status: Solicitacao["status"] = etapa === "concluida" ? "atendida" : etapa === "aprovacao" || etapa === "arte" || etapa === "producao" ? "aprovada" : "pendente";
    const { error } = await supabase.from("estoque_solicitacoes").update({
      observacao: serializeWorkflow(updated),
      status,
      quantidade: updated.itens.reduce((total, item) => total + item.quantidade, 0),
      unidade: "itens",
    }).eq("id", managingSolicitacao.id);
    if (error) {
      toast({ title: "Erro ao atualizar a jornada", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: etapa === "concluida" ? "Solicitação concluída" : "Jornada atualizada", description: etapa === "concluida" ? "Nenhuma movimentação de estoque foi feita automaticamente." : undefined });
    setManagingSolicitacao(null);
    setManageWorkflow(null);
    fetchAll();
  };

  const getWorkflowTotal = (workflow: SolicitacaoWorkflow) => workflow.itens.reduce((total, item) => total + item.quantidade * item.valor_unitario, 0) + workflow.frete;
  const getDaysOpen = (createdAt: string, completedAt?: string) => Math.max(0, Math.floor((new Date(completedAt || Date.now()).getTime() - new Date(createdAt).getTime()) / 86400000));
  const getNextStage = (workflow: SolicitacaoWorkflow): WorkflowStage | null => {
    const route: WorkflowStage[] = workflow.origem === "interna"
      ? ["solicitacao", "arte", "producao", "concluida"]
      : ["solicitacao", "cotacao", "aprovacao", "arte", "producao", "concluida"];
    const index = route.indexOf(workflow.etapa);
    return index >= 0 && index < route.length - 1 ? route[index + 1] : null;
  };

  const movItem = itens.find(i => i.id === movItemId);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const ImageInput = ({ file, onChange, currentUrl }: { file: File | null; onChange: (f: File | null) => void; currentUrl?: string | null }) => (
    <div className="space-y-1.5">
      <Label className="text-xs">Imagem</Label>
      <div className="flex items-center gap-3">
        {(currentUrl || file) && (
          <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted flex-shrink-0">
            <img
              src={file ? URL.createObjectURL(file) : currentUrl!}
              alt="Preview"
              className="w-full h-full object-cover"
            />
          </div>
        )}
        <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-border cursor-pointer hover:bg-muted/50 transition-colors text-xs text-muted-foreground">
          <Upload className="w-3.5 h-3.5" />
          {file ? file.name : "Enviar foto"}
          <input type="file" accept="image/*" className="hidden" onChange={e => onChange(e.target.files?.[0] || null)} />
        </label>
      </div>
    </div>
  );

  const PackItemsEditor = () => (
    <div className="surface-panel rounded-lg p-3 space-y-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-foreground">Composição do pack</p>
        <p className="mt-0.5 text-[10px] text-muted-foreground">Escolha os materiais, suas quantidades e o saco usado na montagem.</p>
      </div>
      <div className="space-y-2">
        <Label className="text-[10px] text-muted-foreground">Brinde ou item principal *</Label>
        <Popover open={packItemPickerOpen} onOpenChange={setPackItemPickerOpen}>
          <PopoverTrigger asChild>
            <Button type="button" variant="outline" role="combobox" aria-expanded={packItemPickerOpen} className="h-10 w-full justify-start px-3 text-xs font-normal">
              <Search className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
              <span className="truncate">{packNewItemId ? getItemName(packNewItemId) : "Pesquisar e selecionar um item..."}</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
            <Command>
              <CommandInput placeholder="Buscar por nome ou categoria..." />
              <CommandList className="max-h-64">
                <CommandEmpty>Nenhum item encontrado.</CommandEmpty>
                <CommandGroup heading="Itens disponíveis">
                  {itens.filter((item) => !isBagItem(item)).map((item) => (
                    <CommandItem key={item.id} value={`${item.nome} ${item.categoria}`} onSelect={() => { setPackNewItemId(item.id); setPackItemPickerOpen(false); }}>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium">{item.nome}</p>
                        <p className="text-[10px] text-muted-foreground">{item.categoria} · saldo {item.saldo_atual}</p>
                      </div>
                      {packNewItemId === item.id && <Check className="h-3.5 w-3.5 text-primary" />}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        <div className="flex gap-2">
          <div className="flex-1">
            <Label className="text-[10px] text-muted-foreground">Quantidade</Label>
            <Input type="number" min={1} value={packNewItemQtd} onChange={e => setPackNewItemQtd(Math.max(1, Number(e.target.value)))} />
          </div>
          <div className="flex items-end">
            <Button onClick={handleAddPackItem} disabled={!packNewItemId} size="sm">
              <Plus className="w-3.5 h-3.5 mr-1" /> Add
            </Button>
          </div>
        </div>
      </div>
      {packItensForm.length > 0 ? (
        <div className="space-y-1.5">
          {packItensForm.map(pi => (
            <div key={pi.item_id} className="flex items-center gap-2 text-xs bg-muted/50 p-2.5 rounded-lg">
              <Package className="w-3 h-3 text-muted-foreground flex-shrink-0" />
              <span className="flex-1 truncate">{getItemName(pi.item_id)}</span>
              <span className="font-semibold text-muted-foreground">×{pi.quantidade}</span>
              <button onClick={() => setPackItensForm(prev => prev.filter(x => x.item_id !== pi.item_id))} className="text-destructive/60 hover:text-destructive">
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="rounded-lg border border-dashed border-border py-3 text-center text-xs italic text-muted-foreground">Nenhum item principal adicionado</p>
      )}
      <div className="space-y-1.5 border-t border-border/70 pt-3">
        <Label className="text-[10px] text-muted-foreground">Saco para montagem *</Label>
        <Select value={packBagChoice} onValueChange={setPackBagChoice}>
          <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="sem_saco" className="text-xs">Sem saco</SelectItem>
            {itens.filter(isBagItem).map((item) => (
              <SelectItem key={item.id} value={item.id} className="text-xs">{item.nome} · saldo {item.saldo_atual}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-[10px] text-muted-foreground">O saco entra automaticamente na composição e no cálculo do estoque. Se o pack não usar embalagem, escolha “Sem saco”.</p>
      </div>
    </div>
  );

  return (
    <div className="page-shell space-y-4 animate-fade-in pb-24">
      <div className="page-hero rounded-lg p-4 sm:p-5">
        <h1 className="font-display text-xl font-bold">Estoque de Materiais</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Brindes, papelaria, sacos plásticos e packs</p>
      </div>

      {/* Tabs */}
      <div className="filter-bar flex gap-1 p-1 rounded-lg">
        <button className={cn("flex-1 text-xs font-medium py-2 rounded-md transition-colors", activeTab === "itens" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground")} onClick={() => setActiveTab("itens")}>
          <Package className="w-3.5 h-3.5 inline mr-1" /> Itens ({itens.length})
        </button>
        <button className={cn("flex-1 text-xs font-medium py-2 rounded-md transition-colors", activeTab === "packs" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground")} onClick={() => setActiveTab("packs")}>
          <Layers className="w-3.5 h-3.5 inline mr-1" /> Packs ({packs.length})
        </button>
        <button className={cn("flex-1 text-xs font-medium py-2 rounded-md transition-colors", activeTab === "solicitacoes" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground")} onClick={() => setActiveTab("solicitacoes")}>
          <ClipboardList className="w-3.5 h-3.5 inline mr-1" /> Solicitações ({solicitacoes.filter((solicitacao) => solicitacao.status === "pendente").length})
        </button>
      </div>

      {/* Actions */}
      <div className="filter-bar rounded-lg p-2 flex gap-2">
        {activeTab === "itens" ? (
          <>
            <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => { if (itens[0]) openEntrada(itens[0].id); }}>
              <ArrowDown className="w-3.5 h-3.5 mr-1" /> Entrada
            </Button>
            <Button size="sm" className="flex-1 text-xs" onClick={() => setShowNewItem(true)}>
              <Plus className="w-3.5 h-3.5 mr-1" /> Novo Item
            </Button>
          </>
        ) : activeTab === "packs" ? (
          <Button size="sm" className="flex-1 text-xs" onClick={() => { setPackForm({ nome: "", descricao: "" }); setPackItensForm([]); setPackNewItemId(""); setPackBagChoice("sem_saco"); setShowNewPack(true); }}>
            <Plus className="w-3.5 h-3.5 mr-1" /> Novo Pack
          </Button>
        ) : (
          <Button size="sm" className="flex-1 text-xs" onClick={() => openSolicitacao()}>
            <Plus className="w-3.5 h-3.5 mr-1" /> Nova Solicitação
          </Button>
        )}
      </div>

      {/* KPIs */}
      {activeTab === "itens" && (
        <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
          <div className="metric-card flex min-w-0 items-center gap-1.5 rounded-lg p-2 sm:gap-2 sm:p-3">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 sm:h-8 sm:w-8"><Boxes className="h-3.5 w-3.5 text-primary sm:h-4 sm:w-4" /></div>
            <div className="min-w-0"><p className="truncate text-base font-bold leading-none text-foreground sm:text-lg">{totalItens}</p><p className="mt-0.5 truncate text-[8px] text-muted-foreground sm:text-[9px]">Tipos</p></div>
          </div>
          <div className={cn("metric-card flex min-w-0 items-center gap-1.5 rounded-lg p-2 sm:gap-2 sm:p-3", alertaCount > 0 ? "border-destructive/30" : "border-border")}>
            <div className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-lg sm:h-8 sm:w-8", alertaCount > 0 ? "bg-destructive/10" : "bg-muted")}><AlertCircle className={cn("h-3.5 w-3.5 sm:h-4 sm:w-4", alertaCount > 0 ? "text-destructive" : "text-muted-foreground")} /></div>
            <div className="min-w-0"><p className={cn("truncate text-base font-bold leading-none sm:text-lg", alertaCount > 0 ? "text-destructive" : "text-foreground")}>{alertaCount}</p><p className="mt-0.5 truncate text-[8px] text-muted-foreground sm:text-[9px]">Alertas</p></div>
          </div>
          <div className="metric-card flex min-w-0 items-center gap-1.5 rounded-lg p-2 sm:gap-2 sm:p-3">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-accent/10 sm:h-8 sm:w-8"><TrendingDown className="h-3.5 w-3.5 text-accent-foreground sm:h-4 sm:w-4" /></div>
            <div className="min-w-0"><p className="truncate text-sm font-bold leading-none text-foreground sm:text-base">R${valorTotal.toFixed(0)}</p><p className="mt-0.5 truncate text-[8px] text-muted-foreground sm:text-[9px]">Valor</p></div>
          </div>
        </div>
      )}

      {/* Search and discovery controls */}
      <div className="filter-bar rounded-xl p-2.5 space-y-2.5">
        <div className="flex flex-col gap-2 lg:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input placeholder={activeTab === "itens" ? "Buscar produto, categoria ou fornecedor..." : activeTab === "packs" ? "Buscar pack..." : "Buscar solicitação..."} value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9 text-xs" />
          </div>
          {activeTab === "itens" && (
            <Select value={sortBy} onValueChange={(value) => setSortBy(value as typeof sortBy)}>
              <SelectTrigger className="h-9 text-xs lg:w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="recentes" className="text-xs">Mais recentes</SelectItem>
                <SelectItem value="nome" className="text-xs">Nome (A–Z)</SelectItem>
                <SelectItem value="estoque" className="text-xs">Menor estoque</SelectItem>
                <SelectItem value="maior-estoque" className="text-xs">Maior saldo</SelectItem>
                <SelectItem value="menor-custo" className="text-xs">Menor custo</SelectItem>
                <SelectItem value="maior-custo" className="text-xs">Maior custo</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>

        {activeTab === "itens" && (
          <>
            <div className="flex gap-1.5 overflow-x-auto pb-0.5" aria-label="Filtrar por categoria">
              <button type="button" onClick={() => setCategoriaFilter("todas")} className={cn("shrink-0 rounded-full border px-3 py-1.5 text-[10px] font-semibold transition-colors", categoriaFilter === "todas" ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground")}>Todos <span className="ml-1 opacity-75">{itens.length}</span></button>
              {categorias.map((categoria) => (
                <button key={categoria} type="button" onClick={() => setCategoriaFilter(categoria)} className={cn("shrink-0 rounded-full border px-3 py-1.5 text-[10px] font-semibold transition-colors", categoriaFilter === categoria ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground")}>
                   {categoria} <span className="ml-1 opacity-75">{categoryCounts[categoria] || 0}</span>
                </button>
              ))}
            </div>
            <div className="flex gap-1.5 overflow-x-auto border-t border-border/70 pt-2" aria-label="Filtros rápidos">
              {([
                { value: "criticos", label: "Estoque crítico", count: quickCounts.criticos, icon: AlertCircle },
                { value: "recentes", label: "Recém-cadastrados", count: quickCounts.recentes, icon: Clock3 },
                { value: "sem_fornecedor", label: "Sem fornecedor", count: quickCounts.sem_fornecedor, icon: Store },
                { value: "sem_link", label: "Sem link de compra", count: quickCounts.sem_link, icon: Link2Off },
              ] as const).map((filter) => {
                const Icon = filter.icon;
                const selected = quickFilter === filter.value;
                return (
                  <button key={filter.value} type="button" onClick={() => setQuickFilter(selected ? "todos" : filter.value)} className={cn("flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[10px] font-medium transition-colors", selected ? "border-primary/30 bg-primary/10 text-primary" : "border-transparent bg-muted/55 text-muted-foreground hover:bg-muted hover:text-foreground")}>
                    <Icon className="h-3 w-3" /> {filter.label} <span className={cn("rounded-full px-1.5 py-0.5 text-[9px] font-bold", selected ? "bg-primary text-primary-foreground" : "bg-background text-foreground")}>{filter.count}</span>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* VISUAL ITEM GALLERY */}
      {activeTab === "itens" && (
        <div className="space-y-3">
          {filtered.length > 0 && (
            <div className="flex items-center justify-between px-1">
              <p className="text-xs font-medium text-muted-foreground">
                {filtered.length} {filtered.length === 1 ? "item encontrado" : "itens encontrados"}
              </p>
              {(categoriaFilter !== "todas" || quickFilter !== "todos" || search) && (
                <button onClick={() => { setCategoriaFilter("todas"); setQuickFilter("todos"); setSearch(""); }} className="text-[10px] font-semibold text-primary hover:underline">
                  Limpar filtros
                </button>
              )}
            </div>
          )}
          <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-[repeat(auto-fill,minmax(260px,1fr))] sm:gap-3">
                {filtered.map((item) => {
                  const st = getEstoqueStatus(item);
                  const pct = item.ideal > 0 ? Math.min((item.saldo_atual / item.ideal) * 100, 100) : 0;
                  return (
                    <article key={item.id} className="group flex min-w-0 flex-col overflow-hidden rounded-lg border border-border bg-card shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg sm:rounded-xl">
                      <button
                        type="button"
                        onClick={() => openEdit(item)}
                        className="relative block aspect-square w-full overflow-hidden bg-gradient-to-br from-primary/15 via-secondary to-accent/10 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset sm:aspect-[4/3]"
                        aria-label={`Visualizar e editar ${item.nome}`}
                      >
                        {item.imagem_url ? (
                          <img src={item.imagem_url} alt={item.nome} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
                        ) : (
                          <div className="flex h-full w-full flex-col items-center justify-center text-primary/35">
                            <Package className="h-7 w-7 sm:h-14 sm:w-14" strokeWidth={1.25} />
                            <span className="mt-1 text-[7px] font-semibold uppercase tracking-[0.12em] sm:mt-2 sm:text-[10px] sm:tracking-[0.18em]">Sem imagem</span>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-black/5" />

                        <div className="absolute left-1.5 right-1.5 top-1.5 flex items-start justify-between gap-1 sm:left-3 sm:right-3 sm:top-3 sm:gap-2">
                          <Badge className="max-w-full truncate border-white/25 bg-white/90 px-1 py-0 text-[7px] font-bold text-foreground shadow-sm backdrop-blur-sm hover:bg-white sm:px-2 sm:text-[9px]">
                            {item.categoria}
                          </Badge>
                          <Badge className={cn("hidden border-0 px-2 text-[9px] font-bold shadow-sm sm:inline-flex", st.color)} variant="secondary">{st.label}</Badge>
                        </div>

                      </button>

                      <button type="button" onClick={() => openEdit(item)} className="flex flex-1 flex-col p-1.5 text-left sm:hidden" aria-label={`Abrir detalhes de ${item.nome}`}>
                        <h3 className="line-clamp-2 min-h-7 font-display text-[9px] font-bold leading-tight text-foreground">{item.nome}</h3>
                        <div className="mt-auto flex items-baseline gap-0.5 pt-1">
                          <span className={cn("text-xs font-bold", item.saldo_atual < item.minimo ? "text-destructive" : "text-primary")}>{item.saldo_atual}</span>
                          <span className="truncate text-[7px] text-muted-foreground">{item.unidade}(s)</span>
                        </div>
                      </button>

                      <div className="hidden flex-1 flex-col p-3 sm:flex">
                        <div className="min-w-0">
                          <h3 className="line-clamp-2 min-h-9 font-display text-sm font-bold leading-[1.15] text-foreground">{item.nome}</h3>
                          {docCounts[item.id] > 0 && <span className="mt-1.5 flex items-center gap-1 text-[10px] font-medium text-primary"><Paperclip className="h-2.5 w-2.5" /> {docCounts[item.id]} {docCounts[item.id] === 1 ? "arquivo vinculado" : "arquivos vinculados"}</span>}
                        </div>

                        <div className="mt-3 flex items-end justify-between gap-3">
                          <div>
                            <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Disponível agora</p>
                            <p className="mt-0.5 text-lg font-bold leading-none text-foreground">
                              {item.saldo_atual} <span className="text-[10px] font-medium text-muted-foreground">{item.unidade}(s)</span>
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-[9px] text-muted-foreground">Valor por unidade</p>
                            <p className="text-xs font-bold text-foreground">R$ {item.custo_unitario.toFixed(2)}</p>
                          </div>
                        </div>
                        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                          <div className={cn("h-full rounded-full transition-all", st.barColor)} style={{ width: `${pct}%` }} />
                        </div>
                        <div className="mt-2 flex items-center justify-between text-[9px] text-muted-foreground">
                          <span>{item.saldo_atual < item.minimo ? `Faltam ${item.minimo - item.saldo_atual} para o mínimo` : `Mínimo ${item.minimo} · Meta ${item.ideal}`}</span>
                          <span>Cadastro {new Date(item.created_at).toLocaleDateString("pt-BR")}</span>
                        </div>

                        <div className="mt-auto grid grid-cols-[1fr_1fr_auto] gap-1.5 border-t border-border/70 pt-3">
                          <Button type="button" size="sm" variant="outline" className="h-8 px-2 text-[10px]" onClick={() => openEdit(item)}>
                            <Eye className="mr-1 h-3 w-3" /> Ver produto
                          </Button>
                          {item.compra_url ? (
                            <Button asChild size="sm" className="h-8 px-2 text-[10px]">
                              <a href={item.compra_url} target="_blank" rel="noreferrer"><ShoppingCart className="mr-1 h-3 w-3" /> Comprar / repor</a>
                            </Button>
                          ) : (
                            <Button type="button" size="sm" variant="secondary" className="h-8 px-2 text-[10px] text-muted-foreground" disabled>
                              <Link2Off className="mr-1 h-3 w-3" /> Sem link
                            </Button>
                          )}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button type="button" size="icon" variant="ghost" className="h-8 w-8" aria-label={`Mais ações para ${item.nome}`}><MoreHorizontal className="h-4 w-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40">
                              <DropdownMenuItem onSelect={() => openEntrada(item.id)} className="text-xs"><ArrowDown className="mr-2 h-3.5 w-3.5" /> Registrar entrada</DropdownMenuItem>
                              <DropdownMenuItem onSelect={() => openSaida(item.id)} className="text-xs"><ArrowUp className="mr-2 h-3.5 w-3.5" /> Registrar saída</DropdownMenuItem>
                              <DropdownMenuItem onSelect={() => openSolicitacao(item, "item", "reposicao")} className="text-xs"><ClipboardList className="mr-2 h-3.5 w-3.5" /> Solicitar reposição</DropdownMenuItem>
                              <DropdownMenuItem onSelect={() => openSolicitacao(item, "item", "consumo")} className="text-xs"><Send className="mr-2 h-3.5 w-3.5" /> Solicitar consumo</DropdownMenuItem>
                              <DropdownMenuItem onSelect={() => openEdit(item)} className="text-xs"><Pencil className="mr-2 h-3.5 w-3.5" /> Editar item</DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onSelect={() => handleDelete(item.id)} className="text-xs text-destructive focus:text-destructive"><Trash2 className="mr-2 h-3.5 w-3.5" /> Excluir item</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </article>
                  );
                })}
          </div>
          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Package className="w-10 h-10 mb-3 opacity-30" />
              <p className="text-sm">Nenhum item encontrado</p>
              <Button size="sm" variant="outline" className="mt-3" onClick={() => setShowNewItem(true)}>
                <Plus className="w-3.5 h-3.5 mr-1" /> Cadastrar primeiro item
              </Button>
            </div>
          )}
        </div>
      )}

      {/* PACKS CATALOG */}
      {activeTab === "packs" && (
        <div className="space-y-3">
          {filteredPacks.length > 0 && (
            <p className="px-1 text-xs font-medium text-muted-foreground">
              {filteredPacks.length} {filteredPacks.length === 1 ? "pack encontrado" : "packs encontrados"}
            </p>
          )}
          <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-[repeat(auto-fill,minmax(260px,1fr))] sm:gap-3">
            {filteredPacks.map((pack) => {
              const coverItem = getPackCoverItem(pack);
              const totalUnits = pack.itens.reduce((sum, packItem) => sum + packItem.quantidade, 0);
              const capacity = getPackCapacity(pack);
              const bag = getPackBag(pack);
              return (
                <article key={pack.id} className="group flex min-w-0 flex-col overflow-hidden rounded-lg border border-border bg-card shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg sm:rounded-xl">
                  <button type="button" onClick={() => openEditPack(pack)} className="relative block aspect-square w-full overflow-hidden bg-gradient-to-br from-primary/15 via-secondary to-accent/10 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset sm:aspect-[4/3]" aria-label={`Visualizar e editar ${pack.nome}`}>
                    {coverItem?.imagem_url ? (
                      <img src={coverItem.imagem_url} alt={`Imagem do item ${coverItem.nome}`} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
                    ) : (
                      <div className="flex h-full w-full flex-col items-center justify-center text-primary/35">
                        <Layers className="h-7 w-7 sm:h-14 sm:w-14" strokeWidth={1.25} />
                        <span className="mt-1 text-[7px] font-semibold uppercase tracking-[0.12em] sm:mt-2 sm:text-[10px] sm:tracking-[0.18em]">Sem imagem</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-black/5" />
                    <div className="absolute left-1.5 right-1.5 top-1.5 flex items-start justify-between gap-1 sm:left-3 sm:right-3 sm:top-3 sm:gap-2">
                      <Badge className="border-white/25 bg-white/90 px-1 py-0 text-[7px] font-bold text-foreground shadow-sm backdrop-blur-sm hover:bg-white sm:px-2 sm:text-[9px]">Pack</Badge>
                      <Badge className="border-0 bg-primary/90 px-1 py-0 text-[7px] font-bold text-primary-foreground shadow-sm sm:px-2 sm:text-[9px]" variant="secondary">
                        {pack.itens.length} {pack.itens.length === 1 ? "item" : "itens"}
                      </Badge>
                    </div>
                    {coverItem && (
                      <div className="absolute inset-x-0 bottom-0 hidden bg-gradient-to-t from-black/75 to-transparent px-3 pb-3 pt-8 text-[9px] text-white/85 sm:block">
                        Imagem vinculada: <span className="font-semibold text-white">{coverItem.nome}</span>
                      </div>
                    )}
                  </button>

                  <button type="button" onClick={() => openEditPack(pack)} className="flex flex-1 flex-col p-1.5 text-left sm:hidden" aria-label={`Abrir detalhes de ${pack.nome}`}>
                    <h3 className="line-clamp-2 min-h-7 font-display text-[9px] font-bold leading-tight text-foreground">{pack.nome}</h3>
                    <div className="mt-auto flex items-end justify-between gap-1 pt-1">
                      <span className={cn("text-xs font-bold", pack.saldo_atual > 0 ? "text-primary" : "text-destructive")}>{pack.saldo_atual}<span className="ml-0.5 text-[7px] font-medium">pronto(s)</span></span>
                      <span className="text-[7px] font-semibold text-muted-foreground">+{capacity} monta</span>
                    </div>
                  </button>

                  <div className="hidden flex-1 flex-col p-3 sm:flex">
                    <div>
                      <h3 className="line-clamp-2 min-h-9 font-display text-sm font-bold leading-[1.15] text-foreground">{pack.nome}</h3>
                      <p className="mt-1 line-clamp-2 min-h-7 text-[10px] leading-snug text-muted-foreground">{pack.descricao || "Conjunto de materiais vinculados"}</p>
                    </div>

                    <div className="mt-3 grid grid-cols-3 gap-2 rounded-lg bg-muted/50 p-2">
                      <div>
                        <p className="text-[8px] font-semibold uppercase tracking-wider text-muted-foreground">Em estoque</p>
                        <p className={cn("mt-0.5 text-xs font-bold", pack.saldo_atual > 0 ? "text-primary" : "text-destructive")}>{pack.saldo_atual} pack(s)</p>
                      </div>
                      <div>
                        <p className="text-[8px] font-semibold uppercase tracking-wider text-muted-foreground">Pode montar</p>
                        <p className="mt-0.5 text-xs font-bold text-foreground">{capacity} pack(s)</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[8px] font-semibold uppercase tracking-wider text-muted-foreground">Custo</p>
                        <p className="mt-0.5 text-xs font-bold text-foreground">R$ {getPackCost(pack).toFixed(2)}</p>
                      </div>
                    </div>
                    <p className="mt-1.5 text-[9px] text-muted-foreground">{totalUnits} unidade(s) por pack</p>

                    <div className="mt-2 flex flex-wrap gap-1">
                      {pack.itens.slice(0, 3).map((packItem) => (
                        <Badge key={packItem.id} variant="outline" className="max-w-full bg-primary/5 px-1.5 text-[9px] font-medium">
                          <span className="truncate">{getItemName(packItem.item_id)}</span>&nbsp;×{packItem.quantidade}
                        </Badge>
                      ))}
                      {pack.itens.length > 3 && <Badge variant="secondary" className="px-1.5 text-[9px]">+{pack.itens.length - 3}</Badge>}
                      <Badge variant="outline" className={cn("px-1.5 text-[9px] font-medium", bag ? "border-primary/25 bg-primary/5 text-primary" : "bg-muted/60 text-muted-foreground")}>
                        {bag ? `Saco: ${bag.nome}` : "Sem saco"}
                      </Badge>
                    </div>

                    <div className="mt-auto grid grid-cols-[1fr_1fr_auto] gap-1.5 border-t border-border/70 pt-3">
                      <Button type="button" size="sm" className="h-8 px-2 text-[10px]" onClick={() => openPackMovement(pack, "entrada")} disabled={capacity === 0}>
                        <Wrench className="mr-1 h-3 w-3" /> Montar
                      </Button>
                      <Button type="button" size="sm" variant="outline" className="h-8 px-2 text-[10px]" onClick={() => openPackMovement(pack, "saida")} disabled={pack.saldo_atual === 0}>
                        <ArrowUp className="mr-1 h-3 w-3" /> Saída
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button type="button" size="icon" variant="ghost" className="h-8 w-8" aria-label={`Mais ações para ${pack.nome}`}><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem onSelect={() => openEditPack(pack)} className="text-xs"><Eye className="mr-2 h-3.5 w-3.5" /> Ver pack</DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => openEditPack(pack)} className="text-xs"><Pencil className="mr-2 h-3.5 w-3.5" /> Editar pack</DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => openSolicitacao(pack, "pack", "reposicao")} className="text-xs"><ClipboardList className="mr-2 h-3.5 w-3.5" /> Solicitar reposição</DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => openSolicitacao(pack, "pack", "consumo")} className="text-xs"><Send className="mr-2 h-3.5 w-3.5" /> Solicitar consumo</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onSelect={() => handleDeletePack(pack.id)} className="text-xs text-destructive focus:text-destructive"><Trash2 className="mr-2 h-3.5 w-3.5" /> Excluir pack</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
          {filteredPacks.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Layers className="w-10 h-10 mb-3 opacity-30" />
              <p className="text-sm">Nenhum pack cadastrado</p>
              <p className="text-xs mt-1">Packs agrupam múltiplos itens diferentes</p>
              <Button size="sm" variant="outline" className="mt-3" onClick={() => { setPackForm({ nome: "", descricao: "" }); setPackItensForm([]); setPackBagChoice("sem_saco"); setShowNewPack(true); }}>
                <Plus className="w-3.5 h-3.5 mr-1" /> Criar primeiro pack
              </Button>
            </div>
          )}
        </div>
      )}

      {/* REQUESTS */}
      {activeTab === "solicitacoes" && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {(["pendente", "aprovada", "atendida", "cancelada"] as const).map((status) => (
              <div key={status} className="metric-card rounded-lg p-3 text-center">
                <p className="text-lg font-bold text-foreground">{solicitacoes.filter((solicitacao) => solicitacao.status === status).length}</p>
                <p className="text-[9px] capitalize text-muted-foreground">{status}</p>
              </div>
            ))}
          </div>
          <div className="space-y-2">
            {filteredSolicitacoes.map((solicitacao) => {
              const workflow = solicitacao.workflow;
              const completedAt = workflow?.etapas_em.concluida;
              const daysOpen = getDaysOpen(solicitacao.created_at, completedAt);
              const statusStyle = solicitacao.status === "atendida"
                ? "bg-primary/10 text-primary"
                : solicitacao.status === "cancelada"
                  ? "bg-destructive/10 text-destructive"
                  : solicitacao.status === "aprovada"
                    ? "bg-accent/20 text-accent-foreground"
                    : "bg-muted text-foreground";
              return (
                <article key={solicitacao.id} className="content-card rounded-xl p-3 sm:p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                     <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", solicitacao.finalidade === "cadastro" ? "bg-primary/10 text-primary" : solicitacao.finalidade === "reposicao" ? "bg-primary/10 text-primary" : "bg-accent/20 text-accent-foreground")}>
                       {solicitacao.finalidade === "cadastro" ? <ClipboardList className="h-4 w-4" /> : solicitacao.finalidade === "reposicao" ? <ShoppingCart className="h-4 w-4" /> : <Send className="h-4 w-4" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-display text-sm font-bold text-foreground">{solicitacao.titulo}</h3>
                        <Badge className={cn("border-0 text-[9px] capitalize", statusStyle)} variant="secondary">{solicitacao.status}</Badge>
                        <Badge variant="outline" className="text-[9px] capitalize">{workflow ? (workflow.origem === "interna" ? "Produção interna" : "Compra externa") : solicitacao.finalidade}</Badge>
                        {workflow && <Badge className="border-0 bg-primary/10 text-[9px] text-primary" variant="secondary">{WORKFLOW_STAGES.find((stage) => stage.value === workflow.etapa)?.label}</Badge>}
                      </div>
                       <p className="mt-1 text-[10px] text-muted-foreground">
                         {workflow
                           ? `${workflow.itens.length} ${workflow.itens.length === 1 ? "item" : "itens"} · ${daysOpen} ${daysOpen === 1 ? "dia" : "dias"} ${workflow.etapa === "concluida" ? "até a conclusão" : "em aberto"} · Total estimado R$ ${getWorkflowTotal(workflow).toFixed(2)}`
                           : solicitacao.finalidade === "cadastro"
                           ? `Cadastro sem movimentação de estoque · ${new Date(solicitacao.created_at).toLocaleDateString("pt-BR")}`
                           : `${getSolicitacaoTarget(solicitacao)} · ${solicitacao.quantidade} ${solicitacao.unidade}(s) · ${new Date(solicitacao.created_at).toLocaleDateString("pt-BR")}`}
                       </p>
                       {workflow && (
                         <div className="mt-2 flex flex-wrap gap-1">
                           {workflow.itens.slice(0, 4).map((item) => <Badge key={item.item_id} variant="outline" className="text-[9px]">{item.nome} ×{item.quantidade}</Badge>)}
                           {workflow.itens.length > 4 && <Badge variant="secondary" className="text-[9px]">+{workflow.itens.length - 4}</Badge>}
                           <Badge variant="outline" className="gap-1 text-[9px]"><Palette className="h-2.5 w-2.5" /> {workflow.arte === "mesma" ? "Mesma arte" : workflow.arte === "nova" ? "Nova arte anexada" : "Criar nova arte"}</Badge>
                         </div>
                       )}
                      {solicitacao.observacao && <p className="mt-1 line-clamp-2 text-[10px] text-muted-foreground">{solicitacao.observacao}</p>}
                    </div>
                    <div className="flex shrink-0 gap-1.5">
                      <Button size="sm" variant="outline" className="h-8 text-[10px]" onClick={() => openEditSolicitacao(solicitacao)}>
                        <Pencil className="mr-1 h-3 w-3" /> Editar
                      </Button>
                      {workflow && solicitacao.status !== "cancelada" ? (
                        <Button size="sm" className="h-8 text-[10px]" onClick={() => openManageWorkflow(solicitacao)}>
                          <ClipboardList className="mr-1 h-3 w-3" /> Gerenciar
                        </Button>
                      ) : (
                        <>
                      {solicitacao.status === "pendente" && (
                        <Button size="sm" variant="outline" className="h-8 text-[10px]" onClick={() => updateSolicitacaoStatus(solicitacao.id, "aprovada")}>
                          <Check className="mr-1 h-3 w-3" /> Aprovar
                        </Button>
                      )}
                      {solicitacao.status !== "atendida" && solicitacao.status !== "cancelada" && (
                        <Button size="sm" className="h-8 text-[10px]" onClick={() => updateSolicitacaoStatus(solicitacao.id, "atendida")}>
                          <CircleCheckBig className="mr-1 h-3 w-3" /> Atender
                        </Button>
                      )}
                      {solicitacao.status !== "cancelada" && solicitacao.status !== "atendida" && (
                        <Button size="sm" variant="ghost" className="h-8 px-2 text-[10px] text-destructive" onClick={() => updateSolicitacaoStatus(solicitacao.id, "cancelada")}>
                          Cancelar
                        </Button>
                      )}
                        </>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
          {filteredSolicitacoes.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <ClipboardList className="mb-3 h-10 w-10 opacity-30" />
              <p className="text-sm">Nenhuma solicitação encontrada</p>
              <Button size="sm" variant="outline" className="mt-3" onClick={() => openSolicitacao()}><Plus className="mr-1 h-3.5 w-3.5" /> Nova solicitação</Button>
            </div>
          )}
        </div>
      )}

      {/* Sheet: Novo Item */}
      <Sheet open={showNewItem} onOpenChange={setShowNewItem}>
        <SheetContent side="bottom" className="h-[85vh] overflow-y-auto rounded-t-lg bg-background">
          <SheetHeader><SheetTitle className="font-display text-lg">Cadastrar Novo Item</SheetTitle></SheetHeader>
          <div className="space-y-3 py-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Nome do item *</Label>
              <Input placeholder="Ex: Caneta Personalizada" value={newItem.nome} onChange={e => setNewItem(p => ({ ...p, nome: e.target.value }))} />
            </div>
            <ImageInput file={newItemImage} onChange={setNewItemImage} />
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Categoria *</Label>
                <Select value={newItem.categoria} onValueChange={v => setNewItem(p => ({ ...p, categoria: v }))}>
                  <SelectTrigger className="text-xs"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{CATEGORIAS.map(c => (<SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>))}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Unidade</Label>
                <Select value={newItem.unidade} onValueChange={v => setNewItem(p => ({ ...p, unidade: v }))}>
                  <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unidade" className="text-xs">Unidade</SelectItem>
                    <SelectItem value="pacote" className="text-xs">Pacote</SelectItem>
                    <SelectItem value="caixa" className="text-xs">Caixa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5"><Label className="text-xs">Saldo atual</Label><Input type="number" min={0} value={newItem.saldo_atual} onChange={e => setNewItem(p => ({ ...p, saldo_atual: Number(e.target.value) }))} /></div>
              <div className="space-y-1.5"><Label className="text-xs">Mínimo</Label><Input type="number" min={0} value={newItem.minimo} onChange={e => setNewItem(p => ({ ...p, minimo: Number(e.target.value) }))} /></div>
              <div className="space-y-1.5"><Label className="text-xs">Ideal</Label><Input type="number" min={0} value={newItem.ideal} onChange={e => setNewItem(p => ({ ...p, ideal: Number(e.target.value) }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label className="text-xs">Custo unitário (R$)</Label><Input type="number" min={0} step={0.01} value={newItem.custo_unitario} onChange={e => setNewItem(p => ({ ...p, custo_unitario: Number(e.target.value) }))} /></div>
              <div className="space-y-1.5"><Label className="text-xs">Fornecedor</Label><Input placeholder="Ex: Gráfica Central" value={newItem.fornecedor} onChange={e => setNewItem(p => ({ ...p, fornecedor: e.target.value }))} /></div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Link para compra ou reposição</Label>
              <div className="relative">
                <Link2 className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input type="url" inputMode="url" placeholder="https://loja.com/produto" value={newItem.compra_url} onChange={e => setNewItem(p => ({ ...p, compra_url: e.target.value }))} className="pl-9" />
              </div>
              <p className="text-[10px] text-muted-foreground">Cole o endereço do fornecedor para facilitar a próxima compra.</p>
            </div>
          </div>
          <SheetFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowNewItem(false)} className="flex-1">Cancelar</Button>
            <Button onClick={handleCreateItem} className="flex-1"><Check className="w-3.5 h-3.5 mr-1" /> Cadastrar</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Sheet: Editar Item */}
      <Sheet open={!!editingItem} onOpenChange={(open) => {
        if (!open) {
          setEditingItem(null);
          setIsEditingItemDetails(false);
        }
      }}>
        <SheetContent side="bottom" className="h-[92vh] overflow-y-auto rounded-t-xl bg-background">
          <SheetHeader>
            <SheetTitle className="font-display text-lg">Detalhes do item</SheetTitle>
            <p className="text-xs text-muted-foreground">Informações consolidadas. Toque em qualquer área para editar.</p>
          </SheetHeader>
          <div className="mx-auto max-w-3xl space-y-4 py-4">
            {editingItem && (
              <div
                className="group relative h-36 cursor-pointer overflow-hidden rounded-xl border border-border bg-gradient-to-br from-primary/15 via-secondary to-accent/10 ring-offset-background transition hover:ring-2 hover:ring-primary/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:aspect-[16/7] sm:h-auto sm:min-h-52"
                role="button"
                tabIndex={0}
                aria-label="Editar imagem e informações do item"
                onClick={() => setIsEditingItemDetails(true)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") setIsEditingItemDetails(true);
                }}
              >
                {editingItem.imagem_url ? (
                  <img src={editingItem.imagem_url} alt={editingItem.nome} className="h-full w-full object-cover sm:object-contain" />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center text-primary/35">
                    <Package className="h-16 w-16" strokeWidth={1.25} />
                    <span className="mt-2 text-[10px] font-semibold uppercase tracking-[0.18em]">Sem imagem</span>
                  </div>
                )}
                <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 bg-gradient-to-t from-black/80 to-transparent p-2.5 text-white sm:gap-3 sm:p-4">
                  <div className="min-w-0">
                    <Badge className="mb-1 border-white/25 bg-white/90 px-1.5 text-[8px] text-foreground hover:bg-white sm:mb-2 sm:text-[9px]">{editingItem.categoria}</Badge>
                    <h3 className="truncate font-display text-sm font-bold sm:text-lg">{editingItem.nome}</h3>
                    <p className="text-[9px] text-white/75 sm:text-[10px]">{editingItem.fornecedor || "Sem fornecedor"}</p>
                  </div>
                  {editingItem.compra_url && (
                    <Button asChild size="sm" className="flex-shrink-0 bg-white text-foreground hover:bg-white/90">
                      <a href={editingItem.compra_url} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()}>
                        <ShoppingCart className="mr-1.5 h-3.5 w-3.5" /> Comprar / repor <ExternalLink className="ml-1.5 h-3 w-3" />
                      </a>
                    </Button>
                  )}
                </div>
                <div className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-black/55 px-2 py-1 text-[9px] font-semibold text-white opacity-100 backdrop-blur-sm transition sm:opacity-0 sm:group-hover:opacity-100">
                  <Pencil className="h-2.5 w-2.5" /> Editar imagem
                </div>
              </div>
            )}
            {isEditingItemDetails ? (
              <div className="space-y-3 rounded-xl border border-primary/20 bg-card p-3 shadow-sm sm:p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-display text-sm font-bold text-foreground">Editar informações</p>
                    <p className="text-[10px] text-muted-foreground">Altere somente o que precisar.</p>
                  </div>
                  <Badge className="border-0 bg-primary/10 text-[9px] text-primary hover:bg-primary/10"><Pencil className="mr-1 h-2.5 w-2.5" /> Modo edição</Badge>
                </div>
                <div className="space-y-1.5"><Label className="text-xs">Nome</Label><Input value={editForm.nome} onChange={e => setEditForm(p => ({ ...p, nome: e.target.value }))} /></div>
                <ImageInput file={editImage} onChange={setEditImage} currentUrl={editingItem?.imagem_url} />
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Categoria</Label>
                    <Select value={editForm.categoria} onValueChange={v => setEditForm(p => ({ ...p, categoria: v }))}>
                      <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>{CATEGORIAS.map(c => (<SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>))}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Unidade</Label>
                    <Select value={editForm.unidade} onValueChange={v => setEditForm(p => ({ ...p, unidade: v }))}>
                      <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unidade" className="text-xs">Unidade</SelectItem>
                        <SelectItem value="pacote" className="text-xs">Pacote</SelectItem>
                        <SelectItem value="caixa" className="text-xs">Caixa</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5"><Label className="text-xs">Saldo</Label><Input type="number" min={0} value={editForm.saldo_atual} onChange={e => setEditForm(p => ({ ...p, saldo_atual: Number(e.target.value) }))} /></div>
                  <div className="space-y-1.5"><Label className="text-xs">Mínimo</Label><Input type="number" min={0} value={editForm.minimo} onChange={e => setEditForm(p => ({ ...p, minimo: Number(e.target.value) }))} /></div>
                  <div className="space-y-1.5"><Label className="text-xs">Ideal</Label><Input type="number" min={0} value={editForm.ideal} onChange={e => setEditForm(p => ({ ...p, ideal: Number(e.target.value) }))} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5"><Label className="text-xs">Custo unit. (R$)</Label><Input type="number" min={0} step={0.01} value={editForm.custo_unitario} onChange={e => setEditForm(p => ({ ...p, custo_unitario: Number(e.target.value) }))} /></div>
                  <div className="space-y-1.5"><Label className="text-xs">Fornecedor</Label><Input value={editForm.fornecedor} onChange={e => setEditForm(p => ({ ...p, fornecedor: e.target.value }))} /></div>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <Label className="text-xs">Link para compra ou reposição</Label>
                    {normalizePurchaseUrl(editForm.compra_url) && (
                      <a href={normalizePurchaseUrl(editForm.compra_url)!} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[10px] font-semibold text-primary hover:underline">
                        Testar link <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                  <div className="relative">
                    <Link2 className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    <Input type="url" inputMode="url" placeholder="https://loja.com/produto" value={editForm.compra_url} onChange={e => setEditForm(p => ({ ...p, compra_url: e.target.value }))} className="pl-9" />
                  </div>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsEditingItemDetails(true)}
                className="group w-full rounded-xl border border-border bg-card p-3 text-left shadow-sm transition hover:border-primary/30 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:p-4"
                aria-label="Editar informações consolidadas do item"
              >
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-primary">Ficha do produto</p>
                    <h3 className="mt-1 line-clamp-2 font-display text-base font-bold leading-tight text-foreground">{editForm.nome}</h3>
                  </div>
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-[9px] font-semibold text-primary">
                    <Pencil className="h-2.5 w-2.5" /> Toque para editar
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <div className="rounded-lg bg-emerald-50 p-2.5 dark:bg-emerald-950/25">
                    <p className="text-[8px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">Categoria</p>
                    <p className="mt-1 truncate text-xs font-bold text-emerald-950 dark:text-emerald-50">{editForm.categoria}</p>
                  </div>
                  <div className="rounded-lg bg-sky-50 p-2.5 dark:bg-sky-950/25">
                    <p className="text-[8px] font-bold uppercase tracking-wider text-sky-700 dark:text-sky-300">Unidade</p>
                    <p className="mt-1 truncate text-xs font-bold capitalize text-sky-950 dark:text-sky-50">{editForm.unidade}</p>
                  </div>
                  <div className="rounded-lg bg-amber-50 p-2.5 dark:bg-amber-950/25">
                    <p className="text-[8px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">Fornecedor</p>
                    <p className="mt-1 truncate text-xs font-bold text-amber-950 dark:text-amber-50">{editForm.fornecedor || "Não informado"}</p>
                  </div>
                  <div className="rounded-lg bg-violet-50 p-2.5 dark:bg-violet-950/25">
                    <p className="text-[8px] font-bold uppercase tracking-wider text-violet-700 dark:text-violet-300">Custo unitário</p>
                    <p className="mt-1 text-xs font-bold text-violet-950 dark:text-violet-50">R$ {editForm.custo_unitario.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                  </div>
                </div>
                <div className="mt-2 grid grid-cols-3 overflow-hidden rounded-lg border border-border/70 bg-muted/25">
                  <div className="p-2.5 text-center">
                    <p className="text-[8px] font-bold uppercase tracking-wider text-muted-foreground">Disponível</p>
                    <p className="mt-0.5 font-display text-lg font-bold text-primary">{editForm.saldo_atual}</p>
                  </div>
                  <div className="border-x border-border/70 p-2.5 text-center">
                    <p className="text-[8px] font-bold uppercase tracking-wider text-muted-foreground">Mínimo</p>
                    <p className="mt-0.5 font-display text-lg font-bold text-foreground">{editForm.minimo}</p>
                  </div>
                  <div className="p-2.5 text-center">
                    <p className="text-[8px] font-bold uppercase tracking-wider text-muted-foreground">Estoque ideal</p>
                    <p className="mt-0.5 font-display text-lg font-bold text-foreground">{editForm.ideal}</p>
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-2 rounded-lg bg-muted/40 px-3 py-2">
                  <Link2 className="h-3.5 w-3.5 shrink-0 text-primary" />
                  <span className="min-w-0 flex-1 truncate text-[10px] font-medium text-muted-foreground">{editForm.compra_url || "Nenhum link de compra cadastrado"}</span>
                  <Pencil className="h-3 w-3 shrink-0 text-muted-foreground transition group-hover:text-primary" />
                </div>
              </button>
            )}
            {editingItem && (
              <EstoqueDocumentosManager itemId={editingItem.id} onChange={fetchAll} />
            )}
          </div>
          <SheetFooter className="gap-2">
            <Button variant="outline" onClick={() => {
              if (isEditingItemDetails) setIsEditingItemDetails(false);
              else setEditingItem(null);
            }} className="flex-1">{isEditingItemDetails ? "Cancelar edição" : "Fechar"}</Button>
            {isEditingItemDetails ? (
              <Button onClick={handleSaveEdit} className="flex-1"><Check className="mr-1.5 h-3.5 w-3.5" /> Salvar alterações</Button>
            ) : (
              <Button onClick={() => setIsEditingItemDetails(true)} className="flex-1"><Pencil className="mr-1.5 h-3.5 w-3.5" /> Editar informações</Button>
            )}
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Sheet: Entrada */}
      <Sheet open={showEntrada} onOpenChange={setShowEntrada}>
        <SheetContent side="bottom" className="rounded-t-lg bg-background">
          <SheetHeader><SheetTitle className="font-display text-lg">Registrar Entrada</SheetTitle></SheetHeader>
          <div className="space-y-4 py-4">
            {itens.length > 1 && (
              <div className="space-y-2">
                <Label className="text-xs">Selecione o item</Label>
                <Select value={movItemId || ""} onValueChange={setMovItemId}>
                  <SelectTrigger className="text-xs"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{itens.map(i => (<SelectItem key={i.id} value={i.id} className="text-xs">{i.nome} (saldo: {i.saldo_atual})</SelectItem>))}</SelectContent>
                </Select>
              </div>
            )}
            {movItem && (
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="font-medium text-sm">{movItem.nome}</p>
                <p className="text-xs text-muted-foreground">Saldo atual: {movItem.saldo_atual} {movItem.unidade}(s)</p>
              </div>
            )}
            <div className="space-y-2">
              <Label className="text-xs">Quantidade a entrar</Label>
              <Input type="number" min={1} value={movQtd} onChange={e => setMovQtd(Math.max(0, Number(e.target.value)))} />
            </div>
          </div>
          <SheetFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowEntrada(false)} className="flex-1">Cancelar</Button>
            <Button onClick={handleEntrada} disabled={movQtd <= 0} className="flex-1"><ArrowDown className="w-3.5 h-3.5 mr-1" /> Registrar +{movQtd}</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Sheet: Saída */}
      <Sheet open={showSaida} onOpenChange={setShowSaida}>
        <SheetContent side="bottom" className="rounded-t-lg bg-background">
          <SheetHeader><SheetTitle className="font-display text-lg">Registrar Saída</SheetTitle></SheetHeader>
          <div className="space-y-4 py-4">
            {movItem && (
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="font-medium text-sm">{movItem.nome}</p>
                <p className="text-xs text-muted-foreground">Saldo atual: {movItem.saldo_atual} {movItem.unidade}(s)</p>
              </div>
            )}
            <div className="space-y-2">
              <Label className="text-xs">Quantidade de saída</Label>
              <Input type="number" min={1} max={movItem?.saldo_atual ?? 0} value={movQtd} onChange={e => setMovQtd(Math.max(0, Number(e.target.value)))} />
            </div>
          </div>
          <SheetFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowSaida(false)} className="flex-1">Cancelar</Button>
            <Button onClick={handleSaida} disabled={movQtd <= 0} variant="destructive" className="flex-1"><ArrowUp className="w-3.5 h-3.5 mr-1" /> Registrar -{movQtd}</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Sheet: Novo Pack */}
      <Sheet open={showNewPack} onOpenChange={setShowNewPack}>
        <SheetContent side="bottom" className="h-[85vh] overflow-y-auto rounded-t-lg bg-background">
          <SheetHeader><SheetTitle className="font-display text-lg">Criar Novo Pack</SheetTitle></SheetHeader>
          <div className="space-y-3 py-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Nome do pack *</Label>
              <Input placeholder="Ex: Pack de Folders" value={packForm.nome} onChange={e => setPackForm(p => ({ ...p, nome: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Descrição</Label>
              <Input placeholder="Ex: Conjunto de folders para visita técnica" value={packForm.descricao} onChange={e => setPackForm(p => ({ ...p, descricao: e.target.value }))} />
            </div>
            <PackItemsEditor />
          </div>
          <SheetFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowNewPack(false)} className="flex-1">Cancelar</Button>
            <Button onClick={handleCreatePack} className="flex-1"><Check className="w-3.5 h-3.5 mr-1" /> Criar Pack</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Sheet: Editar Pack */}
      <Sheet open={!!editingPack} onOpenChange={(open) => !open && setEditingPack(null)}>
        <SheetContent side="bottom" className="h-[85vh] overflow-y-auto rounded-t-lg bg-background">
          <SheetHeader><SheetTitle className="font-display text-lg">Editar Pack</SheetTitle></SheetHeader>
          <div className="space-y-3 py-4">
            {editingPack && (
              <>
                <div className="grid grid-cols-3 gap-2 rounded-xl border border-border bg-card p-3 text-center">
                  <div><p className="text-lg font-bold text-primary">{editingPack.saldo_atual}</p><p className="text-[9px] text-muted-foreground">Em estoque</p></div>
                  <div><p className="text-lg font-bold text-foreground">{getPackCapacity(editingPack)}</p><p className="text-[9px] text-muted-foreground">Pode montar</p></div>
                  <div><p className="text-lg font-bold text-foreground">R$ {getPackCost(editingPack).toFixed(2)}</p><p className="text-[9px] text-muted-foreground">Custo calculado</p></div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button type="button" size="sm" onClick={() => { setEditingPack(null); openPackMovement(editingPack, "entrada"); }} disabled={getPackCapacity(editingPack) === 0}><Wrench className="mr-1.5 h-3.5 w-3.5" /> Montar packs</Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => { setEditingPack(null); openPackMovement(editingPack, "saida"); }} disabled={editingPack.saldo_atual === 0}><ArrowUp className="mr-1.5 h-3.5 w-3.5" /> Registrar saída</Button>
                </div>
              </>
            )}
            <div className="space-y-1.5"><Label className="text-xs">Nome</Label><Input value={packForm.nome} onChange={e => setPackForm(p => ({ ...p, nome: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label className="text-xs">Descrição</Label><Input value={packForm.descricao} onChange={e => setPackForm(p => ({ ...p, descricao: e.target.value }))} /></div>
            <PackItemsEditor />
            {editingPack && packMovimentacoes.some((movimentacao) => movimentacao.pack_id === editingPack.id) && (
              <div className="rounded-xl border border-border bg-card p-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Últimas movimentações</p>
                <div className="space-y-1.5">
                  {packMovimentacoes.filter((movimentacao) => movimentacao.pack_id === editingPack.id).slice(0, 5).map((movimentacao) => (
                    <div key={movimentacao.id} className="flex items-center gap-2 rounded-lg bg-muted/45 p-2 text-[10px]">
                      <span className={cn("flex h-6 w-6 items-center justify-center rounded-full", movimentacao.tipo === "entrada" ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive")}>
                        {movimentacao.tipo === "entrada" ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />}
                      </span>
                      <span className="flex-1"><strong>{movimentacao.tipo === "entrada" ? "+" : "−"}{movimentacao.quantidade}</strong> · saldo {movimentacao.saldo_resultante}{movimentacao.observacao ? ` · ${movimentacao.observacao}` : ""}</span>
                      <span className="text-muted-foreground">{new Date(movimentacao.created_at).toLocaleDateString("pt-BR")}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <SheetFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditingPack(null)} className="flex-1">Cancelar</Button>
            <Button onClick={handleSavePack} className="flex-1">Salvar</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Sheet: Movimentar Pack */}
      <Sheet open={!!movingPack} onOpenChange={(open) => !open && setMovingPack(null)}>
        <SheetContent side="bottom" className="rounded-t-xl bg-background">
          <SheetHeader>
            <SheetTitle className="font-display text-lg">{packMovType === "entrada" ? "Montar packs" : "Registrar saída de packs"}</SheetTitle>
            <p className="text-xs text-muted-foreground">
              {packMovType === "entrada" ? "Cada unidade montada baixa automaticamente os itens da composição." : "A saída reduz o saldo de packs prontos."}
            </p>
          </SheetHeader>
          {movingPack && (
            <div className="space-y-4 py-4">
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="font-medium text-sm">{movingPack.nome}</p>
                <div className="mt-1 flex gap-4 text-[10px] text-muted-foreground">
                  <span>Saldo pronto: <strong className="text-foreground">{movingPack.saldo_atual}</strong></span>
                  <span>Pode montar: <strong className="text-foreground">{getPackCapacity(movingPack)}</strong></span>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Quantidade</Label>
                <Input type="number" min={1} max={packMovType === "entrada" ? getPackCapacity(movingPack) : movingPack.saldo_atual} value={packMovQtd} onChange={(event) => setPackMovQtd(Math.max(1, Number(event.target.value)))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Observação</Label>
                <Input placeholder="Ex: Montagem para visita em Castanhal" value={packMovObs} onChange={(event) => setPackMovObs(event.target.value)} />
              </div>
            </div>
          )}
          <SheetFooter className="gap-2">
            <Button variant="outline" onClick={() => setMovingPack(null)} className="flex-1">Cancelar</Button>
            <Button onClick={handlePackMovement} disabled={!movingPack || packMovQtd <= 0 || (packMovType === "entrada" ? packMovQtd > getPackCapacity(movingPack) : packMovQtd > movingPack.saldo_atual)} variant={packMovType === "saida" ? "destructive" : "default"} className="flex-1">
              {packMovType === "entrada" ? <Wrench className="mr-1.5 h-3.5 w-3.5" /> : <ArrowUp className="mr-1.5 h-3.5 w-3.5" />}
              {packMovType === "entrada" ? `Montar ${packMovQtd}` : `Retirar ${packMovQtd}`}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Sheet: Editar solicitação e acrescentar contexto */}
      <Sheet open={!!editingSolicitacao} onOpenChange={(open) => !open && setEditingSolicitacao(null)}>
        <SheetContent side="bottom" className="max-h-[88vh] overflow-y-auto rounded-t-xl bg-background">
          <SheetHeader className="mx-auto w-full max-w-2xl">
            <SheetTitle className="font-display text-lg">Editar solicitação</SheetTitle>
            <p className="text-xs text-muted-foreground">Atualize as informações ou acrescente um comentário ao histórico sem perder o contexto anterior.</p>
          </SheetHeader>
          <div className="mx-auto w-full max-w-2xl space-y-4 py-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Título da solicitação *</Label>
              <Input value={editSolicitacaoForm.titulo} onChange={(event) => setEditSolicitacaoForm((form) => ({ ...form, titulo: event.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Contexto e detalhes atuais</Label>
              <Textarea rows={5} value={editSolicitacaoForm.observacao} onChange={(event) => setEditSolicitacaoForm((form) => ({ ...form, observacao: event.target.value }))} placeholder="Descreva a necessidade, modelos, medidas, prazo ou outras informações importantes." />
            </div>
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-3">
              <div className="mb-2 flex items-center gap-2"><ClipboardList className="h-4 w-4 text-primary" /><div><p className="text-xs font-semibold">Acrescentar comentário</p><p className="text-[10px] text-muted-foreground">O comentário será registrado com data e hora abaixo do contexto existente.</p></div></div>
              <Textarea rows={3} value={editSolicitacaoForm.comentario} onChange={(event) => setEditSolicitacaoForm((form) => ({ ...form, comentario: event.target.value }))} placeholder="Ex: Confirmamos os três tamanhos de caixa e precisamos incluir as medidas de cada modelo." />
            </div>
            <div className="flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
              <Badge variant="outline" className="capitalize">{editingSolicitacao?.finalidade}</Badge>
              <Badge variant="outline" className="capitalize">{editingSolicitacao?.status}</Badge>
              {editingSolicitacao && <span>Criada em {new Date(editingSolicitacao.created_at).toLocaleDateString("pt-BR")}</span>}
            </div>
          </div>
          <SheetFooter className="mx-auto w-full max-w-2xl gap-2">
            <Button variant="outline" onClick={() => setEditingSolicitacao(null)} className="flex-1">Cancelar</Button>
            <Button onClick={handleSaveSolicitacao} disabled={!editSolicitacaoForm.titulo.trim()} className="flex-1"><Check className="mr-1.5 h-3.5 w-3.5" /> Salvar alterações</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Sheet: Gerenciar jornada da solicitação */}
      <Sheet open={!!managingSolicitacao} onOpenChange={(open) => {
        if (!open) {
          setManagingSolicitacao(null);
          setManageWorkflow(null);
          setManageArtFile(null);
        }
      }}>
        <SheetContent side="bottom" className="max-h-[94vh] overflow-y-auto rounded-t-xl bg-background">
          {managingSolicitacao && manageWorkflow && (() => {
            const nextStage = getNextStage(manageWorkflow);
            const currentStageIndex = WORKFLOW_STAGES.findIndex((stage) => stage.value === manageWorkflow.etapa);
            const total = getWorkflowTotal(manageWorkflow);
            const daysOpen = getDaysOpen(managingSolicitacao.created_at, manageWorkflow.etapas_em.concluida);
            return (
              <>
                <SheetHeader className="mx-auto w-full max-w-4xl">
                  <div className="flex flex-wrap items-start justify-between gap-3 pr-7">
                    <div>
                      <SheetTitle className="font-display text-lg">{managingSolicitacao.titulo}</SheetTitle>
                      <p className="mt-1 text-xs text-muted-foreground">Acompanhe cotação, aprovação, arte e produção em um só lugar.</p>
                    </div>
                    <Badge variant="outline" className="gap-1.5 py-1.5 text-[10px]"><CalendarDays className="h-3 w-3" /> {daysOpen} {daysOpen === 1 ? "dia" : "dias"} {manageWorkflow.etapa === "concluida" ? "até a conclusão" : "em aberto"}</Badge>
                  </div>
                </SheetHeader>

                <div className="mx-auto w-full max-w-4xl space-y-4 py-4">
                  <div className="overflow-x-auto rounded-xl border border-border bg-card p-3">
                    <div className="flex min-w-[620px] items-start">
                      {WORKFLOW_STAGES.map((stage, index) => {
                        const skippedInternalQuote = manageWorkflow.origem === "interna" && (stage.value === "cotacao" || stage.value === "aprovacao");
                        const reached = !skippedInternalQuote && (index <= currentStageIndex || Boolean(manageWorkflow.etapas_em[stage.value]));
                        return (
                          <div key={stage.value} className={cn("relative flex flex-1 flex-col items-center text-center", skippedInternalQuote && "opacity-35")}>
                            {index > 0 && <span className={cn("absolute right-1/2 top-3 h-0.5 w-full", reached ? "bg-primary" : "bg-border")} />}
                            <span className={cn("relative z-10 flex h-6 w-6 items-center justify-center rounded-full border text-[9px] font-bold", reached ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-muted-foreground")}>
                              {reached ? <Check className="h-3 w-3" /> : index + 1}
                            </span>
                            <span className="mt-1.5 text-[9px] font-medium">{stage.label}</span>
                            {skippedInternalQuote && <span className="text-[8px] text-muted-foreground">não se aplica</span>}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-[1.35fr_0.65fr]">
                    <div className="space-y-4">
                      <section className="rounded-xl border border-border bg-card p-3 sm:p-4">
                        <div className="mb-3 flex items-center justify-between gap-2">
                          <div><p className="text-xs font-semibold">Itens e cotação</p><p className="text-[10px] text-muted-foreground">Ajuste as quantidades e os valores unitários recebidos.</p></div>
                          <Badge variant="secondary" className="text-[9px]">{manageWorkflow.itens.length} {manageWorkflow.itens.length === 1 ? "item" : "itens"}</Badge>
                        </div>
                        <div className="space-y-2">
                          {manageWorkflow.itens.map((item) => (
                            <div key={item.item_id} className="grid items-center gap-2 rounded-lg bg-muted/45 p-2 sm:grid-cols-[1fr_100px_135px]">
                              <div className="min-w-0"><p className="truncate text-xs font-medium">{item.nome}</p><p className="text-[9px] text-muted-foreground">{item.unidade}(s)</p></div>
                              <div><Label className="sr-only">Quantidade de {item.nome}</Label><Input type="number" min={1} value={item.quantidade} onChange={(event) => setManageWorkflow((workflow) => workflow ? { ...workflow, itens: workflow.itens.map((candidate) => candidate.item_id === item.item_id ? { ...candidate, quantidade: Math.max(1, Number(event.target.value)) } : candidate) } : workflow)} /></div>
                              {manageWorkflow.origem === "externa" ? (
                                <div className="relative"><DollarSign className="absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" /><Label className="sr-only">Valor unitário de {item.nome}</Label><Input type="number" min={0} step={0.01} className="pl-7" value={item.valor_unitario} onChange={(event) => setManageWorkflow((workflow) => workflow ? { ...workflow, itens: workflow.itens.map((candidate) => candidate.item_id === item.item_id ? { ...candidate, valor_unitario: Math.max(0, Number(event.target.value)) } : candidate) } : workflow)} /></div>
                              ) : <span className="text-[10px] text-muted-foreground">Produção interna</span>}
                            </div>
                          ))}
                        </div>
                      </section>

                      <section className="rounded-xl border border-border bg-card p-3 sm:p-4">
                        <div className="mb-3 flex items-center gap-2"><Palette className="h-4 w-4 text-primary" /><div><p className="text-xs font-semibold">Arte e arquivos</p><p className="text-[10px] text-muted-foreground">Confirme a arte existente ou acompanhe a criação de uma nova.</p></div></div>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="space-y-1.5"><Label className="text-xs">Decisão sobre a arte</Label><Select value={manageWorkflow.arte} onValueChange={(value: "mesma" | "nova" | "desenvolver") => setManageWorkflow((workflow) => workflow ? { ...workflow, arte: value } : workflow)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="mesma">Usar a mesma arte</SelectItem><SelectItem value="nova">Enviar nova arte pronta</SelectItem><SelectItem value="desenvolver">Desenvolver nova arte</SelectItem></SelectContent></Select></div>
                          <div className="space-y-1.5"><Label className="text-xs">Arquivo da arte</Label><label className="flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-border px-3 text-xs text-muted-foreground hover:bg-muted/50"><FileUp className="h-3.5 w-3.5" /><span className="truncate">{manageArtFile ? manageArtFile.name : manageWorkflow.arte_url ? "Substituir arquivo" : "Anexar arquivo"}</span><input type="file" className="hidden" onChange={(event) => setManageArtFile(event.target.files?.[0] || null)} /></label></div>
                        </div>
                        {manageWorkflow.arte_url && <a href={manageWorkflow.arte_url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-[10px] font-medium text-primary hover:underline"><ExternalLink className="h-3 w-3" /> Abrir arte anexada</a>}
                      </section>

                      <div className="space-y-1.5"><Label className="text-xs">Observações e próximos passos</Label><Textarea rows={3} value={manageWorkflow.observacao} onChange={(event) => setManageWorkflow((workflow) => workflow ? { ...workflow, observacao: event.target.value } : workflow)} placeholder="Registre prazos, retorno do fornecedor, ajustes de arte ou orientações de produção." /></div>
                    </div>

                    <aside className="space-y-4">
                      <section className="rounded-xl border border-border bg-card p-3 sm:p-4">
                        <p className="mb-3 text-xs font-semibold">Forma de produção</p>
                        <Select value={manageWorkflow.origem} onValueChange={(value: "externa" | "interna") => setManageWorkflow((workflow) => workflow ? { ...workflow, origem: value } : workflow)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="externa">Fornecedor externo</SelectItem><SelectItem value="interna">Produção interna</SelectItem></SelectContent></Select>
                        {manageWorkflow.origem === "externa" && (
                          <div className="mt-3 space-y-3">
                            <div className="space-y-1.5"><Label className="text-xs">Fornecedor</Label><div className="relative"><Building2 className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" /><Input className="pl-9" value={manageWorkflow.fornecedor} onChange={(event) => setManageWorkflow((workflow) => workflow ? { ...workflow, fornecedor: event.target.value } : workflow)} placeholder="Nome do fornecedor" /></div></div>
                            <div className="space-y-1.5"><Label className="text-xs">Frete</Label><div className="relative"><Truck className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" /><Input className="pl-9" type="number" min={0} step={0.01} value={manageWorkflow.frete} onChange={(event) => setManageWorkflow((workflow) => workflow ? { ...workflow, frete: Math.max(0, Number(event.target.value)) } : workflow)} /></div></div>
                          </div>
                        )}
                      </section>

                      <section className="rounded-xl bg-primary/5 p-4">
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Total estimado</p>
                        <p className="mt-1 text-2xl font-bold text-primary">R$ {total.toFixed(2)}</p>
                        <p className="mt-2 text-[9px] leading-relaxed text-muted-foreground">Valores servem para acompanhamento e aprovação. A conclusão desta jornada não altera o saldo do estoque.</p>
                      </section>
                    </aside>
                  </div>
                </div>

                <SheetFooter className="mx-auto w-full max-w-4xl gap-2 sm:justify-between">
                  <Button variant="ghost" className="text-destructive" onClick={async () => { await updateSolicitacaoStatus(managingSolicitacao.id, "cancelada"); setManagingSolicitacao(null); setManageWorkflow(null); }}>Cancelar solicitação</Button>
                  <div className="flex flex-1 gap-2 sm:flex-none">
                    <Button variant="outline" className="flex-1 sm:flex-none" onClick={() => saveManagedWorkflow()}>Salvar alterações</Button>
                    {nextStage && <Button className="flex-1 sm:flex-none" onClick={() => saveManagedWorkflow(nextStage)}>{nextStage === "concluida" ? <CircleCheckBig className="mr-1.5 h-3.5 w-3.5" /> : <ArrowUp className="mr-1.5 h-3.5 w-3.5" />}{nextStage === "concluida" ? "Concluir solicitação" : `Avançar para ${WORKFLOW_STAGES.find((stage) => stage.value === nextStage)?.label}`}</Button>}
                  </div>
                </SheetFooter>
              </>
            );
          })()}
        </SheetContent>
      </Sheet>

      {/* Sheet: Nova Solicitação */}
      <Sheet open={showNewSolicitacao} onOpenChange={setShowNewSolicitacao}>
        <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto rounded-t-xl bg-background">
          <SheetHeader>
            <SheetTitle className="font-display text-lg">Nova Solicitação</SheetTitle>
             <p className="text-xs text-muted-foreground">Solicite o cadastro de um novo produto ou registre uma necessidade de reposição e consumo.</p>
          </SheetHeader>
          <div className="mx-auto grid max-w-3xl gap-4 py-4 sm:grid-cols-2">
            <div className="space-y-1.5">
               <Label className="text-xs">O que você precisa?</Label>
               <Select value={solicitacaoForm.finalidade} onValueChange={(value: "cadastro" | "reposicao" | "consumo") => setSolicitacaoForm((form) => ({
                 ...form,
                 finalidade: value,
                 alvo_tipo: value === "cadastro" || value === "reposicao" ? "livre" : form.alvo_tipo === "livre" ? "item" : form.alvo_tipo,
                 alvo_id: value === "cadastro" || value === "reposicao" ? "" : form.alvo_id,
                 titulo: value === "reposicao" && !form.titulo ? "Solicitação de brindes" : form.titulo,
               }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                   <SelectItem value="cadastro">Cadastrar novo produto</SelectItem>
                  <SelectItem value="reposicao">Reposição / aumentar estoque</SelectItem>
                  <SelectItem value="consumo">Consumo / retirada</SelectItem>
                </SelectContent>
              </Select>
            </div>
             <div className={cn("space-y-1.5", (solicitacaoForm.finalidade === "cadastro" || solicitacaoForm.finalidade === "reposicao") && "opacity-60")}>
              <Label className="text-xs">Tipo</Label>
               <Select disabled={solicitacaoForm.finalidade === "cadastro" || solicitacaoForm.finalidade === "reposicao"} value={solicitacaoForm.alvo_tipo} onValueChange={(value: "item" | "pack" | "livre") => setSolicitacaoForm((form) => ({ ...form, alvo_tipo: value, alvo_id: "", unidade: value === "pack" ? "pack" : "unidade" }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="item">Item do estoque</SelectItem>
                  <SelectItem value="pack">Pack</SelectItem>
                  <SelectItem value="livre">Pedido livre</SelectItem>
                </SelectContent>
              </Select>
            </div>
             {solicitacaoForm.finalidade === "cadastro" && (
               <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs text-primary sm:col-span-2">
                 <p className="font-semibold">Esta solicitação não movimenta o estoque.</p>
                 <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">Descreva o produto, brinde, papelaria ou saco plástico que precisa ser cadastrado. Ao concluir, a equipe apenas confirma o cadastro; a entrada física será registrada separadamente.</p>
               </div>
             )}
             {solicitacaoForm.finalidade === "reposicao" && (
               <div className="space-y-4 rounded-xl border border-border bg-card p-3 sm:col-span-2 sm:p-4">
                 <div className="flex items-start gap-3">
                   <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><ShoppingCart className="h-4 w-4" /></div>
                   <div><p className="text-xs font-semibold">Jornada de solicitação de brindes</p><p className="mt-0.5 text-[10px] text-muted-foreground">Adicione vários itens, defina quantidades, cotação, frete e a decisão sobre a arte.</p></div>
                 </div>

                 <div className="grid gap-3 sm:grid-cols-2">
                   <div className="space-y-1.5">
                     <Label className="text-xs">Como será produzido?</Label>
                     <Select value={requestOrigin} onValueChange={(value: "externa" | "interna") => setRequestOrigin(value)}>
                       <SelectTrigger><SelectValue /></SelectTrigger>
                       <SelectContent><SelectItem value="externa">Compra / fornecedor externo</SelectItem><SelectItem value="interna">Produção ou impressão interna</SelectItem></SelectContent>
                     </Select>
                   </div>
                   <div className="space-y-1.5">
                     <Label className="text-xs">Decisão sobre a arte</Label>
                     <Select value={requestArt} onValueChange={(value: "mesma" | "nova" | "desenvolver") => setRequestArt(value)}>
                       <SelectTrigger><SelectValue /></SelectTrigger>
                       <SelectContent><SelectItem value="mesma">Usar a mesma arte</SelectItem><SelectItem value="nova">Enviar nova arte pronta</SelectItem><SelectItem value="desenvolver">Solicitar desenvolvimento de nova arte</SelectItem></SelectContent>
                     </Select>
                   </div>
                 </div>

                 {requestArt === "nova" && (
                   <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-border px-3 py-3 text-xs text-muted-foreground hover:bg-muted/50">
                     <FileUp className="h-3.5 w-3.5" /> {requestArtFile ? requestArtFile.name : "Anexar nova arte (PDF, imagem, ZIP...)"}
                     <input type="file" className="hidden" onChange={(event) => setRequestArtFile(event.target.files?.[0] || null)} />
                   </label>
                 )}

                 <div className="space-y-2">
                   <Label className="text-xs">Itens solicitados *</Label>
                   <div className="grid gap-2 sm:grid-cols-[1fr_110px_auto]">
                     <Popover open={requestItemPickerOpen} onOpenChange={setRequestItemPickerOpen}>
                       <PopoverTrigger asChild><Button type="button" variant="outline" role="combobox" className="justify-start text-xs font-normal"><Search className="mr-2 h-3.5 w-3.5" /><span className="truncate">{requestNewItemId ? getItemName(requestNewItemId) : "Pesquisar item..."}</span></Button></PopoverTrigger>
                       <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start"><Command><CommandInput placeholder="Buscar brinde ou material..." /><CommandList><CommandEmpty>Nenhum item encontrado.</CommandEmpty><CommandGroup>{itens.map((item) => <CommandItem key={item.id} value={`${item.nome} ${item.categoria}`} onSelect={() => { setRequestNewItemId(item.id); setRequestItemPickerOpen(false); }}><span className="flex-1 truncate text-xs">{item.nome}</span><span className="text-[10px] text-muted-foreground">saldo {item.saldo_atual}</span></CommandItem>)}</CommandGroup></CommandList></Command></PopoverContent>
                     </Popover>
                     <Input type="number" min={1} value={requestNewItemQtd} onChange={(event) => setRequestNewItemQtd(Math.max(1, Number(event.target.value)))} aria-label="Quantidade do novo item" />
                     <Button type="button" onClick={addRequestItem} disabled={!requestNewItemId}><Plus className="mr-1 h-3.5 w-3.5" /> Adicionar</Button>
                   </div>
                   {requestItems.length > 0 ? (
                     <div className="space-y-1.5">
                       {requestItems.map((item) => (
                         <div key={item.item_id} className="grid items-center gap-2 rounded-lg bg-muted/45 p-2 sm:grid-cols-[1fr_100px_130px_auto]">
                           <div className="min-w-0"><p className="truncate text-xs font-medium">{item.nome}</p><p className="text-[9px] text-muted-foreground">{item.unidade}(s)</p></div>
                           <Input type="number" min={1} value={item.quantidade} onChange={(event) => setRequestItems((current) => current.map((candidate) => candidate.item_id === item.item_id ? { ...candidate, quantidade: Math.max(1, Number(event.target.value)) } : candidate))} aria-label={`Quantidade de ${item.nome}`} />
                           {requestOrigin === "externa" ? <div className="relative"><DollarSign className="absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" /><Input type="number" min={0} step={0.01} className="pl-7" value={item.valor_unitario} onChange={(event) => setRequestItems((current) => current.map((candidate) => candidate.item_id === item.item_id ? { ...candidate, valor_unitario: Math.max(0, Number(event.target.value)) } : candidate))} aria-label={`Valor unitário de ${item.nome}`} /></div> : <span className="text-[10px] text-muted-foreground">Produção interna</span>}
                           <Button type="button" size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => setRequestItems((current) => current.filter((candidate) => candidate.item_id !== item.item_id))}><X className="h-3.5 w-3.5" /></Button>
                         </div>
                       ))}
                     </div>
                   ) : <p className="rounded-lg border border-dashed border-border py-3 text-center text-[10px] text-muted-foreground">Adicione um ou mais brindes à solicitação.</p>}
                 </div>

                 {requestOrigin === "externa" && (
                   <div className="grid gap-3 sm:grid-cols-2">
                     <div className="space-y-1.5"><Label className="text-xs">Fornecedor / cotação</Label><div className="relative"><Building2 className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" /><Input className="pl-9" placeholder="Nome do fornecedor" value={requestSupplier} onChange={(event) => setRequestSupplier(event.target.value)} /></div></div>
                     <div className="space-y-1.5"><Label className="text-xs">Frete estimado</Label><div className="relative"><Truck className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" /><Input className="pl-9" type="number" min={0} step={0.01} value={requestShipping} onChange={(event) => setRequestShipping(Math.max(0, Number(event.target.value)))} /></div></div>
                   </div>
                 )}
                 {requestItems.length > 0 && <div className="flex items-center justify-between rounded-lg bg-primary/5 px-3 py-2 text-xs"><span className="text-muted-foreground">Total estimado</span><strong className="text-primary">R$ {(requestItems.reduce((total, item) => total + item.quantidade * item.valor_unitario, 0) + requestShipping).toFixed(2)}</strong></div>}
               </div>
             )}
            {solicitacaoForm.alvo_tipo !== "livre" && (
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs">{solicitacaoForm.alvo_tipo === "pack" ? "Pack" : "Item"}</Label>
                <Select value={solicitacaoForm.alvo_id} onValueChange={(value) => {
                  const item = itens.find((candidate) => candidate.id === value);
                  setSolicitacaoForm((form) => ({ ...form, alvo_id: value, unidade: form.alvo_tipo === "pack" ? "pack" : item?.unidade || "unidade" }));
                }}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {(solicitacaoForm.alvo_tipo === "pack" ? packs : itens).map((target) => <SelectItem key={target.id} value={target.id}>{target.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1.5 sm:col-span-2">
               <Label className="text-xs">O que está sendo solicitado *</Label>
               <Input placeholder={solicitacaoForm.finalidade === "cadastro" ? "Ex: Cadastrar novo brinde para o Pack Ovelha" : "Ex: Imprimir novos folders do projeto"} value={solicitacaoForm.titulo} onChange={(event) => setSolicitacaoForm((form) => ({ ...form, titulo: event.target.value }))} />
            </div>
             {solicitacaoForm.finalidade !== "cadastro" && solicitacaoForm.finalidade !== "reposicao" && (
               <>
                 <div className="space-y-1.5">
                   <Label className="text-xs">Quantidade</Label>
                   <Input type="number" min={1} value={solicitacaoForm.quantidade} onChange={(event) => setSolicitacaoForm((form) => ({ ...form, quantidade: Math.max(1, Number(event.target.value)) }))} />
                 </div>
                 <div className="space-y-1.5">
                   <Label className="text-xs">Unidade</Label>
                   <Input value={solicitacaoForm.unidade} onChange={(event) => setSolicitacaoForm((form) => ({ ...form, unidade: event.target.value }))} />
                 </div>
               </>
             )}
            <div className="space-y-1.5 sm:col-span-2">
               <Label className="text-xs">Detalhes</Label>
               <Textarea rows={2} placeholder={solicitacaoForm.finalidade === "cadastro" ? "Categoria, características, finalidade e pack relacionado" : solicitacaoForm.finalidade === "reposicao" ? "Prazo desejado, finalidade, padrão de personalização ou outras orientações" : "Prazo, destino, justificativa ou fornecedor"} value={solicitacaoForm.observacao} onChange={(event) => setSolicitacaoForm((form) => ({ ...form, observacao: event.target.value }))} />
            </div>
          </div>
          <SheetFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowNewSolicitacao(false)} className="flex-1">Cancelar</Button>
            <Button onClick={handleCreateSolicitacao} className="flex-1"><ClipboardList className="mr-1.5 h-3.5 w-3.5" /> Registrar solicitação</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
