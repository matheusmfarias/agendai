# Task - Phase 07 Typebot Flow Blueprint

## Objetivo

Criar o blueprint operacional do fluxo Typebot para atendimento e agendamento via WhatsApp, usando a API Typebot implementada na Phase 06.

Esta fase não deve implementar WhatsApp Cloud API, envio ativo de mensagens, webhook de WhatsApp, configuração real de infraestrutura do Typebot ou painel visual de bot.

O objetivo é documentar, estruturar e preparar o fluxo conversacional que será montado no Typebot, incluindo variáveis, chamadas HTTP, mensagens ao cliente, tratamento de erros e caminho feliz.

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
/docs/tasks/phase-06-typebot-api.md
```

Antes de implementar, leia obrigatoriamente:

```text
/docs/technical/typebot-api.md
/docs/specs/00-visao-produto.md
/docs/technical/arquitetura.md
/docs/technical/banco-dados.md
/docs/technical/padroes-codigo.md
```

## Escopo

Implementar somente documentação e artefatos de apoio para montagem do fluxo Typebot.

Criar:

```text
/docs/typebot/flow-blueprint.md
/docs/typebot/variables.md
/docs/typebot/http-requests.md
/docs/typebot/messages.md
/docs/typebot/error-handling.md
/docs/typebot/testing-guide.md
```

Opcionalmente, se fizer sentido:

```text
/docs/typebot/examples/powershell-test-flow.md
/docs/typebot/examples/sample-typebot-flow.json
```

O arquivo JSON de exemplo só deve ser criado se for simples e não depender de formato interno incerto do Typebot. Se não houver segurança sobre o formato exportável do Typebot, não criar JSON fictício.

---

# 1. Princípios do fluxo conversacional

Documentar que o Typebot é apenas camada conversacional.

O Typebot pode:

```text
- cumprimentar o cliente
- coletar nome, telefone, e-mail opcional
- listar serviços
- apresentar horários
- receber escolha numérica
- chamar APIs do AgendaZap
- exibir confirmação ou erro seguro
```

O Typebot não pode:

```text
- calcular disponibilidade sozinho
- decidir conflito de agenda
- confirmar horário sem chamar API
- criar cliente fora do AgendaZap
- criar agendamento sem validação do AgendaZap
- expor motivo administrativo de bloqueio
- expor dados internos
```

Toda regra crítica fica no AgendaZap.

---

# 2. Fluxo conversacional principal

Documentar o caminho feliz:

```text
1. Início da conversa
2. Buscar dados do negócio
3. Perguntar ou confirmar nome do cliente
4. Capturar telefone do canal WhatsApp
5. Identificar/criar cliente
6. Listar serviços ativos
7. Cliente escolhe serviço por número
8. Buscar horários disponíveis
9. Cliente escolhe horário por número
10. Coletar campos personalizados obrigatórios, se existirem
11. Confirmar resumo
12. Criar agendamento
13. Exibir mensagem final conforme status
```

## Mensagem de abertura sugerida

```text
Olá! Eu sou o assistente virtual de {{tenant.name}}.

Vou te ajudar a escolher um serviço e verificar os horários disponíveis.
```

## Menu inicial sugerido

```text
Digite uma opção:

1 - Agendar um serviço
2 - Ver serviços disponíveis
3 - Falar com atendimento
```

Nesta fase, documentar apenas o caminho `1 - Agendar um serviço`.

---

# 3. Variáveis do Typebot

Documentar variáveis necessárias.

## Variáveis de ambiente/configuração

```text
apiBaseUrl
typebotApiKey
tenantSlug
```

Exemplo:

```text
apiBaseUrl = https://agenda.exemplo.com
tenantSlug = mecanica-silva
typebotApiKey = valor configurado em TYPEBOT_API_KEY
```

## Variáveis da conversa

```text
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
```

## Regras

* `customerPhone` deve vir preferencialmente do número do WhatsApp.
* Se o canal não fornecer telefone automaticamente, perguntar ao cliente.
* `selectedServiceNumber` deve ser convertido para um serviço existente da lista retornada.
* `selectedSlotNumber` deve ser convertido para um slot existente da lista retornada.
* O Typebot não deve montar `startsAt` manualmente. Deve usar o `startsAt` retornado pela API.
* `customValuesJson` deve seguir o formato esperado por `/api/typebot/[tenantSlug]/appointments`.

---

# 4. Chamadas HTTP do Typebot

Documentar cada chamada HTTP.

## 4.1 Buscar dados do negócio

```http
GET {{apiBaseUrl}}/api/typebot/{{tenantSlug}}/business
x-typebot-api-key: {{typebotApiKey}}
```

Salvar:

```text
tenant.name
tenant.whatsapp
tenant.city
tenant.state
```

Se erro `BUSINESS_UNAVAILABLE`, mostrar mensagem genérica.

---

## 4.2 Identificar cliente

```http
POST {{apiBaseUrl}}/api/typebot/{{tenantSlug}}/customers/identify
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
customer.id -> customerId
session.id -> sessionId
session.status
```

---

## 4.3 Listar serviços

```http
GET {{apiBaseUrl}}/api/typebot/{{tenantSlug}}/services
x-typebot-api-key: {{typebotApiKey}}
```

Salvar:

```text
services -> servicesJson
text -> servicesText
```

Mostrar ao cliente:

```text
Escolha um serviço digitando o número:

