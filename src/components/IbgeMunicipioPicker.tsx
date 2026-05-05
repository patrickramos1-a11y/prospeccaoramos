import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";

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

const ESTADOS_BR = [
  { sigla: "AC", nome: "Acre" }, { sigla: "AL", nome: "Alagoas" },
  { sigla: "AP", nome: "Amapá" }, { sigla: "AM", nome: "Amazonas" },
  { sigla: "BA", nome: "Bahia" }, { sigla: "CE", nome: "Ceará" },
  { sigla: "DF", nome: "Distrito Federal" }, { sigla: "ES", nome: "Espírito Santo" },
  { sigla: "GO", nome: "Goiás" }, { sigla: "MA", nome: "Maranhão" },
  { sigla: "MT", nome: "Mato Grosso" }, { sigla: "MS", nome: "Mato Grosso do Sul" },
  { sigla: "MG", nome: "Minas Gerais" }, { sigla: "PA", nome: "Pará" },
  { sigla: "PB", nome: "Paraíba" }, { sigla: "PR", nome: "Paraná" },
  { sigla: "PE", nome: "Pernambuco" }, { sigla: "PI", nome: "Piauí" },
  { sigla: "RJ", nome: "Rio de Janeiro" }, { sigla: "RN", nome: "Rio Grande do Norte" },
  { sigla: "RS", nome: "Rio Grande do Sul" }, { sigla: "RO", nome: "Rondônia" },
  { sigla: "RR", nome: "Roraima" }, { sigla: "SC", nome: "Santa Catarina" },
  { sigla: "SP", nome: "São Paulo" }, { sigla: "SE", nome: "Sergipe" },
  { sigla: "TO", nome: "Tocantins" },
].sort((a, b) => a.nome.localeCompare(b.nome));

async function fetchMunicipios(uf: string): Promise<Municipio[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(
      `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios`,
      { signal: controller.signal },
    );
    if (!res.ok) throw new Error("Falha ao carregar municípios");
    return res.json();
  } finally {
    clearTimeout(timeout);
  }
}

export function IbgeMunicipioPicker({ value, onChange }: Props) {
  const [uf, setUf] = useState<string>(value?.estado ?? "");
  const [open, setOpen] = useState(false);
  const [ufOpen, setUfOpen] = useState(false);

  useEffect(() => {
    if (value?.estado) setUf(value.estado);
  }, [value?.estado]);

  const { data: municipios = [], isLoading: loadingMunicipios, isError: municipiosError } = useQuery({
    queryKey: ["ibge-municipios", uf],
    queryFn: () => fetchMunicipios(uf),
    enabled: !!uf,
    staleTime: 1000 * 60 * 60 * 24,
    retry: 1,
  });

  const handleUfChange = (newUf: string) => {
    setUf(newUf);
    onChange(null);
    setUfOpen(false);
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

  const selectedEstado = ESTADOS_BR.find((e) => e.sigla === uf);

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label className="text-xs">Estado (UF)</Label>
        <Popover open={ufOpen} onOpenChange={setUfOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              role="combobox"
              className="w-full justify-between h-10 font-normal"
            >
              {selectedEstado ? (
                <span>{selectedEstado.nome} ({selectedEstado.sigla})</span>
              ) : (
                <span className="text-muted-foreground">Selecione o estado</span>
              )}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
            <Command>
              <CommandInput placeholder="Buscar estado..." />
              <CommandList>
                <CommandEmpty>Nenhum estado encontrado.</CommandEmpty>
                <CommandGroup>
                  {ESTADOS_BR.map((e) => (
                    <CommandItem
                      key={e.sigla}
                      value={`${e.nome} ${e.sigla}`}
                      onSelect={() => handleUfChange(e.sigla)}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          uf === e.sigla ? "opacity-100" : "opacity-0",
                        )}
                      />
                      {e.nome} ({e.sigla})
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
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
                      : municipiosError
                        ? "Não foi possível carregar"
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
          <PopoverContent
            className="w-[--radix-popover-trigger-width] p-0"
            align="start"
            side="bottom"
            avoidCollisions={false}
          >
            <Command shouldFilter>
              <CommandInput placeholder="Digite para filtrar..." />
              <CommandList className="max-h-[260px] min-h-0 overflow-y-auto overscroll-contain">
                <CommandEmpty>
                  {municipiosError ? "Erro ao buscar municípios. Tente novamente." : "Nenhum município encontrado."}
                </CommandEmpty>
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
