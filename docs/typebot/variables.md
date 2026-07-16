# Variáveis do blueprint Typebot do Agendaí

O arquivo [`agendai-mvp.typebot.json`](./agendai-mvp.typebot.json) já declara
todas as variáveis. Após importar, somente três precisam ser configuradas
manualmente.

## Configuração obrigatória

| Variável | Sensível | Descrição |
|---|---:|---|
| `apiBaseUrl` | não | Origem HTTPS do Agendaí, sem barra final |
| `tenantSlug` | não | Slug exato do tenant |
| `typebotApiKey` | sim | Credencial `agz_tb_...` pertencente ao mesmo tenant |

Essas variáveis estão vazias no JSON importável. Nunca versione valores reais,
copie o token para mensagens ou use o token de um tenant em outro bot.

`TYPEBOT_API_KEY` é uma variável do servidor Agendaí para fallback legado em
desenvolvimento. Ela não é o valor recomendado para `typebotApiKey` em produção.

## Variáveis preenchidas pela API

| Grupo | Variáveis |
|---|---|
| Estabelecimento | `tenantName`, `tenantWhatsapp` |
| Atendimento | `tenantWhatsappUrl`, `handoffRequested` |
| Categorias | `categoryLabels`, `categoryIds`, `categoryCount` |
| Categoria escolhida | `selectedCategoryLabel`, `selectedCategoryId` |
| Serviços | `serviceNames`, `serviceIds`, `serviceBookingModes`, `serviceCount` |
| Serviço escolhido | `selectedServiceName`, `selectedServiceId`, `selectedBookingMode` |
| Datas | `availableDateLabels`, `availableDateValues`, `availableDateChoiceCount`, `nextStartDate` |
| Data escolhida | `selectedDateLabel`, `selectedDate` |
| Turnos | `periodLabels`, `periodValues`, `periodCount` |
| Turno escolhido | `selectedPeriodLabel`, `selectedPeriod` |
| Horários | `slotLabels`, `slotStartsAt`, `slotCount` |
| Horário escolhido | `selectedSlotLabel`, `selectedSlotStartsAt` |
| Perguntas | `customFieldIds`, `customFieldLabels`, `customFieldTypes`, `customFieldRequiredFlags`, `customFieldOptionsJson`, `customFieldCount` |
| Pergunta atual | `customFieldIndex`, `currentCustomFieldId`, `currentCustomFieldLabel`, `currentCustomFieldType`, `currentCustomFieldRequired`, `currentCustomFieldOptions`, `currentCustomFieldAnswer` |
| Respostas | `customValuesJson`, `customValuesSummarySection` |
| Cliente | `customerLookupStatus`, `matchedCustomerName`, `customerId`, `sessionId` |
| Agendamento | `appointmentId`, `appointmentStatus` |
| Diagnóstico interno | `httpStatus`, `apiErrorCode` |

`httpStatus` e `apiErrorCode` são usados apenas em conditions. Não os inclua em
bubbles visíveis.

## Variáveis preenchidas pelo cliente

| Variável | Entrada |
|---|---|
| `selectedServiceName` | escolha dinâmica, nunca texto livre |
| `selectedDateLabel` | escolha dinâmica das datas retornadas pela API |
| `selectedPeriodLabel` | escolha dinâmica dos turnos retornados pela API |
| `selectedSlotLabel` | escolha dinâmica de slot |
| `currentCustomFieldAnswer` | input correspondente ao tipo da pergunta ativa |
| `customerName` | text input |
| `phone` | injetada pelo Agendaí no WhatsApp; phone input apenas no Preview |

Os IDs correspondentes são obtidos com **Map item with same index**. O cliente
nunca fornece `tenantId`, `serviceId`, `customerId`, `sessionId` ou
`appointmentId`.

`selectedDate` também não é digitada nem calculada pelo Typebot: ela é mapeada
diretamente de `dates[].date`. Ao selecionar **Ver mais datas**, a consulta usa
diretamente `nextStartDate` como `startDate`.

## Idempotência

`appointmentId` permanece definido depois do primeiro sucesso. O condition
**12. Proteção contra duplicidade** usa `Is set` para impedir novo POST na mesma
conversa. A API mantém a segunda garantia por sessão, serviço, cliente e horário.

## Valores que não existem no MVP

- `professionalId`: não existe no contrato atual;
- `paymentId`: fora do escopo;
- variáveis de cancelamento ou reagendamento: fora do escopo;
- texto de mensagem transacional: pertence ao módulo WhatsApp do Agendaí.
