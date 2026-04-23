# Workspace — DN. Maria

## Overview

pnpm workspace monorepo (TypeScript). Loja de página única para o produto
"Alho Triturado DN. Maria" com checkout Mercado Pago (Bricks) integrado.

## Artifacts

| Artifact | Tipo | Descrição |
| --- | --- | --- |
| `artifacts/dn-maria` | web (React + Vite) | Loja / landing + Checkout Modal |
| `artifacts/api-server` | api (Express 5) | API de checkout, integração Mercado Pago, webhook |
| `artifacts/mockup-sandbox` | design | Sandbox de componentes |

## Stack

- pnpm workspaces, Node 24, TypeScript 5.9
- Frontend: React 19, Vite 7, TailwindCSS, wouter, framer-motion
- Backend: Express 5, Mercado Pago SDK v2, Zod, Pino, Helmet, express-rate-limit
- DB: PostgreSQL + Drizzle (schema pendente — pedidos ainda não persistidos)

## Comandos

- `pnpm run typecheck` — typecheck full
- `pnpm run build` — build completo
- `pnpm --filter @workspace/api-server dev` — API local
- `pnpm --filter @workspace/dn-maria dev` — front local

## Integração Mercado Pago

- Frontend monta o **Payment Brick** (cartão de crédito/débito + Pix) usando
  `MERCADOPAGO_PUBLIC_KEY` retornado por `GET /api/checkout/config`.
- Backend cria o pagamento via SDK oficial (`POST /api/checkout/card` e
  `POST /api/checkout/pix`). Preço é **sempre recalculado no servidor** com
  base em uma tabela fixa, ignorando qualquer valor enviado pelo cliente.
- Pix: front faz polling em `GET /api/checkout/status/:id` (limite de 15min).
- Webhook: `POST /api/checkout/webhook` valida assinatura HMAC-SHA256 com
  `MERCADOPAGO_WEBHOOK_SECRET` (header `x-signature` + `x-request-id`).

## Segurança aplicada na API

- `helmet` (headers de segurança) e `x-powered-by` desativado.
- CORS com allowlist via `CORS_ALLOWED_ORIGINS` (vazio = liberado, só dev).
- `trust proxy` ativo (Railway/Vercel/Cloudflare).
- Body limit 32kb em todas as rotas.
- Validação **Zod** estrita em todos os endpoints de checkout.
- Rate limit: 10 req/min em `/checkout/card` e `/checkout/pix`; 60 req/min em
  `/checkout/status/:id` (por IP).
- Erros do Mercado Pago são logados internamente; o cliente recebe apenas
  códigos/descrições já mapeados (sem vazar `cause` cru).
- Idempotency key aceita do cliente (`idempotency_key`) ou gerada via
  `crypto.randomBytes` para evitar cobranças duplicadas em retry.
- Logger redacta `authorization`, `cookie` e `set-cookie`.
- Graceful shutdown em SIGTERM/SIGINT (15s) — importante no Railway.

## Variáveis de ambiente

### API server (`artifacts/api-server/.env.example`)

| Var | Obrigatória | Uso |
| --- | --- | --- |
| `PORT` | sim | Definida automaticamente no Railway |
| `MERCADOPAGO_ACCESS_TOKEN` | sim (prod) | Token privado MP |
| `MERCADOPAGO_PUBLIC_KEY` | sim (prod) | Chave pública entregue ao front |
| `MERCADOPAGO_WEBHOOK_SECRET` | sim (prod) | Segredo para validar webhooks |
| `WHATSAPP_SUPPORT_NUMBER` | não | Número de suporte exposto na config |
| `CORS_ALLOWED_ORIGINS` | sim (prod) | Lista separada por vírgula com domínios da Vercel |
| `LOG_LEVEL` | não | `info` por padrão |
| `NODE_ENV` | recomendado | `production` em produção |

### Frontend (`artifacts/dn-maria/.env.example`)

| Var | Obrigatória | Uso |
| --- | --- | --- |
| `VITE_API_BASE_URL` | sim em prod | URL absoluta do backend (Railway), sem barra final |

## Deploy

### Backend → Railway

1. Criar projeto a partir do repositório, root `artifacts/api-server`.
2. Build automático via `railway.json` (NIXPACKS + pnpm).
3. Healthcheck: `/api/healthz`.
4. Configurar variáveis (ver tabela acima). Importante:
   - `CORS_ALLOWED_ORIGINS` com os domínios reais da Vercel.
   - Configurar a URL pública do webhook no painel do Mercado Pago apontando
     para `https://<seu-dominio>/api/checkout/webhook`.

### Frontend → Vercel

1. `vercel.json` já presente em `artifacts/dn-maria`. Importar repo na Vercel
   apontando para esse diretório.
2. Variável: `VITE_API_BASE_URL=https://<api-no-railway>`.
3. Build: `pnpm --filter @workspace/dn-maria build` → output `dist/public`.
4. SPA rewrites e cache de assets já configurados.

## Pendências futuras (não bloqueiam o lançamento)

- Persistir pedidos no PostgreSQL (schema Drizzle vazio em `lib/db`).
- Tela de "meus pedidos" / e-mail transacional pós-aprovação.
- Migrar o webhook para também atualizar a persistência quando o schema existir.
