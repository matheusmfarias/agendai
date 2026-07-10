# Task - Phase 13 Subscription Enforcement

## Objetivo

Implementar e consolidar as regras de enforcement de assinatura do AgendaZap.

Até agora o sistema possui planos, assinaturas, status de tenant, link público, Typebot API e validações pontuais de plano/assinatura. Esta fase deve centralizar e padronizar a política comercial para definir quando um tenant pode ou não:

```text
- receber novos agendamentos manuais
- receber agendamentos pelo link público
- receber agendamentos via Typebot/WhatsApp
- manter o link público visível
- manter o atendimento Typebot ativo
```

A regra deve ser consistente entre painel admin, painel do prestador, link público, Typebot API e simulador.

---

# Dependências

Esta task depende da conclusão e validação das fases:

```text
/docs/tasks/phase-01-foundation.md
/docs/tasks/phase-02-admin-platform.md
/docs/tasks/phase-02-1-provider-login-access.md
/docs/tasks/phase-03-provider-panel.md
/docs/tasks/phase-04-customers-appointments-core.md
/docs/tasks/phase-05-public-booking-link.md
/docs/tasks/phase-05-1-public-customer-auth.md
/docs/tasks/phase-05-2-public-routing-refactor.md
/docs/tasks/phase-06-typebot-api.md
/docs/tasks/phase-07-typebot-flow-blueprint.md
/docs/tasks/phase-08-typebot-service-details-custom-fields.md
/docs/tasks/phase-09-typebot-flow-simulator.md
/docs/tasks/phase-10-typebot-real-setup-guide.md
/docs/tasks/phase-11-typebot-tenant-credentials.md
/docs/tasks/phase-12-typebot-production-readiness.md
```

Antes de implementar, leia obrigatoriamente:

```text
/docs/specs/00-visao-produto.md
/docs/specs/01-usuarios-permissoes.md
/docs/specs/02-admin-plataforma.md
/docs/technical/banco-dados.md
/docs/technical/auth-permissoes.md
/docs/technical/padroes-codigo.md
/docs/technical/typebot-api.md
README.md
```

---

# Regras comerciais desejadas

## Conceito geral

A assinatura do tenant define o acesso operacional do prestador aos canais de agendamento.

O sistema deve tratar assinatura vencida em estágios:

```text
0 dias vencido ou antes do vencimento:
- operação normal

1 a 3 dias vencido:
- aviso no painel do prestador
- novos agendamentos ainda permitidos

4 a 7 dias vencido:
- aviso mais forte no painel
- novos agendamentos ainda permitidos ou bloqueados conforme política escolhida

8 a 15 dias vencido:
- bloquear novos agendamentos públicos e Typebot
- painel do prestador ainda acessível
- agendamentos manuais podem ser permitidos ou bloqueados conforme regra definida

mais de 15 dias vencido:
- suspender link público e Typebot
- bloquear novos agendamentos externos
- painel do prestador continua acessível somente para visualização/configuração mínima
```

## Política final para esta fase

Implementar a seguinte política:

### Assinatura ativa e não vencida

```text
- painel do prestador: permitido
- agendamento manual: permitido
- link público: permitido se plano publicLinkEnabled = true
- Typebot/WhatsApp: permitido se plano whatsappEnabled = true
```

### Assinatura vencida há 1 a 3 dias

```text
- painel do prestador: permitido
- agendamento manual: permitido
- link público: permitido
- Typebot/WhatsApp: permitido
- mostrar aviso no dashboard do prestador
```

### Assinatura vencida há 4 a 7 dias

```text
- painel do prestador: permitido
- agendamento manual: permitido
- link público: permitido
- Typebot/WhatsApp: permitido
- mostrar aviso crítico no dashboard do prestador
```

### Assinatura vencida há 8 a 15 dias

