# Notificações do prestador

## Objetivo

O módulo de notificações permite que o prestador acompanhe eventos operacionais no painel, com foco inicial nos agendamentos feitos pelo link público. Ele oferece uma central de notificações, badge de não lidas, toast, som opcional e navegação direta para o agendamento relacionado.

O MVP usa polling coordenado entre abas por `BroadcastChannel`, com fallback em
`localStorage` e eleição simples de líder. Não há WebSocket, Server-Sent Events,
push notification nativa, e-mail ou WhatsApp neste módulo.

## Eventos gerados atualmente

O sistema possui tipos preparados para eventos futuros e cria notificações em
três producers transacionais:

| Situação | Tipo | Prioridade |
| --- | --- | --- |
| Serviço com confirmação automática (`BookingMode.DIRECT`) | `public_booking_created` | `medium` |
| Serviço que exige confirmação manual (`BookingMode.REQUIRES_CONFIRMATION`) | `booking_confirmation_required` | `high` |
| Atendimento finalizado sem lançamento financeiro pago | `payment_pending` | `medium` |

Agendamentos públicos informativos (`BookingMode.INFORMATIONAL`) não criam notificação neste MVP.

Os tipos previstos em `src/features/provider-notifications/types.ts` são:

```ts
"public_booking_created"
"booking_confirmation_required"
"booking_confirmed"
"booking_canceled"
"booking_rescheduled"
"booking_starting_soon"
"payment_pending"
"payment_received"
"business_setup_incomplete"
"system"
```

## Modelo `ProviderNotification`

O model está em `prisma/schema.prisma` e usa o conceito de `Tenant`, que é o equivalente ao negócio no Agendaí. A tabela correspondente é `provider_notifications`.

| Campo | Significado |
| --- | --- |
| `id` | UUID da notificação. |
| `tenantId` | Tenant dono da notificação. É obrigatório. |
| `audience` | `TENANT` para broadcast ou `USER` para entrega privada. |
| `recipientUserId` | Obrigatório apenas para audience `USER`; referencia membership do mesmo tenant. |
| `dedupeKey` | Chave determinística que inclui audience e recipient. |
| `type` | Tipo funcional da notificação. |
| `priority` | `low`, `medium`, `high` ou `critical`. |
| `title` e `description` | Texto apresentado no drawer e no toast. |
| `entityType` e `entityId` | Referência opcional à entidade relacionada. Para o MVP, usam `appointment` e o id do agendamento. |
| `actionUrl` | URL interna para abrir o contexto relacionado. |
| `readAt` | Campo legado preservado, sem novas escritas. |
| `archivedAt` | Data de arquivamento. Arquivadas não são retornadas pela API padrão. |
| `metadata` | Dados auxiliares serializáveis para apresentação e roteamento. |
| `createdAt` e `updatedAt` | Datas de criação e atualização. |

Relações e remoções:

- A notificação pertence a um `Tenant` com `onDelete: Cascade`.
- Destinatário privado referencia `(tenantId, userId)` de `TenantUser` com
  `onDelete: Cascade`; remover membership remove a notificação privada.
- Leituras ficam em `ProviderNotificationRead`, uma receipt por
  notificação/tenant/usuário, com FKs compostas tenant-safe e cascade.
- Broadcast legado marcado em `readAt` não recebe fanout. Apenas leitura privada
  legada com recipient conhecido recebe receipt no backfill.

Antes desta alteração, a relação opcional de recipient usava `SET NULL`. O código
versionado não possuía producers privados, mas isso não prova que todos os dados
históricos de cada ambiente sejam broadcasts. O gate pré-deploy deve auditar
notificações com recipient e histórico da aplicação. Registros privados sem
membership comprovada devem ser arquivados ou expurgados somente com evidência;
jamais convertidos automaticamente em broadcast, atribuídos a outro usuário ou
distribuídos por fanout.

## Deduplicação

Existe uma restrição única em `tenantId + dedupeKey`.

`createProviderNotification` usa `upsert`. A chave inclui audience, recipient,
tipo, entidade e id da entidade, impedindo colisão entre broadcast e privado.

O fluxo público usa `entityType: "appointment"` e o id do agendamento como `entityId`. Isso evita duplicidade para o mesmo agendamento público caso a criação da notificação seja reexecutada.

## Escopo por tenant e destinatário

