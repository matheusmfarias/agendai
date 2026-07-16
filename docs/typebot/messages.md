# Mensagens do fluxo Typebot

Este catálogo documenta os textos apresentados ao cliente durante o agendamento conversacional. O blueprint de produção é a fonte executável do fluxo.

## Princípios

- Mensagens curtas, cordiais e orientadas à próxima ação.
- Nenhum erro técnico, identificador interno ou detalhe de integração deve aparecer para o cliente.
- Use emojis somente quando ajudarem a comunicar o resultado.
- Use sempre `Voltar` para retornar e `Pular` somente em respostas opcionais.

## Início

```text
Olá! 👋

Como posso ajudar você na {{tenantName}}?
```

Opções: `Agendar um horário` e `Falar com atendente`.

## Escolhas do agendamento

```text
Qual tipo de serviço você procura?
```

```text
Agora escolha o serviço:
```

```text
Qual data fica melhor para você?
```

```text
Qual turno você prefere?
```

```text
Qual horário fica melhor?
```

As opções de horário exibem somente `HH:mm`. Cada etapa mantém uma opção `Voltar` para a etapa anterior efetivamente apresentada.

## Dados do cliente

Quando o telefone não estiver disponível:

```text
Informe seu telefone com DDD.
```

Quando houver um cadastro correspondente:

```text
Encontrei um cadastro em nome de {{customerName}}.

Posso usar esses dados?
```

## Dados adicionais

Pergunta obrigatória:

```text
{{fieldLabel}}?

Digite sua resposta ou envie ‘Voltar’ para retornar.
```

Pergunta opcional:

```text
{{fieldLabel}}?

Digite sua resposta, envie ‘Pular’ para continuar ou ‘Voltar’ para retornar.
```

## Resumo

```text
Confira os dados do seu agendamento:

Serviço: {{selectedServiceName}}
Data: {{selectedDate}}
Horário: {{selectedSlotLabel}}
Cliente: {{customerName}}
{{customValuesSummarySection}}

Está tudo certo?
```

`customValuesSummarySection` contém somente as respostas preenchidas, sob o título `Dados adicionais:`.

## Resultado

Agendamento com confirmação imediata:

```text
Agendamento confirmado! ✅
```

Agendamento que depende do estabelecimento:

```text
Solicitação enviada! ✅

O estabelecimento ainda precisa confirmar o horário. Avisaremos você por aqui assim que houver uma resposta.
```

## Erros e indisponibilidade

As mensagens devem explicar somente a ação possível para o cliente:

```text
Não foi possível continuar agora. Tente novamente mais tarde ou volte para escolher outra opção.
```

```text
Esse horário não está mais disponível. Volte e escolha outro horário.
```

```text
Não encontrei horários disponíveis nessa data. Volte e escolha outra data.
```

## Referências

- [Fluxo conversacional](./flow-blueprint.md)
- [Tratamento de erros](./error-handling.md)
- [Chamadas HTTP](./http-requests.md)
