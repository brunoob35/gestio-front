# Roadmap de Implementação - Gestio

Documento de apoio para mapear o que já foi entregue no projeto e o que ainda falta para concluir as telas de gestão, com foco em `DB`, `Back-end` e `Front-end`.

Data de referência: `2026-05-06`

## DB

### Tabelas já criadas

- [x] `usuarios`
- [x] `usuarios_permissoes`
- [x] `professores`
- [x] `alunos`
- [x] `turmas`
- [x] `aulas`
- [x] `alunos_turmas`
- [x] `alunos_aulas`
- [x] `password_reset`
- [x] Estrutura de autenticação baseada em usuários e permissões
- [x] Estrutura de relacionamento entre turmas, alunos e aulas

### Tabelas / estruturas que faltam

- [ ] `clientes`
- [ ] `clientes_alunos` ou vínculo equivalente entre responsável e aluno
- [ ] `contratos`
- [ ] `contratos_status` ou estrutura equivalente para status de contrato
- [ ] `presencas` ou estrutura equivalente por aula/aluno
- [ ] `solicitacoes_reagendamento`
- [ ] `solicitacoes_cancelamento`
- [ ] `logs_auditoria`
- [ ] Estrutura de preferências / configurações do usuário
- [ ] Estrutura auxiliar para relatórios, se necessário

### Observações importantes

- [x] `CPF` do aluno deve permanecer opcional
- [x] `clientes` representam os responsáveis dos alunos
- [x] Um contrato deve pertencer a um `cliente` e referenciar um único `aluno`
- [x] Um cliente pode ter múltiplos contratos válidos ao mesmo tempo
- [ ] Consolidar formalmente no banco o vínculo entre `cliente`, `aluno` e `contrato`

## Back-end

### Autenticação e usuários

- [x] Login com JWT
- [x] Recuperação de senha
- [x] Redefinição de senha
- [x] CRUD básico de usuários
- [x] Controle de permissões por rota
- [ ] Endpoints focados no usuário autenticado (`/me`, perfil, foto, preferências)

### Professores

- [x] `POST /users/professors`
- [x] `GET /professors`
- [x] `GET /professors/all`
- [x] `POST /professors/classes-count`
- [x] `PATCH /professors/{professorID}/classes/{classID}`
- [x] Listagem de professores para seleção em turmas
- [x] Contagem de turmas por professor

### Alunos

- [x] `POST /students`
- [x] `GET /students`
- [x] `GET /students/{studentID}`
- [x] `GET /students/{studentID}/classes`
- [x] `PUT /students/{studentID}`
- [x] `DELETE /students/{studentID}`
- [x] Listagem das turmas vinculadas ao aluno
- [ ] Persistência completa de dados pessoais adicionais do aluno
- [ ] Persistência real de responsável no módulo de alunos
- [ ] Integração com contratos do aluno

### Turmas

- [x] `POST /classes`
- [x] `GET /classes`
- [x] `GET /classes/all`
- [x] `GET /classes/{classID}`
- [x] `PUT /classes/{classID}`
- [x] `DELETE /classes/{classID}`
- [x] `GET /classes/{classID}/students`
- [x] `POST /classes/{classID}/students/{studentID}`
- [x] `DELETE /classes/{classID}/students/{studentID}`
- [x] `POST /classes/private`
- [x] Criação e edição de turma
- [x] Recorrência em turma
- [x] Geração automática de aulas a partir da recorrência
- [x] Encerramento de turma
- [x] Cancelamento de aulas em aberto ao encerrar turma
- [x] Troca de professor
- [x] Vínculo de aluno à turma
- [ ] Contagem de alunos já embutida no `GET /classes`

### Aulas

- [x] `POST /lessons`
- [x] `GET /lessons`
- [x] `GET /lessons/{lessonID}`
- [x] `PUT /lessons/{lessonID}`
- [x] `DELETE /lessons/{lessonID}`
- [x] `PATCH /lessons/{lessonID}/status`
- [x] `GET /lessons/{lessonID}/students`
- [x] `POST /lessons/{lessonID}/students/{studentID}`
- [x] `DELETE /lessons/{lessonID}/students/{studentID}`
- [x] `GET /classes/{classID}/lessons`
- [x] CRUD de aulas
- [x] Atualização de status da aula
- [x] Vínculo de alunos em aula
- [x] Listagem de aulas por turma
- [ ] Fluxo de presença por aula
- [ ] Fluxo de reagendamento/cancelamento com solicitação

### Clientes / responsáveis

- [ ] Criar módulo de clientes no back
- [ ] `POST /clients`
- [ ] `GET /clients`
- [ ] `GET /clients/{clientID}`
- [ ] `PUT /clients/{clientID}`
- [ ] `DELETE /clients/{clientID}`
- [ ] Endpoint para vínculo cliente x aluno
- [ ] Endpoint para listar alunos por responsável

