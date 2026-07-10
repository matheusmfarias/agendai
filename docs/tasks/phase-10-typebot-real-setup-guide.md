# Task - Phase 10 Typebot Real Setup Guide

## Objetivo

Criar a documentação operacional para configurar o fluxo real no Typebot, usando a API Typebot do AgendaZap já implementada e validada nas fases anteriores.

Esta fase transforma o blueprint e o simulador em um guia prático de montagem no Typebot real, com variáveis, blocos, chamadas HTTP, mapeamento de respostas, mensagens, tratamento de erros e roteiro de validação.

Esta fase não deve implementar WhatsApp Cloud API própria no AgendaZap, webhook de WhatsApp, envio ativo de mensagens, painel visual de bot dentro do AgendaZap ou integração automática com a plataforma Typebot.

---

# Dependências

Esta task depende da conclusão e validação das fases:

```text
/docs/tasks/phase-06-typebot-api.md
/docs/tasks/phase-07-typebot-flow-blueprint.md
/docs/tasks/phase-08-typebot-service-details-custom-fields.md
/docs/tasks/phase-09-typebot-flow-simulator.md
```

Também depende das fases anteriores já concluídas:

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
/docs/technical/typebot-api.md
/docs/typebot/flow-blueprint.md
/docs/typebot/variables.md
/docs/typebot/http-requests.md
/docs/typebot/messages.md
/docs/typebot/error-handling.md
/docs/typebot/testing-guide.md
/docs/typebot/simulator.md
/docs/technical/arquitetura.md
/docs/technical/padroes-codigo.md
README.md
```

---

# Escopo

Criar documentação prática para montagem do Typebot real.

Criar:

```text
/docs/typebot/real-setup-guide.md
/docs/typebot/real-flow-steps.md
/docs/typebot/real-http-blocks.md
/docs/typebot/real-variable-mapping.md
/docs/typebot/real-validation-checklist.md
```

Atualizar:

```text
README.md
```

Opcionalmente atualizar:

```text
/docs/typebot/testing-guide.md
/docs/typebot/messages.md
/docs/typebot/error-handling.md
```

Não implementar funcionalidades novas.

Não criar migrations.

Não alterar endpoints existentes.

---

# 1. Guia principal

Criar:

```text
/docs/typebot/real-setup-guide.md
```

Este arquivo deve explicar:

```text
- objetivo do guia
- pré-requisitos
- variáveis necessárias
- configuração de API key
- sequência geral de blocos
- como testar em ambiente local/dev
- como testar em ambiente publicado
- limitações da fase
```

## Pré-requisitos

Documentar:

```text
- AgendaZap rodando localmente ou publicado
- tenant ativo
- plano com whatsappEnabled = true
- assinatura ativa
- categoria ativa
- serviço ativo
- availability_rules configuradas
- TYPEBOT_API_KEY configurada no AgendaZap
- URL pública acessível pelo Typebot, se usar Typebot hospedado
```

## Observação importante sobre localhost

Documentar:

```text
Se o Typebot estiver hospedado fora da máquina local, ele não conseguirá acessar http://localhost:3000.
Para testar localmente com Typebot externo, usar uma URL pública temporária, como túnel HTTPS, ou publicar o AgendaZap em ambiente de teste.
```

Não indicar uma ferramenta específica obrigatória. Pode citar genericamente “túnel HTTPS” ou “ambiente de homologação”.

---

# 2. Variáveis no Typebot real

Criar:

```text
/docs/typebot/real-variable-mapping.md
```

Documentar as variáveis a criar/configurar no Typebot.

## Variáveis de configuração

```text
apiBaseUrl
tenantSlug
typebotApiKey
```

Exemplo:

```text
apiBaseUrl = https://agenda.seudominio.com
tenantSlug = mecanica-silva
typebotApiKey = valor configurado em TYPEBOT_API_KEY
```

## Variáveis de conversa

```text
businessJson
tenantName
tenantWhatsapp

