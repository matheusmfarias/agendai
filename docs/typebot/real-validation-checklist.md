# Checklist de Validação — Typebot Real

Roteiro de testes para validar a montagem do fluxo real no Typebot. Execute
cada item e marque como concluído.

---

## Pré-validação no Simulador

Antes de testar no Typebot, valide o fluxo no simulador interno do AgendaZap:

- [ ] Acessar `/admin/typebot-simulator` como Super Admin
- [ ] Selecionar o mesmo tenant que será usado no Typebot real
- [ ] Executar o fluxo completo: cliente → serviços → horário → confirmar
- [ ] Verificar se o agendamento aparece no painel com `origin = WHATSAPP`
- [ ] Testar cenário de erro: tenant sem WhatsApp, serviço inativo, etc.

Documentação do simulador: [simulator.md](./simulator.md)

---

## 0. Credenciais Typebot e Health Check

Antes de configurar o Typebot, valide as credenciais e o status no painel admin:

- [ ] Acessar `/admin/tenants/[id]` e clicar em "Credenciais Typebot"
- [ ] Verificar o card **Status da integração Typebot** — deve mostrar **READY**
- [ ] Se mostrar **BLOCKED** ou **WARNING**, resolver os checks com ✗
- [ ] Verificar os checks de política de assinatura: status, dias vencidos, canais permitidos
- [ ] Gerar uma nova credencial com nome descritivo
- [ ] Copiar o token exibido (prefixo `agz_tb_`) — ele não será exibido novamente
- [ ] Verificar que o prefixo aparece na tabela (apenas primeiros 16 caracteres)
- [ ] Verificar que o token completo **não** aparece na tabela
- [ ] Revogar uma credencial de teste e confirmar que aparece como "Revogada"
- [ ] Tentar usar a credencial revogada → deve retornar `401 UNAUTHORIZED`

## 1. Configuração inicial

- [ ] `apiBaseUrl` configurada corretamente (HTTPS, sem `/` no final)
- [ ] `tenantSlug` preenchido com o slug correto do prestador
- [ ] `typebotApiKey` preenchida com o token da credencial do tenant (prefixo `agz_tb_`)
- [ ] `typebotApiKey` **não** aparece em nenhuma mensagem visível ao cliente
- [ ] Todas as variáveis da conversa criadas (ver [real-variable-mapping.md](./real-variable-mapping.md))

---

## 2. Bloco Business

- [ ] `GET /business` retorna 200
- [ ] `tenantName` é exibido na mensagem de abertura
- [ ] `tenantWhatsapp`, `tenantCity`, `tenantState` são salvos
- [ ] Se `BUSINESS_UNAVAILABLE`, exibe mensagem genérica (não expõe motivo)
- [ ] Timeout ou erro de rede tem fallback

---

## 3. Bloco Identify Customer

- [ ] `POST /customers/identify` retorna 200
- [ ] `customerId` e `sessionId` são salvos
- [ ] Cliente novo é criado se telefone não existir
- [ ] Cliente existente é reutilizado se telefone já cadastrado
- [ ] Telefone com formatação inválida retorna `VALIDATION_ERROR`
- [ ] Nome com menos de 2 caracteres retorna `VALIDATION_ERROR`

---

## 4. Bloco Services

- [ ] `GET /services` retorna 200
- [ ] `servicesJson` contém array com `number`, `id`, `name`, etc.
- [ ] `servicesText` é exibido como lista numerada
- [ ] Serviços inativos **não** aparecem
- [ ] Categorias inativas **não** aparecem

---

## 5. Escolha de serviço

- [ ] Cliente digita número válido → mapeia para `selectedServiceId`
- [ ] Cliente digita número inválido (0, 99) → mensagem "Não encontrei essa opção"
- [ ] `selectedServiceId` vem do array, não de texto livre
- [ ] `selectedServiceName` é salvo para exibição

---

## 6. Bloco Service Detail

