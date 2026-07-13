# Notificações do prestador

## Objetivo

O módulo de notificações permite que o prestador acompanhe eventos operacionais no painel, com foco inicial nos agendamentos feitos pelo link público. Ele oferece uma central de notificações, badge de não lidas, toast, som opcional e navegação direta para o agendamento relacionado.

O MVP usa polling. Não há WebSocket, Server-Sent Events, push notification nativa, e-mail ou WhatsApp neste módulo.

## Eventos gerados atualmente

O sistema possui tipos preparados para eventos futuros, mas cria notificações apenas para agendamentos públicos persistidos com sucesso:

| Situação | Tipo | Prioridade |
| --- | --- | --- |
| Serviço com confirmação automática (`BookingMode.DIRECT`) | `public_booking_created` | `medium` |
| Serviço que exige confirmação manual (`BookingMode.REQUIRES_CONFIRMATION`) | `booking_confirmation_required` | `high` |

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
| `recipientUserId` | Usuário destinatário opcional. Quando é nulo, a notificação é compartilhada com os usuários do tenant. |
| `type` | Tipo funcional da notificação. |
| `priority` | `low`, `medium`, `high` ou `critical`. |
| `title` e `description` | Texto apresentado no drawer e no toast. |
| `entityType` e `entityId` | Referência opcional à entidade relacionada. Para o MVP, usam `appointment` e o id do agendamento. |
| `actionUrl` | URL interna para abrir o contexto relacionado. |
| `readAt` | Data da leitura. `null` significa não lida. |
| `archivedAt` | Data de arquivamento. Arquivadas não são retornadas pela API padrão. |
| `metadata` | Dados auxiliares serializáveis para apresentação e roteamento. |
| `createdAt` e `updatedAt` | Datas de criação e atualização. |

Relações e remoções:

- A notificação pertence a um `Tenant` com `onDelete: Cascade`.
- O destinatário opcional pertence a `User` com `onDelete: SetNull`.
- Há índices para `tenantId + createdAt`, `tenantId + readAt`, `tenantId + type` e `recipientUserId`.

## Deduplicação

Existe uma restrição única em `tenantId + type + entityId`.

Para notificações que possuem `entityId`, `createProviderNotification` usa `upsert`. Assim, a mesma combinação de tenant, tipo de evento e agendamento retorna a notificação existente em vez de criar outra.

O fluxo público usa `entityType: "appointment"` e o id do agendamento como `entityId`. Isso evita duplicidade para o mesmo agendamento público caso a criação da notificação seja reexecutada.

## Escopo por tenant e destinatário

As APIs não recebem `tenantId` do cliente. Elas obtêm o usuário autenticado e seu contexto de tenant pelo padrão de autenticação do projeto.

Toda leitura e atualização aplica simultaneamente:

- `tenantId` do contexto ativo;
- `archivedAt: null`;
- `recipientUserId: null` ou `recipientUserId` igual ao usuário autenticado.

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
| `limit` | De 1 a 30, com padrão 20 |
| `cursor` | Id retornado em `nextCursor` |

A lista é ordenada por `createdAt desc` e `id desc`. O cursor é validado no escopo do tenant e destinatário atual antes de ser usado.

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

Atualiza apenas notificações não arquivadas e não lidas do tenant e destinatário atual.

## Integração com agendamento público

O fluxo está em `src/features/public-booking/public-booking-service.ts`.

1. O agendamento, valores personalizados, eventos e log de auditoria são gravados dentro da transação serializável existente.
2. A transação retorna os dados necessários para a notificação somente após o agendamento ter sido persistido.
3. Depois do commit, o serviço tenta criar a notificação em um `try/catch` seguro.

Com isso, uma falha de notificação não cancela nem devolve erro para o agendamento do cliente. O erro é registrado sem incluir dados sensíveis no log.

A ação gerada para novos agendamentos aponta para uma rota real do projeto:

```text
/app/appointments?startDate=YYYY-MM-DD&appointmentId=UUID&highlight=notification
```

## Polling no frontend

A central é montada somente pelo layout do prestador. O painel administrativo e páginas públicas não iniciam polling.

- Consulta `GET /api/provider/notifications?limit=20` ao montar.
- Executa a cada 30 segundos somente quando a aba está visível.
- Consulta imediatamente quando a janela volta a receber foco.
- Impede requisições concorrentes.
- Limpa intervalos, listeners e timers no unmount.
- Erros de rede são silenciosos e a próxima execução tenta novamente.
- A carga inicial apenas popula a central. Não exibe toast nem toca som para notificações antigas.

Os ids já vistos são mantidos em memória para impedir toast e som duplicados na sessão atual.

