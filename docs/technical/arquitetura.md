# Technical - Arquitetura

## Objetivo

Definir a arquitetura inicial do SaaS, garantindo clareza para desenvolvimento com Codex e evitando decisões improvisadas.

## Modelo arquitetural

A aplicação será um monolito modular fullstack baseado em Next.js.

```text
Next.js App
├── Admin Platform
├── Provider Panel
├── Public Booking Pages
├── Internal API / Server Actions
├── Public Typebot API
├── Auth Layer
├── Domain Services
├── Prisma ORM
└── PostgreSQL
```

## Canais do sistema

O sistema terá três canais principais de entrada operacional:

```text
1. Painel do prestador
2. Link público do prestador
3. WhatsApp via Typebot
```

Todos os canais devem usar as mesmas regras de negócio.

Não pode existir uma regra de agendamento exclusiva do WhatsApp e outra exclusiva do link público.

## Separação lógica

A aplicação deve ser organizada por domínios.

Sugestão de estrutura:

```text
/src
  /app
    /(admin)
    /(provider)
    /(public)
    /api

  /components
    /ui
    /layout
    /forms
    /tables

  /features
    /auth
    /tenants
    /plans
    /subscriptions
    /templates
    /services
    /availability
    /customers
    /appointments
    /typebot
    /audit

  /lib
    prisma.ts
    auth.ts
    permissions.ts
    validators.ts
    dates.ts

  /server
    /services
    /repositories
    /actions

  /types
```

## Camadas

### App layer

Responsável por:

* Rotas
* Layouts
* Páginas
* Componentes de tela
* Chamadas para actions/API
* Proteção de rotas

### Domain services

Responsável por regra de negócio.

Exemplos:

* Criar prestador
* Aplicar template
* Registrar pagamento manual
* Validar disponibilidade
* Criar agendamento
* Cancelar agendamento
* Criar menu para Typebot
* Registrar audit log

### Repository/data access

Responsável por acesso ao banco via Prisma.

Nenhuma query crítica deve ser espalhada aleatoriamente em componentes.

### Validation layer

Responsável por validar entrada de dados com Zod.

Todo endpoint público deve validar payload.

### Permission layer

Responsável por garantir:

* Super Admin acessa área global
* Admin do Prestador acessa apenas seu tenant
* Operador tem permissões reduzidas
* Cliente final acessa apenas rotas públicas
* Endpoints Typebot só executam ações permitidas

## Multiempresa

Toda entidade operacional de prestador deve conter tenant_id.

Exemplos:

* service_categories
* services
* custom_fields
* availability_rules
* schedule_blocks
* customers
* appointments
* appointment_events
* typebot_sessions

Regra obrigatória:

Nenhuma consulta operacional pode buscar dados sem filtrar por tenant_id, exceto consultas administrativas globais feitas por Super Admin.

## Rotas previstas

### Admin Platform

```text
/admin
/admin/dashboard
/admin/tenants
/admin/tenants/[id]
/admin/plans
/admin/subscriptions
/admin/templates
/admin/appointments
/admin/customers
/admin/audit-logs
/admin/settings
```

### Provider Panel

```text
/app
/app/dashboard
/app/services
/app/availability
/app/appointments
/app/customers
/app/settings
/app/subscription
```

### Public Booking

```text
/[tenantSlug]
/[tenantSlug]/services
/[tenantSlug]/book
/[tenantSlug]/book/confirm
```

### Typebot API

```text
/api/typebot/[tenantSlug]/menu
/api/typebot/[tenantSlug]/services
/api/typebot/[tenantSlug]/availability
/api/typebot/[tenantSlug]/appointments
/api/typebot/[tenantSlug]/session
```

## Origem dos agendamentos

Todo agendamento deve registrar origem:

```text
link_publico
whatsapp
painel_manual
admin
```

## Audit log

A arquitetura deve incluir serviço central para registro de logs.

Exemplo:

```text
auditLogService.create({
  actorType,
  actorId,
  tenantId,
  eventType,
  description,
  metadata
})
```

Ações sensíveis nunca devem ser executadas sem audit log.

## Tratamento de erros

Endpoints públicos devem retornar erros previsíveis.

Exemplo:

```json
{
  "success": false,
  "code": "SERVICE_NOT_FOUND",
  "message": "Serviço não encontrado."
}
```

Não expor stack trace para cliente final ou Typebot.

## Typebot

O Typebot não deve conter regra crítica de negócio.

O Typebot deve:

* Exibir mensagens
* Coletar respostas
* Chamar endpoints da plataforma
* Exibir respostas da API

A plataforma deve:

* Montar menus
* Validar serviço
* Validar horário
* Criar agendamento
* Controlar sessão
* Registrar origem
* Registrar erros

## Critérios de aceite

* Arquitetura permite painel admin, painel prestador, link público e Typebot no mesmo projeto.
* Regras de negócio ficam reutilizáveis.
* Typebot não decide disponibilidade sozinho.
* Toda operação multiempresa respeita tenant_id.
* Toda ação sensível pode gerar audit log.
* Rotas administrativas são protegidas.
* Rotas do prestador são isoladas por tenant.