As APIs não recebem `tenantId` do cliente. Elas obtêm o usuário autenticado e seu contexto de tenant pelo padrão de autenticação do projeto.

Toda leitura e atualização aplica simultaneamente:

- `tenantId` do contexto ativo;
- `archivedAt: null`;
- audience `TENANT` sem recipient ou audience `USER` com recipient igual ao
  usuário autenticado;
- receipt filtrada por `(tenantId, userId)`.

Notificações privadas validam membership e usuário ativos antes do upsert.
Todo producer informa audience explicitamente: `TENANT` rejeita a presença de
recipient e `USER` exige UUID válido e membership ativo. Contradições nunca são
normalizadas silenciosamente para broadcast.
`actionUrl` aceita exclusivamente caminho interno sob `/app`, sem host,
protocolo ou barra invertida. IDs e cursores são validados como UUID no boundary.

## Durabilidade dos producers

Booking público e `payment_pending` ao finalizar atendimento sem pagamento
persistem a notificação dentro da mesma `Prisma.TransactionClient` da mudança
de domínio. Não existe gravação best-effort pós-commit: falha no upsert aborta a
transação, e retry é seguro pela `dedupeKey`.

Por isso, um usuário não consegue listar ou marcar como lida uma notificação de outro tenant, nem uma notificação privada destinada a outro usuário.

## Metadata e sanitização

O metadata aceito pelo frontend é limitado a:

```ts
{
  customerName?: string;
  serviceName?: string;
  professionalName?: string;
  bookingDate?: string; // YYYY-MM-DD
  bookingTime?: string; // HH:mm
  source?: "public_link" | "manual" | "whatsapp" | "typebot";
  requiresConfirmation?: boolean;
}
```

Antes da resposta da API, o serviço sanitiza o JSON e retorna somente esses campos com tipos válidos. Chaves adicionais eventualmente existentes no banco não são expostas pelo endpoint de notificações.

## Endpoints

Todos os endpoints exigem sessão autenticada e contexto de tenant ativo.

### Listar notificações

`GET /api/provider/notifications`

Query params opcionais:

| Parâmetro | Valores |
| --- | --- |
| `status` | `all` (padrão), `unread` ou `read` |
| `type` | Um tipo de notificação suportado |
| `category` | `bookings`, `financial` ou `system` |
| `limit` | De 1 a 30, com padrão 20 |
| `cursor` | Id retornado em `nextCursor` |

A lista é ordenada por `createdAt desc` e `id desc`. O cursor é validado pelos
campos estáveis de tenant, destinatário, tipo e categoria. O estado de leitura
não participa dessa validação, portanto marcar o cursor como lido não quebra a
próxima página de um filtro `unread`.

Resposta:

```json
{
  "notifications": [],
  "unreadCount": 0,
  "nextCursor": null
}
```

### Marcar uma como lida

`PATCH /api/provider/notifications/:id/read`

Retorna `404` quando a notificação não pertence ao escopo atual ou não existe. Repetir a ação em uma notificação já lida é seguro.

### Marcar todas como lidas

`PATCH /api/provider/notifications/read-all`

Atualiza apenas notificações não arquivadas e não lidas do tenant e destinatário
atual. Depois do sucesso, a interface refaz a consulta autenticada; ela não
presume contador zero, pois um evento pode ser criado concorrentemente.

## Integração com agendamento público

O fluxo está em `src/features/public-booking/public-booking-service.ts`.

1. O agendamento, valores personalizados, eventos e log de auditoria são gravados dentro da transação serializável existente.
2. A notificação é criada na mesma transação com o mesmo `Prisma.TransactionClient`.
3. O upsert usa dedupe determinística, portanto uma repetição segura não duplica o evento.

Com isso, uma falha de notificação aborta a transação inteira e nunca deixa o
agendamento confirmado sem o aviso durável correspondente.

A ação gerada para novos agendamentos aponta para uma rota real do projeto:

```text
/app/appointments?startDate=YYYY-MM-DD&appointmentId=UUID&highlight=notification
```

## Polling no frontend

A central é montada somente pelo layout do prestador. O painel administrativo e páginas públicas não iniciam polling.

- Consulta `GET /api/provider/notifications?limit=20` ao montar.
- Executa a cada 30 segundos somente quando a aba líder está visível.
- Consulta imediatamente quando a janela volta a receber foco.
- Impede requisições concorrentes.
- Limpa intervalos, listeners e timers no unmount.
- Erros de rede são silenciosos e a próxima execução tenta novamente.
- A carga inicial apenas popula a central. Não exibe toast nem toca som para notificações antigas.

