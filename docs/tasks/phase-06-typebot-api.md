# Task - Phase 06 Typebot API

## Objetivo

Implementar a camada de API pública para integração com Typebot, permitindo que um fluxo conversacional consulte dados do prestador, liste serviços, consulte horários disponíveis, identifique ou cadastre cliente e crie solicitações/agendamentos.

Esta fase prepara o AgendaZap para atendimento via WhatsApp usando Typebot como camada conversacional.

O Typebot não deve conter regra crítica de negócio. Ele apenas chama endpoints do AgendaZap. Toda validação importante deve continuar no backend do AgendaZap.

## Dependências

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
```

Antes de implementar, leia obrigatoriamente:

```text
/docs/specs/00-visao-produto.md
/docs/specs/01-usuarios-permissoes.md
/docs/specs/02-admin-plataforma.md
/docs/technical/stack.md
/docs/technical/arquitetura.md
/docs/technical/banco-dados.md
/docs/technical/auth-permissoes.md
/docs/technical/padroes-codigo.md
/docs/tasks/phase-05-public-booking-link.md
/docs/tasks/phase-05-1-public-customer-auth.md
/docs/tasks/phase-05-2-public-routing-refactor.md
```

## Escopo

Implementar endpoints públicos para Typebot:

```text
/api/typebot/[tenantSlug]/business
/api/typebot/[tenantSlug]/services
/api/typebot/[tenantSlug]/services/[serviceId]/slots
/api/typebot/[tenantSlug]/customers/identify
/api/typebot/[tenantSlug]/appointments
/api/typebot/[tenantSlug]/appointments/[appointmentId]
```

Também implementar:

```text
typebot_sessions
services/repositories/actions necessários
validação de tenant/plano/assinatura
proteção básica dos endpoints
rate limiting simples ou estrutura preparada
audit logs
appointment events
documentação de uso
```

---

# 1. Princípio da integração

O Typebot deve ser apenas a interface conversacional.

Ele pode:

```text
- receber mensagens do cliente
- perguntar nome, telefone, serviço e horário
- chamar endpoints do AgendaZap
- exibir respostas retornadas pela API
```

Ele não pode:

```text
- decidir disponibilidade
- decidir conflito de horário
- criar agendamento sem validação do AgendaZap
- ignorar bloqueio de agenda
- confirmar horário sem validação final
- acessar dados de outro tenant
```

Toda regra crítica fica no AgendaZap.

---

# 2. Autenticação/proteção dos endpoints Typebot

## Objetivo

Os endpoints `/api/typebot/...` são públicos no sentido de não usarem sessão de usuário do navegador, mas não devem ficar totalmente abertos para qualquer chamada anônima irrestrita.

## Implementação MVP

Usar header simples com token por ambiente:

```text
x-typebot-api-key
```

Valor esperado em variável de ambiente:

```text
TYPEBOT_API_KEY
```

## Regras

* Se `TYPEBOT_API_KEY` estiver configurada, todos os endpoints Typebot devem exigir header `x-typebot-api-key`.
* Se o header estiver ausente ou inválido, retornar `401`.
* Em ambiente de desenvolvimento, se a variável não estiver configurada, permitir chamada mas registrar warning ou tratar como modo dev.
* Não usar sessão de usuário CUSTOMER nos endpoints Typebot.
* Não reaproveitar cookie `agenda-zap-session`.

## Fora desta fase

Não implementar OAuth, assinatura HMAC por payload, painel de geração de tokens por tenant ou webhook secret por tenant. Isso pode ficar para fase futura.

---

# 3. Banco de dados: typebot_sessions

Criar tabela/model Prisma:

```text
typebot_sessions
```

## Campos mínimos

```text
id
tenant_id
customer_id nullable
phone
customer_name nullable
last_service_id nullable
last_appointment_id nullable
status
metadata jsonb
created_at
updated_at
last_interaction_at
```

## Status sugeridos

```text
STARTED
IDENTIFIED
SELECTING_SERVICE
SELECTING_SLOT
WAITING_CONFIRMATION
APPOINTMENT_CREATED
ABANDONED
```

Se preferir enum Prisma:

```text
TypebotSessionStatus
```

## Regras

* Sessão pertence a um tenant.
* Sessão pode ou não estar vinculada a customer.
* Telefone é obrigatório, pois WhatsApp/Typebot parte do número.
* Uma sessão pode ser reutilizada pelo mesmo telefone dentro do mesmo tenant.
* O mesmo telefone pode existir em tenants diferentes.
* Metadata pode guardar dados conversacionais auxiliares, mas não regra de negócio crítica.

## Índices recomendados

```text
tenant_id
phone
tenant_id + phone
customer_id
last_interaction_at
```

---

# 4. Endpoint: dados do negócio

## Rota

```http
GET /api/typebot/[tenantSlug]/business
```

## Objetivo

Retornar dados públicos do prestador para o Typebot iniciar a conversa.

## Resposta de sucesso

```json
{
  "ok": true,
  "tenant": {
    "id": "tenant_id",
    "name": "Mecânica Silva",
    "slug": "mecanica-silva",
    "description": "Serviços automotivos",
    "city": "Panambi",
    "state": "RS",
    "whatsapp": "55999999999"
  }
}
```

## Validações

* Tenant existe.
* Tenant está ativo.
* Plano/assinatura permitem WhatsApp/Typebot.
* Se indisponível, retornar resposta genérica.

## Erro público sugerido

```json
{
  "ok": false,
  "code": "BUSINESS_UNAVAILABLE",
  "message": "Este atendimento está temporariamente indisponível."
}
```

Nunca informar publicamente inadimplência, assinatura vencida ou motivo administrativo.

---

# 5. Endpoint: listar serviços

## Rota

```http
GET /api/typebot/[tenantSlug]/services
```

## Objetivo

Retornar serviços ativos em formato fácil para Typebot montar lista numerada.

## Regras

* Retornar apenas categorias ativas.
* Retornar apenas serviços ativos.
* Não retornar serviços de categorias inativas.
* Ordenar por categoria e posição do serviço.
* Não depender de botões do WhatsApp.
* Resposta deve ser adequada para lista numerada.

## Resposta sugerida

```json
{
  "ok": true,
  "services": [
    {
      "number": 1,
      "id": "service_id",
      "category": "Serviços rápidos",
      "name": "Troca de óleo",
      "description": "Troca de óleo e filtro",
      "durationMinutes": 30,
      "priceText": "A partir de R$ 80,00",
      "bookingMode": "DIRECT"
    }
  ],
  "text": "1 - Troca de óleo | 30 min | A partir de R$ 80,00"
}
```

## Observação

O campo `text` pode retornar uma string pronta para o Typebot enviar ao cliente no WhatsApp.

---

# 6. Endpoint: horários disponíveis

## Rota

```http
GET /api/typebot/[tenantSlug]/services/[serviceId]/slots
```

## Query params

```text
date opcional, formato YYYY-MM-DD
days opcional, padrão 7, máximo 14
```

## Objetivo

Retornar horários disponíveis para um serviço.

## Regras

Reutilizar a mesma lógica do link público:

```text
availability_rules
schedule_blocks
conflitos com appointments ativos
duração do serviço
slot_interval_minutes
não mostrar horário no passado
tenant ativo
assinatura/plano WhatsApp habilitado
serviço ativo
categoria ativa
```

## Status que bloqueiam horário

Bloqueiam:

```text
REQUESTED
CONFIRMED
WAITING_INFO
RESCHEDULED
IN_PROGRESS
```

Não bloqueiam:

```text
CANCELED_BY_CUSTOMER
CANCELED_BY_PROVIDER
NO_SHOW
FINISHED
```

## Resposta sugerida

```json
{
  "ok": true,
  "service": {
    "id": "service_id",
    "name": "Troca de óleo",
    "durationMinutes": 30
  },
  "slots": [
    {
      "number": 1,
      "startsAt": "2026-06-29T11:00:00.000Z",
      "endsAt": "2026-06-29T11:30:00.000Z",
      "label": "29/06 às 08:00"
    }
  ],
  "text": "1 - 29/06 às 08:00\n2 - 29/06 às 08:30"
}
```

## Regras para lista numerada

* A API deve retornar `number` começando em 1.
* O Typebot pode receber a resposta numérica do cliente e chamar o endpoint de criação usando `startsAt`.
* Não depender de botões do WhatsApp.

---

# 7. Endpoint: identificar cliente

## Rota

```http
POST /api/typebot/[tenantSlug]/customers/identify
```

## Objetivo

Criar ou reutilizar cliente a partir de telefone e nome informado no WhatsApp.

## Payload

```json
{
  "phone": "55999999999",
  "name": "João Silva",
  "email": "joao@email.com"
}
```

## Regras

* Telefone obrigatório.
* Nome obrigatório para criar cliente.
* E-mail opcional.
* Buscar customer por `tenant_id + phone`.
* Se existir, atualizar nome/e-mail se necessário.
* Se não existir, criar.
* Não criar user CUSTOMER nesta fase.
* Não exigir senha nesta fase.
* Não usar `customer.userId` obrigatório nesta fase.
* Criar ou atualizar `typebot_session`.
* Retornar customer e session.

## Resposta sugerida

```json
{
  "ok": true,
  "customer": {
    "id": "customer_id",
    "name": "João Silva",
    "phone": "55999999999",
    "email": "joao@email.com"
  },
  "session": {
    "id": "session_id",
    "status": "IDENTIFIED"
  }
}
```

## Observação importante

O fluxo via WhatsApp/Typebot não deve exigir login com e-mail e senha nesta fase, porque a identidade prática do canal é o telefone do WhatsApp.

O link público web continua exigindo CUSTOMER autenticado para confirmar agendamento.

---

# 8. Endpoint: criar agendamento via Typebot

## Rota

```http
POST /api/typebot/[tenantSlug]/appointments
```

## Payload

```json
{
  "sessionId": "typebot_session_id",
  "customerId": "customer_id",
  "serviceId": "service_id",
  "startsAt": "2026-06-29T11:00:00.000Z",
  "customValues": [
    {
      "customFieldId": "field_id",
      "value": "ABC1234"
    }
  ],
  "customerNotes": "Cliente informou que prefere atendimento rápido"
}
```

## Regras

Ao criar:

1. Validar API key.
2. Validar tenant ativo.
3. Validar plano/assinatura WhatsApp/Typebot habilitado.
4. Validar session pertence ao tenant.
5. Validar customer pertence ao tenant.
6. Validar service pertence ao tenant.
7. Validar categoria ativa.
8. Validar serviço ativo.
9. Validar campos personalizados obrigatórios.
10. Validar SELECT com opções permitidas.
11. Validar disponibilidade.
12. Validar bloqueios.
13. Validar conflitos.
14. Criar appointment.
15. Criar appointment_custom_values.
16. Criar appointment_event.
17. Atualizar typebot_session.
18. Criar audit log.

## Origin

Todo agendamento criado via Typebot deve ter:

```text
origin = WHATSAPP
```

ou, se o enum atual ainda não tiver `WHATSAPP`, adicionar ao enum existente.

Se o projeto já possui `AppointmentOrigin.WHATSAPP`, usar.

## Status inicial

Respeitar `booking_mode`:

```text
DIRECT -> CONFIRMED
REQUIRES_CONFIRMATION -> REQUESTED
INFORMATIONAL -> WAITING_INFO ou REQUESTED
```

## createdByUserId

No fluxo Typebot:

```text
createdByUserId = null
```

Porque o agendamento não é criado por usuário interno do prestador.

## Resposta sugerida

```json
{
  "ok": true,
  "appointment": {
    "id": "appointment_id",
    "status": "CONFIRMED",
    "origin": "WHATSAPP",
    "startsAt": "2026-06-29T11:00:00.000Z",
    "endsAt": "2026-06-29T11:30:00.000Z"
  },
  "message": "Agendamento confirmado com sucesso."
}
```

Para `REQUIRES_CONFIRMATION`:

```json
{
  "ok": true,
  "appointment": {
    "id": "appointment_id",
    "status": "REQUESTED",
    "origin": "WHATSAPP"
  },
  "message": "Sua solicitação foi enviada e aguarda confirmação do prestador."
}
```

---

# 9. Endpoint: consultar agendamento

## Rota

```http
GET /api/typebot/[tenantSlug]/appointments/[appointmentId]
```

## Objetivo

Permitir que o Typebot confirme ao cliente os dados do agendamento recém-criado.

## Regras

* Validar API key.
* Validar tenant.
* Agendamento deve pertencer ao tenant.
* Não retornar dados administrativos.
* Não retornar audit logs.
* Não retornar dados de outros clientes.

## Resposta sugerida

```json
{
  "ok": true,
  "appointment": {
    "id": "appointment_id",
    "status": "CONFIRMED",
    "origin": "WHATSAPP",
    "serviceName": "Troca de óleo",
    "customerName": "João Silva",
    "startsAt": "2026-06-29T11:00:00.000Z",
    "endsAt": "2026-06-29T11:30:00.000Z",
    "priceText": "A partir de R$ 80,00"
  }
}
```

---

# 10. Reaproveitamento de lógica existente

A implementação deve evitar duplicar regras já existentes no link público.

Reutilizar ou extrair serviços comuns para:

```text
- validar tenant bookable
- formatar preço
- listar serviços ativos
- calcular slots
- validar conflito
- validar bloqueio
- validar custom fields
- criar appointment externo
```

## Regra importante

Se houver lógica atualmente dentro de `src/features/public-booking/public-booking-service.ts` que também serve para Typebot, extrair para módulos compartilhados dentro de `src/features/booking-core/` ou equivalente.

Exemplo aceitável:

```text
src/features/booking-core/availability.ts
src/features/booking-core/appointment-create.ts
src/features/booking-core/custom-fields.ts
src/features/booking-core/price-format.ts
src/features/booking-core/tenant-booking-policy.ts
```

Não duplicar regras críticas em dois lugares.

---

# 11. Painel do prestador

Atualizar `/app/appointments` e detalhe do agendamento, se necessário, para exibir origem:

```text
WHATSAPP
```

ou texto amigável:

```text
WhatsApp
```

## Regras

* Agendamentos WHATSAPP devem aparecer junto com os demais.
* Filtros por origem devem incluir WHATSAPP, se existir filtro.
* Detalhe deve mostrar respostas dos campos personalizados.
* Histórico deve mostrar criação via WhatsApp/Typebot.

---

# 12. Audit logs

Registrar eventos:

```text
TYPEBOT_SESSION_STARTED
TYPEBOT_CUSTOMER_IDENTIFIED
TYPEBOT_APPOINTMENT_CREATED
```

Se houver tentativa inválida relevante:

```text
TYPEBOT_APPOINTMENT_REJECTED
```

## Metadata sugerida

```json
{
  "tenantId": "tenant_id",
  "sessionId": "typebot_session_id",
  "customerId": "customer_id",
  "serviceId": "service_id",
  "appointmentId": "appointment_id",
  "origin": "WHATSAPP"
}
```

## Segurança

Não registrar:

```text
senha
hash
tokens
api key
cookies
dados sensíveis desnecessários
```

---

# 13. Appointment events

Criar evento ao criar agendamento:

```text
WHATSAPP_BOOKING_CREATED
```

ou usar `CREATED` com metadata:

```json
{
  "origin": "WHATSAPP",
  "source": "TYPEBOT",
  "sessionId": "typebot_session_id"
}
```

---

# 14. Erros padronizados

Todos endpoints Typebot devem responder JSON.

## Sucesso

```json
{
  "ok": true
}
```

## Erro

```json
{
  "ok": false,
  "code": "ERROR_CODE",
  "message": "Mensagem segura para o cliente."
}
```

## Códigos sugeridos

```text
UNAUTHORIZED
BUSINESS_UNAVAILABLE
SERVICE_NOT_FOUND
SERVICE_UNAVAILABLE
NO_SLOTS_AVAILABLE
CUSTOMER_REQUIRED
SESSION_NOT_FOUND
INVALID_SLOT
SLOT_UNAVAILABLE
CUSTOM_FIELD_REQUIRED
CUSTOM_FIELD_INVALID
APPOINTMENT_NOT_FOUND
VALIDATION_ERROR
INTERNAL_ERROR
```

## Importante

Mensagens de erro públicas não devem revelar:

```text
inadimplência
assinatura vencida
motivo administrativo
dados internos
stack trace
detalhes de banco
```

---

# 15. Documentação

Criar ou atualizar:

```text
/docs/technical/typebot-api.md
```

Documentar:

```text
- variáveis de ambiente
- header x-typebot-api-key
- endpoints
- payloads
- respostas
- exemplos de fluxo conversacional
- como o Typebot deve usar listas numeradas
- regras de segurança
- limitações da fase
```

Também atualizar o README com resumo da Phase 06.

---

# Fora do escopo

Não implementar nesta fase:

```text
integração oficial com WhatsApp Cloud API
disparo ativo de mensagens pelo sistema
webhook de recebimento do WhatsApp
instalação/configuração do Typebot
criação automática de bot
painel visual para configurar bot
tokens por tenant
OAuth
assinatura HMAC por payload
verificação de telefone
área do cliente final
cancelamento pelo cliente via WhatsApp
remarcação pelo cliente via WhatsApp
pagamento
lembretes automáticos
templates funcionais
marketplace
```

---

# Critérios de aceite

* Endpoint `/api/typebot/[tenantSlug]/business` retorna dados públicos do prestador.
* Endpoint `/api/typebot/[tenantSlug]/services` retorna serviços ativos em formato adequado para lista numerada.
* Endpoint `/api/typebot/[tenantSlug]/services/[serviceId]/slots` retorna horários disponíveis.
* Endpoint `/api/typebot/[tenantSlug]/customers/identify` cria ou reutiliza customer por telefone dentro do tenant.
* Endpoint `/api/typebot/[tenantSlug]/appointments` cria agendamento com `origin = WHATSAPP`.
* Endpoint `/api/typebot/[tenantSlug]/appointments/[appointmentId]` retorna dados seguros do agendamento.
* Todos endpoints validam tenant ativo.
* Todos endpoints validam assinatura/plano com WhatsApp habilitado.
* Todos endpoints exigem `x-typebot-api-key` quando `TYPEBOT_API_KEY` estiver configurada.
* Agendamento via Typebot respeita disponibilidade, bloqueios e conflitos.
* Agendamento via Typebot respeita `booking_mode`.
* Agendamento via Typebot salva campos personalizados.
* Agendamento via Typebot cria `appointment_event`.
* Agendamento via Typebot cria audit log.
* `createdByUserId` fica `null` no agendamento Typebot.
* Agendamento manual pelo painel continua funcionando.
* Link público web continua funcionando.
* CUSTOMER continua exigido no link público web.
* Não há duplicação grosseira de regras críticas entre link público e Typebot.
* `/app/appointments` exibe agendamentos de origem WhatsApp.
* Documentação `/docs/technical/typebot-api.md` criada.
* README atualizado.
* `pnpm typecheck`, `pnpm lint`, `pnpm test` e `pnpm build` passam.

---

# Instruções para o DeepSeek

Implemente somente a Phase 06 Typebot API.

Não implemente WhatsApp Cloud API, envio ativo de mensagens, webhook WhatsApp, configuração real do Typebot, painel visual de bot, área do cliente, cancelamento, remarcação, pagamento ou lembretes.

O objetivo é criar a API que o Typebot poderá consumir.

Preserve todas as regras do link público e do painel do prestador.

Ao finalizar, informe:

```text
- arquivos criados
- arquivos alterados
- migrations criadas
- endpoints implementados
- exemplos de request/response
- como testar
- validações executadas
- pendências conhecidas
```
