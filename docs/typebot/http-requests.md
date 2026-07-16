# Chamadas HTTP do Typebot

Cada chamada REST que o Typebot deve fazer ao Agendaí durante o fluxo conversacional.

**Pré-requisito:** variáveis `apiBaseUrl`, `tenantSlug` e `typebotApiKey` configuradas. Ver [variables.md](./variables.md).

**Header comum a todas as requisições:**

```http
x-typebot-api-key: {{typebotApiKey}}
```

Para `POST`, adicionar também:

```http
Content-Type: application/json; charset=utf-8
```

---

## 1. Buscar dados do negócio

Obtém nome, WhatsApp e localização do prestador para personalizar a conversa.

```http
GET {{apiBaseUrl}}/api/typebot/{{tenantSlug}}/business
x-typebot-api-key: {{typebotApiKey}}
```

**Quando chamar:** no início da conversa (primeira mensagem do cliente).

**Resposta esperada (200):**

```json
{
  "ok": true,
  "tenant": {
    "id": "550e8400-...",
    "name": "Mecânica Silva",
    "slug": "mecanica-silva",
    "description": "Serviços automotivos",
    "city": "Panambi",
    "state": "RS",
    "whatsapp": "55999999999"
  }
}
```

**Variáveis para salvar:**

| Campo da resposta | Variável Typebot |
|---|---|
| `tenant.name` | `tenantName` |
| `tenant.whatsapp` | `tenantWhatsapp` |
| `tenant.city` | `tenantCity` |
| `tenant.state` | `tenantState` |

**Se erro (`BUSINESS_UNAVAILABLE`):** exibir mensagem genérica de indisponibilidade. Ver [error-handling.md](./error-handling.md).

---

## 2. Identificar cliente

A identificação é deliberadamente dividida em lookup, confirmação e criação.
Conhecer o telefone não autoriza vincular um cadastro sem a confirmação do cliente.

```http
POST {{apiBaseUrl}}/api/typebot/{{tenantSlug}}/customers/identify
x-typebot-api-key: {{typebotApiKey}}
Content-Type: application/json; charset=utf-8

{ "action": "LOOKUP", "phone": "{{phone}}" }
```

O lookup retorna `lookup.status` (`FOUND`, `NOT_FOUND` ou `AMBIGUOUS`) e
`session.id`. Para confirmar o único candidato apresentado:

```json
{ "action": "CONFIRM", "sessionId": "{{sessionId}}" }
```

Quando não houver candidato ou o cliente escolher “Não sou eu”:

```json
{
  "action": "CREATE",
  "sessionId": "{{sessionId}}",
  "name": "{{customerName}}",
  "rejectedExisting": true
}
```

`rejectedExisting` é obrigatório no caminho que rejeita um cadastro apresentado.
A API reutiliza um cadastro de mesmo telefone e nome quando a correspondência é
inequívoca; não mescla registros ambíguos.

**Resposta do LOOKUP (200):**

```json
{
  "ok": true,
  "lookup": {
    "status": "FOUND",
    "customerName": "João Silva",
    "requiresConfirmation": true,
    "requiresName": false
  },
  "session": {
    "id": "session-uuid",
    "status": "STARTED"
  }
}
```

**Variáveis para salvar:**

| Campo da resposta | Variável Typebot |
|---|---|
| `lookup.status` | `customerLookupStatus` |
| `lookup.customerName` | `matchedCustomerName` |
| `session.id` | `sessionId` |

`CONFIRM` e `CREATE` retornam `customer.id`, `customer.name` e `session.id`.
Erros de validação não devem ser tratados como `NOT_FOUND`.

---

## 3. Listar serviços

Retorna serviços ativos do prestador em formato de lista numerada.

```http
GET {{apiBaseUrl}}/api/typebot/{{tenantSlug}}/services
x-typebot-api-key: {{typebotApiKey}}
```

**Quando chamar:** após identificar o cliente.

**Resposta esperada (200):**

```json
{
  "ok": true,
  "services": [
    {
      "number": 1,
      "id": "service-uuid-1",
      "category": "Serviços rápidos",
      "name": "Troca de óleo",
      "description": "Troca de óleo e filtro",
      "durationMinutes": 30,
      "priceText": "A partir de R$ 80,00",
      "bookingMode": "DIRECT"
    },
    {
      "number": 2,
      "id": "service-uuid-2",
      "category": "Serviços rápidos",
      "name": "Alinhamento",
      "description": "Alinhamento e balanceamento",
      "durationMinutes": 60,
      "priceText": "R$ 120,00",
      "bookingMode": "DIRECT"
    }
  ],
  "text": "1 - Troca de óleo | 30 min | A partir de R$ 80,00\n2 - Alinhamento | 60 min | R$ 120,00"
}
```

**Variáveis para salvar:**

| Campo da resposta | Variável Typebot | Uso |
|---|---|---|
| `services` (array) | `servicesJson` | Mapeamento de número → ID |
| `text` | `servicesText` | Exibição direta ao cliente |

