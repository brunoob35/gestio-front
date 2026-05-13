package models

import "time"

type DashboardMetricSummary struct {
	Total         uint64  `json:"total"`
	PreviousTotal uint64  `json:"previous_total"`
	ChangePercent float64 `json:"change_percent"`
}

type DashboardOpenLessonsSummary struct {
	Total uint64 `json:"total"`
}

type DashboardMetrics struct {
	ActiveContracts DashboardMetricSummary      `json:"active_contracts"`
	NewContracts    DashboardMetricSummary      `json:"new_contracts"`
	EndingContracts DashboardMetricSummary      `json:"ending_contracts"`
	OpenLessons     DashboardOpenLessonsSummary `json:"open_lessons"`
}

type DashboardContractDetail struct {
	ContractID       uint64     `json:"contract_id"`
	CustomerName     string     `json:"customer_name"`
	StudentName      string     `json:"student_name"`
	ContractTypeName string     `json:"contract_type_name"`
	StartDate        *time.Time `json:"start_date,omitempty"`
	EndDate          *time.Time `json:"end_date,omitempty"`
}

type DashboardOpenLessonRow struct {
	LessonID    uint64    `json:"lesson_id"`
	LessonDate  time.Time `json:"lesson_date"`
	StudentName string    `json:"student_name"`
}

type DashboardOpenLessonsGroup struct {
	ProfessorID   uint64                   `json:"professor_id"`
	ProfessorName string                   `json:"professor_name"`
	Lessons       []DashboardOpenLessonRow `json:"lessons"`
}

type DashboardMetricDetails struct {
	Metric            string                      `json:"metric"`
	ContractRows      []DashboardContractDetail   `json:"contract_rows,omitempty"`
	OpenLessonsGroups []DashboardOpenLessonsGroup `json:"open_lessons_groups,omitempty"`
}

type DashboardSchoolYear struct {
	ID         uint64    `json:"id,omitempty"`
	Name       string    `json:"name"`
	StartDate  time.Time `json:"start_date"`
	EndDate    time.Time `json:"end_date"`
	IsFallback bool      `json:"is_fallback,omitempty"`
}

type DashboardContractsHistoryRow struct {
	Year                 int       `json:"year"`
	Month                int       `json:"month"`
	Label                string    `json:"label"`
	MonthStart           time.Time `json:"month_start"`
	MonthEnd             time.Time `json:"month_end"`
	ActiveContractsTotal uint64    `json:"active_contracts_total"`
	NewContractsTotal    uint64    `json:"new_contracts_total"`
	EndingContractsTotal uint64    `json:"ending_contracts_total"`
}

type DashboardContractsHistory struct {
	Range      string                         `json:"range"`
	StartDate  time.Time                      `json:"start_date"`
	EndDate    time.Time                      `json:"end_date"`
	SchoolYear *DashboardSchoolYear           `json:"school_year,omitempty"`
	Rows       []DashboardContractsHistoryRow `json:"rows"`
}
