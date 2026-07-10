# AgendaZap — Contexto Atual do Projeto

Documento gerado a partir da leitura do estado atual do repositório em `C:\projetos\AgendaZap`.

Observação importante: este relatório descreve o que está confirmado nos arquivos do projeto. Quando uma conclusão depender de interpretação do código ou da documentação existente, ela é marcada como **inferência**.

## 1. Visão geral do produto

O AgendaZap é um SaaS multiempresa para prestadores de serviço gerenciarem agenda, catálogo de serviços, clientes, disponibilidade, agendamentos e parte do financeiro. A proposta central é permitir que pequenos negócios configurem seus serviços e horários, recebam agendamentos por link público e integrem o fluxo conversacional via Typebot/WhatsApp.

Confirmado em `README.md`, `docs/technical/arquitetura.md` e `docs/specs/00-visao-produto.md`: o sistema foi pensado como uma plataforma com três canais operacionais principais:

- painel do prestador;
- link público do prestador;
- WhatsApp via Typebot.

Os segmentos atendidos aparecem principalmente nos templates versionados em código, em `src/features/segment-templates/segment-template-definitions.ts`: mecânica, barbearia, manicure, estética, assistência técnica e clínica/consultório simples. **Inferência:** a modelagem é genérica o bastante para atender outros negócios baseados em agenda e serviços.

## 2. Estado atual do projeto

O projeto está além de um protótipo simples. O estado atual parece ser um **MVP/produto em desenvolvimento com várias áreas funcionais reais**, especialmente:

- autenticação própria e permissões;
- painel administrativo global;
- painel operacional do prestador;
- catálogo de serviços e categorias;
- disponibilidade recorrente e bloqueios de agenda;
- clientes;
- agendamentos manuais e públicos;
- portal do cliente;
- avaliações;
- API Typebot;
- credenciais Typebot por tenant;
- enforcement de assinatura;
- financeiro operacional do prestador.

Confirmado por `README.md`, `prisma/schema.prisma`, rotas em `src/app`, actions em `src/server/actions`, services em `src/server/services` e repositories em `src/server/repositories`.

Áreas mais maduras:

- multiempresa por `tenantId`;
- autenticação e controle de acesso;
- agendamentos com validação de disponibilidade/conflito;
- catálogo de serviços/categorias/campos personalizados;
- link público com login/cadastro de cliente;
- Typebot API com token por tenant e rate limit;
- financeiro com banco real;
- documentação técnica e de fases em `docs`.

Áreas ainda em construção ou parcialmente reservadas:

- algumas telas administrativas globais são placeholders: `src/app/(admin)/admin/settings/page.tsx`, `src/app/(admin)/admin/customers/page.tsx`, `src/app/(admin)/admin/appointments/page.tsx`, `src/app/(admin)/admin/templates/page.tsx`;
- WhatsApp real/Cloud API/webhooks não estão implementados, conforme `README.md`;
- não há gateway de pagamento online;
- não há filas, Redis, workers ou jobs;
- a seleção ativa de múltiplos tenants por usuário ainda não aparece como fluxo de UI completo; a sessão carrega um `activeTenantId`.

## 3. Stack técnica

Confirmado em `package.json`, `README.md`, `docs/technical/stack.md` e configs:

- Framework fullstack: Next.js `16.2.9` com App Router.
- Linguagem: TypeScript `5.9.3`.
- Runtime: Node.js `>=20.19.0`.
- Frontend: React `19.2.3` e React DOM `19.2.3`.
- Banco: PostgreSQL, com `docker-compose.yml` usando imagem `postgres:17-alpine`.
- ORM: Prisma ORM `7.8.0`, Prisma Client gerado em `src/generated/prisma`.
- Adapter PostgreSQL: `@prisma/adapter-pg`.
- Autenticação: implementação própria com `jose`, JWT assinado e cookie `httpOnly`, em `src/features/auth/session.ts`.
- Senhas: `bcryptjs`.
- UI: Tailwind CSS 4, componentes estilo shadcn/ui, Radix Label/Slot, lucide-react.
- Formulários: React Hook Form + `@hookform/resolvers`.
- Validação: Zod.
- Tabelas: TanStack Table.
- Datas: date-fns e funções próprias de timezone em `src/features/booking-core/timezone.ts`.
- Testes: Vitest.
- Lint: ESLint 9 + `eslint-config-next`.
- Typecheck: `tsc --noEmit`.

## 4. Como rodar o projeto localmente

Comandos reais confirmados em `package.json` e `README.md`.

Pré-requisitos:

- Node.js 20.19 ou superior;
- Corepack habilitado;
- Docker com Docker Compose ou PostgreSQL equivalente;
- pnpm `10.26.2`.

Instalação:

```bash
pnpm install
```

Configuração de ambiente:

```bash
cp .env.example .env
```

No PowerShell:

```powershell
Copy-Item .env.example .env
```

Variáveis de `.env.example`:

- `DATABASE_URL`
- `AUTH_SECRET`
- `SEED_ADMIN_EMAIL`
- `SEED_ADMIN_PASSWORD`
- `TYPEBOT_API_KEY`

Banco local:

```bash
docker compose up -d postgres
```

Prisma:

```bash
pnpm db:generate
pnpm db:migrate
pnpm db:seed
```

Desenvolvimento:

```bash
pnpm dev
```

Build e verificação:

```bash
pnpm build
pnpm lint
pnpm typecheck
pnpm test
```

Banco em produção/deploy:

```bash
pnpm db:deploy
```

Studio:

```bash
pnpm db:studio
```

Observações:

- `pnpm typecheck` foi executado durante esta análise e passou sem erros.
- Não foi executada migration, seed, build, lint ou testes completos nesta análise.
- `prisma/seed.ts` exige `DATABASE_URL` e `SEED_ADMIN_PASSWORD` com no mínimo 8 caracteres.

## 5. Estrutura de pastas

Estrutura principal confirmada por `rg --files`:

- `src/app`: rotas do Next.js App Router, separadas em route groups `(admin)`, `(provider)`, `(public)` e `(customer)`, além de APIs.
- `src/components`: componentes compartilhados de UI, layout, formulários e tabelas.
- `src/features`: módulos por domínio, como `auth`, `public-booking`, `provider-dashboard`, `provider-financial`, `typebot`, `appointments`, `subscriptions`, `segment-templates`.
- `src/server/actions`: server actions usadas por formulários e telas.
- `src/server/services`: regras de negócio e operações transacionais.
- `src/server/repositories`: consultas ao banco para leitura e montagem de dados de tela.
- `src/lib`: utilitários compartilhados, Prisma client, constantes, formatadores e validações.
- `src/generated/prisma`: Prisma Client gerado.
- `prisma`: schema, migrations e seed.
- `docs`: documentação técnica, design, tasks, Typebot, specs e diagnósticos.
- `storage/uploads`: arquivos enviados localmente, como logos de prestadores e avatares de clientes.
- `.agents`, `.ai`, `.claude`: contexto/instruções auxiliares do projeto.

## 6. Arquitetura geral

Confirmado em `docs/technical/arquitetura.md`: o projeto segue um monolito modular fullstack em Next.js.

Divisão atual:

- Rotas/páginas: `src/app`.
- Componentes de tela e UI: `src/components` e `src/features/*`.
- Server actions: `src/server/actions`.
- Regras de negócio: `src/server/services` e alguns módulos puros em `src/features`.
- Consultas: `src/server/repositories`.
- Banco: Prisma + PostgreSQL.
- Validações: schemas Zod em `src/features/*/*-schemas.ts`.
- Autenticação/permissões: `src/features/auth`.
- API pública Typebot: `src/app/api/typebot/[tenantSlug]`.

Fluxo típico de criação de agendamento manual:

1. Prestador acessa `/app/appointments`.
2. A página exige `requireProviderOperator()` em `src/app/(provider)/app/appointments/page.tsx`.
3. Formulário usa server action de `src/server/actions/appointment-actions.ts`.
4. A action valida entrada com Zod e chama `src/server/services/appointment-service.ts`.
5. O service valida cliente, serviço, disponibilidade, bloqueios, conflitos, campos personalizados e política de assinatura.
6. O Prisma cria `Appointment`, `AppointmentCustomValue`, `AppointmentEvent` e `AuditLog`.

Fluxo típico do link público:

1. Cliente acessa `/<tenantSlug>` ou `/<tenantSlug>/book`.
2. Dados vêm de `src/features/public-booking/public-booking-service.ts`.
3. A criação usa `publicBookingSchema` e `createPublicBooking`.
4. O sistema valida tenant, plano, assinatura, serviço ativo, campos customizados, disponibilidade, conflito e usuário `CUSTOMER`.
5. O agendamento é criado com `origin = PUBLIC_LINK`.

## 7. Modelo de dados

Modelo confirmado em `prisma/schema.prisma`.

### User

Usuário autenticável global. Campos centrais: `name`, `email`, `phone`, `passwordHash`, `globalRole`, `isActive`, `avatarUrl`, `lastLoginAt`. Relações com `TenantUser`, `ScheduleBlock`, `Appointment`, `Customer` e `AppointmentReview`.

Papéis globais: `SUPER_ADMIN`, `USER`, `CUSTOMER`.

### Tenant

Representa o prestador/negócio cliente da plataforma. Contém dados públicos e operacionais: `name`, `slug`, responsável, contato, segmento, endereço, logo, timezone, locale, moeda, políticas de agenda, mensagens padrão, status e onboarding.

Relações centrais: usuários do tenant, assinatura, serviços, categorias, clientes, agendamentos, Typebot, avaliações, financeiro.

### TenantUser

Vínculo entre `User` e `Tenant`. Controla papel operacional: `OWNER`, `ADMIN`, `OPERATOR`. Tem `@@unique([tenantId, userId])`.

### Plan

Plano comercial com preço mensal/anual, flags `whatsappEnabled` e `publicLinkEnabled`, e status ativo.

