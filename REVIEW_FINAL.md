# Revisão final — Nexus ERP

## Corrigido

- Corrigido o cadastro de usuário: a senha não é mais enviada indevidamente para o Prisma como campo do `User`.
- Corrigido o fluxo de API no Docker: o frontend usa `/api` no build Docker e o nginx encaminha para o serviço `api`.
- CORS passou a aceitar origens configuráveis por `CORS_ORIGINS`.
- Rotas assíncronas passaram a encaminhar rejeições para o middleware de erro.
- Erros comuns do Prisma passaram a retornar 404/409 em vez de 500 genérico.
- Refresh token passou a validar assinatura, usuário, expiração e correspondência do `sub`.
- Refresh token não é tentado automaticamente em login, cadastro, refresh ou logout.
- Validações Zod foram fortalecidas e e-mails são normalizados.
- Logout só remove o refresh token pertencente ao usuário autenticado.
- Seed ficou idempotente e com permissões por função; o administrador pode ser configurado por variáveis.
- Docker passou a executar migrations automaticamente e o seed somente quando `RUN_SEED=true`.
- Criados `.dockerignore` para evitar copiar `node_modules`, `.env` e artefatos para as imagens.
- Cadastro de clientes/produtos agora possui criação, edição e exclusão na interface.
- Busca de clientes inclui telefone; busca de produtos inclui SKU.
- Corrigido o link `/register`, que antes renderizava novamente a tela de login.
- Criada tela real de cadastro.
- Sessão salva no `localStorage` agora é lida com proteção contra JSON inválido.
- Relatórios CSV passaram a ter cabeçalho e escape correto de campos.
- Estoque de venda passou a ser decrementado de forma condicional dentro da transação, evitando estoque negativo em concorrência.
- Desconto maior que o subtotal e produto repetido na mesma venda são rejeitados.
- Dashboard passou a considerar somente vendas concluídas nos indicadores de vendas/faturamento.

## Verificações executadas

- TypeScript backend: **OK** (`tsc --noEmit`).
- TypeScript frontend: **OK** (`tsc -b`).
- ESLint backend: **OK**.
- ESLint frontend: **OK**.
- Build Vite e Vitest não puderam ser executados neste ambiente porque o `node_modules` original veio de outro sistema operacional e não contém o binário opcional Linux do Rollup. Isso não é erro do código-fonte nem do `package-lock`; em uma instalação limpa com `npm ci` as dependências nativas devem ser instaladas para a plataforma correta.

## Pendências externas

- Em desenvolvimento direto: `frontend/.env` pode usar `VITE_API_URL=http://localhost:3333/api`.
- No Docker: o build já define `VITE_API_URL=/api` e usa nginx.
- Em produção, configure `CORS_ORIGINS` com a origem pública real do frontend.
- Use segredos JWT longos e aleatórios em produção.
- Não use `RUN_SEED=true` nem as credenciais locais de exemplo em produção.
