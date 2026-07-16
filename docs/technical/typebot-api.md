# Typebot API

API pública REST que permite ao Typebot orquestrar o fluxo conversacional de agendamento via WhatsApp.

## Identificação segura do cliente

`POST /api/typebot/:tenantSlug/customers/identify` opera em três fases:

- `{"action":"LOOKUP","phone":"{{customerPhone}}"}` normaliza o telefone,
  procura somente no tenant resolvido pelo slug e cria ou reutiliza a sessão;
- `{"action":"CONFIRM","sessionId":"..."}` vincula à sessão apenas o único
  cadastro apresentado pelo lookup;
- `{"action":"CREATE","sessionId":"...","name":"...","rejectedExisting":true}`
  cria um cadastro quando não houve correspondência ou o cliente respondeu
  “Não sou eu”. Quando o lookup foi `FOUND`, a indicação explícita é obrigatória.

O formato canônico é o número nacional brasileiro (`DDD + número`, 10 ou 11
dígitos). Pontuação, espaços, `+` e o código `55` não alteram a comparação. Se
mais de um Customer resultar no mesmo telefone, a API apresenta somente um
candidato: primeiro o usado no agendamento criado mais recentemente; se nenhum
tiver agendamento, o atualizado mais recentemente. A multiplicidade nunca é
exposta. Após “Não sou eu”, o nome normalizado é comparado com todos os registros
do telefone: match único é reutilizado, ausência cria um Customer e ambiguidade
residual falha de forma segura, sem escolha arbitrária ou mesclagem.

## Intenção, categorias e atendimento

O blueprint começa com “Como podemos ajudar?”. A opção de agendamento consulta
`GET /api/typebot/:tenantSlug/categories`, que retorna somente categorias ativas
com pelo menos um serviço ativo. Em seguida,
`GET /api/typebot/:tenantSlug/services?categoryId=UUID` retorna somente os
serviços ativos daquela categoria e tenant.

“Falar com atendente” é terminal: define `handoffRequested` e informa que o
estabelecimento continuará no mesmo canal. Não cria agendamento. No canal Evolution,
o gateway persiste a pausa somente para a conversa `tenant + WhatsApp + telefone`.
Enquanto houver mensagens com intervalos menores que 30 minutos, elas não avançam
o bot. Após 30 minutos sem atividade, a próxima mensagem inicia um novo `startChat`;
24 horas permanecem apenas como teto absoluto. `menu` e `reiniciar` continuam como
atalhos explícitos. “Encerrar atendimento” finaliza a sessão
local, limpa as opções pendentes e permite que qualquer mensagem posterior inicie
uma nova sessão. Sessões automáticas sem atividade por 30 minutos também são
encerradas antes de um novo `startChat`.

No canal WhatsApp, `customerPhone` deve receber a variável de sistema `{{phone}}`
antes do grupo de identificação. O input de telefone permanece apenas como
fallback do Preview web.

## Turnos disponíveis

`GET /api/typebot/:tenantSlug/services/:serviceId/available-periods?date=YYYY-MM-DD`
retorna somente turnos que possuem slots reais:

```json
{
  "ok": true,
  "periods": [
    { "value": "MORNING", "label": "Manhã", "slotCount": 6 },
    { "value": "AFTERNOON", "label": "Tarde", "slotCount": 7 }
  ]
}
```

Os limites no timezone do tenant são: `MORNING` antes de 12:00,
`AFTERNOON` entre 12:00 e 17:59 e `EVENING` a partir de 18:00. O endpoint de
slots aceita `period=MORNING|AFTERNOON|EVENING`; a classificação sempre ocorre
no backend sobre os mesmos slots do booking core.

O Typebot atua apenas como **interface conversacional** — toda regra de negócio, validação, disponibilidade e conflito permanece no backend do Agendaí.

A criação usa o mesmo núcleo de agendamento externo do link público
(`booking-core/external-appointment-service`). Esse núcleo resolve o modo de
confirmação, valida campos personalizados, aplica disponibilidade e conflitos,
persiste o agendamento e solicita a outbox transacional do módulo WhatsApp. O
Typebot não monta nem envia `APPOINTMENT_REQUESTED` ou
`APPOINTMENT_CONFIRMED`.

O canal lógico da chamada é `TYPEBOT`. Por compatibilidade com o enum e com os
registros existentes, a origem persistida continua sendo `WHATSAPP`; eventos e
auditoria registram `source = TYPEBOT`. Uma repetição do POST depois que a mesma
sessão já gravou `lastAppointmentId` devolve o agendamento existente, sem criar
outra outbox.

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

