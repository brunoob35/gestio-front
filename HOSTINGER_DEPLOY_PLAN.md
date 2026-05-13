# Plano de Deploy na Hostinger

## Objetivo

Publicar o sistema `Gestio` inteiramente na Hostinger, com:

- Front-end em produção
- Back-end Go em produção
- MySQL novo, criado do zero
- Deploy automático a partir da branch de produção
- Uso das migrations já existentes no projeto

## Arquitetura recomendada

Usar uma `VPS` da Hostinger com `Docker Compose`.

Serviços:

- `nginx`
  - reverse proxy
  - TLS
  - entrega do front buildado
  - encaminhamento de `/api` para o backend
- `frontend`
  - build do Vite
  - pode ser servido por `nginx`
- `backend`
  - aplicação Go compilada em container
- `mysql`
  - banco novo do sistema
- `backup` opcional depois
  - rotina de dump automático

## Domínio

Sugestão simples:

- `gestioonline.com`
  - front-end
- `api.gestioonline.com`
  - opcional
  - pode apontar direto para o backend

Estratégia mais simples:

- manter tudo sob `gestioonline.com`
- `nginx` serve front
- `nginx` encaminha `/api/*` para o backend

Isso evita CORS complexo e simplifica bastante.

## Fluxo de produção

1. Fazer merge na branch `production`
2. GitHub Actions dispara pipeline
3. Pipeline:
   - builda front
   - builda imagem do backend
   - sobe artefatos/imagens
   - conecta na VPS
   - atualiza containers
   - roda migrations do banco novo se necessário
4. Aplicação entra no ar

## Estrutura sugerida na VPS

```text
/opt/gestio/
  docker-compose.yml
  .env
  nginx/
    default.conf
  mysql/
    data/
  backups/
```

## Estratégia de banco

Como o banco atual da AWS é apenas de desenvolvimento, a estratégia mais limpa é:

1. criar um MySQL novo na Hostinger
2. rodar o script principal de criação do banco
3. validar tabelas, seeds e views
4. começar a popular a base nova

## Scripts do banco

Ordem recomendada:

1. `migrations.sql`
   - cria banco, tabelas, relações, seeds e triggers
2. `dashboard_analytics_upgrade.sql`
   - só usar se a `migration` principal não estiver atualizada no ambiente final

Se o banco for criado do zero e a `migrations.sql` já estiver completa, o ideal é usar só ela.

## Estratégia de containers

### Front-end

Build do Vite gerando `dist/`.

Opções:

- buildar no GitHub Actions e enviar só o `dist`
- ou buildar dentro de imagem Docker

Recomendação:

- buildar no pipeline
- servir com `nginx`

### Back-end

Build em multi-stage:

1. imagem Go compila binário
2. imagem final pequena executa o binário

### MySQL

Usar volume persistente no Docker Compose.

Também configurar:

- usuário da aplicação
- senha forte
- volume persistente
- timezone correta

## Variáveis de ambiente

Separar por serviço:

### Backend

- `APP_PORT`
- `DB_HOST`
- `DB_PORT`
- `DB_USER`
- `DB_PASSWORD`
- `DB_NAME`
- `JWT_SECRET`
- `CORS_ALLOWED_ORIGIN`
- credenciais de e-mail se houver

### MySQL

- `MYSQL_ROOT_PASSWORD`
- `MYSQL_DATABASE`
- `MYSQL_USER`
- `MYSQL_PASSWORD`

## Pipeline sugerida

GitHub Actions na branch `production`.

Etapas:

1. checkout
2. instalar dependências do front
3. `npm run build`
4. build do backend Go
5. montar imagens Docker
6. enviar arquivos para VPS
7. executar:
   - `docker compose pull` ou `docker compose build`
   - `docker compose up -d`

## Estratégia de deploy

### Fase 1

Subida inicial manual:

- criar VPS
- instalar Docker e Docker Compose
- configurar domínio
- configurar `.env`
- subir stack
- rodar migration

### Fase 2

Automatizar:

- SSH deploy por GitHub Actions
- restart controlado dos containers

### Fase 3

Melhorias:

- backups automáticos
- monitoramento
- ambiente staging

## Backups

Mesmo com banco novo do zero, o backup deve entrar cedo.

Recomendação mínima:

- dump diário com `mysqldump`
- retenção de 7 a 14 dias
- cópia fora da VPS depois, se possível

## Segurança mínima

- SSH com chave, sem senha
- usuário não-root para deploy
- firewall da VPS
- portas públicas só para:
  - `80`
  - `443`
  - `22` com restrição se possível
- MySQL não exposto publicamente
- segredos só em `.env` no servidor e GitHub Secrets

## Ordem de implementação

### Etapa 1

- preparar `Dockerfile` do backend
- preparar `Dockerfile` ou estratégia de build do front
- criar `docker-compose.yml`

### Etapa 2

- preparar `nginx.conf`
- configurar domínio na Hostinger
- apontar DNS para a VPS

### Etapa 3

- subir banco MySQL novo
- rodar `migrations.sql`
- validar login do sistema

### Etapa 4

- criar workflow de deploy no GitHub Actions
- conectar deploy à branch `production`

### Etapa 5

- configurar backup do MySQL
- validar restore

## Recomendação final

Para o momento atual, o caminho mais equilibrado é:

- `1 VPS Hostinger`
- `Docker Compose`
- `Nginx + Front + Back + MySQL`
- banco criado do zero com a migration atual
- deploy automático pela branch `production`

Isso mantém:

- custo baixo
- arquitetura simples
- pouca dependência externa
- migração direta do que já foi construído

## Próximo passo

Gerar os arquivos operacionais:

- `Dockerfile` do backend
- `Dockerfile` ou fluxo do front
- `docker-compose.yml`
- `nginx.conf`
- workflow do GitHub Actions