Uma coordenação por `BroadcastChannel`, com fallback em `localStorage`, elege uma
única aba **visível** por tenant e usuário. A aba oculta libera o lease e não o
renova. Cada aba faz sua própria hidratação autenticada e silenciosa. O canal
transporta somente invalidações enumeradas (`notifications` ou `preferences`),
sem DTO, título, descrição, metadata ou URL; ao recebê-las, a aba consulta o
servidor novamente. Mensagens são validadas em runtime. Os ids vistos são locais
a cada aba, impedindo que uma aba avance a janela de alertas de outra.

## Drawer, badge, toast e título da aba

### Badge

O sino mostra `unreadCount`. O badge não aparece quando o valor é zero e mostra `9+` acima de nove notificações.

### Drawer

O drawer lateral combina no servidor os filtros primários `Todas` e `Não lidas` com a
categoria `Todas`, `Agendamentos`, `Financeiro` ou `Sistema`. Possui estados
vazio e vazio por filtro, leitura individual, leitura em massa, foco visível e
fechamento por botão, clique no backdrop ou tecla `Escape`. A paginação por
cursor mantém páginas anteriores durante polling e suporta listas acima de 20
itens. Preferências ficam disponíveis inline para qualquer membership ativo,
inclusive `OPERATOR`.

Abrir o drawer não marca tudo como lido. Um item sem destino é marcado ao ser
ativado; quando há `actionUrl`, a linha inteira é acionável por ponteiro ou
teclado, marca a leitura e navega para o contexto correto.

### Toast

O toast usa a notificação nova mais relevante disponível. Agendamentos públicos e notificações de prioridade `high` ou `critical` têm preferência; se apenas outros tipos novos chegarem no mesmo ciclo, a mais recente é exibida.

O toast tem ação `Ver agendamento`, botão de fechar e expira automaticamente após oito segundos. Fechá-lo não altera o estado de leitura.

### Título da aba

Quando há não lidas, o título recebe o prefixo `(N)`. Um novo agendamento público exibe temporariamente `Novo agendamento! | ...` por cinco segundos, então volta ao contador. Ao desmontar a central, o título base é restaurado.

## Destaque na Agenda

A URL de notificação usa `startDate`, `appointmentId` e `highlight=notification`.

- A página valida o UUID antes de carregar o detalhe do agendamento.
- Datas inválidas usam o fallback existente da Agenda.
- Ao detectar uma nova notificação enquanto a Agenda está aberta, o painel faz `router.refresh()`.
- Quando a navegação veio com `highlight=notification`, o card correspondente recebe borda e selo `Novo` por seis segundos.
- Depois desse período, o destaque é removido sem alterar o agendamento.

## Som e preferência persistida

O som é uma preferência por usuário e tenant persistida no banco. O servidor é
a fonte de verdade; atualizações são serializadas e uma falha força reconsulta
canônica antes de processar a próxima alteração.

Chaves usadas:

```text
agendai:sound-permission-dismissed:<tenantId>:<userId>
```

Na primeira visita ao painel, o usuário pode ativar ou recusar alertas sonoros.
A chave local registra somente a dispensa do convite naquele navegador; não
altera a preferência do servidor. A central e a página de configurações usam os
mesmos controles e oferecem `Testar som` com feedback de autoplay.

O som só é tentado para `public_booking_created` e
`booking_confirmation_required` detectadas após a carga inicial. Falhas de
autoplay não interrompem o painel e são comunicadas ao usuário.

## Arquivo de áudio

O arquivo esperado é:

```text
public/sounds/new-booking.mp3
```

Adicione um MP3 curto e suave nessa localização. Ele é servido pelo Next.js em `/sounds/new-booking.mp3`. A ausência do arquivo não quebra a central, apenas faz o navegador ignorar a tentativa de reprodução.

## Teste manual

