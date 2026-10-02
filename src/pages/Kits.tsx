import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import {
  Gift, Plus, Package, CheckCircle, AlertCircle, Layers, Trash2, X,
  Pencil, AlertTriangle, Check as CheckIcon, Eye, MoreHorizontal, Upload, ImageIcon,
  ClipboardList, Send
} from "lucide-react";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "@/hooks/use-toast";

interface EstoqueItem {
  id: string;
  nome: string;
  custo_unitario: number;
  saldo_atual: number;
  imagem_url: string | null;
}

interface PackWithItens {
  id: string;
  nome: string;
  itens: { item_id: string; quantidade: number }[];
}

interface SelectableItem {
  id: string;
  nome: string;
  custo_unitario: number;
  tipo: "item" | "pack";
}

interface KitItemDB {
  id: string;
  kit_id: string;
  item_id: string;
  quantidade: number;
  item_type: string;
}

interface Kit {
  id: string;
  nome: string;
  tipo: string;
  descricao: string | null;
  ativo: boolean;
  montados: number;
  disponiveis: number;
  usados: number;
}

const KIT_IMAGE_MARKER = /^\[\[KIT_IMAGE:(.*?)\]\]\n?/;

function getKitImageFromDescription(description: string | null) {
  return description?.match(KIT_IMAGE_MARKER)?.[1] || null;
}

function getCleanKitDescription(description: string | null) {
  return (description || "").replace(KIT_IMAGE_MARKER, "");
}

function withKitImage(description: string, imageUrl: string | null) {
  return imageUrl ? `[[KIT_IMAGE:${imageUrl}]]\n${description}` : description;
}

interface ItemFalta {
  nome: string;
  necessario: number;
  disponivel: number;
}

