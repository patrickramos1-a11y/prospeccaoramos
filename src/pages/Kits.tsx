import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import {
  Gift, Plus, Package, CheckCircle, AlertCircle, Layers, Trash2, X,
  Pencil, ChevronDown, ChevronUp
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
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
import { toast } from "@/hooks/use-toast";

interface EstoqueItem {
  id: string;
  nome: string;
  custo_unitario: number;
}

interface PackItem {
  id: string;
  nome: string;
  item_id: string;
  quantidade: number;
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

export default function Kits() {
  const [kits, setKits] = useState<Kit[]>([]);
  const [kitItens, setKitItens] = useState<KitItemDB[]>([]);
  const [estoqueItens, setEstoqueItens] = useState<EstoqueItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Sheets
  const [showNewKit, setShowNewKit] = useState(false);
  const [showMontarLote, setShowMontarLote] = useState(false);
  const [showAddItem, setShowAddItem] = useState(false);
  const [editingKit, setEditingKit] = useState<Kit | null>(null);

  // Targets
  const [selectedKitId, setSelectedKitId] = useState<string | null>(null);
  const [addItemKitId, setAddItemKitId] = useState<string | null>(null);

  // New kit form
  const [newKit, setNewKit] = useState({ nome: "", tipo: "", descricao: "" });
  const [newKitItens, setNewKitItens] = useState<{ item_id: string; quantidade: number }[]>([]);
  const [newItemId, setNewItemId] = useState("");
  const [newItemQtd, setNewItemQtd] = useState(1);

  // Add item to existing kit
  const [addItemId, setAddItemId] = useState("");
  const [addItemQtd, setAddItemQtd] = useState(1);

  // Montar lote
  const [loteQtd, setLoteQtd] = useState(10);

  // Edit kit form
  const [editForm, setEditForm] = useState({ nome: "", tipo: "", descricao: "" });

  // Expanded kit on mobile
  const [expandedKitId, setExpandedKitId] = useState<string | null>(null);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    const [kitsRes, kitItensRes, estoqueRes] = await Promise.all([
      supabase.from("kits").select("*").order("nome"),
      supabase.from("kit_itens").select("*"),
      supabase.from("estoque_itens").select("id, nome, custo_unitario").order("nome"),
    ]);
    if (kitsRes.data) setKits(kitsRes.data);
    if (kitItensRes.data) setKitItens(kitItensRes.data);
    if (estoqueRes.data) setEstoqueItens(estoqueRes.data);
    setLoading(false);
  };

  const getItemName = (id: string) => estoqueItens.find(e => e.id === id)?.nome || "—";
  const getItemCusto = (id: string) => estoqueItens.find(e => e.id === id)?.custo_unitario || 0;

  const getKitItens = (kitId: string) => kitItens.filter(ki => ki.kit_id === kitId);

  const calcCusto = (items: { item_id: string; quantidade: number }[]) =>
    items.reduce((sum, ki) => sum + getItemCusto(ki.item_id) * ki.quantidade, 0);

  // ---- Handlers ----
  const handleCreateKit = async () => {
    if (!newKit.nome.trim() || !newKit.tipo.trim()) {
      toast({ title: "Preencha nome e tipo do kit", variant: "destructive" });
      return;
    }
    if (newKitItens.length === 0) {
      toast({ title: "Adicione pelo menos um item", variant: "destructive" });
      return;
    }
    const { data, error } = await supabase.from("kits").insert({
      nome: newKit.nome, tipo: newKit.tipo, descricao: newKit.descricao || null,
    }).select().single();
    if (error || !data) {
      toast({ title: "Erro ao criar kit", description: error?.message, variant: "destructive" });
      return;
    }
    const kitItensInsert = newKitItens.map(ki => ({
      kit_id: data.id, item_id: ki.item_id, quantidade: ki.quantidade,
    }));
    await supabase.from("kit_itens").insert(kitItensInsert);
    setNewKit({ nome: "", tipo: "", descricao: "" });
    setNewKitItens([]);
    setShowNewKit(false);
    toast({ title: "Kit criado!", description: `"${data.nome}" adicionado.` });
    fetchAll();
  };

  const handleAddItemToNewKit = () => {
    if (!newItemId) return;
    if (newKitItens.some(i => i.item_id === newItemId)) {
      toast({ title: "Item já adicionado", variant: "destructive" });
      return;
    }
    setNewKitItens(prev => [...prev, { item_id: newItemId, quantidade: newItemQtd }]);
    setNewItemId("");
    setNewItemQtd(1);
  };

  const handleAddItemToExistingKit = async () => {
    if (!addItemId || !addItemKitId) return;
    const existing = kitItens.find(ki => ki.kit_id === addItemKitId && ki.item_id === addItemId);
    if (existing) {
      toast({ title: "Item já existe neste kit", variant: "destructive" });
      return;
    }
    const { error } = await supabase.from("kit_itens").insert({
      kit_id: addItemKitId, item_id: addItemId, quantidade: addItemQtd,
    });
    if (error) {
      toast({ title: "Erro ao adicionar", description: error.message, variant: "destructive" });
      return;
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
      toast({ title: "Erro ao montar lote", variant: "destructive" });
      return;
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
    setEditForm({ nome: kit.nome, tipo: kit.tipo, descricao: kit.descricao || "" });
    setEditingKit(kit);
  };

  const handleSaveEdit = async () => {
    if (!editingKit) return;
    const { error } = await supabase.from("kits").update({
      nome: editForm.nome || editingKit.nome,
      tipo: editForm.tipo || editingKit.tipo,
      descricao: editForm.descricao,
    }).eq("id", editingKit.id);
    if (error) {
      toast({ title: "Erro ao atualizar", variant: "destructive" });
      return;
    }
    setEditingKit(null);
    toast({ title: "Kit atualizado!" });
    fetchAll();
  };

  const totalMontados = kits.reduce((a, k) => a + k.montados, 0);
  const totalDisponiveis = kits.reduce((a, k) => a + k.disponiveis, 0);
  const totalUsados = kits.reduce((a, k) => a + k.usados, 0);

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
        <h1 className="font-display text-xl font-bold">Kits e Montagem</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Modelos de kits — monte independente do estoque</p>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        <Button
          variant="outline" size="sm" className="flex-1 text-xs"
          onClick={() => { setSelectedKitId(kits[0]?.id ?? null); setShowMontarLote(true); }}
          disabled={kits.length === 0}
        >
          <Layers className="w-3.5 h-3.5 mr-1" /> Montar Lote
        </Button>
        <Button size="sm" className="flex-1 text-xs" onClick={() => setShowNewKit(true)}>
          <Plus className="w-3.5 h-3.5 mr-1" /> Novo Kit
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-2">
        {[
          { label: "Modelos", value: kits.length, icon: Gift, color: "text-primary bg-primary/10" },
          { label: "Montados", value: totalMontados, icon: Package, color: "text-accent-foreground bg-accent/10" },
          { label: "Disponíveis", value: totalDisponiveis, icon: CheckCircle, color: "text-status-visited bg-status-visited/10" },
          { label: "Utilizados", value: totalUsados, icon: Layers, color: "text-status-planned bg-status-planned/10" },
        ].map((stat) => (
          <div key={stat.label} className="flex items-center gap-2.5 p-3 rounded-xl border border-border bg-card">
            <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0", stat.color)}>
              <stat.icon className="w-4 h-4" />
            </div>
            <div>
              <p className="font-display font-bold text-lg text-foreground leading-none">{stat.value}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Kit cards */}
      <div className="space-y-3">
        {kits.map((kit) => {
          const items = getKitItens(kit.id);
          const custoEstimado = calcCusto(items);
          const usoPct = kit.montados > 0 ? Math.round((kit.usados / kit.montados) * 100) : 0;
          const dispPct = kit.montados > 0 ? Math.round((kit.disponiveis / kit.montados) * 100) : 0;
          const isExpanded = expandedKitId === kit.id;

          return (
            <Card key={kit.id} className="shadow-sm border-border/60 overflow-hidden">
              <button
                className="w-full p-4 flex items-center gap-3 text-left"
                onClick={() => setExpandedKitId(isExpanded ? null : kit.id)}
              >
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Gift className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-display font-semibold text-sm text-foreground truncate">{kit.nome}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{kit.tipo}</p>
                </div>
                <div className="text-right flex-shrink-0 mr-2">
                  <p className="font-display font-bold text-sm text-foreground">R$ {custoEstimado.toFixed(2)}</p>
                  <p className="text-[9px] text-muted-foreground">custo/kit</p>
                </div>
                {isExpanded ? (
                  <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                )}
              </button>

              <div className="px-4 pb-3 flex gap-2">
                <Badge variant="secondary" className="text-[10px] gap-1">
                  <Package className="w-2.5 h-2.5" /> {kit.montados} montados
                </Badge>
                <Badge variant="secondary" className="text-[10px] gap-1">
                  <CheckCircle className="w-2.5 h-2.5" /> {kit.disponiveis} disp.
                </Badge>
                {kit.disponiveis > 0 && kit.disponiveis < 10 && (
                  <Badge variant="destructive" className="text-[10px] gap-1">
                    <AlertCircle className="w-2.5 h-2.5" /> Baixo
                  </Badge>
                )}
              </div>

              {isExpanded && (
                <CardContent className="px-4 pb-4 pt-0 space-y-3 border-t border-border/40">
                  <p className="text-xs text-muted-foreground pt-3">{kit.descricao}</p>

                  {kit.montados > 0 && (
                    <div>
                      <div className="flex items-center justify-between text-[11px] mb-1">
                        <span className="text-muted-foreground">Utilização</span>
                        <span className="font-medium text-foreground">{kit.usados}/{kit.montados}</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden flex">
                        <div className="bg-status-visited rounded-l-full" style={{ width: `${usoPct}%` }} />
                        <div className="bg-status-planned/60" style={{ width: `${dispPct}%` }} />
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
                          <button
                            onClick={(e) => { e.stopPropagation(); handleRemoveItemFromKit(ki.id); }}
                            className="text-destructive/60 hover:text-destructive p-0.5 transition-colors"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <Button size="sm" className="text-xs"
                      onClick={() => { setSelectedKitId(kit.id); setShowMontarLote(true); }}>
                      <Layers className="w-3 h-3 mr-1" /> Montar Lote
                    </Button>
                    <Button variant="outline" size="sm" className="text-xs"
                      onClick={() => { setAddItemKitId(kit.id); setAddItemId(""); setShowAddItem(true); }}>
                      <Plus className="w-3 h-3 mr-1" /> Add Item
                    </Button>
                    <Button variant="outline" size="sm" className="text-xs" onClick={() => openEditKit(kit)}>
                      <Pencil className="w-3 h-3 mr-1" /> Editar
                    </Button>
                    <Button variant="outline" size="sm"
                      className="text-xs text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => handleDeleteKit(kit.id)}>
                      <Trash2 className="w-3 h-3 mr-1" /> Excluir
                    </Button>
                  </div>
                </CardContent>
              )}
            </Card>
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
        <SheetContent side="bottom" className="h-[92vh] overflow-y-auto rounded-t-2xl">
          <SheetHeader className="pb-4">
            <SheetTitle className="font-display text-lg">Novo Modelo de Kit</SheetTitle>
          </SheetHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs">Nome do Kit *</Label>
              <Input placeholder="Ex: Kit Técnico" value={newKit.nome}
                onChange={e => setNewKit(p => ({ ...p, nome: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Tipo / Público-alvo *</Label>
              <Input placeholder="Ex: Técnicos / Protocolo" value={newKit.tipo}
                onChange={e => setNewKit(p => ({ ...p, tipo: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Descrição</Label>
              <Textarea placeholder="Descreva o objetivo deste kit..." value={newKit.descricao}
                onChange={e => setNewKit(p => ({ ...p, descricao: e.target.value }))} rows={2} />
            </div>

            <div className="border border-border rounded-xl p-3 space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Itens do Kit
              </p>
              <p className="text-[10px] text-muted-foreground">
                Selecione itens do estoque — não precisa ter saldo, o kit é um modelo.
              </p>

              <div className="space-y-2">
                <Select value={newItemId} onValueChange={setNewItemId}>
                  <SelectTrigger className="text-xs">
                    <SelectValue placeholder="Selecione um item do estoque" />
                  </SelectTrigger>
                  <SelectContent>
                    {estoqueItens.map(e => (
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
                    <Input type="number" min={1} value={newItemQtd}
                      onChange={e => setNewItemQtd(Math.max(1, Number(e.target.value)))} />
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
                      <span className="text-[10px] text-muted-foreground">
                        R$ {(getItemCusto(i.item_id) * i.quantidade).toFixed(2)}
                      </span>
                      <button onClick={() => setNewKitItens(prev => prev.filter(x => x.item_id !== i.item_id))}
                        className="text-destructive/60 hover:text-destructive">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  <div className="flex justify-between items-center pt-2 border-t border-border/40">
                    <span className="text-xs text-muted-foreground">{newKitItens.length} itens</span>
                    <span className="text-sm font-display font-bold text-foreground">
                      R$ {calcCusto(newKitItens).toFixed(2)} / kit
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic text-center py-4">
                  Nenhum item adicionado ainda
                </p>
              )}
            </div>
          </div>

          <SheetFooter className="pt-4 gap-2">
            <Button variant="outline" onClick={() => setShowNewKit(false)} className="flex-1">Cancelar</Button>
            <Button onClick={handleCreateKit} className="flex-1">
              <Gift className="w-3.5 h-3.5 mr-1" /> Criar Kit
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Sheet: Adicionar Item a Kit Existente */}
      <Sheet open={showAddItem} onOpenChange={setShowAddItem}>
        <SheetContent side="bottom" className="rounded-t-2xl">
          <SheetHeader>
            <SheetTitle className="font-display text-lg">Adicionar Item</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-xs">Item do Estoque</Label>
              <Select value={addItemId} onValueChange={setAddItemId}>
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="Selecione um item" />
                </SelectTrigger>
                <SelectContent>
                  {estoqueItens.map(e => (
                    <SelectItem key={e.id} value={e.id} className="text-xs">
                      {e.nome} — R$ {e.custo_unitario.toFixed(2)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Quantidade por kit</Label>
              <Input type="number" min={1} value={addItemQtd}
                onChange={e => setAddItemQtd(Math.max(1, Number(e.target.value)))} />
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
        <SheetContent side="bottom" className="rounded-t-2xl">
          <SheetHeader>
            <SheetTitle className="font-display text-lg">Montar Lote</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-xs">Kit</Label>
              <Select value={selectedKitId ?? ""} onValueChange={setSelectedKitId}>
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="Selecione o kit" />
                </SelectTrigger>
                <SelectContent>
                  {kits.map(k => (
                    <SelectItem key={k.id} value={k.id} className="text-xs">{k.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Quantidade a montar</Label>
              <Input type="number" min={1} value={loteQtd}
                onChange={e => setLoteQtd(Math.max(1, Number(e.target.value)))} />
            </div>
            {selectedKitId && (
              <div className="bg-muted/50 rounded-lg p-3 space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Custo unitário</span>
                  <span className="text-foreground">
                    R$ {calcCusto(getKitItens(selectedKitId)).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-sm font-bold">
                  <span className="text-muted-foreground">Total do lote</span>
                  <span className="text-foreground font-display">
                    R$ {(calcCusto(getKitItens(selectedKitId)) * loteQtd).toFixed(2)}
                  </span>
                </div>
              </div>
            )}
          </div>
          <SheetFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowMontarLote(false)} className="flex-1">Cancelar</Button>
            <Button onClick={handleMontarLote} className="flex-1">
              <Layers className="w-3.5 h-3.5 mr-1" /> Montar {loteQtd}x
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Sheet: Editar Kit */}
      <Sheet open={!!editingKit} onOpenChange={(open) => !open && setEditingKit(null)}>
        <SheetContent side="bottom" className="rounded-t-2xl">
          <SheetHeader>
            <SheetTitle className="font-display text-lg">Editar Kit</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-xs">Nome</Label>
              <Input value={editForm.nome} onChange={e => setEditForm(p => ({ ...p, nome: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Tipo / Público</Label>
              <Input value={editForm.tipo} onChange={e => setEditForm(p => ({ ...p, tipo: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Descrição</Label>
              <Textarea value={editForm.descricao} onChange={e => setEditForm(p => ({ ...p, descricao: e.target.value }))} rows={2} />
            </div>
          </div>
          <SheetFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditingKit(null)} className="flex-1">Cancelar</Button>
            <Button onClick={handleSaveEdit} className="flex-1">Salvar</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
