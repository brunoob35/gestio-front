import { api } from "./api";

export type DashboardMetricSummary = {
  total: number;
  previous_total: number;
  change_percent: number;
};

export type DashboardOpenLessonsSummary = {
  total: number;
};

export type DashboardMetrics = {
  active_contracts: DashboardMetricSummary;
  new_contracts: DashboardMetricSummary;
  ending_contracts: DashboardMetricSummary;
  open_lessons: DashboardOpenLessonsSummary;
};

export type DashboardContractDetail = {
  contract_id: number;
  customer_name: string;
  student_name: string;
  contract_type_name: string;
  start_date?: string;
  end_date?: string;
};

export type DashboardOpenLessonRow = {
  lesson_id: number;
  lesson_date: string;
  student_name: string;
};

export type DashboardOpenLessonsGroup = {
  professor_id: number;
  professor_name: string;
  lessons: DashboardOpenLessonRow[];
};

export type DashboardMetricDetails = {
  metric: "new-contracts" | "ending-contracts" | "open-lessons" | string;
  contract_rows?: DashboardContractDetail[];
  open_lessons_groups?: DashboardOpenLessonsGroup[];
};

export type DashboardSchoolYear = {
  id?: number;
  name: string;
  start_date: string;
  end_date: string;
  is_fallback?: boolean;
};

export type DashboardContractsHistoryRow = {
  year: number;
  month: number;
  label: string;
  month_start: string;
  month_end: string;
  active_contracts_total: number;
  new_contracts_total: number;
  ending_contracts_total: number;
};

export type DashboardContractsHistory = {
  range: string;
  start_date: string;
  end_date: string;
  school_year?: DashboardSchoolYear;
  rows: DashboardContractsHistoryRow[];
};

export async function fetchDashboardMetrics() {
  const response = await api.get("/dashboard/metrics");
  return response.data as DashboardMetrics;
}

export async function fetchDashboardMetricDetails(metricKey: "new-contracts" | "ending-contracts" | "open-lessons") {
  const response = await api.get(`/dashboard/metrics/${metricKey}`);
  return response.data as DashboardMetricDetails;
}

export async function fetchDashboardContractsHistory(range: "3m" | "6m" | "12m" | "school-year") {
  const response = await api.get("/dashboard/contracts/history", {
    params: { range },
  });

  return response.data as DashboardContractsHistory;
}
