# Variáveis e Mapeamento — Typebot Real

> **Documento histórico.** A lista vigente está em
> [`variables.md`](./variables.md) e já vem declarada no JSON importável do MVP.

Todas as variáveis que devem ser criadas na aba **Variables** do Typebot antes
de montar os blocos. Este documento complementa [variables.md](./variables.md)
com foco na configuração prática no Typebot real.

---

## Variáveis de configuração injetadas

Estas variáveis são declaradas no blueprint e preenchidas pelo Agendaí no
`startChat`. Não devem existir blocos **Set variable** com valores fixos no fluxo
de produção.

| Variável | Tipo no Typebot | Valor | Exemplo |
|---|---|---|---|
| `apiBaseUrl` | Text | URL pública do Agendaí | Injetada pelo backend |
| `tenantSlug` | Text | Slug do tenant resolvido pela instância | Injetada pelo backend |
| `typebotApiKey` | Text | Credencial ativa do tenant | Injetada pelo backend |
| `phone` | Text | Telefone normalizado do remetente | Injetada pelo backend |

**Como configurar no Typebot:**

1. Publique o blueprint sem valores fixos para essas variáveis.
2. Configure `publicId` e credencial no Agendaí para o mesmo tenant.
3. Use **Variables for test** somente no Preview web, nunca na publicação.
4. `typebotApiKey` nunca deve aparecer em mensagens, logs ou compartilhamentos.

**Cada prestador tem seu próprio bot e seu próprio token.** Se você atende 3
prestadores, são 3 bots no Typebot, cada um com seu `tenantSlug` e seu token
de credencial (`agz_tb_`). O `apiBaseUrl` pode ser igual se todos usam o mesmo
AgendaZap. O `typebotApiKey` **não** pode ser compartilhado entre tenants.

---

## Variáveis da conversa (dinâmicas)

Criar todas antes de montar os blocos. São preenchidas durante o fluxo.

### Dados do negócio

| Variável | Preenchida por | Descrição |
|---|---|---|
| `tenantName` | `GET /business` → `response.tenant.name` | Nome do prestador |
| `tenantWhatsapp` | `GET /business` → `response.tenant.whatsapp` | WhatsApp do prestador |
| `tenantCity` | `GET /business` → `response.tenant.city` | Cidade |
| `tenantState` | `GET /business` → `response.tenant.state` | Estado (UF) |

### Identificação do cliente

| Variável | Preenchida por | Descrição |
|---|---|---|
| `customerPhone` | Canal WhatsApp (automático) ou input | Telefone com DDD, só dígitos |
| `customerName` | Input do cliente | Nome completo |
| `customerEmail` | Input do cliente (opcional) | E-mail |
| `customerId` | `POST /identify` → `response.customer.id` | UUID do cliente |
| `sessionId` | `POST /identify` → `response.session.id` | UUID da sessão |

### Serviços

| Variável | Preenchida por | Descrição |
|---|---|---|
| `servicesJson` | `GET /services` → `response.services` | Array completo (JSON) |
| `servicesText` | `GET /services` → `response.text` | Texto formatado para exibição |
| `selectedServiceNumber` | Input do cliente (número digitado) | Ex: `"1"` |
| `selectedServiceId` | Mapeamento lógico | UUID do serviço escolhido |
| `selectedServiceName` | Mapeamento lógico ou `GET /services/{id}` | Nome do serviço |

### Detalhe do serviço e campos personalizados

| Variável | Preenchida por | Descrição |
|---|---|---|
| `selectedServiceDetailsJson` | `GET /services/{id}` → `response.service` | Objeto completo do serviço |
| `customFieldsJson` | `selectedServiceDetailsJson.customFields` | Array de campos ativos |
| `customFieldsText` | `GET /services/{id}` → `response.customFieldsText` | Texto pronto para exibição |
| `customValuesJson` | Montado pelo Typebot | Array para o body do POST |

### Horários

| Variável | Preenchida por | Descrição |
|---|---|---|
| `slotsJson` | `GET /slots` → `response.slots` | Array completo (JSON) |
| `slotsText` | `GET /slots` → `response.text` | Texto formatado para exibição |
| `selectedSlotNumber` | Input do cliente (número digitado) | Ex: `"1"` |
| `selectedSlotStartsAt` | Mapeamento lógico | ISO 8601 do slot |
| `selectedSlotLabel` | Mapeamento lógico | Label para exibição |

### Resultado

| Variável | Preenchida por | Descrição |
|---|---|---|
| `customerNotes` | Input do cliente (opcional) | Observações |
| `appointmentId` | `POST /appointments` → `response.appointment.id` | UUID do agendamento |
| `appointmentStatus` | `POST /appointments` → `response.appointment.status` | `CONFIRMED`/`REQUESTED`/`WAITING_INFO` |
| `appointmentMessage` | `POST /appointments` → `response.message` | Mensagem pronta para o cliente |
| `appointmentJson` | `GET /appointments/{id}` → `response.appointment` | Dados completos (consulta) |

