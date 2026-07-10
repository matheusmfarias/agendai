# Guia de Teste Manual — Fluxo Typebot

Roteiro para testar a API Typebot (Phase 06) usando curl e validar o fluxo conversacional antes de configurar o Typebot real.

---

## Pré-requisitos

- Aplicação rodando localmente (`pnpm dev` ou `pnpm build && pnpm start`).
- Tenant ativo com:
  - Assinatura vigente
  - Plano com `whatsappEnabled: true`
  - Pelo menos um serviço ativo com categoria ativa
  - `availability_rules` configuradas (pelo menos uma faixa de horário)
  - `publicLinkEnabled` não é necessário para Typebot — apenas `whatsappEnabled`
- (Opcional) `TYPEBOT_API_KEY` configurada no `.env`.

---

## 1. Configurar variáveis de teste

Definir no terminal:

```bash
BASE="http://localhost:3000/api/typebot"
SLUG="slug-do-seu-tenant"
API_KEY="sua-chave-se-estiver-configurada"

# Header de autenticação (se API key configurada)
AUTH_HEADER="-H x-typebot-api-key:$API_KEY"
# Se API key NÃO estiver configurada, deixe vazio:
# AUTH_HEADER=""
```

---

## 2. Testar business

```bash
curl -s $AUTH_HEADER $BASE/$SLUG/business | jq .
```

**Validações:**

- [ ] Status HTTP 200
- [ ] `ok == true`
- [ ] `tenant.name` preenchido
- [ ] `tenant.whatsapp` preenchido
- [ ] `tenant.city` e `tenant.state` preenchidos

**Teste de erro:** usar slug inválido.

```bash
curl -s $AUTH_HEADER $BASE/slug-inexistente/business | jq .
```

- [ ] `ok == false`
- [ ] `code == "BUSINESS_UNAVAILABLE"`

---

## 3. Testar services

```bash
curl -s $AUTH_HEADER $BASE/$SLUG/services | jq .
```

**Validações:**

- [ ] Status HTTP 200
- [ ] `ok == true`
- [ ] `services` é array
- [ ] Cada serviço tem `number` começando em 1
- [ ] Cada serviço tem `id`, `name`, `durationMinutes`, `bookingMode`
- [ ] `text` é string com todos os serviços formatados
- [ ] Serviços inativos ou de categorias inativas **não** aparecem

---

## 4. Testar service detail

```bash
SERVICE_ID=$(curl -s $AUTH_HEADER $BASE/$SLUG/services | jq -r '.services[0].id')

curl -s $AUTH_HEADER $BASE/$SLUG/services/$SERVICE_ID | jq .
```

**Validações:**

- [ ] Status HTTP 200
- [ ] `ok == true`
- [ ] `service.id` é UUID
- [ ] `service.category.id` e `service.category.name` preenchidos
- [ ] `service.name` preenchido
- [ ] `service.durationMinutes > 0`
- [ ] `service.priceType`, `priceText` preenchidos
- [ ] `service.bookingMode` preenchido
- [ ] `service.customFields` é array
- [ ] `customFieldsText` retornado (string vazia ou texto formatado)
- [ ] Campos inativos **não** aparecem em `customFields`
- [ ] Campos SELECT têm `options` com as opções válidas
- [ ] Campos não-SELECT têm `options: []`

**Teste com serviço que tem campos personalizados (se existir):**

```bash
# Buscar um serviço que tenha campos personalizados configurados
curl -s $AUTH_HEADER $BASE/$SLUG/services/$SERVICE_ID | jq '.service.customFields'
```

- [ ] Campos têm `id`, `key`, `label`, `type`, `required`, `options`, `order`
- [ ] Campos ordenados por `order`
- [ ] `customFieldsText` lista os campos numerados
- [ ] Campos obrigatórios marcados com `(obrigatório)` no texto
- [ ] SELECT mostra opções no texto

**Teste service inexistente:**

```bash
curl -s $AUTH_HEADER $BASE/$SLUG/services/00000000-0000-0000-0000-000000000000 | jq .
```

