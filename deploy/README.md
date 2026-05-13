# Deploy na VPS Hostinger

## Estrutura esperada na VPS

```text
/opt/gestio/
  docker-compose.yml
  .env
  nginx/
    default.conf
  frontend/
    dist/
  mysql/
    data/
  mysql-init/
    001-migrations.sql
```

## Primeira subida

1. Copiar os arquivos de `deploy/` para `/opt/gestio/`
2. Criar `/opt/gestio/.env` a partir de `.env.example`
3. Garantir que o DNS do domínio aponta para a VPS
4. Rodar:

```bash
cd /opt/gestio
docker compose pull
docker compose up -d
```

## Observações

- o MySQL executa `001-migrations.sql` automaticamente no primeiro boot com volume vazio
- o backend espera encontrar o arquivo `.env` montado em `/app/.env`
- o front deve ser publicado em `/opt/gestio/frontend/dist`
- o `nginx` publica o front e encaminha `/api/*` para o backend

## Atualização do front

Basta atualizar o conteúdo de `frontend/dist` e recriar o container do `nginx` se necessário:

```bash
cd /opt/gestio
docker compose up -d nginx
```

## Atualização do backend

Atualize a imagem configurada em `BACKEND_IMAGE` e rode:

```bash
cd /opt/gestio
docker compose pull backend
docker compose up -d backend
```
