# Provider Onboarding Wizard

## Objetivo

O onboarding wizard guia o prestador pela configuração inicial do negócio, garantindo que os dados mínimos estejam preenchidos para que o tenant esteja operacional.

Diferente da aplicação de template pelo Super Admin (`/admin/tenants/[id]/templates`), o onboarding é um fluxo auto-guiado para o prestador dentro do painel `/app`.

## Etapas

| Etapa | Título | Objetivo |
|-------|--------|----------|
| 1 | Dados do negócio | Revisar e completar nome, responsável, e-mail, WhatsApp, segmento, cidade, estado, endereço e descrição |
| 2 | Serviços | Garantir pelo menos 1 serviço ativo — via criação manual ou aplicação de template de segmento |
| 3 | Horários | Garantir pelo menos 1 regra de disponibilidade — via configuração manual ou horários sugeridos |
| 4 | Link público | Visualizar a URL pública e status dos pré-requisitos para agendamento online |
| 5 | Revisão | Checklist final e conclusão do onboarding |

## Permissões

- **OWNER** e **ADMIN** do tenant podem acessar `/app/onboarding`
- **MEMBER** não acessa (seguindo a regra atual de manutenção do painel)
- **CUSTOMER**, **SUPER_ADMIN** fora de contexto e visitantes não acessam
- Todas as ações aplicam isolamento multi-tenant — o prestador só opera no próprio tenant

## Checklist de prontidão

O checklist é gerado por `getProviderOnboardingChecklist(tenantId)` em `src/features/onboarding/onboarding-checklist-service.ts`.

### Itens verificados

| Chave | Descrição | Impacta conclusão |
|-------|-----------|-------------------|
| `business_info` | Dados do negócio preenchidos | Sim (obrigatório) |
| `active_category` | Pelo menos 1 categoria ativa | Não obrigatório |
| `active_service` | Pelo menos 1 serviço ativo | Sim (obrigatório) |
| `availability` | Horários configurados | Sim (obrigatório) |
| `subscription_active` | Assinatura permite link público | Não obrigatório para concluir |
| `public_booking_ready` | Link público pronto | Não obrigatório |
| `typebot_ready` | Canal WhatsApp/Typebot pronto | Opcional |

### Requisitos mínimos para concluir

- Dados básicos do negócio preenchidos
- Pelo menos 1 serviço ativo
- Pelo menos 1 regra de horário ativa

Não é necessário ter Typebot configurado ou link público funcionando para concluir o onboarding.

## Integração com templates

O prestador pode aplicar templates de segmento durante o onboarding (etapa 2):

- Apenas no próprio tenant
- Apenas durante o onboarding (status `IN_PROGRESS` ou `NOT_STARTED`)
- Aplicação idempotente — não duplica itens existentes
- Não sobrescreve dados existentes
- Template sugerido baseado no campo `segment` do tenant
- Templates disponíveis: Mecânica, Barbearia, Manicure, Estética, Assistência técnica, Clínica/consultório
- Audit log registrado como `PROVIDER_ONBOARDING_TEMPLATE_APPLIED`

### Horários sugeridos

Na etapa 3, o prestador pode aplicar horários padrão:

- Segunda a sexta: 08:00–12:00 e 13:30–18:00
- Sábado: 08:00–12:00
- Intervalo de 30 minutos
- Não duplica regras já existentes (verificação por weekday + startTime + endTime)

## Integração com assinatura

O onboarding respeita a política de assinatura:

- Prestador pode configurar negócio, serviços e horários mesmo com assinatura vencida/bloqueada
- Checklist mostra status real da assinatura
- Conclusão do onboarding não é bloqueada por assinatura vencida
- O checklist informa quando o link público ou Typebot estão indisponíveis por conta do plano/assinatura

## Typebot/WhatsApp no onboarding

- Apenas status informativo
- Não expõe token Typebot
- Não permite gerar credencial Typebot
- Se o plano permite Typebot mas não há credencial: "Canal ainda não configurado pela plataforma"
- Se o plano não permite Typebot: "Canal não disponível no seu plano atual"
- Se o plano permite e há credencial ativa: "Canal WhatsApp/Typebot pronto para integração"

## Modelo de dados

### Tenant

```
onboardingStatus       OnboardingStatus @default(NOT_STARTED)
onboardingCompletedAt  DateTime?
onboardingSkippedAt    DateTime?
```

### OnboardingStatus (enum)

| Valor | Significado |
|-------|-------------|
| `NOT_STARTED` | Prestador nunca iniciou o onboarding |
| `IN_PROGRESS` | Onboarding em andamento |
| `COMPLETED` | Onboarding concluído |
| `SKIPPED` | Prestador optou por pular |

## Audit logs

| Evento | Quando |
|--------|--------|
| `PROVIDER_ONBOARDING_STARTED` | Prestador inicia o wizard |
| `PROVIDER_ONBOARDING_SKIPPED` | Prestador pula o onboarding |
| `PROVIDER_ONBOARDING_RESUMED` | Prestador retoma onboarding após pular |
| `PROVIDER_ONBOARDING_COMPLETED` | Prestador conclui o onboarding |
| `PROVIDER_ONBOARDING_TEMPLATE_APPLIED` | Prestador aplica template durante onboarding |
| `PROVIDER_ONBOARDING_AVAILABILITY_APPLIED` | Prestador aplica horários sugeridos durante onboarding |

## Fluxo de navegação

1. Dashboard (`/app/dashboard`) mostra card de onboarding quando `onboardingStatus != COMPLETED`
2. Botão "Começar" / "Continuar" / "Retomar" leva para `/app/onboarding`
3. Wizard com 5 etapas navegáveis via stepper horizontal
4. Navegação: Próximo / Voltar entre etapas
5. Botão "Pular" disponível em todas as etapas
6. Conclusão na etapa 5, se requisitos mínimos atendidos
7. Após conclusão, redireciona para `/app/dashboard`

## Dashboard

O card de onboarding aparece no dashboard quando:

- `NOT_STARTED`: "Complete a configuração inicial do seu negócio" com botão "Começar"
- `IN_PROGRESS`: "Complete a configuração inicial do seu negócio" com botão "Continuar"
- `SKIPPED`: "Retomar configuração inicial" com botão "Retomar"
- `COMPLETED`: card não é exibido

## Limitações

- Não há onboarding do Super Admin
- Não há criação automática de tenant via wizard
- Não há pagamento/cobrança automática
- Não há integração com WhatsApp Cloud API real
- Prestador não configura Typebot (apenas vê status)
- Prestador não gera token Typebot
- Não há upload de logo/fotos
- Não há domínio próprio
- Não há integração Google Agenda
- Não há importação de clientes
- Não há mensagens automáticas ou lembretes

## Arquivos relevantes

```
src/features/onboarding/
  onboarding-checklist-service.ts       — Serviço de checklist
  onboarding-checklist-service.test.ts  — Testes do checklist
  onboarding-actions.ts                 — Server actions

src/app/(provider)/app/onboarding/
  page.tsx   — Página server
  client.tsx — Componente interativo (wizard)

prisma/schema.prisma
  — enum OnboardingStatus
  — campos onboardingStatus, onboardingCompletedAt, onboardingSkippedAt no Tenant
```
