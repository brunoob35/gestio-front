USE treehousedb;

CREATE TABLE IF NOT EXISTS anos_letivos (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    nome VARCHAR(100) NOT NULL,
    data_inicio DATE NOT NULL,
    data_fim DATE NOT NULL,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT pk_anos_letivos PRIMARY KEY (id),
    CONSTRAINT uq_anos_letivos_nome UNIQUE (nome),
    INDEX idx_anos_letivos_ativo_datas (ativo, data_inicio, data_fim)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS dashboard_contratos_mensal (
    competencia_ano SMALLINT UNSIGNED NOT NULL,
    competencia_mes TINYINT UNSIGNED NOT NULL,
    competencia_inicio DATE NOT NULL,
    competencia_fim DATE NOT NULL,
    contratos_ativos_fechamento INT UNSIGNED NOT NULL DEFAULT 0,
    contratos_novos INT UNSIGNED NOT NULL DEFAULT 0,
    contratos_encerrados INT UNSIGNED NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT pk_dashboard_contratos_mensal PRIMARY KEY (competencia_ano, competencia_mes),
    CONSTRAINT uq_dashboard_contratos_mensal_inicio UNIQUE (competencia_inicio),
    INDEX idx_dashboard_contratos_mensal_intervalo (competencia_inicio, competencia_fim)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE OR REPLACE VIEW vw_dashboard_contratos_base AS
SELECT
    c.id AS id_contrato,
    c.id_cliente_representante,
    c.id_cliente_responsavel,
    c.id_aluno,
    c.id_tipo_contrato,
    c.id_status,
    c.id_turma,
    c.valor,
    c.valor_final,
    c.numero_aulas,
    c.parcelas,
    c.periodicidade,
    c.tempo_aula,
    c.tempo_contrato,
    c.inicio_contrato,
    c.vencimento_contrato,
    c.primeira_aula,
    cr.nome AS nome_cliente_responsavel,
    rep.nome AS nome_cliente_representante,
    a.nome AS nome_aluno,
    ct.nome_tipo AS nome_tipo_contrato,
    cs.nome_status AS nome_status_persistido,
    CASE
        WHEN c.id_status = 1
         AND c.vencimento_contrato IS NOT NULL
         AND DATE(c.vencimento_contrato) >= CURRENT_DATE
         AND DATE(c.vencimento_contrato) <= DATE_ADD(CURRENT_DATE, INTERVAL 7 DAY)
            THEN 'Prox. Vencimento'
        ELSE cs.nome_status
        END AS nome_status_dashboard
FROM contratos c
         INNER JOIN clientes cr
                    ON cr.id = c.id_cliente_responsavel
         INNER JOIN clientes rep
                    ON rep.id = c.id_cliente_representante
         INNER JOIN alunos a
                    ON a.id = c.id_aluno
         INNER JOIN contratos_tipos ct
                    ON ct.id = c.id_tipo_contrato
         INNER JOIN contratos_status cs
                    ON cs.id = c.id_status;
