# AgendaZap

SaaS multiempresa AgendaZap com painel administrativo global e primeira
versão funcional do painel operacional do prestador.

## Stack

- Next.js 16 com App Router e TypeScript
- PostgreSQL 17
- Prisma ORM 7
- Tailwind CSS 4 e shadcn/ui
- Zod
- Sessão própria com cookie `httpOnly` assinado
- pnpm

## Pré-requisitos

- Node.js 20.19 ou superior
- Corepack habilitado
- Docker com Docker Compose, ou uma instância PostgreSQL equivalente

Ative o pnpm pelo Corepack:

```bash
corepack enable
corepack prepare pnpm@10.26.2 --activate
```

## Configuração local

1. Instale as dependências:

```bash
pnpm install
```

2. Copie `.env.example` para `.env` e ajuste os valores:

```bash
cp .env.example .env
```

No PowerShell:

```powershell
Copy-Item .env.example .env
```

3. Inicie o PostgreSQL local:

```bash
docker compose up -d postgres
```

4. Gere o Prisma Client e aplique as migrations:

```bash
pnpm db:generate
pnpm db:migrate
```

5. Execute o seed inicial:

```bash
pnpm db:seed
```

6. Inicie a aplicação:

```bash
pnpm dev
```

A aplicação estará disponível em `http://localhost:3000`.

## Variáveis de ambiente

| Variável | Obrigatória | Descrição |
| --- | --- | --- |
| `DATABASE_URL` | Sim | URL de conexão com PostgreSQL. |
| `AUTH_SECRET` | Sim | Segredo de assinatura da sessão, com no mínimo 32 caracteres. |
| `SEED_ADMIN_EMAIL` | Não | E-mail do Super Admin inicial. Padrão: `admin@example.com`. |
| `SEED_ADMIN_PASSWORD` | Sim para o seed | Senha do Super Admin inicial, com no mínimo 8 caracteres. |
| `TYPEBOT_API_KEY` | Não (legado) | Chave global usada apenas em dev como fallback para tenants sem credenciais próprias. Prefira credenciais por tenant (prefixo `agz_tb_`). |

Nunca use os valores de exemplo em produção.

## Rotas principais

### Públicas

- `/login`, página de acesso ao painel administrativo e operacional
- `/[tenantSlug]`, página pública do prestador com catálogo de serviços
- `/[tenantSlug]/services`, listagem de serviços por categoria
- `/[tenantSlug]/book`, formulário de agendamento com autenticação de cliente
  final
- `/[tenantSlug]/book/confirm`, confirmação de agendamento recebido
- `/access-denied`

As rotas públicas (`/[tenantSlug]`, `/services`, `/book`, `/book/confirm`) são
páginas reais do App Router no route group `(public)/[tenantSlug]`. Elas são
acessíveis sem autenticação, mas a conclusão de um agendamento exige login ou
criação de conta de cliente final (`CUSTOMER`).

### Cliente final (`CUSTOMER`)

Usuários com role global `CUSTOMER` podem:

- Navegar nas páginas públicas de qualquer prestador ativo com link público
  habilitado
- Criar conta ou fazer login diretamente pelo formulário de agendamento (sem
  acessar `/login`)
- Enviar agendamentos com campos personalizados e observações
- Visualizar a confirmação do agendamento

O CUSTOMER não acessa `/admin` nem `/app`. Ao tentar acessar `/login` já
autenticado, é redirecionado para `/`. A sessão do CUSTOMER não carrega
`activeTenantId` — o isolamento multiempresa se aplica a partir do slug
público e do tenant proprietário do serviço agendado.

O portal do cliente em `/cliente` oferece dashboard, perfil com upload de
avatar, histórico de agendamentos e avaliação de serviços concluídos.

- `/cliente`, dashboard do cliente com próximo agendamento
- `/cliente/perfil`, edição de nome, telefone e foto de perfil
- `/cliente/agendamentos`, histórico completo agrupado por status
- `/cliente/agendamentos/[id]`, detalhe do agendamento e avaliação

### Typebot API

Endpoints REST para integração com Typebot como camada conversacional (WhatsApp):

