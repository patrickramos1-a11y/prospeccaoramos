import { useState } from "react";
import { ESTOQUE_ITENS } from "@/data/mockData";
import { cn } from "@/lib/utils";
import { Gift, Plus, Package, CheckCircle, AlertCircle, Layers, Trash2, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
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
  const [showNewKit, setShowNewKit] = useState(false);
  const [showMontarLote, setShowMontarLote] = useState(false);
  const [selectedKitId, setSelectedKitId] = useState<number | null>(null);
  const [showAddItem, setShowAddItem] = useState(false);
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

  const calcCusto = (itens: KitItem[]) => {
    return itens.reduce((sum, ki) => {
      const estoqueItem = ESTOQUE_ITENS.find(e => e.nome === ki.item);
      return sum + (estoqueItem ? estoqueItem.custoUnitario * ki.qtd : 0);
    }, 0);
  };

  const handleCreateKit = () => {
    if (!newKit.nome.trim() || !newKit.tipo.trim()) {
      toast({ title: "Preencha nome e tipo do kit", variant: "destructive" });
      return;
    }
    if (newKitItens.length === 0) {
      toast({ title: "Adicione pelo menos um item ao kit", variant: "destructive" });
      return;
    }
    const kit: Kit = {
      id: Date.now(),
      nome: newKit.nome,
      tipo: newKit.tipo,
      descricao: newKit.descricao,
      ativo: true,
      itens: newKitItens,
      custoEstimado: calcCusto(newKitItens),
      montados: 0,
      disponiveis: 0,
      usados: 0,
    };
    setKits(prev => [...prev, kit]);
    setNewKit({ nome: "", tipo: "", descricao: "" });
    setNewKitItens([]);
    setShowNewKit(false);
    toast({ title: "Kit criado com sucesso!", description: `"${kit.nome}" adicionado à lista.` });
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

  const handleRemoveItemFromNewKit = (itemName: string) => {
    setNewKitItens(prev => prev.filter(i => i.item !== itemName));
  };

  const handleAddItemToExistingKit = () => {
    if (!addItemName || addItemKitId === null) return;
    setKits(prev => prev.map(k => {
      if (k.id !== addItemKitId) return k;
      if (k.itens.some(i => i.item === addItemName)) {
        toast({ title: "Item já existe neste kit", variant: "destructive" });
        return k;
      }
      const updatedItens = [...k.itens, { item: addItemName, qtd: addItemQtd }];
      return { ...k, itens: updatedItens, custoEstimado: calcCusto(updatedItens) };
    }));
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
    toast({ title: "Item removido do kit" });
  };

  const handleMontarLote = () => {
    if (selectedKitId === null || loteQtd <= 0) return;
    setKits(prev => prev.map(k => {
      if (k.id !== selectedKitId) return k;
      return { ...k, montados: k.montados + loteQtd, disponiveis: k.disponiveis + loteQtd };
    }));
    const kit = kits.find(k => k.id === selectedKitId);
    setShowMontarLote(false);
    setLoteQtd(10);
    toast({ title: "Lote montado!", description: `${loteQtd} unidades de "${kit?.nome}" adicionadas.` });
  };

  const handleDeleteKit = (kitId: number) => {
    setKits(prev => prev.filter(k => k.id !== kitId));
    toast({ title: "Kit removido" });
  };

  const totalMontados = kits.reduce((a, k) => a + k.montados, 0);
  const totalDisponiveis = kits.reduce((a, k) => a + k.disponiveis, 0);
  const totalUsados = kits.reduce((a, k) => a + k.usados, 0);

  return (
    <div className="p-4 lg:p-6 space-y-5 animate-fade-in">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold">Kits e Montagem</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Modelos, composição e controle de unidades montadas</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => { setSelectedKitId(kits[0]?.id ?? null); setShowMontarLote(true); }}
            disabled={kits.length === 0}
          >
            <Layers className="w-3.5 h-3.5 mr-1.5" /> Montar Lote
          </Button>
          <Button size="sm" onClick={() => setShowNewKit(true)}>
            <Plus className="w-3.5 h-3.5 mr-1.5" /> Novo Modelo
          </Button>
        </div>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Modelos Ativos", value: kits.length, icon: Gift, color: "text-primary bg-primary/10" },
          { label: "Total Montados", value: totalMontados, icon: Package, color: "text-accent-foreground bg-accent/10" },
          { label: "Disponíveis", value: totalDisponiveis, icon: CheckCircle, color: "text-status-visited bg-status-visited/10" },
          { label: "Utilizados", value: totalUsados, icon: Layers, color: "text-status-planned bg-status-planned/10" },
        ].map((stat) => (
          <Card key={stat.label} className="shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0", stat.color)}>
                <stat.icon className="w-4.5 h-4.5" />
              </div>
              <div>
                <p className="font-display font-bold text-xl text-foreground">{stat.value}</p>
                <p className="text-[11px] text-muted-foreground">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Kit cards */}
      <div className="grid lg:grid-cols-2 gap-5">
        {kits.map((kit) => {
          const usoPct = kit.montados > 0 ? Math.round((kit.usados / kit.montados) * 100) : 0;
          const dispPct = kit.montados > 0 ? Math.round((kit.disponiveis / kit.montados) * 100) : 0;
          return (
            <Card key={kit.id} className="shadow-sm border-border/60 hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Gift className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="font-display text-base">{kit.nome}</CardTitle>
                      <p className="text-xs text-muted-foreground mt-0.5">{kit.tipo}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-display font-bold text-foreground">R$ {kit.custoEstimado.toFixed(2)}</p>
                    <p className="text-[10px] text-muted-foreground">custo/kit</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{kit.descricao}</p>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Progress */}
                {kit.montados > 0 && (
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="text-muted-foreground">Utilização</span>
                      <span className="font-semibold text-foreground">{kit.usados}/{kit.montados} utilizados</span>
                    </div>
                    <div className="h-2.5 rounded-full bg-muted overflow-hidden flex">
                      <div className="bg-status-visited rounded-l-full" style={{ width: `${usoPct}%` }} />
                      <div className="bg-status-planned/60" style={{ width: `${dispPct}%` }} />
                    </div>
                    <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-status-visited inline-block" /> {kit.usados} usados
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-status-planned/60 inline-block" /> {kit.disponiveis} disponíveis
                      </span>
                    </div>
                  </div>
                )}

                {kit.montados === 0 && (
                  <p className="text-xs text-muted-foreground italic">Nenhuma unidade montada ainda.</p>
                )}

                {/* Items */}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Composição do Kit</p>
                  <div className="space-y-1">
                    {kit.itens.map((item) => (
                      <div key={item.item} className="flex items-center gap-2 text-xs group">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary/50 flex-shrink-0" />
                        <span className="flex-1 text-foreground">{item.item}</span>
                        <span className="font-semibold text-muted-foreground bg-muted px-1.5 py-0.5 rounded">× {item.qtd}</span>
                        <button
                          onClick={() => handleRemoveItemFromKit(kit.id, item.item)}
                          className="opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive/80 transition-opacity p-0.5"
                          title="Remover item"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-1">
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={() => { setSelectedKitId(kit.id); setShowMontarLote(true); }}
                  >
                    Montar Lote
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => { setAddItemKitId(kit.id); setShowAddItem(true); }}
                  >
                    <Plus className="w-3 h-3 mr-1" /> Adicionar Item
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => handleDeleteKit(kit.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>

                {kit.disponiveis > 0 && kit.disponiveis < 10 && (
                  <div className="flex items-center gap-2 p-2.5 rounded-lg bg-destructive/5 border border-destructive/15">
                    <AlertCircle className="w-3.5 h-3.5 text-destructive flex-shrink-0" />
                    <p className="text-xs text-destructive">Apenas {kit.disponiveis} kits disponíveis — monte mais unidades</p>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Dialog: Novo Kit */}
      <Dialog open={showNewKit} onOpenChange={setShowNewKit}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">Novo Modelo de Kit</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="kit-nome">Nome do Kit</Label>
                <Input id="kit-nome" placeholder="Ex: Kit Técnico" value={newKit.nome} onChange={e => setNewKit(p => ({ ...p, nome: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="kit-tipo">Tipo / Público</Label>
                <Input id="kit-tipo" placeholder="Ex: Técnicos" value={newKit.tipo} onChange={e => setNewKit(p => ({ ...p, tipo: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="kit-desc">Descrição</Label>
              <Input id="kit-desc" placeholder="Descrição do kit..." value={newKit.descricao} onChange={e => setNewKit(p => ({ ...p, descricao: e.target.value }))} />
            </div>

            {/* Add items */}
            <div className="border border-border rounded-lg p-3 space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase">Itens do Kit</p>
              <div className="flex gap-2">
                <Select value={newItemName} onValueChange={setNewItemName}>
                  <SelectTrigger className="flex-1 text-xs">
                    <SelectValue placeholder="Selecione um item do estoque" />
                  </SelectTrigger>
                  <SelectContent>
                    {ESTOQUE_ITENS.map(e => (
                      <SelectItem key={e.id} value={e.nome}>{e.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  min={1}
                  value={newItemQtd}
                  onChange={e => setNewItemQtd(Math.max(1, Number(e.target.value)))}
                  className="w-16 text-xs"
                />
                <Button size="sm" variant="outline" onClick={handleAddItemToNewKit} disabled={!newItemName}>
                  <Plus className="w-3 h-3" />
                </Button>
              </div>

              {newKitItens.length > 0 ? (
                <div className="space-y-1.5">
                  {newKitItens.map(i => (
                    <div key={i.item} className="flex items-center justify-between text-xs bg-muted/50 p-2 rounded">
                      <span>{i.item}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">× {i.qtd}</span>
                        <button onClick={() => handleRemoveItemFromNewKit(i.item)} className="text-destructive hover:text-destructive/80">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                  <p className="text-xs text-right text-muted-foreground">
                    Custo estimado: <strong className="text-foreground">R$ {calcCusto(newKitItens).toFixed(2)}</strong>
                  </p>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">Nenhum item adicionado.</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewKit(false)}>Cancelar</Button>
            <Button onClick={handleCreateKit}>Criar Kit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Adicionar Item a Kit Existente */}
      <Dialog open={showAddItem} onOpenChange={setShowAddItem}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display">Adicionar Item ao Kit</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Item do Estoque</Label>
              <Select value={addItemName} onValueChange={setAddItemName}>
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="Selecione um item" />
                </SelectTrigger>
                <SelectContent>
                  {ESTOQUE_ITENS.map(e => (
                    <SelectItem key={e.id} value={e.nome}>{e.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Quantidade por kit</Label>
              <Input type="number" min={1} value={addItemQtd} onChange={e => setAddItemQtd(Math.max(1, Number(e.target.value)))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddItem(false)}>Cancelar</Button>
            <Button onClick={handleAddItemToExistingKit} disabled={!addItemName}>Adicionar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Montar Lote */}
      <Dialog open={showMontarLote} onOpenChange={setShowMontarLote}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display">Montar Lote</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Kit</Label>
              <Select value={selectedKitId?.toString() ?? ""} onValueChange={v => setSelectedKitId(Number(v))}>
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="Selecione o kit" />
                </SelectTrigger>
                <SelectContent>
                  {kits.map(k => (
                    <SelectItem key={k.id} value={k.id.toString()}>{k.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Quantidade a montar</Label>
              <Input type="number" min={1} value={loteQtd} onChange={e => setLoteQtd(Math.max(1, Number(e.target.value)))} />
            </div>
            {selectedKitId && (
              <p className="text-xs text-muted-foreground">
                Custo total estimado: <strong className="text-foreground">
                  R$ {((kits.find(k => k.id === selectedKitId)?.custoEstimado ?? 0) * loteQtd).toFixed(2)}
                </strong>
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMontarLote(false)}>Cancelar</Button>
            <Button onClick={handleMontarLote}>Montar {loteQtd} unidades</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
