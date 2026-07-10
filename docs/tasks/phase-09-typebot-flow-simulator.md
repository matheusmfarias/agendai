# Task - Phase 09 Typebot Flow Simulator

## Objetivo

Implementar um simulador interno do fluxo Typebot dentro do AgendaZap, permitindo testar ponta a ponta o agendamento via API Typebot sem depender da plataforma Typebot real, WhatsApp Cloud API ou canal externo.

O simulador deve funcionar como uma ferramenta técnica/operacional para validar:

```text
- dados do negócio
- identificação de cliente por telefone
- listagem de serviços
- detalhe do serviço
- campos personalizados
- horários disponíveis
- criação de agendamento com origin WHATSAPP
- consulta de confirmação
- tratamento de erros
```

Esta fase não deve implementar WhatsApp real, envio ativo de mensagens, webhook, instalação do Typebot, painel visual de bot ou automações externas.

---

# Dependências

Esta task depende da conclusão e validação das fases:

```text
/docs/tasks/phase-06-typebot-api.md
/docs/tasks/phase-07-typebot-flow-blueprint.md
/docs/tasks/phase-08-typebot-service-details-custom-fields.md
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
/docs/typebot/http-requests.md
/docs/typebot/variables.md
/docs/typebot/messages.md
/docs/typebot/error-handling.md
/docs/typebot/testing-guide.md
/docs/technical/arquitetura.md
/docs/technical/padroes-codigo.md
```

---

# Escopo

Implementar uma tela interna de simulação do Typebot.

Rota sugerida:

```text
/admin/typebot-simulator
```

ou, se fizer mais sentido operacionalmente:

```text
/app/typebot-simulator
```

## Decisão recomendada

Implementar em:

```text
/admin/typebot-simulator
```

Motivo:

```text
- é uma ferramenta técnica da plataforma
- permite Super Admin testar qualquer tenant
- evita expor ferramenta de simulação ao prestador no MVP
```

Se implementar em `/admin`, somente `SUPER_ADMIN` pode acessar.

---

# 1. Página do simulador

## Rota

```text
/admin/typebot-simulator
```

## Objetivo

Permitir que o Super Admin simule o fluxo Typebot para qualquer tenant.

## Campos iniciais

```text
Tenant
Telefone do cliente
Nome do cliente
E-mail opcional
```

## Regras

* Tenant deve ser selecionado entre tenants existentes.
* Mostrar slug do tenant selecionado.
* Validar que o tenant possui plano/assinatura com WhatsApp habilitado.
* Se o tenant não estiver disponível para WhatsApp/Typebot, mostrar mensagem segura.
* Não permitir simulação sem tenant.
* Não permitir simulação sem telefone e nome.

---

# 2. Fluxo simulado

A tela deve conduzir o operador pelas etapas:

```text
1. Selecionar tenant
2. Informar telefone/nome/e-mail
3. Buscar dados do negócio
4. Identificar cliente
5. Listar serviços
6. Escolher serviço
7. Buscar detalhe do serviço
8. Exibir campos personalizados
9. Buscar horários disponíveis
10. Escolher horário
11. Preencher campos personalizados, se existirem
12. Criar agendamento
13. Exibir confirmação final
14. Permitir abrir agendamento no painel
```

## Observação

O simulador pode chamar os services diretamente no servidor ou chamar os endpoints `/api/typebot/...`.

### Recomendação

Preferir chamar os **mesmos services internos usados pela API Typebot**, e não fazer request HTTP para o próprio app.

Mas o comportamento deve ser equivalente aos endpoints Typebot.

---

# 3. UX sugerida

A tela pode ser simples, sem chat real.

Usar layout em etapas/cards:

```text
Card 1 - Configuração
Card 2 - Cliente
Card 3 - Serviços
Card 4 - Detalhe do serviço
Card 5 - Horários
Card 6 - Campos personalizados
Card 7 - Confirmação
Card 8 - Resultado
```

Ou uma interface estilo wizard.

Não precisa implementar UI de chat nesta fase.

---

# 4. Seleção de tenant

## Regras

* Listar tenants ativos e inativos, mas indicar status.
* Permitir selecionar tenant.
* Mostrar:

  * nome
  * slug
  * status
  * plano
  * assinatura
  * WhatsApp habilitado ou não

## Bloqueio

Se tenant não estiver apto para WhatsApp/Typebot:

```text
Este tenant não está disponível para atendimento via Typebot/WhatsApp.
```

