import { useState } from "react";
import { ESTOQUE_ITENS } from "@/data/mockData";
import { cn } from "@/lib/utils";
import {
  Gift, Plus, Package, CheckCircle, AlertCircle, Layers, Trash2, X,
  Pencil, ChevronDown, ChevronUp, Eye
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
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

interface KitItem {
  item: string;
  qtd: number;
}

interface Kit {
  id: number;
  nome: string;
  tipo: string;
  descricao: string;
  ativo: boolean;
  itens: KitItem[];
  custoEstimado: number;
  montados: number;
  disponiveis: number;
  usados: number;
}

const INITIAL_KITS: Kit[] = [
  {
    id: 1, nome: "Kit Operacional", tipo: "Técnicos / Protocolo",
    descricao: "Saquinho fino com itens úteis para entrega a técnicos e atendentes de protocolo",
    ativo: true,
    itens: [
      { item: "Cartão de Visita Ramos", qtd: 2 }, { item: "Caneta Personalizada", qtd: 1 },
      { item: "Régua 30cm", qtd: 1 }, { item: "Chiclete Trident", qtd: 1 },
      { item: "Imã Geladeira", qtd: 2 }, { item: "Saquinho Zip", qtd: 1 },
    ],
    custoEstimado: 7.25, montados: 50, disponiveis: 22, usados: 26,
  },
  {
    id: 2, nome: "Kit Institucional", tipo: "Secretário / Gestor",
    descricao: "Caixa estruturada de apresentação para o secretário municipal",
    ativo: true,
    itens: [
      { item: "Cartão de Visita Ramos", qtd: 5 }, { item: "Folder Institucional A4", qtd: 2 },
      { item: "Caneta Personalizada", qtd: 2 }, { item: "Bloco Personalizado", qtd: 1 },
      { item: "Caixa Institucional", qtd: 1 },
    ],
    custoEstimado: 24.80, montados: 20, disponiveis: 8, usados: 12,
  },
];

export default function Kits() {
  const [kits, setKits] = useState<Kit[]>(INITIAL_KITS);

  // Dialogs / Sheets
  const [showNewKit, setShowNewKit] = useState(false);
  const [showMontarLote, setShowMontarLote] = useState(false);
  const [showAddItem, setShowAddItem] = useState(false);
  const [editingKit, setEditingKit] = useState<Kit | null>(null);
  const [viewingKit, setViewingKit] = useState<Kit | null>(null);

  // Targets
  const [selectedKitId, setSelectedKitId] = useState<number | null>(null);
  const [addItemKitId, setAddItemKitId] = useState<number | null>(null);

  // New kit form
  const [newKit, setNewKit] = useState({ nome: "", tipo: "", descricao: "" });
  const [newKitItens, setNewKitItens] = useState<KitItem[]>([]);
  const [newItemName, setNewItemName] = useState("");
  const [newItemQtd, setNewItemQtd] = useState(1);

  // Add item to existing kit
  const [addItemName, setAddItemName] = useState("");
  const [addItemQtd, setAddItemQtd] = useState(1);

  // Montar lote
  const [loteQtd, setLoteQtd] = useState(10);

  // Edit kit form
  const [editForm, setEditForm] = useState({ nome: "", tipo: "", descricao: "" });

  // Expanded kit on mobile
  const [expandedKitId, setExpandedKitId] = useState<number | null>(null);

  const calcCusto = (itens: KitItem[]) => {
    return itens.reduce((sum, ki) => {
      const estoqueItem = ESTOQUE_ITENS.find(e => e.nome === ki.item);
      return sum + (estoqueItem ? estoqueItem.custoUnitario * ki.qtd : 0);
    }, 0);
  };

  // ---- Handlers ----
  const handleCreateKit = () => {
    if (!newKit.nome.trim() || !newKit.tipo.trim()) {
      toast({ title: "Preencha nome e tipo do kit", variant: "destructive" });
      return;
    }
    if (newKitItens.length === 0) {
      toast({ title: "Adicione pelo menos um item", variant: "destructive" });
      return;
    }
    const kit: Kit = {
      id: Date.now(), nome: newKit.nome, tipo: newKit.tipo, descricao: newKit.descricao,
      ativo: true, itens: newKitItens, custoEstimado: calcCusto(newKitItens),
      montados: 0, disponiveis: 0, usados: 0,
    };
    setKits(prev => [...prev, kit]);
    setNewKit({ nome: "", tipo: "", descricao: "" });
    setNewKitItens([]);
    setShowNewKit(false);
    toast({ title: "Kit criado!", description: `"${kit.nome}" adicionado.` });
  };

  const handleAddItemToNewKit = () => {
    if (!newItemName) return;
    if (newKitItens.some(i => i.item === newItemName)) {
      toast({ title: "Item já adicionado", variant: "destructive" });
      return;
    }
    setNewKitItens(prev => [...prev, { item: newItemName, qtd: newItemQtd }]);
    setNewItemName("");
    setNewItemQtd(1);
  };

  const handleAddItemToExistingKit = () => {
    if (!addItemName || addItemKitId === null) return;
    let alreadyExists = false;
    setKits(prev => prev.map(k => {
      if (k.id !== addItemKitId) return k;
      if (k.itens.some(i => i.item === addItemName)) {
        alreadyExists = true;
        return k;
      }
      const updatedItens = [...k.itens, { item: addItemName, qtd: addItemQtd }];
      return { ...k, itens: updatedItens, custoEstimado: calcCusto(updatedItens) };
    }));
    if (alreadyExists) {
      toast({ title: "Item já existe neste kit", variant: "destructive" });
      return;
    }
    setAddItemName("");
    setAddItemQtd(1);
    setShowAddItem(false);
    toast({ title: "Item adicionado ao kit!" });
  };

  const handleRemoveItemFromKit = (kitId: number, itemName: string) => {
    setKits(prev => prev.map(k => {
      if (k.id !== kitId) return k;
      const updatedItens = k.itens.filter(i => i.item !== itemName);
      return { ...k, itens: updatedItens, custoEstimado: calcCusto(updatedItens) };
    }));
    toast({ title: "Item removido" });
  };

  const handleMontarLote = () => {
    if (selectedKitId === null || loteQtd <= 0) return;
    const kit = kits.find(k => k.id === selectedKitId);
    setKits(prev => prev.map(k => {
      if (k.id !== selectedKitId) return k;
      return { ...k, montados: k.montados + loteQtd, disponiveis: k.disponiveis + loteQtd };
    }));
    setShowMontarLote(false);
    setLoteQtd(10);
    toast({ title: "Lote montado!", description: `${loteQtd}x "${kit?.nome}"` });
  };

  const handleDeleteKit = (kitId: number) => {
    setKits(prev => prev.filter(k => k.id !== kitId));
    toast({ title: "Kit removido" });
  };

  const openEditKit = (kit: Kit) => {
    setEditForm({ nome: kit.nome, tipo: kit.tipo, descricao: kit.descricao });
    setEditingKit(kit);
  };

  const handleSaveEdit = () => {
    if (!editingKit) return;
    setKits(prev => prev.map(k => {
      if (k.id !== editingKit.id) return k;
      return { ...k, nome: editForm.nome || k.nome, tipo: editForm.tipo || k.tipo, descricao: editForm.descricao };
    }));
    setEditingKit(null);
    toast({ title: "Kit atualizado!" });
  };

  const totalMontados = kits.reduce((a, k) => a + k.montados, 0);
  const totalDisponiveis = kits.reduce((a, k) => a + k.disponiveis, 0);
  const totalUsados = kits.reduce((a, k) => a + k.usados, 0);

  return (
    <div className="p-4 space-y-4 animate-fade-in pb-24">
      {/* Header mobile-friendly */}
      <div>
        <h1 className="font-display text-xl font-bold">Kits e Montagem</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Modelos, composição e controle</p>
      </div>

      {/* Action buttons - stacked on mobile */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 text-xs"
          onClick={() => { setSelectedKitId(kits[0]?.id ?? null); setShowMontarLote(true); }}
          disabled={kits.length === 0}
        >
          <Layers className="w-3.5 h-3.5 mr-1" /> Montar Lote
        </Button>
        <Button size="sm" className="flex-1 text-xs" onClick={() => setShowNewKit(true)}>
          <Plus className="w-3.5 h-3.5 mr-1" /> Novo Kit
        </Button>
      </div>

      {/* KPIs - 2x2 grid for mobile */}
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

      {/* Kit cards - mobile optimized */}
      <div className="space-y-3">
        {kits.map((kit) => {
          const usoPct = kit.montados > 0 ? Math.round((kit.usados / kit.montados) * 100) : 0;
          const dispPct = kit.montados > 0 ? Math.round((kit.disponiveis / kit.montados) * 100) : 0;
          const isExpanded = expandedKitId === kit.id;

          return (
            <Card key={kit.id} className="shadow-sm border-border/60 overflow-hidden">
              {/* Card header - tappable */}
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
                  <p className="font-display font-bold text-sm text-foreground">R$ {kit.custoEstimado.toFixed(2)}</p>
                  <p className="text-[9px] text-muted-foreground">custo/kit</p>
                </div>
                {isExpanded ? (
                  <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                )}
              </button>

              {/* Quick stats always visible */}
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

              {/* Expanded content */}
              {isExpanded && (
                <CardContent className="px-4 pb-4 pt-0 space-y-3 border-t border-border/40">
                  <p className="text-xs text-muted-foreground pt-3">{kit.descricao}</p>

                  {/* Progress bar */}
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

                  {/* Items list */}
                  <div>
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      Composição ({kit.itens.length} itens)
                    </p>
                    <div className="space-y-1.5">
                      {kit.itens.map((item) => (
                        <div key={item.item} className="flex items-center gap-2 text-xs bg-muted/40 rounded-lg px-2.5 py-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-primary/50 flex-shrink-0" />
                          <span className="flex-1 text-foreground truncate">{item.item}</span>
                          <span className="font-semibold text-muted-foreground text-[11px]">×{item.qtd}</span>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleRemoveItemFromKit(kit.id, item.item); }}
                            className="text-destructive/60 hover:text-destructive p-0.5 transition-colors"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Action buttons - vertical on mobile */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <Button
                      size="sm"
                      className="text-xs"
                      onClick={() => { setSelectedKitId(kit.id); setShowMontarLote(true); }}
                    >
                      <Layers className="w-3 h-3 mr-1" /> Montar Lote
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() => { setAddItemKitId(kit.id); setAddItemName(""); setShowAddItem(true); }}
                    >
                      <Plus className="w-3 h-3 mr-1" /> Add Item
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() => openEditKit(kit)}
                    >
                      <Pencil className="w-3 h-3 mr-1" /> Editar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => handleDeleteKit(kit.id)}
                    >
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

      {/* Sheet: Novo Kit (full screen on mobile) */}
      <Sheet open={showNewKit} onOpenChange={setShowNewKit}>
        <SheetContent side="bottom" className="h-[92vh] overflow-y-auto rounded-t-2xl">
          <SheetHeader className="pb-4">
            <SheetTitle className="font-display text-lg">Novo Modelo de Kit</SheetTitle>
          </SheetHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs">Nome do Kit *</Label>
              <Input
                placeholder="Ex: Kit Técnico"
                value={newKit.nome}
                onChange={e => setNewKit(p => ({ ...p, nome: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Tipo / Público-alvo *</Label>
              <Input
                placeholder="Ex: Técnicos / Protocolo"
                value={newKit.tipo}
                onChange={e => setNewKit(p => ({ ...p, tipo: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Descrição</Label>
              <Textarea
                placeholder="Descreva o objetivo deste kit..."
                value={newKit.descricao}
                onChange={e => setNewKit(p => ({ ...p, descricao: e.target.value }))}
                rows={2}
              />
            </div>

            {/* Add items section */}
            <div className="border border-border rounded-xl p-3 space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Itens do Kit
              </p>

              <div className="space-y-2">
                <Select value={newItemName} onValueChange={setNewItemName}>
                  <SelectTrigger className="text-xs">
                    <SelectValue placeholder="Selecione um item do estoque" />
                  </SelectTrigger>
                  <SelectContent>
                    {ESTOQUE_ITENS.map(e => (
                      <SelectItem key={e.id} value={e.nome} className="text-xs">
                        <span>{e.nome}</span>
                        <span className="text-muted-foreground ml-2">R$ {e.custoUnitario.toFixed(2)}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="flex gap-2">
                  <div className="flex-1">
                    <Label className="text-[10px] text-muted-foreground">Qtd por kit</Label>
                    <Input
                      type="number"
                      min={1}
                      value={newItemQtd}
                      onChange={e => setNewItemQtd(Math.max(1, Number(e.target.value)))}
                    />
                  </div>
                  <div className="flex items-end">
                    <Button
                      onClick={handleAddItemToNewKit}
                      disabled={!newItemName}
                      size="sm"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" /> Adicionar
                    </Button>
                  </div>
                </div>
              </div>

              {newKitItens.length > 0 ? (
                <div className="space-y-1.5">
                  {newKitItens.map(i => {
                    const estoqueItem = ESTOQUE_ITENS.find(e => e.nome === i.item);
                    return (
                      <div key={i.item} className="flex items-center gap-2 text-xs bg-muted/50 p-2.5 rounded-lg">
                        <Package className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                        <span className="flex-1 truncate">{i.item}</span>
                        <span className="font-semibold text-muted-foreground">×{i.qtd}</span>
                        {estoqueItem && (
                          <span className="text-[10px] text-muted-foreground">
                            R$ {(estoqueItem.custoUnitario * i.qtd).toFixed(2)}
                          </span>
                        )}
                        <button
                          onClick={() => setNewKitItens(prev => prev.filter(x => x.item !== i.item))}
                          className="text-destructive/60 hover:text-destructive"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })}
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
            <Button variant="outline" onClick={() => setShowNewKit(false)} className="flex-1">
              Cancelar
            </Button>
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
              <Select value={addItemName} onValueChange={setAddItemName}>
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="Selecione um item" />
                </SelectTrigger>
                <SelectContent>
                  {ESTOQUE_ITENS.map(e => (
                    <SelectItem key={e.id} value={e.nome} className="text-xs">
                      {e.nome} — R$ {e.custoUnitario.toFixed(2)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Quantidade por kit</Label>
              <Input
                type="number"
                min={1}
                value={addItemQtd}
                onChange={e => setAddItemQtd(Math.max(1, Number(e.target.value)))}
              />
            </div>
          </div>
          <SheetFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowAddItem(false)} className="flex-1">
              Cancelar
            </Button>
            <Button onClick={handleAddItemToExistingKit} disabled={!addItemName} className="flex-1">
              Adicionar
            </Button>
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
              <Select value={selectedKitId?.toString() ?? ""} onValueChange={v => setSelectedKitId(Number(v))}>
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="Selecione o kit" />
                </SelectTrigger>
                <SelectContent>
                  {kits.map(k => (
                    <SelectItem key={k.id} value={k.id.toString()} className="text-xs">{k.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Quantidade a montar</Label>
              <Input
                type="number"
                min={1}
                value={loteQtd}
                onChange={e => setLoteQtd(Math.max(1, Number(e.target.value)))}
              />
            </div>
            {selectedKitId && (
              <div className="bg-muted/50 rounded-lg p-3 space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Custo unitário</span>
                  <span className="text-foreground">R$ {(kits.find(k => k.id === selectedKitId)?.custoEstimado ?? 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold">
                  <span className="text-muted-foreground">Total do lote</span>
                  <span className="text-foreground font-display">
                    R$ {((kits.find(k => k.id === selectedKitId)?.custoEstimado ?? 0) * loteQtd).toFixed(2)}
                  </span>
                </div>
              </div>
            )}
          </div>
          <SheetFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowMontarLote(false)} className="flex-1">
              Cancelar
            </Button>
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
