# Variáveis do Typebot

Todas as variáveis que devem ser configuradas no Typebot para orquestrar o fluxo conversacional.

---

## Variáveis de ambiente / configuração

Estas são configuradas uma vez no Typebot (bloco de código ou variáveis globais) e não mudam durante a conversa.

| Variável | Tipo | Descrição | Exemplo |
|---|---|---|---|
| `apiBaseUrl` | `string` | URL base da API do AgendaZap | `https://agenda.exemplo.com` |
| `tenantSlug` | `string` | Slug do prestador | `mecanica-silva` |
| `typebotApiKey` | `string` | Chave da API Typebot (mesmo valor de `TYPEBOT_API_KEY`) | `chave-secreta-aqui` |

**Regras:**

- `apiBaseUrl` **nunca** deve terminar com `/`.
- `typebotApiKey` é secreta — configurar apenas no bloco HTTP, nunca exposta em frontend público.
- Em produção, usar HTTPS obrigatoriamente.

---

## Variáveis da conversa

Estas variáveis mudam durante a conversa e são populadas pela interação com o cliente ou pelas chamadas HTTP.

### Identificação do cliente

| Variável | Origem | Descrição | Exemplo |
|---|---|---|---|
| `customerPhone` | WhatsApp ou input do cliente | Telefone com DDD, somente dígitos | `55999999999` |
| `customerName` | Input do cliente | Nome completo | `João Silva` |
| `customerEmail` | Input do cliente (opcional) | E-mail | `joao@email.com` |
| `customerId` | Resposta de `POST /identify` | UUID do cliente no AgendaZap | `550e8400-...` |
| `sessionId` | Resposta de `POST /identify` | UUID da sessão Typebot | `550e8400-...` |

**Regras:**

- `customerPhone` deve vir **preferencialmente do número do WhatsApp** (campo de sistema do canal).
- Se o canal não fornecer telefone automaticamente, perguntar ao cliente.
- `customerId` e `sessionId` **nunca** devem ser digitados pelo cliente — são sempre recebidos da API.
- `customerEmail` pode ficar vazio — não é obrigatório.

### Serviços

| Variável | Origem | Descrição | Exemplo |
|---|---|---|---|
| `servicesJson` | Resposta de `GET /services` | Array completo de serviços (JSON) | `[{ "number": 1, "id": "...", ... }]` |
| `servicesText` | Resposta de `GET /services` | Lista formatada para exibição | `1 - Troca de óleo \| 30 min \| A partir de R$ 80,00\n2 - ...` |
| `selectedServiceNumber` | Input do cliente | Número digitado pelo cliente | `1` |
| `selectedServiceId` | Mapeamento de `servicesJson` | UUID do serviço escolhido | `550e8400-...` |
| `selectedServiceName` | Mapeamento de `servicesJson` | Nome do serviço escolhido | `Troca de óleo` |
| `selectedServiceDetailsJson` | Resposta de `GET /services/{id}` | Objeto completo do serviço (detalhe) | `{ "id": "...", "name": "...", "customFields": [...] }` |
| `customFieldsJson` | `selectedServiceDetailsJson.customFields` | Array de campos personalizados ativos | `[{ "id": "...", "key": "...", "type": "TEXT", ... }]` |
| `customFieldsText` | Resposta de `GET /services/{id}` | Texto pronto para perguntar os campos | `Preciso de mais algumas informações:\n\n1 - Placa...` |
| `customValuesJson` | Montado pelo Typebot | Array de custom values para o body | `[{ "customFieldId": "...", "value": "ABC-1234" }]` |

**Regras:**

- `selectedServiceNumber` é o número que o cliente digitou (ex: `"1"`).
- `selectedServiceId` deve ser obtido de `services[selectedServiceNumber - 1].id`.
- O Typebot **não** deve usar o número digitado como ID — sempre mapear via array.
- Validar que `selectedServiceNumber` está dentro do intervalo `[1, services.length]`.

### Horários

| Variável | Origem | Descrição | Exemplo |
|---|---|---|---|
| `slotsJson` | Resposta de `GET /slots` | Array completo de slots (JSON) | `[{ "number": 1, "startsAt": "...", ... }]` |
| `slotsText` | Resposta de `GET /slots` | Lista formatada para exibição | `1 - 29/06/2026 14:00\n2 - ...` |
| `selectedSlotNumber` | Input do cliente | Número digitado pelo cliente | `1` |
| `selectedSlotStartsAt` | Mapeamento de `slotsJson` | ISO timestamp do slot escolhido | `2026-06-29T14:00:00.000Z` |
| `selectedSlotLabel` | Mapeamento de `slotsJson` | Label do slot para exibição | `29/06/2026 14:00` |

