import { calcularStatus, temContato, temVisita, temProposta } from "./api.js";

let chartRegistry = [];

const destroyCharts = () => {
  chartRegistry.forEach((chart) => chart.destroy());
  chartRegistry = [];
};

const groupCount = (arr, keyFn) => arr.reduce((acc, item) => {
  const key = keyFn(item) || "Nao informado";
  acc[key] = (acc[key] || 0) + 1;
  return acc;
}, {});

const cssVar = (name, fallback) => {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
};

const buildPalette = (count) => {
  const palette = [
    "#CAA24C",
    "#E1C57C",
    "#8E5F16",
    "#2F6A4B",
    "#2E5D79",
    "#5D4F78",
    "#9A3542",
    "#7C674A"
  ];
  return Array.from({ length: count }, (_, index) => palette[index % palette.length]);
};

const formatMonthLabel = (value) => {
  if (!value || value === "Sem data") return value;
  const [year, month] = value.split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
};

const topEntry = (grouped, formatter = (key) => key) => {
  const [label, value] = Object.entries(grouped).sort((a, b) => b[1] - a[1])[0] || [];
  return {
    topLabel: label ? formatter(label) : "",
    topValue: value || 0
  };
};

const baseFont = cssVar("--font-body", "DM Sans, sans-serif");
const textPrimary = cssVar("--text-primary", "#231d16");
const textSecondary = cssVar("--text-secondary", "#655b4d");
const accent = cssVar("--accent", "#CAA24C");
const accentDark = cssVar("--accent-dark", "#8A6A22");
const gridColor = "rgba(124, 99, 53, 0.10)";

if (typeof Chart !== "undefined") {
  Chart.defaults.font.family = baseFont;
  Chart.defaults.color = textSecondary;
  Chart.defaults.plugins.legend.labels.usePointStyle = true;
  Chart.defaults.plugins.legend.labels.boxWidth = 10;
  Chart.defaults.plugins.legend.labels.padding = 18;
  Chart.defaults.elements.arc.borderWidth = 0;
  Chart.defaults.elements.bar.borderRadius = 10;
  Chart.defaults.plugins.tooltip.backgroundColor = "rgba(35, 29, 22, 0.92)";
  Chart.defaults.plugins.tooltip.titleColor = "#FFF9F0";
  Chart.defaults.plugins.tooltip.bodyColor = "#FFF9F0";
  Chart.defaults.plugins.tooltip.padding = 12;
  Chart.defaults.plugins.tooltip.displayColors = false;
}

export function buildFunnelData(dados) {
  const count = (predicate) => dados.filter(predicate).length;
  const total = dados.length;
  const contato = count((lead) => temContato(lead));
  const visita = count((lead) => temVisita(lead));
  const proposta = count((lead) => temProposta(lead));
  const venda = count((lead) => calcularStatus(lead) === "Venda");
  const perdido = count((lead) => calcularStatus(lead) === "Perdido");
  return { total, contato, visita, proposta, venda, perdido };
}

export function renderCharts(dados) {
  destroyCharts();

  const funnel = buildFunnelData(dados);
  const funnelCanvas = document.getElementById("funnelChart");
  const originCanvas = document.getElementById("origemChart");
  const monthCanvas = document.getElementById("mesChart");
  const statusCanvas = document.getElementById("statusChart");

  const originGrouped = groupCount(dados, (lead) => lead.origemLead);
  const monthGrouped = groupCount(dados, (lead) => (lead.dataLead ? lead.dataLead.slice(0, 7) : "Sem data"));
  const statusGrouped = groupCount(dados, (lead) => lead.statusContato);

  if (funnelCanvas) {
    const ctx = funnelCanvas.getContext("2d");
    const gradient = ctx.createLinearGradient(0, 0, funnelCanvas.width || 480, 0);
    gradient.addColorStop(0, accentDark);
    gradient.addColorStop(0.45, accent);
    gradient.addColorStop(1, "#F0DB98");

    chartRegistry.push(new Chart(funnelCanvas, {
      type: "bar",
      data: {
        labels: ["Lead", "Contato", "Visita", "Proposta", "Venda", "Perdido"],
        datasets: [{
          data: [funnel.total, funnel.contato, funnel.visita, funnel.proposta, funnel.venda, funnel.perdido],
          backgroundColor: [
            gradient,
            "#D8B86B",
            "#B99647",
            "#8E5F16",
            "#2F6A4B",
            "#9A3542"
          ],
          maxBarThickness: 24
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: "y",
        plugins: {
          legend: { display: false }
        },
        scales: {
          x: {
            beginAtZero: true,
            grid: { color: gridColor, drawBorder: false },
            ticks: { color: textSecondary }
          },
          y: {
            grid: { display: false, drawBorder: false },
            ticks: { color: textPrimary }
          }
        }
      }
    }));
  }

  if (originCanvas) {
    chartRegistry.push(new Chart(originCanvas, {
      type: "doughnut",
      data: {
        labels: Object.keys(originGrouped),
        datasets: [{
          data: Object.values(originGrouped),
          backgroundColor: buildPalette(Object.keys(originGrouped).length)
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "66%",
        plugins: {
          legend: {
            position: "bottom",
            labels: { color: textSecondary }
          }
        }
      }
    }));
  }

  if (monthCanvas) {
    const labels = Object.keys(monthGrouped).sort();
    chartRegistry.push(new Chart(monthCanvas, {
      type: "bar",
      data: {
        labels: labels.map(formatMonthLabel),
        datasets: [{
          label: "Leads",
          data: labels.map((label) => monthGrouped[label]),
          backgroundColor: buildPalette(labels.length).map((color, index) => index === labels.length - 1 ? accentDark : color)
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          x: {
            grid: { display: false, drawBorder: false },
            ticks: { color: textSecondary }
          },
          y: {
            beginAtZero: true,
            grid: { color: gridColor, drawBorder: false },
            ticks: { color: textSecondary }
          }
        }
      }
    }));
  }

  if (statusCanvas) {
    chartRegistry.push(new Chart(statusCanvas, {
      type: "pie",
      data: {
        labels: Object.keys(statusGrouped),
        datasets: [{
          data: Object.values(statusGrouped),
          backgroundColor: buildPalette(Object.keys(statusGrouped).length)
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "bottom",
            labels: { color: textSecondary }
          }
        }
      }
    }));
  }

  return {
    funnel,
    origin: topEntry(originGrouped),
    month: topEntry(monthGrouped, formatMonthLabel),
    status: topEntry(statusGrouped)
  };
}
