import { Fragment, useEffect, useMemo, useState } from "react";
import GestaoShell from "../components/gestao/GestaoShell";
import {
  fetchAuditLogs,
  type AuditLogItem,
  type AuditLogsFilters,
} from "../services/auditLogs";
import "./GestaoRelatoriosPage.css";

const PAGE_SIZE = 50;
const initialFilters: AuditLogsFilters = {
  query: "",
  user: "",
  action: "",
  date_from: "",
  date_to: "",
};

function formatDateTime(value: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function formatAction(action: string) {
  switch (action.toUpperCase()) {
    case "INSERT":
      return "Criação";
    case "UPDATE":
      return "Edição";
    case "DELETE":
      return "Remoção";
    default:
      return action;
  }
}

function formatCellValue(value: unknown) {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value);
}

function formatTableName(name: string) {
  if (!name) return "—";
  return name.replaceAll("_", " ");
}

export default function GestaoRelatoriosPage() {
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [expandedLogId, setExpandedLogId] = useState<number | null>(null);
  const [draftFilters, setDraftFilters] = useState<AuditLogsFilters>(initialFilters);
  const [appliedFilters, setAppliedFilters] = useState<AuditLogsFilters>(initialFilters);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const response = await fetchAuditLogs(page, PAGE_SIZE, appliedFilters);
        if (cancelled) return;

        setLogs(response.items);
        setTotal(response.total);
        setTotalPages(response.total_pages);
        setExpandedLogId(null);
      } catch (fetchError) {
        console.error("Erro ao carregar logs de auditoria:", fetchError);
        if (cancelled) return;
        setError("Não foi possível carregar os logs de auditoria.");
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
  }, [appliedFilters, page]);

  const rangeLabel = useMemo(() => {
    if (!total) return "Nenhum log encontrado";
    const start = (page - 1) * PAGE_SIZE + 1;
    const end = Math.min(page * PAGE_SIZE, total);
    return `Exibindo ${start}-${end} de ${total} logs`;
  }, [page, total]);

  function updateFilter<Key extends keyof AuditLogsFilters>(field: Key, value: AuditLogsFilters[Key]) {
    setDraftFilters((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function applyFilters(event: React.FormEvent) {
    event.preventDefault();
    setPage(1);
    setAppliedFilters({
      query: draftFilters.query?.trim() ?? "",
      user: draftFilters.user?.trim() ?? "",
      action: draftFilters.action?.trim() ?? "",
      date_from: draftFilters.date_from?.trim() ?? "",
      date_to: draftFilters.date_to?.trim() ?? "",
    });
  }

  function clearFilters() {
    setDraftFilters(initialFilters);
    setAppliedFilters(initialFilters);
    setPage(1);
  }

  return (
    <GestaoShell title="Auditoria">
      <section className="gestao-reports">
        <header className="gestao-reports__header">
          <div>
            <h2>Auditoria</h2>
            <p>
              Histórico compacto das alterações feitas na plataforma, visível apenas para gestor master.
            </p>
          </div>
          <div className="gestao-reports__header-meta">
            <strong>{total}</strong>
            <span>logs totais</span>
          </div>
        </header>

        <section className="gestao-reports__filters-card">
          <form className="gestao-reports__filters" onSubmit={applyFilters}>
            <label className="gestao-reports__filters-field gestao-reports__filters-field--wide">
              <span>Buscar no log</span>
              <input
                type="text"
                value={draftFilters.query ?? ""}
                onChange={(event) => updateFilter("query", event.target.value)}
                placeholder="Cliente, registro, descricao ou conteudo alterado"
              />
            </label>

            <label className="gestao-reports__filters-field">
              <span>Usuario</span>
              <input
                type="text"
                value={draftFilters.user ?? ""}
                onChange={(event) => updateFilter("user", event.target.value)}
                placeholder="Nome ou ID"
              />
            </label>

            <label className="gestao-reports__filters-field">
              <span>Acao</span>
              <select
                value={draftFilters.action ?? ""}
                onChange={(event) => updateFilter("action", event.target.value)}
              >
                <option value="">Todas</option>
                <option value="INSERT">Criacao</option>
                <option value="UPDATE">Edicao</option>
                <option value="DELETE">Remocao</option>
              </select>
            </label>

            <label className="gestao-reports__filters-field">
              <span>Data inicial</span>
              <input
                type="date"
                value={draftFilters.date_from ?? ""}
                onChange={(event) => updateFilter("date_from", event.target.value)}
              />
            </label>

            <label className="gestao-reports__filters-field">
              <span>Data final</span>
              <input
                type="date"
                value={draftFilters.date_to ?? ""}
                onChange={(event) => updateFilter("date_to", event.target.value)}
              />
            </label>

            <div className="gestao-reports__filters-actions">
              <button type="submit" disabled={loading}>
                Filtrar
              </button>
              <button type="button" onClick={clearFilters} disabled={loading}>
                Limpar
              </button>
            </div>
          </form>
        </section>

        <section className="gestao-reports__table-card">
          <div className="gestao-reports__table-header">
            <div>
              <h3>Logs recentes</h3>
              <p>{rangeLabel}</p>
            </div>

            <div className="gestao-reports__pagination">
              <button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page <= 1 || loading}>
                Anterior
              </button>
              <span>Página {page}{totalPages ? ` de ${totalPages}` : ""}</span>
              <button type="button" onClick={() => setPage((current) => (totalPages ? Math.min(totalPages, current + 1) : current + 1))} disabled={loading || (totalPages > 0 && page >= totalPages)}>
                Próxima
              </button>
            </div>
          </div>

          {error ? <p className="gestao-reports__error">{error}</p> : null}

          <div className="gestao-reports__table-wrapper">
            <table className="gestao-reports__table">
              <thead>
                <tr>
                  <th>Quando</th>
                  <th>Quem</th>
                  <th>Tabela</th>
                  <th>Ação</th>
                  <th>Registro</th>
                  <th>Resumo</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="gestao-reports__empty">
                      Carregando logs...
                    </td>
                  </tr>
                ) : logs.length ? (
                  logs.map((log) => {
                    const isExpanded = expandedLogId === log.id;

                    return (
                      <Fragment key={log.id}>
                        <tr
                          className={`gestao-reports__row ${isExpanded ? "is-expanded" : ""}`}
                          onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                        >
                          <td>{formatDateTime(log.created_at)}</td>
                          <td>{log.user_name}</td>
                          <td>{formatTableName(log.table_name)}</td>
                          <td>
                            <span className={`gestao-reports__action is-${log.action.toLowerCase()}`}>
                              {formatAction(log.action)}
                            </span>
                          </td>
                          <td>{log.record_id}</td>
                          <td>
                            <div className="gestao-reports__summary-cell">
                              <strong>{log.summary}</strong>
                              <span>{log.changes_count ? `${log.changes_count} campo(s)` : "Sem diff detalhado"}</span>
                            </div>
                          </td>
                        </tr>
                        {isExpanded ? (
                          <tr className="gestao-reports__details-row">
                            <td colSpan={6}>
                              <div className="gestao-reports__details">
                                <div className="gestao-reports__details-meta">
                                  <span><strong>Descrição:</strong> {log.description || "—"}</span>
                                  <span><strong>IP:</strong> {log.ip_origin || "—"}</span>
                                </div>

                                {log.changes.length ? (
                                  <div className="gestao-reports__changes">
                                    <div className="gestao-reports__changes-head">
                                      <span>Campo</span>
                                      <span>Valor anterior</span>
                                      <span>Novo valor</span>
                                    </div>
                                    {log.changes.map((change) => (
                                      <div key={`${log.id}-${change.field}`} className="gestao-reports__changes-row">
                                        <span>{change.field}</span>
                                        <span>{formatCellValue(change.before)}</span>
                                        <span>{formatCellValue(change.after)}</span>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="gestao-reports__empty-details">
                                    Esse log não trouxe campos comparáveis no diff.
                                  </p>
                                )}
                              </div>
                            </td>
                          </tr>
                        ) : null}
                      </Fragment>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="gestao-reports__empty">
                      Nenhum log encontrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </section>
    </GestaoShell>
  );
}