- [ ] `GET /services/{id}` retorna 200
- [ ] `selectedServiceDetailsJson` contém dados completos
- [ ] `customFieldsJson` contém campos ativos (ou array vazio)
- [ ] Campos inativos **não** aparecem em `customFieldsJson`
- [ ] Ordem dos campos respeita `order`/`position`
- [ ] `customFieldsText` é exibido se houver campos
- [ ] Se `SERVICE_NOT_FOUND`, volta para lista de serviços

---

## 7. Campos personalizados

- [ ] Se `customFieldsJson` vazio → etapa pulada, `customValuesJson = []`
- [ ] Campo `TEXT` → input de texto
- [ ] Campo `TEXTAREA` → input de texto (longo)
- [ ] Campo `NUMBER` → input numérico
- [ ] Campo `DATE` → input de data
- [ ] Campo `BOOLEAN` → choice Sim/Não
- [ ] Campo `SELECT` → choice com opções de `field.options`
- [ ] Campo `required: true` → exigido na conversa
- [ ] `customValuesJson` é montado no formato correto
- [ ] `customFieldId` usa o UUID do campo (não o `key` nem número)
- [ ] Se API retornar `CUSTOM_FIELD_REQUIRED` → volta para coleta
- [ ] Se API retornar `CUSTOM_FIELD_INVALID` → volta para coleta

---

## 8. Bloco Slots

- [ ] `GET /services/{id}/slots?days=7` retorna 200
- [ ] `slotsJson` contém array com `number`, `startsAt`, `label`
- [ ] `slotsText` é exibido como lista numerada
- [ ] Horários no passado **não** aparecem
- [ ] Conflitos e bloqueios são respeitados
- [ ] Se `NO_SLOTS_AVAILABLE`, exibe mensagem com alternativas
- [ ] Se `SERVICE_NOT_FOUND`, volta para serviços

---

## 9. Escolha de horário

- [ ] Cliente digita número válido → mapeia para `selectedSlotStartsAt`
- [ ] Cliente digita número inválido → mensagem de erro
- [ ] `selectedSlotStartsAt` usa o valor exato da API (ISO 8601)
- [ ] Typebot **não** monta `startsAt` manualmente
- [ ] `selectedSlotLabel` é salvo para exibição

---

## 10. Confirmação

- [ ] Resumo exibe serviço, horário, nome do cliente
- [ ] Campos personalizados preenchidos aparecem no resumo
- [ ] Cliente pode confirmar ou cancelar
- [ ] Cancelar → mensagem de desistência → encerramento

---

## 11. Bloco Create Appointment

- [ ] `POST /appointments` retorna 201
- [ ] Body inclui `sessionId`, `customerId`, `serviceId`, `startsAt`
- [ ] `customValues` e `customerNotes` são enviados
- [ ] `appointmentId`, `appointmentStatus`, `appointmentMessage` são salvos
- [ ] Agendamento criado tem `origin = WHATSAPP`
- [ ] `createdByUserId = null` no registro
- [ ] `appointment_event` é criado
- [ ] `audit_log` é criado com `TYPEBOT_APPOINTMENT_CREATED`
- [ ] `typebot_session` é atualizada
- [ ] `bookingMode` é respeitado:
  - `DIRECT` → `CONFIRMED`
  - `REQUIRES_CONFIRMATION` → `REQUESTED`
  - `INFORMATIONAL` → `WAITING_INFO`

---

## 12. Bloco Query Appointment (se implementado)

- [ ] `GET /appointments/{id}` retorna 200
- [ ] Dados completos (`serviceName`, `customerName`, `priceText`) disponíveis
- [ ] Mensagem final usa dados da consulta

---

## 13. Mensagens finais

- [ ] `CONFIRMED`: exibe confirmação com dados do agendamento
- [ ] `REQUESTED`: exibe que aguarda confirmação, WhatsApp de contato
- [ ] `WAITING_INFO`: exibe que prestador entrará em contato
- [ ] Nenhum dado interno (API key, stack trace, IDs) é exibido

---

## 14. Tratamento de erros