### Contratos

- [ ] Criar módulo de contratos no back
- [ ] `POST /contracts`
- [ ] `GET /contracts`
- [ ] `GET /contracts/{contractID}`
- [ ] `PUT /contracts/{contractID}`
- [ ] `PATCH /contracts/{contractID}/renew`
- [ ] `PATCH /contracts/{contractID}/status`
- [ ] `GET /students/{studentID}/contracts`
- [ ] `GET /clients/{clientID}/contracts`
- [ ] Regra de renovação de contrato
- [ ] Regra de vínculo contrato x cliente x aluno

### Presenças e agendamentos

- [ ] Endpoint para calendário de aulas
- [ ] Endpoint para listar aulas do dia
- [ ] Endpoint para marcar presença
- [ ] Endpoint para confirmar/cancelar aula
- [ ] Endpoint para solicitar reagendamento
- [ ] Endpoint para solicitar cancelamento
- [ ] Endpoint para aprovar solicitação
- [ ] Endpoint para recusar solicitação

### Relatórios

- [ ] Endpoint de receita por período
- [ ] Endpoint de total de alunos ativos
- [ ] Endpoint de frequência por período
- [ ] Endpoint de inadimplência
- [ ] Endpoint de relatórios filtrados por tipo, data e status

### Configurações

- [ ] `GET /me`
- [ ] `PUT /me`
- [ ] `PATCH /me/password`
- [ ] `PATCH /me/photo`
- [ ] `GET /me/permissions`
- [ ] `GET /me/notifications`
- [ ] `PUT /me/notifications`

### Auditoria

- [ ] Criar infraestrutura de auditoria no back
- [ ] Criar tabela de logs de auditoria no banco
- [ ] Definir payload mínimo de auditoria
- [ ] Registrar usuário da ação
- [ ] Registrar ação realizada
- [ ] Registrar entidade e id afetado
- [ ] Registrar estado anterior e estado posterior
- [ ] Registrar diff da alteração
- [ ] Registrar rota e status da operação
- [ ] Aplicar auditoria em `POST /classes`
- [ ] Aplicar auditoria em `PUT /classes/{classID}`
- [ ] Aplicar auditoria em `DELETE /classes/{classID}`
- [ ] Aplicar auditoria em `POST /classes/{classID}/students/{studentID}`
- [ ] Aplicar auditoria em `DELETE /classes/{classID}/students/{studentID}`
- [ ] Aplicar auditoria em `PATCH /professors/{professorID}/classes/{classID}`
- [ ] Aplicar auditoria em `POST /students`
- [ ] Aplicar auditoria em `PUT /students/{studentID}`
- [ ] Aplicar auditoria em `DELETE /students/{studentID}`
- [ ] Aplicar auditoria em `POST /lessons`
- [ ] Aplicar auditoria em `PUT /lessons/{lessonID}`
- [ ] Aplicar auditoria em `DELETE /lessons/{lessonID}`
- [ ] Aplicar auditoria em `PATCH /lessons/{lessonID}/status`

## Front-end

### Estrutura base

- [x] Shell de gestão com sidebar e navegação principal
- [x] Roteamento protegido por permissão
- [x] Fluxo de login
- [x] Fluxo de esqueci minha senha
- [x] Fluxo de redefinição de senha
- [x] Cache compartilhado simples para dados de gestão

### Professores

- [x] Página `GestaoProfessoresPage`
- [x] Página `GestaoProfessorViewPage`
- [x] Card / tabela de professores cadastrados
- [x] Modal de professor
- [x] Contagem de turmas por professor

### Turmas

- [x] Página `GestaoTurmasPage`
- [x] Card turmas cadastradas
- [x] Busca por nome da turma
- [x] Modal `ClassModal`
- [x] Modal `TeacherAssignmentModal`
- [x] Modal `ClassStudentsModal`
- [x] Criação de turma
- [x] Edição de turma
- [x] Recorrência integrada ao modal
- [x] Troca de professor
- [x] Vínculo de alunos
- [x] Expansão da linha para ver professor, alunos e aulas
- [x] Contagem de alunos na tabela
- [ ] Corrigir definitivamente o bug de tela branca ao expandir turma

### Alunos

- [x] Página `GestaoAlunosPage`
- [x] Card alunos cadastrados
- [x] Busca por nome
- [x] Filtro por status
- [x] Ordenação alfabética
- [x] Card histórico e timeline como placeholder
- [x] Card turmas do aluno
- [x] Expansão da turma do aluno para ver aulas
- [x] Modal `StudentModal`
- [ ] Preencher responsável real via módulo de clientes
- [ ] Preencher contratos reais do aluno
- [ ] Substituir timeline placeholder por eventos reais

### Clientes