### Controle de erro

| Variável | Preenchida por | Descrição |
|---|---|---|
| `lastErrorCode` | Resposta de erro da API | Código do erro (`SLOT_UNAVAILABLE`, etc.) |
| `lastErrorMessage` | Resposta de erro da API | Mensagem segura para o cliente |

---

## Mapeamento de listas numeradas

### Serviços — como mapear número → serviceId

A API retorna `servicesJson` neste formato:

```json
[
  { "number": 1, "id": "uuid-abc", "name": "Troca de óleo", ... },
  { "number": 2, "id": "uuid-def", "name": "Alinhamento", ... }
]
```

O cliente digita um número (ex: `"1"`). O Typebot deve:

```
1. Converter para inteiro: selectedServiceNumber = 1
2. Acessar array: servicesJson[0]  (índice = selectedServiceNumber - 1)
3. Extrair ID: selectedServiceId = servicesJson[0].id
4. Extrair nome: selectedServiceName = servicesJson[0].name
```

**Validação:**

```
Se selectedServiceNumber < 1 OU selectedServiceNumber > servicesJson.length:
  → "Não encontrei essa opção. Digite um número da lista."
  → Voltar para captura do número
```

### Horários — como mapear número → startsAt

A API retorna `slotsJson` neste formato:

```json
[
  { "number": 1, "startsAt": "2026-06-29T14:00:00.000Z", "label": "29/06/2026 14:00" },
  { "number": 2, "startsAt": "2026-06-29T15:00:00.000Z", "label": "29/06/2026 15:00" }
]
```

O cliente digita um número (ex: `"1"`). O Typebot deve:

```
1. Converter para inteiro: selectedSlotNumber = 1
2. Acessar array: slotsJson[0]  (índice = selectedSlotNumber - 1)
3. Extrair startsAt: selectedSlotStartsAt = slotsJson[0].startsAt
4. Extrair label: selectedSlotLabel = slotsJson[0].label
```

**Validação:** igual à de serviços — verificar intervalo `[1, slotsJson.length]`.

---

## Coleta de campos personalizados

### Se `customFieldsJson` estiver vazio

```
customValuesJson = []
```
Pular a etapa de coleta. Ir direto para confirmação.

### Se houver campos

Para cada campo em `customFieldsJson`, criar um bloco de input adequado ao tipo:

| `field.type` | Input no Typebot | Validação |
|---|---|---|
| `TEXT` | Text input | — |
| `TEXTAREA` | Text input (longo) | — |
| `NUMBER` | Number input | Apenas dígitos |
| `DATE` | Date input | Formato de data |
| `BOOLEAN` | Choice (Sim/Não) | Normalizar para "Sim" ou "Não" |
| `SELECT` | Choice com as opções de `field.options` | Valor deve estar em `options` |

### Montagem do customValuesJson

Após coletar todos os campos, montar o array:

```json
[
  { "customFieldId": "uuid-do-campo-1", "value": "ABC-1234" },
  { "customFieldId": "uuid-do-campo-2", "value": "Motor" }
]
```

Onde:
- `customFieldId` = `field.id` do item em `customFieldsJson`
- `value` = resposta do cliente (sempre string)

### Se a API retornar erro de validação

Se o `POST /appointments` retornar `CUSTOM_FIELD_REQUIRED` ou
`CUSTOM_FIELD_INVALID`, o Typebot deve voltar para a coleta do campo
problemático. A validação final sempre é do backend.

---

## Regras importantes

1. **`tenantSlug` é fixo por bot** — cada prestador tem seu próprio bot Typebot
2. **`typebotApiKey` é o token da credencial do tenant** — gerado no painel admin,
   prefixo `agz_tb_`, exibido apenas uma vez. Nunca é exibido em mensagem.
3. **`customerPhone` deve vir do WhatsApp** sempre que o canal fornecer
   automaticamente
4. **`selectedServiceId` vem da lista retornada pela API** — nunca digitado
   manualmente pelo cliente
5. **`selectedSlotStartsAt` vem da lista de slots retornada pela API** — usar o
   valor exato, sem manipular data/hora
6. **`customValuesJson` é montado a partir dos `customFields` retornados pelo
   endpoint de detalhe** — os `customFieldId` são os UUIDs da API

---

## Referências

- [Guia principal](./real-setup-guide.md)
- [Blocos HTTP](./real-http-blocks.md)
- [Passo a passo dos blocos](./real-flow-steps.md)
- [Variáveis do Typebot (referência)](./variables.md)
