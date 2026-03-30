const API_BASE = window.CONQUIST_API_BASE || "https://script.google.com/macros/s/AKfycbwQwNfA5MU9GBj_ZO-BpHj4Nw6BZYtgUqqNQN8oPJ9G1cSsEW4RTdkhC9wSk88sRb_z/exec";

const txt = (v) => (v ?? "").toString().trim();
const cap = (v) => {
  const s = txt(v);
  return s ? `${s[0].toUpperCase()}${s.slice(1).toLowerCase()}` : "";
};

const normalizeKey = (v) => txt(v)
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase();

const toISODate = (v) => {
  const s = txt(v);
  if (!s) return null;
  const br = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (br) return `${br[3]}-${br[2]}-${br[1]}`;
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const guess = new Date(s);
  return Number.isNaN(guess.getTime()) ? null : guess.toISOString().slice(0, 10);
};

const toCurrencyNumber = (v) => {
  const s = txt(v).replace(/\s/g, "").replace(/^R\$/, "");
  if (!s) return 0;
  if (s.includes(",")) {
    const normalized = s.replace(/\./g, "").replace(",", ".");
    const n = Number(normalized);
    return Number.isFinite(n) ? n : 0;
  }
  const n = Number(s.replace(/\./g, ""));
  return Number.isFinite(n) ? n : 0;
};

const normalizeYesNo = (v) => {
  const n = normalizeKey(v);
  if (n === "sim") return "Sim";
  if (n === "nao") return "Nao";
  return "";
};

export const isSim = (v) => normalizeYesNo(v) === "Sim";
export const isNao = (v) => normalizeYesNo(v) === "Nao";

export const temContato = (lead = {}) => txt(lead.primeiroContato) !== "";
export const temVisita = (lead = {}) => !!lead.dataVisita || isSim(lead.marcouVisita);
export const temProposta = (lead = {}) => isSim(lead.propostaRecebida);
export const temInteresse = (lead = {}) => {
  const n = normalizeKey(lead.interessePosVisita);
  return n === "alto" || n === "medio";
};

export function normalizarLead(raw = {}) {
  const primeiroContato = txt(raw.primeiroContato ?? raw["primeiroContato"] ?? raw["primeiro_contato"]);
  const propostaRecebida = normalizeYesNo(raw.propostaRecebida ?? raw.proposta);
  const marcouVisita = normalizeYesNo(raw.marcouVisita);
  const statusPrimeiroContato = txt(raw.statusPrimeiroContato ?? raw.statusContato);
  const statusNegociacao = txt(raw.statusNegociacao);

  return {
    ...raw,
    dataLead: toISODate(raw.dataLead),
    cliente: txt(raw.cliente || raw.nomeCliente) || "-",
    telefoneWhatsapp: txt(raw.telefoneWhatsapp || raw.telefone),
    origemLead: cap(raw.origemLead) || "Nao informado",
    imovel: txt(raw.imovel) || "-",
    corretor: txt(raw.corretor) || "-",
    primeiroContato,
    statusPrimeiroContato,
    statusContato: statusPrimeiroContato || statusNegociacao || "Nao informado",
    marcouVisita,
    dataVisita: toISODate(raw.dataVisita),
    interessePosVisita: cap(raw.interessePosVisita),
    propostaRecebida,
    statusNegociacao,
    valorImovel: toCurrencyNumber(raw.valorImovel),
    teveVenda: normalizeYesNo(raw.teveVenda),
    observacoes: txt(raw.observacoes)
  };
}

export function calcularStatus(lead = {}) {
  if (isSim(lead.teveVenda)) return "Venda";
  if (isNao(lead.teveVenda)) return "Perdido";
  if (temProposta(lead)) return "Proposta";
  if (temVisita(lead)) return "Visita";
  if (temContato(lead)) return "Contato";
  return "Lead";
}

export async function fetchCorretorData(corretor) {
  if (API_BASE.includes("SEU_DEPLOY_ID")) {
    throw new Error("Configure window.CONQUIST_API_BASE com a URL do seu Apps Script publicado.");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const url = `${API_BASE}?corretor=${encodeURIComponent(corretor)}`;
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timeout);
  }
}

export function prepararDados(payload = {}) {
  const dados = Array.isArray(payload.dados) ? payload.dados : [];
  return {
    ...payload,
    corretor: payload.corretor || "Corretor",
    atualizadoEm: payload.atualizadoEm || new Date().toISOString(),
    dados: dados.map(normalizarLead)
  };
}
