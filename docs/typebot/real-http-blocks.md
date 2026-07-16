# Blocos HTTP — Typebot Real

> **Documento histórico.** Os blocos canônicos já estão em
> [`agendai-mvp.typebot.json`](./agendai-mvp.typebot.json). Para contratos e
> exemplos atuais, use o [guia de importação](./real-setup-guide.md) e
> [`typebot-api.md`](../technical/typebot-api.md).

Cada bloco HTTP que deve ser configurado no Typebot para chamar a API do
AgendaZap. Este documento complementa [http-requests.md](./http-requests.md)
com o formato prático de configuração no editor do Typebot.

---

## Configuração comum a todos os blocos

### Headers fixos

Configure na seção **Headers** de cada bloco HTTP:

```
x-typebot-api-key: {{typebotApiKey}}
```

O valor de `{{typebotApiKey}}` é o token da credencial do tenant, gerado no painel
administrativo em `/admin/tenants/[id]/typebot-credentials`. O token tem o prefixo
`agz_tb_` e é exibido apenas uma vez — copie-o no momento da geração.

Para blocos `POST`, adicione também:

```
Content-Type: application/json; charset=utf-8
```

### Tratamento de erro

Todo bloco HTTP deve ter um branch de erro. Configure na seção **On error**
do bloco:

- Salvar `lastErrorCode` e `lastErrorMessage` da resposta
- Redirecionar para o bloco de tratamento correspondente
- Ver [error-handling.md](./error-handling.md) para a mensagem de cada código

---

## 1. Business

**Nome do bloco:** `HTTP - Business`

```
Método:  GET
URL:     {{apiBaseUrl}}/api/typebot/{{tenantSlug}}/business
Headers: x-typebot-api-key: {{typebotApiKey}}
Body:    (não enviar)
```

**Variáveis a salvar (na seção "Save response"):**

| Caminho da resposta | Variável Typebot |
|---|---|
| `ok` | `_ok` (temporária, para verificação) |
| `tenant.name` | `tenantName` |
| `tenant.whatsapp` | `tenantWhatsapp` |
| `tenant.city` | `tenantCity` |
| `tenant.state` | `tenantState` |

**Resposta de sucesso (200):**

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

**Erro esperado:**

```
{ "ok": false, "code": "BUSINESS_UNAVAILABLE", "message": "..." }
```

**Ação no erro:** Exibir mensagem genérica: _"Este atendimento está
temporariamente indisponível."_ Encerrar fluxo ou redirecionar para
atendimento humano.

---

## 2. Identify Customer

**Nome do bloco:** `HTTP - Identify`

```
Método:  POST
URL:     {{apiBaseUrl}}/api/typebot/{{tenantSlug}}/customers/identify
Headers: x-typebot-api-key: {{typebotApiKey}}
         Content-Type: application/json; charset=utf-8
Body:    JSON
```

**Body (JSON):**

```json
{
  "phone": "{{customerPhone}}",
  "name": "{{customerName}}"
}
```

Se `customerEmail` tiver valor, incluir:

```json
{
  "phone": "{{customerPhone}}",
  "name": "{{customerName}}",
  "email": "{{customerEmail}}"
}
```

**Variáveis a salvar:**

| Caminho da resposta | Variável Typebot |
|---|---|
| `customer.id` | `customerId` |
| `session.id` | `sessionId` |

**Resposta de sucesso (200):**

```json
{
  "ok": true,
  "customer": {
    "id": "customer-uuid",
    "name": "João Silva",
    "phone": "55999999999",
    "email": "joao@email.com"
  },
  "session": {
    "id": "session-uuid",
    "status": "IDENTIFIED"
  }
}
```

**Erros esperados:**

- `VALIDATION_ERROR` — telefone ou nome inválido. Voltar para captura.
- `BUSINESS_UNAVAILABLE` — tenant indisponível.

---

## 3. Services

**Nome do bloco:** `HTTP - Services`

```
Método:  GET
URL:     {{apiBaseUrl}}/api/typebot/{{tenantSlug}}/services
Headers: x-typebot-api-key: {{typebotApiKey}}
Body:    (não enviar)
```

**Variáveis a salvar:**

| Caminho da resposta | Variável Typebot |
|---|---|
| `services` | `servicesJson` |
| `text` | `servicesText` |