- `GET /api/typebot/[tenantSlug]/business`, dados do prestador
- `GET /api/typebot/[tenantSlug]/services`, serviços ativos com lista numerada
- `GET /api/typebot/[tenantSlug]/services/[serviceId]`, detalhes do serviço e campos personalizados
- `GET /api/typebot/[tenantSlug]/services/[serviceId]/slots`, horários disponíveis
- `POST /api/typebot/[tenantSlug]/customers/identify`, identifica/cria cliente por telefone
- `POST /api/typebot/[tenantSlug]/appointments`, cria agendamento com `origin = WHATSAPP`
- `GET /api/typebot/[tenantSlug]/appointments/[appointmentId]`, consulta agendamento

Autenticação via header `x-typebot-api-key` com token de credencial do tenant
(prefixo `agz_tb_`). Agendamentos criados via Typebot têm `origin = WHATSAPP` e
`createdByUserId = null`.
Documentação completa em [`/docs/technical/typebot-api.md`](/docs/technical/typebot-api.md).
Blueprint do fluxo conversacional em [`/docs/typebot/flow-blueprint.md`](/docs/typebot/flow-blueprint.md).
Guia de montagem no Typebot real em [`/docs/typebot/real-setup-guide.md`](/docs/typebot/real-setup-guide.md).

### Administrativas e operacionais

- `/admin/dashboard`
- `/admin/tenants`, criação, detalhe e edição de prestadores
- `/admin/tenants/[id]/access`, criação de acesso para tenant existente
- `/admin/tenants/[id]/reset-password`, redefinição administrativa de senha
- `/admin/tenants/[id]/typebot-credentials`, gerenciamento de credenciais Typebot do prestador
- `/admin/plans`, criação e edição de planos
- `/admin/subscriptions`, detalhe, edição, pagamento e vencimento
- `/admin/audit-logs` e detalhe imutável dos eventos
- `/admin/typebot-simulator`, simulador do fluxo Typebot (apenas SUPER_ADMIN)
- `/app/dashboard`, visão geral do negócio, assinatura e catálogo
- `/app/settings`, manutenção dos dados do negócio
- `/app/services`, criação, edição, ativação e inativação de serviços
- `/app/services/categories`, manutenção das categorias de serviço
- `/app/services/[id]`, detalhe e campos personalizados do serviço
- `/app/availability`, manutenção dos horários recorrentes
- `/app/availability/blocks`, criação e remoção de bloqueios de agenda

Todas as rotas `/app` exigem usuário autenticado com vínculo ativo e tenant
ativo. As consultas e actions operacionais são isoladas pelo tenant da sessão.

## Banco e seed

As migrations criam:

- `users`
- `tenants`
- `tenant_users`
- `plans`
- `subscriptions`
- `audit_logs`
- `service_categories`
- `services`
- `custom_fields`
- `availability_rules`
- `schedule_blocks`
- `appointments`
- `appointment_custom_values`
- `appointment_events`
- `customers`
- `appointment_reviews`
- `typebot_sessions`
- `typebot_credentials`

A migration da Phase 02 também garante uma única assinatura vigente por
prestador através de índice único em `subscriptions.tenant_id`.

A migration da Phase 03 adiciona o catálogo do prestador, campos
personalizados, disponibilidade semanal e bloqueios de agenda. Também adiciona
endereço e descrição aos dados do tenant.

A migration da Phase 06 adiciona `typebot_sessions` para rastreamento de
sessões conversacionais da API Typebot.

O seed é idempotente e cria ou atualiza:

- o Super Admin inicial;
- o plano `Inicial`.

O seed existe apenas para bootstrap. Manutenções recorrentes deverão ser
implementadas nas interfaces administrativas das fases correspondentes.

## Auditoria

O serviço central de auditoria registra autenticação, ações administrativas e
manutenções sensíveis do prestador, incluindo:

