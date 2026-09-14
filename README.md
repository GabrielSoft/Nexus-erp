# Nexus ERP

Plataforma SaaS de gestão empresarial com frontend React/Vite, API REST TypeScript/Express, PostgreSQL/Prisma e autenticação JWT com refresh token.

## Arquitetura

- `frontend`: SPA React + Vite + React Router + TanStack Query.
- `backend`: API Express organizada em rotas, serviços, middlewares e validações Zod.
- `PostgreSQL`: persistência acessada pelo Prisma.
- `nginx`: serve o frontend Docker e encaminha `/api/*` para a API.
- A venda é transacional e baixa o estoque de forma condicional para evitar estoque negativo em concorrência.

## Desenvolvimento local

1. Copie `.env.example` para `.env` na raiz.
2. Copie `frontend/.env.example` para `frontend/.env`.
3. Execute `npm install` na raiz.
4. Suba o banco: `docker compose up -d postgres`.
5. Gere o Prisma: `npm run prisma:generate -w backend`.
6. Execute a migration: `npm run prisma:migrate -w backend -- --name init`.
7. Execute o seed: `npm run prisma:seed -w backend`.
8. Execute `npm run dev`.

Frontend de desenvolvimento: `http://localhost:5173`.
API: `http://localhost:3333`.
Health check: `http://localhost:3333/api/health`.

## Docker

Para subir tudo de uma vez:

```bash
docker compose up --build -d
```

Frontend: `http://localhost:8080`.
API: `http://localhost:3333`.

O container da API executa as migrations automaticamente. No Compose local, `RUN_SEED=true` executa também o seed idempotente e cria o administrador inicial.

Credenciais locais do administrador:

- E-mail: `admin@nexuserp.com`
- Senha: `Nexus@123`

**Não use essas credenciais em produção.** Defina `ADMIN_EMAIL` e `ADMIN_PASSWORD` próprios e mantenha `RUN_SEED=false` depois da inicialização.

## Variáveis de ambiente

Backend:

- `DATABASE_URL`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `FRONTEND_URL`
- `CORS_ORIGINS` — origens separadas por vírgula
- `PORT`
- `RUN_SEED` — somente para inicialização controlada
- `ADMIN_EMAIL` / `ADMIN_PASSWORD` — somente quando o seed for executado

Frontend em desenvolvimento:

- `VITE_API_URL=http://localhost:3333/api`

No build Docker, o padrão é `VITE_API_URL=/api`, usando o proxy do nginx e evitando dependência de `localhost` dentro do bundle.

## Qualidade

```bash
npm run lint
npm run test
npm run build
```

Antes de deployar, confirme que as variáveis de produção foram configuradas e que o frontend usa a URL pública da API ou o proxy `/api`.

## Endpoints principais

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/me`
- `GET|POST|PATCH|DELETE /api/customers`
- `GET|POST|PATCH|DELETE /api/products`
- `GET|POST /api/sales`
- `GET /api/financial`
- `GET /api/dashboard`
- `GET /api/reports/:type?format=csv`
