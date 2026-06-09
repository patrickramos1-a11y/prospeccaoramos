import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Upload, Download, Trash2, FileText, FileImage, File as FileIcon, ExternalLink, Paperclip } from "lucide-react";

interface Documento {
  id: string;
  item_id: string;
  nome: string;
  descricao: string;
  arquivo_url: string;
  arquivo_path: string;
  tipo_mime: string;
  tamanho_bytes: number;
  created_at: string;
}

const MAX_FILE_MB = 100;
const MAX_BYTES = MAX_FILE_MB * 1024 * 1024;

function formatBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

function iconFor(mime: string) {
  if (mime.startsWith("image/")) return FileImage;
  if (mime === "application/pdf") return FileText;
  return FileIcon;
}

export function EstoqueDocumentosManager({ itemId, onChange }: { itemId: string; onChange?: () => void }) {
  const [docs, setDocs] = useState<Documento[]>([]);
  const [descricao, setDescricao] = useState("");
  const [uploading, setUploading] = useState(false);

  const load = async () => {
    const { data } = await supabase
      .from("estoque_itens_documentos")
      .select("*")
      .eq("item_id", itemId)
      .order("created_at", { ascending: false });
    if (data) setDocs(data as Documento[]);
  };

  useEffect(() => {
    if (itemId) load();
  }, [itemId]);

  const handleFile = async (file: File | null) => {
    if (!file) return;
    if (file.size > MAX_BYTES) {
      toast({ title: "Arquivo muito grande", description: `Limite de ${MAX_FILE_MB}MB.`, variant: "destructive" });
      return;
    }
    setUploading(true);
    const safeName = file.name.replace(/[^\w.\-]+/g, "_");
    const path = `${itemId}/${Date.now()}-${safeName}`;
    const { error: upErr } = await supabase.storage.from("estoque-documentos").upload(path, file);
    if (upErr) {
      toast({ title: "Erro ao enviar arquivo", description: upErr.message, variant: "destructive" });
      setUploading(false);
      return;
    }
    const { data: urlData } = supabase.storage.from("estoque-documentos").getPublicUrl(path);
    const { error: dbErr } = await supabase.from("estoque_itens_documentos").insert({
      item_id: itemId,
      nome: file.name,
      descricao,
      arquivo_url: urlData.publicUrl,
      arquivo_path: path,
      tipo_mime: file.type || "application/octet-stream",
      tamanho_bytes: file.size,
    });
    if (dbErr) {
      toast({ title: "Erro ao registrar documento", description: dbErr.message, variant: "destructive" });
    } else {
      toast({ title: "Documento anexado!" });
      setDescricao("");
      load();
      onChange?.();
    }
    setUploading(false);
  };

  const handleDelete = async (doc: Documento) => {
    await supabase.storage.from("estoque-documentos").remove([doc.arquivo_path]);
    await supabase.from("estoque_itens_documentos").delete().eq("id", doc.id);
    toast({ title: "Documento removido" });
    load();
    onChange?.();
  };

  const handleDownload = async (doc: Documento) => {
    try {
      const res = await fetch(doc.arquivo_url);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = doc.nome;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      window.open(doc.arquivo_url, "_blank");
    }
  };

  return (
    <div className="border border-border rounded-xl p-3 space-y-3">
      <div className="flex items-center gap-2">
        <Paperclip className="w-3.5 h-3.5 text-muted-foreground" />
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Documentos / Artes ({docs.length})
        </p>
      </div>

      <div className="space-y-2">
        <Input
          placeholder="Descrição (opcional, ex: Arte frente v2)"
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          className="text-xs h-9"
        />
        <label className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border border-dashed border-border cursor-pointer hover:bg-muted/50 transition-colors text-xs text-muted-foreground">
          <Upload className="w-3.5 h-3.5" />
          {uploading ? "Enviando..." : "Anexar documento (PDF, imagem, ZIP, etc.)"}
          <input
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,.webp,.gif,.svg,.ai,.psd,.cdr,.eps,.zip,.rar,.doc,.docx,.xls,.xlsx"
            className="hidden"
            disabled={uploading}
            onChange={(e) => {
              const f = e.target.files?.[0] || null;
              handleFile(f);
              e.target.value = "";
            }}
          />
        </label>
        <p className="text-[10px] text-muted-foreground">Máx. {MAX_FILE_MB}MB por arquivo</p>
      </div>

      {docs.length > 0 ? (
        <div className="space-y-1.5">
          {docs.map((doc) => {
            const Icon = iconFor(doc.tipo_mime);
            return (
              <div key={doc.id} className="flex items-center gap-2 bg-muted/40 rounded-lg p-2.5">
                <Icon className="w-4 h-4 text-primary flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">{doc.nome}</p>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {doc.descricao ? `${doc.descricao} · ` : ""}
                    {formatBytes(doc.tamanho_bytes)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDownload(doc)}
                  title="Baixar"
                  className="p-1.5 hover:bg-background rounded-md text-primary"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
                <a
                  href={doc.arquivo_url}
                  target="_blank"
                  rel="noreferrer"
                  title="Abrir"
                  className="p-1.5 hover:bg-background rounded-md text-muted-foreground"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
                <button
                  type="button"
                  onClick={() => handleDelete(doc)}
                  title="Excluir"
                  className="p-1.5 hover:bg-destructive/10 rounded-md text-destructive/70"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-[11px] text-muted-foreground italic text-center py-2">
          Nenhum documento anexado
        </p>
      )}
    </div>
  );
}