**Regras:**

- O Typebot **não** deve montar `startsAt` manualmente — usar exatamente o valor retornado pela API.
- `selectedSlotStartsAt` é o que vai no body do `POST /appointments`.
- `selectedSlotLabel` é usado apenas para exibição ao cliente.

### Campos personalizados

| Variável | Origem | Descrição | Exemplo |
|---|---|---|---|
| `selectedServiceDetailsJson` | Resposta de `GET /services/{id}` | Objeto completo do serviço | `{ "id": "...", "name": "...", "customFields": [...] }` |
| `customFieldsJson` | `selectedServiceDetailsJson.customFields` | Array de campos personalizados ativos | `[{ "id": "...", "key": "...", "type": "TEXT", ... }]` |
| `customFieldsText` | Resposta de `GET /services/{id}` | Texto pronto para perguntar os campos | `Preciso de mais algumas informações:\n\n1 - Placa...` |
| `customValuesJson` | Montado pelo Typebot | Array de custom values para o body de POST /appointments | `[{ "customFieldId": "...", "value": "ABC-1234" }]` |

**Regras:**

- Chamar `GET /services/{selectedServiceId}` após o cliente escolher o serviço para obter `customFields`.
- Se `customFields` estiver vazio, pular a etapa de coleta e enviar `[]` em `customValues`.
- Para cada campo em `customFields`, usar `customFieldsText` para perguntar ao cliente ou iterar campo por campo.
- `customFieldId` deve ser o `id` do campo retornado pela API (UUID).
- `value` deve ser a resposta do cliente como string.
- Para campos SELECT, validar que a resposta está em `options`.
- O formato deve ser exatamente:

```json
[
  { "customFieldId": "uuid-do-campo", "value": "resposta do cliente" }
]
```

### Agendamento

| Variável | Origem | Descrição | Exemplo |
|---|---|---|---|
| `customerNotes` | Input do cliente (opcional) | Observações do cliente | `Prefere atendimento rápido` |
| `appointmentId` | Resposta de `POST /appointments` | UUID do agendamento criado | `550e8400-...` |
| `appointmentStatus` | Resposta de `POST /appointments` | Status do agendamento | `CONFIRMED` |
| `appointmentMessage` | Resposta de `POST /appointments` | Mensagem pronta para o cliente | `Agendamento confirmado com sucesso.` |

**Regras:**

- `customerNotes` é opcional — se vazio, enviar string vazia ou omitir.
- `appointmentMessage` já vem pronto da API conforme o `bookingMode` — exibir diretamente.

### Dados do negócio

| Variável | Origem | Descrição | Exemplo |
|---|---|---|---|
| `tenantName` | Resposta de `GET /business` | Nome do prestador | `Mecânica Silva` |
| `tenantWhatsapp` | Resposta de `GET /business` | WhatsApp do prestador | `55999999999` |
| `tenantCity` | Resposta de `GET /business` | Cidade | `Panambi` |
| `tenantState` | Resposta de `GET /business` | Estado (UF) | `RS` |

---

## Escopo das variáveis no Typebot

- **Globais / de ambiente:** `apiBaseUrl`, `tenantSlug`, `typebotApiKey` — definidas uma vez, nunca redefinidas na conversa.
- **Da conversa:** todas as demais — preenchidas e consumidas durante o fluxo.
- **Temporárias:** resultados intermediários de parse (ex: índice do array) podem ser descartados após o mapeamento.

---

## Como mapear número digitado para item do array

### Serviços

```
Cliente digita: "1"

1. Converter para número: selectedServiceNumber = 1
2. Acessar array: services[0]  (índice = selectedServiceNumber - 1)
3. Extrair: selectedServiceId = services[0].id
4. Extrair: selectedServiceName = services[0].name
```

### Horários

```
Cliente digita: "3"

1. Converter para número: selectedSlotNumber = 3
2. Acessar array: slots[2]  (índice = selectedSlotNumber - 1)
3. Extrair: selectedSlotStartsAt = slots[2].startsAt
4. Extrair: selectedSlotLabel = slots[2].label
```

### Validação de opção

```
Se selectedNumber < 1 OU selectedNumber > array.length:
  → Exibir: "Não encontrei essa opção. Por favor, digite um dos números da lista."
  → Voltar para captura do número.
```

---

## Referências

- [Fluxo conversacional](./flow-blueprint.md)
- [Chamadas HTTP](./http-requests.md)
- [Documentação da API Typebot](../technical/typebot-api.md)
