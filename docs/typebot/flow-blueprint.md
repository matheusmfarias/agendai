# Blueprint Typebot — MVP do Agendaí

O fluxo atualizado segue:

```text
estabelecimento → intenção → categoria → serviço → data disponível
→ turno disponível → horário → perguntas do serviço → telefone da conversa
→ lookup/confirmar ou nome → resumo → criação
```

O Typebot não classifica horários: consulta `available-periods` e envia o valor
recebido no parâmetro `period` do endpoint de slots. Um único turno segue direto
para horários; dois ou mais exibem a escolha. Datas e turnos usam apenas os labels
da API, sem contagens. Se não houver telefone de canal, o fallback mostra
diretamente “Informe seu telefone com DDD.” e abre o input, sem uma escolha
intermediária.

“Falar com atendente” termina o grafo automático e marca `handoffRequested`; no
próprio canal WhatsApp, a conversa permanece com o estabelecimento sem apresentar
outro link. “Encerrar atendimento” finaliza a sessão sem handoff ou criação de
agendamento. As escolhas “Voltar” usam sentinelas
internas e blocos de reset que limpam somente serviço, data, turno, horário e
`appointmentId` dependentes da etapa alterada. Cada etapa oferece no máximo uma
opção chamada “Voltar”, sempre para a última etapa visualizada. Assim, horários
voltam ao turno quando ele foi exibido ou diretamente à data quando o turno
único foi selecionado automaticamente. No resumo, “Voltar” retorna à
identificação.

Fonte de verdade do fluxo conversacional importável:

- [`agendai-mvp.typebot.json`](./agendai-mvp.typebot.json)

O arquivo usa o schema Typebot `6.1`, não contém URL, slug ou credencial de
tenant e pode ser importado pelo menu **Import a file** do Typebot.

## Responsabilidades

O Typebot coleta escolhas e chama a API. O Agendaí continua responsável por:

- tenant e política de assinatura;
- serviços ativos;
- disponibilidade e conflitos;
- modo `DIRECT` ou `REQUIRES_CONFIRMATION`;
- criação idempotente do agendamento;
- mensagens transacionais por WhatsApp via Evolution API.

O Typebot não envia `APPOINTMENT_REQUESTED`, `APPOINTMENT_CONFIRMED` ou
`APPOINTMENT_COMPLETED` e não contém regras alternativas de agenda.

## Fluxo importado

1. `GET /business` identifica o estabelecimento e seu contato.
2. “Como podemos ajudar?” direciona para agendamento ou handoff terminal.
3. `GET /categories` carrega categorias com serviços ativos.
4. `GET /services?categoryId=...` carrega somente a categoria escolhida.
5. Uma escolha dinâmica mapeia o nome selecionado para o ID retornado.
6. O bot informa que, no MVP atual, o profissional é definido pelo
   estabelecimento quando aplicável.
7. `GET /available-dates?days=14` calcula datas com slots reais e retorna no
   máximo três opções.
8. Uma escolha dinâmica mapeia o label para o `date` retornado pela API.
9. `GET /available-periods` seleciona automaticamente um turno único ou mostra
   a escolha quando existem dois ou mais.
10. `GET /slots?...&period=...` usa exatamente data e turno selecionados.
11. O telefone da conversa inicia lookup; o Preview possui fallback manual.
12. `POST /customers/identify` confirma ou cria/reutiliza pelo nome.
13. O bot mostra serviço, data, horário e cliente para confirmação.
14. Antes do POST, verifica se `appointmentId` já existe na conversa.
15. `POST /appointments` cria ou devolve o agendamento idempotente.
16. O status define a mensagem final.

## Mensagens finais

Para `CONFIRMED` (`DIRECT`):

> Seu agendamento foi confirmado. Você também receberá os detalhes pelo WhatsApp.

Para `REQUESTED` (`REQUIRES_CONFIRMATION`):

> Recebemos sua solicitação. O estabelecimento ainda precisa confirmar o horário e você será avisado pelo WhatsApp.

Outros status usam uma mensagem neutra. O fluxo não mostra `code`, `message`,
status HTTP ou detalhes técnicos ao cliente.

## Serviços e horários dinâmicos

As respostas HTTP são transformadas em listas paralelas:

- `serviceNames` ↔ `serviceIds` ↔ `serviceBookingModes`;
- `availableDateLabels` ↔ `availableDateValues`;
- `slotLabels` ↔ `slotStartsAt`.

O bloco **Map item with same index** do Typebot resolve o ID correspondente à
opção selecionada. Nenhum UUID é digitado pelo cliente ou mantido fixo no bot.

## Datas e horários

Não existe mais `date input`. O cliente só vê datas presentes em `dates`, e o
Typebot usa o valor `date` sem reconstrução ou correção de timezone.

Cada consulta mostra no máximo três datas. Se `nextStartDate` existir, o
backend adiciona a continuação lógica usada pela opção **Ver mais datas**. Uma
janela vazia pode avançar para o próximo período; no fim da janela máxima, o bot
oferece apenas “Voltar” para o serviço.

Se `/slots` não retornar HTTP 200 com ao menos um item, o bot não mostra o erro
da API. A opção “Voltar” retorna ao turno, quando ele foi visualizado, ou à data
quando o turno único foi pulado. Depois de uma disputa de horário na confirmação,
o fluxo permite tentar novamente ou voltar ao resumo.

## Idempotência

Existem duas camadas:

1. o fluxo não executa o POST novamente quando `appointmentId` já está definido;
2. a API usa a sessão e `lastAppointmentId`, com correspondência de tenant,
   cliente, serviço e horário, para devolver o agendamento existente.

Assim, repetir a confirmação ou repetir a chamada após perda da resposta não
cria outro agendamento nem outra outbox.

## Profissional

O modelo e a API atuais não expõem profissionais e `Appointment` não possui
`professionalId`. Por isso, o blueprint funcional do MVP sempre segue pelo
caminho “profissional definido pelo estabelecimento”.

Não adicione uma lista estática de profissionais ao Typebot: ela não seria
validada nem persistida. Quando o domínio ganhar essa relação, a extensão correta
será uma API tenant-scoped e o envio do ID selecionado ao serviço compartilhado.

## Campos personalizados

Depois do horário, o blueprint consulta `/custom-fields`. Sem campos, segue para
identificação. Com campos, percorre a lista por índice e apresenta uma pergunta
por vez. `TEXT`, `TEXTAREA`, `NUMBER`, `DATE`, `BOOLEAN` e `SELECT` usam os inputs
correspondentes do Typebot. Campos opcionais podem ser pulados; obrigatórios não
oferecem essa opção.

As respostas são acumuladas no contrato `{ customFieldId, value }` e exibidas
no resumo somente quando preenchidas. Antes do POST, o blueprint interpreta a
lista acumulada, monta o corpo completo com `JSON.stringify` uma única vez e
armazena esse corpo em `appointmentRequestBody`. O bloco HTTP usa somente
`{{appointmentRequestBody}}` como custom body; assim, o Typebot interpreta o
corpo completo e `customValues` chega como array JSON real, sem reinserir uma
string JSON dentro de outro JSON. “Voltar” retorna à pergunta anterior ou ao
horário na primeira pergunta. Trocar o serviço limpa lista, índice, respostas e
resumo. O booking core revalida tenant, serviço, campo, obrigatoriedade, tipo e
opções antes de persistir.

## Erros seguros

| Situação | Comportamento do fluxo |
|---|---|
| Tenant, credencial ou rede indisponível | Mensagem genérica e encerramento |
| Nenhum serviço | Orienta contato com o estabelecimento |
| Período sem datas, mas com continuação | Oferece “Ver mais datas” |
| Fim da janela sem datas | “Voltar” retorna ao serviço |
| Horário perdido após escolha da data | “Voltar” retorna ao turno exibido ou à data |
| Nome ou telefone inválido | Volta à coleta dos dados |
| Horário ocupado durante a confirmação | Tenta novamente ou volta ao resumo |
| Status inesperado | Mensagem final neutra |

Os detalhes ficam disponíveis somente nos logs HTTP do editor Typebot.

## Fora do escopo

- cancelamento e reagendamento;
- pagamento;
- IA generativa;
- atendimento humano automatizado;
- edição cadastral;
- templates ou mensagens transacionais no Typebot.

## Referências

- [Importação, configuração e publicação](./real-setup-guide.md)
- [Variáveis](./variables.md)
- [Contratos da API](../technical/typebot-api.md)
- [Simulador](./simulator.md)
