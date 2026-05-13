import { useEffect, useMemo, useState } from "react";
import GestaoShell from "../components/gestao/GestaoShell";
import StatCard from "../components/gestao/StatCard";
import {
  fetchDashboardContractsHistory,
  fetchDashboardMetricDetails,
  fetchDashboardMetrics,
  type DashboardContractDetail,
  type DashboardContractsHistory,
  type DashboardContractsHistoryRow,
  type DashboardMetricDetails,
  type DashboardMetrics,
  type DashboardOpenLessonsGroup,
} from "../services/dashboard";

import dashboardIcon from "../assets/icons/dashboard-svgrepo-com.svg";
import fileAltIcon from "../assets/icons/file-alt-svgrepo-com.svg";
import warningIcon from "../assets/icons/warning-circle-svgrepo-com.svg";
import eyeIcon from "../assets/icons/eye-show-svgrepo-com.svg";

import "./GestaoHomePage.css";

type DetailMetricKey = "new-contracts" | "ending-contracts" | "open-lessons";
type HistoryRange = "3m" | "6m" | "12m" | "school-year";
type SeriesKey = "active_contracts_total" | "new_contracts_total" | "ending_contracts_total";

const RANGE_OPTIONS: Array<{ key: HistoryRange; label: string }> = [
  { key: "3m", label: "3 meses" },
  { key: "6m", label: "6 meses" },
  { key: "12m", label: "12 meses" },
  { key: "school-year", label: "Ano letivo" },
];

const CHART_SERIES: Array<{ key: SeriesKey; label: string; colorClass: string; color: string }> = [
  {
    key: "active_contracts_total",
    label: "Contratos ativos",
    colorClass: "is-blue",
    color: "#3b82f6",
  },
  {
    key: "new_contracts_total",
    label: "Novos contratos",
    colorClass: "is-green",
    color: "#22c55e",
  },
  {
    key: "ending_contracts_total",
    label: "Contratos encerrados",
    colorClass: "is-red",
    color: "#ef4444",
  },
];

function formatPercent(value: number) {
  const formatted = Math.abs(value).toFixed(1).replace(".", ",");
  return `${value >= 0 ? "+" : "-"}${formatted}% vs mês anterior`;
}

function formatDate(value?: string) {
  if (!value) return "—";
  const normalized = value.replace(" ", "T").slice(0, 10);
  const [year, month, day] = normalized.split("-");
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
}

