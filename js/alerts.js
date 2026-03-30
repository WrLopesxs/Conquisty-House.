import { isSim, temContato, temVisita, temProposta, temInteresse } from "./api.js";

const LIMITS = {
  noContact: 2,
  proposalPending: 7,
  interestNoVisit: 3,
  interestNoProposal: 4
};

const toDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export function diasParados(dataReferencia) {
  const reference = toDate(dataReferencia);
  if (!reference) return null;
  const hoje = new Date();
  return Math.floor((hoje - reference) / (1000 * 60 * 60 * 24));
}

const refDatePropostaParada = (lead) => lead.dataVisita || lead.dataLead;
const refDateInteresseSemVisita = (lead) => lead.dataLead;
const refDateInteresseSemProposta = (lead) => lead.dataVisita || lead.dataLead;
const escapeHtml = (value = "") => value
  .toString()
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;");

const buildAlert = ({ lead, priority, color, icon, level, title, description, context, days }) => ({
  priority,
  color,
  icon,
  level,
  title,
  description,
  context,
  days,
  cliente: lead.cliente,
  imovel: lead.imovel
});

export function buildAlerts(dados) {
  const alerts = [];

  dados.forEach((lead) => {
    if (!temContato(lead)) {
      const days = diasParados(lead.dataLead);
      if (days !== null && days >= LIMITS.noContact) {
        alerts.push(buildAlert({
          lead,
          priority: 1,
          color: "#9A3542",
          icon: "ph-siren",
          level: "Crítico",
          title: `${lead.cliente} · ${lead.imovel}`,
          description: `Lead sem primeiro contato há ${days} dia(s). O risco de esfriamento já é alto e pede retomada imediata.`,
          context: "Primeiro contato pendente",
          days
        }));
      }
    }

    if (temProposta(lead) && !isSim(lead.teveVenda)) {
      const days = diasParados(refDatePropostaParada(lead));
      if (days !== null && days >= LIMITS.proposalPending) {
        alerts.push(buildAlert({
          lead,
          priority: 2,
          color: "#8E5F16",
          icon: "ph-hourglass-high",
          level: "Atenção",
          title: `${lead.cliente} · ${lead.imovel}`,
          description: `Existe uma proposta sem retorno há ${days} dia(s). Vale destravar objeções e sinalizar disponibilidade do imóvel.`,
          context: "Proposta aguardando resposta",
          days
        }));
      }
    }

    if (temInteresse(lead) && !temVisita(lead)) {
      const days = diasParados(refDateInteresseSemVisita(lead));
      if (days !== null && days >= LIMITS.interestNoVisit) {
        alerts.push(buildAlert({
          lead,
          priority: 2,
          color: "#CAA24C",
          icon: "ph-calendar-check",
          level: "Oportunidade",
          title: `${lead.cliente} · ${lead.imovel}`,
          description: `O lead demonstrou interesse, mas ainda não houve visita em ${days} dia(s). Existe espaço claro para avanço do funil.`,
          context: "Interesse sem visita",
          days
        }));
      }
    }

    if (temInteresse(lead) && !temProposta(lead)) {
      const days = diasParados(refDateInteresseSemProposta(lead));
      if (days !== null && days >= LIMITS.interestNoProposal) {
        alerts.push(buildAlert({
          lead,
          priority: 3,
          color: "#2E5D79",
          icon: "ph-lightbulb",
          level: "Recomendação",
          title: `${lead.cliente} · ${lead.imovel}`,
          description: `Há interesse qualificado há ${days} dia(s), mas sem proposta registrada. Um próximo passo formal pode acelerar a decisão.`,
          context: "Interesse sem proposta",
          days
        }));
      }
    }
  });

  return alerts.sort((a, b) => a.priority - b.priority || b.days - a.days);
}

export function renderAlerts(container, alerts) {
  if (!container) return;

  if (!alerts.length) {
    container.innerHTML = '<div class="empty">Sem alertas ativos no momento.</div>';
    return;
  }

  container.innerHTML = alerts.map((alert) => `
    <article class="alert-card alert-card--priority-${alert.priority}" style="--alert-color:${alert.color}">
      <div class="alert-card-top">
        <span class="alert-level">
          <i class="ph ${alert.icon}"></i>
          ${escapeHtml(alert.level)}
        </span>
        <span class="alert-days mono">${alert.days}d</span>
      </div>
      <div class="alert-card-body">
        <div class="alert-icon">
          <i class="ph ${alert.icon}"></i>
        </div>
        <div>
          <h3>${escapeHtml(alert.title)}</h3>
          <p>${escapeHtml(alert.description)}</p>
        </div>
      </div>
      <div class="alert-card-footer">
        <span class="alert-context">${escapeHtml(alert.context)}</span>
        <button class="btn btn-outline-accent alert-action" type="button" data-query="${escapeHtml(alert.cliente)}">
          Priorizar lead
        </button>
      </div>
    </article>
  `).join("");

  container.querySelectorAll(".alert-action").forEach((button) => {
    button.addEventListener("click", () => {
      const searchInput = document.getElementById("searchInput");
      if (!searchInput) return;
      searchInput.value = button.dataset.query || "";
      searchInput.dispatchEvent(new Event("input", { bubbles: true }));
      document.querySelector(".leads-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
      searchInput.focus();
    });
  });
}
