# Confirmação transacional de agendamentos por WhatsApp

## Contexto

O Agendaí ainda não possui gateway de envio ativo. A entrega adiciona uma integração beta com Evolution API, isolada atrás de `WhatsAppProvider`, outbox PostgreSQL e BullMQ.

## Escopo

Inclui conexão por QR, status, desconexão, teste manual, confirmação de agendamento, retry, observabilidade mínima e configuração por tenant. Não inclui chatbot, Typebot, leitura de mensagens, campanhas, mídia, lembretes ou atendimento humano.

## Regras e contratos

- Somente OWNER e ADMIN gerenciam a conexão.
- Tenant sempre deriva da sessão ou da instância conhecida no webhook.
- QR, sessão e API key não são persistidos no banco do Agendaí.
- A outbox é criada na mesma transação em que o agendamento entra em `CONFIRMED`.
- A unicidade `(tenantId, idempotencyKey)` é a garantia principal contra duplicação previsível.
- Entradas HTTP, webhook, telefone e respostas da Evolution são validadas.

## Decisões

- Evolution API fixada na série 2.3, antes da ativação obrigatória introduzida na 2.4.
- Webhook por instância com header secreto; QR obtido sob demanda e não persistido.
- Falha de configuração ou telefone inválido não bloqueia agendamento. Inconsistência ao persistir uma outbox elegível aborta a transação.
- Entrega é at-least-once; falha depois de aceite remoto e antes do `SENT` permanece ambígua.

## Plano de implementação

1. Infraestrutura, configuração e migration.
2. Provider, serviços, webhook e APIs.
3. Outbox, dispatcher, worker e integração com Appointment.
4. UI, testes e documentação.

## Estratégia de testes

Cobrir telefone, template, config, provider HTTP, webhook, isolamento tenant, outbox, idempotência, dispatcher, worker, retry, rate limit e contratos das rotas sem chamadas reais.

## Dados e rollout

Migration aditiva, sem backfill. Flags global e por tenant começam desabilitadas. Rollout somente com número e tenant de teste.

## Progresso

- [x] Exploração e decisões concluídas.
- [x] Infraestrutura e modelagem concluídas.
- [x] Provider, APIs e webhook concluídos.
- [x] Outbox e worker concluídos.
- [x] UI e testes concluídos.
- [x] Checks completos aprovados.

## Achados e acompanhamento

- O lint permanece com um aviso preexistente de import não usado em `provider-notification-center.tsx`; não há erros e o comando retorna sucesso.
- A janela entre aceite remoto e persistência de `SENT` impede garantia de exactly-once; a entrega é at-least-once com mitigação de duplicidades previsíveis.
- Evolution, QR, worker e envio não foram exercitados contra serviços reais nesta implementação.