- `LOGIN_SUCCESS`
- `LOGIN_FAILED`
- `LOGOUT`
- `ADMIN_ACCESS_DENIED`
- `TENANT_ACCESS_DENIED`
- criação, edição e mudança de status de prestadores
- criação e edição de planos
- edição e mudança de status de assinaturas
- registro manual de pagamento
- alteração manual de vencimento
- atualização das configurações do negócio
- criação, edição e mudança de status de categorias
- criação, edição e mudança de status de serviços
- criação, edição e mudança de status de campos personalizados
- criação, edição e mudança de status de horários de atendimento
- criação e remoção de bloqueios de agenda
- `CUSTOMER_USER_REGISTERED`, cadastro de cliente final pelo fluxo público
- `CUSTOMER_LOGIN_SUCCESS` e `CUSTOMER_LOGIN_FAILED`, autenticação pública
- `PUBLIC_APPOINTMENT_CREATED`, agendamento via link público
- `TYPEBOT_SESSION_STARTED`, início de sessão conversacional
- `TYPEBOT_CUSTOMER_IDENTIFIED`, cliente identificado via Typebot
- `TYPEBOT_APPOINTMENT_CREATED`, agendamento criado via Typebot/WhatsApp
- `TYPEBOT_APPOINTMENT_REJECTED`, tentativa de agendamento Typebot rejeitada
- `TYPEBOT_CREDENTIAL_CREATED`, geração de credencial Typebot por tenant
- `TYPEBOT_CREDENTIAL_REVOKED`, revogação de credencial Typebot
- `TYPEBOT_CREDENTIAL_AUTH_FAILED`, falha de autenticação de credencial Typebot
- `TYPEBOT_RATE_LIMITED`, rate limit excedido nos endpoints Typebot
- `SUBSCRIPTION_ENFORCEMENT_BLOCKED_MANUAL_APPOINTMENT`, criação manual bloqueada por política de assinatura
- `SUBSCRIPTION_ENFORCEMENT_BLOCKED_PUBLIC_APPOINTMENT`, agendamento público bloqueado por política de assinatura
- `SUBSCRIPTION_ENFORCEMENT_BLOCKED_TYPEBOT_APPOINTMENT`, agendamento Typebot bloqueado por política de assinatura

## Comandos úteis

```bash
pnpm dev
pnpm build
pnpm lint
pnpm typecheck
pnpm test
pnpm db:generate
pnpm db:migrate
pnpm db:deploy
pnpm db:seed
pnpm db:studio
```

## Como testar o painel administrativo

Após migrations e seed:

1. Entre em `/login` com `SEED_ADMIN_EMAIL` e `SEED_ADMIN_PASSWORD`.
2. Crie e edite planos em `/admin/plans`.
3. Crie um prestador com assinatura em `/admin/tenants/new`.
4. Use as credenciais do responsável para entrar e acessar `/app`.
5. Confirme que o responsável é bloqueado ao acessar `/admin`.
6. Redefina a senha no detalhe do prestador e confirme que apenas a nova senha funciona.
7. Suspenda, reative e cancele pelo detalhe ou listagem.
8. Edite, registre pagamento e altere vencimento em `/admin/subscriptions`.
9. Consulte e filtre os eventos em `/admin/audit-logs`.
10. Acesse `/admin/typebot-simulator` e simule o fluxo completo de agendamento
    Typebot para qualquer tenant. Confira que o agendamento aparece no painel
    administrativo com `origin = WHATSAPP`.
11. Acesse `/admin/tenants/[id]/typebot-credentials` e confira o status da
    integração Typebot (READY/WARNING/BLOCKED). Gere uma credencial e valide.

## Como testar o painel do prestador

1. Entre em `/login` com as credenciais do responsável por um tenant ativo.
2. Confira os dados reais em `/app/dashboard`.
3. Atualize os dados do negócio em `/app/settings`.
4. Crie uma categoria em `/app/services/categories`.
5. Crie e edite um serviço em `/app/services`.
6. Abra o detalhe do serviço e mantenha seus campos personalizados.
7. Configure uma ou mais faixas semanais em `/app/availability`.
8. Crie e remova bloqueios em `/app/availability/blocks`.
9. Entre como Super Admin e confira os eventos em `/admin/audit-logs`.
10. Confirme que IDs de recursos pertencentes a outro tenant não podem ser
    acessados ou alterados pelo usuário autenticado.
11. Altere o vencimento da assinatura para datas passadas e confira os avisos
    no dashboard (1-3 dias, 4-7 dias, 8-15 dias, >15 dias).
12. Com >15 dias de vencimento, tente criar um agendamento manual e confira
    o bloqueio.
13. Verifique os eventos `SUBSCRIPTION_ENFORCEMENT_BLOCKED_*` nos audit logs.

## Como testar o link público

1. No painel do prestador (`/app/dashboard`), verifique o link público
   disponível — ele será `/<slug-do-tenant>`.
2. Acesse `/<slug-do-tenant>` sem estar autenticado. Confira os dados do
   negócio, os serviços e os botões de agendamento.
3. Navegue para `/<slug-do-tenant>/services` e confira a listagem por
   categoria com badges de modo de agendamento.