1. Aplique migrations pendentes com `pnpm db:deploy`.
2. Entre no painel de um prestador e confira o sino sem badge, ou com o total atual.
3. Ative ou teste o som no prompt, na área inline da central ou em Configurações.
4. Em outra aba ou dispositivo, conclua um agendamento pelo link público.
5. Volte ao painel ou aguarde até 30 segundos.
6. Verifique toast, badge, título da aba e som, se habilitado.
7. Abra o drawer e valide filtros, tempo relativo, leitura individual e `Ler todas`.
8. Ative a linha do agendamento e confirme a navegação para a data correta com destaque temporário.
9. Repita a atualização ou recarregue o fluxo e confirme que não surge uma notificação duplicada para o mesmo agendamento.
10. Tente acessar os endpoints sem sessão ou com outro tenant e confirme que dados de outro tenant não são retornados.

## Fase 2

### Eventos implementados

`payment_pending` é criado quando o prestador altera um agendamento para
`FINISHED` sem haver lançamento financeiro `PAID` associado ao atendimento. A
notificação usa o mesmo `Prisma.TransactionClient`; uma falha desfaz toda a
transação de finalização, evitando estado de domínio sem o evento durável.

Ela usa o agendamento como entidade, prioridade `medium`, ação para `/app/financial` e os campos públicos de cliente, serviço, data e horário no metadata. A deduplicação existente impede mais de uma notificação desse tipo para o mesmo agendamento.

### Eventos preparados, dependentes de fluxo futuro

- `booking_canceled`: o projeto ainda não possui cancelamento público pelo cliente.
- `booking_rescheduled`: o projeto ainda não possui reagendamento público pelo cliente.
- `payment_received`: permanece previsto, mas não é criado nesta fase.
- `booking_starting_soon`: continua dependente de job ou scheduler e não foi implementado.

Os tipos, as preferências e os filtros já suportam cancelamentos e reagendamentos quando esses fluxos forem adicionados.

### Preferências persistidas

As preferências agora são armazenadas por usuário e tenant em `provider_notification_preferences`. Os valores padrão são:

```ts
{
  panelNotificationsEnabled: true,
  soundEnabled: false,
  publicBookingNotificationsEnabled: true,
  cancellationNotificationsEnabled: true,
  rescheduleNotificationsEnabled: true,
  paymentNotificationsEnabled: true,
}
```

Endpoints:

- `GET /api/provider/notifications/preferences`
- `PATCH /api/provider/notifications/preferences`

O PATCH aceita somente os seis campos booleanos conhecidos. O tenant e o usuário
são inferidos da sessão. Quando não há registro, o GET retorna os defaults e
informa `hasStoredPreferences: false`. Esse sinal não autoriza migração ou
promoção de valor vindo do navegador.

O servidor é a fonte de verdade de `soundEnabled`. O `localStorage` guarda
somente a dispensa local do convite de ativação e serve como transporte de
fallback para sincronização entre abas; ele não concede nem altera a
preferência do servidor.

### Central, filtros, toast e som

O drawer combina `Todas`/`Não lidas` com a categoria `Todas`, `Agendamentos`,
`Financeiro` ou `Sistema` e envia ambos os filtros ao endpoint.

- Agendamentos incluem os tipos de criação, confirmação, cancelamento e reagendamento.
- Financeiro inclui `payment_pending` e `payment_received`.
- Sistema inclui `business_setup_incomplete` e `system`.

As preferências controlam a apresentação no painel, não a existência da notificação no banco. Quando `panelNotificationsEnabled` está desligado, novos eventos não exibem toast nem som. O som continua restrito a `public_booking_created` e `booking_confirmation_required` após o carregamento inicial.

### Teste manual da Fase 2

1. Execute `pnpm db:deploy` para aplicar a migration de preferências.
2. Abra as preferências inline da central ou Configurações e altere as opções de Notificações. Recarregue a página e confirme a persistência.
3. Coloque um agendamento em andamento e altere o status para `FINISHED` sem usar checkout ou registrar pagamento.
4. Mantenha o painel aberto, aguarde o polling ou alterne o foco da aba.
5. Confirme a notificação `Pagamento pendente`, o filtro Financeiro e a ação para o financeiro.
6. Finalize um atendimento via checkout. Como o checkout cria lançamento `PAID`, ele não deve criar `payment_pending`.

## Fase 3 planejada

- Cancelamento e reagendamento públicos do cliente, com as notificações preparadas nesta fase.
- `payment_received`, se houver uma regra de evento operacional para pagamento registrado.
- WebSocket ou Server-Sent Events para entrega em tempo real.
- Arquivamento e política de retenção de notificações.
- Canais externos, como push, e-mail e WhatsApp.
