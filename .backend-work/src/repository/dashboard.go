package repositories

import (
	"database/sql"
	"fmt"
	"strings"
	"time"

	"github.com/brunoob35/TreeHouse-API/src/models"
)

type DashboardRepository struct {
	db *sql.DB
}

func NewDashboardRepository(db *sql.DB) *DashboardRepository {
	return &DashboardRepository{db: db}
}

func monthStart(reference time.Time) time.Time {
	location := reference.Location()
	return time.Date(reference.Year(), reference.Month(), 1, 0, 0, 0, 0, location)
}

func nextMonthStart(reference time.Time) time.Time {
	return monthStart(reference).AddDate(0, 1, 0)
}

func monthBounds(reference time.Time) (time.Time, time.Time, time.Time, time.Time, time.Time) {
	currentMonthStart := monthStart(reference)
	nextCurrentMonthStart := currentMonthStart.AddDate(0, 1, 0)
	previousMonthStart := currentMonthStart.AddDate(0, -1, 0)
	previousMonthEnd := currentMonthStart.Add(-time.Nanosecond)
	todayStart := time.Date(reference.Year(), reference.Month(), reference.Day(), 0, 0, 0, 0, reference.Location())

	return currentMonthStart, nextCurrentMonthStart, previousMonthStart, previousMonthEnd, todayStart
}

func computeChangePercent(current, previous uint64) float64 {
	if previous == 0 {
		if current == 0 {
			return 0
		}
		return 100
	}

	return ((float64(current) - float64(previous)) / float64(previous)) * 100
}

func countWithQuery(db *sql.DB, query string, args ...interface{}) (uint64, error) {
	var total uint64
	if err := db.QueryRow(query, args...).Scan(&total); err != nil {
		return 0, err
	}
	return total, nil
}

func monthLabel(reference time.Time) string {
	return reference.Format("01/2006")
}

func IsDashboardAnalyticsUnavailable(err error) bool {
	if err == nil {
		return false
	}

	message := strings.ToLower(err.Error())
	return strings.Contains(message, "dashboard_contratos_mensal") ||
		strings.Contains(message, "vw_dashboard_contratos_base") ||
		strings.Contains(message, "anos_letivos") ||
		strings.Contains(message, "doesn't exist") ||
		strings.Contains(message, "does not exist") ||
		strings.Contains(message, "unknown table")
}

func (r *DashboardRepository) FetchMetrics(reference time.Time) (models.DashboardMetrics, error) {
	currentMonthStart, nextCurrentMonthStart, previousMonthStart, previousMonthEnd, todayStart := monthBounds(reference)

	activeCurrentQuery := `
		SELECT COUNT(*)
		FROM treehousedb.contratos c
		WHERE c.id_status = 1
		  AND (c.inicio_contrato IS NULL OR c.inicio_contrato <= ?)
		  AND (c.vencimento_contrato IS NULL OR c.vencimento_contrato >= ?)
	`

	activePreviousQuery := `
		SELECT COUNT(*)
		FROM treehousedb.contratos c
		WHERE c.id_status = 1
		  AND (c.inicio_contrato IS NULL OR c.inicio_contrato <= ?)
		  AND (c.vencimento_contrato IS NULL OR c.vencimento_contrato >= ?)
	`

	newContractsQuery := `
		SELECT COUNT(*)
		FROM treehousedb.contratos c
		WHERE c.inicio_contrato >= ? AND c.inicio_contrato < ?
	`

	endingContractsQuery := `
		SELECT COUNT(*)
		FROM treehousedb.contratos c
		WHERE c.vencimento_contrato >= ? AND c.vencimento_contrato < ?
	`

	openLessonsQuery := `
		SELECT COUNT(*)
		FROM treehousedb.aulas a
		WHERE a.id_status = 1
		  AND a.data_aula < ?
	`

	activeCurrent, err := countWithQuery(r.db, activeCurrentQuery, reference, reference)
	if err != nil {
		return models.DashboardMetrics{}, err
	}

	activePrevious, err := countWithQuery(r.db, activePreviousQuery, previousMonthEnd, previousMonthEnd)
	if err != nil {
		return models.DashboardMetrics{}, err
	}

	newCurrent, err := countWithQuery(r.db, newContractsQuery, currentMonthStart, nextCurrentMonthStart)
	if err != nil {
		return models.DashboardMetrics{}, err
	}

	newPrevious, err := countWithQuery(r.db, newContractsQuery, previousMonthStart, currentMonthStart)
	if err != nil {
		return models.DashboardMetrics{}, err
	}

	endingCurrent, err := countWithQuery(r.db, endingContractsQuery, currentMonthStart, nextCurrentMonthStart)
	if err != nil {
		return models.DashboardMetrics{}, err
	}

	endingPrevious, err := countWithQuery(r.db, endingContractsQuery, previousMonthStart, currentMonthStart)
	if err != nil {
		return models.DashboardMetrics{}, err
	}

	openLessons, err := countWithQuery(r.db, openLessonsQuery, todayStart)
	if err != nil {
		return models.DashboardMetrics{}, err
	}

	return models.DashboardMetrics{
		ActiveContracts: models.DashboardMetricSummary{
			Total:         activeCurrent,
			PreviousTotal: activePrevious,
			ChangePercent: computeChangePercent(activeCurrent, activePrevious),
		},
		NewContracts: models.DashboardMetricSummary{
			Total:         newCurrent,
			PreviousTotal: newPrevious,
			ChangePercent: computeChangePercent(newCurrent, newPrevious),
		},
		EndingContracts: models.DashboardMetricSummary{
			Total:         endingCurrent,
			PreviousTotal: endingPrevious,
			ChangePercent: computeChangePercent(endingCurrent, endingPrevious),
		},
		OpenLessons: models.DashboardOpenLessonsSummary{
			Total: openLessons,
		},
	}, nil
}

