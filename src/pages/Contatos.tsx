import { useState } from "react";
import { CONTATOS } from "@/data/mockData";
import { cn } from "@/lib/utils";
import { Users, Search, Phone, Mail, Building2, Star, MessageCircle, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

const NIVEL_COLORS: Record<string, string> = {
  "Decisor": "bg-primary/10 text-primary border-primary/20",
  "Relevante": "bg-accent/10 text-accent-foreground border-accent/30",
  "Básico": "bg-muted text-muted-foreground border-border",
};

export default function Contatos() {
  const [search, setSearch] = useState("");

  const filtered = CONTATOS.filter((c) =>
    c.nome.toLowerCase().includes(search.toLowerCase()) ||
    c.municipio.toLowerCase().includes(search.toLowerCase()) ||
    c.cargo.toLowerCase().includes(search.toLowerCase())
  );

  const decisores = filtered.filter((c) => c.nivel === "Decisor").length;
  const relevantes = filtered.filter((c) => c.nivel === "Relevante").length;

  return (
    <div className="p-4 lg:p-6 space-y-5 animate-fade-in">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold">Contatos Institucionais</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {decisores} decisores · {relevantes} relevantes · {filtered.length} total
          </p>
        </div>
        <button className="flex items-center gap-1.5 bg-primary text-primary-foreground px-3 py-2 rounded-lg text-xs font-semibold hover:bg-primary/90 transition-colors shadow-sm">
          <Plus className="w-3.5 h-3.5" /> Novo Contato
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Decisores", count: decisores, color: "text-primary bg-primary/8 border-primary/15" },
          { label: "Relevantes", count: relevantes, color: "text-accent-foreground bg-accent/8 border-accent/20" },
          { label: "Com WhatsApp", count: filtered.filter((c) => c.whatsapp).length, color: "text-status-visited bg-status-visited/8 border-status-visited/15" },
        ].map((s) => (
          <Card key={s.label} className={cn("shadow-sm border", s.color.split(" ").at(-1))}>
            <CardContent className="p-3 text-center">
              <p className={cn("font-display font-bold text-2xl", s.color.split(" ")[0])}>{s.count}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome, município ou cargo..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 h-9 text-sm"
        />
      </div>

      {/* Contatos grid */}
      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {filtered.map((c) => (
          <Card key={c.id} className="shadow-sm border-border/60 hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-primary">
                    {c.nome.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-sm text-foreground truncate">{c.nome}</p>
                    <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full border flex-shrink-0", NIVEL_COLORS[c.nivel])}>
                      {c.nivel}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{c.cargo}</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <Building2 className="w-3 h-3 text-muted-foreground" />
                    <span className="text-[11px] text-muted-foreground">{c.municipio}</span>
                  </div>
                </div>
              </div>
              <div className="mt-3 space-y-1.5">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Phone className="w-3.5 h-3.5 flex-shrink-0" />
                  <a href={`tel:${c.telefone}`} className="hover:text-primary transition-colors truncate">{c.telefone}</a>
                  {c.whatsapp && (
                    <span className="ml-auto bg-status-visited/12 text-status-visited text-[10px] px-1.5 rounded">WhatsApp</span>
                  )}
                </div>
                {c.email && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                    <a href={`mailto:${c.email}`} className="hover:text-primary transition-colors truncate">{c.email}</a>
                  </div>
                )}
              </div>
              <div className="mt-3 pt-3 border-t border-border/40 flex items-center gap-2">
                <button className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors py-1.5 rounded-md hover:bg-muted/60">
                  <MessageCircle className="w-3.5 h-3.5" /> Mensagem
                </button>
                <button className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors py-1.5 rounded-md hover:bg-muted/60">
                  <Star className="w-3.5 h-3.5" /> Detalhar
                </button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Users className="w-8 h-8 mb-3 opacity-30" />
          <p className="text-sm">Nenhum contato encontrado</p>
        </div>
      )}
    </div>
  );
}
