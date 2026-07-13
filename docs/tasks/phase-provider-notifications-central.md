# Central de notificações durável, multiusuário e acessível

## Contexto

A central existente usa `ProviderNotification.readAt` compartilhado, dedupe por
tenant/tipo/entidade e gravação pós-commit no booking público. Isso não preserva
leitura individual de broadcasts, não inclui audience na idempotência e pode
perder notificações após o commit do agendamento.

## Escopo

Inclui modelo de audience e receipts, producers transacionais, API paginada e
sanitizada, central responsiva no shell, política de alertas/múltiplas abas,
status canônico de appointments, testes e documentação. Não inclui outbox,
worker, WebSocket, SSE, push externo ou nova regra comercial.

## Regras e contratos

- Tenant vem exclusivamente do contexto autenticado.
- Broadcast `TENANT` usa receipt por usuário; private `USER` exige membership
  ativo e recipient do mesmo tenant.
- `readAt` legado permanece apenas para compatibilidade e não recebe novas
  escritas.
- `actionUrl` aceita somente caminhos internos sob `/app`.
- Metadata de resposta usa allowlist; UUID/cursor inválidos retornam 400.
- Producers persistem notification na mesma transação da mudança de domínio.
- Polling inicial é silencioso; apenas o líder entre abas emite toast/som.

## Decisões

- `ProviderNotificationAudience` explícito e `ProviderNotificationRead` com
  chave única notification/tenant/user.
- `dedupeKey` determinística inclui audience, recipient, tipo e entidade; o
  isolamento do tenant vem da unique composta `(tenantId, dedupeKey)`.
- Broadcast legado com `readAt` não é fanout; private legado com recipient gera
  receipt conservador.
- Polling permanece HTTP; coordenação usa BroadcastChannel e fallback storage.

## Plano de implementação

1. Schema e migration aditiva/atômica com backfill e invariantes.
2. Serviço/serializer/policy e API tenant-scoped.
3. Producers transacionais de booking público e FINISHED pendente.
4. Provider/contexto no shell e central responsiva/acessível.
5. Apresentação canônica de status nas superfícies ativas.
6. Testes focados, documentação e checks.

## Estratégia de testes

Migration/backfill/checks; A/B para list/read/read-all/private; serializer,
UUID/action URL; idempotência e falha transacional de producers; paginação;
policy de alertas e coordenação multiaba; status e derivação temporal.

## Dados e rollout

Migration nova, aditiva e transacional. Rollback lógico mantém `readAt` legado,
mas o rollback físico exige remover receipts/novos campos antes dos tipos.
A migration foi aplicada no banco local canônico e validada sem drift.

Antes de qualquer deploy, auditar dados históricos com `recipient_user_id`. A
versão anterior usava `SET NULL` e o código versionado não possuía producers
privados, mas isso não comprova a intenção de todos os registros de cada
ambiente. Notificações privadas sem membership comprovada só podem ser
arquivadas ou expurgadas com evidência; nunca convertidas automaticamente em
broadcast, atribuídas a outro usuário ou distribuídas por fanout.

## Documentação

Atualizar `docs/provider-notifications.md` e documentos técnicos afetados.

## Validação

- `pnpm lint`: aprovado.
- `pnpm typecheck`: aprovado.
- `pnpm build`: aprovado.
- `pnpm test`: 37 arquivos e 280 testes aprovados.
- Prisma `validate`, `migrate status` e `migrate diff`: aprovados, sem drift.
- `git diff --check`: aprovado.

## Progresso

- [x] Exploração inicial e arquitetura consolidada.
- [x] Foundation concluída.
- [x] Producers e API concluídos.
- [x] UI, alertas e status concluídos.
- [x] Testes e documentação concluídos.
- [x] Checks completos aprovados.
- [x] QA, revisão e segurança concluídos sem bloqueadores pendentes.

## Achados e acompanhamento

- Preservar a remoção preexistente do subtítulo da central.
- `.gitignore` e mudanças não relacionadas ficam fora da entrega.
- Todos os achados válidos de QA, reviewer e security foram corrigidos e
  revalidados antes do fechamento.
