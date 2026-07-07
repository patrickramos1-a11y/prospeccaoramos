import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Search, Pencil, Mail, Phone, UserX, UserCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import UsuarioFormSheet, { UsuarioFormData } from "@/components/UsuarioFormSheet";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type Usuario = {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  cargo: string;
  cor: string;
  ativo: boolean;
};

export default function Configuracoes() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<UsuarioFormData | null>(null);

  const { data: usuarios = [], isLoading } = useQuery({
    queryKey: ["usuarios"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("usuarios").select("*").order("nome");
      if (error) throw error;
      return data as Usuario[];
    },
  });

  const toggleAtivo = useMutation({
    mutationFn: async (u: Usuario) => {
      const { error } = await supabase.from("usuarios").update({ ativo: !u.ativo }).eq("id", u.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["usuarios"] });
      toast({ title: "Status atualizado" });
    },
  });

  const filtered = usuarios.filter(
    (u) => u.nome.toLowerCase().includes(search.toLowerCase()) ||
           u.cargo.toLowerCase().includes(search.toLowerCase()) ||
           u.email.toLowerCase().includes(search.toLowerCase())
  );

  const openNew = () => { setEditing(null); setSheetOpen(true); };
  const openEdit = (u: Usuario) => { setEditing(u); setSheetOpen(true); };

  return (
    <div className="flex flex-col h-full animate-fade-in">
      <div className="px-4 lg:px-6 py-4 border-b border-border/70 bg-card/70">
        <h1 className="font-display text-xl font-bold">Configurações</h1>
        <p className="text-xs text-muted-foreground">Gerencie usuários e preferências do sistema</p>
      </div>

      <div className="flex-1 overflow-y-auto page-shell">
        <Tabs defaultValue="usuarios" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="usuarios">Usuários</TabsTrigger>
            <TabsTrigger value="preferencias" disabled>Preferências</TabsTrigger>
          </TabsList>

          <TabsContent value="usuarios" className="space-y-4">
            <div className="flex gap-3 items-center">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  placeholder="Buscar usuário..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-9 text-sm"
                />
              </div>
              <Button onClick={openNew} className="h-9 text-xs gap-1.5">
                <Plus className="w-3.5 h-3.5" /> Novo Usuário
              </Button>
            </div>

            {isLoading ? (
              <p className="text-sm text-muted-foreground">Carregando...</p>
            ) : filtered.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-sm text-muted-foreground">
                  Nenhum usuário cadastrado. Clique em "Novo Usuário" para começar.
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.map((u) => (
                  <Card key={u.id} className={cn("entity-card transition-opacity", !u.ativo && "opacity-60")}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0"
                          style={{ backgroundColor: u.cor }}
                        >
                          {u.nome.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm truncate">{u.nome}</p>
                          <p className="text-[11px] text-muted-foreground truncate">{u.cargo || "—"}</p>
                          {!u.ativo && (
                            <span className="inline-block mt-1 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                              Inativo
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="space-y-1 mt-3 text-[11px] text-muted-foreground">
                        {u.email && (
                          <div className="flex items-center gap-1.5"><Mail className="w-3 h-3" /><span className="truncate">{u.email}</span></div>
                        )}
                        {u.telefone && (
                          <div className="flex items-center gap-1.5"><Phone className="w-3 h-3" /><span>{u.telefone}</span></div>
                        )}
                      </div>
                      <div className="flex gap-1 mt-3 pt-3 border-t border-border/50">
                        <Button variant="ghost" size="sm" className="h-7 text-xs flex-1" onClick={() => openEdit(u)}>
                          <Pencil className="w-3 h-3 mr-1" /> Editar
                        </Button>
                        <Button
                          variant="ghost" size="sm" className="h-7 text-xs"
                          onClick={() => toggleAtivo.mutate(u)}
                        >
                          {u.ativo ? <UserX className="w-3 h-3" /> : <UserCheck className="w-3 h-3" />}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <UsuarioFormSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        initial={editing}
      />
    </div>
  );
}