func (r *DashboardRepository) FetchNewContractsDetails(reference time.Time) ([]models.DashboardContractDetail, error) {
	currentMonthStart, nextCurrentMonthStart, _, _, _ := monthBounds(reference)

	query := `
		SELECT
			c.id,
			cr.nome AS customer_name,
			a.nome AS student_name,
			ct.nome_tipo AS contract_type_name,
			c.inicio_contrato,
			c.vencimento_contrato
		FROM treehousedb.contratos c
		INNER JOIN treehousedb.clientes cr
			ON cr.id = c.id_cliente_responsavel
		INNER JOIN treehousedb.alunos a
			ON a.id = c.id_aluno
		INNER JOIN treehousedb.contratos_tipos ct
			ON ct.id = c.id_tipo_contrato
		WHERE c.inicio_contrato >= ? AND c.inicio_contrato < ?
		ORDER BY c.inicio_contrato ASC, c.id ASC
	`

	rows, err := r.db.Query(query, currentMonthStart, nextCurrentMonthStart)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []models.DashboardContractDetail
	for rows.Next() {
		var item models.DashboardContractDetail
		var startDate sql.NullTime
		var endDate sql.NullTime

		if err = rows.Scan(
			&item.ContractID,
			&item.CustomerName,
			&item.StudentName,
			&item.ContractTypeName,
			&startDate,
			&endDate,
		); err != nil {
			return nil, err
		}

		if startDate.Valid {
			item.StartDate = &startDate.Time
		}
		if endDate.Valid {
			item.EndDate = &endDate.Time
		}

		items = append(items, item)
	}

	return items, rows.Err()
}

func (r *DashboardRepository) FetchEndingContractsDetails(reference time.Time) ([]models.DashboardContractDetail, error) {
	currentMonthStart, nextCurrentMonthStart, _, _, _ := monthBounds(reference)

	query := `
		SELECT
			c.id,
			cr.nome AS customer_name,
			a.nome AS student_name,
			ct.nome_tipo AS contract_type_name,
			c.inicio_contrato,
			c.vencimento_contrato
		FROM treehousedb.contratos c
		INNER JOIN treehousedb.clientes cr
			ON cr.id = c.id_cliente_responsavel
		INNER JOIN treehousedb.alunos a
			ON a.id = c.id_aluno
		INNER JOIN treehousedb.contratos_tipos ct
			ON ct.id = c.id_tipo_contrato
		WHERE c.vencimento_contrato >= ? AND c.vencimento_contrato < ?
		ORDER BY c.vencimento_contrato ASC, c.id ASC
	`

	rows, err := r.db.Query(query, currentMonthStart, nextCurrentMonthStart)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []models.DashboardContractDetail
	for rows.Next() {
		var item models.DashboardContractDetail
		var startDate sql.NullTime
		var endDate sql.NullTime

		if err = rows.Scan(
			&item.ContractID,
			&item.CustomerName,
			&item.StudentName,
			&item.ContractTypeName,
			&startDate,
			&endDate,
		); err != nil {
			return nil, err
		}

		if startDate.Valid {
			item.StartDate = &startDate.Time
		}
		if endDate.Valid {
			item.EndDate = &endDate.Time
		}

		items = append(items, item)
	}

	return items, rows.Err()
}