**Exibir ao cliente:**

```
Escolha um serviço digitando o número:

{{servicesText}}
```

---

## 3b. Detalhe do serviço

Obtém dados completos do serviço selecionado, incluindo campos personalizados que precisam ser coletados antes do agendamento.

```http
GET {{apiBaseUrl}}/api/typebot/{{tenantSlug}}/services/{{selectedServiceId}}
x-typebot-api-key: {{typebotApiKey}}
```

**Quando chamar:** após o cliente escolher um serviço por número e antes de buscar horários.

**Resposta esperada (200) — sem campos personalizados:**

```json
{
  "ok": true,
  "service": {
    "id": "service-uuid",
    "category": {
      "id": "category-uuid",
      "name": "Serviços rápidos"
    },
    "name": "Troca de óleo",
    "description": "Troca de óleo e filtro",
    "durationMinutes": 30,
    "priceType": "STARTING_AT",
    "priceValue": "80.00",
    "priceText": "A partir de R$ 80,00",
    "bookingMode": "DIRECT",
    "customFields": []
  },
  "customFieldsText": ""
}
```

**Resposta esperada (200) — com campos personalizados:**

```json
{
  "ok": true,
  "service": {
    "id": "service-uuid",
    "category": {
      "id": "category-uuid",
      "name": "Serviços automotivos"
    },
    "name": "Diagnóstico",
    "description": "Avaliação inicial do veículo",
    "durationMinutes": 60,
    "priceType": "ON_REQUEST",
    "priceValue": null,
    "priceText": "Sob avaliação",
    "bookingMode": "REQUIRES_CONFIRMATION",
    "customFields": [
      {
        "id": "field-uuid-1",
        "key": "vehicle_plate",
        "label": "Placa do veículo",
        "type": "TEXT",
        "required": true,
        "options": [],
        "order": 1
      },
      {
        "id": "field-uuid-2",
        "key": "problem_type",
        "label": "Tipo de problema",
        "type": "SELECT",
        "required": true,
        "options": ["Motor", "Freio", "Suspensão"],
        "order": 2
      }
    ]
  },
  "customFieldsText": "Preciso de mais algumas informações:\n\n1 - Placa do veículo (obrigatório)\n2 - Tipo de problema: Motor, Freio, Suspensão (obrigatório)"
}
```

**Variáveis para salvar:**

| Campo da resposta | Variável Typebot | Uso |
|---|---|---|
| `service` (objeto) | `selectedServiceDetailsJson` | Dados completos do serviço |
| `service.customFields` | `customFieldsJson` | Array de campos a coletar |
| `customFieldsText` | `customFieldsText` | Texto pronto para perguntar ao cliente |

**Exibir ao cliente:**

```
Você escolheu: *{{selectedServiceDetailsJson.name}}*

Duração: {{selectedServiceDetailsJson.durationMinutes}} minutos
Valor: {{selectedServiceDetailsJson.priceText}}

{{#if customFieldsText}}{{customFieldsText}}{{/if}}
```

**Montagem de customValues:**

Após o cliente responder cada campo, o Typebot deve montar o array no formato:

```json
[
  { "customFieldId": "field-uuid-1", "value": "ABC-1234" },
  { "customFieldId": "field-uuid-2", "value": "Motor" }
]
```

Onde `customFieldId` é o `id` do campo em `customFields` e `value` é a resposta do cliente.

**Se erro (`SERVICE_NOT_FOUND`):** serviço não está mais disponível. Ver [error-handling.md](./error-handling.md).

---

## 4. Buscar horários disponíveis

Retorna slots disponíveis para um serviço específico.

```http
GET {{apiBaseUrl}}/api/typebot/{{tenantSlug}}/services/{{selectedServiceId}}/slots?days=7
x-typebot-api-key: {{typebotApiKey}}
```

**Quando chamar:** após o cliente escolher um serviço.

**Query params:**

| Parâmetro | Tipo | Padrão | Descrição |
|---|---|---|---|
| `date` | `YYYY-MM-DD` | — | Filtrar por data específica (opcional) |
| `days` | `number` | 7 (máx 14) | Quantos dias à frente buscar |

**Resposta esperada (200):**

```json
{
  "ok": true,
  "service": {
    "id": "service-uuid",
    "name": "Troca de óleo",
    "durationMinutes": 30
  },
  "slots": [
    {
      "number": 1,
      "startsAt": "2026-06-29T14:00:00.000Z",
      "endsAt": "2026-06-29T14:30:00.000Z",
      "label": "29/06/2026 14:00"
    },
    {
      "number": 2,
      "startsAt": "2026-06-29T15:00:00.000Z",
      "endsAt": "2026-06-29T15:30:00.000Z",
      "label": "29/06/2026 15:00"
    }
  ],
  "text": "1 - 29/06/2026 14:00\n2 - 29/06/2026 15:00"
}
```

**Variáveis para salvar:**

