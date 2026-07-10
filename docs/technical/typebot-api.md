# Typebot API

API pública REST que permite ao Typebot orquestrar o fluxo conversacional de agendamento via WhatsApp.

O Typebot atua apenas como **interface conversacional** — toda regra de negócio, validação, disponibilidade e conflito permanece no backend do AgendaZap.

## Autenticação

A API Typebot utiliza credenciais **por prestador** (tenant). Cada prestador pode
ter múltiplas credenciais ativas, e cada credencial gera um token único.

### Token de credencial (prefixo `agz_tb_`)

Tokens gerados pelo AgendaZap têm o formato:

```
agz_tb_<base64url aleatório>
```

Exemplo: `agz_tb_dGhpcyBpcyBhbiBleGFtcGxlIHRva2VuXzMyYnl0ZXM`

O prefixo `agz_tb_` identifica o token como credencial de tenant. Tokens sem este
prefixo são tratados como chave global (fallback de desenvolvimento).

### Como obter um token

1. Acesse o painel administrativo como Super Admin
2. Navegue até o detalhe do prestador → **Credenciais Typebot**
   (`/admin/tenants/[id]/typebot-credentials`)
3. Gere uma nova credencial com um nome descritivo
4. **Copie o token imediatamente** — ele será exibido apenas uma vez

### Header de autenticação

Todos os endpoints exigem o header:

```http
x-typebot-api-key: agz_tb_seu-token-aqui
```

- Header ausente ou inválido → `401 UNAUTHORIZED`
- O token é validado contra as credenciais ativas do tenant identificado pelo
  `tenantSlug` na URL
- Um token do tenant A **não** autentica requisições para o tenant B
- Credenciais revogadas **não** autenticam

### Fallback com chave global (apenas desenvolvimento)

Em ambiente de desenvolvimento, a variável `TYPEBOT_API_KEY` ainda é aceita como
fallback, mas **apenas para tenants que não possuem nenhuma credencial própria**.
Assim que um tenant gera sua primeira credencial, a chave global deixa de
funcionar para ele.

| Variável | Obrigatória | Descrição |
|---|---|---|
| `TYPEBOT_API_KEY` | Não (legado) | Chave global usada apenas em dev, e apenas para tenants sem credenciais próprias. Em produção, configure credenciais por tenant. |

**Não** utilize sessão de usuário navegador (`agenda-zap-session`) nestes endpoints. A autenticação é exclusivamente pelo header `x-typebot-api-key`.

---

## Endpoints

Base URL: `https://seu-dominio.com/api/typebot/[tenantSlug]`

### 1. Dados do negócio

Retorna informações públicas do prestador para iniciar a conversa.

```http
GET /api/typebot/[tenantSlug]/business
```

**Resposta de sucesso (200):**

```json
{
  "ok": true,
  "tenant": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Mecânica Silva",
    "slug": "mecanica-silva",
    "description": "Serviços automotivos",
    "city": "Panambi",
    "state": "RS",
    "whatsapp": "55999999999"
  }
}
```

**Erro (400):**

```json
{
  "ok": false,
  "code": "BUSINESS_UNAVAILABLE",
  "message": "Este atendimento está temporariamente indisponível."
}
```

---

### 2. Listar serviços

Retorna serviços ativos em formato pronto para lista numerada.

```http
GET /api/typebot/[tenantSlug]/services
```

**Resposta de sucesso (200):**

```json
{
  "ok": true,
  "services": [
    {
      "number": 1,
      "id": "service-uuid",
      "category": "Serviços rápidos",
      "name": "Troca de óleo",
      "description": "Troca de óleo e filtro",
      "durationMinutes": 30,
      "priceText": "A partir de R$ 80,00",
      "bookingMode": "DIRECT"
    }
  ],
  "text": "1 - Troca de óleo | 30 min | A partir de R$ 80,00\n2 - ..."
}
```

Campo `text`: string formatada que o Typebot pode enviar diretamente ao cliente no WhatsApp.

---

### 3. Detalhe do serviço

Retorna dados completos do serviço incluindo campos personalizados ativos, para que o Typebot colete as informações necessárias antes de criar o agendamento.

```http
GET /api/typebot/[tenantSlug]/services/[serviceId]
```

