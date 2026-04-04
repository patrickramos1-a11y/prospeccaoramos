import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import {
  Package, Plus, Search, AlertCircle, ArrowDown, ArrowUp,
  TrendingDown, Boxes, Pencil, Trash2, X, Check, Layers
} from "lucide-react";
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
}

interface Pack {
  id: string;
  item_id: string;
  nome: string;
  descricao: string | null;
  quantidade: number;
}

const CATEGORIAS = ["Impresso", "Brinde", "Embalagem", "Papelaria"];

export default function Estoque() {
  const [itens, setItens] = useState<EstoqueItem[]>([]);
  const [packs, setPacks] = useState<Pack[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoriaFilter, setCategoriaFilter] = useState("todas");
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
    minimo: 0, ideal: 0, custo_unitario: 0, fornecedor: "",
  });

  // Edit form
  const [editForm, setEditForm] = useState({
    nome: "", categoria: "", unidade: "", saldo_atual: 0,
    minimo: 0, ideal: 0, custo_unitario: 0, fornecedor: "",
  });

  // Pack form
  const [packForm, setPackForm] = useState({
    item_id: "", nome: "", descricao: "", quantidade: 1,
  });

  // Load data
  useEffect(() => {
    fetchItens();
    fetchPacks();
  }, []);

  const fetchItens = async () => {
    const { data, error } = await supabase.from("estoque_itens").select("*").order("nome");
    if (error) {
      toast({ title: "Erro ao carregar itens", description: error.message, variant: "destructive" });
    } else {
      setItens(data || []);
    }
    setLoading(false);
  };

  const fetchPacks = async () => {
    const { data, error } = await supabase.from("packs").select("*").order("nome");
    if (!error) setPacks(data || []);
  };

  const categorias = ["todas", ...Array.from(new Set(itens.map((i) => i.categoria)))];

  const filtered = itens.filter((item) => {
    const matchSearch = item.nome.toLowerCase().includes(search.toLowerCase());
    const matchCat = categoriaFilter === "todas" || item.categoria === categoriaFilter;
    return matchSearch && matchCat;
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

  // CRUD handlers
  const handleCreateItem = async () => {
    if (!newItem.nome.trim() || !newItem.categoria) {
      toast({ title: "Preencha nome e categoria", variant: "destructive" });
      return;
    }
    const { error } = await supabase.from("estoque_itens").insert({
      nome: newItem.nome, categoria: newItem.categoria, unidade: newItem.unidade,
      saldo_atual: newItem.saldo_atual, minimo: newItem.minimo, ideal: newItem.ideal,
      custo_unitario: newItem.custo_unitario, fornecedor: newItem.fornecedor || null,
    });
    if (error) {
      toast({ title: "Erro ao cadastrar", description: error.message, variant: "destructive" });
      return;
    }
    setNewItem({ nome: "", categoria: "", unidade: "unidade", saldo_atual: 0, minimo: 0, ideal: 0, custo_unitario: 0, fornecedor: "" });
    setShowNewItem(false);
    toast({ title: "Item cadastrado!" });
    fetchItens();
  };

  const openEdit = (item: EstoqueItem) => {
    setEditForm({
      nome: item.nome, categoria: item.categoria, unidade: item.unidade,
      saldo_atual: item.saldo_atual, minimo: item.minimo, ideal: item.ideal,
      custo_unitario: item.custo_unitario, fornecedor: item.fornecedor || "",
    });
    setEditingItem(item);
  };

  const handleSaveEdit = async () => {
    if (!editingItem) return;
    const { error } = await supabase.from("estoque_itens").update({
      nome: editForm.nome, categoria: editForm.categoria, unidade: editForm.unidade,
      saldo_atual: editForm.saldo_atual, minimo: editForm.minimo, ideal: editForm.ideal,
      custo_unitario: editForm.custo_unitario, fornecedor: editForm.fornecedor || null,
    }).eq("id", editingItem.id);
    if (error) {
      toast({ title: "Erro ao atualizar", description: error.message, variant: "destructive" });
      return;
    }
    setEditingItem(null);
    toast({ title: "Item atualizado!" });
    fetchItens();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("estoque_itens").delete().eq("id", id);
    if (error) {
      toast({ title: "Erro ao remover", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Item removido do estoque" });
    fetchItens();
    fetchPacks();
  };

  const openEntrada = (id: string) => { setMovItemId(id); setMovQtd(0); setShowEntrada(true); };
  const openSaida = (id: string) => { setMovItemId(id); setMovQtd(0); setShowSaida(true); };

  const handleEntrada = async () => {
    if (!movItemId || movQtd <= 0) return;
    const item = itens.find(i => i.id === movItemId);
    if (!item) return;
    const { error } = await supabase.from("estoque_itens").update({ saldo_atual: item.saldo_atual + movQtd }).eq("id", movItemId);
    if (!error) { setShowEntrada(false); toast({ title: `+${movQtd} unidades registradas` }); fetchItens(); }
  };

  const handleSaida = async () => {
    if (!movItemId || movQtd <= 0) return;
    const item = itens.find(i => i.id === movItemId);
    if (!item) return;
    const { error } = await supabase.from("estoque_itens").update({ saldo_atual: Math.max(0, item.saldo_atual - movQtd) }).eq("id", movItemId);
    if (!error) { setShowSaida(false); toast({ title: `-${movQtd} unidades registradas` }); fetchItens(); }
  };

  // Pack CRUD
  const handleCreatePack = async () => {
    if (!packForm.item_id || !packForm.nome.trim() || packForm.quantidade < 1) {
      toast({ title: "Preencha todos os campos do pack", variant: "destructive" });
      return;
    }
    const { error } = await supabase.from("packs").insert({
      item_id: packForm.item_id, nome: packForm.nome,
      descricao: packForm.descricao || null, quantidade: packForm.quantidade,
    });
    if (error) {
      toast({ title: "Erro ao criar pack", description: error.message, variant: "destructive" });
      return;
    }
    setPackForm({ item_id: "", nome: "", descricao: "", quantidade: 1 });
    setShowNewPack(false);
    toast({ title: "Pack criado!" });
    fetchPacks();
  };

  const handleSavePack = async () => {
    if (!editingPack) return;
    const { error } = await supabase.from("packs").update({
      nome: packForm.nome, descricao: packForm.descricao || null,
      quantidade: packForm.quantidade, item_id: packForm.item_id,
    }).eq("id", editingPack.id);
    if (!error) { setEditingPack(null); toast({ title: "Pack atualizado!" }); fetchPacks(); }
  };

  const handleDeletePack = async (id: string) => {
    const { error } = await supabase.from("packs").delete().eq("id", id);
    if (!error) { toast({ title: "Pack removido" }); fetchPacks(); }
  };

  const openEditPack = (pack: Pack) => {
    setPackForm({ item_id: pack.item_id, nome: pack.nome, descricao: pack.descricao || "", quantidade: pack.quantidade });
    setEditingPack(pack);
  };

  const movItem = itens.find(i => i.id === movItemId);
  const getItemName = (id: string) => itens.find(i => i.id === id)?.nome || "—";

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 animate-fade-in pb-24">
      <div>
        <h1 className="font-display text-xl font-bold">Estoque de Materiais</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Brindes, papelaria, embalagens e packs</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted p-1 rounded-lg">
        <button
          className={cn("flex-1 text-xs font-medium py-2 rounded-md transition-colors", activeTab === "itens" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground")}
          onClick={() => setActiveTab("itens")}
        >
          <Package className="w-3.5 h-3.5 inline mr-1" /> Itens ({itens.length})
        </button>
        <button
          className={cn("flex-1 text-xs font-medium py-2 rounded-md transition-colors", activeTab === "packs" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground")}
          onClick={() => setActiveTab("packs")}
        >
          <Layers className="w-3.5 h-3.5 inline mr-1" /> Packs ({packs.length})
        </button>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
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
          <Button size="sm" className="flex-1 text-xs" onClick={() => { setPackForm({ item_id: "", nome: "", descricao: "", quantidade: 1 }); setShowNewPack(true); }}>
            <Plus className="w-3.5 h-3.5 mr-1" /> Novo Pack
          </Button>
        )}
      </div>

      {/* KPIs */}
      {activeTab === "itens" && (
        <div className="grid grid-cols-3 gap-2">
          <div className="flex items-center gap-2 p-2.5 rounded-xl border border-border bg-card">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Boxes className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="font-bold text-lg text-foreground leading-none">{totalItens}</p>
              <p className="text-[9px] text-muted-foreground mt-0.5">Tipos</p>
            </div>
          </div>
          <div className={cn("flex items-center gap-2 p-2.5 rounded-xl border bg-card", alertaCount > 0 ? "border-destructive/30" : "border-border")}>
            <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", alertaCount > 0 ? "bg-destructive/10" : "bg-muted")}>
              <AlertCircle className={cn("w-4 h-4", alertaCount > 0 ? "text-destructive" : "text-muted-foreground")} />
            </div>
            <div>
              <p className={cn("font-bold text-lg leading-none", alertaCount > 0 ? "text-destructive" : "text-foreground")}>{alertaCount}</p>
              <p className="text-[9px] text-muted-foreground mt-0.5">Alertas</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2.5 rounded-xl border border-border bg-card">
            <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
              <TrendingDown className="w-4 h-4 text-accent-foreground" />
            </div>
            <div>
              <p className="font-bold text-base text-foreground leading-none">R${valorTotal.toFixed(0)}</p>
              <p className="text-[9px] text-muted-foreground mt-0.5">Valor</p>
            </div>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input placeholder={activeTab === "itens" ? "Buscar item..." : "Buscar pack..."} value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9 text-xs" />
        </div>
        {activeTab === "itens" && (
          <Select value={categoriaFilter} onValueChange={setCategoriaFilter}>
            <SelectTrigger className="h-9 text-xs w-28"><SelectValue /></SelectTrigger>
            <SelectContent>
              {categorias.map((c) => (<SelectItem key={c} value={c} className="text-xs capitalize">{c === "todas" ? "Todas" : c}</SelectItem>))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* ITENS LIST */}
      {activeTab === "itens" && (
        <div className="space-y-2">
          {filtered.map((item) => {
            const st = getEstoqueStatus(item);
            const pct = item.ideal > 0 ? Math.min((item.saldo_atual / item.ideal) * 100, 100) : 0;
            const itemPacks = packs.filter(p => p.item_id === item.id);
            return (
              <Card key={item.id} className="shadow-sm border-border/60">
                <CardContent className="p-3">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Package className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-medium text-sm text-foreground truncate">{item.nome}</p>
                          <p className="text-[10px] text-muted-foreground">{item.fornecedor || "Sem fornecedor"}</p>
                        </div>
                        <Badge className={cn("text-[9px] flex-shrink-0 font-semibold", st.color)} variant="secondary">{st.label}</Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-2">
                        <div className="flex-1">
                          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                            <div className={cn("h-full rounded-full", st.barColor)} style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                        <span className="text-xs font-bold text-foreground">{item.saldo_atual}</span>
                        <span className="text-[10px] text-muted-foreground">/ {item.ideal}</span>
                      </div>
                      {/* Packs badges */}
                      {itemPacks.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {itemPacks.map(p => (
                            <Badge key={p.id} variant="outline" className="text-[9px] px-1.5 bg-primary/5">
                              <Layers className="w-2.5 h-2.5 mr-0.5" /> {p.nome} (×{p.quantidade})
                            </Badge>
                          ))}
                        </div>
                      )}
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex gap-1">
                          <Badge variant="outline" className="text-[9px] px-1.5">{item.categoria}</Badge>
                          <span className="text-[10px] text-muted-foreground">R$ {item.custo_unitario.toFixed(2)}/{item.unidade}</span>
                        </div>
                        <div className="flex gap-0.5">
                          <button onClick={() => openEntrada(item.id)} className="p-1.5 hover:bg-muted rounded-lg transition-colors text-status-visited" title="Entrada">
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => openSaida(item.id)} className="p-1.5 hover:bg-muted rounded-lg transition-colors text-accent-foreground" title="Saída">
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => openEdit(item)} className="p-1.5 hover:bg-muted rounded-lg transition-colors text-muted-foreground" title="Editar">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleDelete(item.id)} className="p-1.5 hover:bg-destructive/10 rounded-lg transition-colors text-destructive/60" title="Excluir">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
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
            <Card key={pack.id} className="shadow-sm border-border/60">
              <CardContent className="p-3">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Layers className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium text-sm text-foreground truncate">{pack.nome}</p>
                        <p className="text-[10px] text-muted-foreground">{getItemName(pack.item_id)}</p>
                      </div>
                      <Badge variant="secondary" className="text-[10px] font-bold">×{pack.quantidade}</Badge>
                    </div>
                    {pack.descricao && <p className="text-[11px] text-muted-foreground mt-1">{pack.descricao}</p>}
                    <div className="flex items-center justify-end gap-0.5 mt-2">
                      <button onClick={() => openEditPack(pack)} className="p-1.5 hover:bg-muted rounded-lg transition-colors text-muted-foreground">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDeletePack(pack.id)} className="p-1.5 hover:bg-destructive/10 rounded-lg transition-colors text-destructive/60">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
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
              <p className="text-xs mt-1">Packs são conjuntos de itens, ex: "Pack 10 Cartões"</p>
              <Button size="sm" variant="outline" className="mt-3" onClick={() => { setPackForm({ item_id: "", nome: "", descricao: "", quantidade: 1 }); setShowNewPack(true); }}>
                <Plus className="w-3.5 h-3.5 mr-1" /> Criar primeiro pack
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Sheet: Novo Item */}
      <Sheet open={showNewItem} onOpenChange={setShowNewItem}>
        <SheetContent side="bottom" className="h-[85vh] overflow-y-auto rounded-t-2xl">
          <SheetHeader><SheetTitle className="font-display text-lg">Cadastrar Novo Item</SheetTitle></SheetHeader>
          <div className="space-y-3 py-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Nome do item *</Label>
              <Input placeholder="Ex: Caneta Personalizada" value={newItem.nome} onChange={e => setNewItem(p => ({ ...p, nome: e.target.value }))} />
            </div>
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
              <div className="space-y-1.5">
                <Label className="text-xs">Saldo atual</Label>
                <Input type="number" min={0} value={newItem.saldo_atual} onChange={e => setNewItem(p => ({ ...p, saldo_atual: Number(e.target.value) }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Mínimo</Label>
                <Input type="number" min={0} value={newItem.minimo} onChange={e => setNewItem(p => ({ ...p, minimo: Number(e.target.value) }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Ideal</Label>
                <Input type="number" min={0} value={newItem.ideal} onChange={e => setNewItem(p => ({ ...p, ideal: Number(e.target.value) }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Custo unitário (R$)</Label>
                <Input type="number" min={0} step={0.01} value={newItem.custo_unitario} onChange={e => setNewItem(p => ({ ...p, custo_unitario: Number(e.target.value) }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Fornecedor</Label>
                <Input placeholder="Ex: Gráfica Central" value={newItem.fornecedor} onChange={e => setNewItem(p => ({ ...p, fornecedor: e.target.value }))} />
              </div>
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
        <SheetContent side="bottom" className="h-[85vh] overflow-y-auto rounded-t-2xl">
          <SheetHeader><SheetTitle className="font-display text-lg">Editar Item</SheetTitle></SheetHeader>
          <div className="space-y-3 py-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Nome</Label>
              <Input value={editForm.nome} onChange={e => setEditForm(p => ({ ...p, nome: e.target.value }))} />
            </div>
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
              <div className="space-y-1.5">
                <Label className="text-xs">Saldo</Label>
                <Input type="number" min={0} value={editForm.saldo_atual} onChange={e => setEditForm(p => ({ ...p, saldo_atual: Number(e.target.value) }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Mínimo</Label>
                <Input type="number" min={0} value={editForm.minimo} onChange={e => setEditForm(p => ({ ...p, minimo: Number(e.target.value) }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Ideal</Label>
                <Input type="number" min={0} value={editForm.ideal} onChange={e => setEditForm(p => ({ ...p, ideal: Number(e.target.value) }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Custo unit. (R$)</Label>
                <Input type="number" min={0} step={0.01} value={editForm.custo_unitario} onChange={e => setEditForm(p => ({ ...p, custo_unitario: Number(e.target.value) }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Fornecedor</Label>
                <Input value={editForm.fornecedor} onChange={e => setEditForm(p => ({ ...p, fornecedor: e.target.value }))} />
              </div>
            </div>
          </div>
          <SheetFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditingItem(null)} className="flex-1">Cancelar</Button>
            <Button onClick={handleSaveEdit} className="flex-1">Salvar</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Sheet: Entrada */}
      <Sheet open={showEntrada} onOpenChange={setShowEntrada}>
        <SheetContent side="bottom" className="rounded-t-2xl">
          <SheetHeader><SheetTitle className="font-display text-lg">Registrar Entrada</SheetTitle></SheetHeader>
          <div className="space-y-4 py-4">
            {activeTab === "itens" && itens.length > 1 && (
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
        <SheetContent side="bottom" className="rounded-t-2xl">
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
        <SheetContent side="bottom" className="h-[75vh] overflow-y-auto rounded-t-2xl">
          <SheetHeader><SheetTitle className="font-display text-lg">Criar Novo Pack</SheetTitle></SheetHeader>
          <div className="space-y-3 py-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Nome do pack *</Label>
              <Input placeholder="Ex: Pack 10 Cartões" value={packForm.nome} onChange={e => setPackForm(p => ({ ...p, nome: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Item vinculado *</Label>
              <Select value={packForm.item_id} onValueChange={v => setPackForm(p => ({ ...p, item_id: v }))}>
                <SelectTrigger className="text-xs"><SelectValue placeholder="Selecione um item do estoque" /></SelectTrigger>
                <SelectContent>{itens.map(i => (<SelectItem key={i.id} value={i.id} className="text-xs">{i.nome}</SelectItem>))}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Quantidade no pack *</Label>
              <Input type="number" min={1} value={packForm.quantidade} onChange={e => setPackForm(p => ({ ...p, quantidade: Math.max(1, Number(e.target.value)) }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Descrição</Label>
              <Input placeholder="Ex: Conjunto de 10 cartões para visita" value={packForm.descricao} onChange={e => setPackForm(p => ({ ...p, descricao: e.target.value }))} />
            </div>
          </div>
          <SheetFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowNewPack(false)} className="flex-1">Cancelar</Button>
            <Button onClick={handleCreatePack} className="flex-1"><Check className="w-3.5 h-3.5 mr-1" /> Criar Pack</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Sheet: Editar Pack */}
      <Sheet open={!!editingPack} onOpenChange={(open) => !open && setEditingPack(null)}>
        <SheetContent side="bottom" className="h-[75vh] overflow-y-auto rounded-t-2xl">
          <SheetHeader><SheetTitle className="font-display text-lg">Editar Pack</SheetTitle></SheetHeader>
          <div className="space-y-3 py-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Nome</Label>
              <Input value={packForm.nome} onChange={e => setPackForm(p => ({ ...p, nome: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Item vinculado</Label>
              <Select value={packForm.item_id} onValueChange={v => setPackForm(p => ({ ...p, item_id: v }))}>
                <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>{itens.map(i => (<SelectItem key={i.id} value={i.id} className="text-xs">{i.nome}</SelectItem>))}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Quantidade</Label>
              <Input type="number" min={1} value={packForm.quantidade} onChange={e => setPackForm(p => ({ ...p, quantidade: Math.max(1, Number(e.target.value)) }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Descrição</Label>
              <Input value={packForm.descricao} onChange={e => setPackForm(p => ({ ...p, descricao: e.target.value }))} />
            </div>
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