4. Em `/<slug-do-tenant>/book`, escolha um serviço e veja os horários
   disponíveis.
5. Sem autenticação, o formulário exibe o bloco de login/criação de conta.
   Crie uma conta de cliente final e confirme o agendamento.
6. Faça logout e login novamente como CUSTOMER, depois agende outro horário.
7. Verifique a tela de confirmação em `/<slug-do-tenant>/book/confirm`
   com os dados do agendamento.
8. Tente acessar um tenant com link público desabilitado ou assinatura
   suspensa — deve exibir a página de indisponibilidade.
9. Como Super Admin, confira os eventos de auditoria de criação de cliente,
   login público e agendamento em `/admin/audit-logs`.

## Como testar o portal do cliente

1. Crie uma conta CUSTOMER pelo fluxo público (`/<slug>/book`) ou faça login
   com um CUSTOMER existente.
2. Acesse `/cliente` e confira o dashboard com estatísticas e próximo agendamento.
3. Em `/cliente/perfil`, atualize nome e telefone. Confira a mensagem de sucesso.
4. Faça upload de uma foto de perfil (JPEG/PNG/WebP, até 2 MB).
5. Em `/cliente/agendamentos`, navegue entre os grupos (Próximos, Histórico,
   Cancelados) e confira os cards de agendamento.
6. Acesse o detalhe de um agendamento em `/cliente/agendamentos/[id]` e confira
   os dados exibidos (sem observações internas ou eventos de auditoria).
7. Para um agendamento concluído (FINISHED) sem avaliação, envie uma avaliação
   com estrelas e comentário.
8. Confira que a avaliação aparece no detalhe do agendamento (painel do prestador
   em `/app/appointments/[id]`).
9. Como CUSTOMER autenticado, acesse `/login` e confira o botão "Ir para meus
   agendamentos".
10. No formulário de agendamento público, confira o banner com nome e link "Meus
    agendamentos" para CUSTOMER autenticado.

## Escopo não implementado

**Phase 07 — Typebot Flow Blueprint:** A API Typebot existe e o blueprint
conversacional está documentado em [`/docs/typebot/`](/docs/typebot/), mas o
Typebot real ainda precisa ser configurado externamente. O WhatsApp real (Cloud API,
webhook, envio ativo de mensagens) ainda não foi implementado.

**Phase 09 — Typebot Flow Simulator:** O simulador interno está disponível em
`/admin/typebot-simulator` (restrito a SUPER_ADMIN). Permite validar o fluxo
Typebot sem WhatsApp real. Não envia mensagens. Documentação em
[`/docs/typebot/simulator.md`](/docs/typebot/simulator.md).

**Phase 10 — Typebot Real Setup Guide:** Guia completo para montar o fluxo
conversacional no Typebot real usando a API do AgendaZap. Inclui passo a passo
dos blocos, variáveis, blocos HTTP, mapeamento de listas numeradas e checklist
de validação. Documentação em [`/docs/typebot/real-setup-guide.md`](/docs/typebot/real-setup-guide.md).
WhatsApp Cloud API própria permanece fora do escopo.

**Phase 11 — Typebot Tenant Credentials:** Substituição da chave global
`TYPEBOT_API_KEY` por credenciais por prestador armazenadas no banco. Tokens com
prefixo `agz_tb_`, armazenados como hash SHA-256, exibidos apenas uma vez na
geração. Página administrativa em `/admin/tenants/[id]/typebot-credentials` para
geração e revogação. Auditoria de criação, revogação e falhas de autenticação.
Fallback global apenas em dev para tenants sem credenciais próprias.

**Phase 12 — Typebot Production Readiness:** Rate limit in-memory nos endpoints
`/api/typebot/...` (120 leitura / 30 escrita / 20 auth por minuto). Status de
integração Typebot por tenant (READY/WARNING/BLOCKED) visível na página de
credenciais. Logs operacionais seguros para falhas. Testes automatizados para
rate limit e credenciais. Documentação de troubleshooting em
[`/docs/typebot/troubleshooting.md`](/docs/typebot/troubleshooting.md).

