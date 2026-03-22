import { KITS } from "@/data/mockData";
import { cn } from "@/lib/utils";
import { Gift, Plus, Package, CheckCircle, AlertCircle, Layers } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Kits() {
  return (
    <div className="p-4 lg:p-6 space-y-5 animate-fade-in">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold">Kits e Montagem</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Modelos, composição e controle de unidades montadas</p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-1.5 border border-border bg-card px-3 py-2 rounded-lg text-xs font-medium hover:bg-muted/50 transition-colors">
            <Layers className="w-3.5 h-3.5" /> Montar Lote
          </button>
          <button className="flex items-center gap-1.5 bg-primary text-primary-foreground px-3 py-2 rounded-lg text-xs font-semibold hover:bg-primary/90 transition-colors shadow-sm">
            <Plus className="w-3.5 h-3.5" /> Novo Modelo
          </button>
        </div>
      </div>

      {/* Resumo operacional */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Modelos Ativos", value: KITS.length, icon: Gift, color: "text-primary bg-primary/10" },
          { label: "Total Montados", value: KITS.reduce((a, k) => a + k.montados, 0), icon: Package, color: "text-accent-foreground bg-accent/10" },
          { label: "Disponíveis", value: KITS.reduce((a, k) => a + k.disponiveis, 0), icon: CheckCircle, color: "text-status-visited bg-status-visited/10" },
          { label: "Utilizados", value: KITS.reduce((a, k) => a + k.usados, 0), icon: Layers, color: "text-status-planned bg-status-planned/10" },
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
        {KITS.map((kit) => {
          const usoPct = Math.round((kit.usados / kit.montados) * 100);
          const dispPct = Math.round((kit.disponiveis / kit.montados) * 100);
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
                      <span className="w-2 h-2 rounded-full bg-status-visited inline-block" />
                      {kit.usados} usados
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-status-planned/60 inline-block" />
                      {kit.disponiveis} disponíveis
                    </span>
                  </div>
                </div>

                {/* Items */}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Composição do Kit</p>
                  <div className="space-y-1">
                    {kit.itens.map((item) => (
                      <div key={item.item} className="flex items-center gap-2 text-xs">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary/50 flex-shrink-0" />
                        <span className="flex-1 text-foreground">{item.item}</span>
                        <span className="font-semibold text-muted-foreground bg-muted px-1.5 py-0.5 rounded">× {item.qtd}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-1">
                  <button className="flex-1 bg-primary text-primary-foreground py-2 rounded-lg text-xs font-semibold hover:bg-primary/90 transition-colors">
                    Montar Lote
                  </button>
                  <button className="flex-1 border border-border bg-card py-2 rounded-lg text-xs font-medium hover:bg-muted/50 transition-colors">
                    Ver Histórico
                  </button>
                </div>

                {/* Alert if low */}
                {kit.disponiveis < 10 && (
                  <div className="flex items-center gap-2 p-2.5 rounded-lg bg-destructive/6 border border-destructive/15">
                    <AlertCircle className="w-3.5 h-3.5 text-destructive flex-shrink-0" />
                    <p className="text-xs text-destructive">Apenas {kit.disponiveis} kits disponíveis — monte mais unidades</p>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
