import { api } from "./api";

export type AuditLogFieldChange = {
  field: string;
  before?: unknown;
  after?: unknown;
};

export type AuditLogItem = {
  id: number;
  user_id?: number;
  user_name: string;
  table_name: string;
  record_id: string;
  action: string;
  description?: string;
  summary: string;
  changes_count: number;
  changes: AuditLogFieldChange[];
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  ip_origin?: string;
  user_agent?: string;
  created_at: string;
};

export type AuditLogsPage = {
  items: AuditLogItem[];
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
};

export type AuditLogsFilters = {
  query?: string;
  user?: string;
  action?: string;
  date_from?: string;
  date_to?: string;
};

function asString(value: unknown) {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return "";
}

function asNumber(value: unknown) {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

function normalizeChange(item: Record<string, unknown>): AuditLogFieldChange {
  return {
    field: asString(item.field),
    before: item.before,
    after: item.after,
  };
}

function normalizeAuditLog(item: Record<string, unknown>): AuditLogItem {
  const rawChanges = Array.isArray(item.changes) ? item.changes : [];

  return {
    id: asNumber(item.id),
    user_id: asNumber(item.user_id) || undefined,
    user_name: asString(item.user_name) || "Sistema",
    table_name: asString(item.table_name),
    record_id: asString(item.record_id),
    action: asString(item.action),
    description: asString(item.description) || undefined,
    summary: asString(item.summary),
    changes_count: asNumber(item.changes_count),
    changes: rawChanges.map((change) => normalizeChange(change as Record<string, unknown>)),
    before: item.before && typeof item.before === "object" ? (item.before as Record<string, unknown>) : undefined,
    after: item.after && typeof item.after === "object" ? (item.after as Record<string, unknown>) : undefined,
    ip_origin: asString(item.ip_origin) || undefined,
    user_agent: asString(item.user_agent) || undefined,
    created_at: asString(item.created_at),
  };
}

export async function fetchAuditLogs(page: number, pageSize = 50, filters: AuditLogsFilters = {}) {
  const response = await api.get("/reports/audit-logs", {
    params: {
      page,
      page_size: pageSize,
      ...(filters.query ? { q: filters.query } : {}),
      ...(filters.user ? { user: filters.user } : {}),
      ...(filters.action ? { action: filters.action } : {}),
      ...(filters.date_from ? { date_from: filters.date_from } : {}),
      ...(filters.date_to ? { date_to: filters.date_to } : {}),
    },
  });

  const data = (response.data ?? {}) as Record<string, unknown>;
  const rawItems = Array.isArray(data.items) ? data.items : [];

  return {
    items: rawItems.map((item) => normalizeAuditLog(item as Record<string, unknown>)),
    page: asNumber(data.page) || 1,
    page_size: asNumber(data.page_size) || pageSize,
    total: asNumber(data.total),
    total_pages: asNumber(data.total_pages),
  } satisfies AuditLogsPage;
}