## Drawer, badge, toast e título da aba

### Badge

O sino mostra `unreadCount`. O badge não aparece quando o valor é zero e mostra `9+` acima de nove notificações.

### Drawer

O drawer lateral possui filtros `Todas` e `Não lidas`, estado vazio, leitura individual, leitura em massa, foco visível e fechamento por botão, clique no backdrop ou tecla `Escape`.

Abrir o drawer não marca tudo como lido. Um item não lido é marcado ao ser ativado; a ação `Ver agendamento` também marca o item antes de navegar.

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

## Som e preferência local

O som é uma preferência local do navegador, não uma configuração persistida no banco.

Chaves usadas:

```text
agendai:sound-enabled
agendai:sound-permission-dismissed
```

Na primeira visita ao painel, o usuário pode ativar ou recusar alertas sonoros. A recusa não mostra o prompt novamente. A opção em Configurações do negócio atualiza a mesma preferência local.

O som só é tentado para `public_booking_created` e `booking_confirmation_required` detectadas após a carga inicial. Falhas de autoplay ou de arquivo são ignoradas para não interromper o painel.

## Arquivo de áudio

O arquivo esperado é:

```text
public/sounds/new-booking.mp3
```

Adicione um MP3 curto e suave nessa localização. Ele é servido pelo Next.js em `/sounds/new-booking.mp3`. A ausência do arquivo não quebra a central, apenas faz o navegador ignorar a tentativa de reprodução.

## Teste manual

1. Aplique migrations pendentes com `pnpm db:deploy`.
2. Entre no painel de um prestador e confira o sino sem badge, ou com o total atual.
3. Ative o som no prompt ou em Configurações do negócio.
4. Em outra aba ou dispositivo, conclua um agendamento pelo link público.
5. Volte ao painel ou aguarde até 30 segundos.
6. Verifique toast, badge, título da aba e som, se habilitado.
7. Abra o drawer e valide filtros, tempo relativo, leitura individual e `Ler todas`.
8. Use `Ver agendamento` e confirme a navegação para a data correta com destaque temporário.
9. Repita a atualização ou recarregue o fluxo e confirme que não surge uma notificação duplicada para o mesmo agendamento.
10. Tente acessar os endpoints sem sessão ou com outro tenant e confirme que dados de outro tenant não são retornados.

## Fase 2

### Eventos implementados

`payment_pending` é criado quando o prestador altera um agendamento para `FINISHED` sem haver lançamento financeiro `PAID` associado ao atendimento. A notificação é criada após a transação de status e não desfaz a finalização se falhar.

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

O PATCH aceita somente os seis campos booleanos conhecidos. O tenant e o usuário são inferidos da sessão. Quando não há registro, o GET retorna os defaults e informa `hasStoredPreferences: false` para permitir a migração segura da preferência local de som.

O localStorage continua como fallback de migração para `soundEnabled`. Depois da primeira leitura, a preferência é persistida no servidor.

### Central, filtros, toast e som

O drawer possui as abas `Todas`, `Não lidas`, `Agendamentos`, `Financeiro` e `Sistema`.

- Agendamentos incluem os tipos de criação, confirmação, cancelamento e reagendamento.
- Financeiro inclui `payment_pending` e `payment_received`.
- Sistema inclui `business_setup_incomplete` e `system`.

As preferências controlam a apresentação no painel, não a existência da notificação no banco. Quando `panelNotificationsEnabled` está desligado, novos eventos não exibem toast nem som. O som continua restrito a `public_booking_created` e `booking_confirmation_required` após o carregamento inicial.

### Teste manual da Fase 2

1. Execute `pnpm db:deploy` para aplicar a migration de preferências.
2. Acesse Configurações do negócio e altere as opções de Notificações. Recarregue a página e confirme a persistência.
3. Coloque um agendamento em andamento e altere o status para `FINISHED` sem usar checkout ou registrar pagamento.
4. Mantenha o painel aberto, aguarde o polling ou alterne o foco da aba.
5. Confirme a notificação `Pagamento pendente`, o filtro Financeiro e a ação para o financeiro.
6. Finalize um atendimento via checkout. Como o checkout cria lançamento `PAID`, ele não deve criar `payment_pending`.

## Fase 3 planejada

- Cancelamento e reagendamento públicos do cliente, com as notificações preparadas nesta fase.
- `payment_received`, se houver uma regra de evento operacional para pagamento registrado.
- WebSocket ou Server-Sent Events para entrega em tempo real.
- Arquivamento, retenção e paginação visual de notificações.
- Canais externos, como push, e-mail e WhatsApp.