Não informar no simulador público porque esta tela é admin. Mas ainda assim evitar linguagem desnecessariamente exposta.

---

# 5. Identificação do cliente

Ao informar:

```text
phone
name
email opcional
```

O simulador deve executar a mesma lógica de:

```http
POST /api/typebot/[tenantSlug]/customers/identify
```

## Resultado esperado

Exibir:

```text
customerId
customerName
customerPhone
sessionId
sessionStatus
```

## Regras

* Reutilizar customer por telefone dentro do tenant.
* Reutilizar/atualizar typebot_session.
* Não criar user CUSTOMER.
* Não exigir senha.
* Não vincular obrigatoriamente `customer.userId`.

---

# 6. Listagem de serviços

O simulador deve executar a mesma lógica de:

```http
GET /api/typebot/[tenantSlug]/services
```

Exibir lista numerada:

```text
1 - Serviço A | duração | preço
2 - Serviço B | duração | preço
```

## Regras

* Mostrar apenas categorias ativas.
* Mostrar apenas serviços ativos.
* Não mostrar serviços de categorias inativas.
* Permitir escolher serviço.

---

# 7. Detalhe do serviço

Após escolher serviço, o simulador deve executar a mesma lógica de:

```http
GET /api/typebot/[tenantSlug]/services/[serviceId]
```

Exibir:

```text
nome
categoria
descrição
duração
preço
bookingMode
customFields
customFieldsText
```

## Campos personalizados

Para cada campo:

```text
label
key
type
required
options
order
```

## Regras

* Campos inativos não aparecem.
* SELECT mostra opções.
* Ordem deve seguir position/order configurado.

---

# 8. Horários disponíveis

O simulador deve executar a mesma lógica de:

```http
GET /api/typebot/[tenantSlug]/services/[serviceId]/slots?days=7
```

Exibir:

```text
number
label
startsAt
endsAt
```

## Regras

* Não mostrar horários no passado.
* Respeitar disponibilidade.
* Respeitar bloqueios.
* Respeitar conflitos.
* Usar duração do serviço.
* Permitir escolher um horário.

---

# 9. Preenchimento de campos personalizados

Se o serviço tiver custom fields ativos, renderizar inputs conforme tipo:

```text
TEXT -> input texto
TEXTAREA -> textarea
NUMBER -> input numérico
DATE -> input date
BOOLEAN -> checkbox/select Sim/Não
SELECT -> select com opções válidas
```

## Regras

* Campos obrigatórios devem ser exigidos na UI.
* SELECT deve permitir apenas opções válidas.
* Mesmo validando na UI, o backend continua sendo a fonte de verdade.
* Montar `customValues` no formato:

```json
[
  {
    "customFieldId": "field_id",
    "value": "valor"
  }
]
```

---

# 10. Criar agendamento

Ao confirmar, o simulador deve executar a mesma lógica de:

```http
POST /api/typebot/[tenantSlug]/appointments
```

Payload conceitual:

```json
{
  "sessionId": "session_id",
  "customerId": "customer_id",
  "serviceId": "service_id",
  "startsAt": "slot_starts_at",
  "customValues": [],
  "customerNotes": "Simulação via painel admin"
}
```

## Regras

* Criar agendamento com `origin = WHATSAPP`.
* `createdByUserId = null`.
* Status conforme `bookingMode`:

  * DIRECT -> CONFIRMED
  * REQUIRES_CONFIRMATION -> REQUESTED
  * INFORMATIONAL -> WAITING_INFO ou REQUESTED
* Criar appointment_event.
* Criar audit log.
* Atualizar typebot_session.
* Validar conflito novamente no momento da criação.

---

# 11. Resultado final

Após criar, exibir:

```text
Agendamento criado com sucesso
appointmentId
status
origin
startsAt
endsAt
mensagem final
```

Também exibir botão/link:

```text
Abrir agendamento no painel
```

Direcionando para:

```text
/app/appointments/[appointmentId]
```

ou rota equivalente de detalhe do agendamento.

## Observação

Como `/app` exige usuário prestador, o Super Admin talvez não tenha acesso direto ao painel do prestador. Se isso for verdade, usar link para uma rota admin futura ou apenas mostrar o ID. Não implementar impersonation nesta fase.

---

# 12. Tratamento de erros

