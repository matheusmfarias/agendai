# Technical - Banco de Dados

## Objetivo

Definir a modelagem inicial do banco de dados para o MVP do SaaS.

Banco oficial:

```text
PostgreSQL
```

ORM oficial:

```text
Prisma ORM
```

## Ownership autenticado de agendamentos

O cadastro `Customer` pertence ao tenant e representa a pessoa no contexto
operacional do negócio. Ele não é uma credencial de acesso ao portal.

`Appointment.customer_user_id` é nullable e referencia `users.id` com
`ON DELETE SET NULL`. Quando preenchido, identifica exclusivamente o CUSTOMER
autenticado autorizado a consultar aquele agendamento. O índice
`(tenant_id, customer_user_id)` atende consultas isoladas por tenant e owner.
Agendamentos manuais, Typebot e registros legados sem vínculo comprovado
permanecem nulos.

O backfill usa apenas o vínculo explícito já persistido em `customers.user_id`,
exige que Customer e Appointment pertençam ao mesmo tenant e conserva ownership
somente quando o User possui role global `CUSTOMER`. Telefone e e-mail não
participam da atribuição de ownership. A migration de ownership preenche apenas
appointments `PUBLIC_LINK` com um único
owner evidenciado por evento `CUSTOMER` do próprio appointment e tenant, role
global `CUSTOMER` e vínculo atual coincidente em `Customer.userId`. Evidência
ausente, órfã ou conflitante permanece nula sem remover o histórico operacional.

### Gate pré-deploy da migration consolidada

Antes do deploy, execute a consulta read-only abaixo em **cada ambiente**:

```sql
SELECT
  migration_name,
  checksum,
  started_at,
  finished_at,
  rolled_back_at,
  applied_steps_count
FROM _prisma_migrations
WHERE migration_name IN (
  '20260713120000_add_appointment_customer_owner',
  '20260713133000_restrict_appointment_owner_to_customer',
  '20260713150000_rebuild_proven_appointment_ownership'
);
```

Qualquer linha retornada — migration aplicada, falha ou marcada como rolled back
— bloqueia a publicação da história consolidada e exige uma estratégia
forward-only específica para o ambiente. Não use `prisma migrate resolve`,
`prisma migrate reset` nem edite manualmente o ledger `_prisma_migrations`.

## Audiência e leitura de notificações do prestador

`ProviderNotification` diferencia broadcast do tenant (`TENANT`) de entrega
privada (`USER`). A entrega privada referencia a membership composta
`(tenantId, userId)`, e `dedupeKey` é única dentro do tenant. Leituras são
receipts em `ProviderNotificationRead`, também vinculadas por chaves compostas
ao tenant, notificação e membership. A remoção da membership apaga em cascata
notificações privadas e receipts, sem converter acidentalmente uma entrega
privada em broadcast. O `readAt` da notificação permanece apenas para
compatibilidade com registros legados.

Prisma ORM será usado para acesso type-safe ao PostgreSQL. A documentação oficial do Prisma descreve suporte ao conector PostgreSQL e uso do Prisma ORM em aplicações TypeScript/Node.js.

---

# Entidades iniciais

## users

Usuários autenticados da plataforma.

Usado para:

* Super Admin
* Admin do Prestador
* Operador do Prestador

Campos sugeridos:

```text
id
name
email
password_hash
global_role
is_active
last_login_at
created_at
updated_at
```

global_role:

```text
SUPER_ADMIN
USER
```

Observação:

Papéis dentro de tenants devem ser controlados em tenant_users.

---

## tenants

Representa cada prestador/negócio cliente da plataforma.

Campos sugeridos:

```text
id
name
slug
responsible_name
email
whatsapp
segment
city
state
address
description
logo_url
status
created_at
updated_at
```

status:

```text
ACTIVE
SUSPENDED
CANCELED
```

Regra:

slug deve ser único.

---

## tenant_users

Relaciona usuários aos tenants.

Campos sugeridos:

```text
id
tenant_id
user_id
role
is_active
created_at
updated_at
```

role:

```text
OWNER
ADMIN
OPERATOR
```

---

## plans

Planos comerciais da plataforma.

Campos sugeridos:

```text
id
name
description
monthly_price
annual_price
services_limit
users_limit
appointments_limit
whatsapp_enabled
public_link_enabled
is_active
created_at
updated_at
```

---

## subscriptions

Assinatura do prestador.

Campos sugeridos:

```text
id
tenant_id
plan_id
status
billing_cycle
price
starts_at
expires_at
last_payment_at
payment_method
internal_notes
created_at
updated_at
```

status:

```text
TRIAL
ACTIVE
PAST_DUE
SUSPENDED
CANCELED
```

billing_cycle:

```text
MONTHLY
ANNUAL
```

---

## segment_templates

Templates globais por segmento.

Campos sugeridos:

```text
id
name
segment
description
is_active
created_at
updated_at
```

---

## template_service_categories

Categorias sugeridas dentro de um template.

Campos sugeridos:

```text
id
template_id
name
description
position
created_at
updated_at
```

---

## template_services

Serviços sugeridos dentro de um template.

Campos sugeridos:

```text
id
template_id
template_category_id
name
description
duration_minutes
price_type
price_value
booking_mode
position
created_at
updated_at
```

price_type:

```text
FIXED
STARTING_AT
ON_REQUEST
HIDDEN
```

booking_mode:

```text
DIRECT
REQUIRES_CONFIRMATION
INFORMATIONAL
```

---

## service_categories

Categorias de serviço do tenant.

