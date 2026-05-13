USE treehousedb;

CREATE TABLE IF NOT EXISTS contratos_status (
    id INT UNSIGNED NOT NULL,
    nome_status VARCHAR(50) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT pk_contratos_status PRIMARY KEY (id),
    CONSTRAINT uq_contratos_status_nome_status UNIQUE (nome_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS contratos_tipos (
    id INT UNSIGNED NOT NULL,
    nome_tipo VARCHAR(50) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT pk_contratos_tipos PRIMARY KEY (id),
    CONSTRAINT uq_contratos_tipos_nome_tipo UNIQUE (nome_tipo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO contratos_status (id, nome_status) VALUES
    (1, 'Ativo'),
    (2, 'Pendente'),
    (3, 'Vencido');

INSERT IGNORE INTO contratos_tipos (id, nome_tipo) VALUES
    (1, 'Anual'),
    (2, 'Semestral'),
    (3, 'Trimestral'),
    (4, 'Mensal'),
    (5, 'Temporário');

ALTER TABLE contratos
    ADD COLUMN id_tipo_contrato INT UNSIGNED NULL AFTER id_aluno,
    ADD COLUMN id_status INT UNSIGNED NULL AFTER id_tipo_contrato,
    ADD COLUMN id_turma INT UNSIGNED NULL AFTER id_status,
    ADD COLUMN vencimento_contrato DATETIME NULL AFTER inicio_contrato;

UPDATE contratos
SET id_tipo_contrato = CASE LOWER(TRIM(tipo_contrato))
    WHEN 'anual' THEN 1
    WHEN 'semestral' THEN 2
    WHEN 'trimestral' THEN 3
    WHEN 'mensal' THEN 4
    WHEN 'temporário' THEN 5
    WHEN 'temporario' THEN 5
    ELSE 5
END
WHERE id_tipo_contrato IS NULL;

UPDATE contratos
SET id_status = CASE
    WHEN ativo = 1 THEN 1
    ELSE 3
END
WHERE id_status IS NULL;

ALTER TABLE contratos
    MODIFY COLUMN id_tipo_contrato INT UNSIGNED NOT NULL,
    MODIFY COLUMN id_status INT UNSIGNED NOT NULL DEFAULT 2;

ALTER TABLE contratos
    ADD CONSTRAINT fk_contratos_tipo
        FOREIGN KEY (id_tipo_contrato) REFERENCES contratos_tipos (id)
            ON UPDATE CASCADE
            ON DELETE RESTRICT,
    ADD CONSTRAINT fk_contratos_status
        FOREIGN KEY (id_status) REFERENCES contratos_status (id)
            ON UPDATE CASCADE
            ON DELETE RESTRICT,
    ADD CONSTRAINT fk_contratos_turma
        FOREIGN KEY (id_turma) REFERENCES turmas (id)
            ON UPDATE CASCADE
            ON DELETE RESTRICT;

ALTER TABLE contratos
    ADD INDEX idx_contratos_tipo (id_tipo_contrato),
    ADD INDEX idx_contratos_status (id_status),
    ADD INDEX idx_contratos_vencimento (vencimento_contrato),
    ADD UNIQUE INDEX uq_contratos_id_turma (id_turma);