function formatDateTime(value: string) {
  const normalized = value.replace(" ", "T");
  const date = normalized.slice(0, 10);
  const time = normalized.slice(11, 16);
  const [year, month, day] = date.split("-");
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}, ${time}`;
}

function formatContractCode(id: number) {
  return `C${String(id).padStart(3, "0")}`;
}

function buildLinePoints(rows: DashboardContractsHistoryRow[], accessor: (row: DashboardContractsHistoryRow) => number) {
  if (!rows.length) return "";

  const maxValue = Math.max(...rows.map(accessor), 1);
  const width = 100;
  const height = 100;

  return rows
    .map((row, index) => {
      const x = rows.length === 1 ? width / 2 : (index / (rows.length - 1)) * width;
      const y = height - (accessor(row) / maxValue) * height;
      return `${x},${y}`;
    })
    .join(" ");
}

function buildChartPoints(rows: DashboardContractsHistoryRow[], accessor: (row: DashboardContractsHistoryRow) => number) {
  if (!rows.length) return [];

  const maxValue = Math.max(...rows.map(accessor), 1);

  return rows.map((row, index) => {
    const x = rows.length === 1 ? 50 : (index / (rows.length - 1)) * 100;
    const y = 100 - (accessor(row) / maxValue) * 100;

    return {
      row,
      x,
      y,
      value: accessor(row),
    };
  });
}

function formatChartTotal(history: DashboardContractsHistory | null, key: SeriesKey) {
  if (!history?.rows.length) return "0";
  const last = history.rows[history.rows.length - 1];
  return String(last[key]);
}

export default function GestaoHomePage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDetail, setSelectedDetail] = useState<DetailMetricKey | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsCache, setDetailsCache] = useState<Partial<Record<DetailMetricKey, DashboardMetricDetails>>>({});
  const [historyRange, setHistoryRange] = useState<HistoryRange>("3m");
  const [historyLoading, setHistoryLoading] = useState(true);
  const [history, setHistory] = useState<DashboardContractsHistory | null>(null);
  const [historyError, setHistoryError] = useState("");
  const [hoveredPoint, setHoveredPoint] = useState<{
    label: string;
    value: number;
    seriesLabel: string;
    x: number;
    y: number;
    isNearTop: boolean;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const data = await fetchDashboardMetrics();
        if (!cancelled) {
          setMetrics(data);
        }
      } catch (error) {
        console.error("Erro ao carregar métricas do dashboard:", error);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadHistory() {
      setHistoryLoading(true);
      setHistoryError("");
      try {
        const response = await fetchDashboardContractsHistory(historyRange);
        if (!cancelled) {
          setHistory(response);
        }
      } catch (error) {
        console.error("Erro ao carregar histórico de contratos:", error);
        if (!cancelled) {
          setHistory(null);
          setHistoryError("Não foi possível carregar a evolução dos contratos.");
        }
      } finally {
        if (!cancelled) {
          setHistoryLoading(false);
        }
      }
    }

    void loadHistory();

    return () => {
      cancelled = true;
    };
  }, [historyRange]);

  async function handleOpenDetails(metricKey: DetailMetricKey) {
    setSelectedDetail(metricKey);

    if (detailsCache[metricKey]) {
      return;
    }

    setDetailsLoading(true);
    try {
      const data = await fetchDashboardMetricDetails(metricKey);
      setDetailsCache((current) => ({
        ...current,
        [metricKey]: data,
      }));
    } catch (error) {
      console.error("Erro ao carregar detalhes do dashboard:", error);
    } finally {
      setDetailsLoading(false);
    }
  }

  const activeContractsTone = useMemo(() => {
    const change = metrics?.active_contracts.change_percent ?? 0;
    if (change > 0) return "positive" as const;
    if (change < 0) return "negative" as const;
    return "neutral" as const;
  }, [metrics]);

  const selectedDetailsPayload = selectedDetail ? detailsCache[selectedDetail] : null;

  function renderContractTable(items: DashboardContractDetail[]) {
    return (
      <div className="gestao-home__table-wrapper">
        <table className="gestao-home__table">
          <thead>
            <tr>
              <th>Id do contrato</th>
              <th>Nome do cliente</th>
              <th>Nome do aluno</th>
              <th>Tipo do contrato</th>
              <th>Data de início</th>
              <th>Data de encerramento</th>
            </tr>
          </thead>
          <tbody>
            {items.length ? (
              items.map((item) => (
                <tr key={`${selectedDetail}-${item.contract_id}`}>
                  <td>{formatContractCode(item.contract_id)}</td>
                  <td>{item.customer_name}</td>
                  <td>{item.student_name}</td>
                  <td>{item.contract_type_name}</td>
                  <td>{formatDate(item.start_date)}</td>
                  <td>{formatDate(item.end_date)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="gestao-home__empty">
                  Nenhum contrato encontrado para este recorte.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    );
  }

  function renderOpenLessons(groups: DashboardOpenLessonsGroup[]) {
    if (!groups.length) {
      return <p className="gestao-home__details-placeholder">Nenhuma aula pendente encontrada.</p>;
    }

    return (
      <div className="gestao-home__open-groups">
        {groups.map((group) => (
          <section key={group.professor_id} className="gestao-home__subtable-card">
            <div className="gestao-home__subtable-header">
              <h3>{group.professor_name}</h3>
            </div>

            <div className="gestao-home__table-wrapper">
              <table className="gestao-home__table">
                <thead>
                  <tr>
                    <th>Data/Hora</th>
                    <th>ID da aula</th>
                    <th>Aluno</th>
                  </tr>
                </thead>
                <tbody>
                  {group.lessons.map((lesson, index) => (
                    <tr key={`${group.professor_id}-${lesson.lesson_id}-${index}`}>
                      <td>{formatDateTime(lesson.lesson_date)}</td>
                      <td>{lesson.lesson_id}</td>
                      <td>{lesson.student_name || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))}
      </div>
    );
  }

  function renderDetailsBody() {
    if (!selectedDetail) {
      return <p className="gestao-home__details-placeholder">Detalhes das Métricas</p>;
    }

    if (detailsLoading && !selectedDetailsPayload) {
      return <p className="gestao-home__details-placeholder">Carregando detalhes...</p>;
    }

    if (!selectedDetailsPayload) {
      return <p className="gestao-home__details-placeholder">Não foi possível carregar os detalhes desta métrica.</p>;
    }

    if (selectedDetail === "open-lessons") {
      return renderOpenLessons(selectedDetailsPayload.open_lessons_groups ?? []);
    }

    return renderContractTable(selectedDetailsPayload.contract_rows ?? []);
  }

  return (
    <GestaoShell title="Dashboard">
      <section className="gestao-home">
        <div className="gestao-home__stats">
          <StatCard
            title="Total de Contratos Ativos"
            value={loading ? "..." : String(metrics?.active_contracts.total ?? 0)}
            detail={loading ? "Carregando..." : formatPercent(metrics?.active_contracts.change_percent ?? 0)}
            secondaryDetail={
              loading ? "" : `Mês anterior fechou com ${metrics?.active_contracts.previous_total ?? 0} ativos`
            }
            icon={fileAltIcon}
            tone="blue"
            detailTone={activeContractsTone}
          />

          <StatCard
            title="Novos Contratos"
            value={loading ? "..." : String(metrics?.new_contracts.total ?? 0)}
            detail={
              loading
                ? "Carregando..."
                : `${metrics?.new_contracts.previous_total ?? 0} contratos abertos no mês anterior`
            }
            icon={dashboardIcon}
            tone="green"
            actionLabel="Detalhes"
            actionIcon={eyeIcon}
            onAction={() => void handleOpenDetails("new-contracts")}
          />

          <StatCard
            title="Contratos Encerrados"
            value={loading ? "..." : String(metrics?.ending_contracts.total ?? 0)}
            detail={
              loading
                ? "Carregando..."
                : `${metrics?.ending_contracts.previous_total ?? 0} contratos encerrados no mês anterior`
            }
            icon={warningIcon}
            tone="red"
            actionLabel="Detalhes"
            actionIcon={eyeIcon}
            onAction={() => void handleOpenDetails("ending-contracts")}
          />

          <StatCard
            title="Aulas em Aberto"
            value={loading ? "..." : String(metrics?.open_lessons.total ?? 0)}
            detail="Aulas pendentes até o dia anterior"
            icon={warningIcon}
            tone="yellow"
            actionLabel="Detalhes"
            actionIcon={eyeIcon}
            onAction={() => void handleOpenDetails("open-lessons")}
          />
        </div>

        <section className="gestao-home__details-card">
          <div className="gestao-home__details-header">
            <h2>Detalhes das Métricas</h2>
          </div>
          {renderDetailsBody()}
        </section>

        <section className="gestao-home__chart-card">
          <div className="gestao-home__chart-header">
            <div>
              <h2>Evolução dos Contratos</h2>
              <p>
                {historyRange === "school-year" && history?.school_year
                  ? `${history.school_year.name}: ${formatDate(history.school_year.start_date)} até ${formatDate(history.school_year.end_date)}`
                  : "Acompanhe a evolução mensal incluindo o mês atual e os meses anteriores do período selecionado."}
              </p>
            </div>

            <div className="gestao-home__range-switcher">
              {RANGE_OPTIONS.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  className={historyRange === option.key ? "is-active" : ""}
                  onClick={() => setHistoryRange(option.key)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="gestao-home__chart-summary">
            {CHART_SERIES.map((series) => (
              <div key={series.key} className="gestao-home__chart-summary-item">
                <span className={`gestao-home__legend-dot ${series.colorClass}`} />
                <div>
                  <strong>{formatChartTotal(history, series.key)}</strong>
                  <p>{series.label}</p>
                </div>
              </div>
            ))}
          </div>

          {historyLoading ? (
            <div className="gestao-home__chart-placeholder">Carregando evolução dos contratos...</div>
          ) : historyError ? (
            <div className="gestao-home__chart-placeholder">{historyError}</div>
          ) : history?.rows.length ? (
            <div className="gestao-home__chart-area">
              <div className="gestao-home__chart-grid">
                {[0, 1, 2, 3].map((line) => (
                  <span key={line} className="gestao-home__chart-grid-line" />
                ))}
                <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="gestao-home__chart-svg">
                  {CHART_SERIES.map((series) => (
                    <g key={series.key}>
                      <polyline
                        fill="none"
                        stroke={series.color}
                        strokeWidth="2.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        vectorEffect="non-scaling-stroke"
                        points={buildLinePoints(history.rows, (row) => row[series.key])}
                      />
                    </g>
                  ))}
                </svg>

                <div className="gestao-home__chart-points">
                  {CHART_SERIES.flatMap((series) =>
                    buildChartPoints(history.rows, (row) => row[series.key]).map((point) => (
                      <button
                        key={`${series.key}-${point.row.year}-${point.row.month}`}
                        type="button"
                        className={`gestao-home__chart-point gestao-home__chart-point--${series.colorClass.replace("is-", "")}`}
                        style={{
                          left: `${point.x}%`,
                          top: `${point.y}%`,
                        }}
                        aria-label={`${series.label}: ${point.value} em ${point.row.label}`}
                        onMouseEnter={() =>
                          setHoveredPoint({
                            label: point.row.label,
                            value: point.value,
                            seriesLabel: series.label,
                            x: point.x,
                            y: point.y,
                            isNearTop: point.y < 18,
                          })
                        }
                        onMouseLeave={() => setHoveredPoint(null)}
                        onFocus={() =>
                          setHoveredPoint({
                            label: point.row.label,
                            value: point.value,
                            seriesLabel: series.label,
                            x: point.x,
                            y: point.y,
                            isNearTop: point.y < 18,
                          })
                        }
                        onBlur={() => setHoveredPoint(null)}
                      />
                    )),
                  )}

                  {hoveredPoint ? (
                    <div
                      className="gestao-home__chart-tooltip"
                      style={{
                        left: `${hoveredPoint.x}%`,
                        top: `${hoveredPoint.y}%`,
                      }}
                      data-placement={hoveredPoint.isNearTop ? "bottom" : "top"}
                    >
                      <strong>{hoveredPoint.seriesLabel}</strong>
                      <span>{hoveredPoint.value}</span>
                      <small>{hoveredPoint.label}</small>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="gestao-home__chart-labels">
                {history.rows.map((row) => (
                  <span key={`${row.year}-${row.month}`}>{row.label}</span>
                ))}
              </div>
            </div>
          ) : (
            <div className="gestao-home__chart-placeholder">Nenhum dado mensal disponível para este período.</div>
          )}
        </section>
      </section>
    </GestaoShell>
  );
}