export default function Kits() {
  const [kits, setKits] = useState<Kit[]>([]);
  const [kitItens, setKitItens] = useState<KitItemDB[]>([]);
  const [estoqueItens, setEstoqueItens] = useState<EstoqueItem[]>([]);
  const [packs, setPacks] = useState<PackWithItens[]>([]);
  const [selectableItems, setSelectableItems] = useState<SelectableItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [showNewKit, setShowNewKit] = useState(false);
  const [showMontarLote, setShowMontarLote] = useState(false);
  const [showAddItem, setShowAddItem] = useState(false);
  const [editingKit, setEditingKit] = useState<Kit | null>(null);
  const [isEditingKitDetails, setIsEditingKitDetails] = useState(false);
  const [requestingKit, setRequestingKit] = useState<Kit | null>(null);
  const [kitRequestType, setKitRequestType] = useState<"montagem" | "reposicao">("montagem");
  const [kitRequestQtd, setKitRequestQtd] = useState(1);
  const [kitRequestNotes, setKitRequestNotes] = useState("");
  const [selectedKitId, setSelectedKitId] = useState<string | null>(null);
  const [addItemKitId, setAddItemKitId] = useState<string | null>(null);

  const [newKit, setNewKit] = useState({ nome: "", tipo: "", descricao: "" });
  const [newKitImage, setNewKitImage] = useState<File | null>(null);
  const [newKitItens, setNewKitItens] = useState<{ item_id: string; quantidade: number; item_type: string }[]>([]);
  const [newItemId, setNewItemId] = useState("");
  const [newItemQtd, setNewItemQtd] = useState(1);
  const [newItemType, setNewItemType] = useState<"item" | "pack">("item");

  const [addItemId, setAddItemId] = useState("");
  const [addItemQtd, setAddItemQtd] = useState(1);
  const [addItemType, setAddItemType] = useState<"item" | "pack">("item");

  const [loteQtd, setLoteQtd] = useState(10);
  const [editForm, setEditForm] = useState({ nome: "", tipo: "", descricao: "" });
  const [editKitImage, setEditKitImage] = useState<File | null>(null);
  const [expandedKitId, setExpandedKitId] = useState<string | null>(null);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    const [kitsRes, kitItensRes, estoqueRes, packsRes, packItensRes] = await Promise.all([
      supabase.from("kits").select("*").order("nome"),
      supabase.from("kit_itens").select("*"),
      supabase.from("estoque_itens").select("id, nome, custo_unitario, saldo_atual, imagem_url").order("nome"),
      supabase.from("packs").select("*").order("nome"),
      supabase.from("pack_itens").select("*"),
    ]);
    if (kitsRes.data) setKits(kitsRes.data);
    if (kitItensRes.data) setKitItens(kitItensRes.data);
    const items = estoqueRes.data || [];
    const packList = packsRes.data || [];
    const packItensList = packItensRes.data || [];
    setEstoqueItens(items);

    const packsWithItens: PackWithItens[] = packList.map(p => ({
      ...p,
      itens: packItensList.filter(pi => pi.pack_id === p.id),
    }));
    setPacks(packsWithItens);

    const selectable: SelectableItem[] = [
      ...items.map(i => ({ id: i.id, nome: i.nome, custo_unitario: i.custo_unitario, tipo: "item" as const })),
      ...packsWithItens.map(p => {
        const custo = p.itens.reduce((sum, pi) => {
          const item = items.find(i => i.id === pi.item_id);
          return sum + (item?.custo_unitario || 0) * pi.quantidade;
        }, 0);
        return {
          id: p.id,
          nome: `📦 ${p.nome} (${p.itens.length} itens)`,
          custo_unitario: custo,
          tipo: "pack" as const,
        };
      }),
    ];
    setSelectableItems(selectable);
    setLoading(false);
  };

  const getSelectableItem = (id: string) => selectableItems.find(e => e.id === id);
  const getItemName = (id: string) => getSelectableItem(id)?.nome || estoqueItens.find(e => e.id === id)?.nome || "—";
  const getItemCusto = (id: string) => getSelectableItem(id)?.custo_unitario || 0;
  const getKitItens = (kitId: string) => kitItens.filter(ki => ki.kit_id === kitId);

  const getKitCover = (kit: Kit) => {
    const customCover = getKitImageFromDescription(kit.descricao);
    if (customCover) return { url: customCover, label: "Imagem personalizada" };
    for (const component of getKitItens(kit.id)) {
      if (component.item_type === "pack") {
        const pack = packs.find((candidate) => candidate.id === component.item_id);
        const coverItem = pack?.itens
          .map((packItem) => estoqueItens.find((item) => item.id === packItem.item_id))
          .find((item) => item?.imagem_url);
        if (coverItem?.imagem_url) return { url: coverItem.imagem_url, label: coverItem.nome };
      } else {
        const item = estoqueItens.find((candidate) => candidate.id === component.item_id);
        if (item?.imagem_url) return { url: item.imagem_url, label: item.nome };
      }
    }
    return null;
  };

  const uploadKitImage = async (file: File) => {
    const extension = file.name.split(".").pop() || "jpg";
    const path = `kits/${crypto.randomUUID()}.${extension}`;
    const { error } = await supabase.storage.from("item-images").upload(path, file);
    if (error) {
      toast({ title: "Erro ao enviar imagem", description: error.message, variant: "destructive" });
      return null;
    }
    return supabase.storage.from("item-images").getPublicUrl(path).data.publicUrl;
  };

  const calcCusto = (items: { item_id: string; quantidade: number }[]) =>
    items.reduce((sum, ki) => sum + getItemCusto(ki.item_id) * ki.quantidade, 0);

  // Check kit availability based on stock
  const getKitAvailability = (kitId: string): { canBuild: boolean; maxBuildable: number; faltas: ItemFalta[] } => {
    const items = getKitItens(kitId);
    const faltas: ItemFalta[] = [];
    let maxBuildable = Infinity;

    for (const ki of items) {
      if (ki.item_type === "pack") {
        const pack = packs.find(p => p.id === ki.item_id);
        if (!pack) continue;
        for (const pi of pack.itens) {
          const estoqueItem = estoqueItens.find(e => e.id === pi.item_id);
          const necessario = pi.quantidade * ki.quantidade;
          const disponivel = estoqueItem?.saldo_atual || 0;
          if (disponivel < necessario) {
            faltas.push({ nome: estoqueItem?.nome || "?", necessario, disponivel });
          }
          const possivel = Math.floor(disponivel / (pi.quantidade * ki.quantidade || 1));
          maxBuildable = Math.min(maxBuildable, possivel);
        }
      } else {
        const estoqueItem = estoqueItens.find(e => e.id === ki.item_id);
        const necessario = ki.quantidade;
        const disponivel = estoqueItem?.saldo_atual || 0;
        if (disponivel < necessario) {
          faltas.push({ nome: estoqueItem?.nome || "?", necessario, disponivel });
        }
        const possivel = Math.floor(disponivel / (ki.quantidade || 1));
        maxBuildable = Math.min(maxBuildable, possivel);
      }
    }

    if (maxBuildable === Infinity) maxBuildable = 0;
    return { canBuild: faltas.length === 0 && items.length > 0, maxBuildable, faltas };
  };

  // Handlers
  const handleCreateKit = async () => {
    if (!newKit.nome.trim() || !newKit.tipo.trim()) {
      toast({ title: "Preencha nome e tipo do kit", variant: "destructive" }); return;
    }
    if (newKitItens.length === 0) {
      toast({ title: "Adicione pelo menos um item", variant: "destructive" }); return;
    }
    const customImage = newKitImage ? await uploadKitImage(newKitImage) : null;
    if (newKitImage && !customImage) return;
    const { data, error } = await supabase.from("kits").insert({
      nome: newKit.nome, tipo: newKit.tipo, descricao: withKitImage(newKit.descricao, customImage) || null,
    }).select().single();
    if (error || !data) {
      toast({ title: "Erro ao criar kit", description: error?.message, variant: "destructive" }); return;
    }
    const inserts = newKitItens.map(ki => ({
      kit_id: data.id, item_id: ki.item_id, quantidade: ki.quantidade, item_type: ki.item_type,
    }));
    await supabase.from("kit_itens").insert(inserts);
    setNewKit({ nome: "", tipo: "", descricao: "" });
    setNewKitImage(null);
    setNewKitItens([]);
    setShowNewKit(false);
    toast({ title: "Kit criado!", description: `"${data.nome}" adicionado.` });
    fetchAll();
  };

  const handleAddItemToNewKit = () => {
    if (!newItemId) return;
    if (newKitItens.some(i => i.item_id === newItemId)) {
      toast({ title: "Item já adicionado", variant: "destructive" }); return;
    }
    const sel = selectableItems.find(s => s.id === newItemId);
    setNewKitItens(prev => [...prev, { item_id: newItemId, quantidade: newItemQtd, item_type: sel?.tipo || "item" }]);
    setNewItemId("");
    setNewItemQtd(1);
  };

  const handleAddItemToExistingKit = async () => {
    if (!addItemId || !addItemKitId) return;
    const existing = kitItens.find(ki => ki.kit_id === addItemKitId && ki.item_id === addItemId);
    if (existing) {
      toast({ title: "Item já existe neste kit", variant: "destructive" }); return;
    }
    const sel = selectableItems.find(s => s.id === addItemId);
    const { error } = await supabase.from("kit_itens").insert({
      kit_id: addItemKitId, item_id: addItemId, quantidade: addItemQtd, item_type: sel?.tipo || "item",
    });
    if (error) {
      toast({ title: "Erro ao adicionar", description: error.message, variant: "destructive" }); return;
    }
    setAddItemId("");
    setAddItemQtd(1);
    setShowAddItem(false);
    toast({ title: "Item adicionado ao kit!" });
    fetchAll();
  };

  const handleRemoveItemFromKit = async (kitItemId: string) => {
    await supabase.from("kit_itens").delete().eq("id", kitItemId);
    toast({ title: "Item removido" });
    fetchAll();
  };

  const handleMontarLote = async () => {
    if (!selectedKitId || loteQtd <= 0) return;
    const kit = kits.find(k => k.id === selectedKitId);
    if (!kit) return;
    const { error } = await supabase.from("kits").update({
      montados: kit.montados + loteQtd,
      disponiveis: kit.disponiveis + loteQtd,
    }).eq("id", selectedKitId);
    if (error) {
      toast({ title: "Erro ao montar lote", variant: "destructive" }); return;
    }
    setShowMontarLote(false);
    setLoteQtd(10);
    toast({ title: "Lote montado!", description: `${loteQtd}x "${kit.nome}"` });
    fetchAll();
  };

  const handleDeleteKit = async (kitId: string) => {
    await supabase.from("kits").delete().eq("id", kitId);
    toast({ title: "Kit removido" });
    fetchAll();
  };

  const openEditKit = (kit: Kit) => {
    setEditForm({ nome: kit.nome, tipo: kit.tipo, descricao: getCleanKitDescription(kit.descricao) });
    setEditKitImage(null);
    setIsEditingKitDetails(true);
    setEditingKit(kit);
  };

  const openKitDetails = (kit: Kit) => {
    setEditForm({ nome: kit.nome, tipo: kit.tipo, descricao: getCleanKitDescription(kit.descricao) });
    setEditKitImage(null);
    setIsEditingKitDetails(false);
    setEditingKit(kit);
  };

  const openKitRequest = (kit: Kit, type: "montagem" | "reposicao") => {
    setEditingKit(null);
    setRequestingKit(kit);
    setKitRequestType(type);
    setKitRequestQtd(1);
    setKitRequestNotes("");
  };

  const handleCreateKitRequest = async () => {
    if (!requestingKit || kitRequestQtd <= 0) return;
    const action = kitRequestType === "montagem" ? "Montar" : "Repor";
    const { error } = await supabase.from("estoque_solicitacoes").insert({
      finalidade: "reposicao",
      alvo_tipo: "livre",
      item_id: null,
      pack_id: null,
      titulo: `[KIT] ${action} ${requestingKit.nome}`,
      quantidade: kitRequestQtd,
      unidade: "kit",
      observacao: [
        kitRequestType === "montagem" ? "Solicitação de montagem de kit." : "Solicitação para aumentar a disponibilidade do kit.",
        kitRequestNotes.trim(),
      ].filter(Boolean).join(" "),
    });
    if (error) {
      toast({ title: "Erro ao registrar solicitação", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Solicitação registrada", description: `${kitRequestQtd}x “${requestingKit.nome}” aguardando atendimento.` });
    setRequestingKit(null);
  };

  const handleSaveEdit = async () => {
    if (!editingKit) return;
    const currentImage = getKitImageFromDescription(editingKit.descricao);
    const uploadedImage = editKitImage ? await uploadKitImage(editKitImage) : currentImage;
    if (editKitImage && !uploadedImage) return;
    await supabase.from("kits").update({
      nome: editForm.nome || editingKit.nome,
      tipo: editForm.tipo || editingKit.tipo,
      descricao: withKitImage(editForm.descricao, uploadedImage),
    }).eq("id", editingKit.id);
    setEditingKit(null);
    toast({ title: "Kit atualizado!" });
    fetchAll();
  };

  const totalMontados = kits.reduce((a, k) => a + k.montados, 0);
  const totalDisponiveis = kits.reduce((a, k) => a + k.disponiveis, 0);
  const totalUsados = kits.reduce((a, k) => a + k.usados, 0);
  const kitsMontaveis = kits.filter(k => getKitAvailability(k.id).canBuild).length;
  const detailKitItems = editingKit ? getKitItens(editingKit.id) : [];
  const detailKitAvailability = editingKit ? getKitAvailability(editingKit.id) : null;
  const detailKitCover = editingKit ? getKitCover(editingKit) : null;
  const detailKitCost = editingKit ? calcCusto(detailKitItems) : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="page-shell space-y-4 animate-fade-in pb-24">
      <div className="page-hero rounded-lg p-4 sm:p-5">
        <h1 className="font-display text-xl font-bold">Kits e Montagem</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Modelos de kits — monte independente do estoque</p>
      </div>

      <div className="filter-bar rounded-lg p-2 flex gap-2">
        <Button variant="outline" size="sm" className="flex-1 text-xs"
          onClick={() => { setSelectedKitId(kits[0]?.id ?? null); setShowMontarLote(true); }}
          disabled={kits.length === 0}>
          <Layers className="w-3.5 h-3.5 mr-1" /> Montar Lote
        </Button>
        <Button size="sm" className="flex-1 text-xs" onClick={() => setShowNewKit(true)}>
          <Plus className="w-3.5 h-3.5 mr-1" /> Novo Kit
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">
        {[
          { label: "Modelos", value: kits.length, icon: Gift, color: "text-primary bg-primary/10" },
          { label: "Montáveis", value: kitsMontaveis, icon: CheckCircle, color: kitsMontaveis > 0 ? "text-status-visited bg-status-visited/10" : "text-muted-foreground bg-muted" },
          { label: "Disponíveis", value: totalDisponiveis, icon: Package, color: "text-accent-foreground bg-accent/10" },
          { label: "Utilizados", value: totalUsados, icon: Layers, color: "text-status-planned bg-status-planned/10" },
        ].map((stat) => (
          <div key={stat.label} className="metric-card flex items-center gap-2 rounded-lg p-2 sm:gap-2.5 sm:p-3">
            <div className={cn("kpi-icon flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg sm:h-8 sm:w-8", stat.color)}>
              <stat.icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </div>
            <div>
              <p className="font-display text-base font-bold leading-none text-foreground sm:text-lg">{stat.value}</p>
              <p className="mt-0.5 text-[9px] text-muted-foreground sm:text-[10px]">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Marketplace de kits */}
      <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-[repeat(auto-fill,minmax(260px,1fr))] sm:gap-3">
        {kits.map((kit) => {
          const items = getKitItens(kit.id);
          const custoEstimado = calcCusto(items);
          const availability = getKitAvailability(kit.id);
          const isExpanded = expandedKitId === kit.id;
          const cover = getKitCover(kit);

          return (
            <article key={kit.id} className={cn("group flex min-w-0 flex-col overflow-hidden rounded-lg border bg-card shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg sm:rounded-xl", availability.canBuild ? "border-status-visited/40" : "border-border")}>
              <button type="button" onClick={() => openKitDetails(kit)} className="relative aspect-square w-full overflow-hidden bg-gradient-to-br from-primary/15 via-secondary to-accent/10 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset sm:aspect-[4/3]" aria-label={`Visualizar ${kit.nome}`}>
                {cover ? (
                  <img src={cover.url} alt={`Imagem de ${kit.nome}`} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center text-primary/35"><Gift className="h-7 w-7 sm:h-14 sm:w-14" strokeWidth={1.25} /><span className="mt-1 text-[7px] font-semibold uppercase tracking-[0.12em] sm:mt-2 sm:text-[10px] sm:tracking-[0.18em]">Sem imagem</span></div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/5" />
                <div className="absolute left-1.5 right-1.5 top-1.5 flex items-start justify-between gap-1 sm:left-3 sm:right-3 sm:top-3 sm:gap-2">
                  <Badge className="max-w-[55%] truncate border-white/25 bg-white/90 px-1 py-0 text-[7px] font-bold text-foreground shadow-sm hover:bg-white sm:max-w-full sm:px-2 sm:text-[9px]">{kit.tipo}</Badge>
                  <Badge className={cn("border-0 px-1 py-0 text-[7px] font-bold shadow-sm sm:px-2 sm:text-[9px]", availability.canBuild ? "bg-primary text-primary-foreground" : "bg-destructive text-destructive-foreground")}>{availability.canBuild ? `Monta ${availability.maxBuildable}x` : `${availability.faltas.length} faltando`}</Badge>
                </div>
                {cover && <div className="absolute inset-x-0 bottom-0 hidden bg-gradient-to-t from-black/80 to-transparent px-3 pb-3 pt-10 text-[9px] text-white/85 sm:block">Imagem vinculada: <span className="font-semibold text-white">{cover.label}</span></div>}
              </button>

              <button type="button" onClick={() => openKitDetails(kit)} className="flex flex-1 flex-col p-1.5 text-left sm:hidden" aria-label={`Abrir detalhes de ${kit.nome}`}>
                <h3 className="line-clamp-2 min-h-7 font-display text-[9px] font-bold leading-tight text-foreground">{kit.nome}</h3>
                <div className="mt-auto flex items-end justify-between gap-1 pt-1">
                  <span className={cn("text-xs font-bold", kit.disponiveis > 0 ? "text-primary" : "text-muted-foreground")}>{kit.disponiveis}<span className="ml-0.5 text-[7px] font-medium">disp.</span></span>
                  <span className="text-[7px] font-semibold text-muted-foreground">{items.length} itens</span>
                </div>
              </button>

              <div className="hidden flex-1 flex-col p-3 sm:flex">
                <h3 className="line-clamp-2 min-h-9 font-display text-sm font-bold leading-[1.15] text-foreground">{kit.nome}</h3>
                <p className="mt-1 line-clamp-2 min-h-7 text-[10px] leading-snug text-muted-foreground">{getCleanKitDescription(kit.descricao) || "Modelo pronto para organizar e montar materiais."}</p>

                <div className="mt-3 grid grid-cols-3 gap-2 rounded-lg bg-muted/50 p-2">
                  <div><p className="text-[8px] font-semibold uppercase tracking-wider text-muted-foreground">Custo</p><p className="mt-0.5 text-xs font-bold">R$ {custoEstimado.toFixed(2)}</p></div>
                  <div><p className="text-[8px] font-semibold uppercase tracking-wider text-muted-foreground">Disponíveis</p><p className="mt-0.5 text-xs font-bold text-primary">{kit.disponiveis}</p></div>
                  <div className="text-right"><p className="text-[8px] font-semibold uppercase tracking-wider text-muted-foreground">Montados</p><p className="mt-0.5 text-xs font-bold">{kit.montados}</p></div>
                </div>
                <p className="mt-1.5 text-[9px] text-muted-foreground">{items.length} {items.length === 1 ? "componente" : "componentes"} no modelo</p>

                <div className="mt-2 flex flex-wrap gap-1">
                  {items.slice(0, 3).map((component) => <Badge key={component.id} variant="outline" className="max-w-full bg-primary/5 px-1.5 text-[9px] font-medium"><span className="truncate">{getItemName(component.item_id)}</span>&nbsp;×{component.quantidade}</Badge>)}
                  {items.length > 3 && <Badge variant="secondary" className="px-1.5 text-[9px]">+{items.length - 3}</Badge>}
                </div>

                {isExpanded && (
                  <div className="mt-3 space-y-3 border-t border-border/60 pt-3">

                  {/* Availability alerts */}
                  {availability.faltas.length > 0 && (
                    <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-3 space-y-1.5">
                      <p className="text-[11px] font-semibold text-destructive flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> Itens faltando no estoque
                      </p>
                      {availability.faltas.map((f, i) => (
                        <div key={i} className="flex justify-between text-[11px]">
                          <span className="text-foreground">{f.nome}</span>
                          <span className="text-destructive font-medium">
                            {f.disponivel}/{f.necessario}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {kit.montados > 0 && (
                    <div>
                      <div className="flex items-center justify-between text-[11px] mb-1">
                        <span className="text-muted-foreground">Utilização</span>
                        <span className="font-medium text-foreground">{kit.usados}/{kit.montados}</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden flex">
                        <div className="bg-status-visited rounded-l-full" style={{ width: `${kit.montados > 0 ? (kit.usados / kit.montados) * 100 : 0}%` }} />
                        <div className="bg-status-planned/60" style={{ width: `${kit.montados > 0 ? (kit.disponiveis / kit.montados) * 100 : 0}%` }} />
                      </div>
                    </div>
                  )}

                  <div>
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      Composição ({items.length} itens)
                    </p>
                    <div className="space-y-1.5">
                      {items.map((ki) => (
                        <div key={ki.id} className="flex items-center gap-2 text-xs bg-muted/40 rounded-lg px-2.5 py-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-primary/50 flex-shrink-0" />
                          <span className="flex-1 text-foreground truncate">{getItemName(ki.item_id)}</span>
                          <span className="font-semibold text-muted-foreground text-[11px]">×{ki.quantidade}</span>
                          <button onClick={(e) => { e.stopPropagation(); handleRemoveItemFromKit(ki.id); }}
                            className="text-destructive/60 hover:text-destructive p-0.5 transition-colors">
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  </div>
                )}

                <div className="mt-auto grid grid-cols-[1fr_1fr_auto] gap-1.5 border-t border-border/70 pt-3">
                  <Button size="sm" className="h-8 px-2 text-[10px]" onClick={() => { setSelectedKitId(kit.id); setShowMontarLote(true); }}><Layers className="mr-1 h-3 w-3" /> Montar</Button>
                  <Button variant="outline" size="sm" className="h-8 px-2 text-[10px]" onClick={() => setExpandedKitId(isExpanded ? null : kit.id)}><Eye className="mr-1 h-3 w-3" /> {isExpanded ? "Recolher" : "Ver kit"}</Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button type="button" size="icon" variant="ghost" className="h-8 w-8" aria-label={`Mais ações para ${kit.nome}`}><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44">
                      <DropdownMenuItem onSelect={() => { setAddItemKitId(kit.id); setAddItemId(""); setShowAddItem(true); }} className="text-xs"><Plus className="mr-2 h-3.5 w-3.5" /> Adicionar item</DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => openEditKit(kit)} className="text-xs"><Pencil className="mr-2 h-3.5 w-3.5" /> Editar e trocar imagem</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onSelect={() => handleDeleteKit(kit.id)} className="text-xs text-destructive focus:text-destructive"><Trash2 className="mr-2 h-3.5 w-3.5" /> Excluir kit</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </article>
          );
        })}

        {kits.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Gift className="w-10 h-10 mb-3 opacity-30" />
            <p className="text-sm font-medium">Nenhum kit cadastrado</p>
            <p className="text-xs mt-1">Toque em "Novo Kit" para começar</p>
          </div>
        )}
      </div>

      {/* Sheet: Novo Kit */}
      <Sheet open={showNewKit} onOpenChange={setShowNewKit}>
        <SheetContent side="bottom" className="h-[92vh] overflow-y-auto rounded-t-lg bg-background">
          <SheetHeader className="pb-4">
            <SheetTitle className="font-display text-lg">Novo Modelo de Kit</SheetTitle>
          </SheetHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs">Nome do Kit *</Label>
              <Input placeholder="Ex: Kit Técnico" value={newKit.nome} onChange={e => setNewKit(p => ({ ...p, nome: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Tipo / Público-alvo *</Label>
              <Input placeholder="Ex: Técnicos / Protocolo" value={newKit.tipo} onChange={e => setNewKit(p => ({ ...p, tipo: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Descrição</Label>
              <Textarea placeholder="Descreva o objetivo deste kit..." value={newKit.descricao} onChange={e => setNewKit(p => ({ ...p, descricao: e.target.value }))} rows={2} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Imagem do kit (opcional)</Label>
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-border px-3 py-3 text-xs text-muted-foreground transition-colors hover:bg-muted/50">
                <Upload className="h-3.5 w-3.5" /> {newKitImage ? newKitImage.name : "Adicionar imagem própria"}
                <input type="file" accept="image/*" className="hidden" onChange={(event) => setNewKitImage(event.target.files?.[0] || null)} />
              </label>
              <p className="text-[10px] text-muted-foreground">Sem uma imagem própria, o catálogo usa automaticamente a imagem do primeiro item vinculado.</p>
            </div>

            <div className="surface-panel rounded-lg p-3 space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Itens do Kit</p>
              <p className="text-[10px] text-muted-foreground">Selecione itens ou packs — não precisa ter saldo, o kit é um modelo.</p>

              <div className="space-y-2">
                <Select value={newItemId} onValueChange={(v) => {
                  setNewItemId(v);
                  const sel = selectableItems.find(s => s.id === v);
                  if (sel) setNewItemType(sel.tipo);
                }}>
                  <SelectTrigger className="text-xs"><SelectValue placeholder="Selecione um item ou pack" /></SelectTrigger>
                  <SelectContent>
                    {selectableItems.map(e => (
                      <SelectItem key={e.id} value={e.id} className="text-xs">
                        <span>{e.nome}</span>
                        <span className="text-muted-foreground ml-2">R$ {e.custo_unitario.toFixed(2)}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="flex gap-2">
                  <div className="flex-1">
                    <Label className="text-[10px] text-muted-foreground">Qtd por kit</Label>
                    <Input type="number" min={1} value={newItemQtd} onChange={e => setNewItemQtd(Math.max(1, Number(e.target.value)))} />
                  </div>
                  <div className="flex items-end">
                    <Button onClick={handleAddItemToNewKit} disabled={!newItemId} size="sm">
                      <Plus className="w-3.5 h-3.5 mr-1" /> Adicionar
                    </Button>
                  </div>
                </div>
              </div>

              {newKitItens.length > 0 ? (
                <div className="space-y-1.5">
                  {newKitItens.map(i => (
                    <div key={i.item_id} className="flex items-center gap-2 text-xs bg-muted/50 p-2.5 rounded-lg">
                      <Package className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                      <span className="flex-1 truncate">{getItemName(i.item_id)}</span>
                      <span className="font-semibold text-muted-foreground">×{i.quantidade}</span>
                      <span className="text-[10px] text-muted-foreground">R$ {(getItemCusto(i.item_id) * i.quantidade).toFixed(2)}</span>
                      <button onClick={() => setNewKitItens(prev => prev.filter(x => x.item_id !== i.item_id))} className="text-destructive/60 hover:text-destructive">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  <div className="flex justify-between items-center pt-2 border-t border-border/40">
                    <span className="text-xs text-muted-foreground">{newKitItens.length} itens</span>
                    <span className="text-sm font-display font-bold text-foreground">R$ {calcCusto(newKitItens).toFixed(2)} / kit</span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic text-center py-4">Nenhum item adicionado ainda</p>
              )}
            </div>
          </div>

          <SheetFooter className="pt-4 gap-2">
            <Button variant="outline" onClick={() => setShowNewKit(false)} className="flex-1">Cancelar</Button>
            <Button onClick={handleCreateKit} className="flex-1"><Gift className="w-3.5 h-3.5 mr-1" /> Criar Kit</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Sheet: Adicionar Item a Kit Existente */}
      <Sheet open={showAddItem} onOpenChange={setShowAddItem}>
        <SheetContent side="bottom" className="rounded-t-lg bg-background">
          <SheetHeader><SheetTitle className="font-display text-lg">Adicionar Item</SheetTitle></SheetHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-xs">Item ou Pack</Label>
              <Select value={addItemId} onValueChange={(v) => {
                setAddItemId(v);
                const sel = selectableItems.find(s => s.id === v);
                if (sel) setAddItemType(sel.tipo);
              }}>
                <SelectTrigger className="text-xs"><SelectValue placeholder="Selecione um item ou pack" /></SelectTrigger>
                <SelectContent>
                  {selectableItems.map(e => (
                    <SelectItem key={e.id} value={e.id} className="text-xs">{e.nome} — R$ {e.custo_unitario.toFixed(2)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Quantidade por kit</Label>
              <Input type="number" min={1} value={addItemQtd} onChange={e => setAddItemQtd(Math.max(1, Number(e.target.value)))} />
            </div>
          </div>
          <SheetFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowAddItem(false)} className="flex-1">Cancelar</Button>
            <Button onClick={handleAddItemToExistingKit} disabled={!addItemId} className="flex-1">Adicionar</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Sheet: Montar Lote */}
      <Sheet open={showMontarLote} onOpenChange={setShowMontarLote}>
        <SheetContent side="bottom" className="rounded-t-lg bg-background">
          <SheetHeader><SheetTitle className="font-display text-lg">Montar Lote</SheetTitle></SheetHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-xs">Kit</Label>
              <Select value={selectedKitId ?? ""} onValueChange={setSelectedKitId}>
                <SelectTrigger className="text-xs"><SelectValue placeholder="Selecione o kit" /></SelectTrigger>
                <SelectContent>
                  {kits.map(k => (<SelectItem key={k.id} value={k.id} className="text-xs">{k.nome}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Quantidade a montar</Label>
              <Input type="number" min={1} value={loteQtd} onChange={e => setLoteQtd(Math.max(1, Number(e.target.value)))} />
            </div>
            {selectedKitId && (() => {
              const avail = getKitAvailability(selectedKitId);
              return (
                <div className="space-y-3">
                  <div className="bg-muted/50 rounded-lg p-3 space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Custo unitário</span>
                      <span className="text-foreground">R$ {calcCusto(getKitItens(selectedKitId)).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm font-bold">
                      <span className="text-muted-foreground">Total do lote</span>
                      <span className="text-foreground font-display">R$ {(calcCusto(getKitItens(selectedKitId)) * loteQtd).toFixed(2)}</span>
                    </div>
                  </div>
                  {avail.faltas.length > 0 && (
                    <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-3 space-y-1">
                      <p className="text-[11px] font-semibold text-destructive flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> Estoque insuficiente para 1 unidade
                      </p>
                      {avail.faltas.map((f, i) => (
                        <div key={i} className="flex justify-between text-[11px]">
                          <span className="text-foreground">{f.nome}</span>
                          <span className="text-destructive font-medium">{f.disponivel}/{f.necessario}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
          <SheetFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowMontarLote(false)} className="flex-1">Cancelar</Button>
            <Button onClick={handleMontarLote} className="flex-1"><Layers className="w-3.5 h-3.5 mr-1" /> Montar {loteQtd}x</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Sheet: Detalhes e edição do Kit */}
      <Sheet open={!!editingKit} onOpenChange={(open) => {
        if (!open) {
          setEditingKit(null);
          setIsEditingKitDetails(false);
        }
      }}>
        <SheetContent side="bottom" className="h-[92vh] overflow-y-auto rounded-t-xl bg-background">
          <SheetHeader>
            <SheetTitle className="font-display text-lg">{isEditingKitDetails ? "Editar kit" : "Detalhes do kit"}</SheetTitle>
            <p className="text-xs text-muted-foreground">{isEditingKitDetails ? "Altere somente as informações necessárias." : "Visão consolidada da composição, disponibilidade e próximas ações."}</p>
          </SheetHeader>

          {editingKit && (
            <div className="mx-auto max-w-3xl space-y-3 py-4">
              {isEditingKitDetails ? (
                <div className="space-y-4 rounded-xl border border-primary/20 bg-card p-3 shadow-sm sm:p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div><p className="font-display text-sm font-bold">Informações do kit</p><p className="text-[10px] text-muted-foreground">Nome, público, descrição e imagem.</p></div>
                    <Badge className="border-0 bg-primary/10 text-[9px] text-primary hover:bg-primary/10"><Pencil className="mr-1 h-2.5 w-2.5" /> Modo edição</Badge>
                  </div>
                  <div className="space-y-2"><Label className="text-xs">Nome</Label><Input value={editForm.nome} onChange={e => setEditForm(p => ({ ...p, nome: e.target.value }))} /></div>
                  <div className="space-y-2"><Label className="text-xs">Tipo / Público</Label><Input value={editForm.tipo} onChange={e => setEditForm(p => ({ ...p, tipo: e.target.value }))} /></div>
                  <div className="space-y-2"><Label className="text-xs">Descrição</Label><Textarea value={editForm.descricao} onChange={e => setEditForm(p => ({ ...p, descricao: e.target.value }))} rows={2} /></div>
                  <div className="space-y-2">
                    <Label className="text-xs">Imagem do catálogo</Label>
                    {detailKitCover && (
                      <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-2">
                        <img src={editKitImage ? URL.createObjectURL(editKitImage) : detailKitCover.url} alt="Prévia do kit" className="h-14 w-20 rounded-md object-cover" />
                        <div className="min-w-0"><p className="text-xs font-medium">Imagem atual</p><p className="truncate text-[10px] text-muted-foreground">{editKitImage?.name || detailKitCover.label}</p></div>
                      </div>
                    )}
                    <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-border px-3 py-3 text-xs text-muted-foreground transition-colors hover:bg-muted/50">
                      <ImageIcon className="h-3.5 w-3.5" /> {editKitImage ? "Trocar arquivo selecionado" : "Adicionar ou trocar imagem"}
                      <input type="file" accept="image/*" className="hidden" onChange={(event) => setEditKitImage(event.target.files?.[0] || null)} />
                    </label>
                    <p className="text-[10px] text-muted-foreground">Sem uma imagem própria, a imagem do primeiro item continua sendo usada como referência.</p>
                  </div>
                </div>
              ) : (
                <>
                  <button type="button" onClick={() => setIsEditingKitDetails(true)} className="group relative block h-40 w-full overflow-hidden rounded-xl border border-border bg-gradient-to-br from-primary/15 via-secondary to-accent/10 text-left shadow-sm ring-offset-background transition hover:ring-2 hover:ring-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:h-56" aria-label="Editar imagem e informações do kit">
                    {detailKitCover ? (
                      <img src={detailKitCover.url} alt={editingKit.nome} className="h-full w-full object-cover sm:object-contain" />
                    ) : (
                      <div className="flex h-full flex-col items-center justify-center text-primary/35"><Gift className="h-12 w-12" strokeWidth={1.25} /><span className="mt-2 text-[9px] font-semibold uppercase tracking-[0.16em]">Kit sem imagem</span></div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 p-3 text-white sm:p-4">
                      <Badge className="mb-1 border-white/25 bg-white/90 px-1.5 text-[8px] text-foreground hover:bg-white sm:text-[9px]">{editingKit.tipo}</Badge>
                      <h3 className="line-clamp-2 font-display text-base font-bold leading-tight sm:text-xl">{editingKit.nome}</h3>
                      <p className="mt-1 line-clamp-1 text-[9px] text-white/75 sm:text-[10px]">{getCleanKitDescription(editingKit.descricao) || "Modelo de kit cadastrado"}</p>
                    </div>
                    <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-black/55 px-2 py-1 text-[9px] font-semibold text-white backdrop-blur-sm"><Pencil className="h-2.5 w-2.5" /> Editar</span>
                  </button>

                  <button type="button" onClick={() => setIsEditingKitDetails(true)} className="w-full rounded-xl border border-border bg-card p-3 text-left shadow-sm transition hover:border-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:p-4" aria-label="Editar informações consolidadas do kit">
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div><p className="text-[9px] font-bold uppercase tracking-[0.18em] text-primary">Painel do kit</p><p className="mt-1 text-xs font-medium text-muted-foreground">Clique para editar as informações</p></div>
                      <span className={cn("rounded-full px-2 py-1 text-[9px] font-bold", detailKitAvailability?.canBuild ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-700")}>{detailKitAvailability?.canBuild ? `Pode montar ${detailKitAvailability.maxBuildable}` : "Reposição necessária"}</span>
                    </div>
                    <div className="grid grid-cols-4 overflow-hidden rounded-lg border border-border/70 bg-muted/25 text-center">
                      <div className="p-2"><p className="text-[7px] font-bold uppercase tracking-wider text-muted-foreground">Montados</p><p className="mt-1 font-display text-base font-bold text-foreground">{editingKit.montados}</p></div>
                      <div className="border-l border-border/70 p-2"><p className="text-[7px] font-bold uppercase tracking-wider text-muted-foreground">Disponíveis</p><p className="mt-1 font-display text-base font-bold text-primary">{editingKit.disponiveis}</p></div>
                      <div className="border-l border-border/70 p-2"><p className="text-[7px] font-bold uppercase tracking-wider text-muted-foreground">Utilizados</p><p className="mt-1 font-display text-base font-bold text-foreground">{editingKit.usados}</p></div>
                      <div className="border-l border-border/70 p-2"><p className="text-[7px] font-bold uppercase tracking-wider text-muted-foreground">Custo</p><p className="mt-1 text-[10px] font-bold text-foreground">R$ {detailKitCost.toFixed(2)}</p></div>
                    </div>
                  </button>

                  <div className="rounded-xl border border-border bg-card p-3 shadow-sm sm:p-4">
                    <div className="flex items-center justify-between gap-3"><div><p className="font-display text-sm font-bold">Composição</p><p className="text-[9px] text-muted-foreground">{detailKitItems.length} {detailKitItems.length === 1 ? "componente" : "componentes"} por kit</p></div><Package className="h-4 w-4 text-primary" /></div>
                    <div className="mt-3 space-y-1.5">
                      {detailKitItems.map((component) => (
                        <div key={component.id} className="flex items-center gap-2 rounded-lg bg-muted/40 px-2.5 py-2 text-xs">
                          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />
                          <span className="min-w-0 flex-1 truncate font-medium">{getItemName(component.item_id)}</span>
                          <span className="text-[10px] font-bold text-primary">×{component.quantidade}</span>
                          <span className="text-[9px] text-muted-foreground">R$ {(getItemCusto(component.item_id) * component.quantidade).toFixed(2)}</span>
                        </div>
                      ))}
                      {detailKitItems.length === 0 && <p className="rounded-lg border border-dashed border-border py-4 text-center text-[10px] text-muted-foreground">Nenhum componente vinculado.</p>}
                    </div>
                  </div>

                  {detailKitAvailability && detailKitAvailability.faltas.length > 0 && (
                    <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-3">
                      <p className="flex items-center gap-1.5 text-[10px] font-bold text-destructive"><AlertTriangle className="h-3.5 w-3.5" /> Itens que precisam de reposição</p>
                      <div className="mt-2 space-y-1">{detailKitAvailability.faltas.map((item, index) => <div key={`${item.nome}-${index}`} className="flex justify-between gap-3 text-[10px]"><span className="truncate text-foreground">{item.nome}</span><span className="shrink-0 font-semibold text-destructive">{item.disponivel}/{item.necessario}</span></div>)}</div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <Button type="button" onClick={() => { setSelectedKitId(editingKit.id); setLoteQtd(1); setEditingKit(null); setShowMontarLote(true); }} disabled={!detailKitAvailability?.canBuild}><Layers className="mr-1.5 h-3.5 w-3.5" /> Montar agora</Button>
                    <Button type="button" variant="outline" onClick={() => openKitRequest(editingKit, "montagem")}><ClipboardList className="mr-1.5 h-3.5 w-3.5" /> Solicitar montagem</Button>
                    <Button type="button" variant="outline" className="col-span-2" onClick={() => openKitRequest(editingKit, "reposicao")}><Send className="mr-1.5 h-3.5 w-3.5" /> Solicitar mais kits</Button>
                  </div>
                </>
              )}
            </div>
          )}

          <SheetFooter className="gap-2">
            <Button variant="outline" onClick={() => {
              if (isEditingKitDetails) setIsEditingKitDetails(false);
              else setEditingKit(null);
            }} className="flex-1">{isEditingKitDetails ? "Cancelar edição" : "Fechar"}</Button>
            {isEditingKitDetails ? (
              <Button onClick={handleSaveEdit} className="flex-1"><CheckIcon className="mr-1.5 h-3.5 w-3.5" /> Salvar alterações</Button>
            ) : (
              <Button onClick={() => setIsEditingKitDetails(true)} className="flex-1"><Pencil className="mr-1.5 h-3.5 w-3.5" /> Editar informações</Button>
            )}
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Sheet: Solicitar montagem ou reposição do Kit */}
      <Sheet open={!!requestingKit} onOpenChange={(open) => !open && setRequestingKit(null)}>
        <SheetContent side="bottom" className="rounded-t-xl bg-background">
          <SheetHeader>
            <SheetTitle className="font-display text-lg">{kitRequestType === "montagem" ? "Solicitar montagem" : "Solicitar mais kits"}</SheetTitle>
            <p className="text-xs text-muted-foreground">{requestingKit?.nome}</p>
          </SheetHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-2 rounded-xl bg-muted/40 p-3 text-center">
              <div><p className="text-[8px] font-bold uppercase tracking-wider text-muted-foreground">Disponíveis</p><p className="mt-1 font-display text-lg font-bold text-primary">{requestingKit?.disponiveis || 0}</p></div>
              <div><p className="text-[8px] font-bold uppercase tracking-wider text-muted-foreground">Montados</p><p className="mt-1 font-display text-lg font-bold">{requestingKit?.montados || 0}</p></div>
            </div>
            <div className="space-y-2"><Label className="text-xs">Quantidade solicitada</Label><Input type="number" min={1} value={kitRequestQtd} onChange={(event) => setKitRequestQtd(Math.max(1, Number(event.target.value)))} /></div>
            <div className="space-y-2"><Label className="text-xs">Contexto ou observação</Label><Textarea rows={3} placeholder="Prazo, destino, motivo ou orientações para a montagem" value={kitRequestNotes} onChange={(event) => setKitRequestNotes(event.target.value)} /></div>
            <div className="flex items-center justify-between rounded-lg bg-primary/5 px-3 py-2 text-xs"><span className="text-muted-foreground">Custo estimado</span><strong className="text-primary">R$ {(requestingKit ? calcCusto(getKitItens(requestingKit.id)) * kitRequestQtd : 0).toFixed(2)}</strong></div>
          </div>
          <SheetFooter className="gap-2">
            <Button variant="outline" onClick={() => setRequestingKit(null)} className="flex-1">Cancelar</Button>
            <Button onClick={handleCreateKitRequest} className="flex-1"><ClipboardList className="mr-1.5 h-3.5 w-3.5" /> Registrar solicitação</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
