package controllers

import (
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/brunoob35/TreeHouse-API/src/models"
	"github.com/brunoob35/TreeHouse-API/src/persistency"
	"github.com/brunoob35/TreeHouse-API/src/repository"
	"github.com/brunoob35/TreeHouse-API/src/responses"
	"github.com/gorilla/mux"
)

func FetchDashboardMetrics(w http.ResponseWriter, r *http.Request) {
	db, err := persistency.Connect()
	if err != nil {
		responses.Err(w, http.StatusInternalServerError, err)
		return
	}
	defer db.Close()

	repo := repositories.NewDashboardRepository(db)
	metrics, err := repo.FetchMetrics(time.Now())
	if err != nil {
		responses.Err(w, http.StatusInternalServerError, err)
		return
	}

	responses.JSON(w, http.StatusOK, metrics)
}

func FetchDashboardMetricDetails(w http.ResponseWriter, r *http.Request) {
	params := mux.Vars(r)
	metricKey := strings.ToLower(strings.TrimSpace(params["metricKey"]))

	db, err := persistency.Connect()
	if err != nil {
		responses.Err(w, http.StatusInternalServerError, err)
		return
	}
	defer db.Close()

	repo := repositories.NewDashboardRepository(db)
	response := models.DashboardMetricDetails{
		Metric: metricKey,
	}

	switch metricKey {
	case "new-contracts":
		response.ContractRows, err = repo.FetchNewContractsDetails(time.Now())
	case "ending-contracts":
		response.ContractRows, err = repo.FetchEndingContractsDetails(time.Now())
	case "open-lessons":
		response.OpenLessonsGroups, err = repo.FetchOpenLessonsDetails(time.Now())
	default:
		err = errors.New("métrica de dashboard inválida")
	}

	if err != nil {
		statusCode := http.StatusInternalServerError
		if metricKey != "new-contracts" && metricKey != "ending-contracts" && metricKey != "open-lessons" {
			statusCode = http.StatusBadRequest
		}
		responses.Err(w, statusCode, err)
		return
	}

	responses.JSON(w, http.StatusOK, response)
}

func FetchDashboardContractsHistory(w http.ResponseWriter, r *http.Request) {
	rangeKey := strings.ToLower(strings.TrimSpace(r.URL.Query().Get("range")))
	if rangeKey == "" {
		rangeKey = "3m"
	}

	db, err := persistency.Connect()
	if err != nil {
		responses.Err(w, http.StatusInternalServerError, err)
		return
	}
	defer db.Close()

	repo := repositories.NewDashboardRepository(db)
	reference := time.Now()

	var (
		rangeStart time.Time
		rangeEnd   time.Time
		schoolYear *models.DashboardSchoolYear
	)

	switch rangeKey {
	case "3m":
		rangeEnd = time.Date(reference.Year(), reference.Month(), 1, 0, 0, 0, 0, reference.Location())
		rangeStart = rangeEnd.AddDate(0, -2, 0)
	case "6m":
		rangeEnd = time.Date(reference.Year(), reference.Month(), 1, 0, 0, 0, 0, reference.Location())
		rangeStart = rangeEnd.AddDate(0, -5, 0)
	case "12m":
		rangeEnd = time.Date(reference.Year(), reference.Month(), 1, 0, 0, 0, 0, reference.Location())
		rangeStart = rangeEnd.AddDate(0, -11, 0)
	case "school-year", "school_year":
		schoolYear, err = repo.FetchCurrentSchoolYear(reference)
		if err != nil {
			responses.Err(w, http.StatusInternalServerError, err)
			return
		}
		rangeKey = "school-year"
		rangeStart = time.Date(schoolYear.StartDate.Year(), schoolYear.StartDate.Month(), 1, 0, 0, 0, 0, schoolYear.StartDate.Location())
		rangeEnd = time.Date(schoolYear.EndDate.Year(), schoolYear.EndDate.Month(), 1, 0, 0, 0, 0, schoolYear.EndDate.Location())
	default:
		responses.Err(w, http.StatusBadRequest, errors.New("intervalo de histórico inválido"))
		return
	}

	if err = repo.RefreshContractsMonthlySummary(rangeStart, rangeEnd); err != nil {
		if !repositories.IsDashboardAnalyticsUnavailable(err) {
			responses.Err(w, http.StatusInternalServerError, err)
			return
		}

		rows, directErr := repo.FetchContractsHistoryDirect(rangeStart, rangeEnd)
		if directErr != nil {
			responses.Err(w, http.StatusInternalServerError, directErr)
			return
		}

		responses.JSON(w, http.StatusOK, models.DashboardContractsHistory{
			Range:      rangeKey,
			StartDate:  rangeStart,
			EndDate:    rangeEnd,
			SchoolYear: schoolYear,
			Rows:       rows,
		})
		return
	}

	rows, err := repo.FetchContractsHistory(rangeStart, rangeEnd)
	if err != nil {
		if !repositories.IsDashboardAnalyticsUnavailable(err) {
			responses.Err(w, http.StatusInternalServerError, err)
			return
		}

		rows, directErr := repo.FetchContractsHistoryDirect(rangeStart, rangeEnd)
		if directErr != nil {
			responses.Err(w, http.StatusInternalServerError, directErr)
			return
		}

		responses.JSON(w, http.StatusOK, models.DashboardContractsHistory{
			Range:      rangeKey,
			StartDate:  rangeStart,
			EndDate:    rangeEnd,
			SchoolYear: schoolYear,
			Rows:       rows,
		})
		return
	}

	responses.JSON(w, http.StatusOK, models.DashboardContractsHistory{
		Range:      rangeKey,
		StartDate:  rangeStart,
		EndDate:    rangeEnd,
		SchoolYear: schoolYear,
		Rows:       rows,
	})
}
