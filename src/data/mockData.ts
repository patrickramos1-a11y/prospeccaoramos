// Shared mock data for the Ramos Prospecting Platform

export const MUNICIPIOS = [
  { id: 1, nome: "Castanhal", estado: "PA", regiao: "Nordeste Paraense", status: "visitado", prioridade: "alta", responsavel: "Carlos M.", score: 17, abertura: 4, potencial: 4, relacionamento: 3, facilidade: 3, ultimaVisita: "2024-03-10", contatos: 3, documentos: 2, custoTotal: 480, hasCliente: false },
  { id: 2, nome: "Benevides", estado: "PA", regiao: "Região Metropolitana", status: "planejado", prioridade: "alta", responsavel: "Ana P.", score: 15, abertura: 3, potencial: 5, relacionamento: 2, facilidade: 3, ultimaVisita: null, contatos: 1, documentos: 0, custoTotal: 0, hasCliente: false },
  { id: 3, nome: "Santa Izabel do Pará", estado: "PA", regiao: "Região Metropolitana", status: "em andamento", prioridade: "média", responsavel: "Carlos M.", score: 13, abertura: 3, potencial: 3, relacionamento: 3, facilidade: 2, ultimaVisita: "2024-03-05", contatos: 2, documentos: 1, custoTotal: 320, hasCliente: true },
  { id: 4, nome: "Marituba", estado: "PA", regiao: "Região Metropolitana", status: "não iniciado", prioridade: "baixa", responsavel: null, score: 8, abertura: 0, potencial: 2, relacionamento: 0, facilidade: 3, ultimaVisita: null, contatos: 0, documentos: 0, custoTotal: 0, hasCliente: false },
  { id: 5, nome: "Ananindeua", estado: "PA", regiao: "Região Metropolitana", status: "visitado", prioridade: "alta", responsavel: "Ana P.", score: 19, abertura: 5, potencial: 5, relacionamento: 4, facilidade: 4, ultimaVisita: "2024-03-12", contatos: 5, documentos: 4, custoTotal: 650, hasCliente: true },
  { id: 6, nome: "São Francisco do Pará", estado: "PA", regiao: "Nordeste Paraense", status: "planejado", prioridade: "média", responsavel: "Lucas S.", score: 11, abertura: 0, potencial: 3, relacionamento: 0, facilidade: 4, ultimaVisita: null, contatos: 0, documentos: 0, custoTotal: 0, hasCliente: false },
  { id: 7, nome: "Bragança", estado: "PA", regiao: "Nordeste Paraense", status: "visitado", prioridade: "média", responsavel: "Lucas S.", score: 14, abertura: 3, potencial: 4, relacionamento: 3, facilidade: 2, ultimaVisita: "2024-02-28", contatos: 2, documentos: 3, custoTotal: 580, hasCliente: false },
  { id: 8, nome: "Capanema", estado: "PA", regiao: "Nordeste Paraense", status: "não iniciado", prioridade: "baixa", responsavel: null, score: 7, abertura: 0, potencial: 2, relacionamento: 0, facilidade: 2, ultimaVisita: null, contatos: 0, documentos: 0, custoTotal: 0, hasCliente: false },
  { id: 9, nome: "Igarapé-Açu", estado: "PA", regiao: "Nordeste Paraense", status: "em andamento", prioridade: "alta", responsavel: "Carlos M.", score: 16, abertura: 4, potencial: 4, relacionamento: 3, facilidade: 3, ultimaVisita: "2024-03-08", contatos: 2, documentos: 1, custoTotal: 410, hasCliente: false },
  { id: 10, nome: "Paragominas", estado: "PA", regiao: "Sudeste Paraense", status: "planejado", prioridade: "alta", responsavel: "Ana P.", score: 18, abertura: 0, potencial: 5, relacionamento: 2, facilidade: 4, ultimaVisita: null, contatos: 1, documentos: 0, custoTotal: 0, hasCliente: false },
  { id: 11, nome: "Dom Eliseu", estado: "PA", regiao: "Sudeste Paraense", status: "não iniciado", prioridade: "média", responsavel: null, score: 10, abertura: 0, potencial: 3, relacionamento: 0, facilidade: 3, ultimaVisita: null, contatos: 0, documentos: 0, custoTotal: 0, hasCliente: false },
  { id: 12, nome: "Moju", estado: "PA", regiao: "Baixo Tocantins", status: "visitado", prioridade: "média", responsavel: "Lucas S.", score: 12, abertura: 2, potencial: 3, relacionamento: 3, facilidade: 2, ultimaVisita: "2024-02-20", contatos: 3, documentos: 2, custoTotal: 520, hasCliente: false },
];

