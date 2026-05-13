package main

import (
	"database/sql"
	"fmt"
	"log"
	"os"
	"time"

	_ "github.com/go-sql-driver/mysql"
)

type pair struct {
	CustomerID   uint64
	CustomerName string
	StudentID    uint64
	StudentName  string
}

type contractSeed struct {
	Label          string
	PairIndex      int
	TypeID         uint64
	StatusID       uint64
	Value          float64
	LessonsCount   uint64
	StartDate      time.Time
	DueDate        time.Time
	FirstLesson    time.Time
	Periodicity    string
	LessonDuration string
	ContractDur    string
}

func mustEnv(key string) string {
	value := os.Getenv(key)
	if value == "" {
		log.Fatalf("missing env %s", key)
	}
	return value
}

func main() {
	dsn := fmt.Sprintf("%s:%s@tcp(%s)/%s?parseTime=true&loc=UTC",
		mustEnv("DB_USER"),
		mustEnv("DB_PASSWORD"),
		mustEnv("DB_ADDR"),
		mustEnv("DB_DATABASE"),
	)

	db, err := sql.Open("mysql", dsn)
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	if err = db.Ping(); err != nil {
		log.Fatal(err)
	}

	pairs, err := fetchPairs(db)
	if err != nil {
		log.Fatal(err)
	}

	if len(pairs) == 0 {
		log.Fatal("nenhum vínculo cliente/aluno encontrado em clientes_alunos")
	}

	seeds := buildSeeds()
	log.Printf("pares encontrados: %d", len(pairs))

	for _, seed := range seeds {
		p := pairs[seed.PairIndex%len(pairs)]
		contractID, err := insertContract(db, p, seed)
		if err != nil {
			log.Fatalf("erro ao inserir %s: %v", seed.Label, err)
		}
		log.Printf("contrato %d criado: %s | cliente=%s | aluno=%s | inicio=%s | fim=%s",
			contractID,
			seed.Label,
			p.CustomerName,
			p.StudentName,
			seed.StartDate.Format("2006-01-02"),
			seed.DueDate.Format("2006-01-02"),
		)
	}
}

func fetchPairs(db *sql.DB) ([]pair, error) {
	query := `
		SELECT
			c.id,
			c.nome,
			a.id,
			a.nome
		FROM treehousedb.clientes_alunos ca
		INNER JOIN treehousedb.clientes c
			ON c.id = ca.id_cliente
		INNER JOIN treehousedb.alunos a
			ON a.id = ca.id_aluno
		ORDER BY c.id, a.id
		LIMIT 20
	`

	rows, err := db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var pairs []pair
	for rows.Next() {
		var item pair
		if err = rows.Scan(&item.CustomerID, &item.CustomerName, &item.StudentID, &item.StudentName); err != nil {
			return nil, err
		}
		pairs = append(pairs, item)
	}

	return pairs, rows.Err()
}