```text
- painel do prestador: permitido
- agendamento manual: permitido
- link público: visível, mas não permite criar novo agendamento
- Typebot/WhatsApp: bloqueia criação de novo agendamento
- mostrar aviso crítico no dashboard do prestador
```

### Assinatura vencida há mais de 15 dias

```text
- painel do prestador: permitido
- agendamento manual: bloqueado
- link público: indisponível
- Typebot/WhatsApp: indisponível
- mostrar aviso de suspensão operacional no dashboard do prestador
```

### Tenant suspenso/cancelado

Se `tenant.status` não estiver ativo:

```text
- painel do prestador: acesso bloqueado conforme regra atual
- link público: indisponível
- Typebot/WhatsApp: indisponível
- agendamentos externos: bloqueados
```

---

# 1. Centralizar política de assinatura

Criar ou ajustar módulo centralizado:

```text
src/features/subscriptions/subscription-policy.ts
```

ou equivalente.

## Funções esperadas

Criar funções puras e testáveis:

```ts
getSubscriptionPolicyStatus(input): SubscriptionPolicyStatus
canAccessProviderPanel(input): boolean
canCreateManualAppointment(input): boolean
canUsePublicLink(input): boolean
canCreatePublicAppointment(input): boolean
canUseTypebot(input): boolean
canCreateTypebotAppointment(input): boolean
getProviderSubscriptionWarning(input): ProviderSubscriptionWarning | null
getPublicUnavailableMessage(input): string
```

## Status sugeridos

```text
ACTIVE
EXPIRING_SOON
OVERDUE_WARNING
OVERDUE_CRITICAL
EXTERNAL_BOOKING_BLOCKED
SUSPENDED
CANCELED
NO_SUBSCRIPTION
```

## Níveis de aviso

```text
NONE
WARNING
CRITICAL
BLOCKED
```

## Regras

* As funções devem ser determinísticas.
* Receber datas como parâmetro, evitando `new Date()` escondido quando possível.
* Facilitar testes unitários.
* Não duplicar a mesma regra em múltiplos services.

---

# 2. Aplicar no painel do prestador

## Dashboard

Atualizar:

```text
/app/dashboard
```

Exibir aviso conforme status da assinatura.

### Aviso 1 a 3 dias vencido

```text
Sua assinatura está vencida. Regularize para evitar bloqueios nos canais de agendamento.
```

### Aviso 4 a 7 dias vencido

```text
Sua assinatura está vencida há alguns dias. Regularize o quanto antes para evitar bloqueio de novos agendamentos externos.
```

### Aviso 8 a 15 dias vencido

```text
Novos agendamentos pelo link público e WhatsApp/Typebot estão temporariamente bloqueados. Regularize sua assinatura para reativar esses canais.
```

### Aviso acima de 15 dias

```text
Sua operação de agendamentos está suspensa por assinatura vencida. Regularize sua assinatura para reativar os canais.
```

## Regras

* O painel pode continuar acessível para o prestador enquanto o tenant estiver ativo.
* Não bloquear configuração de serviços/horários nesta fase.
* Bloquear apenas criação de agendamento manual quando assinatura estiver vencida há mais de 15 dias.

---

# 3. Aplicar na criação manual de agendamento

Atualizar o service/action de criação manual:

```text
src/server/services/appointment-service.ts
```

ou equivalente.

## Regra

Se assinatura vencida há mais de 15 dias:

```json
{
  "ok": false,
  "code": "SUBSCRIPTION_BLOCKED",
  "message": "Não é possível criar novos agendamentos enquanto a assinatura estiver bloqueada."
}
```

## Importante

* Não bloquear edição de agendamentos existentes nesta fase.
* Não bloquear cancelamento/finalização de agendamentos existentes.
* Não bloquear consulta/listagem.

---

# 4. Aplicar no link público

Atualizar lógica do link público:

```text
src/features/public-booking/...
```

## Regras

### Até 7 dias vencido

```text
- link público funciona normalmente
- criação de agendamento público permitida
```