**Phase 13 — Subscription Enforcement:** Política de assinatura centralizada com
estágios por dias de vencimento. Avisos no dashboard do prestador conforme o
estágio (1-3, 4-7, 8-15, >15 dias). Bloqueio progressivo: link público e Typebot
bloqueiam criação a partir de 8 dias; bloqueio total (incluindo agendamento
manual) acima de 15 dias. Simulador exibe status administrativo da política.
Health check Typebot inclui checks de política. Audit logs para tentativas
bloqueadas. Documentação em
[`/docs/technical/subscription-enforcement.md`](/docs/technical/subscription-enforcement.md).

**Phase 14 — Segment Templates:** Templates de segmento versionados em código
para acelerar o onboarding de prestadores. Seis templates iniciais: Mecânica,
Barbearia, Manicure, Estética, Assistência técnica e Clínica/consultório simples.
Cada template define categorias, serviços, campos personalizados e horários
sugeridos. Aplicação idempotente acessível apenas pelo Super Admin em
`/admin/tenants/[id]/templates` com preview antes da aplicação. Documentação em
[`/docs/technical/segment-templates.md`](/docs/technical/segment-templates.md).

**Phase 15 — Provider Onboarding Wizard:** Wizard de configuração inicial em
`/app/onboarding` com 5 etapas guiando o prestador pelos dados do negócio,
serviços (com aplicação de template de segmento), horários sugeridos, link
público e revisão final. Checklist centralizado de prontidão operacional.
Card no dashboard enquanto onboarding incompleto. Suporte a pular e retomar.
Audit logs para todos os eventos do onboarding. Documentação em
[`/docs/technical/provider-onboarding.md`](/docs/technical/provider-onboarding.md).

**Phases 16–22 — Visual & UX Redesign:** Série de fases redesenhando a experiência
completa da aplicação. Design system foundation com tokens CSS, Tailwind v4 e
shadcn/ui. Redesign de login, link público, dashboard do prestador, tabelas
responsivas, admin cockpit e UX operacional do prestador. Documentação em
[`/docs/design/`](/docs/design/).

**Phase 23 — Microcopy, Empty States & Error States:** Padronização da linguagem
e feedback do sistema. Mensagens de sucesso contextuais por página, loading states
com texto descritivo, diálogos de confirmação com explicação de consequências,
empty states com ações sugeridas, labels humanos para todos os enums. Documentação
em [`/docs/design/microcopy-empty-error-states.md`](/docs/design/microcopy-empty-error-states.md).

**Phase 25 — Customer Portal, Appointment History & Reviews:** Portal do cliente em
`/cliente` com dashboard, perfil (avatar upload), histórico de agendamentos e
avaliação de serviços concluídos. Layout compacto com header simplificado.
`requireCustomer()` para proteção de rotas. Reservation do slug `cliente`.
Documentação em [`/docs/technical/customer-portal.md`](/docs/technical/customer-portal.md)
e [`/docs/design/customer-portal-experience.md`](/docs/design/customer-portal-experience.md).

**Phase 27 — Booksy-inspired Product Direction & Premium Public UX:** Nova direção
de produto inspirada no Booksy, sem copiar marketplace ou recursos fora do
escopo. O link público ganhou header com acesso claro à conta do cliente, hero
mais próximo de vitrine de prestador local, cards de serviço mais tocáveis,
avaliações públicas com nome mascarado quando houver dados seguros e rebooking
por link para serviços concluídos ainda ativos. Documentação em
[`/docs/product/booksy-inspired-direction.md`](/docs/product/booksy-inspired-direction.md),
[`/docs/product/booksy-inspired-roadmap.md`](/docs/product/booksy-inspired-roadmap.md)
e [`/docs/design/booksy-inspired-public-ux.md`](/docs/design/booksy-inspired-public-ux.md).

**Phase 24 — Public Experience Conversion Redesign:** Refinamento da experiência pública
com design mais humano e contextual. Hero redesenhado com segmento e CTAs claros,
seção "Como funciona" em 4 passos, ServiceCards com CTAs por booking mode, footer
contextual do negócio, home page em 5 seções, serviços agrupados por categoria.
Botões de submit alinhados ao modo de agendamento. Sem alterações em regras de
negócio, consultas ou ações do servidor. Documentação em
[`/docs/design/public-experience-conversion-redesign.md`](/docs/design/public-experience-conversion-redesign.md).

Também não existem: painel visual de bot, gateway de
pagamento, pagamento online, cancelamento ou remarcação via WhatsApp,
expiração automática de credenciais, Redis, fila/worker, envio ativo de
mensagens, webhook WhatsApp.
