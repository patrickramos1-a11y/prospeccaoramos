import { useState } from "react";
import { ESTOQUE_ITENS as INITIAL_ESTOQUE } from "@/data/mockData";
import { cn } from "@/lib/utils";
import {
  Package, Plus, Search, AlertCircle, ArrowDown, ArrowUp,
  TrendingDown, Boxes, Pencil, Trash2, X, Check
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
  id: number;
  nome: string;
  categoria: string;
  unidade: string;
  saldoAtual: number;
  minimo: number;
  ideal: number;
  custoUnitario: number;
  fornecedor: string;
  alerta: boolean;
}

const CATEGORIAS = ["Impresso", "Brinde", "Embalagem", "Papelaria"];

export default function Estoque() {
  const [itens, setItens] = useState<EstoqueItem[]>(INITIAL_ESTOQUE);
  const [search, setSearch] = useState("");
  const [categoriaFilter, setCategoriaFilter] = useState("todas");

  // Sheets
  const [showNewItem, setShowNewItem] = useState(false);
  const [editingItem, setEditingItem] = useState<EstoqueItem | null>(null);
  const [showEntrada, setShowEntrada] = useState(false);
  const [showSaida, setShowSaida] = useState(false);
  const [movItemId, setMovItemId] = useState<number | null>(null);
  const [movQtd, setMovQtd] = useState(0);

  // New item form
  const [newItem, setNewItem] = useState({
    nome: "", categoria: "", unidade: "unidade", saldoAtual: 0,
    minimo: 0, ideal: 0, custoUnitario: 0, fornecedor: "",
  });

  // Edit form
  const [editForm, setEditForm] = useState({
    nome: "", categoria: "", unidade: "", saldoAtual: 0,
    minimo: 0, ideal: 0, custoUnitario: 0, fornecedor: "",
  });

  const categorias = ["todas", ...Array.from(new Set(itens.map((i) => i.categoria)))];

  const filtered = itens.filter((item) => {
    const matchSearch = item.nome.toLowerCase().includes(search.toLowerCase());
    const matchCat = categoriaFilter === "todas" || item.categoria === categoriaFilter;
    return matchSearch && matchCat;
  });

  const totalItens = itens.length;
  const alertaCount = itens.filter((i) => i.saldoAtual < i.minimo).length;
  const valorTotal = itens.reduce((acc, i) => acc + i.saldoAtual * i.custoUnitario, 0);

  const getEstoqueStatus = (item: EstoqueItem) => {
    const pct = item.saldoAtual / item.minimo;
    if (pct < 1) return { label: "Crítico", color: "text-destructive bg-destructive/10", barColor: "bg-destructive" };
    if (pct < 1.3) return { label: "Atenção", color: "text-accent-foreground bg-accent/20", barColor: "bg-accent" };
    return { label: "OK", color: "text-status-visited bg-status-visited/10", barColor: "bg-status-visited" };
  };

  const handleCreateItem = () => {
    if (!newItem.nome.trim() || !newItem.categoria) {
      toast({ title: "Preencha nome e categoria", variant: "destructive" });
      return;
    }
    const item: EstoqueItem = {
      id: Date.now(), ...newItem,
      alerta: newItem.saldoAtual < newItem.minimo,
    };
    setItens(prev => [...prev, item]);
    setNewItem({ nome: "", categoria: "", unidade: "unidade", saldoAtual: 0, minimo: 0, ideal: 0, custoUnitario: 0, fornecedor: "" });
    setShowNewItem(false);
    toast({ title: "Item cadastrado!", description: `"${item.nome}" adicionado ao estoque.` });
  };

  const openEdit = (item: EstoqueItem) => {
    setEditForm({
      nome: item.nome, categoria: item.categoria, unidade: item.unidade,
      saldoAtual: item.saldoAtual, minimo: item.minimo, ideal: item.ideal,
      custoUnitario: item.custoUnitario, fornecedor: item.fornecedor,
    });
    setEditingItem(item);
  };

  const handleSaveEdit = () => {
    if (!editingItem) return;
    setItens(prev => prev.map(i => {
      if (i.id !== editingItem.id) return i;
      return { ...i, ...editForm, alerta: editForm.saldoAtual < editForm.minimo };
    }));
    setEditingItem(null);
    toast({ title: "Item atualizado!" });
  };

  const handleDelete = (id: number) => {
    setItens(prev => prev.filter(i => i.id !== id));
    toast({ title: "Item removido do estoque" });
  };

  const openEntrada = (id: number) => {
    setMovItemId(id);
    setMovQtd(0);
    setShowEntrada(true);
  };

  const openSaida = (id: number) => {
    setMovItemId(id);
    setMovQtd(0);
    setShowSaida(true);
  };

  const handleEntrada = () => {
    if (movItemId === null || movQtd <= 0) return;
    setItens(prev => prev.map(i => {
      if (i.id !== movItemId) return i;
      const novoSaldo = i.saldoAtual + movQtd;
      return { ...i, saldoAtual: novoSaldo, alerta: novoSaldo < i.minimo };
    }));
    setShowEntrada(false);
    toast({ title: `+${movQtd} unidades registradas` });
  };

  const handleSaida = () => {
    if (movItemId === null || movQtd <= 0) return;
    setItens(prev => prev.map(i => {
      if (i.id !== movItemId) return i;
      const novoSaldo = Math.max(0, i.saldoAtual - movQtd);
      return { ...i, saldoAtual: novoSaldo, alerta: novoSaldo < i.minimo };
    }));
    setShowSaida(false);
    toast({ title: `-${movQtd} unidades registradas` });
  };

  const movItem = itens.find(i => i.id === movItemId);

  return (
    <div className="p-4 space-y-4 animate-fade-in pb-24">
      {/* Header */}
      <div>
        <h1 className="font-display text-xl font-bold">Estoque de Materiais</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Brindes, papelaria e embalagens</p>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => { setMovItemId(itens[0]?.id ?? null); setShowEntrada(true); }}>
          <ArrowDown className="w-3.5 h-3.5 mr-1" /> Entrada
        </Button>
        <Button size="sm" className="flex-1 text-xs" onClick={() => setShowNewItem(true)}>
          <Plus className="w-3.5 h-3.5 mr-1" /> Novo Item
        </Button>
      </div>

      {/* KPIs */}
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

      {/* Filters */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar item..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>
        <Select value={categoriaFilter} onValueChange={setCategoriaFilter}>
          <SelectTrigger className="h-9 text-xs w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {categorias.map((c) => (
              <SelectItem key={c} value={c} className="text-xs capitalize">
                {c === "todas" ? "Todas" : c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Items list - card-based for mobile */}
      <div className="space-y-2">
        {filtered.map((item) => {
          const st = getEstoqueStatus(item);
          const pct = Math.min((item.saldoAtual / item.ideal) * 100, 100);
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
                        <p className="text-[10px] text-muted-foreground">{item.fornecedor}</p>
                      </div>
                      <Badge className={cn("text-[9px] flex-shrink-0 font-semibold", st.color)} variant="secondary">
                        {st.label}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-3 mt-2">
                      <div className="flex-1">
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                          <div className={cn("h-full rounded-full", st.barColor)} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                      <span className="text-xs font-bold text-foreground">{item.saldoAtual}</span>
                      <span className="text-[10px] text-muted-foreground">/ {item.ideal}</span>
                    </div>

                    <div className="flex items-center justify-between mt-2">
                      <div className="flex gap-1">
                        <Badge variant="outline" className="text-[9px] px-1.5">{item.categoria}</Badge>
                        <span className="text-[10px] text-muted-foreground">R$ {item.custoUnitario.toFixed(2)}/{item.unidade}</span>
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
          </div>
        )}
      </div>

      {/* Sheet: Novo Item */}
      <Sheet open={showNewItem} onOpenChange={setShowNewItem}>
        <SheetContent side="bottom" className="h-[85vh] overflow-y-auto rounded-t-2xl">
          <SheetHeader>
            <SheetTitle className="font-display text-lg">Cadastrar Novo Item</SheetTitle>
          </SheetHeader>
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
                  <SelectContent>
                    {CATEGORIAS.map(c => (<SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>))}
                  </SelectContent>
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
                <Input type="number" min={0} value={newItem.saldoAtual} onChange={e => setNewItem(p => ({ ...p, saldoAtual: Number(e.target.value) }))} />
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
                <Input type="number" min={0} step={0.01} value={newItem.custoUnitario} onChange={e => setNewItem(p => ({ ...p, custoUnitario: Number(e.target.value) }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Fornecedor</Label>
                <Input placeholder="Ex: Gráfica Central" value={newItem.fornecedor} onChange={e => setNewItem(p => ({ ...p, fornecedor: e.target.value }))} />
              </div>
            </div>
          </div>
          <SheetFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowNewItem(false)} className="flex-1">Cancelar</Button>
            <Button onClick={handleCreateItem} className="flex-1">
              <Check className="w-3.5 h-3.5 mr-1" /> Cadastrar
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Sheet: Editar Item */}
      <Sheet open={!!editingItem} onOpenChange={(open) => !open && setEditingItem(null)}>
        <SheetContent side="bottom" className="h-[85vh] overflow-y-auto rounded-t-2xl">
          <SheetHeader>
            <SheetTitle className="font-display text-lg">Editar Item</SheetTitle>
          </SheetHeader>
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
                  <SelectContent>
                    {CATEGORIAS.map(c => (<SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>))}
                  </SelectContent>
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
                <Input type="number" min={0} value={editForm.saldoAtual} onChange={e => setEditForm(p => ({ ...p, saldoAtual: Number(e.target.value) }))} />
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
                <Input type="number" min={0} step={0.01} value={editForm.custoUnitario} onChange={e => setEditForm(p => ({ ...p, custoUnitario: Number(e.target.value) }))} />
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
          <SheetHeader>
            <SheetTitle className="font-display text-lg">Registrar Entrada</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 py-4">
            {movItem && (
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="font-medium text-sm">{movItem.nome}</p>
                <p className="text-xs text-muted-foreground">Saldo atual: {movItem.saldoAtual} {movItem.unidade}(s)</p>
              </div>
            )}
            <div className="space-y-2">
              <Label className="text-xs">Quantidade a entrar</Label>
              <Input type="number" min={1} value={movQtd} onChange={e => setMovQtd(Math.max(0, Number(e.target.value)))} />
            </div>
          </div>
          <SheetFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowEntrada(false)} className="flex-1">Cancelar</Button>
            <Button onClick={handleEntrada} disabled={movQtd <= 0} className="flex-1">
              <ArrowDown className="w-3.5 h-3.5 mr-1" /> Registrar +{movQtd}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Sheet: Saída */}
      <Sheet open={showSaida} onOpenChange={setShowSaida}>
        <SheetContent side="bottom" className="rounded-t-2xl">
          <SheetHeader>
            <SheetTitle className="font-display text-lg">Registrar Saída</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 py-4">
            {movItem && (
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="font-medium text-sm">{movItem.nome}</p>
                <p className="text-xs text-muted-foreground">Saldo atual: {movItem.saldoAtual} {movItem.unidade}(s)</p>
              </div>
            )}
            <div className="space-y-2">
              <Label className="text-xs">Quantidade de saída</Label>
              <Input type="number" min={1} max={movItem?.saldoAtual ?? 0} value={movQtd} onChange={e => setMovQtd(Math.max(0, Number(e.target.value)))} />
            </div>
          </div>
          <SheetFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowSaida(false)} className="flex-1">Cancelar</Button>
            <Button onClick={handleSaida} disabled={movQtd <= 0} variant="destructive" className="flex-1">
              <ArrowUp className="w-3.5 h-3.5 mr-1" /> Registrar -{movQtd}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
