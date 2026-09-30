import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import {
  Package, Plus, Search, AlertCircle, ArrowDown, ArrowUp,
  TrendingDown, Boxes, Pencil, Trash2, X, Check, Layers, Upload, Paperclip,
  Eye, ExternalLink, Link2, ShoppingCart, MoreHorizontal, Clock3, Store, Link2Off
} from "lucide-react";
import { EstoqueDocumentosManager } from "@/components/EstoqueDocumentosManager";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
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
  itens: PackItem[];
}

const CATEGORIAS = ["Brinde", "Embalagem", "Papelaria"];

export default function Estoque() {
  const [itens, setItens] = useState<EstoqueItem[]>([]);
  const [packs, setPacks] = useState<Pack[]>([]);
  const [docCounts, setDocCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoriaFilter, setCategoriaFilter] = useState("todas");
  const [quickFilter, setQuickFilter] = useState<"todos" | "criticos" | "recentes" | "sem_fornecedor" | "sem_link">("todos");
  const [sortBy, setSortBy] = useState<"recentes" | "nome" | "estoque" | "maior-estoque" | "menor-custo" | "maior-custo">("recentes");
  const [activeTab, setActiveTab] = useState<"itens" | "packs">("itens");

  // Sheets
  const [showNewItem, setShowNewItem] = useState(false);
  const [editingItem, setEditingItem] = useState<EstoqueItem | null>(null);
  const [showEntrada, setShowEntrada] = useState(false);
  const [showSaida, setShowSaida] = useState(false);
  const [movItemId, setMovItemId] = useState<string | null>(null);
  const [movQtd, setMovQtd] = useState(0);
  const [showNewPack, setShowNewPack] = useState(false);
  const [editingPack, setEditingPack] = useState<Pack | null>(null);

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

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    const [itensRes, packsRes, packItensRes, docsRes] = await Promise.all([
      supabase.from("estoque_itens").select("*").order("nome"),
      supabase.from("packs").select("*").order("nome"),
      supabase.from("pack_itens").select("*"),
      supabase.from("estoque_itens_documentos").select("item_id"),
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
    setLoading(false);
  };

  const isRecent = (createdAt: string) => Date.now() - new Date(createdAt).getTime() <= 7 * 24 * 60 * 60 * 1000;
  const categorias = Array.from(new Set(itens.map((i) => i.categoria))).sort((a, b) => a.localeCompare(b, "pt-BR"));
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
  const filteredPacks = packs.filter(p => p.nome.toLowerCase().includes(search.toLowerCase()));

  const totalItens = itens.length;
  const alertaCount = itens.filter((i) => i.saldo_atual < i.minimo).length;
  const valorTotal = itens.reduce((acc, i) => acc + i.saldo_atual * i.custo_unitario, 0);

  const getEstoqueStatus = (item: EstoqueItem) => {
    const pct = item.minimo > 0 ? item.saldo_atual / item.minimo : 2;
    if (pct < 1) return { label: "Crítico", color: "text-destructive bg-destructive/10", barColor: "bg-destructive" };
    if (pct < 1.3) return { label: "Atenção", color: "text-accent-foreground bg-accent/20", barColor: "bg-accent" };
    return { label: "OK", color: "text-status-visited bg-status-visited/10", barColor: "bg-status-visited" };
  };

  const getItemName = (id: string) => itens.find(i => i.id === id)?.nome || "—";

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
  const handleCreatePack = async () => {
    if (!packForm.nome.trim() || packItensForm.length === 0) {
      toast({ title: "Preencha o nome e adicione pelo menos um item", variant: "destructive" });
      return;
    }
    const { data, error } = await supabase.from("packs").insert({
      nome: packForm.nome, descricao: packForm.descricao || null,
    }).select().single();
    if (error || !data) {
      toast({ title: "Erro ao criar pack", description: error?.message, variant: "destructive" });
      return;
    }
    const inserts = packItensForm.map(pi => ({ pack_id: data.id, item_id: pi.item_id, quantidade: pi.quantidade }));
    await supabase.from("pack_itens").insert(inserts);
    setPackForm({ nome: "", descricao: "" });
    setPackItensForm([]);
    setShowNewPack(false);
    toast({ title: "Pack criado!" });
    fetchAll();
  };

  const handleSavePack = async () => {
    if (!editingPack) return;
    await supabase.from("packs").update({
      nome: packForm.nome, descricao: packForm.descricao || null,
    }).eq("id", editingPack.id);
    // Replace pack items
    await supabase.from("pack_itens").delete().eq("pack_id", editingPack.id);
    if (packItensForm.length > 0) {
      const inserts = packItensForm.map(pi => ({ pack_id: editingPack.id, item_id: pi.item_id, quantidade: pi.quantidade }));
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
    setPackItensForm(pack.itens.map(pi => ({ item_id: pi.item_id, quantidade: pi.quantidade })));
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
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Itens do Pack</p>
      <div className="space-y-2">
        <Select value={packNewItemId} onValueChange={setPackNewItemId}>
          <SelectTrigger className="text-xs"><SelectValue placeholder="Selecione um item" /></SelectTrigger>
          <SelectContent>
            {itens.map(i => (
              <SelectItem key={i.id} value={i.id} className="text-xs">{i.nome}</SelectItem>
            ))}
          </SelectContent>
        </Select>
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
        <p className="text-xs text-muted-foreground italic text-center py-3">Nenhum item adicionado</p>
      )}
    </div>
  );

  return (
    <div className="page-shell space-y-4 animate-fade-in pb-24">
      <div className="page-hero rounded-lg p-4 sm:p-5">
        <h1 className="font-display text-xl font-bold">Estoque de Materiais</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Brindes, papelaria, embalagens e packs</p>
      </div>

      {/* Tabs */}
      <div className="filter-bar flex gap-1 p-1 rounded-lg">
        <button className={cn("flex-1 text-xs font-medium py-2 rounded-md transition-colors", activeTab === "itens" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground")} onClick={() => setActiveTab("itens")}>
          <Package className="w-3.5 h-3.5 inline mr-1" /> Itens ({itens.length})
        </button>
        <button className={cn("flex-1 text-xs font-medium py-2 rounded-md transition-colors", activeTab === "packs" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground")} onClick={() => setActiveTab("packs")}>
          <Layers className="w-3.5 h-3.5 inline mr-1" /> Packs ({packs.length})
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
        ) : (
          <Button size="sm" className="flex-1 text-xs" onClick={() => { setPackForm({ nome: "", descricao: "" }); setPackItensForm([]); setPackNewItemId(""); setShowNewPack(true); }}>
            <Plus className="w-3.5 h-3.5 mr-1" /> Novo Pack
          </Button>
        )}
      </div>

      {/* KPIs */}
      {activeTab === "itens" && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div className="metric-card flex items-center gap-2 p-3 rounded-lg">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center"><Boxes className="w-4 h-4 text-primary" /></div>
            <div><p className="font-bold text-lg text-foreground leading-none">{totalItens}</p><p className="text-[9px] text-muted-foreground mt-0.5">Tipos</p></div>
          </div>
          <div className={cn("metric-card flex items-center gap-2 p-3 rounded-lg", alertaCount > 0 ? "border-destructive/30" : "border-border")}>
            <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", alertaCount > 0 ? "bg-destructive/10" : "bg-muted")}><AlertCircle className={cn("w-4 h-4", alertaCount > 0 ? "text-destructive" : "text-muted-foreground")} /></div>
            <div><p className={cn("font-bold text-lg leading-none", alertaCount > 0 ? "text-destructive" : "text-foreground")}>{alertaCount}</p><p className="text-[9px] text-muted-foreground mt-0.5">Alertas</p></div>
          </div>
          <div className="metric-card flex items-center gap-2 p-3 rounded-lg">
            <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center"><TrendingDown className="w-4 h-4 text-accent-foreground" /></div>
            <div><p className="font-bold text-base text-foreground leading-none">R${valorTotal.toFixed(0)}</p><p className="text-[9px] text-muted-foreground mt-0.5">Valor</p></div>
          </div>
        </div>
      )}

      {/* Search and discovery controls */}
      <div className="filter-bar rounded-xl p-2.5 space-y-2.5">
        <div className="flex flex-col gap-2 lg:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input placeholder={activeTab === "itens" ? "Buscar produto, categoria ou fornecedor..." : "Buscar pack..."} value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9 text-xs" />
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
                  {categoria} <span className="ml-1 opacity-75">{categoryCounts[categoria]}</span>
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
          <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-3">
                {filtered.map((item) => {
                  const st = getEstoqueStatus(item);
                  const pct = item.ideal > 0 ? Math.min((item.saldo_atual / item.ideal) * 100, 100) : 0;
                  return (
                    <article key={item.id} className="group flex min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg">
                      <button
                        type="button"
                        onClick={() => openEdit(item)}
                        className="relative block aspect-[4/3] w-full overflow-hidden bg-gradient-to-br from-primary/15 via-secondary to-accent/10 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
                        aria-label={`Visualizar e editar ${item.nome}`}
                      >
                        {item.imagem_url ? (
                          <img src={item.imagem_url} alt={item.nome} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
                        ) : (
                          <div className="flex h-full w-full flex-col items-center justify-center text-primary/35">
                            <Package className="h-14 w-14" strokeWidth={1.25} />
                            <span className="mt-2 text-[10px] font-semibold uppercase tracking-[0.18em]">Sem imagem</span>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-black/5" />

                        <div className="absolute left-3 right-3 top-3 flex items-start justify-between gap-2">
                          <Badge className="border-white/25 bg-white/90 px-2 text-[9px] font-bold text-foreground shadow-sm backdrop-blur-sm hover:bg-white">
                            {item.categoria}
                          </Badge>
                          <Badge className={cn("border-0 px-2 text-[9px] font-bold shadow-sm", st.color)} variant="secondary">{st.label}</Badge>
                        </div>

                      </button>

                      <div className="flex flex-1 flex-col p-3">
                        <div className="min-w-0">
                          <h3 className="line-clamp-2 min-h-9 font-display text-sm font-bold leading-[1.15] text-foreground">{item.nome}</h3>
                          <div className="mt-1.5 flex items-center justify-between gap-2 text-[10px] text-muted-foreground">
                            <span className="truncate">{item.fornecedor || "Sem fornecedor"}</span>
                            {docCounts[item.id] > 0 && <span className="flex shrink-0 items-center gap-1"><Paperclip className="h-2.5 w-2.5" />{docCounts[item.id]}</span>}
                          </div>
                        </div>

                        <div className="mt-3 flex items-end justify-between gap-3">
                          <div>
                            <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Saldo disponível</p>
                            <p className="mt-0.5 text-lg font-bold leading-none text-foreground">
                              {item.saldo_atual} <span className="text-[10px] font-medium text-muted-foreground">{item.unidade}(s)</span>
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-[9px] text-muted-foreground">Custo unitário</p>
                            <p className="text-xs font-bold text-foreground">R$ {item.custo_unitario.toFixed(2)}</p>
                          </div>
                        </div>
                        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                          <div className={cn("h-full rounded-full transition-all", st.barColor)} style={{ width: `${pct}%` }} />
                        </div>
                        <div className="mt-2 flex items-center justify-between text-[9px] text-muted-foreground">
                          <span>Mínimo: {item.minimo} · Ideal: {item.ideal}</span>
                          <span>{new Date(item.created_at).toLocaleDateString("pt-BR")}</span>
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

      {/* PACKS LIST */}
      {activeTab === "packs" && (
        <div className="space-y-2">
          {filteredPacks.map((pack) => (
            <Card key={pack.id} className="entity-card">
              <CardContent className="p-3">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Layers className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium text-sm text-foreground truncate">{pack.nome}</p>
                        <p className="text-[10px] text-muted-foreground">{pack.itens.length} itens</p>
                      </div>
                    </div>
                    {pack.descricao && <p className="text-[11px] text-muted-foreground mt-1">{pack.descricao}</p>}
                    <div className="flex flex-wrap gap-1 mt-2">
                      {pack.itens.map(pi => (
                        <Badge key={pi.id} variant="outline" className="text-[9px] px-1.5 bg-primary/5">
                          {getItemName(pi.item_id)} ×{pi.quantidade}
                        </Badge>
                      ))}
                    </div>
                    <div className="flex items-center justify-end gap-0.5 mt-2">
                      <button onClick={() => openEditPack(pack)} className="p-1.5 hover:bg-muted rounded-lg transition-colors text-muted-foreground"><Pencil className="w-3.5 h-3.5" /></button>
                      <button onClick={() => handleDeletePack(pack.id)} className="p-1.5 hover:bg-destructive/10 rounded-lg transition-colors text-destructive/60"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {filteredPacks.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Layers className="w-10 h-10 mb-3 opacity-30" />
              <p className="text-sm">Nenhum pack cadastrado</p>
              <p className="text-xs mt-1">Packs agrupam múltiplos itens diferentes</p>
              <Button size="sm" variant="outline" className="mt-3" onClick={() => { setPackForm({ nome: "", descricao: "" }); setPackItensForm([]); setShowNewPack(true); }}>
                <Plus className="w-3.5 h-3.5 mr-1" /> Criar primeiro pack
              </Button>
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
      <Sheet open={!!editingItem} onOpenChange={(open) => !open && setEditingItem(null)}>
        <SheetContent side="bottom" className="h-[92vh] overflow-y-auto rounded-t-xl bg-background">
          <SheetHeader>
            <SheetTitle className="font-display text-lg">Detalhes do item</SheetTitle>
            <p className="text-xs text-muted-foreground">Visualize as informações e edite o que precisar.</p>
          </SheetHeader>
          <div className="mx-auto max-w-3xl space-y-4 py-4">
            {editingItem && (
              <div className="relative aspect-[16/7] min-h-52 overflow-hidden rounded-xl border border-border bg-gradient-to-br from-primary/15 via-secondary to-accent/10">
                {editingItem.imagem_url ? (
                  <img src={editingItem.imagem_url} alt={editingItem.nome} className="h-full w-full object-contain" />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center text-primary/35">
                    <Package className="h-16 w-16" strokeWidth={1.25} />
                    <span className="mt-2 text-[10px] font-semibold uppercase tracking-[0.18em]">Sem imagem</span>
                  </div>
                )}
                <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 bg-gradient-to-t from-black/80 to-transparent p-4 text-white">
                  <div className="min-w-0">
                    <Badge className="mb-2 border-white/25 bg-white/90 text-[9px] text-foreground hover:bg-white">{editingItem.categoria}</Badge>
                    <h3 className="truncate font-display text-lg font-bold">{editingItem.nome}</h3>
                    <p className="text-[10px] text-white/75">{editingItem.fornecedor || "Sem fornecedor"}</p>
                  </div>
                  {editingItem.compra_url && (
                    <Button asChild size="sm" className="flex-shrink-0 bg-white text-foreground hover:bg-white/90">
                      <a href={editingItem.compra_url} target="_blank" rel="noreferrer">
                        <ShoppingCart className="mr-1.5 h-3.5 w-3.5" /> Comprar / repor <ExternalLink className="ml-1.5 h-3 w-3" />
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            )}
            <div className="rounded-xl border border-border bg-card p-3 sm:p-4 space-y-3">
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
            {editingItem && (
              <EstoqueDocumentosManager itemId={editingItem.id} onChange={fetchAll} />
            )}
          </div>
          <SheetFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditingItem(null)} className="flex-1">Fechar</Button>
            <Button onClick={handleSaveEdit} className="flex-1"><Check className="mr-1.5 h-3.5 w-3.5" /> Salvar alterações</Button>
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
            <div className="space-y-1.5"><Label className="text-xs">Nome</Label><Input value={packForm.nome} onChange={e => setPackForm(p => ({ ...p, nome: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label className="text-xs">Descrição</Label><Input value={packForm.descricao} onChange={e => setPackForm(p => ({ ...p, descricao: e.target.value }))} /></div>
            <PackItemsEditor />
          </div>
          <SheetFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditingPack(null)} className="flex-1">Cancelar</Button>
            <Button onClick={handleSavePack} className="flex-1">Salvar</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
