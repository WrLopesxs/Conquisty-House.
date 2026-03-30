import { calcularStatus, isSim, temContato, temProposta, temVisita } from "./api.js";

const STATUS_COLORS = {
  Venda: { bg: "rgba(47, 106, 75, 0.14)", text: "#2F6A4B" },
  Perdido: { bg: "rgba(154, 53, 66, 0.14)", text: "#9A3542" },
  Proposta: { bg: "rgba(142, 95, 22, 0.14)", text: "#8E5F16" },
  Visita: { bg: "rgba(93, 79, 120, 0.14)", text: "#5D4F78" },
  Contato: { bg: "rgba(46, 93, 121, 0.14)", text: "#2E5D79" },
  Lead: { bg: "rgba(124, 103, 74, 0.14)", text: "#7C674A" }
};

const formatDate = (iso) => iso ? new Date(`${iso}T00:00:00`).toLocaleDateString("pt-BR") : "-";
const formatCurrency = (n) => n > 0 ? n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }) : "-";
const formatNumber = (n) => Number(n || 0).toLocaleString("pt-BR");

const escapeHtml = (value = "") => value
  .toString()
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;");

const opportunityScore = (lead) => {
  let score = 24;
  if (temContato(lead)) score += 14;
  if (temVisita(lead)) score += 22;
  if (temProposta(lead)) score += 20;
  if (isSim(lead.teveVenda)) score = 100;
  if (lead.valorImovel >= 1000000) score += 16;
  else if (lead.valorImovel >= 500000) score += 10;
  if (calcularStatus(lead) === "Perdido") score = 12;
  return Math.max(8, Math.min(100, score));
};

const noteLabel = (note) => {
  if (!note) return "Sem notas";
  return note.length > 44 ? `${note.slice(0, 41)}...` : note;
};