**Resposta de sucesso (200):**

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
    }
  ],
  "text": "1 - Troca de óleo | 30 min | A partir de R$ 80,00"
}
```

**Erro esperado:**

```
{ "ok": false, "code": "BUSINESS_UNAVAILABLE", "message": "..." }
```

---

## 4. Service Detail

**Nome do bloco:** `HTTP - Service Detail`

```
Método:  GET
URL:     {{apiBaseUrl}}/api/typebot/{{tenantSlug}}/services/{{selectedServiceId}}
Headers: x-typebot-api-key: {{typebotApiKey}}
Body:    (não enviar)
```

**Variáveis a salvar:**

| Caminho da resposta | Variável Typebot |
|---|---|
| `service` | `selectedServiceDetailsJson` |
| `service.customFields` | `customFieldsJson` |
| `customFieldsText` | `customFieldsText` |

**Resposta de sucesso (200) — sem campos personalizados:**

```json
{
  "ok": true,
  "service": {
    "id": "service-uuid",
    "category": { "id": "category-uuid", "name": "Serviços rápidos" },
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

**Resposta de sucesso (200) — com campos personalizados:**

```json
{
  "ok": true,
  "service": {
    ...,
    "customFields": [
      {
        "id": "field-uuid-1",
        "key": "vehicle_plate",
        "label": "Placa do veículo",
        "type": "TEXT",
        "required": true,
        "options": [],
        "order": 1
      }
    ]
  },
  "customFieldsText": "Preciso de mais algumas informações:\n\n1 - Placa do veículo (obrigatório)"
}
```

**Erros esperados:**

- `SERVICE_NOT_FOUND` — serviço foi removido/desativado. Voltar para lista.
- `BUSINESS_UNAVAILABLE` — tenant indisponível.

---

## 5. Slots

**Nome do bloco:** `HTTP - Slots`

```
Método:  GET
URL:     {{apiBaseUrl}}/api/typebot/{{tenantSlug}}/services/{{selectedServiceId}}/slots?days=7
Headers: x-typebot-api-key: {{typebotApiKey}}
Body:    (não enviar)
```

**Variáveis a salvar:**

| Caminho da resposta | Variável Typebot |
|---|---|
| `slots` | `slotsJson` |
| `text` | `slotsText` |

**Resposta de sucesso (200):**

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
    }
  ],
  "text": "1 - 29/06/2026 14:00"
}
```

**Erros esperados:**

- `SERVICE_NOT_FOUND` — serviço indisponível.
- `NO_SLOTS_AVAILABLE` — sem horários. Exibir mensagem e oferecer alternativa.
- `BUSINESS_UNAVAILABLE` — tenant indisponível.

---

## 6. Create Appointment

**Nome do bloco:** `HTTP - Create Appointment`

```
Método:  POST
URL:     {{apiBaseUrl}}/api/typebot/{{tenantSlug}}/appointments
Headers: x-typebot-api-key: {{typebotApiKey}}
         Content-Type: application/json; charset=utf-8
Body:    JSON
```

**Body (JSON):**

```json
{
  "sessionId": "{{sessionId}}",
  "customerId": "{{customerId}}",
  "serviceId": "{{selectedServiceId}}",
  "startsAt": "{{selectedSlotStartsAt}}",
  "customValues": {{customValuesJson}},
  "customerNotes": "{{customerNotes}}"
}
```

**Variáveis a salvar:**

| Caminho da resposta | Variável Typebot |
|---|---|
| `appointment.id` | `appointmentId` |
| `appointment.status` | `appointmentStatus` |
| `message` | `appointmentMessage` |

**Resposta de sucesso (201):**

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

**Erros esperados:**

- `INVALID_SLOT` — horário no passado. Voltar para slots.
- `SLOT_UNAVAILABLE` — horário acabou de ser ocupado. Voltar para slots.
- `CUSTOM_FIELD_REQUIRED` — campo obrigatório não enviado. Voltar para coleta.
- `CUSTOM_FIELD_INVALID` — valor de campo inválido. Voltar para coleta.
- `SESSION_NOT_FOUND` — sessão expirada. Reiniciar fluxo.
- `CUSTOMER_REQUIRED` — cliente não identificado. Voltar para identify.
- `VALIDATION_ERROR` — dados inválidos.
- `BUSINESS_UNAVAILABLE` — tenant indisponível.

---

## 7. Query Appointment (opcional)

**Nome do bloco:** `HTTP - Query Appointment`

```
Método:  GET
URL:     {{apiBaseUrl}}/api/typebot/{{tenantSlug}}/appointments/{{appointmentId}}
Headers: x-typebot-api-key: {{typebotApiKey}}
Body:    (não enviar)
```

**Variáveis a salvar:**

| Caminho da resposta | Variável Typebot |
|---|---|
| `appointment` | `appointmentJson` |

**Resposta de sucesso (200):**

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

**Quando usar:** após `POST /appointments`, para exibir o resumo final com
dados completos (nome do serviço, preço, etc.). Opcional — o `message` do
POST já contém a confirmação principal.

---

## Tratamento genérico de erros HTTP

Além dos códigos de erro da API, o Typebot deve tratar falhas de rede:

| Situação | Ação |
|---|---|
| Timeout / sem resposta | "Não consegui processar agora. Tente novamente em alguns instantes." |
| Status 5xx | "Tive um problema ao processar sua solicitação. Tente novamente em alguns instantes." |
| Status 401 (`UNAUTHORIZED`) | Erro de configuração (API key). Não expor ao cliente. |
| Resposta malformada | "Tive um problema ao processar sua solicitação. Tente novamente em alguns instantes." |

---

## Referências

- [Guia principal](./real-setup-guide.md)
- [Variáveis e mapeamento](./real-variable-mapping.md)
- [Passo a passo dos blocos](./real-flow-steps.md)
- [Chamadas HTTP (referência técnica)](./http-requests.md)
- [Tratamento de erros](./error-handling.md)
