# Integração transacional com WhatsApp

## Visão geral

O Agendaí envia `APPOINTMENT_CONFIRMED` v1 e `APPOINTMENT_REQUESTED` v1. A arquitetura é:

`Appointment transaction → PostgreSQL outbox → dispatcher → BullMQ/Redis → worker → WhatsAppProvider → Evolution API → WhatsApp`.

O domínio conhece somente `enqueueAppointmentConfirmation` e o contrato `WhatsAppProvider`. A Evolution usa PostgreSQL, Redis e volume de sessão próprios e nunca acessa o banco do Agendaí.

## Limites do beta

A Evolution API é uma integração não oficial baseada em WhatsApp Web, não afiliada à Meta. Pode desconectar, exigir novo QR ou mudar por fatores externos; não há garantia contra bloqueio. Não há chatbot, Typebot, recebimento de mensagens, campanhas, mídia, grupos, lembretes, cancelamento, reagendamento ou atendimento humano nesta fase. O uso deve ser transacional, em volume baixo e sem spam.

## Configuração

Variáveis do Agendaí:

- `WHATSAPP_GATEWAY_ENABLED`: feature flag global, `false` por padrão;
- `EVOLUTION_API_URL`: origem fixa da Evolution;
- `EVOLUTION_API_KEY`: chave global, nunca persistida por tenant;
- `EVOLUTION_WEBHOOK_SECRET`: segredo do header do webhook;
- `AGENDAI_PUBLIC_URL`: origem pública do Agendaí usada para montar o webhook;
- `AGENDAI_QUEUE_REDIS_URL`: Redis acessível pelo Agendaí e pelo worker;
- `WHATSAPP_WORKER_CONCURRENCY`: concorrência entre 1 e 20.

Se a flag estiver ativa, todas as variáveis são validadas por Zod. O controle por tenant começa com `enabled=false`, `sendAppointmentConfirmation=false` e `sendAppointmentRequested=true`. A preferência de solicitação só produz mensagens quando a integração também está ativa e conectada.

O setup dos containers está em `infra/whatsapp/README.md`. O worker é iniciado separadamente com `pnpm worker:whatsapp`.

## Dados e idempotência

`WhatsAppConnection` contém somente associação da instância, estado, número e preferências. Não armazena sessão, QR, chave ou token. `WhatsAppMessageOutbox` guarda telefone normalizado, payload estruturado e metadados de entrega.

As chaves `appointment:{appointmentId}:confirmed:v1` e `appointment:{appointmentId}:requested:v1`, únicas com `tenantId`, impedem criação duplicada previsível. O BullMQ usa o UUID da outbox como `jobId`. O worker faz claim condicional antes do envio e ignora registros que já não estejam em estado enfileirável.

A entrega é *at least once*. Existe uma janela inevitável se a Evolution aceitar a mensagem e o processo cair antes de persistir `SENT`; a primeira versão registra esse risco em vez de assumir uma garantia de exactly-once que o gateway não oferece.

## Regras de domínio

- Agendamento externo `DIRECT`: confirmação na mesma transação da criação, preservando o fluxo atual.
- Agendamento externo `REQUIRES_CONFIRMATION`: solicitação recebida na mesma transação da criação; a confirmação continua sendo criada somente na transição real para `CONFIRMED`.
- Gateway desligado, ausência de conexão/preferência ou telefone inválido são condições esperadas e não abortam o agendamento.
- Falha interna ao persistir uma outbox elegível aborta a transação, preservando consistência.
- Telefone é validado para Brasil sem inventar dígitos; celular exige nove dígitos iniciando em 9 e fixo exige oito iniciando entre 2 e 5.

## Segurança e endpoints

As APIs de configuração exigem `OWNER` ou `ADMIN` e derivam tenant e usuário da sessão. Nenhuma rota aceita `tenantId` do cliente. O webhook valida segredo em tempo constante, JSON, 64 KiB, evento permitido e resolve a conexão somente por `instanceName` cadastrada. O QR é consultado sob demanda, retornado com `no-store` e nunca persistido.

- `GET|POST /api/provider/whatsapp/connection`;
- `POST /api/provider/whatsapp/connection/qr`;
- `POST /api/provider/whatsapp/connection/disconnect`;
- `PATCH /api/provider/whatsapp/preferences`;
- `POST /api/provider/whatsapp/test-message`;
- `POST /api/integrations/whatsapp/evolution/webhook`.

Logs não devem conter telefone completo, cliente, mensagem, QR, API key, payload bruto ou sessão. São permitidos IDs técnicos, estado, código de erro, tentativa e duração.

## Operação, rollout e rollback

Confirme health dos containers, variáveis no processo web e worker, conecte um número de teste, ative a integração e as preferências desejadas e faça um agendamento fictício. Retries usam cinco tentativas e backoff exponencial inicial de 30 segundos. O rate limit de teste é três tentativas por dez minutos, por usuário e tenant, por processo web nesta versão.

Rollout: ambiente local, tenant e número de teste, teste manual, agendamento fictício, sete dias de observação, um piloto e expansão gradual. Para rollback, desative `WHATSAPP_GATEWAY_ENABLED`, pare o worker e mantenha os dados para diagnóstico. A migration é aditiva.

A migração futura para Meta Cloud API deve implementar outro `WhatsAppProvider`, manter os contratos de outbox e introduzir credenciais por mecanismo seguro; o enum reserva `META_CLOUD`, mas não existe implementação nesta fase.

## Testes

Os testes automatizados não chamam a Evolution real. Cobrem configuração, telefone, template, provider com `fetch` mockado, webhook, autorização, tenant, outbox, integração DIRECT/manual, dispatcher, worker, retry, falha definitiva e rate limit.
