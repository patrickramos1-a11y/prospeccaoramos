import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronsUpDown, Loader2, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";

type Municipio = {
  id: number;
  nome: string;
  microrregiao?: { nome?: string; mesorregiao?: { nome?: string } };
};

export type MunicipioSelection = {
  nome: string;
  estado: string;
  regiao: string;
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

/** Normaliza para busca sem acento. */
function norm(s: string) {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

/**
 * ScrollableList — substitui o CommandList do cmdk.
 * Usa um <div> nativo com overflow-y-auto e impede que o Radix
 * cancele eventos de roda/toque dentro do popover.
 */
function ScrollableList({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="ibge-scroll max-h-[260px] overflow-y-auto overscroll-contain p-1"
      style={{ WebkitOverflowScrolling: "touch", touchAction: "pan-y" }}
      onWheel={(e) => {
        // Garante que o scroll aconteça aqui dentro e não vaze.
        e.stopPropagation();
      }}
      onTouchMove={(e) => e.stopPropagation()}
    >
      {children}
    </div>
  );
}

export function IbgeMunicipioPicker({ value, onChange }: Props) {
  const [uf, setUf] = useState<string>(value?.estado ?? "");
  const [open, setOpen] = useState(false);
  const [ufOpen, setUfOpen] = useState(false);
  const [ufQuery, setUfQuery] = useState("");
  const [munQuery, setMunQuery] = useState("");

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
    setUfQuery("");
  };

  const handleSelect = (m: Municipio) => {
    onChange({
      nome: m.nome,
      estado: uf,
      regiao: m.microrregiao?.nome ?? m.microrregiao?.mesorregiao?.nome ?? "",
      ibge_codigo: String(m.id),
    });
    setOpen(false);
    setMunQuery("");
  };

  const selectedEstado = ESTADOS_BR.find((e) => e.sigla === uf);

  const estadosFiltrados = useMemo(() => {
    const q = norm(ufQuery.trim());
    if (!q) return ESTADOS_BR;
    return ESTADOS_BR.filter(
      (e) => norm(e.nome).includes(q) || norm(e.sigla).includes(q),
    );
  }, [ufQuery]);

  const municipiosFiltrados = useMemo(() => {
    const q = norm(munQuery.trim());
    if (!q) return municipios;
    return municipios.filter((m) => norm(m.nome).includes(q));
  }, [municipios, munQuery]);

  return (
    <div className="space-y-3">
      {/* Estado */}
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
          <PopoverContent
            className="w-[--radix-popover-trigger-width] p-0"
            align="start"
            side="bottom"
            sideOffset={4}
          >
            <div className="flex flex-col">
              <div className="flex items-center border-b px-3">
                <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                <Input
                  value={ufQuery}
                  onChange={(e) => setUfQuery(e.target.value)}
                  placeholder="Buscar estado..."
                  className="h-10 border-0 px-0 focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none"
                />
              </div>
              <ScrollableList>
                {estadosFiltrados.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    Nenhum estado encontrado.
                  </p>
                ) : (
                  estadosFiltrados.map((e) => {
                    const selected = uf === e.sigla;
                    return (
                      <button
                        type="button"
                        key={e.sigla}
                        onClick={() => handleUfChange(e.sigla)}
                        className={cn(
                          "flex w-full items-center rounded-sm px-2 py-2 text-left text-sm outline-none transition-colors",
                          "hover:bg-accent hover:text-accent-foreground",
                          selected && "bg-accent text-accent-foreground",
                        )}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            selected ? "opacity-100" : "opacity-0",
                          )}
                        />
                        {e.nome} ({e.sigla})
                      </button>
                    );
                  })
                )}
              </ScrollableList>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Município */}
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
            sideOffset={4}
          >
            <div className="flex flex-col">
              <div className="flex items-center border-b px-3">
                <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                <Input
                  value={munQuery}
                  onChange={(e) => setMunQuery(e.target.value)}
                  placeholder="Digite para filtrar..."
                  className="h-10 border-0 px-0 focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none"
                />
              </div>
              <ScrollableList>
                {municipiosFiltrados.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    {municipiosError
                      ? "Erro ao buscar municípios. Tente novamente."
                      : "Nenhum município encontrado."}
                  </p>
                ) : (
                  municipiosFiltrados.map((m) => {
                    const selected = value?.ibge_codigo === String(m.id);
                    return (
                      <button
                        type="button"
                        key={m.id}
                        onClick={() => handleSelect(m)}
                        className={cn(
                          "flex w-full items-center rounded-sm px-2 py-2 text-left outline-none transition-colors",
                          "hover:bg-accent hover:text-accent-foreground",
                          selected && "bg-accent text-accent-foreground",
                        )}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4 shrink-0",
                            selected ? "opacity-100" : "opacity-0",
                          )}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm truncate">{m.nome}</p>
                          {m.microrregiao?.nome && (
                            <p className="text-[10px] text-muted-foreground truncate">
                              {m.microrregiao.nome}
                            </p>
                          )}
                        </div>
                      </button>
                    );
                  })
                )}
              </ScrollableList>
            </div>
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
