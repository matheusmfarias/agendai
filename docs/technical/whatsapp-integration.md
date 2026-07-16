# Integração transacional com WhatsApp

## Visão geral

O Agendaí envia `APPOINTMENT_REQUESTED`, `APPOINTMENT_CONFIRMED` e
`APPOINTMENT_COMPLETED` v1. A arquitetura é:

`Appointment transaction → PostgreSQL outbox → dispatcher → BullMQ/Redis → worker → WhatsAppProvider → Evolution API → WhatsApp`.

O domínio cria mensagens na outbox e conhece somente o contrato
`WhatsAppProvider`. A Evolution usa PostgreSQL, Redis e volume de sessão próprios
e nunca acessa o banco do Agendaí.

## Limites do beta

A Evolution API é uma integração não oficial baseada em WhatsApp Web, não afiliada à Meta. Pode desconectar, exigir novo QR ou mudar por fatores externos; não há garantia contra bloqueio. O MVP recebe apenas texto de conversas individuais para encaminhamento ao Typebot. Áudio, imagens, documentos, localização, grupos, campanhas, IA, lembretes automáticos e mensagens de cancelamento permanecem fora do escopo.

## Configuração

Variáveis do Agendaí:

- `WHATSAPP_GATEWAY_ENABLED`: feature flag global, `false` por padrão;
- `EVOLUTION_API_URL`: origem fixa da Evolution;
- `EVOLUTION_API_KEY`: chave global, nunca persistida por tenant;
- `EVOLUTION_WEBHOOK_SECRET`: segredo do header do webhook;
- `AGENDAI_PUBLIC_URL`: origem pública do Agendaí usada para montar o webhook;
- `AGENDAI_QUEUE_REDIS_URL`: Redis acessível pelo Agendaí e pelo worker;
- `WHATSAPP_WORKER_CONCURRENCY`: concorrência entre 1 e 20.
- `TYPEBOT_VIEWER_URL`: origem da instalação Typebot que hospeda os bots publicados;
- `TYPEBOT_REQUEST_TIMEOUT_MS`: timeout da chamada ao Typebot, `15000` por padrão;
- `TYPEBOT_HANDOFF_TIMEOUT_MINUTES`: teto absoluto do handoff, `1440` (24 horas) por padrão; 30 minutos sem mensagens permitem a retomada automática.

Se a flag estiver ativa, todas as variáveis são validadas por Zod. O controle por tenant começa com `enabled=false`, `sendAppointmentConfirmation=false`, `sendAppointmentRequested=true` e `sendAppointmentCompleted=true`. Uma desconexão temporária não perde eventos: a outbox é criada para uma conexão habilitada e o worker aguarda a recuperação antes de chamar o provedor.

O setup dos containers está em `infra/whatsapp/README.md`. O worker é iniciado separadamente com `pnpm worker:whatsapp`.

## Dados e idempotência

`WhatsAppConnection` contém somente associação da instância, estado, número e preferências. Não armazena sessão, QR, chave ou token. `WhatsAppMessageOutbox` guarda telefone normalizado, payload estruturado e metadados de entrega.

As conversas recebidas não usam a outbox transacional. `WhatsAppInboundMessage`
persiste o `messageId` da Evolution com unicidade por tenant, o texto necessário ao
processamento e seu estado de retry. `TypebotSession` mantém uma única sessão ativa
por `tenantId + activePhone`. Como o gateway conversacional atual é exclusivamente
WhatsApp, `activePhone` é o identificador canônico da conversa e o canal fica
registrado nos metadados. A sessão guarda o `sessionId` retornado pelo Typebot e a
janela de handoff. Após 30 minutos sem mensagens, a próxima mensagem do cliente
encerra o handoff e inicia um novo atendimento automático. O teto absoluto permanece
em 24 horas. Uma sessão automática também expira após 30 minutos. O tenant guarda somente o `publicId` do bot publicado; nenhuma API key do
Typebot é enviada ao navegador ou ao cliente.

As chaves `appointment:{appointmentId}:confirmed:v1`,
`appointment:{appointmentId}:requested:v1` e
`appointment:{appointmentId}:completed:v1`, únicas com `tenantId`, impedem criação
duplicada previsível. O BullMQ usa o UUID da outbox como `jobId`. O worker faz
claim condicional antes do envio e ignora registros que já não estejam em estado
enfileirável.

A entrega é *at least once*. Existe uma janela inevitável se a Evolution aceitar a mensagem e o processo cair antes de persistir `SENT`; a primeira versão registra esse risco em vez de assumir uma garantia de exactly-once que o gateway não oferece.

## Regras de domínio