### 8 a 15 dias vencido

```text
- página pública pode abrir
- serviços podem aparecer
- horários podem aparecer ou não, conforme implementação
- confirmação/criação de novo agendamento deve ser bloqueada
```

Mensagem pública:

```text
Este serviço de agendamento está temporariamente indisponível. Entre em contato diretamente com o estabelecimento.
```

### Mais de 15 dias vencido

```text
- página pública deve mostrar indisponível
- não listar serviços/horários
- não permitir criação
```

Mensagem pública:

```text
Este serviço de agendamento está temporariamente indisponível. Entre em contato diretamente com o estabelecimento.
```

## Segurança

Nunca informar publicamente:

```text
- assinatura vencida
- inadimplência
- dias de atraso
- motivo administrativo
```

---

# 5. Aplicar na Typebot API

Atualizar política Typebot em:

```text
src/features/typebot/...
src/features/booking-core/tenant-policy.ts
```

ou equivalente.

## Regras

### Até 7 dias vencido

```text
- endpoints Typebot funcionam normalmente
```

### 8 a 15 dias vencido

```text
- business pode retornar ok ou BUSINESS_UNAVAILABLE conforme política escolhida
- services/slots podem retornar ok se quiser permitir consulta
- appointments deve bloquear criação
```

Recomendação:

```text
- business/services/service detail/slots retornam ok
- appointments retorna BUSINESS_UNAVAILABLE
```

Mensagem:

```json
{
  "ok": false,
  "code": "BUSINESS_UNAVAILABLE",
  "message": "Este atendimento está temporariamente indisponível."
}
```

### Mais de 15 dias vencido

```text
- todos endpoints Typebot devem retornar BUSINESS_UNAVAILABLE
```

## Segurança

Não revelar motivo administrativo.

---

# 6. Aplicar no simulador Typebot

Atualizar:

```text
/admin/typebot-simulator
```

## Regras

* Mostrar no simulador o status real da política.
* Se canal Typebot estiver bloqueado, mostrar motivo administrativo para Super Admin.
* Permitir Super Admin entender:

  * vencimento
  * dias vencidos
  * plano WhatsApp ativo/inativo
  * assinatura status
  * por que está BLOCKED/WARNING/READY

## Importante

No simulador admin pode mostrar motivo administrativo porque é área restrita.

---

# 7. Aplicar no health/status Typebot

Atualizar health/status criado na Phase 12.

## Checks novos

Adicionar:

```text
Subscription policy status
Days overdue
Public link allowed
Public booking creation allowed
Typebot allowed
Typebot booking creation allowed
Manual appointment creation allowed
```

## Status final

* READY quando todos canais necessários estiverem permitidos.
* WARNING quando assinatura estiver vencida até 7 dias.
* BLOCKED quando canais estiverem bloqueados pela política.

---

# 8. Painel Admin

Atualizar telas de assinatura/tenant, se necessário, para deixar claro o impacto operacional.

## Sugestão

No detalhe da assinatura ou do tenant, mostrar:

```text
Status operacional:
- Painel prestador
- Agendamento manual
- Link público
- Criação via link público
- Typebot/WhatsApp
- Criação via Typebot
```

## Fora do escopo

Não implementar cobrança automática, gateway, envio de boleto, Pix, notificações por e-mail ou WhatsApp.

---

# 9. Audit logs

Criar audit log quando uma tentativa de criação for bloqueada por assinatura.

Eventos sugeridos:

```text
SUBSCRIPTION_ENFORCEMENT_BLOCKED_MANUAL_APPOINTMENT
SUBSCRIPTION_ENFORCEMENT_BLOCKED_PUBLIC_APPOINTMENT
SUBSCRIPTION_ENFORCEMENT_BLOCKED_TYPEBOT_APPOINTMENT
```

Metadata segura:

```json
{
  "tenantId": "tenant_id",
  "channel": "PUBLIC_LINK | WHATSAPP | MANUAL_PANEL",
  "policyStatus": "EXTERNAL_BOOKING_BLOCKED",
  "daysOverdue": 10
}
```

Não criar log para cada visualização pública bloqueada se isso gerar volume alto. Priorizar tentativas de criação.

---

# 10. Testes automatizados

Criar testes para a política centralizada.

Sugestão:

```text
tests/subscriptions/subscription-policy.test.ts
```

## Casos obrigatórios

```text
assinatura ativa não vencida
vencida há 1 dia
vencida há 3 dias
vencida há 4 dias
vencida há 7 dias
vencida há 8 dias
vencida há 15 dias
vencida há 16 dias
tenant suspenso
tenant cancelado
sem assinatura
plano publicLinkEnabled false
plano whatsappEnabled false
```

Validar:

```text
canAccessProviderPanel
canCreateManualAppointment
canUsePublicLink
canCreatePublicAppointment
canUseTypebot
canCreateTypebotAppointment
warning level
public message
```

Também adicionar testes ou ajustar testes existentes para Typebot/public booking se houver estrutura.

---

# 11. Documentação

Criar:

```text
/docs/technical/subscription-enforcement.md
```

Documentar:

```text
- estados da assinatura
- dias de vencimento
- regras por canal
- mensagens públicas
- avisos internos
- como testar
- limitações
```

Atualizar:

```text
README.md
/docs/technical/typebot-api.md
/docs/typebot/troubleshooting.md
/docs/typebot/real-validation-checklist.md
```

---

# 12. Limitações

Documentar:

```text
- não há cobrança automática
- não há integração com gateway de pagamento
- alteração de vencimento/status continua manual pelo admin
- não há job automático de mudança de status nesta fase
- a política é calculada em tempo real com base na assinatura atual
```

---

# Fora do escopo

Não implementar:

```text
gateway de pagamento
Pix
boleto
cobrança automática
job de cobrança
notificações automáticas
e-mail de cobrança
WhatsApp de cobrança
painel financeiro avançado
notas fiscais
recorrência real de pagamento
bloqueio total de login do prestador
impersonation admin
```

---

# Critérios de aceite

* Política de assinatura centralizada criada.
* Regras por dias vencidos implementadas.
* Dashboard do prestador mostra avisos.
* Criação manual bloqueia apenas acima de 15 dias vencido.
* Link público bloqueia criação externa a partir de 8 dias vencido.
* Link público fica indisponível acima de 15 dias vencido.
* Typebot bloqueia criação externa a partir de 8 dias vencido.
* Typebot fica indisponível acima de 15 dias vencido.
* Mensagens públicas não revelam inadimplência.
* Simulador mostra status administrativo da política.
* Health/status Typebot mostra checks de política.
* Admin consegue entender impacto operacional.
* Audit logs são criados para tentativas de criação bloqueadas.
* Testes automatizados cobrem a política.
* Documentação criada.
* README atualizado.
* Link público web continua funcionando para assinaturas válidas.
* Typebot API continua funcionando para assinaturas válidas.
* Simulador continua funcionando para tenants válidos.
* Painel do prestador continua funcionando.
* `pnpm typecheck`, `pnpm lint`, `pnpm test` e `pnpm build` passam.

---

# Instruções para o DeepSeek

Implemente somente a Phase 13 Subscription Enforcement.

Não implemente cobrança automática, gateway, Pix, boleto, jobs, notificações, WhatsApp de cobrança ou bloqueio total de login do prestador.

A política deve ser centralizada, testável e aplicada consistentemente em:

```text
- painel do prestador
- criação manual de agendamento
- link público
- Typebot API
- simulador Typebot
- health/status Typebot
```

Ao finalizar, informe:

```text
- arquivos criados
- arquivos alterados
- se houve migration
- política implementada
- testes adicionados
- como validar
- validações executadas
- pendências conhecidas
```
