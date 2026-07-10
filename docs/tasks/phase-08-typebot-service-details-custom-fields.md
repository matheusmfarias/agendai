# Task - Phase 08 Typebot Service Details & Custom Fields

## Objetivo

Implementar suporte completo para que o Typebot descubra os campos personalizados de um serviço antes de criar um agendamento.

A Phase 06 já permite criar agendamentos via Typebot enviando `customValues`, mas a API ainda não fornece ao Typebot quais campos personalizados ativos existem para o serviço, quais são obrigatórios, quais são opcionais e quais opções são válidas para campos SELECT.

Esta fase resolve essa lacuna.

## Dependências

Esta task depende da conclusão e validação das fases:

```text id="8javdu"
/docs/tasks/phase-06-typebot-api.md
/docs/tasks/phase-07-typebot-flow-blueprint.md
```

Também depende das fases anteriores já concluídas:

```text id="04mvqv"
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

```text id="tnmbf0"
/docs/technical/typebot-api.md
/docs/typebot/flow-blueprint.md
/docs/typebot/http-requests.md
/docs/typebot/variables.md
/docs/typebot/messages.md
/docs/typebot/error-handling.md
/docs/technical/banco-dados.md
/docs/technical/padroes-codigo.md
```

---

# Escopo

Implementar endpoint de detalhe de serviço para Typebot:

```http id="of3r5e"
GET /api/typebot/[tenantSlug]/services/[serviceId]
```

Esse endpoint deve retornar:

```text id="eg1fcm"
- dados seguros do serviço
- categoria
- preço formatado
- bookingMode
- duração
- campos personalizados ativos
- opções válidas de SELECT
- texto pronto para o Typebot perguntar os campos
```

Também atualizar:

```text id="04lkk3"
/docs/technical/typebot-api.md
/docs/typebot/http-requests.md
/docs/typebot/flow-blueprint.md
/docs/typebot/variables.md
/docs/typebot/messages.md
/docs/typebot/testing-guide.md
README.md
```

Não criar migrations.

---

# 1. Endpoint: detalhe do serviço

## Rota

```http id="5p1o6y"
GET /api/typebot/[tenantSlug]/services/[serviceId]
```

## Objetivo

Permitir que o Typebot consulte detalhes completos do serviço selecionado, incluindo campos personalizados que precisam ser coletados antes da criação do agendamento.

## Validações

O endpoint deve validar:

```text id="e0icgm"
- API key, quando TYPEBOT_API_KEY estiver configurada
- tenant existe
- tenant está ativo
- assinatura/plano permite WhatsApp/Typebot
- serviço pertence ao tenant
- serviço está ativo
- categoria do serviço está ativa
```

Se tenant/plano/assinatura estiverem indisponíveis, retornar erro público genérico:

```json id="oqrheh"
{
  "ok": false,
  "code": "BUSINESS_UNAVAILABLE",
  "message": "Este atendimento está temporariamente indisponível."
}
```

Se serviço não existir ou não estiver disponível:

```json id="jubxgw"
{
  "ok": false,
  "code": "SERVICE_NOT_FOUND",
  "message": "Esse serviço não está disponível no momento."
}
```

---

# 2. Resposta esperada

## Exemplo sem campos personalizados

```json id="1meq1u"
{
  "ok": true,
  "service": {
    "id": "service_id",
    "category": {
      "id": "category_id",
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

## Exemplo com campos personalizados

```json id="euq05k"
{
  "ok": true,
  "service": {
    "id": "service_id",
    "category": {
      "id": "category_id",
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
        "id": "field_id_1",
        "key": "vehicle_plate",
        "label": "Placa do veículo",
        "type": "TEXT",
        "required": true,
        "options": [],
        "order": 1
      },
      {
        "id": "field_id_2",
        "key": "problem_type",
        "label": "Tipo de problema",
        "type": "SELECT",
        "required": true,
        "options": ["Motor", "Freio", "Suspensão"],
        "order": 2
      }
    ]
  },
  "customFieldsText": "Preciso de mais algumas informações:\n1 - Placa do veículo\n2 - Tipo de problema: Motor, Freio, Suspensão"
}
```

---

# 3. Campos personalizados

Retornar apenas campos personalizados:

```text id="mfjfdk"
- ativos
- pertencentes ao serviço informado
- ordenados por position/order
```

Não retornar campos inativos.

## Tipos suportados

Usar os tipos já existentes no sistema:

```text id="x7l0de"
TEXT
TEXTAREA
NUMBER
DATE
BOOLEAN
SELECT
```

## Regras de retorno

Cada campo deve retornar:

```text id="48rxmf"
id
key
label
type
required
options
order
```

Para campos não SELECT:

```json id="59upl1"
"options": []
```

Para SELECT:

```json id="ov3mrc"
"options": ["Opção A", "Opção B"]
```

## Segurança

Não retornar:

```text id="kv4vli"
dados internos do tenant
audit logs
metadados administrativos
campos inativos
dados de outros tenants
```

---

# 4. Texto pronto para Typebot

O endpoint deve retornar `customFieldsText` para o Typebot usar em mensagem.

## Sem campos

```json id="ytj3ym"
"customFieldsText": ""
```

## Com campos

Exemplo:

```text id="ddznq8"
Preciso de mais algumas informações:

1 - Placa do veículo
2 - Tipo de problema: Motor, Freio, Suspensão
3 - Ano do veículo
```

## Regra

* Campos obrigatórios podem ser marcados com texto `(obrigatório)`, se quiser.
* SELECT deve listar opções.
* Não depender de botões do WhatsApp.

---

# 5. Atualizar fluxo Typebot

Atualizar documentação para incluir o novo passo:

```text id="2rexll"
1. business
2. identify
3. services
4. usuário escolhe serviço
5. service detail
6. slots
7. usuário escolhe horário
8. coletar custom fields, se existirem
9. appointments
10. confirmation
```

## Nova variável

Adicionar em `/docs/typebot/variables.md`:

```text id="o5mcjd"
selectedServiceDetailsJson
customFieldsJson
customFieldsText
```

## Nova chamada HTTP

Adicionar em `/docs/typebot/http-requests.md`:

```http id="f761t6"
GET {{apiBaseUrl}}/api/typebot/{{tenantSlug}}/services/{{selectedServiceId}}
x-typebot-api-key: {{typebotApiKey}}
```

Salvar:

```text id="q7c2ak"
service -> selectedServiceDetailsJson
service.customFields -> customFieldsJson
customFieldsText -> customFieldsText
```

---

# 6. Montagem de customValues no Typebot

Documentar que o Typebot deve montar:

```json id="6h7on8"
[
  {
    "customFieldId": "field_id",
    "value": "valor informado pelo cliente"
  }
]
```

## Exemplo

Campo retornado:

```json id="g7ugnr"
{
  "id": "field_placa",
  "label": "Placa do veículo",
  "type": "TEXT",
  "required": true
}
```

Resposta do cliente:

```text id="qsx7me"
ABC1234
```

Payload final:

```json id="k1avbm"
{
  "customValues": [
    {
      "customFieldId": "field_placa",
      "value": "ABC1234"
    }
  ]
}
```

---

# 7. Atualizar documentação de erros

Atualizar `docs/typebot/error-handling.md` para incluir o uso do novo endpoint.

Erros relevantes:

```text id="l2hfob"
SERVICE_NOT_FOUND
SERVICE_UNAVAILABLE
BUSINESS_UNAVAILABLE
UNAUTHORIZED
VALIDATION_ERROR
```

Mensagem sugerida para serviço indisponível:

```text id="we3hxb"
Esse serviço não está disponível no momento. Vou te mostrar a lista atualizada de serviços.
```

Ação:

```text id="gy7n8k"
Chamar /services novamente.
```

---

# 8. Atualizar documentação técnica

Atualizar:

```text id="mzoqiz"
/docs/technical/typebot-api.md
```

Adicionar o endpoint:

```http id="kskq0p"
GET /api/typebot/[tenantSlug]/services/[serviceId]
```

Com:

```text id="zzhaty"
- headers
- validações
- resposta
- exemplos curl
- exemplos PowerShell UTF-8 quando necessário
- códigos de erro
```

---

# 9. README

Atualizar README informando que a API Typebot agora possui endpoint de detalhe de serviço com campos personalizados.

---

# Fora do escopo

Não implementar:

```text id="jyb0bf"
WhatsApp Cloud API
webhook WhatsApp
envio ativo de mensagens
configuração real do Typebot
painel visual de bot
tokens por tenant
cancelamento/remarcação via WhatsApp
área do cliente
pagamento
lembretes
novos tipos de campo
migrations
```

---

# Critérios de aceite

* Endpoint `GET /api/typebot/[tenantSlug]/services/[serviceId]` existe.
* Endpoint exige API key quando `TYPEBOT_API_KEY` estiver configurada.
* Endpoint valida tenant ativo.
* Endpoint valida plano/assinatura com WhatsApp habilitado.
* Endpoint retorna apenas serviço ativo.
* Endpoint bloqueia serviço de categoria inativa.
* Endpoint retorna campos personalizados ativos.
* Endpoint não retorna campos personalizados inativos.
* Endpoint retorna SELECT com opções válidas.
* Endpoint retorna `customFieldsText`.
* Endpoint não expõe dados administrativos.
* Documentação Typebot atualizada com nova chamada.
* Blueprint Typebot atualizado para incluir etapa de detalhes do serviço.
* README atualizado.
* Nenhuma migration criada.
* Nenhuma regra de negócio existente alterada.
* Agendamento Typebot existente continua funcionando.
* Link público web continua funcionando.
* `pnpm typecheck`, `pnpm lint`, `pnpm test` e `pnpm build` passam.

---

# Instruções para o DeepSeek

Implemente somente a Phase 08 Typebot Service Details & Custom Fields.

Não implemente funcionalidades fora do escopo.

Não crie migrations.

Não implemente WhatsApp Cloud API, webhook, envio ativo, painel de bot, área do cliente, cancelamento, remarcação, pagamento ou lembretes.

Ao finalizar, informe:

```text id="ust6fb"
- arquivos criados
- arquivos alterados
- endpoint implementado
- exemplos de request/response
- se houve migration
- como testar
- validações executadas
- pendências conhecidas
```
