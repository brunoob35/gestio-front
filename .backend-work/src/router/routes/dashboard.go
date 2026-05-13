package routes

import (
	"net/http"

	"github.com/brunoob35/TreeHouse-API/src/authentication"
	"github.com/brunoob35/TreeHouse-API/src/controllers"
)

var dashboardRoutes = []Routes{
	{
		URI:      "/dashboard/metrics",
		Method:   http.MethodGet,
		Function: controllers.FetchDashboardMetrics,
		Auth:     true,
		Permissions: []authentication.Permission{
			authentication.PermGestao,
			authentication.PermGestaoMaster,
		},
	},
	{
		URI:      "/dashboard/metrics/{metricKey}",
		Method:   http.MethodGet,
		Function: controllers.FetchDashboardMetricDetails,
		Auth:     true,
		Permissions: []authentication.Permission{
			authentication.PermGestao,
			authentication.PermGestaoMaster,
		},
	},
	{
		URI:      "/dashboard/contracts/history",
		Method:   http.MethodGet,
		Function: controllers.FetchDashboardContractsHistory,
		Auth:     true,
		Permissions: []authentication.Permission{
			authentication.PermGestao,
			authentication.PermGestaoMaster,
		},
	},
}
