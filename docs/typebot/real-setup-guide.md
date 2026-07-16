# Importar, configurar e publicar o Typebot do Agendaí

Este é o procedimento canônico para colocar o fluxo conversacional do MVP em
funcionamento.

## Pré-requisitos no Agendaí

- aplicação acessível pelo Typebot por HTTPS;
- tenant ativo e com uso do canal permitido;
- credencial Typebot ativa e exclusiva do tenant;
- categoria, serviço e regras de disponibilidade ativos;
- ao menos um serviço sem custom field obrigatório para validar o blueprint base;
- Evolution API configurada separadamente caso se deseje receber as mensagens
  transacionais reais.

O token é criado em
`/admin/tenants/[tenantId]/typebot-credentials`, aparece uma única vez e possui
prefixo `agz_tb_`. Não use `TYPEBOT_API_KEY` como credencial de produção; essa
variável do Agendaí é apenas um fallback legado de desenvolvimento.

## 1. Importar o arquivo

1. Acesse o workspace correto no Typebot.
2. Escolha **Create a typebot**.
3. Selecione **Import a file**.
4. Importe [`agendai-mvp.typebot.json`](./agendai-mvp.typebot.json).
5. Abra o bot importado e confirme que existem 24 grupos, iniciando por
   **1. Identificar estabelecimento**.
6. Não publique ainda.

O Typebot documenta a importação de JSON pelo menu **Import a file**. Se uma
instalação self-hosted antiga rejeitar o schema `6.1`, atualize o Typebot ou
exporte/reimporte o fluxo pela versão instalada antes de configurar credenciais.

## 2. Conferir as variáveis de sessão

O blueprint de produção declara, mas não preenche:

| Variável | Valor |
|---|---|
| `apiBaseUrl` | injetada pelo Agendaí a partir da URL pública configurada |
| `tenantSlug` | injetada a partir da instância Evolution e do tenant persistido |
| `typebotApiKey` | credencial ativa cifrada do mesmo tenant |
| `phone` | telefone normalizado do remetente |

Não adicione blocos **Set variable** para esses valores no fluxo publicado. Para
Preview sem Evolution, use exclusivamente **Variables for test** e remova os
valores de teste antes de publicar.

Em seguida, abra o bloco **HTTP - Business** e use **Test the request**. O teste
deve preencher `tenantName` e retornar status 200. Repita em **HTTP - Services**.

## 3. Conferir os blocos HTTP

Todos usam o header:

```text
x-typebot-api-key: {{typebotApiKey}}
```

Os POSTs também usam:

```text
Content-Type: application/json; charset=utf-8
```

O token permanece no bloco HTTP executado pelo servidor do Typebot. Não marque
esses blocos para execução no cliente.

## 4. Testar no preview

1. Inicie o preview.
2. Confirme o nome do estabelecimento.
3. Escolha um serviço retornado pela API.
4. Escolha uma das três datas retornadas pelo Agendaí.
5. Use **Ver mais datas** e confirme que o próximo período é carregado.
6. Escolha uma data e depois um horário.
7. Informe nome e telefone válidos.
8. Revise o resumo.
9. Confirme uma única vez.
10. Verifique a mensagem final correspondente ao status.
11. Volte ao editor e confirme que os logs HTTP não exibem falha.

Antes de repetir um cenário, reinicie o preview para limpar as variáveis da
conversa. Para testar idempotência, não reinicie: volte ao grupo de confirmação e
confirme novamente. O fluxo deve seguir ao resultado usando o mesmo
`appointmentId`.

## 5. Publicar

1. Confirme no Agendaí o `publicId` e uma credencial ativa recuperável do tenant.
2. Confirme que o blueprint não contém blocos Set variable para a configuração.
3. No Typebot, clique em **Publish**.
4. Escolha o canal de teste desejado.
5. Faça primeiro um teste web/preview.
6. Só depois conecte ou atualize o canal WhatsApp que inicia o Typebot.

Publicar o Typebot não configura Evolution API. O Typebot conduz a conversa; a
outbox do Agendaí envia as mensagens transacionais pela Evolution separadamente.

## Requests e responses de referência

### Estabelecimento

```http
GET {{apiBaseUrl}}/api/typebot/{{tenantSlug}}/business
x-typebot-api-key: {{typebotApiKey}}
```

```json
{
  "ok": true,
  "tenant": {
    "id": "tenant-uuid",
    "name": "Nome do estabelecimento",
    "slug": "slug-do-tenant",
    "description": null,
    "city": "Cidade",
    "state": "UF",
    "whatsapp": "5511999999999"
  }
}
```

### Serviços

```http
GET {{apiBaseUrl}}/api/typebot/{{tenantSlug}}/services
x-typebot-api-key: {{typebotApiKey}}
```

```json
{
  "ok": true,
  "services": [
    {
      "number": 1,
      "id": "service-uuid",
      "category": "Categoria",
      "name": "Serviço",
      "durationMinutes": 60,
      "priceText": "R$ 100,00",
      "bookingMode": "DIRECT"
    }
  ],
  "text": "1 - Serviço | 60 min | R$ 100,00"
}
```

### Datas disponíveis

Primeira página:

```http
GET {{apiBaseUrl}}/api/typebot/{{tenantSlug}}/services/{{selectedServiceId}}/available-dates?startDate=&days=14
x-typebot-api-key: {{typebotApiKey}}
```

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

