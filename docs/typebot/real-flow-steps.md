# Passo a Passo dos Blocos — Typebot Real

> **Documento histórico.** O fluxo importável do MVP substitui esta montagem
> manual. Use [`agendai-mvp.typebot.json`](./agendai-mvp.typebot.json) e o
> [guia de importação](./real-setup-guide.md). Não copie URLs, credenciais ou
> mensagens deste roteiro antigo.

Roteiro de montagem bloco a bloco no editor do Typebot, na ordem exata em que
devem aparecer no fluxo conversacional. Este documento complementa o
[flow-blueprint.md](./flow-blueprint.md) com foco na montagem prática.

---

## Estrutura geral

O fluxo tem 26 blocos no caminho principal e branches de erro para cada HTTP.
Use grupos (folders) no Typebot para organizar:

```
📁 Início
   ├── Start
   ├── Variáveis de sessão injetadas pelo Agendaí no startChat
   └── HTTP - Business
📁 Boas-vindas
   ├── Message - Abertura
   └── Message - Menu
📁 Cliente
   ├── Input - Nome
   ├── Input - Telefone (se necessário)
   ├── Input - E-mail
   └── HTTP - Identify
📁 Serviços
   ├── HTTP - Services
   ├── Message - Lista de serviços
   ├── Input - Número do serviço
   ├── Logic - Mapear número → ID
   ├── HTTP - Service Detail
   └── Message - Resumo do serviço
📁 Campos personalizados (se houver)
   ├── Conditional - Tem campos?
   ├── Inputs - Um por campo
   └── Logic - Montar customValuesJson
📁 Horários
   ├── HTTP - Slots
   ├── Message - Lista de horários
   ├── Input - Número do horário
   └── Logic - Mapear número → startsAt
📁 Confirmação
   ├── Message - Resumo
   ├── Choice - Confirmar / Cancelar
   └── HTTP - Create Appointment
📁 Resultado
   ├── HTTP - Query (opcional)
   ├── Message - CONFIRMED
   ├── Message - REQUESTED
   └── Message - WAITING_INFO
📁 Erros
   ├── Message - Business indisponível
   ├── Message - Serviço não encontrado
   ├── Message - Sem horários
   ├── Message - Slot ocupado
   └── Message - Erro genérico
```

---

## Bloco a bloco

### 1. Start

Tipo: **Start** (nativo do Typebot)

Início do fluxo. Conecta ao bloco seguinte.

---

### 2. Set variables — Configuração

Tipo: **Set variable**

Definir as três variáveis fixas:

```
apiBaseUrl    = injetada pelo Agendaí a partir de AGENDAI_PUBLIC_URL
tenantSlug    = injetada a partir do tenant resolvido pela instância Evolution
typebotApiKey = credencial ativa cifrada do mesmo tenant
phone         = telefone normalizado do remetente
```

---

### 3. HTTP — Business

Tipo: **HTTP**

Configuração detalhada em [real-http-blocks.md](./real-http-blocks.md) — bloco 1.

**Branch sucesso** → Bloco 4 (Message - Abertura)

**Branch erro** → Bloco de tratamento de erro (ver seção de erros abaixo)

---

### 4. Message — Abertura

Tipo: **Message**

```
Olá! Eu sou o assistente virtual de {{tenantName}}.

Vou te ajudar a escolher um serviço e verificar os horários disponíveis.
```

---

### 5. Message — Menu inicial

Tipo: **Message**

```
Digite uma opção:

1 - Agendar um serviço
2 - Ver serviços disponíveis
3 - Falar com atendimento
```

**Opção 1** → Bloco 7 (Input - Nome)

**Opção 2** → Bloco 11 (HTTP - Services), depois Bloco 12 (lista de serviços)

**Opção 3** → Mensagem de atendimento (WhatsApp, endereço), depois End

---

### 6–9. Telefone e identificação segura

No canal WhatsApp, `phone` já é injetada pelo Agendaí no `startChat`. No Preview,
se ela estiver vazia, o fluxo abre diretamente o input de telefone.

O bloco HTTP executa primeiro `LOOKUP`. Um resultado `FOUND` apresenta o nome e
exige `CONFIRM`; `NOT_FOUND` pede diretamente o nome e executa `CREATE` com o
`sessionId`. Ao escolher “Não sou eu”, o mesmo `CREATE` recebe
`rejectedExisting: true`. `AMBIGUOUS` residual falha de forma segura e não cria
outro cadastro arbitrariamente.

Configuração em [real-http-blocks.md](./real-http-blocks.md) — bloco 2. O
blueprint importável é a fonte de verdade para os grupos e edges atuais.

---

### 10. HTTP — Services

Tipo: **HTTP**

Configuração em [real-http-blocks.md](./real-http-blocks.md) — bloco 3.

**Branch sucesso** → Bloco 11 (Message - Serviços)

**Branch erro** → Tratamento de erro

---

### 11. Message — Lista de serviços

Tipo: **Message**

```
{{tenantName}} oferece estes serviços:

{{servicesText}}

Digite o número do serviço que você deseja agendar.
```