Campos sugeridos:

```text
id
tenant_id
name
description
position
is_active
created_at
updated_at
```

---

## services

Serviços cadastrados pelo prestador.

Campos sugeridos:

```text
id
tenant_id
category_id
name
description
duration_minutes
price_type
price_value
booking_mode
requires_manual_confirmation
is_active
position
internal_notes
created_at
updated_at
```

price_type:

```text
FIXED
STARTING_AT
ON_REQUEST
HIDDEN
```

booking_mode:

```text
DIRECT
REQUIRES_CONFIRMATION
INFORMATIONAL
```

---

## custom_fields

Campos personalizados por serviço.

Campos sugeridos:

```text
id
tenant_id
service_id
label
key
field_type
options
is_required
position
is_active
created_at
updated_at
```

field_type:

```text
TEXT
TEXTAREA
NUMBER
DATE
BOOLEAN
SELECT
```

options:

JSON opcional para listas.

---

## availability_rules

Regras recorrentes de disponibilidade.

Campos sugeridos:

```text
id
tenant_id
weekday
start_time
end_time
slot_interval_minutes
is_active
created_at
updated_at
```

weekday:

```text
0 = domingo
1 = segunda
2 = terça
3 = quarta
4 = quinta
5 = sexta
6 = sábado
```

---

## schedule_blocks

Bloqueios de agenda.

Campos sugeridos:

```text
id
tenant_id
starts_at
ends_at
reason
created_by_user_id
created_at
updated_at
```

---

## customers

Clientes finais no contexto de um tenant.

Campos sugeridos:

```text
id
tenant_id
name
phone
email
notes
created_at
updated_at
```

Regra:

O mesmo telefone pode existir em tenants diferentes.

---

## appointments

Agendamentos e solicitações.

Campos sugeridos:

```text
id
tenant_id
customer_id
service_id
origin
status
starts_at
ends_at
customer_notes
internal_notes
estimated_price
final_price
created_by_user_id
created_at
updated_at
```

origin:

```text
PUBLIC_LINK
WHATSAPP
MANUAL_PANEL
ADMIN
```

status:

```text
REQUESTED
CONFIRMED
WAITING_INFO
RESCHEDULED
CANCELED_BY_CUSTOMER
CANCELED_BY_PROVIDER
NO_SHOW
IN_PROGRESS
FINISHED
```

Regra:

Agendamentos CONFIRMED, IN_PROGRESS e REQUESTED com horário definido devem ser considerados em validação de conflito, conforme regra definida no service layer.

---

## appointment_custom_values

Valores dos campos personalizados respondidos pelo cliente.

Campos sugeridos:

```text
id
appointment_id
custom_field_id
value
created_at
updated_at
```

---

## appointment_events

Histórico do agendamento.

Campos sugeridos:

```text
id
tenant_id
appointment_id
actor_type
actor_id
event_type
description
metadata
created_at
```

event_type exemplos:

```text
CREATED
CONFIRMED
CANCELED
RESCHEDULED
FINISHED
NOTE_ADDED
STATUS_CHANGED
```

---

## typebot_sessions

Sessões de conversa via WhatsApp/Typebot.

Campos sugeridos:

```text
id
tenant_id
customer_id
external_session_id
phone
current_step
status
metadata
last_interaction_at
created_at
updated_at
```

status:

```text
ACTIVE
COMPLETED
TRANSFERRED_TO_HUMAN
EXPIRED
ERROR
```

---

## audit_logs

Logs administrativos e operacionais sensíveis.

Campos sugeridos:

```text
id
tenant_id
actor_type
actor_id
event_type
description
metadata
ip_address
created_at
```

actor_type:

```text
SUPER_ADMIN
TENANT_USER
CUSTOMER
SYSTEM
TYPEBOT
```

---

# Índices recomendados

Criar índices para:

```text
tenants.slug
users.email
tenant_users.tenant_id
tenant_users.user_id
subscriptions.tenant_id
services.tenant_id
service_categories.tenant_id
custom_fields.service_id
availability_rules.tenant_id
schedule_blocks.tenant_id
customers.tenant_id
customers.phone
appointments.tenant_id
appointments.customer_id
appointments.service_id
appointments.starts_at
appointments.status
appointments.origin
typebot_sessions.tenant_id
typebot_sessions.phone
audit_logs.tenant_id
audit_logs.created_at
```

---

# Regras críticas

## Multiempresa

Toda consulta operacional deve filtrar por tenant_id.

## Slug

O slug do tenant deve ser único.

## Cliente final

Cliente final não é global para fins comerciais.

O mesmo telefone pode existir em múltiplos tenants.

## Agendamento

A criação de agendamento deve validar:

* tenant ativo
* assinatura em situação permitida
* serviço ativo
* horário disponível
* bloqueios de agenda
* conflito com outros agendamentos
* campos obrigatórios do serviço

## Assinatura

O sistema deve bloquear novos agendamentos conforme status da assinatura e regras de vencimento.

## Audit log

Alterações sensíveis devem registrar audit log.

---

# Critérios de aceite

* Prisma schema representa as entidades iniciais.
* Todas as entidades operacionais possuem tenant_id quando aplicável.
* É possível criar um Super Admin via seed.
* É possível criar um tenant via painel admin.
* É possível vincular usuário a tenant.
* É possível criar plano e assinatura.
* É possível cadastrar serviços e campos personalizados.
* É possível criar cliente e agendamento.
* É possível registrar origem do agendamento.
* É possível registrar eventos e audit logs.