- [ ] `BUSINESS_UNAVAILABLE` → mensagem genérica, sem expor motivo
- [ ] `SERVICE_NOT_FOUND` → volta para lista atualizada
- [ ] `NO_SLOTS_AVAILABLE` → mensagem com alternativas
- [ ] `SLOT_UNAVAILABLE` → volta para buscar slots atualizados
- [ ] `INVALID_SLOT` → volta para escolha de horário
- [ ] `CUSTOM_FIELD_REQUIRED` → volta para coleta do campo
- [ ] `CUSTOM_FIELD_INVALID` → volta para coleta do campo
- [ ] `SESSION_NOT_FOUND` → reinicia fluxo
- [ ] `CUSTOMER_REQUIRED` → volta para identify
- [ ] `VALIDATION_ERROR` → mensagem apropriada
- [ ] `RATE_LIMITED` → aguardar e tentar novamente
- [ ] Timeout / 5xx → fallback genérico
- [ ] `401 UNAUTHORIZED` → não exposto ao cliente
- [ ] `429 RATE_LIMITED` → mensagem apropriada ao cliente (tentar novamente em instantes)
- [ ] Rate limit respeita os limites por grupo (leitura 120/min, escrita 30/min)
- [ ] Nenhum stack trace aparece em mensagem
- [ ] Nenhum segredo, token ou erro bruto de banco é exibido

---

## 14.5 Política de assinatura (enforcement)

- [ ] Com assinatura ativa (não vencida): Typebot funciona normalmente
- [ ] Com 1-7 dias vencido: Typebot funciona, aviso no dashboard do prestador
- [ ] Com 8-15 dias vencido: POST /appointments retorna `BUSINESS_UNAVAILABLE`, consultas funcionam
- [ ] Com >15 dias vencido: todos endpoints retornam `BUSINESS_UNAVAILABLE`
- [ ] Dashboard do prestador mostra aviso correspondente ao estágio
- [ ] Mensagens públicas NÃO revelam inadimplência
- [ ] Audit log registra `SUBSCRIPTION_ENFORCEMENT_BLOCKED_TYPEBOT_APPOINTMENT`
- [ ] Simulador mostra status da política para Super Admin

---

## 15. Verificações finais

- [ ] Agendamento aparece no painel administrativo (`/admin/appointments`)
- [ ] Agendamento aparece no painel do prestador (`/app/appointments`)
- [ ] `origin = WHATSAPP` visível no registro
- [ ] `createdByUserId = null` no registro
- [ ] Audit log registra `TYPEBOT_APPOINTMENT_CREATED`
- [ ] Audit log registra `TYPEBOT_CREDENTIAL_CREATED` (geração de token)
- [ ] Audit log registra `TYPEBOT_CREDENTIAL_REVOKED` (se revogou)
- [ ] Token do tenant A não autentica requisições para o tenant B
- [ ] Endpoints Typebot continuam funcionando
- [ ] `BUSINESS_UNAVAILABLE` ao criar agendamento com assinatura vencida 8+ dias
- [ ] `BUSINESS_UNAVAILABLE` em todos endpoints com assinatura vencida >15 dias
- [ ] Audit log registra `SUBSCRIPTION_ENFORCEMENT_BLOCKED_TYPEBOT_APPOINTMENT`
- [ ] Simulador continua funcionando
- [ ] Link público web continua funcionando

---

## 16. Testes de regressão rápida

- [ ] `pnpm typecheck` passa
- [ ] `pnpm lint` passa
- [ ] `pnpm test` passa
- [ ] `pnpm build` passa

---

## Referências

- [Guia principal](./real-setup-guide.md)
- [Passo a passo dos blocos](./real-flow-steps.md)
- [Blocos HTTP](./real-http-blocks.md)
- [Variáveis e mapeamento](./real-variable-mapping.md)
- [Guia de teste manual](./testing-guide.md)
- [Simulador](./simulator.md)
- [Troubleshooting](./troubleshooting.md)
- [Política de assinatura](../technical/subscription-enforcement.md)