- [ ] `ok == false`
- [ ] `code == "SERVICE_NOT_FOUND"`

**Teste service de outro tenant:**

```bash
curl -s $AUTH_HEADER $BASE/outro-slug/services/$SERVICE_ID | jq .
```

- [ ] `ok == false`
- [ ] `code == "SERVICE_NOT_FOUND"` (não vaza dado entre tenants)

---

## 5. Testar identify

```bash
SERVICE_ID=$(curl -s $AUTH_HEADER $BASE/$SLUG/services | jq -r '.services[0].id')

curl -s -X POST $AUTH_HEADER \
  -H "Content-Type: application/json; charset=utf-8" \
  -d '{"phone":"55999999999","name":"João Silva","email":"joao@teste.com"}' \
  $BASE/$SLUG/customers/identify | jq .
```

**Validações:**

- [ ] Status HTTP 200
- [ ] `ok == true`
- [ ] `customer.id` é UUID
- [ ] `customer.name == "João Silva"`
- [ ] `customer.phone == "55999999999"`
- [ ] `session.id` é UUID
- [ ] `session.status == "IDENTIFIED"`

**Teste sem e-mail:**

```bash
curl -s -X POST $AUTH_HEADER \
  -H "Content-Type: application/json; charset=utf-8" \
  -d '{"phone":"55999999999","name":"João Silva"}' \
  $BASE/$SLUG/customers/identify | jq .
```

- [ ] Funciona sem o campo `email`

**Teste com nome acentuado (UTF-8):**

```bash
curl -s -X POST $AUTH_HEADER \
  -H "Content-Type: application/json; charset=utf-8" \
  -d '{"phone":"55988888888","name":"José Conceição"}' \
  $BASE/$SLUG/customers/identify | jq .
```

- [ ] `customer.name == "José Conceição"` (acentos preservados)

**Teste de mojibake (PowerShell):**