**Resposta de sucesso (200) — sem campos personalizados:**

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

**Resposta de sucesso (200) — com campos personalizados:**

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
      },
      {
        "id": "field-uuid-3",
        "key": "vehicle_year",
        "label": "Ano do veículo",
        "type": "NUMBER",
        "required": false,
        "options": [],
        "order": 3
      }
    ]
  },
  "customFieldsText": "Preciso de mais algumas informações:\n\n1 - Placa do veículo (obrigatório)\n2 - Tipo de problema: Motor, Freio, Suspensão (obrigatório)\n3 - Ano do veículo"
}
```

**Campos (`customFields`):**

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | `string` | UUID do campo personalizado — usar em `customFieldId` no POST de appointment |
| `key` | `string` | Identificador único do campo no serviço |
| `label` | `string` | Rótulo para exibição ao cliente |
| `type` | `string` | `TEXT`, `TEXTAREA`, `NUMBER`, `DATE`, `BOOLEAN` ou `SELECT` |
| `required` | `boolean` | Se o campo é obrigatório |
| `options` | `string[]` | Opções válidas para SELECT (vazio para outros tipos) |
| `order` | `number` | Ordem de exibição (`position` no banco) |

**`customFieldsText`:** texto pronto para o Typebot enviar ao cliente, listando os campos numerados com opções de SELECT e marcador `(obrigatório)`.

**Erro (400):**

```json
{
  "ok": false,
  "code": "SERVICE_NOT_FOUND",
  "message": "Esse serviço não está disponível no momento."
}
```

---

### 4. Horários disponíveis

Retorna slots disponíveis para um serviço.

```http
GET /api/typebot/[tenantSlug]/services/[serviceId]/slots?date=2026-06-29&days=7
```

**Query params:**

| Parâmetro | Tipo | Padrão | Descrição |
|---|---|---|---|
| `date` | `YYYY-MM-DD` | — | Filtrar por data específica |
| `days` | `number` | 7 (máx 14) | Quantos dias à frente buscar |

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
  "text": "1 - 29/06/2026 14:00\n2 - ..."
}
```

**Erro (400):**

```json
{
  "ok": false,
  "code": "NO_SLOTS_AVAILABLE",
  "message": "Nenhum horário disponível para este serviço nos próximos dias."
}
```

---

### 5. Identificar cliente

Cria ou reutiliza um cliente a partir do telefone informado no WhatsApp. Também cria/atualiza a `typebot_session`.

```http
POST /api/typebot/[tenantSlug]/customers/identify
Content-Type: application/json

{
  "phone": "55999999999",
  "name": "João Silva",
  "email": "joao@email.com"
}
```

**Regras:**
- Telefone obrigatório
- Nome obrigatório (mín. 2 caracteres)
- E-mail opcional
- Busca cliente existente por `tenant_id + phone`
- Se existe: atualiza nome/e-mail
- Se não existe: cria novo
- **Não cria usuário CUSTOMER** (apenas customer)

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

---

### 6. Criar agendamento

Cria um agendamento com origem `WHATSAPP`. Valida disponibilidade, bloqueios, conflitos e campos personalizados.

```http
POST /api/typebot/[tenantSlug]/appointments
Content-Type: application/json

{
  "sessionId": "session-uuid",
  "customerId": "customer-uuid",
  "serviceId": "service-uuid",
  "startsAt": "2026-06-29T14:00:00.000Z",
  "customValues": [
    { "customFieldId": "field-uuid", "value": "ABC-1234" }
  ],
  "customerNotes": "Prefere atendimento rápido"
}
```

**Validações realizadas:**
1. API key
2. Tenant ativo com plano/assinatura WhatsApp habilitado
3. Session pertence ao tenant
4. Customer pertence ao tenant
5. Service pertence ao tenant e está ativo (categoria ativa)
6. Campos personalizados obrigatórios
7. SELECT com opções permitidas
8. Disponibilidade (availability_rules)
9. Bloqueios (schedule_blocks)
10. Conflitos (appointments ativos com status bloqueante)
11. Horário no passado

**Regime de booking_mode:**
- `DIRECT` → status `CONFIRMED`
- `REQUIRES_CONFIRMATION` → status `REQUESTED`
- `INFORMATIONAL` → status `WAITING_INFO`

