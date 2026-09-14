# Nexus ERP — revisão técnica

Esta versão foi revisada com foco em compilação, tipagem, autenticação, vendas, estoque, dashboard e integração frontend/backend.

## Correções aplicadas
- Corrigido import do middleware de erros (`middlewares/error.ts`).
- Corrigido tipagem do `asyncHandler`.
- Autenticação de login/refresh centralizada no serviço `auth.service.ts`.
- Login e refresh passam a usar `JWT_ACCESS_SECRET` e `JWT_REFRESH_SECRET` corretamente.
- Refresh token é rotacionado pelo serviço existente.
- Corrigido uso de `req.auth`.
- Corrigido gráfico do dashboard para usar o campo `revenue` de forma consistente.
- Dashboard deixou de executar uma consulta por dia para o gráfico; agora busca o período em uma consulta e agrega em memória.
- Endpoint de estoque baixo retorna somente produtos realmente abaixo/acima do limite configurado.
- Alteração manual de estoque gera `StockMovement` do tipo `ADJUSTMENT`.
- Rota `/sales` do frontend foi ligada à página real `Sales.tsx`.
- Corrigido consumo de `/sales` no frontend: a API retorna `{ data, total }`.
- Corrigido alerta de lint no dashboard e financeiro.
- Typecheck backend e frontend passou.
- Lint backend e frontend passou.

## Observação
O arquivo `.env` original não foi incluído nesta distribuição. Use o `.env.example` e mantenha seus segredos somente no ambiente local.

## Validação
- `npm run typecheck`: OK
- `npm run lint`: OK
- Os testes automatizados não foram executados nesta cópia porque o ZIP original continha `node_modules` de outro ambiente/plataforma e faltava um binário opcional do Rollup. No ambiente local do projeto, reinstale as dependências caso o Vitest apresente esse erro.