export const VISITAS = [
  { id: 1, municipioId: 1, municipio: "Castanhal", tipo: "Primeira abordagem", status: "concluída", data: "2024-03-10", responsavel: "Carlos M.", checklist: 100, kits: ["Kit Operacional x2", "Kit Institucional x1"], custo: 480, contatos: 3 },
  { id: 2, municipioId: 5, municipio: "Ananindeua", tipo: "Retorno", status: "concluída", data: "2024-03-12", responsavel: "Ana P.", checklist: 95, kits: ["Kit Operacional x3"], custo: 650, contatos: 5 },
  { id: 3, municipioId: 3, municipio: "Santa Izabel do Pará", tipo: "Coleta documental", status: "em andamento", data: "2024-03-05", responsavel: "Carlos M.", checklist: 70, kits: ["Kit Operacional x1"], custo: 320, contatos: 2 },
  { id: 4, municipioId: 9, municipio: "Igarapé-Açu", tipo: "Primeira abordagem", status: "em andamento", data: "2024-03-08", responsavel: "Carlos M.", checklist: 60, kits: ["Kit Operacional x2"], custo: 410, contatos: 2 },
  { id: 5, municipioId: 7, municipio: "Bragança", tipo: "Primeira abordagem", status: "concluída", data: "2024-02-28", responsavel: "Lucas S.", checklist: 100, kits: ["Kit Operacional x1", "Kit Institucional x1"], custo: 580, contatos: 2 },
  { id: 6, municipioId: 12, municipio: "Moju", tipo: "Primeira abordagem", status: "concluída", data: "2024-02-20", responsavel: "Lucas S.", checklist: 90, kits: ["Kit Operacional x2"], custo: 520, contatos: 3 },
  { id: 7, municipioId: 2, municipio: "Benevides", tipo: "Primeira abordagem", status: "planejada", data: "2024-03-22", responsavel: "Ana P.", checklist: 0, kits: [], custo: 0, contatos: 0 },
  { id: 8, municipioId: 6, municipio: "São Francisco do Pará", tipo: "Primeira abordagem", status: "planejada", data: "2024-03-25", responsavel: "Lucas S.", checklist: 0, kits: [], custo: 0, contatos: 0 },
  { id: 9, municipioId: 10, municipio: "Paragominas", tipo: "Primeira abordagem", status: "planejada", data: "2024-04-02", responsavel: "Ana P.", checklist: 0, kits: [], custo: 0, contatos: 0 },
];

export const CONTATOS = [
  { id: 1, nome: "Maria Santos", cargo: "Secretária Municipal", setor: "Secretaria de Meio Ambiente", municipio: "Ananindeua", telefone: "(91) 98811-2233", email: "maria.santos@ananindeua.pa.gov.br", nivel: "Decisor", whatsapp: true },
  { id: 2, nome: "João Pereira", cargo: "Técnico Ambiental", setor: "Departamento de Licenciamento", municipio: "Ananindeua", telefone: "(91) 98234-5678", email: "joao.pereira@ananindeua.pa.gov.br", nivel: "Relevante", whatsapp: true },
  { id: 3, nome: "Fernanda Lima", cargo: "Agente de Protocolo", setor: "Protocolo Geral", municipio: "Castanhal", telefone: "(91) 97788-9900", email: "", nivel: "Básico", whatsapp: false },
  { id: 4, nome: "Ricardo Alves", cargo: "Coordenador de Licenciamento", setor: "Sec. de Meio Ambiente", municipio: "Castanhal", telefone: "(91) 99901-1122", email: "ricardo.alves@castanhal.pa.gov.br", nivel: "Decisor", whatsapp: true },
  { id: 5, nome: "Patricia Costa", cargo: "Técnica", setor: "Sec. de Meio Ambiente", municipio: "Santa Izabel do Pará", telefone: "(91) 98445-6677", email: "", nivel: "Básico", whatsapp: false },
  { id: 6, nome: "Eduardo Moraes", cargo: "Secretário Municipal", setor: "Secretaria de Meio Ambiente", municipio: "Bragança", telefone: "(91) 99234-0011", email: "edu.moraes@braganca.pa.gov.br", nivel: "Decisor", whatsapp: true },
  { id: 7, nome: "Simone Neves", cargo: "Técnica Ambiental", setor: "Licenciamento", municipio: "Igarapé-Açu", telefone: "(91) 98556-7788", email: "simone@igarapeacu.pa.gov.br", nivel: "Relevante", whatsapp: true },
  { id: 8, nome: "Carlos Roque", cargo: "Agente", setor: "Protocolo", municipio: "Moju", telefone: "(91) 99345-2233", email: "", nivel: "Básico", whatsapp: false },
];