func buildSeeds() []contractSeed {
	utc := time.UTC

	return []contractSeed{
		{
			Label:          "inicio-mes-anterior-1",
			PairIndex:      0,
			TypeID:         1,
			StatusID:       1,
			Value:          3200,
			LessonsCount:   24,
			StartDate:      time.Date(2026, time.April, 4, 0, 0, 0, 0, utc),
			DueDate:        time.Date(2026, time.July, 4, 0, 0, 0, 0, utc),
			FirstLesson:    time.Date(2026, time.April, 6, 14, 0, 0, 0, utc),
			Periodicity:    "2x por semana",
			LessonDuration: "50 min",
			ContractDur:    "12 meses",
		},
		{
			Label:          "inicio-mes-anterior-2",
			PairIndex:      1,
			TypeID:         2,
			StatusID:       1,
			Value:          2600,
			LessonsCount:   18,
			StartDate:      time.Date(2026, time.April, 18, 0, 0, 0, 0, utc),
			DueDate:        time.Date(2026, time.August, 18, 0, 0, 0, 0, utc),
			FirstLesson:    time.Date(2026, time.April, 20, 10, 0, 0, 0, utc),
			Periodicity:    "1x por semana",
			LessonDuration: "60 min",
			ContractDur:    "6 meses",
		},
		{
			Label:          "inicio-mes-atual-1",
			PairIndex:      2,
			TypeID:         4,
			StatusID:       1,
			Value:          1200,
			LessonsCount:   8,
			StartDate:      time.Date(2026, time.May, 3, 0, 0, 0, 0, utc),
			DueDate:        time.Date(2026, time.June, 3, 0, 0, 0, 0, utc),
			FirstLesson:    time.Date(2026, time.May, 5, 9, 0, 0, 0, utc),
			Periodicity:    "1x por semana",
			LessonDuration: "50 min",
			ContractDur:    "1 mês",
		},
		{
			Label:          "inicio-mes-atual-2",
			PairIndex:      3,
			TypeID:         5,
			StatusID:       1,
			Value:          900,
			LessonsCount:   6,
			StartDate:      time.Date(2026, time.May, 11, 0, 0, 0, 0, utc),
			DueDate:        time.Date(2026, time.June, 11, 0, 0, 0, 0, utc),
			FirstLesson:    time.Date(2026, time.May, 12, 15, 0, 0, 0, utc),
			Periodicity:    "1x por semana",
			LessonDuration: "45 min",
			ContractDur:    "temporário",
		},
		{
			Label:          "encerrou-mes-anterior-1",
			PairIndex:      4,
			TypeID:         4,
			StatusID:       3,
			Value:          1100,
			LessonsCount:   8,
			StartDate:      time.Date(2026, time.March, 2, 0, 0, 0, 0, utc),
			DueDate:        time.Date(2026, time.April, 8, 0, 0, 0, 0, utc),
			FirstLesson:    time.Date(2026, time.March, 3, 8, 0, 0, 0, utc),
			Periodicity:    "1x por semana",
			LessonDuration: "50 min",
			ContractDur:    "1 mês",
		},
		{
			Label:          "encerrou-mes-anterior-2",
			PairIndex:      5,
			TypeID:         5,
			StatusID:       3,
			Value:          1500,
			LessonsCount:   10,
			StartDate:      time.Date(2026, time.March, 15, 0, 0, 0, 0, utc),
			DueDate:        time.Date(2026, time.April, 28, 0, 0, 0, 0, utc),
			FirstLesson:    time.Date(2026, time.March, 16, 13, 0, 0, 0, utc),
			Periodicity:    "2x por semana",
			LessonDuration: "50 min",
			ContractDur:    "temporário",
		},
		{
			Label:          "encerra-mes-atual-1",
			PairIndex:      6,
			TypeID:         4,
			StatusID:       1,
			Value:          1300,
			LessonsCount:   8,
			StartDate:      time.Date(2026, time.April, 20, 0, 0, 0, 0, utc),
			DueDate:        time.Date(2026, time.May, 20, 0, 0, 0, 0, utc),
			FirstLesson:    time.Date(2026, time.April, 21, 18, 0, 0, 0, utc),
			Periodicity:    "1x por semana",
			LessonDuration: "50 min",
			ContractDur:    "1 mês",
		},
		{
			Label:          "encerra-mes-atual-2",
			PairIndex:      7,
			TypeID:         5,
			StatusID:       1,
			Value:          1700,
			LessonsCount:   12,
			StartDate:      time.Date(2026, time.March, 28, 0, 0, 0, 0, utc),
			DueDate:        time.Date(2026, time.May, 29, 0, 0, 0, 0, utc),
			FirstLesson:    time.Date(2026, time.March, 30, 11, 0, 0, 0, utc),
			Periodicity:    "2x por semana",
			LessonDuration: "60 min",
			ContractDur:    "temporário",
		},
	}
}

func insertContract(db *sql.DB, p pair, seed contractSeed) (uint64, error) {
	query := `
		INSERT INTO treehousedb.contratos (
			id_cliente_representante,
			id_cliente_responsavel,
			id_aluno,
			id_tipo_contrato,
			id_status,
			valor,
			valor_final,
			numero_aulas,
			periodicidade,
			tempo_aula,
			tempo_contrato,
			inicio_contrato,
			vencimento_contrato,
			primeira_aula
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`

	result, err := db.Exec(
		query,
		p.CustomerID,
		p.CustomerID,
		p.StudentID,
		seed.TypeID,
		seed.StatusID,
		seed.Value,
		seed.Value,
		seed.LessonsCount,
		seed.Periodicity,
		seed.LessonDuration,
		seed.ContractDur,
		seed.StartDate,
		seed.DueDate,
		seed.FirstLesson,
	)
	if err != nil {
		return 0, err
	}

	insertedID, err := result.LastInsertId()
	if err != nil {
		return 0, err
	}

	return uint64(insertedID), nil
}