func (r *DashboardRepository) FetchOpenLessonsDetails(reference time.Time) ([]models.DashboardOpenLessonsGroup, error) {
	_, _, _, _, todayStart := monthBounds(reference)

	query := `
		SELECT
			u.id AS professor_id,
			u.nome AS professor_name,
			a.id AS lesson_id,
			a.data_aula,
			COALESCE(al.nome, '—') AS student_name
		FROM treehousedb.aulas a
		INNER JOIN treehousedb.usuarios u
			ON u.id = a.id_professor
		LEFT JOIN treehousedb.alunos_aulas aa
			ON aa.id_aula = a.id
		LEFT JOIN treehousedb.alunos al
			ON al.id = aa.id_aluno
		WHERE a.id_status = 1
		  AND a.data_aula < ?
		ORDER BY u.nome ASC, a.data_aula ASC, a.id ASC, al.nome ASC
	`

	rows, err := r.db.Query(query, todayStart)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var groups []models.DashboardOpenLessonsGroup
	groupIndexByProfessor := map[uint64]int{}

	for rows.Next() {
		var professorID uint64
		var professorName string
		var lesson models.DashboardOpenLessonRow

		if err = rows.Scan(
			&professorID,
			&professorName,
			&lesson.LessonID,
			&lesson.LessonDate,
			&lesson.StudentName,
		); err != nil {
			return nil, err
		}

		index, exists := groupIndexByProfessor[professorID]
		if !exists {
			groups = append(groups, models.DashboardOpenLessonsGroup{
				ProfessorID:   professorID,
				ProfessorName: professorName,
				Lessons:       []models.DashboardOpenLessonRow{},
			})
			index = len(groups) - 1
			groupIndexByProfessor[professorID] = index
		}

		groups[index].Lessons = append(groups[index].Lessons, lesson)
	}

	return groups, rows.Err()
}

func (r *DashboardRepository) FetchCurrentSchoolYear(reference time.Time) (*models.DashboardSchoolYear, error) {
	query := `
		SELECT
			id,
			nome,
			data_inicio,
			data_fim
		FROM treehousedb.anos_letivos
		WHERE ativo = TRUE
		  AND data_inicio <= ?
		  AND data_fim >= ?
		ORDER BY data_inicio DESC
		LIMIT 1
	`

	var schoolYear models.DashboardSchoolYear
	err := r.db.QueryRow(query, reference, reference).Scan(
		&schoolYear.ID,
		&schoolYear.Name,
		&schoolYear.StartDate,
		&schoolYear.EndDate,
	)
	if err == nil {
		return &schoolYear, nil
	}
	if err != sql.ErrNoRows {
		return nil, err
	}

	fallback := &models.DashboardSchoolYear{
		Name:       fmt.Sprintf("Ano letivo %d", reference.Year()),
		StartDate:  time.Date(reference.Year(), time.January, 1, 0, 0, 0, 0, reference.Location()),
		EndDate:    time.Date(reference.Year(), time.December, 31, 0, 0, 0, 0, reference.Location()),
		IsFallback: true,
	}

	return fallback, nil
}

func (r *DashboardRepository) RefreshContractsMonthlySummary(rangeStart, rangeEnd time.Time) error {
	startMonth := monthStart(rangeStart)
	endMonth := monthStart(rangeEnd)

	tx, err := r.db.Begin()
	if err != nil {
		return err
	}

	statement := `
		INSERT INTO treehousedb.dashboard_contratos_mensal (
			competencia_ano,
			competencia_mes,
			competencia_inicio,
			competencia_fim,
			contratos_ativos_fechamento,
			contratos_novos,
			contratos_encerrados
		)
		SELECT
			YEAR(?),
			MONTH(?),
			?,
			DATE_SUB(?, INTERVAL 1 DAY),
			COALESCE((
				SELECT COUNT(*)
				FROM treehousedb.vw_dashboard_contratos_base v
				WHERE v.inicio_contrato IS NOT NULL
				  AND DATE(v.inicio_contrato) < DATE(?)
				  AND (v.vencimento_contrato IS NULL OR DATE(v.vencimento_contrato) >= DATE(DATE_SUB(?, INTERVAL 1 DAY)))
			), 0),
			COALESCE((
				SELECT COUNT(*)
				FROM treehousedb.vw_dashboard_contratos_base v
				WHERE v.inicio_contrato IS NOT NULL
				  AND DATE(v.inicio_contrato) >= DATE(?)
				  AND DATE(v.inicio_contrato) < DATE(?)
			), 0),
			COALESCE((
				SELECT COUNT(*)
				FROM treehousedb.vw_dashboard_contratos_base v
				WHERE v.vencimento_contrato IS NOT NULL
				  AND DATE(v.vencimento_contrato) >= DATE(?)
				  AND DATE(v.vencimento_contrato) < DATE(?)
			), 0)
		ON DUPLICATE KEY UPDATE
			competencia_fim = VALUES(competencia_fim),
			contratos_ativos_fechamento = VALUES(contratos_ativos_fechamento),
			contratos_novos = VALUES(contratos_novos),
			contratos_encerrados = VALUES(contratos_encerrados),
			updated_at = CURRENT_TIMESTAMP
	`

	for current := startMonth; !current.After(endMonth); current = current.AddDate(0, 1, 0) {
		next := current.AddDate(0, 1, 0)
		if _, err = tx.Exec(
			statement,
			current,
			current,
			current,
			next,
			next,
			next,
			current,
			next,
			current,
			next,
		); err != nil {
			tx.Rollback()
			return err
		}
	}

	return tx.Commit()
}