---

### 12. Input — Número do serviço

Tipo: **Input**

```
Salvar em: selectedServiceNumber
```

---

### 13. Logic — Mapear serviço

Tipo: **Script / Set variable** (bloco de lógica do Typebot)

```
1. Converter selectedServiceNumber para inteiro
2. Verificar se 1 <= número <= servicesJson.length
3. Se inválido → voltar ao input (mensagem: "Não encontrei essa opção.")
4. Se válido:
   selectedServiceId   = servicesJson[selectedServiceNumber - 1].id
   selectedServiceName = servicesJson[selectedServiceNumber - 1].name
```

**Em caso de número inválido:**

```
"Não encontrei essa opção. Digite um número da lista."
→ Voltar para bloco 12
```

---

### 14. HTTP — Service Detail

Tipo: **HTTP**

Configuração em [real-http-blocks.md](./real-http-blocks.md) — bloco 4.

**Branch sucesso** → Bloco 15 (Message - Resumo do serviço)

**Branch erro (`SERVICE_NOT_FOUND`)** → "Esse serviço não está disponível."
→ Voltar para bloco 11 (lista de serviços)

---

### 15. Message — Resumo do serviço

Tipo: **Message**

```
Você escolheu: *{{selectedServiceDetailsJson.name}}*

⏱️ Duração: {{selectedServiceDetailsJson.durationMinutes}} minutos
💰 Valor: {{selectedServiceDetailsJson.priceText}}

{{#if customFieldsText}}{{customFieldsText}}{{/if}}

Vou buscar os próximos horários disponíveis...
```

---

### 16. Conditional — Tem campos personalizados?

Tipo: **Conditional**

```
Se customFieldsJson.length > 0:
  → Bloco 17 (Coletar campos personalizados)
Senão:
  customValuesJson = []
  → Bloco 18 (HTTP - Slots)
```

---

### 17. Inputs — Coletar campos personalizados

Tipo: **Input** (um por campo, iterando `customFieldsJson`)

Para cada campo, usar o tipo de input apropriado:

| Tipo do campo | Input Typebot | Observação |
|---|---|---|
| `TEXT` | Text | — |
| `TEXTAREA` | Text | Texto longo |
| `NUMBER` | Number | Validar que é número |
| `DATE` | Date | Formato de data |
| `BOOLEAN` | Choice | Opções: Sim / Não |
| `SELECT` | Choice | Opções: `field.options` |

**Pergunta:** `{{customField.label}}` (com " (obrigatório)" se `required: true`)

Armazenar respostas em variáveis temporárias por campo, depois montar
`customValuesJson`:

```json
[
  { "customFieldId": "{{customFieldsJson[0].id}}", "value": "{{tempField0}}" },
  { "customFieldId": "{{customFieldsJson[1].id}}", "value": "{{tempField1}}" }
]
```

---

### 18. HTTP — Slots

Tipo: **HTTP**

Configuração em [real-http-blocks.md](./real-http-blocks.md) — bloco 5.

**Branch sucesso** → Bloco 19 (Message - Horários)

**Branch erro (`NO_SLOTS_AVAILABLE`)** → Mensagem específica. Ver seção de erros.

**Branch erro (`SERVICE_NOT_FOUND`)** → Voltar para serviços.

---

### 19. Message — Lista de horários

Tipo: **Message**

```
Estes são os próximos horários disponíveis para *{{selectedServiceName}}*:

{{slotsText}}

Digite o número do horário desejado.
```

---

### 20. Input — Número do horário

Tipo: **Input**

```
Salvar em: selectedSlotNumber
```

---

### 21. Logic — Mapear horário

Tipo: **Script / Set variable**

```
1. Converter selectedSlotNumber para inteiro
2. Verificar se 1 <= número <= slotsJson.length
3. Se inválido → voltar ao input
4. Se válido:
   selectedSlotStartsAt = slotsJson[selectedSlotNumber - 1].startsAt
   selectedSlotLabel    = slotsJson[selectedSlotNumber - 1].label
```

**Em caso de número inválido:** "Não encontrei essa opção." → Voltar para bloco 20.

---

### 22. Message — Resumo para confirmação

Tipo: **Message**

```
Confirme os dados do agendamento:

📋 Serviço: {{selectedServiceName}}
📅 Data e horário: {{selectedSlotLabel}}
👤 Nome: {{customerName}}
{{#if customerNotes}}📝 Observação: {{customerNotes}}{{/if}}
```

---

### 23. Choice — Confirmar ou Cancelar

Tipo: **Choice**

```
Opção 1: "1 - Confirmar agendamento"    → Bloco 24 (HTTP - Create)
Opção 2: "2 - Cancelar"                 → Mensagem de desistência → End
```

---

### 24. HTTP — Create Appointment

Tipo: **HTTP**

Configuração em [real-http-blocks.md](./real-http-blocks.md) — bloco 6.

**Branch sucesso** → Bloco 25 (Query, opcional) ou Bloco 26 (Mensagem final)

**Branch erro (`SLOT_UNAVAILABLE`)** → "Esse horário acabou de ficar indisponível."
→ Voltar para bloco 18 (HTTP - Slots)