A tela deve mostrar erros seguros retornados pela lógica Typebot:

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
VALIDATION_ERROR
INTERNAL_ERROR
```

## Regras

* Mostrar código e mensagem.
* Não mostrar stack trace.
* Não mostrar segredo, API key, cookie, token ou erro bruto de banco.
* Em desenvolvimento, pode logar detalhes no console/server logs, sem expor na UI.

---

# 13. Logs de simulação

Opcional, mas recomendado:

Na própria tela, exibir um painel de debug com etapas executadas:

```text
business -> ok
identify -> ok
services -> ok
service detail -> ok
slots -> ok
appointment create -> ok
```

Para cada etapa:

```text
request resumido
response resumido
timestamp
```

Não incluir:

```text
API key
cookies
tokens
password_hash
```

---

# 14. Permissões

## Acesso

Somente:

```text
SUPER_ADMIN
```

## Bloqueios

* USER de prestador não acessa `/admin/typebot-simulator`.
* CUSTOMER não acessa `/admin/typebot-simulator`.
* visitante anônimo não acessa.

---

# 15. Organização de código

Seguir estrutura existente.

Sugestão:

```text
src/app/(admin)/admin/typebot-simulator/page.tsx
src/features/typebot-simulator/
src/features/typebot-simulator/typebot-simulator-actions.ts
src/features/typebot-simulator/typebot-simulator-form.tsx
src/features/typebot-simulator/typebot-simulator-schema.ts
src/features/typebot-simulator/typebot-simulator-types.ts
```

Regras:

* Server actions em arquivo server-side.
* Componentes interativos com `"use client"`.
* Não misturar API key no client.
* Não expor `TYPEBOT_API_KEY` no navegador.
* Não fazer chamada HTTP client-side para `/api/typebot` com API key.
* A simulação deve acontecer via server action ou services internos.

---

# 16. README e documentação

Atualizar README com:

```text
Phase 09 - Typebot Flow Simulator
```

Informar:

```text
- simulador interno disponível em /admin/typebot-simulator
- uso restrito a SUPER_ADMIN
- permite validar fluxo Typebot sem WhatsApp real
- não envia mensagens
- não substitui Typebot real
```

Criar ou atualizar:

```text
/docs/typebot/simulator.md
```

Documentar:

```text
- objetivo
- rota
- permissões
- fluxo
- limitações
- como testar
```

---

# Fora do escopo

Não implementar:

```text
WhatsApp Cloud API
webhook WhatsApp
envio ativo de mensagens
integração real com Typebot
instalação/configuração do Typebot
painel visual de bot
tokens por tenant
área do cliente
cancelamento pelo WhatsApp
remarcação pelo WhatsApp
pagamento
lembretes
impersonation de tenant
chat real
```

---

# Critérios de aceite

* `/admin/typebot-simulator` existe.
* Apenas SUPER_ADMIN acessa.
* Visitante anônimo é redirecionado/bloqueado.
* USER prestador não acessa.
* CUSTOMER não acessa.
* Super Admin consegue selecionar tenant.
* Simulador valida tenant apto para WhatsApp.
* Simulador identifica/cria cliente por telefone.
* Simulador cria/reutiliza typebot_session.
* Simulador lista serviços ativos.
* Simulador busca detalhe do serviço.
* Simulador mostra custom fields ativos.
* Simulador busca slots disponíveis.
* Simulador permite escolher slot.
* Simulador renderiza inputs de custom fields.
* Simulador cria agendamento com `origin = WHATSAPP`.
* Agendamento criado aparece no painel de agendamentos.
* `createdByUserId = null` no agendamento via simulador.
* `appointment_event` é criado.
* Audit log é criado.
* Erros são exibidos de forma segura.
* README atualizado.
* `/docs/typebot/simulator.md` criado.
* Nenhuma migration criada.
* Nenhuma regra de negócio crítica duplicada.
* Link público web continua funcionando.
* Endpoints Typebot continuam funcionando.
* `pnpm typecheck`, `pnpm lint`, `pnpm test` e `pnpm build` passam.

---

# Instruções para o DeepSeek

Implemente somente a Phase 09 Typebot Flow Simulator.

Não implemente WhatsApp real, webhook, envio ativo, Typebot real, painel de bot, cancelamento, remarcação, pagamento ou lembretes.

Não crie migrations.

Preserve as regras existentes e reutilize a lógica da API Typebot/booking-core.

Ao finalizar, informe:

```text
- arquivos criados
- arquivos alterados
- rota implementada
- se houve migration
- como testar
- validações executadas
- pendências conhecidas
```