export const ESTOQUE_ITENS = [
  { id: 1, nome: "Cartão de Visita Ramos", categoria: "Papelaria", unidade: "unidade", saldoAtual: 340, minimo: 100, ideal: 500, custoUnitario: 0.35, fornecedor: "Gráfica Central", alerta: false },
  { id: 2, nome: "Caneta Personalizada", categoria: "Brinde", unidade: "unidade", saldoAtual: 45, minimo: 50, ideal: 200, custoUnitario: 2.10, fornecedor: "Brindes SP", alerta: true },
  { id: 3, nome: "Régua 30cm", categoria: "Brinde", unidade: "unidade", saldoAtual: 80, minimo: 40, ideal: 150, custoUnitario: 1.80, fornecedor: "Brindes SP", alerta: false },
  { id: 4, nome: "Mini Folder", categoria: "Papelaria", unidade: "unidade", saldoAtual: 120, minimo: 80, ideal: 300, custoUnitario: 0.60, fornecedor: "Gráfica Central", alerta: false },
  { id: 5, nome: "Folder Institucional A4", categoria: "Papelaria", unidade: "unidade", saldoAtual: 25, minimo: 50, ideal: 200, custoUnitario: 1.20, fornecedor: "Gráfica Central", alerta: true },
  { id: 6, nome: "Imã Geladeira", categoria: "Brinde", unidade: "unidade", saldoAtual: 180, minimo: 60, ideal: 250, custoUnitario: 0.90, fornecedor: "Brindes SP", alerta: false },
  { id: 7, nome: "Chiclete Trident", categoria: "Brinde", unidade: "pacote", saldoAtual: 95, minimo: 50, ideal: 200, custoUnitario: 0.80, fornecedor: "Distribuidor Local", alerta: false },
  { id: 8, nome: "Saquinho Zip", categoria: "Embalagem", unidade: "unidade", saldoAtual: 200, minimo: 100, ideal: 400, custoUnitario: 0.25, fornecedor: "Embalagens Pará", alerta: false },
  { id: 9, nome: "Caixa Institucional", categoria: "Embalagem", unidade: "unidade", saldoAtual: 18, minimo: 20, ideal: 60, custoUnitario: 8.50, fornecedor: "Embalagens Pará", alerta: true },
  { id: 10, nome: "Bloco Personalizado", categoria: "Papelaria", unidade: "unidade", saldoAtual: 35, minimo: 20, ideal: 80, custoUnitario: 4.20, fornecedor: "Gráfica Central", alerta: false },
];

export const KITS = [
  {
    id: 1,
    nome: "Kit Operacional",
    tipo: "Técnicos / Protocolo",
    descricao: "Saquinho fino com itens úteis para entrega a técnicos e atendentes de protocolo",
    ativo: true,
    itens: [
      { item: "Cartão de Visita Ramos", qtd: 2 },
      { item: "Caneta Personalizada", qtd: 1 },
      { item: "Régua 30cm", qtd: 1 },
      { item: "Chiclete Trident", qtd: 1 },
      { item: "Imã Geladeira", qtd: 2 },
      { item: "Saquinho Zip", qtd: 1 },
    ],
    custoEstimado: 7.25,
    montados: 50,
    disponiveis: 22,
    usados: 26,
  },
  {
    id: 2,
    nome: "Kit Institucional",
    tipo: "Secretário / Gestor",
    descricao: "Caixa estruturada de apresentação para o secretário municipal",
    ativo: true,
    itens: [
      { item: "Cartão de Visita Ramos", qtd: 5 },
      { item: "Folder Institucional A4", qtd: 2 },
      { item: "Caneta Personalizada", qtd: 2 },
      { item: "Bloco Personalizado", qtd: 1 },
      { item: "Caixa Institucional", qtd: 1 },
    ],
    custoEstimado: 24.80,
    montados: 20,
    disponiveis: 8,
    usados: 12,
  },
];

export const ALERTAS = [
  { id: 1, tipo: "estoque", urgencia: "alta", mensagem: "Caneta Personalizada abaixo do estoque mínimo (45 / mín. 50)", acao: "Repor Estoque" },
  { id: 2, tipo: "estoque", urgencia: "alta", mensagem: "Folder Institucional A4 abaixo do mínimo (25 / mín. 50)", acao: "Repor Estoque" },
  { id: 3, tipo: "estoque", urgencia: "média", mensagem: "Caixa Institucional quase no limite mínimo (18 / mín. 20)", acao: "Verificar" },
  { id: 4, tipo: "visita", urgencia: "média", mensagem: "Visita em Santa Izabel — checklist 70% — faltam 3 itens", acao: "Ver Visita" },
  { id: 5, tipo: "followup", urgencia: "baixa", mensagem: "Follow-up pendente: Bragança — última visita há 22 dias", acao: "Agendar" },
];

export const getScoreLabel = (score: number) => {
  if (score >= 18) return { label: "Altíssimo", color: "score-high" };
  if (score >= 14) return { label: "Promissor", color: "score-high" };
  if (score >= 10) return { label: "Monitorar", color: "score-medium" };
  return { label: "Baixa prioridade", color: "score-low" };
};

export const getStatusClass = (status: string) => {
  switch (status) {
    case "visitado": return "status-visited";
    case "em andamento": return "status-in-progress";
    case "planejado": return "status-planned";
    case "concluída": return "status-visited";
    case "planejada": return "status-planned";
    case "cancelada": return "status-alert";
    default: return "status-inactive";
  }
};

export const getStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    "visitado": "Visitado",
    "em andamento": "Em Andamento",
    "planejado": "Planejado",
    "não iniciado": "Não Iniciado",
    "concluída": "Concluída",
    "planejada": "Planejada",
    "cancelada": "Cancelada",
  };
  return labels[status] ?? status;
};