### Subscription

Assinatura por tenant. Há `tenantId @unique`, indicando uma assinatura vigente por prestador. Campos: status, ciclo, preço, início, expiração, último pagamento, método e notas internas.

### AuditLog

Registro de eventos sensíveis. Guarda `tenantId`, `actorType`, `actorId`, `eventType`, descrição, metadata, IP e data.

### ServiceCategory

Categoria de serviços por tenant, com nome, descrição, posição e status ativo.

### Service

Serviço agendável do tenant. Campos importantes: categoria, duração, tipo de preço (`FIXED`, `STARTING_AT`, `ON_REQUEST`, `HIDDEN`), valor, modo de agendamento (`DIRECT`, `REQUIRES_CONFIRMATION`, `INFORMATIONAL`), confirmação manual, status, posição e notas internas.

### CustomField

Campos personalizados por serviço. Tipos: texto, textarea, número, data, booleano e select. Possui `@@unique([serviceId, key])`.

### AvailabilityRule

Disponibilidade recorrente por dia da semana, horário inicial/final, intervalo de slots e status ativo.

### ScheduleBlock

Bloqueios de agenda com início, fim, motivo e usuário criador.

### Customer

Cliente no contexto de um tenant. Pode estar vinculado a um `User` global `CUSTOMER`. Campos: nome, telefone, e-mail, notas, avatar e status ativo.

### Appointment

Agendamento. Campos centrais: tenant, cliente, serviço, origem, status, início/fim, notas do cliente, notas internas, preço estimado/final e usuário criador.

Origens: `PUBLIC_LINK`, `WHATSAPP`, `MANUAL_PANEL`, `ADMIN`.

Status: `REQUESTED`, `CONFIRMED`, `WAITING_INFO`, `RESCHEDULED`, `CANCELED_BY_CUSTOMER`, `CANCELED_BY_PROVIDER`, `NO_SHOW`, `IN_PROGRESS`, `FINISHED`.

### AppointmentCustomValue

Valores preenchidos em campos personalizados por agendamento. Possui unicidade por `(appointmentId, customFieldId)`.

### AppointmentEvent

Histórico específico do agendamento, separado do audit log global.

### AppointmentReview

Avaliação de atendimento concluído. Um review por appointment (`appointmentId @unique`), com nota e comentário.

### TypebotSession

Sessão conversacional por tenant/telefone. Status: `STARTED`, `IDENTIFIED`, `SELECTING_SERVICE`, `SELECTING_SLOT`, `WAITING_CONFIRMATION`, `APPOINTMENT_CREATED`, `ABANDONED`.

### TypebotCredential

Credenciais Typebot por tenant, com hash do token, prefixo, status ativo, último uso e revogação.

### FinancialEntry

Lançamento financeiro por tenant. Tipos: `REVENUE`, `EXPENSE`, `REFUND`, `ADJUSTMENT`. Status: `PAID`, `PENDING`, `OVERDUE`, `CANCELED`, `REFUNDED`. Pode vincular agendamento, cliente e serviço.

### FinancialPayment

Pagamento associado a um lançamento financeiro. Guarda método, valor, data e notas.

### FinancialSettings

Configuração financeira por tenant: moeda, métodos aceitos, categorias de receita/despesa, flags de controle manual, pagamento no local, checkout obrigatório, pagamentos parciais, prazo padrão e template de lembrete.

## 8. Autenticação e permissões

Confirmado em `src/features/auth/session.ts`, `src/features/auth/auth-service.ts`, `src/features/auth/permissions.ts`, `src/features/auth/authorization-policy.ts`, `src/proxy.ts`.

Como funciona:

- Login compara senha com `bcryptjs`.
- Sessão é JWT assinado com `jose`.
- Cookie usa nome de `SESSION_COOKIE_NAME`, é `httpOnly`, `sameSite: "lax"`, `secure` em produção.
- Payload da sessão: `userId`, `email`, `globalRole`, `activeTenantId`.
- `AUTH_SECRET` precisa ter pelo menos 32 caracteres.

Tipos de usuários:

- `SUPER_ADMIN`: acessa `/admin`.
- `USER`: usuário operacional vinculado a tenant, acessa `/app`.
- `CUSTOMER`: cliente final, acessa portal `/cliente` e fluxo público.

Proteção:

- `src/proxy.ts` redireciona `/admin` e `/app` sem cookie para `/login`.
- A proteção real de papel acontece no servidor com `requireSuperAdmin`, `requireTenantAccess`, `requireProviderManager`, `requireProviderOperator`, `requireCustomer`.
- `/cliente` é protegido por layout em `src/app/(customer)/layout.tsx`.
- `/admin` é protegido por layout em `src/app/(admin)/admin/layout.tsx`.
- `/app` é protegido por layout em `src/app/(provider)/app/layout.tsx`.

Permissões de tenant:

- `OWNER` e `ADMIN` podem acessar manutenções críticas do prestador via `requireProviderManager`.
- `OWNER`, `ADMIN` e `OPERATOR` podem operar agenda/clientes via `requireProviderOperator`.