O botão **Ver mais datas** repete a chamada usando diretamente
`startDate={{nextStartDate}}`. O Typebot não converte a data nem copia o valor
para uma variável intermediária. A opção escolhida é mapeada de
`availableDateValues` diretamente para `selectedDate`.

### Horários de uma data

```http
GET {{apiBaseUrl}}/api/typebot/{{tenantSlug}}/services/{{selectedServiceId}}/slots?date={{selectedDate}}&days=1
x-typebot-api-key: {{typebotApiKey}}
```

```json
{
  "ok": true,
  "service": {
    "id": "service-uuid",
    "name": "Serviço",
    "durationMinutes": 60
  },
  "slots": [
    {
      "number": 1,
      "startsAt": "2026-07-20T12:00:00.000Z",
      "endsAt": "2026-07-20T13:00:00.000Z",
      "label": "20/07/2026 09:00"
    }
  ],
  "text": "1 - 20/07/2026 09:00"
}
```

Quando não há horários, a API responde, por exemplo:

```json
{
  "ok": false,
  "code": "NO_SLOTS_AVAILABLE",
  "message": "Nenhum horário disponível para este serviço nos próximos dias."
}
```

O cliente vê apenas a mensagem segura definida no blueprint.

### Identificação

```http
POST {{apiBaseUrl}}/api/typebot/{{tenantSlug}}/customers/identify
x-typebot-api-key: {{typebotApiKey}}
Content-Type: application/json; charset=utf-8

{
  "action": "LOOKUP",
  "phone": "{{phone}}"
}
```

```json
{
  "ok": true,
  "lookup": {
    "status": "NOT_FOUND",
    "customerName": null,
    "requiresConfirmation": false,
    "requiresName": true
  },
  "session": {
    "id": "session-uuid",
    "status": "STARTED"
  }
}
```

Em seguida, use `CONFIRM` com o `sessionId` quando o lookup retornar `FOUND`;
use `CREATE` com `sessionId`, `name` e `rejectedExisting` quando for necessário
informar outro nome. O contrato completo está em
[typebot-api.md](../technical/typebot-api.md#identificação-segura-do-cliente).

### Criação

```http
POST {{apiBaseUrl}}/api/typebot/{{tenantSlug}}/appointments
x-typebot-api-key: {{typebotApiKey}}
Content-Type: application/json; charset=utf-8

{
  "sessionId": "{{sessionId}}",
  "customerId": "{{customerId}}",
  "serviceId": "{{selectedServiceId}}",
  "startsAt": "{{selectedSlotStartsAt}}",
  "customValues": []
}
```

Resposta `DIRECT`:

```json
{
  "ok": true,
  "appointment": {
    "id": "appointment-uuid",
    "status": "CONFIRMED",
    "origin": "WHATSAPP",
    "startsAt": "2026-07-20T12:00:00.000Z",
    "endsAt": "2026-07-20T13:00:00.000Z"
  },
  "message": "Agendamento confirmado com sucesso."
}
```

Resposta `REQUIRES_CONFIRMATION`:

```json
{
  "ok": true,
  "appointment": {
    "id": "appointment-uuid",
    "status": "REQUESTED",
    "origin": "WHATSAPP",
    "startsAt": "2026-07-20T12:00:00.000Z",
    "endsAt": "2026-07-20T13:00:00.000Z"
  },
  "message": "Sua solicitação foi enviada e aguarda confirmação do prestador."
}
```

## Roteiro ponta a ponta

Execute pelo menos estes cenários:

1. `DIRECT`: criação única, status `CONFIRMED` e mensagem final correta.
2. `REQUIRES_CONFIRMATION`: status `REQUESTED` e mensagem final correta.
3. Período sem datas: usar **Ver mais datas** ou escolher outro serviço.
4. Paginação: verificar que a primeira data da página seguinte não foi pulada.
5. Data selecionada: conferir nos logs que `/slots` recebeu o mesmo
   `YYYY-MM-DD` retornado por `/available-dates`.
6. Serviço sem horários: voltar e escolher outro serviço.
7. Confirmação repetida: mesmo `appointmentId` e apenas um Appointment/outbox.
8. Horário ocupado entre lista e POST: mensagem amigável e atualização de slots.
9. Nome ou telefone inválido: retornar à coleta sem mostrar erro técnico.
10. Token de outro tenant: fluxo bloqueado sem revelar dados do tenant.
11. Tenant ou assinatura indisponível: encerramento seguro.
12. WhatsApp desabilitado: agendamento continua criado; apenas a mensagem
    transacional não é enfileirada.

Depois, confirme no Agendaí:

- Appointment com tenant, customer, service, origem e status corretos;
- evento e auditoria Typebot;
- sessão com `lastAppointmentId`;
- no máximo uma outbox solicitada para o evento;
- nenhum envio transacional criado pelo próprio Typebot.

## Limitações conhecidas

- não há profissional na API/modelo atual;
- o blueprint base não coleta custom fields obrigatórios;
- o rate limit Typebot é em memória e não é distribuído entre réplicas;
- cada tenant precisa de seu próprio bot ou cópia configurada com credencial
  exclusiva;
- Typebot Cloud não acessa `localhost`; use uma URL HTTPS alcançável;
- cancelamento, reagendamento, pagamentos, IA e atendimento humano não fazem
  parte deste fluxo;
- `origin = WHATSAPP` é o valor persistido legado para o canal lógico Typebot.