export function createTableController(dados, refs) {
  let sourceData = Array.isArray(dados) ? dados : [];
  let page = 1;
  let perPage = 20;
  let sortBy = "dataLead";
  let sortDir = "desc";

  const getFilters = () => ({
    q: refs.search.value.trim().toLowerCase(),
    status: refs.status.value,
    origem: refs.origem.value,
    corretor: refs.corretor ? refs.corretor.value : "",
    min: Number(refs.minValor.value || 0),
    max: Number(refs.maxValor.value || 0)
  });

  const applyFilters = () => {
    const filters = getFilters();
    return sourceData
      .filter((lead) => {
        const fullText = `${lead.cliente} ${lead.imovel}`.toLowerCase();
        if (filters.q && !fullText.includes(filters.q)) return false;
        const status = calcularStatus(lead);
        if (filters.status && status !== filters.status) return false;
        if (filters.origem && lead.origemLead !== filters.origem) return false;
        if (filters.corretor && lead.corretor !== filters.corretor) return false;
        if (filters.min && lead.valorImovel < filters.min) return false;
        if (filters.max && lead.valorImovel > filters.max) return false;
        return true;
      })
      .sort((a, b) => {
        const va = a[sortBy] ?? "";
        const vb = b[sortBy] ?? "";
        if (va < vb) return sortDir === "asc" ? -1 : 1;
        if (va > vb) return sortDir === "asc" ? 1 : -1;
        return 0;
      });
  };

  const render = () => {
    const filtered = applyFilters();
    const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
    if (page > totalPages) page = totalPages;

    const start = (page - 1) * perPage;
    const rows = filtered.slice(start, start + perPage);
    const totalValue = filtered.reduce((sum, lead) => sum + Number(lead.valorImovel || 0), 0);

    refs.tbody.innerHTML = rows.map((lead) => {
      const status = calcularStatus(lead);
      const colors = STATUS_COLORS[status] || STATUS_COLORS.Lead;
      const score = opportunityScore(lead);
      const note = escapeHtml(lead.observacoes || "");
      const cliente = escapeHtml(lead.cliente || "-");
      const imovel = escapeHtml(lead.imovel || "-");
      const corretor = escapeHtml(lead.corretor && lead.corretor !== "-" ? lead.corretor : "Carteira direta");
      const source = escapeHtml(lead.origemLead || "Nao informado");
      const situacao = escapeHtml(lead.statusContato || "-");
      const noteText = escapeHtml(noteLabel(lead.observacoes));

      return `
        <tr>
          <td>
            <div class="lead-main-cell">
              <strong class="lead-name">${cliente}</strong>
              <span class="lead-subline">${corretor}</span>
              <div class="lead-heat" aria-label="Oportunidade ${score}%"><span style="width:${score}%"></span></div>
            </div>
          </td>
          <td>
            <strong class="table-title">${imovel}</strong>
            <span class="table-subline">Score comercial ${score}%</span>
          </td>
          <td>
            <strong class="table-title">${formatDate(lead.dataLead)}</strong>
            <span class="table-subline">${lead.dataLead ? "lead registrado" : "sem data informada"}</span>
          </td>
          <td><span class="source-badge">${source}</span></td>
          <td>
            <span class="badge-status status-pill" style="background:${colors.bg};color:${colors.text}">
              <span class="status-dot"></span>
              ${status}
            </span>
          </td>
          <td class="mono">
            <strong class="table-money">${formatCurrency(lead.valorImovel)}</strong>
            <span class="table-subline">${lead.valorImovel > 0 ? "valor de referência" : "sem valor informado"}</span>
          </td>
          <td>
            <strong class="table-title">${situacao}</strong>
            <span class="table-subline">${temProposta(lead) ? "negociação formalizada" : temVisita(lead) ? "em visitação" : temContato(lead) ? "em relacionamento" : "sem atendimento"}</span>
          </td>
          <td title="${note || "Sem observacoes"}">
            <button class="table-action" type="button" ${note ? "" : "disabled"}>${noteText}</button>
          </td>
        </tr>
      `;
    }).join("");

    refs.pageInfo.textContent = `${page}/${totalPages} · ${formatNumber(filtered.length)} registros`;
    refs.prev.disabled = page <= 1;
    refs.next.disabled = page >= totalPages;

    if (refs.visibleCount) refs.visibleCount.textContent = formatNumber(filtered.length);
    if (refs.volumeValue) refs.volumeValue.textContent = totalValue > 0 ? formatCurrency(totalValue) : "Sem valor";
  };

  const unique = (arr) => [...new Set(arr)].sort();

  const refillSelect = (selectEl, values, placeholder) => {
    if (!selectEl) return;
    const current = selectEl.value;
    selectEl.innerHTML = `<option value="">${placeholder}</option>`;
    values.forEach((value) => {
      selectEl.insertAdjacentHTML("beforeend", `<option value="${value}">${value}</option>`);
    });
    if (values.includes(current)) selectEl.value = current;
  };

  const refreshOptions = () => {
    refillSelect(refs.status, unique(sourceData.map((lead) => calcularStatus(lead))), "Status");
    refillSelect(refs.origem, unique(sourceData.map((lead) => lead.origemLead)), "Origem");
    if (refs.corretor) {
      refillSelect(refs.corretor, unique(sourceData.map((lead) => lead.corretor).filter(Boolean)), "Corretor");
    }
  };

  refreshOptions();

  [refs.search, refs.status, refs.origem, refs.corretor, refs.minValor, refs.maxValor].filter(Boolean).forEach((element) => {
    element.addEventListener("input", () => {
      page = 1;
      render();
    });
    element.addEventListener("change", () => {
      page = 1;
      render();
    });
  });

  refs.prev.addEventListener("click", () => {
    page -= 1;
    render();
  });
  refs.next.addEventListener("click", () => {
    page += 1;
    render();
  });
  refs.perPage.addEventListener("change", () => {
    perPage = Number(refs.perPage.value);
    page = 1;
    render();
  });

  refs.headings.forEach((th) => {
    th.addEventListener("click", () => {
      const key = th.dataset.sort;
      if (!key) return;
      if (sortBy === key) sortDir = sortDir === "asc" ? "desc" : "asc";
      else {
        sortBy = key;
        sortDir = "asc";
      }
      render();
    });
  });

  render();

  return {
    setData(nextData) {
      sourceData = Array.isArray(nextData) ? nextData : [];
      page = 1;
      refreshOptions();
      render();
    }
  };
}