Pontos frágeis/incompletos:

- O proxy só verifica presença de cookie para `/admin` e `/app`; papel e validade são conferidos depois nos layouts/actions. Isso é aceitável, mas não substitui os guards de servidor.
- A sessão guarda um único `activeTenantId`; a modelagem permite múltiplos tenants, mas não foi encontrado fluxo completo de troca de tenant ativo.
- Rotas públicas não exigem login para navegação, mas a conclusão de agendamento exige usuário `CUSTOMER`.

## 9. Funcionalidades já implementadas

### Dashboard admin

Confirmado em `src/app/(admin)/admin/dashboard/page.tsx`, `src/server/repositories/admin-dashboard-repository.ts` e componentes em `src/features/admin-dashboard`.

Mostra métricas e atividade recente da plataforma, com dados reais de tenants, assinaturas e audit logs.

### Prestadores/Tenants

Confirmado em rotas `src/app/(admin)/admin/tenants/*`, actions `src/server/actions/tenant-actions.ts`, service `src/server/services/tenant-service.ts` e repository `src/server/repositories/tenant-repository.ts`.

Permite listar, criar, editar, ver detalhes, mudar status, provisionar acesso do responsável, resetar senha, configurar credenciais Typebot e aplicar templates por segmento.

### Planos

Confirmado em `src/app/(admin)/admin/plans/*`, `src/server/actions/plan-actions.ts`, `src/server/services/plan-service.ts`.

Permite criar e editar planos, com preços e flags de link público/WhatsApp.

### Assinaturas

Confirmado em `src/app/(admin)/admin/subscriptions/*`, `src/server/actions/subscription-actions.ts`, `src/server/services/subscription-service.ts`.

Permite listar, detalhar, editar, registrar pagamento manual, alterar vencimento e status.

### Logs de auditoria

Confirmado em `src/app/(admin)/admin/audit-logs/*`, `src/server/repositories/audit-log-repository.ts`, `src/features/audit`.

Permite filtrar e visualizar eventos com metadata.

### Typebot Simulator

Confirmado em `src/app/(admin)/admin/typebot-simulator/page.tsx` e `src/features/typebot-simulator`.

Simula fluxo Typebot sem WhatsApp real.

### Dashboard do prestador

Confirmado em `src/app/(provider)/app/dashboard/page.tsx`, `src/server/repositories/provider-repository.ts` e `src/features/provider-dashboard`.

Exibe visão geral do negócio, próximos agendamentos, métricas, assinatura, checklist/onboarding e status de canais.

### Agenda/Agendamentos do prestador

Confirmado em `src/app/(provider)/app/appointments/page.tsx`, `src/features/provider-appointments/provider-agenda-view.tsx`, `src/server/actions/appointment-actions.ts`, `src/server/services/appointment-service.ts`.

Permite listar, filtrar, criar, editar, mudar status, realizar checkout, ver eventos e lidar com conflitos de agenda.

### Clientes do prestador

Confirmado em `src/app/(provider)/app/customers/*`, `src/features/provider-customers`, `src/server/actions/customer-actions.ts`, `src/server/services/customer-service.ts`.

Permite listar, criar, editar, ver detalhes, ativar/inativar e fazer upload de avatar.

### Serviços e categorias

Confirmado em `src/app/(provider)/app/services/*`, `src/features/provider-services`, `src/server/actions/provider-actions.ts`, `src/server/services/provider-service.ts`.

Permite criar, editar, ativar/inativar categorias, serviços e campos personalizados.

### Disponibilidade

Confirmado em `src/app/(provider)/app/availability/*`, `src/features/provider-availability`, `src/server/actions/provider-actions.ts`.

Permite configurar regras recorrentes e bloqueios de agenda.

### Financeiro

Confirmado em `src/app/(provider)/app/financial/page.tsx`, `src/features/provider-financial`, `src/server/repositories/financial-repository.ts`, `src/server/services/financial-service.ts`.

Usa banco real. Permite criar/editar/cancelar lançamentos, registrar pagamentos, estornar, configurar opções financeiras, visualizar métricas, pendências, despesas e exportar relatório por API em `src/app/api/provider/financial/export/route.ts`.

### Página pública/link de agendamento

Confirmado em `src/app/(public)/[tenantSlug]/*` e `src/features/public-booking`.

Inclui home pública do prestador, listagem de serviços, formulário de agendamento, revisão e confirmação. Usa dados reais de tenant, categorias, serviços, disponibilidade e avaliações.

### Portal do cliente

Confirmado em `src/app/(customer)/cliente/*`, `src/features/customer-portal`, `src/server/repositories/customer-portal-repository.ts`, `src/server/actions/customer-portal-actions.ts`.

Inclui dashboard, perfil, upload de avatar, histórico, detalhe de agendamento e avaliação de serviços concluídos.

### Configurações do prestador

Confirmado em `src/app/(provider)/app/settings/page.tsx` e `src/components/forms/provider-settings-form.tsx`.