customerPhone
customerName
customerEmail
customerId
sessionId

servicesJson
servicesText
selectedServiceNumber
selectedServiceId
selectedServiceName

selectedServiceDetailsJson
customFieldsJson
customFieldsText

slotsJson
slotsText
selectedSlotNumber
selectedSlotStartsAt
selectedSlotLabel

customValuesJson
customerNotes

appointmentId
appointmentStatus
appointmentMessage
appointmentJson

lastErrorCode
lastErrorMessage
```

## Regras

Documentar:

```text
- tenantSlug é fixo por bot/prestador
- typebotApiKey nunca deve ser exibido em mensagem
- customerPhone deve vir do WhatsApp quando possível
- selectedServiceId deve vir da lista retornada pela API, nunca digitado manualmente pelo cliente
- selectedSlotStartsAt deve vir da lista de slots retornada pela API
- customValuesJson deve ser montado a partir dos customFields retornados pelo endpoint de detalhe
```

---

# 3. Passo a passo dos blocos

Criar:

```text
/docs/typebot/real-flow-steps.md
```

Documentar a sequência de blocos no Typebot.

## Fluxo mínimo

```text
1. Start
2. Definir variáveis fixas
3. HTTP - Buscar dados do negócio
4. Mensagem de boas-vindas
5. Capturar telefone, se o canal não fornecer
6. Capturar nome
7. Capturar e-mail opcional
8. HTTP - Identificar cliente
9. HTTP - Listar serviços
10. Mensagem - Mostrar lista de serviços
11. Input - Escolher número do serviço
12. Lógica - Mapear número para selectedServiceId
13. HTTP - Buscar detalhe do serviço
14. Mensagem - Mostrar resumo do serviço
15. Condicional - Existem campos personalizados?
16. Inputs - Coletar campos personalizados
17. HTTP - Buscar slots disponíveis
18. Mensagem - Mostrar lista de horários
19. Input - Escolher número do horário
20. Lógica - Mapear número para selectedSlotStartsAt
21. Mensagem - Resumo antes da confirmação
22. Input/Choice - Confirmar
23. HTTP - Criar agendamento
24. HTTP - Consultar agendamento, opcional
25. Mensagem final conforme status
26. Encerramento
```

## Importante

Documentar que:

```text
- o Typebot não deve calcular disponibilidade
- o Typebot não deve montar startsAt manualmente
- o Typebot não deve confiar em texto livre para serviceId
- o Typebot deve sempre usar os IDs retornados pela API
```

---

# 4. Blocos HTTP reais

Criar:

```text
/docs/typebot/real-http-blocks.md
```

Documentar cada bloco HTTP do Typebot com:

```text
- nome do bloco
- método
- URL
- headers
- body
- variáveis a salvar
- exemplo de resposta
- erro esperado
```

## 4.1 Business

```http
GET {{apiBaseUrl}}/api/typebot/{{tenantSlug}}/business
```

Headers:

```text
x-typebot-api-key: {{typebotApiKey}}
```

Salvar:

```text
businessJson = response
tenantName = response.tenant.name
tenantWhatsapp = response.tenant.whatsapp
```

---

## 4.2 Identify Customer

```http
POST {{apiBaseUrl}}/api/typebot/{{tenantSlug}}/customers/identify
```

Headers:

```text
x-typebot-api-key: {{typebotApiKey}}
Content-Type: application/json; charset=utf-8
```

Body:

```json
{
  "phone": "{{customerPhone}}",
  "name": "{{customerName}}",
  "email": "{{customerEmail}}"
}
```

Salvar:

```text
customerId = response.customer.id
sessionId = response.session.id
```

---

## 4.3 Services

```http
GET {{apiBaseUrl}}/api/typebot/{{tenantSlug}}/services
```

Salvar:

```text
servicesJson = response.services
servicesText = response.text
```

---

## 4.4 Service Detail

```http
GET {{apiBaseUrl}}/api/typebot/{{tenantSlug}}/services/{{selectedServiceId}}
```

Salvar:

```text
selectedServiceDetailsJson = response.service
customFieldsJson = response.service.customFields
customFieldsText = response.customFieldsText
selectedServiceName = response.service.name
```

---

## 4.5 Slots

```http
GET {{apiBaseUrl}}/api/typebot/{{tenantSlug}}/services/{{selectedServiceId}}/slots?days=7
```

Salvar:

```text
slotsJson = response.slots
slotsText = response.text
```

---

## 4.6 Create Appointment

```http
POST {{apiBaseUrl}}/api/typebot/{{tenantSlug}}/appointments
```

Headers:

```text
x-typebot-api-key: {{typebotApiKey}}
Content-Type: application/json; charset=utf-8
```

Body:

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

Salvar:

```text
appointmentId = response.appointment.id
appointmentStatus = response.appointment.status
appointmentMessage = response.message
```

---

## 4.7 Query Appointment

```http
GET {{apiBaseUrl}}/api/typebot/{{tenantSlug}}/appointments/{{appointmentId}}
```

Salvar:

```text
appointmentJson = response.appointment
```

---

# 5. Mapeamento de listas numeradas

Documentar em `real-variable-mapping.md` e `real-flow-steps.md`.

## Serviços

A API retorna:

```json
[
  {
    "number": 1,
    "id": "service_id",
    "name": "Troca de óleo"
  }
]
```

O cliente digita:

```text
1
```

O Typebot deve mapear:

```text
selectedServiceNumber = 1
selectedServiceId = servicesJson[selectedServiceNumber - 1].id
selectedServiceName = servicesJson[selectedServiceNumber - 1].name
```

Se o número for inválido:

```text
Não encontrei essa opção. Digite um número da lista.
```

## Slots

A API retorna:

```json
[
  {
    "number": 1,
    "startsAt": "2026-06-29T13:00:00.000Z",
    "label": "29/06/2026 10:00"
  }
]
```

O cliente digita:

```text
1
```

O Typebot deve mapear:

```text
selectedSlotNumber = 1
selectedSlotStartsAt = slotsJson[selectedSlotNumber - 1].startsAt
selectedSlotLabel = slotsJson[selectedSlotNumber - 1].label
```

---

# 6. Campos personalizados no Typebot real

Documentar como coletar campos personalizados.

## Regra geral

Se `customFieldsJson` estiver vazio:

```text
pular etapa de campos personalizados
customValuesJson = []
```

Se houver campos:

```text
perguntar cada campo ao cliente
montar customValuesJson
```

## Por tipo

```text
TEXT -> input texto
TEXTAREA -> input texto longo
NUMBER -> input numérico
DATE -> input data
BOOLEAN -> pergunta Sim/Não e normaliza para true/false ou Sim/Não conforme backend aceitar
SELECT -> mostrar opções e aceitar apenas opção válida
```

## Payload final

```json
[
  {
    "customFieldId": "field_id",
    "value": "valor informado"
  }
]
```

## Observação

Documentar que a validação final sempre será do backend. Se o backend retornar:

```text
CUSTOM_FIELD_REQUIRED
CUSTOM_FIELD_INVALID
```

o Typebot deve voltar para a coleta do campo.

---

# 7. Mensagens finais

Documentar mensagens conforme status.

## CONFIRMED

```text
Agendamento confirmado com sucesso! ✅

