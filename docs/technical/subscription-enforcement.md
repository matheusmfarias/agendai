# Subscription Enforcement — Política de Assinatura

## Objetivo

Documentar a política centralizada de enforcement de assinatura do AgendaZap, que define o que cada tenant pode fazer com base no status da assinatura e dias de vencimento.

---

## Estados da política

| Status | Descrição | Dias vencido |
|---|---|---|
| `ACTIVE` | Assinatura ativa, tudo funciona | ≤ 0 (não vencido) |
| `EXPIRING_SOON` | Vencido há pouco, aviso no dashboard | 1–3 |
| `OVERDUE_WARNING` | Aviso crítico no dashboard | 4–7 |
| `OVERDUE_CRITICAL` | Canais externos bloqueados para criação | 8–15 |
| `EXTERNAL_BOOKING_BLOCKED` | Todos os canais bloqueados | > 15 |
| `SUSPENDED` | Tenant suspenso | N/A |
| `CANCELED` | Tenant cancelado | N/A |
| `NO_SUBSCRIPTION` | Sem assinatura | N/A |

---

## Regras por canal

### Painel do prestador (`/app`)

| Status | Acesso |
|---|---|
| `ACTIVE` | ✅ |
| `EXPIRING_SOON` | ✅ (aviso WARNING) |
| `OVERDUE_WARNING` | ✅ (aviso CRITICAL) |
| `OVERDUE_CRITICAL` | ✅ (aviso BLOCKED) |
| `EXTERNAL_BOOKING_BLOCKED` | ✅ (aviso BLOCKED) |
| `SUSPENDED` / `CANCELED` | ❌ |
| `NO_SUBSCRIPTION` | ❌ |

### Agendamento manual (`/app/appointments/new`)

| Status | Criação |
|---|---|
| `ACTIVE` – `OVERDUE_CRITICAL` | ✅ |
| `EXTERNAL_BOOKING_BLOCKED` (>15 dias) | ❌ |
| `SUSPENDED` / `CANCELED` / `NO_SUBSCRIPTION` | ❌ |

### Link público (`/[tenantSlug]`)

| Status | Página visível | Criação de agendamento |
|---|---|---|
| `ACTIVE` – `OVERDUE_WARNING` (0–7 dias) | ✅ | ✅ |
| `OVERDUE_CRITICAL` (8–15 dias) | ✅ | ❌ |
| `EXTERNAL_BOOKING_BLOCKED` (>15 dias) | ❌ | ❌ |
| `SUSPENDED` / `CANCELED` / `NO_SUBSCRIPTION` | ❌ | ❌ |
| Plano sem `publicLinkEnabled` | ❌ | ❌ |

### Typebot/WhatsApp (`/api/typebot/[tenantSlug]/...`)

| Status | Consulta (business/services/slots) | Criação (appointments) |
|---|---|---|
| `ACTIVE` – `OVERDUE_WARNING` (0–7 dias) | ✅ | ✅ |
| `OVERDUE_CRITICAL` (8–15 dias) | ✅ | ❌ |
| `EXTERNAL_BOOKING_BLOCKED` (>15 dias) | ❌ | ❌ |
| `SUSPENDED` / `CANCELED` / `NO_SUBSCRIPTION` | ❌ | ❌ |
| Plano sem `whatsappEnabled` | ❌ | ❌ |

---

## Mensagens públicas

Todas as mensagens exibidas em canais públicos (link público, Typebot) **nunca** revelam:

- Assinatura vencida
- Inadimplência
- Dias de atraso
- Motivo administrativo

Mensagem pública padrão:

> Este serviço de agendamento está temporariamente indisponível. Entre em contato diretamente com o estabelecimento.

---

## Avisos internos (dashboard do prestador)

### 1–3 dias vencido (`EXPIRING_SOON`)

> Sua assinatura está vencida. Regularize para evitar bloqueios nos canais de agendamento.

### 4–7 dias vencido (`OVERDUE_WARNING`)

> Sua assinatura está vencida há alguns dias. Regularize o quanto antes para evitar bloqueio de novos agendamentos externos.

### 8–15 dias vencido (`OVERDUE_CRITICAL`)

