import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { toast } from "@/hooks/use-toast";

const CORES = ["#10b981", "#f59e0b", "#3b82f6", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316"];

export type UsuarioFormData = {
  id?: string;
  nome: string;
  email: string;
  telefone: string;
  cargo: string;
  cor: string;
  ativo: boolean;
};

const empty: UsuarioFormData = {
  nome: "", email: "", telefone: "", cargo: "", cor: CORES[0], ativo: true,
};

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial?: UsuarioFormData | null;
  onSaved?: (id: string) => void;
};

export default function UsuarioFormSheet({ open, onOpenChange, initial, onSaved }: Props) {
  const qc = useQueryClient();
  const editingId = initial?.id ?? null;
  const [form, setForm] = useState<UsuarioFormData>(empty);

  useEffect(() => {
    if (open) setForm(initial ?? empty);
  }, [open, initial]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!form.nome.trim()) throw new Error("Informe o nome do usuário.");
      const payload = {
        nome: form.nome.trim(),
        email: form.email.trim(),
        telefone: form.telefone.trim(),
        cargo: form.cargo.trim(),
        cor: form.cor,
        ativo: form.ativo,
      };
      if (editingId) {
        const { error } = await supabase.from("usuarios").update(payload).eq("id", editingId);
        if (error) throw error;
        return editingId;
      } else {
        const { data, error } = await supabase.from("usuarios").insert(payload).select("id").single();
        if (error) throw error;
        return data.id as string;
      }
    },
    onSuccess: (id) => {
      toast({ title: editingId ? "Usuário atualizado" : "Usuário cadastrado" });
      qc.invalidateQueries({ queryKey: ["usuarios"] });
      onOpenChange(false);
      onSaved?.(id);
    },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{editingId ? "Editar usuário" : "Novo usuário"}</SheetTitle>
          <SheetDescription>
            {editingId ? "Atualize os dados do usuário." : "Cadastre um membro da equipe."}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 mt-5">
          <div className="space-y-2">
            <Label className="text-xs">Nome *</Label>
            <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} className="h-9 text-sm" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Cargo</Label>
            <Input value={form.cargo} onChange={(e) => setForm({ ...form, cargo: e.target.value })} className="h-9 text-sm" placeholder="Ex: Consultor Sênior" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-xs">Telefone</Label>
              <Input value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} className="h-9 text-sm" placeholder="(00) 00000-0000" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Email</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="h-9 text-sm" />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Cor do avatar</Label>
            <div className="flex flex-wrap gap-2">
              {CORES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setForm({ ...form, cor: c })}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${form.cor === c ? "border-foreground scale-110" : "border-transparent"}`}
                  style={{ backgroundColor: c }}
                  aria-label={`Cor ${c}`}
                />
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2">
            <div>
              <Label className="text-xs">Ativo</Label>
              <p className="text-[11px] text-muted-foreground">Disponível para receber visitas</p>
            </div>
            <Switch checked={form.ativo} onCheckedChange={(v) => setForm({ ...form, ativo: v })} />
          </div>
        </div>

        <SheetFooter className="mt-6 gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="h-9 text-xs">Cancelar</Button>
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="h-9 text-xs">
            {saveMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {editingId ? "Salvar alterações" : "Cadastrar"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