Serviço: {{selectedServiceName}}
Horário: {{selectedSlotLabel}}
```

## REQUESTED

```text
Sua solicitação foi enviada e aguarda confirmação do prestador. ✅

Serviço: {{selectedServiceName}}
Horário solicitado: {{selectedSlotLabel}}
```

## WAITING_INFO

```text
Sua solicitação foi enviada. ✅

O prestador entrará em contato para dar continuidade.
```

---

# 8. Tratamento de erros

Criar seção nos documentos reais ou reutilizar `docs/typebot/error-handling.md`.

Para cada erro, documentar:

```text
- mensagem ao cliente
- ação do fluxo
```

Erros principais:

```text
UNAUTHORIZED
BUSINESS_UNAVAILABLE
SERVICE_NOT_FOUND
SERVICE_UNAVAILABLE
NO_SLOTS_AVAILABLE
SLOT_UNAVAILABLE
CUSTOM_FIELD_REQUIRED
CUSTOM_FIELD_INVALID
SESSION_NOT_FOUND
CUSTOMER_REQUIRED
VALIDATION_ERROR
INTERNAL_ERROR
```

## Regra

Nunca exibir para o cliente:

```text
- stack trace
- assinatura vencida
- motivo administrativo
- API key
- IDs internos sem necessidade
```

---

# 9. Checklist de validação real

Criar:

```text
/docs/typebot/real-validation-checklist.md
```

Checklist:

```text
1. Variáveis fixas configuradas
2. API key configurada no bloco HTTP
3. Business retorna ok
4. Identify cria/reutiliza cliente
5. Services retorna lista numerada
6. Escolha de serviço inválida é tratada
7. Service detail retorna custom fields
8. Custom fields obrigatórios são coletados
9. Slots retorna horários disponíveis
10. Escolha de slot inválida é tratada
11. Create appointment cria WHATSAPP
12. Appointment aparece no painel
13. origin = WHATSAPP
14. createdByUserId = null
15. bookingMode respeitado
16. SLOT_UNAVAILABLE é tratado quando horário fica ocupado
17. BUSINESS_UNAVAILABLE mostra mensagem genérica
18. Nenhum dado sensível é exibido
```

---

# 10. Atualizar README

Adicionar seção:

```text
Phase 10 - Typebot Real Setup Guide
```

Informar:

```text
- documentação para montar o Typebot real criada
- fluxo real ainda depende de configuração manual no Typebot
- WhatsApp Cloud API própria ainda fora do escopo
- AgendaZap já fornece API e simulador para validação
```

---

# Fora do escopo

Não implementar:

```text
WhatsApp Cloud API
webhook WhatsApp
envio ativo de mensagens
integração automática com Typebot
export real de bot
painel de bot no AgendaZap
tokens por tenant
área do cliente
cancelamento/remarcação via WhatsApp
pagamento
lembretes
migrations
alteração de endpoints
alteração de regras de negócio
```

---

# Critérios de aceite

* `/docs/typebot/real-setup-guide.md` criado.
* `/docs/typebot/real-flow-steps.md` criado.
* `/docs/typebot/real-http-blocks.md` criado.
* `/docs/typebot/real-variable-mapping.md` criado.
* `/docs/typebot/real-validation-checklist.md` criado.
* Documentação explica como montar o fluxo real no Typebot.
* Documentação lista variáveis fixas e variáveis de conversa.
* Documentação lista todos os blocos HTTP.
* Documentação explica mapeamento de lista numerada.
* Documentação explica coleta de custom fields.
* Documentação explica tratamento de erros.
* Documentação explica limitações da fase.
* README atualizado.
* Nenhuma migration criada.
* Nenhum endpoint alterado.
* Nenhuma regra de negócio alterada.
* `pnpm typecheck`, `pnpm lint`, `pnpm test` e `pnpm build` continuam passando.

---

# Instruções para o DeepSeek

Implemente somente a Phase 10 Typebot Real Setup Guide.

Esta fase é documentação operacional para configurar o fluxo real no Typebot usando a API já existente do AgendaZap.

Não implemente funcionalidades novas.

Não crie migrations.

Não altere endpoints.

Não altere regras de negócio.

Não implemente WhatsApp Cloud API, webhook, envio ativo, painel de bot, export automático de bot, área do cliente, cancelamento, remarcação, pagamento ou lembretes.

Ao finalizar, informe:

```text
- arquivos criados
- arquivos alterados
- se algum código foi alterado
- se houve migration
- como validar
- validações executadas
- pendências conhecidas
```