> Novos agendamentos pelo link público e WhatsApp/Typebot estão temporariamente bloqueados. Regularize sua assinatura para reativar esses canais.

### >15 dias vencido (`EXTERNAL_BOOKING_BLOCKED`)

> Sua operação de agendamentos está suspensa por assinatura vencida. Regularize sua assinatura para reativar os canais.

---

## Simulador Typebot

No simulador (`/admin/typebot-simulator`), o Super Admin vê informações administrativas detalhadas sobre o bloqueio, incluindo:

- Status da política (`policyStatus`)
- Dias vencidos (`daysOverdue`)
- Se a criação via Typebot está permitida (`canCreateTypebot`)

Essas informações são exibidas apenas na área restrita do admin, nunca em canais públicos.

---

## Health Check Typebot

O health check da integração Typebot (página de credenciais do tenant) mostra checks adicionais de política:

- Política de assinatura (status e dias vencidos)
- Link público permitido
- Criação via link público
- Typebot permitido
- Criação via Typebot
- Criação manual permitida

O status geral do health check considera a política:

- **BLOCKED** quando `canCreateTypebotAppointment` é `false`
- **WARNING** quando a política está `EXPIRING_SOON` ou `OVERDUE_WARNING`
- **READY** quando todos os checks passam

---

## Audit logs

Tentativas de criação bloqueadas geram eventos de auditoria:

| Evento | Canal | Quando |
|---|---|---|
| `SUBSCRIPTION_ENFORCEMENT_BLOCKED_MANUAL_APPOINTMENT` | Painel do prestador | >15 dias vencido |
| `SUBSCRIPTION_ENFORCEMENT_BLOCKED_PUBLIC_APPOINTMENT` | Link público | ≥8 dias vencido |
| `SUBSCRIPTION_ENFORCEMENT_BLOCKED_TYPEBOT_APPOINTMENT` | Typebot/WhatsApp | ≥8 dias vencido |

Metadata incluída:

```json
{
  "tenantId": "uuid",
  "channel": "MANUAL_PANEL | PUBLIC_LINK | WHATSAPP",
  "policyStatus": "OVERDUE_CRITICAL",
  "daysOverdue": 10
}
```

---

## Arquitetura

### Módulo centralizado

```
src/features/subscriptions/subscription-policy.ts
```

Funções puras e testáveis. Todas recebem data como parâmetro para determinismo.

### Integração com canais

- `src/features/booking-core/tenant-policy.ts` — adaptadores que delegam ao módulo central
- `src/features/public-booking/public-booking-service.ts` — enforce no link público
- `src/server/services/appointment-service.ts` — enforce na criação manual
- `src/app/api/typebot/[tenantSlug]/appointments/route.ts` — enforce na API Typebot
- `src/features/typebot-simulator/simulator-actions.ts` — status no simulador
- `src/features/typebot/typebot-health-service.ts` — checks no health status
- `src/app/(provider)/app/dashboard/page.tsx` — avisos no dashboard

---

## Como testar

1. Crie um tenant com assinatura ativa e `whatsappEnabled = true`, `publicLinkEnabled = true`
2. Acesse o dashboard do prestador — sem avisos
3. Altere o vencimento para 2 dias atrás — aviso WARNING no dashboard
4. Altere para 5 dias atrás — aviso CRITICAL, canais ainda funcionam
5. Altere para 10 dias atrás — aviso BLOCKED, link público visível mas criação bloqueada, Typebot criação bloqueada
6. Altere para 20 dias atrás — link público indisponível, Typebot indisponível, criação manual bloqueada
7. Verifique os audit logs em `/admin/audit-logs` para eventos `SUBSCRIPTION_ENFORCEMENT_BLOCKED_*`
8. Acesse o simulador Typebot como Super Admin e verifique o status da política
9. Acesse a página de credenciais Typebot e verifique os checks de política no health status

---

## Limitações

- Não há cobrança automática
- Não há integração com gateway de pagamento
- Alteração de vencimento/status continua manual pelo admin
- Não há job automático de mudança de status nesta fase
- A política é calculada em tempo real com base na assinatura atual
- Bloqueio é preventivo (na criação), não retroativo (agendamentos existentes não são afetados)