**Campos do agendamento:**
- `origin`: `WHATSAPP`
- `createdByUserId`: `null` (não é usuário interno)
- Eventos: `WHATSAPP_BOOKING_CREATED`
- Auditoria: `TYPEBOT_APPOINTMENT_CREATED`
- Session atualizada: `status = APPOINTMENT_CREATED`

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

---

### 7. Consultar agendamento

Retorna dados do agendamento para confirmação ao cliente.

```http
GET /api/typebot/[tenantSlug]/appointments/[appointmentId]
```

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

---

## Exemplo de fluxo conversacional

Fluxo típico no Typebot:

```
1. Cliente envia "oi" no WhatsApp
2. Typebot chama GET /api/typebot/[slug]/business
   → "Olá! Bem-vindo à Mecânica Silva."
3. Typebot pergunta qual serviço
4. Typebot chama GET /api/typebot/[slug]/services
   → exibe lista numerada
5. Cliente digita "1"
6. Typebot chama GET /api/typebot/[slug]/services/[id]
   → obtém detalhes e campos personalizados
7. Typebot chama GET /api/typebot/[slug]/services/[id]/slots
   → exibe horários numerados
8. Cliente digita "1"
9. Typebot pergunta nome e telefone
10. Typebot chama POST /api/typebot/[slug]/customers/identify
    → identifica/cria cliente, obtém sessionId e customerId
11. Se houver campos personalizados, Typebot pergunta cada campo
12. Typebot chama POST /api/typebot/[slug]/appointments
    → envia sessionId, customerId, serviceId, startsAt, customValues
13. Typebot chama GET /api/typebot/[slug]/appointments/[id]
    → confirma dados ao cliente
14. "Agendamento confirmado! Troca de óleo em 29/06 às 14:00."
```

---

## Listas numeradas

Os endpoints `/services` e `/slots` retornam campo `number` começando em 1 e campo `text` com a lista formatada. O Typebot pode:

1. Exibir `text` diretamente no WhatsApp
2. Mapear a resposta numérica do cliente (`"1"`, `"2"`) para o item correspondente no array
3. Usar o `id` do serviço ou `startsAt` do slot no próximo endpoint

---

## Códigos de erro

| Código | HTTP | Significado |
|---|---|---|
| `UNAUTHORIZED` | 401 | Token ausente, inválido ou revogado |
| `RATE_LIMITED` | 429 | Muitas requisições em curto intervalo |
| `BUSINESS_UNAVAILABLE` | 400 | Prestador indisponível |
| `SERVICE_NOT_FOUND` | 400 | Serviço não encontrado |
| `SERVICE_UNAVAILABLE` | 400 | Serviço indisponível |
| `NO_SLOTS_AVAILABLE` | 400 | Sem horários disponíveis |
| `CUSTOMER_REQUIRED` | 400 | Cliente não encontrado |
| `SESSION_NOT_FOUND` | 400 | Sessão expirada |
| `INVALID_SLOT` | 400 | Horário inválido |
| `SLOT_UNAVAILABLE` | 400 | Horário ocupado/bloqueado |
| `CUSTOM_FIELD_REQUIRED` | 400 | Campo personalizado obrigatório |
| `CUSTOM_FIELD_INVALID` | 400 | Valor inválido em campo personalizado |
| `APPOINTMENT_NOT_FOUND` | 400 | Agendamento não encontrado |
| `VALIDATION_ERROR` | 400 | Payload inválido |
| `INTERNAL_ERROR` | 500 | Erro interno |

**Importante:** Mensagens de erro **nunca** revelam inadimplência, assinatura vencida, stack traces ou dados internos.

---

## Rate limit

Todos os endpoints Typebot possuem rate limit in-memory por janela de 1 minuto:

| Grupo | Limite | Endpoints |
|---|---|---|
| Leitura | 120 req/min | `business`, `services`, `service-detail`, `slots`, `appointment-detail` |
| Escrita | 30 req/min | `identify`, `appointments` |
| Auth falha | 20 req/min | Qualquer chamada sem token válido |

A chave do rate limit combina tenant slug + credencial (ou IP para chamadas não autenticadas) + grupo do endpoint. Tokens completos nunca são usados como chave.

