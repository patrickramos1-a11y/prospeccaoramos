import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Landmark, Users } from "lucide-react";
import Orgaos from "./Orgaos";
import Contatos from "./Contatos";

export default function OrgaosHub() {
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") === "contatos" ? "contatos" : "orgaos";

  return (
    <div className="page-shell pb-0 animate-fade-in">
      <Tabs
        value={tab}
        onValueChange={(v) => {
          const next = new URLSearchParams(params);
          if (v === "contatos") next.set("tab", "contatos");
          else next.delete("tab");
          setParams(next, { replace: true });
        }}
      >
        <TabsList className="toolbar grid grid-cols-2 w-full sm:w-auto sm:inline-grid">
          <TabsTrigger value="orgaos" className="gap-2 text-xs">
            <Landmark className="w-3.5 h-3.5" /> Órgãos
          </TabsTrigger>
          <TabsTrigger value="contatos" className="gap-2 text-xs">
            <Users className="w-3.5 h-3.5" /> Contatos
          </TabsTrigger>
        </TabsList>
        <TabsContent value="orgaos" className="mt-0 -mx-4 lg:-mx-6">
          <Orgaos />
        </TabsContent>
        <TabsContent value="contatos" className="mt-0 -mx-4 lg:-mx-6">
          <Contatos />
        </TabsContent>
      </Tabs>
    </div>
  );
}