No canal Evolution, o Agendaí inicia o bot por chamada servidor a servidor e
preenche `apiBaseUrl`, `tenantSlug`, `typebotApiKey` e `phone` em
`prefilledVariables`. Novas credenciais mantêm o SHA-256 para validação e uma
versão AES-256-GCM cifrada com `TYPEBOT_CREDENTIAL_ENCRYPTION_KEY` ou, na ausência
dela, com uma chave separada derivada de `AUTH_SECRET`, para essa injeção.
Credenciais anteriores sem versão cifrada continuam válidas nos endpoints,
mas não podem iniciar o canal e devem ser rotacionadas. A continuação usa somente o
`sessionId` do Typebot, que preserva as variáveis da sessão.

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

Retorna serviços ativos da categoria selecionada em formato pronto para lista
numerada. O parâmetro `categoryId` é validado como UUID e combinado com o tenant
resolvido pelo slug.

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

O endpoint dedicado usado pelo blueprint após a escolha do horário é:

```http
GET /api/typebot/[tenantSlug]/services/[serviceId]/custom-fields
```

Ele retorna `{ "ok": true, "fields": [...] }` com o mesmo contrato acima,
somente para serviço ativo do tenant autenticado. `placeholder` é `null` porque
o modelo atual não persiste placeholder por pergunta; o Typebot aplica um texto
genérico de input sem inventar configuração de domínio.

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

### 4. Próximas datas disponíveis

Retorna somente datas que possuem ao menos um horário real disponível para o
serviço dentro da janela consultada. Usa o mesmo cálculo do link público.

```http
GET /api/typebot/[tenantSlug]/services/[serviceId]/available-dates?startDate=2026-07-14&days=14
```

`startDate` é opcional e usa o dia atual no timezone do tenant quando ausente.
`days` aceita de 1 a 14 e usa 14 por padrão. Cada resposta contém no máximo três
datas. `nextStartDate` aponta para a continuação sem pular datas disponíveis e é
`null` quando a janela máxima de agendamento terminou.

```json
{
  "ok": true,
  "dates": [
    {
      "date": "2026-07-16",
      "label": "Qui, 16/07",
      "slotCount": 2
    }
  ],
  "nextStartDate": "2026-07-30"
}
```

O Typebot deve enviar `date` sem conversão ao endpoint de slots. Uma resposta
com `dates: []` não é erro; quando `nextStartDate` existir, o bot pode consultar
o período seguinte.

---

### 5. Horários disponíveis

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

### 6. Identificar cliente

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

### 7. Criar agendamento

Cria um agendamento com origem `WHATSAPP`. Valida disponibilidade, bloqueios, conflitos e campos personalizados.

No blueprint importável, o custom body do bloco HTTP é a variável completa
`{{appointmentRequestBody}}`. Ela contém o JSON final já montado; não coloque
`customValuesJson` entre aspas nem o injete como fragmento de outro body, pois
isso transforma o array em texto escapado.

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

O POST é idempotente para a última criação da sessão quando tenant, cliente,
serviço e horário coincidem. Uma repetição devolve o mesmo agendamento e não
cria uma segunda outbox.

---

### 8. Consultar agendamento

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

## Fluxo conversacional importável

O fluxo canônico está em
[`docs/typebot/agendai-mvp.typebot.json`](../typebot/agendai-mvp.typebot.json).
Ele identifica o tenant, carrega serviços, consulta apenas datas com horários
por `/available-dates`, usa o `date` retornado em `/slots`, coleta nome e
telefone, mostra o resumo e só então cria o agendamento.

O resultado exibido é:

- `CONFIRMED`: “Seu agendamento foi confirmado. Você também receberá os
  detalhes pelo WhatsApp.”
- `REQUESTED`: “Recebemos sua solicitação. O estabelecimento ainda precisa
  confirmar o horário e você será avisado pelo WhatsApp.”

O Typebot não envia essas mensagens transacionais; elas são respostas da
conversa. `APPOINTMENT_REQUESTED`, `APPOINTMENT_CONFIRMED` e
`APPOINTMENT_COMPLETED` continuam exclusivos da outbox/Evolution API.

---

## Listas numeradas

Os endpoints `/services` e `/slots` retornam campo `number` começando em 1 e
campo `text` com a lista formatada. `/available-dates` retorna até três datas e
um cursor `nextStartDate`. O Typebot pode:

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
| Leitura | 120 req/min | `business`, `services`, `service-detail`, `available-dates`, `slots`, `appointment-detail` |
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
- A consulta de detalhe aceita somente agendamentos com origem Typebot
  persistida como `WHATSAPP`
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

## Limitações do fluxo Typebot MVP

- O domínio atual não possui `professionalId`; o estabelecimento define o
  profissional quando aplicável.
- O blueprint importável coleta os campos ativos em ordem e envia
  `customValues` no contrato `{ customFieldId, value }` validado novamente pelo
  booking core.
- Cancelamento, reagendamento, pagamento, IA generativa e atendimento humano
  não fazem parte deste fluxo.
- Mensagens transacionais são enviadas pela Evolution API, fora do Typebot.
- Não há expiração automática das credenciais Typebot.

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