- [ ] Página de clientes / responsáveis
- [ ] Card clientes cadastrados
- [ ] Busca por nome
- [ ] Filtro por status
- [ ] Modal de criação/edição de cliente
- [ ] Painel para listar alunos sob responsabilidade
- [ ] Painel para listar contratos do cliente

### Contratos

- [ ] Página `Gestão de Contratos`
- [ ] Barra de busca por aluno ou id do contrato
- [ ] Filtro por status
- [ ] Botão `Novo Contrato`
- [ ] Botão `Renovar Contrato`
- [ ] Card de contratos ativos
- [ ] Card de contratos pendentes
- [ ] Card de contratos vencidos
- [ ] Card de contratos cadastrados
- [ ] Tabela de contratos
- [ ] Ação de visualizar contrato
- [ ] Ação de download / geração de arquivo
- [ ] Modal de criação, edição e renovação

### Presenças

- [ ] Página `Presenças e Agendamentos`
- [ ] Card de calendário
- [ ] Legenda de status do calendário
- [ ] Card de aulas de hoje
- [ ] Botão `Marcar Presença`
- [ ] Status da aula
- [ ] Card de solicitações pendentes
- [ ] Ação `Aprovar`
- [ ] Ação `Recusar`

### Relatórios

- [ ] Página `Relatórios`
- [ ] Card de receita total
- [ ] Card de alunos ativos
- [ ] Card de taxa de frequência
- [ ] Card de inadimplência
- [ ] Card de filtros do relatório
- [ ] Filtro por tipo
- [ ] Filtro por data inicial
- [ ] Filtro por data final
- [ ] Filtro por status
- [ ] Botão `Gerar Relatório`

### Configurações

- [ ] Página `Configurações`
- [ ] Aba `Perfil`
- [ ] Aba `Notificações`
- [ ] Aba `Permissões`
- [ ] Card de informações do perfil
- [ ] Ação de alterar foto
- [ ] Formulário de dados pessoais
- [ ] Card de alteração de senha
- [ ] Ação de salvar alterações

## Mapa resumido por módulo

### Front-end

- [x] Página alunos
- [x] Card alunos cadastrados
- [x] Card histórico e timeline
- [x] Card turmas do aluno
- [x] Página turmas
- [x] Card turmas cadastradas
- [x] Modal de recorrência
- [x] Modal de professor
- [x] Modal de alunos da turma
- [ ] Página contratos
- [ ] Resumo de status de contratos
- [ ] Tabela de contratos
- [ ] Ações de renovação, visualização e download
- [ ] Página presenças
- [ ] Calendário
- [ ] Aulas de hoje
- [ ] Solicitações pendentes
- [ ] Página relatórios
- [ ] KPIs
- [ ] Filtros
- [ ] Geração de relatório
- [ ] Página configurações
- [ ] Perfil
- [ ] Notificações
- [ ] Permissões
- [ ] Alteração de senha

### Back-end

- [x] Aulas
- [x] Rota create de aula
- [x] Rota update de aula
- [x] Rota update de status da aula
- [x] Rota de aulas por turma
- [x] Turmas
- [x] CRUD de turma
- [x] Vincular e remover aluno da turma
- [x] Criar turma particular
- [x] Alunos
- [x] CRUD de aluno
- [x] Listar turmas do aluno
- [x] Professores
- [x] Listagem
- [x] Contagem de turmas
- [x] Vincular professor à turma
- [ ] Contratos
- [ ] CRUD de contrato
- [ ] Renovação
- [ ] Filtros e listagem por aluno / cliente
- [ ] Presenças
- [ ] Marcar presença
- [ ] Confirmar/cancelar aula
- [ ] Aprovar/recusar solicitação
- [ ] Auditoria
- [ ] Middleware ou contexto de auditoria
- [ ] Serviço de persistência de log
- [ ] Aplicação nas rotas mutáveis

### DB

- [x] `usuarios`
- [x] `usuarios_permissoes`
- [x] `professores`
- [x] `alunos`
- [x] `turmas`
- [x] `aulas`
- [x] `alunos_turmas`
- [x] `alunos_aulas`
- [x] `password_reset`
- [ ] `clientes`
- [ ] `contratos`
- [ ] `logs_auditoria`
- [ ] `presencas`
- [ ] `solicitacoes_reagendamento`
- [ ] `solicitacoes_cancelamento`
- [ ] `preferencias_usuario` ou equivalente

## Prioridade sugerida

- [ ] Consolidar `clientes` no DB e no back
- [ ] Criar módulo de `contratos`
- [ ] Integrar `clientes`, `alunos` e `contratos` no front
- [ ] Implementar `presenças e agendamentos`
- [ ] Implementar `relatórios`
- [ ] Implementar `configurações`
- [ ] Retomar `auditoria` no back após estabilizar os fluxos principais