- Agendamento externo `DIRECT`: confirmação na mesma transação da criação, preservando o fluxo atual.
- Agendamento externo `REQUIRES_CONFIRMATION`: solicitação recebida na mesma transação da criação; a confirmação continua sendo criada somente na transição real para `CONFIRMED`.
- Agendamento manual criado como `CONFIRMED`: confirmação na mesma transação.
- O fim do horário previsto nunca altera o status. A conclusão é uma transição manual para `FINISHED`, inclusive quando realizada pelo checkout, e cria `APPOINTMENT_COMPLETED` na mesma transação.
- Os textos transacionais são modelos fixos do Agendaí. Configurações persistidas no tenant não alteram o payload nem a renderização do worker.
- Data e hora usam o timezone persistido do tenant no momento de criação.
- Gateway, tenant, assinatura/plano, conexão e preferência são validados na criação; plano, tenant e conexão são revalidados antes do envio. Conexão temporariamente desconectada entra no fluxo recuperável, sem chamada ao provedor enquanto estiver fora.
- Gateway desligado, ausência de conexão/preferência ou telefone inválido são condições esperadas e não abortam o agendamento.
- Falha interna ao persistir uma outbox elegível aborta a transação, preservando consistência.
- Telefone é validado para Brasil sem inventar dígitos; celular exige nove dígitos iniciando em 9 e fixo exige oito iniciando entre 2 e 5.

## Campos legados de comunicação

As colunas `confirmation_message_template`, `reminder_message_template`,
`cancellation_message_template`, `enable_automatic_reminders` e
`reminder_lead_hours` permanecem temporariamente em `tenants` para evitar uma
migration destrutiva. Elas não são carregadas pela tela de configurações, não são
aceitas pelo schema de atualização e não participam da criação de novas mensagens.

Os tipos `APPOINTMENT_REMINDER` e `APPOINTMENT_CANCELED` e o campo
`scheduled_for` da outbox permanecem apenas para compatibilidade com registros
legados eventualmente já persistidos. O worker consegue consumi-los usando textos
fixos, mas nenhum fluxo do MVP cria novas mensagens desses tipos.

## Segurança e endpoints

As APIs de configuração exigem `OWNER` ou `ADMIN` e derivam tenant e usuário da sessão. Nenhuma rota aceita `tenantId` do cliente. O webhook valida segredo em tempo constante, JSON, 64 KiB, evento permitido e resolve a conexão somente por `instanceName` cadastrada. O QR é consultado sob demanda, retornado com `no-store` e nunca persistido.

- `GET|POST /api/provider/whatsapp/connection`;
- `POST /api/provider/whatsapp/connection/qr`;
- `POST /api/provider/whatsapp/connection/disconnect`;
- `PATCH /api/provider/whatsapp/preferences`;
- `POST /api/provider/whatsapp/test-message`;
- `POST /api/integrations/whatsapp/evolution/webhook`.

Logs não devem conter telefone completo, cliente, mensagem, QR, API key, payload bruto ou sessão. São permitidos IDs técnicos, estado, código de erro, tentativa e duração.

## Entrada conversacional

A instância é configurada para o evento `MESSAGES_UPSERT`. O webhook autentica o
header compartilhado, resolve tenant e conexão exclusivamente pelo `instanceName`,
ignora grupos e mídia e grava o texto recebido no inbox. Em eventos `fromMe`, o
ID externo é comparado com recibos sem conteúdo dos envios feitos pelo Agendaí:
um envio automático é ignorado, enquanto uma mensagem manual do prestador ativa
o mesmo handoff da opção “Falar com atendente”, somente para aquela conversa. O
retorno HTTP não aguarda Typebot ou Evolution: o dispatcher publica um job BullMQ determinístico para o
worker conversacional.

O worker chama `POST /api/v1/typebots/{publicId}/startChat` com
`prefilledVariables.phone` na primeira mensagem e
`POST /api/v1/sessions/{sessionId}/continueChat` nas seguintes. A resposta textual
é persistida antes do envio por `WhatsAppProvider`. `menu` e `reiniciar` encerram a
sessão ativa e iniciam outra. “Falar com atendente” pausa novas respostas do bot até
o timeout; `menu` ou `reiniciar` retomam imediatamente. Falhas transitórias usam
tentativas rápidas da fila e depois `RETRYING` no banco, sem misturar respostas
conversacionais com `APPOINTMENT_REQUESTED`, `APPOINTMENT_CONFIRMED` ou
`APPOINTMENT_COMPLETED`.

## Operação, rollout e rollback

Confirme health dos containers, variáveis no processo web e worker, conecte um número de teste, ative a integração e as preferências desejadas e faça um agendamento fictício. Retries usam cinco tentativas e backoff exponencial inicial de 30 segundos. O rate limit de teste é três tentativas por dez minutos, por usuário e tenant, por processo web nesta versão.

Rollout: ambiente local, tenant e número de teste, teste manual, agendamento fictício, sete dias de observação, um piloto e expansão gradual. Para rollback, desative `WHATSAPP_GATEWAY_ENABLED`, pare o worker e mantenha os dados para diagnóstico. A migration é aditiva.

A migração futura para Meta Cloud API deve implementar outro `WhatsAppProvider`, manter os contratos de outbox e introduzir credenciais por mecanismo seguro; o enum reserva `META_CLOUD`, mas não existe implementação nesta fase.

## Testes

Os testes automatizados não chamam a Evolution real. Cobrem configuração, telefone, modelos fixos, provider com `fetch` mockado, webhook, autorização, tenant, outbox, integração DIRECT/manual, dispatcher, worker, retry, falha definitiva e rate limit.