func (r *DashboardRepository) FetchContractsHistory(rangeStart, rangeEnd time.Time) ([]models.DashboardContractsHistoryRow, error) {
	startMonth := monthStart(rangeStart)
	endMonth := monthStart(rangeEnd)

	query := `
		SELECT
			competencia_ano,
			competencia_mes,
			competencia_inicio,
			competencia_fim,
			contratos_ativos_fechamento,
			contratos_novos,
			contratos_encerrados
		FROM treehousedb.dashboard_contratos_mensal
		WHERE competencia_inicio >= ?
		  AND competencia_inicio <= ?
		ORDER BY competencia_ano ASC, competencia_mes ASC
	`

	rows, err := r.db.Query(query, startMonth, endMonth)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []models.DashboardContractsHistoryRow
	for rows.Next() {
		var item models.DashboardContractsHistoryRow
		if err = rows.Scan(
			&item.Year,
			&item.Month,
			&item.MonthStart,
			&item.MonthEnd,
			&item.ActiveContractsTotal,
			&item.NewContractsTotal,
			&item.EndingContractsTotal,
		); err != nil {
			return nil, err
		}

		item.Label = monthLabel(item.MonthStart)
		items = append(items, item)
	}

	return items, rows.Err()
}

func (r *DashboardRepository) FetchContractsHistoryDirect(rangeStart, rangeEnd time.Time) ([]models.DashboardContractsHistoryRow, error) {
	startMonth := monthStart(rangeStart)
	endMonth := monthStart(rangeEnd)
	var rows []models.DashboardContractsHistoryRow

	activeQuery := `
		SELECT COUNT(*)
		FROM treehousedb.contratos c
		WHERE c.id_status = 1
		  AND c.inicio_contrato IS NOT NULL
		  AND DATE(c.inicio_contrato) < DATE(?)
		  AND (c.vencimento_contrato IS NULL OR DATE(c.vencimento_contrato) >= DATE(DATE_SUB(?, INTERVAL 1 DAY)))
	`

	newQuery := `
		SELECT COUNT(*)
		FROM treehousedb.contratos c
		WHERE c.inicio_contrato IS NOT NULL
		  AND DATE(c.inicio_contrato) >= DATE(?)
		  AND DATE(c.inicio_contrato) < DATE(?)
	`

	endingQuery := `
		SELECT COUNT(*)
		FROM treehousedb.contratos c
		WHERE c.vencimento_contrato IS NOT NULL
		  AND DATE(c.vencimento_contrato) >= DATE(?)
		  AND DATE(c.vencimento_contrato) < DATE(?)
	`

	for current := startMonth; !current.After(endMonth); current = current.AddDate(0, 1, 0) {
		next := current.AddDate(0, 1, 0)

		activeTotal, err := countWithQuery(r.db, activeQuery, next, next)
		if err != nil {
			return nil, err
		}

		newTotal, err := countWithQuery(r.db, newQuery, current, next)
		if err != nil {
			return nil, err
		}

		endingTotal, err := countWithQuery(r.db, endingQuery, current, next)
		if err != nil {
			return nil, err
		}

		rows = append(rows, models.DashboardContractsHistoryRow{
			Year:                 current.Year(),
			Month:                int(current.Month()),
			Label:                monthLabel(current),
			MonthStart:           current,
			MonthEnd:             next.Add(-time.Nanosecond),
			ActiveContractsTotal: activeTotal,
			NewContractsTotal:    newTotal,
			EndingContractsTotal: endingTotal,
		})
	}

	return rows, nil
}
