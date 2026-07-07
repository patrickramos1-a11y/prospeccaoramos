import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { toast } from "@/hooks/use-toast";

const NIVEIS = ["Decisor", "Relevante", "Básico"] as const;

export type ContatoFormData = {
  id?: string;
  nome: string;
  cargo: string;
  nivel: string;
  municipio_id: string | null;
  telefone: string;
  email: string;
  whatsapp: boolean;
  observacoes: string;
};

const empty: ContatoFormData = {
  nome: "", cargo: "", nivel: "Básico", municipio_id: null,
  telefone: "", email: "", whatsapp: false, observacoes: "",
};

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial?: ContatoFormData | null;
  defaultMunicipioId?: string | null;
  onSaved?: (contatoId: string) => void;
};

type MunicipioOpt = { id: string; nome: string; estado: string };

export default function ContatoFormSheet({ open, onOpenChange, initial, defaultMunicipioId, onSaved }: Props) {
  const qc = useQueryClient();
  const editingId = initial?.id ?? null;
  const [form, setForm] = useState<ContatoFormData>(empty);

  useEffect(() => {
    if (open) {
      setForm(initial ?? { ...empty, municipio_id: defaultMunicipioId ?? null });
    }
  }, [open, initial, defaultMunicipioId]);

  const { data: municipios = [] } = useQuery({
    queryKey: ["municipios", "opts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("municipios").select("id, nome, estado").order("nome");
      if (error) throw error;
      return data as MunicipioOpt[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!form.nome.trim()) throw new Error("Informe o nome do contato.");
      const payload = {
        nome: form.nome.trim(),
        cargo: form.cargo.trim(),
        nivel: form.nivel,
        municipio_id: form.municipio_id,
        telefone: form.telefone.trim(),
        email: form.email.trim(),
        whatsapp: form.whatsapp,
        observacoes: form.observacoes.trim(),
      };
      if (editingId) {
        const { error } = await supabase.from("contatos").update(payload).eq("id", editingId);
        if (error) throw error;
        return editingId;
      } else {
        const { data, error } = await supabase.from("contatos").insert(payload).select("id").single();
        if (error) throw error;
        return data.id as string;
      }
    },
    onSuccess: (id) => {
      toast({ title: editingId ? "Contato atualizado" : "Contato cadastrado" });
      qc.invalidateQueries({ queryKey: ["contatos"] });
      qc.invalidateQueries({ queryKey: ["contatos", "opts"] });
      qc.invalidateQueries({ queryKey: ["sidebar", "contatos-count"] });
      onOpenChange(false);
      onSaved?.(id);
    },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto bg-background">
        <SheetHeader>
          <SheetTitle>{editingId ? "Editar contato" : "Novo contato"}</SheetTitle>
          <SheetDescription>
            {editingId ? "Atualize os dados do contato." : "Cadastre um contato institucional."}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 mt-5">
          <div className="space-y-2">
            <Label className="text-xs">Nome *</Label>
            <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} className="h-9 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-xs">Cargo</Label>
              <Input value={form.cargo} onChange={(e) => setForm({ ...form, cargo: e.target.value })} className="h-9 text-sm" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Nível</Label>
              <Select value={form.nivel} onValueChange={(v) => setForm({ ...form, nivel: v })}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {NIVEIS.map((n) => <SelectItem key={n} value={n} className="text-sm">{n}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Município</Label>
            <Select
              value={form.municipio_id ?? "__none__"}
              onValueChange={(v) => setForm({ ...form, municipio_id: v === "__none__" ? null : v })}
            >
              <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__" className="text-sm text-muted-foreground">Sem município</SelectItem>
                {municipios.map((m) => (
                  <SelectItem key={m.id} value={m.id} className="text-sm">
                    {m.nome}/{m.estado}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
          <div className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2">
            <div>
              <Label className="text-xs">WhatsApp</Label>
              <p className="text-[11px] text-muted-foreground">Telefone disponível no WhatsApp</p>
            </div>
            <Switch checked={form.whatsapp} onCheckedChange={(v) => setForm({ ...form, whatsapp: v })} />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Observações</Label>
            <Textarea
              value={form.observacoes}
              onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
              rows={3}
              className="text-sm resize-none"
            />
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