Exceder o limite retorna HTTP 429:

```json
{
  "ok": false,
  "code": "RATE_LIMITED",
  "message": "Muitas tentativas em pouco tempo. Tente novamente em instantes."
}
```

**Limitação atual:** O rate limit é local/in-memory. Em produção com múltiplas instâncias, os limites se aplicam por instância. Para escala horizontal, substituir por Redis ou serviço equivalente.

---

## Health check do tenant

O status da integração Typebot de cada prestador pode ser consultado no painel administrativo em `/admin/tenants/[id]/typebot-credentials`, na seção **Status da integração Typebot**.

O status consolida verificações de:
- Prestador ativo, assinatura ativa, WhatsApp habilitado
- Credencial Typebot ativa, categorias e serviços ativos
- Disponibilidade configurada
- Política de assinatura (status, dias vencidos, canais permitidos)
- Atividade recente (uso de credencial, agendamentos, sessões)

Status possíveis: **READY** (pronto), **WARNING** (atenção), **BLOCKED** (bloqueado).

---

## Segurança

- Todas as consultas são isoladas pelo `tenantSlug` da URL
- Agendamentos só podem ser consultados dentro do tenant proprietário
- Sessões Typebot só podem ser acessadas dentro do tenant proprietário
- `createdByUserId` é sempre `null` — agendamentos Typebot não são atribuídos a usuários internos
- Auditoria registra todos os eventos com `actorType = TYPEBOT`
- Tokens são armazenados como hash SHA-256 — nunca em texto puro
- Tokens completos são exibidos apenas uma vez no momento da geração; após isso, somente o prefixo `agz_tb_` + primeiros caracteres são visíveis
- Tokens de tenant A não autenticam requisições para tenant B
- Credenciais revogadas (`isActive = false`) são rejeitadas
- O motivo de falha de autenticação nunca é revelado — a resposta é sempre `UNAUTHORIZED` genérico
- `lastUsedAt` da credencial é atualizado a cada uso bem-sucedido
- Falhas de autenticação geram auditoria (`TYPEBOT_CREDENTIAL_AUTH_FAILED`)
- Criação e revogação de credenciais geram auditoria (`TYPEBOT_CREDENTIAL_CREATED`, `TYPEBOT_CREDENTIAL_REVOKED`)
- Rate limit excedido gera auditoria (`TYPEBOT_RATE_LIMITED`)
- Falhas de autenticação geram auditoria (`TYPEBOT_AUTH_FAILED`)
- Agendamento Typebot bloqueado por política de assinatura gera auditoria (`SUBSCRIPTION_ENFORCEMENT_BLOCKED_TYPEBOT_APPOINTMENT`)
- Auditoria operacional nunca inclui token, hash, headers ou cookies
- Validação defensiva contra mojibake: campos textuais (`name`, `email`, `customerNotes`, `customValues[].value`) são rejeitados com `VALIDATION_ERROR` se contiverem o caractere de substituição Unicode `U+FFFD` (`�`), indicando que o cliente enviou encoding incorreto

---

## Limitações da fase atual

**Não implementado:**
- Envio ativo de mensagens (WhatsApp Cloud API)
- Webhook de recebimento do WhatsApp
- OAuth / HMAC por payload
- Cancelamento ou remarcação via WhatsApp
- Pagamento
- Lembretes automáticos
- Templates de mensagem
- Painel de configuração do bot
- Expiração automática de credenciais

**Política de assinatura:** Agendamentos Typebot são bloqueados a partir de 8 dias de vencimento da assinatura. A partir de 15 dias, todos os endpoints Typebot retornam `BUSINESS_UNAVAILABLE`. Consulte [`subscription-enforcement.md`](./subscription-enforcement.md).

---

## Encoding e caracteres acentuados

A API espera e retorna **UTF-8**. O `Content-Type` das respostas é `application/json; charset=utf-8`.

**Importante ao testar com PowerShell:** `Invoke-RestMethod` e `Invoke-WebRequest` usam Windows-1252 como encoding padrão, o que corrompe caracteres acentuados como `ã`, `ç`, `é`. O nome "João Silva" enviado com encoding errado chega como "Jo�o Silva" e é **rejeitado** pela validação defensiva com `VALIDATION_ERROR`.