Permite editar dados do negócio, endereço, logo e configurações públicas/operacionais.

### Configurações/admin globais e consultas globais

Parcial. Existem rotas no menu admin, mas algumas são placeholders:

- `/admin/settings`;
- `/admin/customers`;
- `/admin/appointments`;
- `/admin/templates`.

## 10. Fluxos principais do produto

### Fluxo do prestador

1. Usuário acessa `/login`.
2. Login cria sessão e redireciona `USER` para `/app/dashboard`.
3. Layout do prestador exige `requireTenantAccess`.
4. Prestador ajusta dados em `/app/settings`.
5. Configura categorias e serviços em `/app/services` e `/app/services/categories`.
6. Configura disponibilidade em `/app/availability` e bloqueios em `/app/availability/blocks`.
7. Gerencia clientes em `/app/customers`.
8. Cria e acompanha agendamentos em `/app/appointments`.
9. Conclui atendimento e checkout; isso pode gerar lançamento financeiro.
10. Acompanha financeiro em `/app/financial`.

### Fluxo do cliente final

1. Cliente acessa `/<tenantSlug>`.
2. Visualiza dados públicos e serviços ativos.
3. Vai para `/<tenantSlug>/book`.
4. Seleciona serviço, data e horário.
5. Faz login/cadastro como `CUSTOMER` pelo fluxo público.
6. Envia agendamento com observações e campos personalizados.
7. Recebe confirmação em `/<tenantSlug>/book/confirm`.
8. Depois acessa `/cliente` para histórico, perfil e avaliações.

### Fluxo financeiro

Confirmado no código:

- lançamentos são armazenados em `FinancialEntry`;
- pagamentos são armazenados em `FinancialPayment`;
- checkout de agendamento cria ou atualiza receita paga;
- o dashboard financeiro calcula receita recebida, a receber, ticket médio, agendamentos pagos, despesas, lucro estimado e inadimplência;
- pendências também incluem agendamentos sem checkout, como entradas virtuais com `source: "appointment"` em `financial-repository.ts`.

Não há gateway de pagamento online. Pagamento é controle operacional/manual.

### Fluxo de serviços e categorias

Categorias e serviços são por tenant. Serviços possuem preço, duração, modo de agendamento, status e campos personalizados. O link público mostra apenas categorias e serviços ativos. O agendamento valida serviço ativo e categoria ativa.

## 11. UI/UX atual

Confirmado por componentes e docs em `docs/design`.

Padrão visual:

- Tailwind CSS 4 com tokens em `src/app/globals.css`;
- componentes base em `src/components/ui`;
- shell lateral para admin/prestador em `src/components/layout/dashboard-shell.tsx`;
- navegação por sidebar em desktop e componentes responsivos;
- portal do cliente com bottom navigation;
- telas operacionais usam cards, tabelas, filtros, abas e estados vazios.

Pontos fortes:

- design system documentado;
- componentes reutilizáveis para tabelas, toolbar, empty state, alertas e forms;
- várias telas já foram redesenhadas em fases documentadas;
- link público tem UX mais rica e orientada a conversão;
- há loading states por rota em vários módulos.

Pontos fracos/riscos:

- `src/features/provider-appointments/provider-agenda-view.tsx` tem cerca de 3663 linhas;
- `src/features/provider-financial/provider-financial-view.tsx` tem cerca de 2635 linhas;
- `src/components/forms/appointment-form.tsx` tem cerca de 992 linhas;
- componentes muito grandes aumentam risco de regressão e dificultam testes.

Evidências de redesign recente:

- `docs/design/*`;
- `docs/tasks/phase-16` até `phase-24`;
- `docs/product/booksy-inspired-direction.md`;
- `docs/design/booksy-inspired-public-ux.md`.

## 12. Dados mockados versus dados reais

Dados reais confirmados:

- tenants/prestadores;
- usuários;
- planos;
- assinaturas;
- audit logs;
- categorias;
- serviços;
- campos personalizados;
- disponibilidade;
- bloqueios;
- clientes;
- agendamentos;
- avaliações;
- Typebot sessions/credentials;
- financeiro;
- configurações financeiras.

Principais módulos com dados reais:

- `/admin/dashboard`;
- `/admin/tenants`;
- `/admin/plans`;
- `/admin/subscriptions`;
- `/admin/audit-logs`;
- `/app/dashboard`;
- `/app/settings`;
- `/app/services`;
- `/app/availability`;
- `/app/customers`;
- `/app/appointments`;
- `/app/financial`;
- `/<tenantSlug>`;
- `/cliente`.

Placeholders reais encontrados:

- `src/app/(admin)/admin/settings/page.tsx`;
- `src/app/(admin)/admin/customers/page.tsx`;
- `src/app/(admin)/admin/appointments/page.tsx`;
- `src/app/(admin)/admin/templates/page.tsx`.

Dados estáticos ou constantes que não são mocks transacionais:

- templates de segmento em `src/features/segment-templates/segment-template-definitions.ts`;
- labels, status, ícones e opções em vários arquivos de features;
- `FINANCIAL_REPORTS` e `DEFAULT_FINANCIAL_SETTINGS` em `src/features/provider-financial/financial-types.ts`;
- menus de navegação nos layouts admin/prestador.

Mistura real + derivado:

- financeiro mistura lançamentos reais com pendências derivadas de agendamentos sem checkout em `getPendingPayments`.
- dashboard usa métricas calculadas a partir do banco.

Não foi encontrado mock de lista operacional principal como fonte de verdade em telas críticas. O termo "mock" aparece principalmente em testes, docs e orientações de design.

## 13. Integração com banco e Prisma

Confirmado:

- Prisma schema completo em `prisma/schema.prisma`.
- Migrations em `prisma/migrations`.
- Seed em `prisma/seed.ts`.
- Prisma client em `src/lib/prisma.ts` e gerado em `src/generated/prisma`.
- Repositories usam Prisma para leituras.
- Services usam transações Prisma para operações críticas.
- Actions validam FormData e chamam services.

Operações usando Prisma:

- autenticação e atualização de último login;
- CRUD de tenants, planos, assinaturas;
- CRUD operacional de categorias, serviços, campos, disponibilidade e bloqueios;
- CRUD de clientes;
- criação, edição, status e checkout de agendamentos;
- criação e consulta de logs;
- Typebot API;
- financeiro.

Validação:

- Zod aparece em schemas de auth, tenants, plans, subscriptions, provider, appointments, customers, financial, public booking e audit.

Seeds:

- cria/atualiza Super Admin;
- cria/atualiza plano `Inicial`.

Riscos de divergência schema/UI:

- `Tenant` possui muitos campos avançados de política/mensagens; parte deles aparece em configurações, mas nem todos necessariamente têm UI completa de uso real.
- `FinancialSettings` possui templates e flags que podem estar mais avançados no banco do que nos fluxos automatizados.
- `AppointmentOrigin.ADMIN` existe no enum, mas o fluxo administrativo global de agendamento está como placeholder.
- `allowCustomerCancellation` e `allowCustomerRescheduling` existem no schema, mas não foi encontrado fluxo completo de cancelamento/remarcação pelo cliente.

## 14. Regras de negócio identificadas

Regras confirmadas pelo código:

- Senha de seed admin deve ter pelo menos 8 caracteres (`prisma/seed.ts`).
- `AUTH_SECRET` deve ter pelo menos 32 caracteres (`session.ts`).
- `SUPER_ADMIN` acessa admin; usuário de tenant acessa app; `CUSTOMER` acessa portal do cliente.
- Operações de tenant devem filtrar por `tenantId`.
- Link público depende de tenant ativo, assinatura e plano com `publicLinkEnabled`.
- Typebot depende de tenant/plano/credencial e política de assinatura.
- Horários disponíveis são calculados para janela de 14 dias (`AVAILABILITY_WINDOW_DAYS`).
- Agendamento público usa status por `bookingMode`: `DIRECT` vira `CONFIRMED`, `REQUIRES_CONFIRMATION` vira `REQUESTED`, `INFORMATIONAL` vira `WAITING_INFO`.
- Conflitos consideram status bloqueantes: `REQUESTED`, `CONFIRMED`, `WAITING_INFO`, `RESCHEDULED`, `IN_PROGRESS`.
- Status terminais incluem cancelamentos, `NO_SHOW` e `FINISHED`.
- Transições de status são controladas em `src/features/appointments/appointment-rules.ts`.
- Agendamento deve respeitar disponibilidade recorrente e bloqueios, salvo encaixes manuais em fluxos internos.
- Campos personalizados obrigatórios são validados.
- Cliente final só avalia agendamento concluído, conforme repository/actions do portal.
- Checkout cria/atualiza lançamento financeiro de receita.
- Lançamentos cancelados/reembolsados têm restrições de pagamento/edição.
- Estorno só é permitido para receita com pagamento.
- Pagamento parcial não pode exceder saldo em aberto.
- Assinatura vencida tem estágios: 1-3, 4-7, 8-15 e >15 dias.
- A partir de 8 dias vencidos, criação por link público/Typebot é bloqueada.
- Acima de 15 dias, criação manual também é bloqueada.

Inferências:

- O produto espera que o prestador configure serviço + disponibilidade antes de divulgar o link público.
- O financeiro atual é controle interno/manual, não cobrança online.
- O Typebot é camada conversacional, não fonte de regra de negócio.

## 15. Inconsistências, débitos técnicos e riscos

Principais riscos encontrados:

- Componentes muito grandes em agenda e financeiro, dificultando manutenção e testes.
- Algumas rotas admin globais aparecem no menu, mas são placeholders.
- WhatsApp real não está implementado; existe Typebot API e simulador, mas não envio ativo, webhook ou Cloud API.
- Não há gateway de pagamento online.
- A seleção de tenant ativo para usuários multi-tenant ainda parece incompleta.
- Alguns campos avançados do schema podem não ter fluxo completo de UI/automação.
- `storage/uploads` local indica persistência de arquivos no filesystem; em produção isso exigirá estratégia de storage durável.
- Rate limit Typebot é in-memory, conforme README; em múltiplas instâncias isso não é distribuído.
- Poucos testes para tamanho do domínio atual; existem testes unitários, mas não E2E.
- Alguns textos em arquivos aparecem com encoding quebrado em saídas de terminal, possivelmente por diferença de codificação/localidade.
- O diretório contém `.git`, mas `git status --short` retornou "not a git repository" nesta análise; isso pode indicar worktree/configuração Git incomum no ambiente local.

## 16. Próximos passos recomendados

### Prioridade 1 - essencial para MVP

- Fechar placeholders administrativos ou removê-los temporariamente do menu.
- Validar ponta a ponta: login admin, criação de tenant, acesso do prestador, criação de serviço, disponibilidade, link público, agendamento e checkout.
- Adicionar testes mínimos para fluxos críticos de agendamento público/manual.
- Garantir storage adequado para uploads em produção.
- Confirmar política de multi-tenant para usuários com mais de um tenant.
- Revisar campos de schema que existem sem fluxo completo de UI.

### Prioridade 2 - importante

- Quebrar `provider-agenda-view.tsx` e `provider-financial-view.tsx` em componentes menores.
- Expandir testes de financeiro, disponibilidade, permissões e Typebot.
- Consolidar documentação de comandos e troubleshooting.
- Melhorar observabilidade de erros operacionais.
- Definir estratégia para rate limit distribuído se houver múltiplas instâncias.
- Completar cancelamento/remarcação pelo cliente se isso fizer parte do MVP.

### Prioridade 3 - melhoria futura

- WhatsApp Cloud API/webhooks e envio ativo de mensagens.
- Gateway de pagamento online.
- Integração Google Agenda.
- Fila/worker para lembretes automáticos.
- Relatórios financeiros mais ricos.
- Playwright/E2E.
- Gestão de usuários por tenant.

## 17. Arquivos mais importantes

- `README.md`: visão operacional, rotas, comandos e escopo implementado/não implementado.
- `package.json`: scripts e dependências reais.
- `.env.example`: variáveis necessárias.
- `docker-compose.yml`: PostgreSQL local.
- `prisma/schema.prisma`: modelo de dados completo.
- `prisma/seed.ts`: seed de Super Admin e plano inicial.
- `src/app`: rotas e route groups.
- `src/proxy.ts`: redirecionamento inicial de rotas protegidas.
- `src/features/auth/session.ts`: sessão JWT/cookie.
- `src/features/auth/permissions.ts`: guards de autorização.
- `src/server/actions`: mutations usadas por formulários.
- `src/server/services`: regras de negócio transacionais.
- `src/server/repositories`: queries para telas.
- `src/features/public-booking/public-booking-service.ts`: link público e criação de agendamento público.
- `src/features/booking-core/availability.ts`: cálculo de slots e disponibilidade.
- `src/server/services/appointment-service.ts`: criação/edição/status/checkout de agendamentos.
- `src/server/repositories/financial-repository.ts`: dashboard e dados financeiros.
- `src/server/services/financial-service.ts`: mutations financeiras.
- `src/features/subscriptions/subscription-policy.ts`: enforcement de assinatura.
- `src/features/typebot`: serviços da API Typebot.
- `src/features/segment-templates/segment-template-definitions.ts`: templates de segmentos.
- `docs/technical`: decisões técnicas.
- `docs/design`: decisões de UI/UX.
- `docs/typebot`: guias Typebot.

## 18. Como explicar esse projeto para outro desenvolvedor

O AgendaZap é um monolito modular em Next.js 16, TypeScript, Prisma e PostgreSQL. Ele tem três grandes experiências: admin da plataforma em `/admin`, painel do prestador em `/app` e experiência pública/cliente em `/<tenantSlug>` e `/cliente`. A autenticação é própria, com JWT assinado em cookie `httpOnly`, e as permissões reais ficam em helpers de servidor.

O núcleo do domínio é multiempresa: quase tudo que pertence ao prestador carrega `tenantId`. O Super Admin gerencia tenants, planos, assinaturas e auditoria. O prestador gerencia serviços, categorias, horários, bloqueios, clientes, agenda e financeiro. O cliente final cria conta pelo fluxo público, agenda serviços e acompanha seus próprios agendamentos no portal.

As regras críticas de agendamento ficam em services e módulos de booking: disponibilidade recorrente, conflitos, bloqueios, campos personalizados e política de assinatura. Typebot é uma API pública protegida por credencial por tenant, usada como camada conversacional, mas a regra de negócio continua dentro da plataforma.

O projeto já tem bastante funcionalidade real, mas ainda precisa reduzir componentes grandes, completar placeholders administrativos, ampliar testes e validar fluxos ponta a ponta antes de tratar como MVP fechado.

## 19. Perguntas em aberto