| Campo da resposta | Variável Typebot | Uso |
|---|---|---|
| `slots` (array) | `slotsJson` | Mapeamento de número → startsAt |
| `text` | `slotsText` | Exibição direta ao cliente |

**Exibir ao cliente:**

```
Estes são os próximos horários disponíveis:

{{slotsText}}

Digite o número do horário desejado.
```

**Se não houver horários (`NO_SLOTS_AVAILABLE`):**

```
Não encontrei horários disponíveis para esse serviço nos próximos dias.

Você pode tentar outro serviço ou falar com o atendimento.
```

---

## 5. Criar agendamento

Cria o agendamento no Agendaí com todas as validações de negócio.

```http
POST {{apiBaseUrl}}/api/typebot/{{tenantSlug}}/appointments
x-typebot-api-key: {{typebotApiKey}}
Content-Type: application/json; charset=utf-8

{
  "sessionId": "{{sessionId}}",
  "customerId": "{{customerId}}",
  "serviceId": "{{selectedServiceId}}",
  "startsAt": "{{selectedSlotStartsAt}}",
  "customValues": {{customValuesJson}},
  "customerNotes": "{{customerNotes}}"
}
```

**Quando chamar:** após o cliente confirmar o resumo do agendamento.

**Body:**

| Campo | Obrigatório | Descrição |
|---|---|---|
| `sessionId` | Sim | UUID da sessão |
| `customerId` | Sim | UUID do cliente |
| `serviceId` | Sim | UUID do serviço |
| `startsAt` | Sim | ISO 8601 do horário (valor exato retornado pela API de slots) |
| `customValues` | Não | Array de campos personalizados (padrão: `[]`) |
| `customerNotes` | Não | Observações do cliente (máx 2000 caracteres) |

**Resposta esperada (201):**

```json
{
  "ok": true,
  "appointment": {
    "id": "appointment-uuid",
    "status": "CONFIRMED",
    "origin": "WHATSAPP",
    "startsAt": "2026-06-29T14:00:00.000Z",
    "endsAt": "2026-06-29T14:30:00.000Z"
  },
  "message": "Agendamento confirmado com sucesso."
}
```

**Variáveis para salvar:**

| Campo da resposta | Variável Typebot |
|---|---|
| `appointment.id` | `appointmentId` |
| `appointment.status` | `appointmentStatus` |
| `message` | `appointmentMessage` |

**Exibir ao cliente:**

```
{{appointmentMessage}}
```

**Erros comuns (tabela completa em [error-handling.md](./error-handling.md)):**
- `INVALID_SLOT` — horário no passado
- `SLOT_UNAVAILABLE` — horário acabou de ser ocupado
- `CUSTOM_FIELD_REQUIRED` — campo personalizado obrigatório não enviado
- `SESSION_NOT_FOUND` — sessão expirada

---

## 6. Consultar agendamento (confirmação final)

Obtém dados completos do agendamento para exibir resumo final ao cliente.

```http
GET {{apiBaseUrl}}/api/typebot/{{tenantSlug}}/appointments/{{appointmentId}}
x-typebot-api-key: {{typebotApiKey}}
```

**Quando chamar:** após criar o agendamento, para montar a mensagem final com dados completos.

**Resposta esperada (200):**

```json
{
  "ok": true,
  "appointment": {
    "id": "appointment-uuid",
    "status": "CONFIRMED",
    "origin": "WHATSAPP",
    "serviceName": "Troca de óleo",
    "customerName": "João Silva",
    "startsAt": "2026-06-29T14:00:00.000Z",
    "endsAt": "2026-06-29T14:30:00.000Z",
    "priceText": "A partir de R$ 80,00"
  }
}
```

**Exibir ao cliente (confirmado):**

```
Agendamento confirmado com sucesso!

Serviço: {{appointment.serviceName}}
Data e horário: {{selectedSlotLabel}}
Valor: {{appointment.priceText}}
```

**Exibir ao cliente (solicitado):**

```
Sua solicitação foi enviada e aguarda confirmação do prestador.

Serviço: {{appointment.serviceName}}
Data e horário solicitado: {{selectedSlotLabel}}
```

---

## Tratamento genérico de erros HTTP

Além dos códigos de erro de negócio, o Typebot deve tratar:

| Situação | Ação |
|---|---|
| Timeout / sem resposta | "Não consegui processar agora. Tente novamente em alguns instantes." |
| Status 5xx | "Tive um problema ao processar sua solicitação. Tente novamente em alguns instantes." |
| Status 401 (`UNAUTHORIZED`) | Erro de configuração — não expor ao cliente. Logar internamente. |
| Resposta malformada / não-JSON | "Tive um problema ao processar sua solicitação. Tente novamente em alguns instantes." |

---

## Referências

- [Variáveis do Typebot](./variables.md)
- [Tratamento de erros](./error-handling.md)
- [Mensagens ao cliente](./messages.md)
- [Documentação da API Typebot](../technical/typebot-api.md)