---

## Como testar

### Com curl (bash)

```bash
# 1. Business (com token de credencial do tenant)
curl -H "x-typebot-api-key: agz_tb_SEU_TOKEN_AQUI" \
  http://localhost:3000/api/typebot/seu-slug/business

# 2. Services (lista)
curl -H "x-typebot-api-key: agz_tb_SEU_TOKEN_AQUI" \
  http://localhost:3000/api/typebot/seu-slug/services

# 2b. Service detail (detalhes + campos personalizados)
curl -H "x-typebot-api-key: agz_tb_SEU_TOKEN_AQUI" \
  http://localhost:3000/api/typebot/seu-slug/services/SERVICE_ID

# 3. Slots
curl -H "x-typebot-api-key: agz_tb_SEU_TOKEN_AQUI" \
  "http://localhost:3000/api/typebot/seu-slug/services/SERVICE_ID/slots?days=7"

# 4. Identify customer
curl -X POST http://localhost:3000/api/typebot/seu-slug/customers/identify \
  -H "Content-Type: application/json; charset=utf-8" \
  -H "x-typebot-api-key: agz_tb_SEU_TOKEN_AQUI" \
  -d '{"phone":"55999999999","name":"João Silva"}'

# 5. Create appointment
curl -X POST http://localhost:3000/api/typebot/seu-slug/appointments \
  -H "Content-Type: application/json; charset=utf-8" \
  -H "x-typebot-api-key: agz_tb_SEU_TOKEN_AQUI" \
  -d '{"sessionId":"SESSION_ID","customerId":"CUSTOMER_ID","serviceId":"SERVICE_ID","startsAt":"2026-06-29T14:00:00.000Z"}'

# 6. Query appointment
curl -H "x-typebot-api-key: agz_tb_SEU_TOKEN_AQUI" \
  http://localhost:3000/api/typebot/seu-slug/appointments/APPOINTMENT_ID
```

### Com PowerShell (garantindo UTF-8)

**Opção A — corpo inline (recomendado para testes rápidos):**

```powershell
# GET — sem corpo, encoding da resposta é automático
Invoke-RestMethod -Uri http://localhost:3000/api/typebot/seu-slug/business

# POST com corpo UTF-8 — usar -ContentType explicitamente e
# passar o corpo como bytes UTF-8
$body = '{"phone":"55999999999","name":"João Silva"}'
$bytes = [System.Text.Encoding]::UTF8.GetBytes($body)
Invoke-RestMethod -Uri http://localhost:3000/api/typebot/seu-slug/customers/identify `
  -Method Post `
  -ContentType "application/json; charset=utf-8" `
  -Body $bytes

# Criar agendamento
$body = '{"sessionId":"SESS_UUID","customerId":"CUST_UUID","serviceId":"SVC_UUID","startsAt":"2026-06-29T14:00:00.000Z","customerNotes":"Cliente prefere período da manhã"}'
$bytes = [System.Text.Encoding]::UTF8.GetBytes($body)
Invoke-RestMethod -Uri http://localhost:3000/api/typebot/seu-slug/appointments `
  -Method Post `
  -ContentType "application/json; charset=utf-8" `
  -Body $bytes
```

**Opção B — arquivo temporário UTF-8:**

```powershell
# Criar arquivo JSON com encoding UTF-8 explícito
$body = @{ phone = "55999999999"; name = "João Silva" } | ConvertTo-Json
$body | Out-File -FilePath tmp-body.json -Encoding utf8

# Enviar o arquivo como corpo
$bytes = [System.IO.File]::ReadAllBytes("$PWD\tmp-body.json")
Invoke-RestMethod -Uri http://localhost:3000/api/typebot/seu-slug/customers/identify `
  -Method Post `
  -ContentType "application/json; charset=utf-8" `
  -Body $bytes
```

**O que NÃO fazer no PowerShell (produz mojibake):**

```powershell
# ERRADO: -Body com string sem bytes UTF-8 explícitos
# PowerShell converte a string para Windows-1252, corrompendo acentos
Invoke-RestMethod -Uri ... -Method Post -Body '{"name":"João Silva"}'
```
