import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

type Estado = { id: number; sigla: string; nome: string };
type Municipio = {
  id: number;
  nome: string;
  microrregiao?: { nome?: string; mesorregiao?: { nome?: string } };
};

export type MunicipioSelection = {
  nome: string;
  estado: string; // UF
  regiao: string; // microrregião IBGE
  ibge_codigo: string;
};

interface Props {
  value?: MunicipioSelection | null;
  onChange: (value: MunicipioSelection | null) => void;
}

async function fetchEstados(): Promise<Estado[]> {
  const res = await fetch(
    "https://servicosdados.ibge.gov.br/api/v1/localidades/estados?orderBy=nome",
  );
  if (!res.ok) throw new Error("Falha ao carregar estados");
  return res.json();
}

async function fetchMunicipios(uf: string): Promise<Municipio[]> {
  const res = await fetch(
    `https://servicosdados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios`,
  );
  if (!res.ok) throw new Error("Falha ao carregar municípios");
  return res.json();
}

export function IbgeMunicipioPicker({ value, onChange }: Props) {
  const [uf, setUf] = useState<string>(value?.estado ?? "");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (value?.estado) setUf(value.estado);
  }, [value?.estado]);

  const { data: estados = [], isLoading: loadingEstados } = useQuery({
    queryKey: ["ibge-estados"],
    queryFn: fetchEstados,
    staleTime: 1000 * 60 * 60 * 24,
  });

  const { data: municipios = [], isLoading: loadingMunicipios } = useQuery({
    queryKey: ["ibge-municipios", uf],
    queryFn: () => fetchMunicipios(uf),
    enabled: !!uf,
    staleTime: 1000 * 60 * 60 * 24,
  });

  const handleUfChange = (newUf: string) => {
    setUf(newUf);
    onChange(null);
  };

  const handleSelect = (m: Municipio) => {
    onChange({
      nome: m.nome,
      estado: uf,
      regiao: m.microrregiao?.nome ?? m.microrregiao?.mesorregiao?.nome ?? "",
      ibge_codigo: String(m.id),
    });
    setOpen(false);
  };

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label className="text-xs">Estado (UF)</Label>
        <Select value={uf} onValueChange={handleUfChange} disabled={loadingEstados}>
          <SelectTrigger className="h-10">
            <SelectValue placeholder={loadingEstados ? "Carregando estados..." : "Selecione o estado"} />
          </SelectTrigger>
          <SelectContent className="max-h-72">
            {estados.map((e) => (
              <SelectItem key={e.id} value={e.sigla}>
                {e.nome} ({e.sigla})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Município</Label>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              role="combobox"
              disabled={!uf || loadingMunicipios}
              className="w-full justify-between h-10 font-normal"
            >
              {value?.nome ? (
                <span className="truncate">{value.nome}</span>
              ) : (
                <span className="text-muted-foreground">
                  {!uf
                    ? "Escolha um estado primeiro"
                    : loadingMunicipios
                      ? "Carregando municípios..."
                      : "Buscar município..."}
                </span>
              )}
              {loadingMunicipios ? (
                <Loader2 className="ml-2 h-4 w-4 shrink-0 animate-spin opacity-50" />
              ) : (
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
            <Command>
              <CommandInput placeholder="Digite para filtrar..." />
              <CommandList>
                <CommandEmpty>Nenhum município encontrado.</CommandEmpty>
                <CommandGroup>
                  {municipios.map((m) => (
                    <CommandItem
                      key={m.id}
                      value={m.nome}
                      onSelect={() => handleSelect(m)}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          value?.ibge_codigo === String(m.id) ? "opacity-100" : "opacity-0",
                        )}
                      />
                      <div className="flex-1">
                        <p className="text-sm">{m.nome}</p>
                        {m.microrregiao?.nome && (
                          <p className="text-[10px] text-muted-foreground">
                            {m.microrregiao.nome}
                          </p>
                        )}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {value?.regiao && (
        <p className="text-[11px] text-muted-foreground">
          Microrregião: <span className="font-medium text-foreground">{value.regiao}</span>
        </p>
      )}
    </div>
  );
}
