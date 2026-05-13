DROP DATABASE IF EXISTS treehousedb;
CREATE DATABASE treehousedb
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE treehousedb;

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- =========================================================
-- OBSERVAÇÕES IMPORTANTES
-- =========================================================
--
-- 1) As permissoes continuam relacionais no banco por meio das
--    tabelas "permissoes" e "usuarios_permissoes".
--
-- 2) Na aplicacao, as permissoes serão agregadas numa máscara
--    numérica (bit flags) para serem gravadas no token JWT.
--
-- 3) Por isso, os IDs da tabela "permissoes" DEVEM ser potências
--    de 2 e DEVEM permanecer estáveis ao longo do tempo.
--
--    Exemplos validos:
--      1, 2, 4, 8, 16, 32, 64...
--
--    Exemplos inválidos para essa estratégia:
--      3, 5, 6, 10, 20...
--
-- 4) Foi utilizado BIGINT UNSIGNED em permissoes.id para manter
--    compatibilidade com o uso de uint64 no backend.
--
-- =========================================================
-- TABELAS PRINCIPAIS
-- =========================================================

CREATE TABLE permissoes (
                            id BIGINT UNSIGNED NOT NULL,
                            nome VARCHAR(50) NOT NULL,
                            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

                            CONSTRAINT pk_permissoes PRIMARY KEY (id),
                            CONSTRAINT uq_permissoes_nome UNIQUE (nome)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE enderecos (
                           id INT UNSIGNED NOT NULL AUTO_INCREMENT,
                           cep VARCHAR(8) NOT NULL,
                           rua VARCHAR(150) NOT NULL,
                           numero VARCHAR(20) NOT NULL,
                           bairro VARCHAR(100) NOT NULL,
                           cidade VARCHAR(100) NOT NULL,
                           estado VARCHAR(100) NOT NULL,
                           pais VARCHAR(100) NOT NULL DEFAULT 'Brasil',
                           complemento VARCHAR(150) NULL,
                           created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                           updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

                           CONSTRAINT pk_enderecos PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE usuarios (
                          id INT UNSIGNED NOT NULL AUTO_INCREMENT,
                          id_endereco INT UNSIGNED NULL,
                          senha VARCHAR(255) NOT NULL,
                          nome VARCHAR(150) NOT NULL,
                          email VARCHAR(150) NOT NULL,
                          cpf VARCHAR(14) NULL,
                          rg VARCHAR(20) NULL,
                          telefone VARCHAR(20) NULL,
                          ativo BOOLEAN NOT NULL DEFAULT TRUE,
                          nascimento DATE NULL,
                          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

                          CONSTRAINT pk_usuarios PRIMARY KEY (id),
                          CONSTRAINT uq_usuarios_email UNIQUE (email),
                          CONSTRAINT uq_usuarios_cpf UNIQUE (cpf),
                          CONSTRAINT uq_usuarios_rg UNIQUE (rg),

                          CONSTRAINT fk_usuarios_endereco
                              FOREIGN KEY (id_endereco) REFERENCES enderecos (id)
                                  ON UPDATE CASCADE
                                  ON DELETE RESTRICT,

                          INDEX idx_usuarios_id_endereco (id_endereco),
                          INDEX idx_usuarios_nome (nome)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE usuarios_permissoes (
                                     id_usuario INT UNSIGNED NOT NULL,
                                     id_permissao BIGINT UNSIGNED NOT NULL,
                                     created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                                     updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

                                     CONSTRAINT pk_usuarios_permissoes PRIMARY KEY (id_usuario, id_permissao),

                                     CONSTRAINT fk_usuarios_permissoes_usuario
                                         FOREIGN KEY (id_usuario) REFERENCES usuarios (id)
                                             ON UPDATE CASCADE
                                             ON DELETE CASCADE,

                                     CONSTRAINT fk_usuarios_permissoes_permissao
                                         FOREIGN KEY (id_permissao) REFERENCES permissoes (id)
                                             ON UPDATE CASCADE
                                             ON DELETE RESTRICT,

                                     INDEX idx_usuarios_permissoes_id_permissao (id_permissao)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE clientes (
                          id INT UNSIGNED NOT NULL AUTO_INCREMENT,
                          nome VARCHAR(150) NOT NULL,
                          email VARCHAR(150) NULL,
                          cpf VARCHAR(14) NULL,
                          rg VARCHAR(20) NULL,
                          telefone VARCHAR(20) NULL,
                          ativo BOOLEAN NOT NULL DEFAULT TRUE,
                          nascimento DATE NULL,
                          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

                          CONSTRAINT pk_clientes PRIMARY KEY (id),
                          CONSTRAINT uq_clientes_email UNIQUE (email),
                          CONSTRAINT uq_clientes_cpf UNIQUE (cpf),
                          CONSTRAINT uq_clientes_rg UNIQUE (rg),

                          INDEX idx_clientes_nome (nome)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE alunos (
                        id INT UNSIGNED NOT NULL AUTO_INCREMENT,
                        nome VARCHAR(150) NOT NULL,
                        livro VARCHAR(150) NULL,
                        alfabetizacao VARCHAR(100) NULL,
                        nascimento DATE NULL,
                        ativo BOOLEAN NOT NULL DEFAULT TRUE,
                        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

                        CONSTRAINT pk_alunos PRIMARY KEY (id),

                        INDEX idx_alunos_nome (nome)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE aulas_status (
                              id INT UNSIGNED NOT NULL,
                              nome_status VARCHAR(50) NOT NULL,
                              created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                              updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

                              CONSTRAINT pk_aulas_status PRIMARY KEY (id),
                              CONSTRAINT uq_aulas_status_nome_status UNIQUE (nome_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE contratos_status (
                                  id INT UNSIGNED NOT NULL,
                                  nome_status VARCHAR(50) NOT NULL,
                                  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                                  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

                                  CONSTRAINT pk_contratos_status PRIMARY KEY (id),
                                  CONSTRAINT uq_contratos_status_nome_status UNIQUE (nome_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE contratos_tipos (
                                 id INT UNSIGNED NOT NULL,
                                 nome_tipo VARCHAR(50) NOT NULL,
                                 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                                 updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

                                 CONSTRAINT pk_contratos_tipos PRIMARY KEY (id),
                                 CONSTRAINT uq_contratos_tipos_nome_tipo UNIQUE (nome_tipo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE turmas (
                        id INT UNSIGNED NOT NULL AUTO_INCREMENT,
                        id_professor INT UNSIGNED NULL,
                        nome VARCHAR(100) NOT NULL,
                        descricao_recorrencia TEXT NULL,
                        recorrencia_json JSON NULL,
                        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                        deleted_at TIMESTAMP NULL DEFAULT NULL,

                        CONSTRAINT pk_turmas PRIMARY KEY (id),

                        CONSTRAINT fk_turmas_professor
                            FOREIGN KEY (id_professor) REFERENCES usuarios (id)
                                ON UPDATE CASCADE
                                ON DELETE RESTRICT,

                        INDEX idx_turmas_id_professor (id_professor),
                        INDEX idx_turmas_nome (nome),
                        INDEX idx_turmas_deleted_at (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE aulas (
                       id INT UNSIGNED NOT NULL AUTO_INCREMENT,
                       id_status INT UNSIGNED NOT NULL DEFAULT 1,
                       id_professor INT UNSIGNED NULL,
                       id_turma INT UNSIGNED NOT NULL,
                       assunto VARCHAR(255) NULL,
                       vocabulario TEXT NULL,
                       saldo TEXT NULL,
                       observacoes TEXT NULL,
                       data_aula DATETIME NOT NULL,
                       created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                       updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

                       CONSTRAINT pk_aulas PRIMARY KEY (id),

                       CONSTRAINT fk_aulas_status
                           FOREIGN KEY (id_status) REFERENCES aulas_status (id)
                               ON DELETE RESTRICT,

                       CONSTRAINT fk_aulas_professor
                           FOREIGN KEY (id_professor) REFERENCES usuarios (id)
                               ON DELETE RESTRICT,

                       CONSTRAINT fk_aulas_turma
                           FOREIGN KEY (id_turma) REFERENCES turmas (id)
                               ON DELETE RESTRICT,

                       INDEX idx_aulas_id_status (id_status),
                       INDEX idx_aulas_id_professor (id_professor),
                       INDEX idx_aulas_id_turma (id_turma),
                       INDEX idx_aulas_data_aula (data_aula),
                       INDEX idx_aulas_turma_data (id_turma, data_aula)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE contratos (
                           id INT UNSIGNED NOT NULL AUTO_INCREMENT,
                           id_cliente_representante INT UNSIGNED NOT NULL,
                           id_cliente_responsavel INT UNSIGNED NOT NULL,
                           id_aluno INT UNSIGNED NOT NULL,
                           id_tipo_contrato INT UNSIGNED NOT NULL,
                           id_status INT UNSIGNED NOT NULL DEFAULT 2,
                           id_turma INT UNSIGNED NULL,
                           valor DECIMAL(10,2) NOT NULL,
                           email_representante VARCHAR(150) NULL,
                           cpf_representante VARCHAR(14) NULL,
                           rg VARCHAR(20) NULL,
                           telefone_representante VARCHAR(20) NULL,
                           est_civil_representante VARCHAR(50) NULL,
                           desconto_porcentagem DECIMAL(5,2) NOT NULL DEFAULT 0.00,
                           valor_final DECIMAL(10,2) NOT NULL,
                           parcelas INT UNSIGNED NULL,
                           parcelas_descricao VARCHAR(100) NULL,
                           numero_aulas INT UNSIGNED NULL,
                           periodicidade VARCHAR(100) NULL,
                           tempo_aula VARCHAR(50) NULL,
                           tempo_contrato VARCHAR(50) NULL,
                           inicio_contrato DATETIME NULL,
                           vencimento_contrato DATETIME NULL,
                           primeira_aula DATETIME NULL,
                           created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                           updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

                           CONSTRAINT pk_contratos PRIMARY KEY (id),

                           CONSTRAINT fk_contratos_cliente_representante
                               FOREIGN KEY (id_cliente_representante) REFERENCES clientes (id)
                                   ON UPDATE CASCADE
                                   ON DELETE RESTRICT,

                           CONSTRAINT fk_contratos_cliente_responsavel
                               FOREIGN KEY (id_cliente_responsavel) REFERENCES clientes (id)
                                   ON UPDATE CASCADE
                                   ON DELETE RESTRICT,

                           CONSTRAINT fk_contratos_aluno
                               FOREIGN KEY (id_aluno) REFERENCES alunos (id)
                                   ON UPDATE CASCADE
                                   ON DELETE RESTRICT,

                           CONSTRAINT fk_contratos_tipo
                               FOREIGN KEY (id_tipo_contrato) REFERENCES contratos_tipos (id)
                                   ON UPDATE CASCADE
                                   ON DELETE RESTRICT,

                           CONSTRAINT fk_contratos_status
                               FOREIGN KEY (id_status) REFERENCES contratos_status (id)
                                   ON UPDATE CASCADE
                                   ON DELETE RESTRICT,

                           CONSTRAINT fk_contratos_turma
                               FOREIGN KEY (id_turma) REFERENCES turmas (id)
                                   ON UPDATE CASCADE
                                   ON DELETE RESTRICT,

                           INDEX idx_contratos_cliente_representante (id_cliente_representante),
                           INDEX idx_contratos_cliente_responsavel (id_cliente_responsavel),
                           INDEX idx_contratos_aluno (id_aluno),
                           INDEX idx_contratos_tipo (id_tipo_contrato),
                           INDEX idx_contratos_status (id_status),
                           INDEX idx_contratos_vencimento (vencimento_contrato),
                           UNIQUE INDEX uq_contratos_id_turma (id_turma)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================================================
-- TABELAS DE RELACIONAMENTO
-- =========================================================

CREATE TABLE enderecos_clientes (
                                    id_cliente INT UNSIGNED NOT NULL,
                                    id_endereco INT UNSIGNED NOT NULL,
                                    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                                    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

                                    CONSTRAINT pk_enderecos_clientes PRIMARY KEY (id_cliente, id_endereco),

                                    CONSTRAINT fk_enderecos_clientes_cliente
                                        FOREIGN KEY (id_cliente) REFERENCES clientes (id)
                                            ON UPDATE CASCADE
                                            ON DELETE CASCADE,

                                    CONSTRAINT fk_enderecos_clientes_endereco
                                        FOREIGN KEY (id_endereco) REFERENCES enderecos (id)
                                            ON UPDATE CASCADE
                                            ON DELETE CASCADE,

                                    INDEX idx_enderecos_clientes_id_endereco (id_endereco)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE clientes_alunos (
                                 id_cliente INT UNSIGNED NOT NULL,
                                 id_aluno INT UNSIGNED NOT NULL,
                                 updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

                                 CONSTRAINT pk_clientes_alunos PRIMARY KEY (id_cliente, id_aluno),

                                 CONSTRAINT fk_clientes_alunos_cliente
                                     FOREIGN KEY (id_cliente) REFERENCES clientes (id)
                                         ON UPDATE CASCADE
                                         ON DELETE CASCADE,

                                 CONSTRAINT fk_clientes_alunos_aluno
                                     FOREIGN KEY (id_aluno) REFERENCES alunos (id)
                                         ON UPDATE CASCADE
                                         ON DELETE CASCADE,

                                 INDEX idx_clientes_alunos_id_aluno (id_aluno)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE alunos_turmas (
                               id_aluno INT UNSIGNED NOT NULL,
                               id_turma INT UNSIGNED NOT NULL,
                               created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                               updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

                               CONSTRAINT pk_alunos_turmas PRIMARY KEY (id_aluno, id_turma),

                               CONSTRAINT fk_alunos_turmas_aluno
                                   FOREIGN KEY (id_aluno) REFERENCES alunos (id)
                                       ON UPDATE CASCADE
                                       ON DELETE CASCADE,

                               CONSTRAINT fk_alunos_turmas_turma
                                   FOREIGN KEY (id_turma) REFERENCES turmas (id)
                                       ON UPDATE CASCADE
                                       ON DELETE CASCADE,

                               INDEX idx_alunos_turmas_id_turma (id_turma)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE alunos_aulas (
                              id_aluno INT UNSIGNED NOT NULL,
                              id_aula INT UNSIGNED NOT NULL,
                              origem_registro ENUM('automatica', 'manual') NOT NULL DEFAULT 'automatica',
                              observacao_aluno_aula TEXT NULL,
                              updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

                              CONSTRAINT pk_alunos_aulas PRIMARY KEY (id_aluno, id_aula),

                              CONSTRAINT fk_alunos_aulas_aluno
                                  FOREIGN KEY (id_aluno) REFERENCES alunos (id)
                                      ON UPDATE CASCADE
                                      ON DELETE CASCADE,

                              CONSTRAINT fk_alunos_aulas_aula
                                  FOREIGN KEY (id_aula) REFERENCES aulas (id)
                                      ON UPDATE CASCADE
                                      ON DELETE CASCADE,

                              INDEX idx_alunos_aulas_id_aula (id_aula),
                              INDEX idx_alunos_aulas_origem_registro (origem_registro)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================================================
-- PASSWORD RESET
-- =========================================================
CREATE TABLE password_resets (
                                 id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                                 user_id INT UNSIGNED NOT NULL,
                                 token_hash VARCHAR(255) NOT NULL,
                                 expires_at DATETIME NOT NULL,
                                 used_at DATETIME NULL,
                                 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                                 CONSTRAINT fk_password_resets_user
                                     FOREIGN KEY (user_id) REFERENCES usuarios(id)
                                         ON DELETE CASCADE
                                         ON UPDATE RESTRICT
);

-- =========================================================
-- AUDITORIA
-- =========================================================

CREATE TABLE logs_auditoria (
                                id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
                                id_usuario INT UNSIGNED NULL,
                                tabela_nome VARCHAR(100) NOT NULL,
                                registro_id VARCHAR(100) NOT NULL,
                                acao VARCHAR(20) NOT NULL,
                                dados_antes JSON NULL,
                                dados_depois JSON NULL,
                                descricao TEXT NULL,
                                ip_origem VARCHAR(45) NULL,
                                user_agent VARCHAR(255) NULL,
                                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

                                CONSTRAINT pk_logs_auditoria PRIMARY KEY (id),
                                CONSTRAINT fk_logs_auditoria_usuario
                                    FOREIGN KEY (id_usuario) REFERENCES usuarios (id)
                                        ON UPDATE CASCADE
                                        ON DELETE SET NULL,

                                INDEX idx_logs_auditoria_id_usuario (id_usuario),
                                INDEX idx_logs_auditoria_tabela_registro (tabela_nome, registro_id),
                                INDEX idx_logs_auditoria_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================================================
-- DASHBOARD / ANALYTICS
-- =========================================================

CREATE TABLE anos_letivos (
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

CREATE TABLE dashboard_contratos_mensal (
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

INSERT INTO aulas_status (id, nome_status) VALUES
    (1, 'Pendente'),
    (2, 'Confirmada'),
    (3, 'Cancelada'),
    (4, 'Aula Dada');

INSERT INTO contratos_status (id, nome_status) VALUES
    (1, 'Ativo'),
    (2, 'Pendente'),
    (3, 'Vencido');

INSERT INTO contratos_tipos (id, nome_tipo) VALUES
    (1, 'Anual'),
    (2, 'Semestral'),
    (3, 'Trimestral'),
    (4, 'Mensal'),
    (5, 'Temporário');

SET FOREIGN_KEY_CHECKS = 1;

-- =========================================================
-- TRIGGERS
-- =========================================================

DELIMITER $$

-- ---------------------------------------------------------
-- AUTOMACAO: ao criar aula, puxar alunos atuais da turma
-- ---------------------------------------------------------
CREATE TRIGGER trg_aulas_after_insert_popular_alunos
    AFTER INSERT ON aulas
    FOR EACH ROW
BEGIN
    INSERT INTO alunos_aulas (id_aluno, id_aula, origem_registro)
    SELECT at.id_aluno, NEW.id, 'automatica'
    FROM alunos_turmas at
    WHERE at.id_turma = NEW.id_turma;
END$$

-- ---------------------------------------------------------
-- AUTOMACAO: ao adicionar aluno na turma, incluir nas aulas
-- futuras da turma em status operacionais
-- ---------------------------------------------------------
CREATE TRIGGER trg_alunos_turmas_after_insert_popular_aulas_futuras
    AFTER INSERT ON alunos_turmas
    FOR EACH ROW
BEGIN
    INSERT INTO alunos_aulas (id_aluno, id_aula, origem_registro)
    SELECT NEW.id_aluno, a.id, 'automatica'
    FROM aulas a
    WHERE a.id_turma = NEW.id_turma
      AND a.data_aula >= NOW()
      AND a.id_status IN (1, 4, 5)
      AND NOT EXISTS (
        SELECT 1
        FROM alunos_aulas aa
        WHERE aa.id_aluno = NEW.id_aluno
          AND aa.id_aula = a.id
    );
END$$

-- ---------------------------------------------------------
-- AUTOMACAO: ao remover aluno da turma, remover somente dos
-- vínculos automaticos em aulas futuras da turma
-- ---------------------------------------------------------
CREATE TRIGGER trg_alunos_turmas_after_delete_remover_aulas_futuras
    AFTER DELETE ON alunos_turmas
    FOR EACH ROW
BEGIN
    DELETE aa
    FROM alunos_aulas aa
             JOIN aulas a
                  ON a.id = aa.id_aula
    WHERE aa.id_aluno = OLD.id_aluno
      AND a.id_turma = OLD.id_turma
      AND a.data_aula >= NOW()
      AND a.id_status IN (1, 4, 5)
      AND aa.origem_registro = 'automatica';
END$$

-- ---------------------------------------------------------
-- AUDITORIA: aulas
-- ---------------------------------------------------------
CREATE TRIGGER trg_aulas_after_insert_auditoria
    AFTER INSERT ON aulas
    FOR EACH ROW
BEGIN
    INSERT INTO logs_auditoria (
        id_usuario,
        tabela_nome,
        registro_id,
        acao,
        dados_antes,
        dados_depois,
        descricao
    )
    VALUES (
               @app_usuario_id,
               'aulas',
               CAST(NEW.id AS CHAR),
               'INSERT',
               NULL,
               JSON_OBJECT(
                       'id', NEW.id,
                       'id_status', NEW.id_status,
                       'id_professor', NEW.id_professor,
                       'id_turma', NEW.id_turma,
                       'assunto', NEW.assunto,
                       'vocabulario', NEW.vocabulario,
                       'saldo', NEW.saldo,
                       'observacoes', NEW.observacoes,
                       'data_aula', DATE_FORMAT(NEW.data_aula, '%Y-%m-%d %H:%i:%s'),
                       'created_at', DATE_FORMAT(NEW.created_at, '%Y-%m-%d %H:%i:%s'),
                       'updated_at', DATE_FORMAT(NEW.updated_at, '%Y-%m-%d %H:%i:%s')
               ),
               'Registro inserido em aulas'
           );
END$$

CREATE TRIGGER trg_aulas_after_update_auditoria
    AFTER UPDATE ON aulas
    FOR EACH ROW
BEGIN
    INSERT INTO logs_auditoria (
        id_usuario,
        tabela_nome,
        registro_id,
        acao,
        dados_antes,
        dados_depois,
        descricao
    )
    VALUES (
               @app_usuario_id,
               'aulas',
               CAST(NEW.id AS CHAR),
               'UPDATE',
               JSON_OBJECT(
                       'id', OLD.id,
                       'id_status', OLD.id_status,
                       'id_professor', OLD.id_professor,
                       'id_turma', OLD.id_turma,
                       'assunto', OLD.assunto,
                       'vocabulario', OLD.vocabulario,
                       'saldo', OLD.saldo,
                       'observacoes', OLD.observacoes,
                       'data_aula', DATE_FORMAT(OLD.data_aula, '%Y-%m-%d %H:%i:%s'),
                       'created_at', DATE_FORMAT(OLD.created_at, '%Y-%m-%d %H:%i:%s'),
                       'updated_at', DATE_FORMAT(OLD.updated_at, '%Y-%m-%d %H:%i:%s')
               ),
               JSON_OBJECT(
                       'id', NEW.id,
                       'id_status', NEW.id_status,
                       'id_professor', NEW.id_professor,
                       'id_turma', NEW.id_turma,
                       'assunto', NEW.assunto,
                       'vocabulario', NEW.vocabulario,
                       'saldo', NEW.saldo,
                       'observacoes', NEW.observacoes,
                       'data_aula', DATE_FORMAT(NEW.data_aula, '%Y-%m-%d %H:%i:%s'),
                       'created_at', DATE_FORMAT(NEW.created_at, '%Y-%m-%d %H:%i:%s'),
                       'updated_at', DATE_FORMAT(NEW.updated_at, '%Y-%m-%d %H:%i:%s')
               ),
               'Registro atualizado em aulas'
           );
END$$

CREATE TRIGGER trg_aulas_after_delete_auditoria
    AFTER DELETE ON aulas
    FOR EACH ROW
BEGIN
    INSERT INTO logs_auditoria (
        id_usuario,
        tabela_nome,
        registro_id,
        acao,
        dados_antes,
        dados_depois,
        descricao
    )
    VALUES (
               @app_usuario_id,
               'aulas',
               CAST(OLD.id AS CHAR),
               'DELETE',
               JSON_OBJECT(
                       'id', OLD.id,
                       'id_status', OLD.id_status,
                       'id_professor', OLD.id_professor,
                       'id_turma', OLD.id_turma,
                       'assunto', OLD.assunto,
                       'vocabulario', OLD.vocabulario,
                       'saldo', OLD.saldo,
                       'observacoes', OLD.observacoes,
                       'data_aula', DATE_FORMAT(OLD.data_aula, '%Y-%m-%d %H:%i:%s'),
                       'created_at', DATE_FORMAT(OLD.created_at, '%Y-%m-%d %H:%i:%s'),
                       'updated_at', DATE_FORMAT(OLD.updated_at, '%Y-%m-%d %H:%i:%s')
               ),
               NULL,
               'Registro removido de aulas'
           );
END$$

-- ---------------------------------------------------------
-- AUDITORIA: contratos
-- ---------------------------------------------------------
CREATE TRIGGER trg_contratos_after_insert_auditoria
    AFTER INSERT ON contratos
    FOR EACH ROW
BEGIN
    INSERT INTO logs_auditoria (
        id_usuario,
        tabela_nome,
        registro_id,
        acao,
        dados_antes,
        dados_depois,
        descricao
    )
    VALUES (
               @app_usuario_id,
               'contratos',
               CAST(NEW.id AS CHAR),
               'INSERT',
               NULL,
               JSON_OBJECT(
                       'id', NEW.id,
                       'id_cliente_representante', NEW.id_cliente_representante,
                       'id_cliente_responsavel', NEW.id_cliente_responsavel,
                       'id_aluno', NEW.id_aluno,
                       'id_tipo_contrato', NEW.id_tipo_contrato,
                       'id_status', NEW.id_status,
                       'id_turma', NEW.id_turma,
                       'valor', NEW.valor,
                       'email_representante', NEW.email_representante,
                       'cpf_representante', NEW.cpf_representante,
                       'rg', NEW.rg,
                       'telefone_representante', NEW.telefone_representante,
                       'est_civil_representante', NEW.est_civil_representante,
                       'desconto_porcentagem', NEW.desconto_porcentagem,
                       'valor_final', NEW.valor_final,
                       'parcelas', NEW.parcelas,
                       'parcelas_descricao', NEW.parcelas_descricao,
                       'numero_aulas', NEW.numero_aulas,
                       'periodicidade', NEW.periodicidade,
                       'tempo_aula', NEW.tempo_aula,
                       'tempo_contrato', NEW.tempo_contrato,
                       'inicio_contrato', IF(NEW.inicio_contrato IS NULL, NULL, DATE_FORMAT(NEW.inicio_contrato, '%Y-%m-%d %H:%i:%s')),
                       'vencimento_contrato', IF(NEW.vencimento_contrato IS NULL, NULL, DATE_FORMAT(NEW.vencimento_contrato, '%Y-%m-%d %H:%i:%s')),
                       'primeira_aula', IF(NEW.primeira_aula IS NULL, NULL, DATE_FORMAT(NEW.primeira_aula, '%Y-%m-%d %H:%i:%s')),
                       'created_at', DATE_FORMAT(NEW.created_at, '%Y-%m-%d %H:%i:%s'),
                       'updated_at', DATE_FORMAT(NEW.updated_at, '%Y-%m-%d %H:%i:%s')
               ),
               'Registro inserido em contratos'
           );
END$$

CREATE TRIGGER trg_contratos_after_update_auditoria
    AFTER UPDATE ON contratos
    FOR EACH ROW
BEGIN
    INSERT INTO logs_auditoria (
        id_usuario,
        tabela_nome,
        registro_id,
        acao,
        dados_antes,
        dados_depois,
        descricao
    )
    VALUES (
               @app_usuario_id,
               'contratos',
               CAST(NEW.id AS CHAR),
               'UPDATE',
               JSON_OBJECT(
                       'id', OLD.id,
                       'id_cliente_representante', OLD.id_cliente_representante,
                       'id_cliente_responsavel', OLD.id_cliente_responsavel,
                       'id_aluno', OLD.id_aluno,
                       'id_tipo_contrato', OLD.id_tipo_contrato,
                       'id_status', OLD.id_status,
                       'id_turma', OLD.id_turma,
                       'valor', OLD.valor,
                       'email_representante', OLD.email_representante,
                       'cpf_representante', OLD.cpf_representante,
                       'rg', OLD.rg,
                       'telefone_representante', OLD.telefone_representante,
                       'est_civil_representante', OLD.est_civil_representante,
                       'desconto_porcentagem', OLD.desconto_porcentagem,
                       'valor_final', OLD.valor_final,
                       'parcelas', OLD.parcelas,
                       'parcelas_descricao', OLD.parcelas_descricao,
                       'numero_aulas', OLD.numero_aulas,
                       'periodicidade', OLD.periodicidade,
                       'tempo_aula', OLD.tempo_aula,
                       'tempo_contrato', OLD.tempo_contrato,
                       'inicio_contrato', IF(OLD.inicio_contrato IS NULL, NULL, DATE_FORMAT(OLD.inicio_contrato, '%Y-%m-%d %H:%i:%s')),
                       'vencimento_contrato', IF(OLD.vencimento_contrato IS NULL, NULL, DATE_FORMAT(OLD.vencimento_contrato, '%Y-%m-%d %H:%i:%s')),
                       'primeira_aula', IF(OLD.primeira_aula IS NULL, NULL, DATE_FORMAT(OLD.primeira_aula, '%Y-%m-%d %H:%i:%s')),
                       'created_at', DATE_FORMAT(OLD.created_at, '%Y-%m-%d %H:%i:%s'),
                       'updated_at', DATE_FORMAT(OLD.updated_at, '%Y-%m-%d %H:%i:%s')
               ),
               JSON_OBJECT(
                       'id', NEW.id,
                       'id_cliente_representante', NEW.id_cliente_representante,
                       'id_cliente_responsavel', NEW.id_cliente_responsavel,
                       'id_aluno', NEW.id_aluno,
                       'id_tipo_contrato', NEW.id_tipo_contrato,
                       'id_status', NEW.id_status,
                       'id_turma', NEW.id_turma,
                       'valor', NEW.valor,
                       'email_representante', NEW.email_representante,
                       'cpf_representante', NEW.cpf_representante,
                       'rg', NEW.rg,
                       'telefone_representante', NEW.telefone_representante,
                       'est_civil_representante', NEW.est_civil_representante,
                       'desconto_porcentagem', NEW.desconto_porcentagem,
                       'valor_final', NEW.valor_final,
                       'parcelas', NEW.parcelas,
                       'parcelas_descricao', NEW.parcelas_descricao,
                       'numero_aulas', NEW.numero_aulas,
                       'periodicidade', NEW.periodicidade,
                       'tempo_aula', NEW.tempo_aula,
                       'tempo_contrato', NEW.tempo_contrato,
                       'inicio_contrato', IF(NEW.inicio_contrato IS NULL, NULL, DATE_FORMAT(NEW.inicio_contrato, '%Y-%m-%d %H:%i:%s')),
                       'vencimento_contrato', IF(NEW.vencimento_contrato IS NULL, NULL, DATE_FORMAT(NEW.vencimento_contrato, '%Y-%m-%d %H:%i:%s')),
                       'primeira_aula', IF(NEW.primeira_aula IS NULL, NULL, DATE_FORMAT(NEW.primeira_aula, '%Y-%m-%d %H:%i:%s')),
                       'created_at', DATE_FORMAT(NEW.created_at, '%Y-%m-%d %H:%i:%s'),
                       'updated_at', DATE_FORMAT(NEW.updated_at, '%Y-%m-%d %H:%i:%s')
               ),
               'Registro atualizado em contratos'
           );
END$$

CREATE TRIGGER trg_contratos_after_delete_auditoria
    AFTER DELETE ON contratos
    FOR EACH ROW
BEGIN
    INSERT INTO logs_auditoria (
        id_usuario,
        tabela_nome,
        registro_id,
        acao,
        dados_antes,
        dados_depois,
        descricao
    )
    VALUES (
               @app_usuario_id,
               'contratos',
               CAST(OLD.id AS CHAR),
               'DELETE',
               JSON_OBJECT(
                       'id', OLD.id,
                       'id_cliente_representante', OLD.id_cliente_representante,
                       'id_cliente_responsavel', OLD.id_cliente_responsavel,
                       'id_aluno', OLD.id_aluno,
                       'id_tipo_contrato', OLD.id_tipo_contrato,
                       'id_status', OLD.id_status,
                       'id_turma', OLD.id_turma,
                       'valor', OLD.valor,
                       'email_representante', OLD.email_representante,
                       'cpf_representante', OLD.cpf_representante,
                       'rg', OLD.rg,
                       'telefone_representante', OLD.telefone_representante,
                       'est_civil_representante', OLD.est_civil_representante,
                       'desconto_porcentagem', OLD.desconto_porcentagem,
                       'valor_final', OLD.valor_final,
                       'parcelas', OLD.parcelas,
                       'parcelas_descricao', OLD.parcelas_descricao,
                       'numero_aulas', OLD.numero_aulas,
                       'periodicidade', OLD.periodicidade,
                       'tempo_aula', OLD.tempo_aula,
                       'tempo_contrato', OLD.tempo_contrato,
                       'inicio_contrato', IF(OLD.inicio_contrato IS NULL, NULL, DATE_FORMAT(OLD.inicio_contrato, '%Y-%m-%d %H:%i:%s')),
                       'vencimento_contrato', IF(OLD.vencimento_contrato IS NULL, NULL, DATE_FORMAT(OLD.vencimento_contrato, '%Y-%m-%d %H:%i:%s')),
                       'primeira_aula', IF(OLD.primeira_aula IS NULL, NULL, DATE_FORMAT(OLD.primeira_aula, '%Y-%m-%d %H:%i:%s')),
                       'created_at', DATE_FORMAT(OLD.created_at, '%Y-%m-%d %H:%i:%s'),
                       'updated_at', DATE_FORMAT(OLD.updated_at, '%Y-%m-%d %H:%i:%s')
               ),
               NULL,
               'Registro removido de contratos'
           );
END$$

-- ---------------------------------------------------------
-- AUDITORIA: alunos_turmas
-- ---------------------------------------------------------
CREATE TRIGGER trg_alunos_turmas_after_insert_auditoria
    AFTER INSERT ON alunos_turmas
    FOR EACH ROW
BEGIN
    INSERT INTO logs_auditoria (
        id_usuario,
        tabela_nome,
        registro_id,
        acao,
        dados_antes,
        dados_depois,
        descricao
    )
    VALUES (
               @app_usuario_id,
               'alunos_turmas',
               CONCAT(NEW.id_aluno, ':', NEW.id_turma),
               'INSERT',
               NULL,
               JSON_OBJECT(
                       'id_aluno', NEW.id_aluno,
                       'id_turma', NEW.id_turma,
                       'created_at', DATE_FORMAT(NEW.created_at, '%Y-%m-%d %H:%i:%s'),
                       'updated_at', DATE_FORMAT(NEW.updated_at, '%Y-%m-%d %H:%i:%s')
               ),
               'Aluno vinculado à turma'
           );
END$$

CREATE TRIGGER trg_alunos_turmas_after_update_auditoria
    AFTER UPDATE ON alunos_turmas
    FOR EACH ROW
BEGIN
    INSERT INTO logs_auditoria (
        id_usuario,
        tabela_nome,
        registro_id,
        acao,
        dados_antes,
        dados_depois,
        descricao
    )
    VALUES (
               @app_usuario_id,
               'alunos_turmas',
               CONCAT(NEW.id_aluno, ':', NEW.id_turma),
               'UPDATE',
               JSON_OBJECT(
                       'id_aluno', OLD.id_aluno,
                       'id_turma', OLD.id_turma,
                       'created_at', DATE_FORMAT(OLD.created_at, '%Y-%m-%d %H:%i:%s'),
                       'updated_at', DATE_FORMAT(OLD.updated_at, '%Y-%m-%d %H:%i:%s')
               ),
               JSON_OBJECT(
                       'id_aluno', NEW.id_aluno,
                       'id_turma', NEW.id_turma,
                       'created_at', DATE_FORMAT(NEW.created_at, '%Y-%m-%d %H:%i:%s'),
                       'updated_at', DATE_FORMAT(NEW.updated_at, '%Y-%m-%d %H:%i:%s')
               ),
               'Vinculo aluno/turma atualizado'
           );
END$$

CREATE TRIGGER trg_alunos_turmas_after_delete_auditoria
    AFTER DELETE ON alunos_turmas
    FOR EACH ROW
BEGIN
    INSERT INTO logs_auditoria (
        id_usuario,
        tabela_nome,
        registro_id,
        acao,
        dados_antes,
        dados_depois,
        descricao
    )
    VALUES (
               @app_usuario_id,
               'alunos_turmas',
               CONCAT(OLD.id_aluno, ':', OLD.id_turma),
               'DELETE',
               JSON_OBJECT(
                       'id_aluno', OLD.id_aluno,
                       'id_turma', OLD.id_turma,
                       'created_at', DATE_FORMAT(OLD.created_at, '%Y-%m-%d %H:%i:%s'),
                       'updated_at', DATE_FORMAT(OLD.updated_at, '%Y-%m-%d %H:%i:%s')
               ),
               NULL,
               'Aluno removido da turma'
           );
END$$

-- ---------------------------------------------------------
-- AUDITORIA: alunos_aulas
-- ---------------------------------------------------------
CREATE TRIGGER trg_alunos_aulas_after_insert_auditoria
    AFTER INSERT ON alunos_aulas
    FOR EACH ROW
BEGIN
    INSERT INTO logs_auditoria (
        id_usuario,
        tabela_nome,
        registro_id,
        acao,
        dados_antes,
        dados_depois,
        descricao
    )
    VALUES (
               @app_usuario_id,
               'alunos_aulas',
               CONCAT(NEW.id_aluno, ':', NEW.id_aula),
               'INSERT',
               NULL,
               JSON_OBJECT(
                       'id_aluno', NEW.id_aluno,
                       'id_aula', NEW.id_aula,
                       'origem_registro', NEW.origem_registro,
                       'observacao_aluno_aula', NEW.observacao_aluno_aula,
                       'updated_at', DATE_FORMAT(NEW.updated_at, '%Y-%m-%d %H:%i:%s')
               ),
               'Aluno vinculado à aula'
           );
END$$

CREATE TRIGGER trg_alunos_aulas_after_update_auditoria
    AFTER UPDATE ON alunos_aulas
    FOR EACH ROW
BEGIN
    INSERT INTO logs_auditoria (
        id_usuario,
        tabela_nome,
        registro_id,
        acao,
        dados_antes,
        dados_depois,
        descricao
    )
    VALUES (
               @app_usuario_id,
               'alunos_aulas',
               CONCAT(NEW.id_aluno, ':', NEW.id_aula),
               'UPDATE',
               JSON_OBJECT(
                       'id_aluno', OLD.id_aluno,
                       'id_aula', OLD.id_aula,
                       'origem_registro', OLD.origem_registro,
                       'observacao_aluno_aula', OLD.observacao_aluno_aula,
                       'updated_at', DATE_FORMAT(OLD.updated_at, '%Y-%m-%d %H:%i:%s')
               ),
               JSON_OBJECT(
                       'id_aluno', NEW.id_aluno,
                       'id_aula', NEW.id_aula,
                       'origem_registro', NEW.origem_registro,
                       'observacao_aluno_aula', NEW.observacao_aluno_aula,
                       'updated_at', DATE_FORMAT(NEW.updated_at, '%Y-%m-%d %H:%i:%s')
               ),
               'Vinculo aluno/aula atualizado'
           );
END$$

CREATE TRIGGER trg_alunos_aulas_after_delete_auditoria
    AFTER DELETE ON alunos_aulas
    FOR EACH ROW
BEGIN
    INSERT INTO logs_auditoria (
        id_usuario,
        tabela_nome,
        registro_id,
        acao,
        dados_antes,
        dados_depois,
        descricao
    )
    VALUES (
               @app_usuario_id,
               'alunos_aulas',
               CONCAT(OLD.id_aluno, ':', OLD.id_aula),
               'DELETE',
               JSON_OBJECT(
                       'id_aluno', OLD.id_aluno,
                       'id_aula', OLD.id_aula,
                       'origem_registro', OLD.origem_registro,
                       'observacao_aluno_aula', OLD.observacao_aluno_aula,
                       'updated_at', DATE_FORMAT(OLD.updated_at, '%Y-%m-%d %H:%i:%s')
               ),
               NULL,
               'Aluno removido da aula'
           );
END$$

DELIMITER ;