**Branch erro (`CUSTOM_FIELD_REQUIRED` / `CUSTOM_FIELD_INVALID`)** →
Voltar para coleta de campos (bloco 17)

**Branch erro (`SESSION_NOT_FOUND`)** → "Atendimento interrompido."
→ Reiniciar fluxo

---

### 25. HTTP — Query Appointment (opcional)

Tipo: **HTTP**

Configuração em [real-http-blocks.md](./real-http-blocks.md) — bloco 7.

Usado para obter dados completos do agendamento (nome do serviço, preço) e
montar mensagem final mais rica.

---

### 26. Mensagens finais conforme status

Tipo: **Conditional** + **Message**

#### Se `appointmentStatus = CONFIRMED`

```
✅ Agendamento confirmado com sucesso!

📋 Serviço: {{selectedServiceName}}
📅 Data e horário: {{selectedSlotLabel}}
👤 Nome: {{customerName}}

Obrigado por agendar com {{tenantName}}!
```

#### Se `appointmentStatus = REQUESTED`

```
📩 Sua solicitação foi enviada e aguarda confirmação.

📋 Serviço: {{selectedServiceName}}
📅 Data e horário solicitado: {{selectedSlotLabel}}
👤 Nome: {{customerName}}

{{tenantName}} vai analisar sua solicitação e confirmar em breve.

Qualquer dúvida, entre em contato: {{tenantWhatsapp}}
```

#### Se `appointmentStatus = WAITING_INFO`

```
📩 Sua solicitação foi enviada com sucesso.

📋 Serviço: {{selectedServiceName}}
👤 Nome: {{customerName}}

{{tenantName}} entrará em contato para dar continuidade ao seu atendimento.

📞 WhatsApp: {{tenantWhatsapp}}
📍 {{tenantCity}}/{{tenantState}}
```

---

### 27. End

Tipo: **End** (nativo do Typebot)

---

## Tratamento de erros

Cada bloco HTTP deve ter um branch de erro configurado. A tabela completa de
códigos e mensagens está em [error-handling.md](./error-handling.md).

### Blocos de erro recomendados

Crie estes blocos de mensagem e redirecione os branches de erro para eles:

**BUSINESS_UNAVAILABLE:**
```
Este atendimento está temporariamente indisponível.
Entre em contato diretamente com o estabelecimento.
→ End
```

**NO_SLOTS_AVAILABLE:**
```
No momento não encontrei horários disponíveis para *{{selectedServiceName}}* nos próximos dias.

Você pode:
1 - Escolher outro serviço
2 - Falar com atendimento
```

**SLOT_UNAVAILABLE:**
```
Esse horário acabou de ficar indisponível.
Vou buscar os horários atualizados para você.
→ Voltar para HTTP - Slots
```

**SERVICE_NOT_FOUND:**
```
Esse serviço não está disponível no momento.
Vou te mostrar a lista atualizada de serviços.
→ Voltar para HTTP - Services
```

**SESSION_NOT_FOUND:**
```
Seu atendimento foi interrompido por inatividade.
Vamos começar novamente.
→ Voltar para Start
```

**Erro genérico (fallback):**
```
Tive um problema ao processar sua solicitação.
Tente novamente em alguns instantes ou entre em contato diretamente pelo WhatsApp: {{tenantWhatsapp}}
→ End
```

---

## Fluxo alternativo — só consultar serviços

```
1. Cliente digita "2 - Ver serviços disponíveis" no menu (bloco 5)
2. Typebot chama HTTP - Services
3. Exibe lista de serviços
4. Pergunta: "Digite o número do serviço para ver horários ou 0 para voltar."
5. Se cliente digitar número → mapear → HTTP - Service Detail → HTTP - Slots
6. Se digitar 0 → voltar ao menu (bloco 5)
```

---

## Fluxo alternativo — falar com atendimento

```
1. Cliente digita "3 - Falar com atendimento" no menu (bloco 5)
2. Typebot exibe:
   "Você pode entrar em contato diretamente com {{tenantName}}:
    📞 WhatsApp: {{tenantWhatsapp}}
    📍 {{tenantCity}}/{{tenantState}}
    Estamos à disposição!"
3. End
```

---

## Regras importantes

- O Typebot **não** deve calcular disponibilidade
- O Typebot **não** deve montar `startsAt` manualmente — usar o valor da API
- O Typebot **não** deve confiar em texto livre para `serviceId` — mapear via array
- O Typebot deve **sempre** usar os IDs retornados pela API
- Campos obrigatórios (`required: true`) devem ser exigidos na conversa
- A validação final é sempre do backend — se a API rejeitar, voltar e corrigir

---

## Referências

- [Guia principal](./real-setup-guide.md)
- [Blocos HTTP](./real-http-blocks.md)
- [Variáveis e mapeamento](./real-variable-mapping.md)
- [Mensagens ao cliente](./messages.md)
- [Tratamento de erros](./error-handling.md)
- [Blueprint do fluxo](./flow-blueprint.md)