{{servicesText}}
```

---

## 4.4 Buscar horários

```http
GET {{apiBaseUrl}}/api/typebot/{{tenantSlug}}/services/{{selectedServiceId}}/slots?days=7
x-typebot-api-key: {{typebotApiKey}}
```

Salvar:

```text
slots -> slotsJson
text -> slotsText
```

Mostrar ao cliente:

```text
Estes são os próximos horários disponíveis:

{{slotsText}}

Digite o número do horário desejado.
```

Se não houver horários:

```text
No momento não encontrei horários disponíveis para esse serviço nos próximos dias.

Você pode tentar outro serviço ou falar com o atendimento.
```

---

## 4.5 Criar agendamento

```http
POST {{apiBaseUrl}}/api/typebot/{{tenantSlug}}/appointments
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
appointment.id -> appointmentId
appointment.status -> appointmentStatus
message -> appointmentMessage
```

Mostrar:

```text
{{appointmentMessage}}
```

---

## 4.6 Consultar agendamento

```http
GET {{apiBaseUrl}}/api/typebot/{{tenantSlug}}/appointments/{{appointmentId}}
x-typebot-api-key: {{typebotApiKey}}
```

Usar para montar confirmação final:

```text
Resumo do agendamento:

Serviço: {{appointment.serviceName}}
Cliente: {{appointment.customerName}}
Data/hora: {{appointment.startsAt}}
Status: {{appointment.status}}
```

---

# 5. Escolha por lista numerada

Documentar como lidar com listas.

## Serviços

A API retorna:

```json
{
  "services": [
    {
      "number": 1,
      "id": "service_id",
      "name": "Troca de óleo"
    }
  ]
}
```

O cliente digita:

```text
1
```

O Typebot deve mapear:

```text
selectedServiceNumber = 1
selectedServiceId = services[0].id
selectedServiceName = services[0].name
```

## Horários

A API retorna:

```json
{
  "slots": [
    {
      "number": 1,
      "startsAt": "2026-06-29T13:00:00.000Z",
      "label": "29/06/2026 10:00"
    }
  ]
}
```

O cliente digita:

```text
1
```

O Typebot deve mapear:

```text
selectedSlotNumber = 1
selectedSlotStartsAt = slots[0].startsAt
selectedSlotLabel = slots[0].label
```

## Erro de opção inválida

Mensagem:

```text
Não encontrei essa opção. Por favor, digite um dos números da lista.
```

---

# 6. Campos personalizados

Documentar como o Typebot deve coletar campos personalizados.

Se a API de serviços ainda não retorna `customFields`, registrar como pendência ou ajuste futuro.

Opção recomendada:

* serviços retornarem campos personalizados ativos em endpoint futuro ou no endpoint de detalhes do serviço
* Typebot perguntar cada campo obrigatório
* montar `customValues`

Formato:

```json
[
  {
    "customFieldId": "field_id",
    "value": "ABC1234"
  }
]
```

## Regras

* Campos obrigatórios devem ser perguntados.
* SELECT deve aceitar apenas opções previstas.
* Mesmo que o Typebot valide, o backend continua sendo a fonte final de validação.
* Se backend retornar `CUSTOM_FIELD_REQUIRED`, Typebot deve pedir novamente o campo.

---

# 7. Tratamento de erros

Criar tabela de tratamento para os códigos da Phase 06.

## UNAUTHORIZED

Mensagem interna para operador, não para cliente final em produção.

```text
Não foi possível iniciar o atendimento agora. Tente novamente mais tarde.
```

## BUSINESS_UNAVAILABLE

```text
Este atendimento está temporariamente indisponível. Entre em contato diretamente com o estabelecimento.
```

## SERVICE_NOT_FOUND / SERVICE_UNAVAILABLE

```text
Esse serviço não está disponível no momento. Vou te mostrar a lista atualizada de serviços.
```

Ação:

```text
Chamar /services novamente.
```

## NO_SLOTS_AVAILABLE

```text
Não encontrei horários disponíveis para esse serviço nos próximos dias.
```

## SLOT_UNAVAILABLE

```text
Esse horário acabou de ficar indisponível. Vou buscar os horários atualizados para você.
```

Ação:

```text
Chamar /slots novamente.
```

## CUSTOMER_REQUIRED / SESSION_NOT_FOUND

```text
Não consegui identificar seu atendimento. Vamos começar novamente.
```

Ação:

```text
Voltar para identificação do cliente.
```

## CUSTOM_FIELD_REQUIRED

```text
Preciso de mais uma informação para continuar.
```

## CUSTOM_FIELD_INVALID

```text
A informação enviada não parece válida. Vamos tentar novamente.
```

## VALIDATION_ERROR

```text
Alguma informação não está correta. Vamos revisar os dados.
```

## INTERNAL_ERROR

```text
Tive um problema ao processar sua solicitação. Tente novamente em alguns instantes ou fale com o atendimento.
```

---

# 8. Confirmação final por status

Documentar mensagens conforme status do agendamento.

## CONFIRMED

```text
Agendamento confirmado com sucesso!

