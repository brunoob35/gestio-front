# Deploy na VPS Hostinger

## Estrutura esperada na VPS

```text
/opt/gestio/
  docker-compose.yml
  .env
  certbot/
    conf/
    www/
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

## Ativando HTTPS

Depois que `gestioonline.com` e `www.gestioonline.com` estiverem apontando para a VPS:

1. criar as pastas do Let's Encrypt:

```bash
mkdir -p /opt/gestio/certbot/conf
mkdir -p /opt/gestio/certbot/www
```

2. parar temporariamente o `nginx`:

```bash
cd /opt/gestio
docker compose stop nginx
```

3. emitir o certificado:

```bash
docker run --rm -p 80:80 \
  -v /opt/gestio/certbot/conf:/etc/letsencrypt \
  certbot/certbot certonly --standalone \
  -d gestioonline.com -d www.gestioonline.com \
  --agree-tos \
  -m noreplygestio@gmail.com \
  --no-eff-email
```

4. atualizar na VPS os arquivos `docker-compose.yml` e `nginx/default.conf` com a versão mais recente do repositório

5. subir novamente o `nginx`:

```bash
cd /opt/gestio
docker compose up -d nginx
```

6. testar:

```bash
curl -I https://gestioonline.com
curl -I https://www.gestioonline.com
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