Ver [documentação da API](../technical/typebot-api.md#encoding-e-caracteres-acentuados).

- [ ] Nome com `�` (replacement character) é rejeitado com `VALIDATION_ERROR`

**Teste de validação:**

```bash
curl -s -X POST $AUTH_HEADER \
  -H "Content-Type: application/json; charset=utf-8" \
  -d '{"phone":"123","name":"A"}' \
  $BASE/$SLUG/customers/identify | jq .
```

- [ ] `ok == false`
- [ ] `code == "VALIDATION_ERROR"`

---

## 6. Testar slots

```bash
# Salvar IDs da etapa anterior
CUSTOMER_ID=$(curl -s -X POST $AUTH_HEADER \
  -H "Content-Type: application/json; charset=utf-8" \
  -d '{"phone":"55999999999","name":"João Silva"}' \
  $BASE/$SLUG/customers/identify | jq -r '.customer.id')

SESSION_ID=$(curl -s -X POST $AUTH_HEADER \
  -H "Content-Type: application/json; charset=utf-8" \
  -d '{"phone":"55999999999","name":"João Silva"}' \
  $BASE/$SLUG/customers/identify | jq -r '.session.id')

# Buscar slots
curl -s $AUTH_HEADER "$BASE/$SLUG/services/$SERVICE_ID/slots?days=7" | jq .
```

**Validações:**

- [ ] Status HTTP 200
- [ ] `ok == true`
- [ ] `service.name` preenchido
- [ ] `service.durationMinutes > 0`
- [ ] `slots` é array
- [ ] Cada slot tem `number`, `startsAt`, `endsAt`, `label`
- [ ] `startsAt` é ISO 8601
- [ ] `endsAt - startsAt == service.durationMinutes`
- [ ] `text` é string formatada com todos os slots
- [ ] Slots respeitam `availability_rules`
- [ ] Bloqueios (`schedule_blocks`) removem slots
- [ ] Horários já ocupados por agendamentos ativos não aparecem

**Teste com filtro de data:**

```bash
curl -s $AUTH_HEADER "$BASE/$SLUG/services/$SERVICE_ID/slots?date=2026-07-01&days=3" | jq .
```

- [ ] Retorna apenas slots da data especificada

---

## 7. Testar create appointment

```bash
# Pegar o primeiro slot
SLOT_STARTS_AT=$(curl -s $AUTH_HEADER "$BASE/$SLUG/services/$SERVICE_ID/slots?days=7" | jq -r '.slots[0].startsAt')

curl -s -X POST $AUTH_HEADER \
  -H "Content-Type: application/json; charset=utf-8" \
  -d "{
    \"sessionId\": \"$SESSION_ID\",
    \"customerId\": \"$CUSTOMER_ID\",
    \"serviceId\": \"$SERVICE_ID\",
    \"startsAt\": \"$SLOT_STARTS_AT\"
  }" \
  $BASE/$SLUG/appointments | jq .
```

**Validações:**

- [ ] Status HTTP 201
- [ ] `ok == true`
- [ ] `appointment.id` é UUID
- [ ] `appointment.status` é `CONFIRMED`, `REQUESTED` ou `WAITING_INFO`
- [ ] `appointment.origin == "WHATSAPP"`
- [ ] `appointment.startsAt` igual ao enviado
- [ ] `message` preenchido conforme o `bookingMode`

**Testar booking_mode DIRECT:**

- [ ] Serviço com `bookingMode: DIRECT` → status `CONFIRMED`
- [ ] Mensagem: "Agendamento confirmado com sucesso."

**Testar booking_mode REQUIRES_CONFIRMATION:**

- [ ] Serviço com `bookingMode: REQUIRES_CONFIRMATION` → status `REQUESTED`
- [ ] Mensagem: "Sua solicitação foi enviada e aguarda confirmação do prestador."

**Testar booking_mode INFORMATIONAL:**

- [ ] Serviço com `bookingMode: INFORMATIONAL` → status `WAITING_INFO`
- [ ] Mensagem: "Sua solicitação foi enviada. O prestador entrará em contato..."

**Testar com campos personalizados (se existirem):**

```bash
curl -s -X POST $AUTH_HEADER \
  -H "Content-Type: application/json; charset=utf-8" \
  -d "{
    \"sessionId\": \"$SESSION_ID\",
    \"customerId\": \"$CUSTOMER_ID\",
    \"serviceId\": \"$SERVICE_ID\",
    \"startsAt\": \"$SLOT_STARTS_AT\",
    \"customValues\": [{\"customFieldId\": \"FIELD_UUID\", \"value\": \"ABC-1234\"}]
  }" \
  $BASE/$SLUG/appointments | jq .
```

- [ ] Campos obrigatórios não enviados → `CUSTOM_FIELD_REQUIRED`
- [ ] Campos enviados corretamente → sucesso

**Testar com customerNotes:**

```bash
curl -s -X POST $AUTH_HEADER \
  -H "Content-Type: application/json; charset=utf-8" \
  -d "{
    \"sessionId\": \"$SESSION_ID\",
    \"customerId\": \"$CUSTOMER_ID\",
    \"serviceId\": \"$SERVICE_ID\",
    \"startsAt\": \"$SLOT_STARTS_AT\",
    \"customerNotes\": \"Prefere atendimento rápido\"
  }" \
  $BASE/$SLUG/appointments | jq .
```

- [ ] Agendamento criado com observação

---

## 8. Testar conflito

Tentar agendar o mesmo horário novamente:

```bash
curl -s -X POST $AUTH_HEADER \
  -H "Content-Type: application/json; charset=utf-8" \
  -d "{
    \"sessionId\": \"$SESSION_ID\",
    \"customerId\": \"$CUSTOMER_ID\",
    \"serviceId\": \"$SERVICE_ID\",
    \"startsAt\": \"$SLOT_STARTS_AT\"
  }" \
  $BASE/$SLUG/appointments | jq .
```

- [ ] `ok == false`
- [ ] `code == "SLOT_UNAVAILABLE"`

---

## 9. Testar query appointment

```bash
APPOINTMENT_ID=$(curl -s -X POST $AUTH_HEADER \
  -H "Content-Type: application/json; charset=utf-8" \
  -d "..." \
  $BASE/$SLUG/appointments | jq -r '.appointment.id')

curl -s $AUTH_HEADER $BASE/$SLUG/appointments/$APPOINTMENT_ID | jq .
```

**Validações:**

- [ ] Status HTTP 200
- [ ] `ok == true`
- [ ] `appointment.id` igual ao criado
- [ ] `appointment.serviceName` preenchido
- [ ] `appointment.customerName` preenchido
- [ ] `appointment.origin == "WHATSAPP"`

**Teste com appointment de outro tenant:**

```bash
curl -s $AUTH_HEADER $BASE/outro-slug/appointments/$APPOINTMENT_ID | jq .
```

- [ ] `ok == false`
- [ ] `code == "APPOINTMENT_NOT_FOUND"` (não vaza que existe em outro tenant)

---

## 10. Testar auditoria

Como Super Admin, acessar `/admin/audit-logs` e verificar:

- [ ] Evento `TYPEBOT_CUSTOMER_IDENTIFIED` registrado
- [ ] Evento `TYPEBOT_APPOINTMENT_CREATED` registrado
- [ ] `actorType == "TYPEBOT"` nos eventos
- [ ] Metadata contém `tenantId`, `customerId`, `sessionId`, `origin: WHATSAPP`

---

## 11. Testar sessão Typebot

- [ ] Primeira chamada a `POST /identify` com telefone novo → cria `typebot_session` com status `IDENTIFIED`
- [ ] Segunda chamada com mesmo telefone → reutiliza a sessão existente, atualiza status
- [ ] Após criar agendamento → sessão atualizada para `APPOINTMENT_CREATED`

---

## 12. Testar segurança

### API key ausente (se `TYPEBOT_API_KEY` configurada)

```bash
curl -s $BASE/$SLUG/business | jq .
```

- [ ] `ok == false`
- [ ] `code == "UNAUTHORIZED"`
- [ ] Status HTTP 401

### API key inválida

```bash
curl -s -H "x-typebot-api-key: chave-errada" $BASE/$SLUG/business | jq .
```

- [ ] `ok == false`
- [ ] `code == "UNAUTHORIZED"`

### Isolamento entre tenants

```bash
# Criar agendamento no tenant A
# Tentar consultar usando tenant B
curl -s $AUTH_HEADER $BASE/slug-outro-tenant/appointments/$APPOINTMENT_ID | jq .
```

- [ ] `APPOINTMENT_NOT_FOUND` (sem vazamento de dados)

---

## 13. Testar validação UTC/Timezone

Os slots retornados devem estar no timezone de São Paulo:

- [ ] Labels exibem data/hora no horário de Brasília
- [ ] `startsAt` em ISO 8601 UTC
- [ ] `endsAt` em ISO 8601 UTC

---

## Checklist final

- [ ] `GET /business` → 200 com dados do tenant
- [ ] `GET /services` → 200 com lista numerada
- [ ] `GET /services/:id` → 200 com detalhes + campos personalizados
- [ ] `POST /identify` → 200 com customer + session
- [ ] `POST /identify` com acentos → nomes preservados (UTF-8)
- [ ] `POST /identify` com mojibake → `VALIDATION_ERROR`
- [ ] `GET /slots` → 200 com horários disponíveis
- [ ] `POST /appointments` → 201 com status conforme bookingMode
- [ ] `POST /appointments` mesmo horário → `SLOT_UNAVAILABLE`
- [ ] `GET /appointments/:id` → 200 com dados completos
- [ ] `UNAUTHORIZED` quando API key errada
- [ ] `BUSINESS_UNAVAILABLE` para tenant inválido
- [ ] Isolamento entre tenants
- [ ] Auditoria registrada
- [ ] Sessão Typebot atualizada

---

## Referências

- [Documentação da API Typebot](../technical/typebot-api.md)
- [Fluxo conversacional](./flow-blueprint.md)
- [Chamadas HTTP](./http-requests.md)
- [Tratamento de erros](./error-handling.md)