Serviço: {{serviceName}}
Data e horário: {{slotLabel}}
```

## REQUESTED

```text
Sua solicitação foi enviada e aguarda confirmação do prestador.

Serviço: {{serviceName}}
Data e horário solicitado: {{slotLabel}}
```

## WAITING_INFO

```text
Sua solicitação foi enviada.

O prestador entrará em contato para dar continuidade.
```

---

# 9. Segurança

Documentar:

```text
- usar HTTPS em produção
- nunca expor TYPEBOT_API_KEY em frontend público
- configurar a chave apenas no bloco HTTP do Typebot
- não registrar API key em logs
- não retornar motivo de assinatura bloqueada
- validar tenant em todos os endpoints
- validar customer/session/service/appointment sempre por tenant
- não confiar em número digitado pelo cliente para serviceId/startsAt
- usar sempre os IDs retornados pela API
```

---

# 10. Teste manual do fluxo no Typebot

Criar roteiro:

```text
1. Configurar variável apiBaseUrl
2. Configurar variável tenantSlug
3. Configurar variável typebotApiKey
4. Criar bloco HTTP business
5. Criar bloco captura nome
6. Capturar telefone
7. Criar bloco HTTP identify
8. Criar bloco HTTP services
9. Exibir servicesText
10. Capturar selectedServiceNumber
11. Mapear selectedServiceId
12. Criar bloco HTTP slots
13. Exibir slotsText
14. Capturar selectedSlotNumber
15. Mapear selectedSlotStartsAt
16. Exibir resumo
17. Criar bloco HTTP appointments
18. Exibir appointmentMessage
19. Consultar appointment, se necessário
```

---

# 11. Atualizar README

Atualizar README com:

```text
Phase 07 - Typebot Flow Blueprint
```

Informar que:

```text
- API Typebot existe
- blueprint conversacional documentado
- WhatsApp real ainda não implementado
- Typebot real ainda precisa ser configurado externamente
```

---

# Fora do escopo

Não implementar:

```text
WhatsApp Cloud API
Webhook de WhatsApp
Envio ativo de mensagens
Instalação do Typebot
Export real de bot Typebot
Painel de configuração de bot
Tokens por tenant
Cancelamento via WhatsApp
Remarcação via WhatsApp
Pagamento
Lembretes automáticos
Área do cliente final
```

---

# Critérios de aceite

* `/docs/typebot/flow-blueprint.md` criado.
* `/docs/typebot/variables.md` criado.
* `/docs/typebot/http-requests.md` criado.
* `/docs/typebot/messages.md` criado.
* `/docs/typebot/error-handling.md` criado.
* `/docs/typebot/testing-guide.md` criado.
* Documentação explica caminho feliz.
* Documentação explica variáveis necessárias.
* Documentação explica chamadas HTTP.
* Documentação explica lista numerada.
* Documentação explica tratamento de erros.
* Documentação explica segurança.
* README atualizado.
* Nenhuma regra de negócio alterada.
* Nenhuma migration criada.
* Nenhum endpoint novo obrigatório criado.
* `pnpm typecheck`, `pnpm lint`, `pnpm test` e `pnpm build` continuam passando.

---

# Instruções para o DeepSeek

Implemente somente a Phase 07 Typebot Flow Blueprint.

Esta fase é documentação e preparação operacional do fluxo Typebot.

Não implemente funcionalidades novas no sistema.

Não crie migrations.

Não implemente WhatsApp Cloud API, webhook, envio ativo, instalação do Typebot, painel de bot, cancelamento, remarcação, pagamento ou lembretes.

Ao finalizar, informe:

```text
- arquivos criados
- arquivos alterados
- se algum código foi alterado
- como validar
- validações executadas
- pendências conhecidas
```