- O MVP precisa incluir telas admin globais reais para clientes e agendamentos, ou o foco é apenas operação por prestador?
- Haverá múltiplos usuários por tenant no MVP ou apenas owner/admin inicial?
- Como será a troca de tenant ativo para usuários vinculados a mais de um tenant?
- Cancelamento e remarcação pelo cliente entram no MVP?
- Os lembretes automáticos serão via WhatsApp, e-mail ou apenas templates preparados?
- Qual storage será usado em produção para logos e avatares?
- O financeiro precisa de fechamento de caixa/competência ou apenas controle simples de recebidos/pendentes?
- Typebot será usado com WhatsApp oficial, outro provedor ou apenas Typebot web inicialmente?
- Quais campos de `Tenant` são obrigatórios para publicação do link público?
- Quais relatórios financeiros precisam exportação real além do CSV atual?

## 20. Resumo executivo para o ChatGPT

O AgendaZap é um SaaS multiempresa de agendamento para prestadores de serviço, implementado como monolito fullstack em Next.js 16, React 19, TypeScript, Prisma 7 e PostgreSQL. O projeto usa Tailwind CSS 4/shadcn-style UI, Zod, React Hook Form, TanStack Table, Vitest e autenticação própria com JWT em cookie `httpOnly`.

O sistema já tem painel admin, painel do prestador, link público de agendamento, portal do cliente, API Typebot, auditoria, assinatura/enforcement, templates de segmento, uploads locais e financeiro operacional. O banco está modelado em `prisma/schema.prisma` com entidades como `User`, `Tenant`, `TenantUser`, `Plan`, `Subscription`, `ServiceCategory`, `Service`, `CustomField`, `AvailabilityRule`, `ScheduleBlock`, `Customer`, `Appointment`, `AppointmentEvent`, `AppointmentReview`, `TypebotSession`, `TypebotCredential`, `FinancialEntry`, `FinancialPayment` e `FinancialSettings`.

As rotas principais são `/admin/*` para Super Admin, `/app/*` para prestador, `/<tenantSlug>` para página pública, `/<tenantSlug>/book` para agendamento e `/cliente/*` para cliente final. Server actions ficam em `src/server/actions`, regras em `src/server/services`, consultas em `src/server/repositories` e features em `src/features`.

Dados operacionais principais usam banco real. Placeholders encontrados: `/admin/settings`, `/admin/customers`, `/admin/appointments` e `/admin/templates`. Não há WhatsApp real, gateway de pagamento, fila/worker, Redis ou Google Agenda. Typebot API existe, com credenciais por tenant e simulador interno.

Riscos principais: componentes muito grandes em agenda/financeiro, algumas telas admin placeholders, testes ainda limitados para o tamanho do domínio, uploads em filesystem local, rate limit Typebot in-memory e fluxo multi-tenant ativo ainda simples. Próximos passos recomendados: validar fluxo ponta a ponta do MVP, completar/remover placeholders, ampliar testes críticos, quebrar componentes grandes, definir storage de produção e consolidar financeiro/link público/serviços antes de novas integrações.

## Resumo para colar no ChatGPT

Estou trabalhando no AgendaZap, um SaaS multiempresa de agendamento para prestadores de serviço. A stack é Next.js 16 App Router, React 19, TypeScript, PostgreSQL, Prisma 7, Tailwind CSS 4/shadcn-style UI, Zod, React Hook Form, TanStack Table, Vitest e autenticação própria com JWT assinado em cookie `httpOnly`.

O projeto já tem painel admin (`/admin`), painel do prestador (`/app`), link público por tenant (`/<tenantSlug>`), fluxo de agendamento público (`/<tenantSlug>/book`), portal do cliente (`/cliente`), API Typebot, auditoria, assinaturas com enforcement, templates de segmento, clientes, serviços, categorias, disponibilidade, bloqueios, agendamentos, avaliações e financeiro operacional. O banco é Prisma/PostgreSQL e está em `prisma/schema.prisma`.

Arquitetura: rotas em `src/app`, componentes em `src/components`, features em `src/features`, actions em `src/server/actions`, regras transacionais em `src/server/services`, queries em `src/server/repositories`. A regra crítica de agendamento valida tenant, assinatura, serviço ativo, campos personalizados, disponibilidade, bloqueios e conflito de horários.

Dados principais usam banco real. Placeholders encontrados no admin: `/admin/settings`, `/admin/customers`, `/admin/appointments`, `/admin/templates`. O WhatsApp real ainda não existe; há Typebot API e simulador. Não há gateway de pagamento online. O financeiro é controle interno/manual com `FinancialEntry`, `FinancialPayment` e checkout de agendamentos.

Principais riscos atuais: componentes muito grandes em agenda e financeiro, testes insuficientes para o tamanho do domínio, storage local para uploads, rate limit Typebot em memória, campos avançados no schema sem fluxo completo e fluxo multi-tenant ativo simplificado. Prioridade: fechar placeholders ou removê-los do menu, validar o fluxo ponta a ponta do MVP, ampliar testes críticos, quebrar componentes grandes e definir storage/produção.
