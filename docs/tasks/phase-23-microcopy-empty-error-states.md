# Task - Phase 23 Microcopy, Empty States & Error States

## Objetivo

Padronizar e melhorar a microcopy, os estados vazios, os estados de erro, os avisos e as mensagens de confirmação do AgendaZap.

As fases 16 a 22 elevaram a identidade visual e a experiência das principais áreas do produto. Agora o foco deve ser a camada de linguagem e feedback do sistema.

Esta fase deve fazer o AgendaZap parecer mais claro, confiável e humano em todos os pontos onde o usuário precisa entender:

```text
- o que aconteceu
- o que precisa fazer agora
- por que algo está indisponível
- qual ação foi concluída
- qual erro ocorreu
- se o erro é corrigível pelo usuário
- qual é o próximo passo
```

O objetivo é reduzir mensagens genéricas, técnicas ou frias, sem alterar regras de negócio.

---

# Dependências

Esta task depende da conclusão e validação das fases:

```text
/docs/tasks/phase-01-foundation.md
/docs/tasks/phase-02-admin-platform.md
/docs/tasks/phase-02-1-provider-login-access.md
/docs/tasks/phase-03-provider-panel.md
/docs/tasks/phase-04-customers-appointments-core.md
/docs/tasks/phase-05-public-booking-link.md
/docs/tasks/phase-05-1-public-customer-auth.md
/docs/tasks/phase-05-2-public-routing-refactor.md
/docs/tasks/phase-06-typebot-api.md
/docs/tasks/phase-07-typebot-flow-blueprint.md
/docs/tasks/phase-08-typebot-service-details-custom-fields.md
/docs/tasks/phase-09-typebot-flow-simulator.md
/docs/tasks/phase-10-typebot-real-setup-guide.md
/docs/tasks/phase-11-typebot-tenant-credentials.md
/docs/tasks/phase-12-typebot-production-readiness.md
/docs/tasks/phase-13-subscription-enforcement.md
/docs/tasks/phase-14-segment-templates.md
/docs/tasks/phase-15-provider-onboarding-wizard.md
/docs/tasks/phase-16-visual-identity-design-system-foundation.md
/docs/tasks/phase-17-login-auth-experience-redesign.md
/docs/tasks/phase-18-public-booking-experience-redesign.md
/docs/tasks/phase-19-provider-dashboard-app-shell-redesign.md
/docs/tasks/phase-20-data-tables-responsive-lists.md
/docs/tasks/phase-21-admin-experience-redesign.md
/docs/tasks/phase-22-provider-operations-ux.md
```

Antes de implementar, leia obrigatoriamente:

```text
.ai/PROJECT_RULES.md
.ai/skills/frontend-design.md
diagnostico-frontend-2026-06-26.md
inventario-telas-2026-06-26.md
/docs/design/visual-identity.md
/docs/design/design-system-foundation.md
/docs/design/public-booking-experience.md
/docs/design/provider-dashboard-experience.md
/docs/design/data-tables-responsive-lists.md
/docs/design/provider-operations-ux.md
/docs/specs/00-visao-produto.md
/docs/specs/01-usuarios-permissoes.md
/docs/specs/02-admin-plataforma.md
/docs/technical/subscription-enforcement.md
/docs/technical/typebot-api.md
/docs/technical/padroes-codigo.md
README.md
```

---

# Escopo

Revisar linguagem e feedback visual em:

```text
/login
/access-denied

/[tenantSlug]
/[tenantSlug]/services
/[tenantSlug]/book
/[tenantSlug]/book/confirm

/app/dashboard
/app/settings
/app/services
/app/services/new
/app/services/[id]
/app/services/[id]/edit
/app/services/categories
/app/services/categories/new
/app/services/categories/[id]/edit
/app/customers
/app/customers/new
/app/customers/[id]
/app/customers/[id]/edit
/app/appointments
/app/appointments/new
/app/appointments/[id]
/app/appointments/[id]/edit
/app/availability
/app/availability/blocks
/app/onboarding

/admin/dashboard
/admin/tenants
/admin/tenants/new
/admin/tenants/[id]
/admin/tenants/[id]/access
/admin/tenants/[id]/reset-password
/admin/tenants/[id]/typebot-credentials
/admin/tenants/[id]/templates
/admin/plans
/admin/subscriptions
/admin/audit-logs
/admin/typebot-simulator
```

Também revisar componentes compartilhados de feedback:

```text
src/components/ui/alert.tsx
src/components/ui/empty-state.tsx
src/components/ui/form-feedback.tsx
src/components/ui/status-badge.tsx
src/components/ui/list-page-shell.tsx
src/features/*/...
```

---

# Regras críticas

Preservar integralmente:

```text
- autenticação
- roles
- permissões
- isolamento multi-tenant
- subscription enforcement
- onboarding
- server actions
- validações Zod
- fluxos de criação/edição/inativação
- regras de disponibilidade
- conflitos de agendamento
- Typebot API
- link público
- templates
- audit logs
```

Não alterar:

```text
- Prisma schema
- migrations
- endpoints
- cookies
- redirects
- status machine de agendamento
- política de assinatura
- payloads
- queries críticas
```

Esta fase é de linguagem, apresentação e feedback. Não mudar comportamento funcional.

---

# Problemas a corrigir

Procurar e melhorar textos como:

```text
- "Erro"
- "Falha"
- "Submit"
- "Enviar"
- "Dados inválidos"
- "Operação realizada"
- "Não encontrado"
- "Sem registros"
- "Ação não permitida"
- "Status"
- "Origin"
- "PUBLIC_LINK"
- "MANUAL_PANEL"
- "WHATSAPP"
- "DIRECT"
- "REQUIRES_CONFIRMATION"
- "INFORMATIONAL"
- "FIXED"
- "STARTING_AT"
- "ON_REQUEST"
- "HIDDEN"
```

Substituir por linguagem humana e contextual.

---

# Princípios de microcopy

## 1. Dizer o que aconteceu

Ruim:

```text
Erro ao salvar.
```

Melhor:

```text
Não foi possível salvar as alterações agora.
```

## 2. Dizer o que o usuário pode fazer

Melhor ainda:

```text
Não foi possível salvar as alterações agora. Confira os campos destacados e tente novamente.
```

## 3. Não expor detalhe técnico

Evitar:

```text
Foreign key constraint failed.
Tenant not found.
Subscription policy blocked external booking.
```

Usar:

```text
Não foi possível concluir esta ação. Atualize a página e tente novamente.
```

ou, quando for seguro:

```text
Este agendamento não está mais disponível. Escolha outro horário.
```

## 4. Diferenciar público interno e público externo

Para prestador/admin, pode explicar mais:

```text
A assinatura está vencida e novos agendamentos externos estão temporariamente bloqueados.
```

Para cliente final, usar mensagem genérica:

```text
O agendamento online está temporariamente indisponível. Entre em contato diretamente com o estabelecimento.
```

## 5. Não prometer recurso que não existe

Evitar:

```text
Você receberá uma notificação por WhatsApp.
```

A menos que isso exista no produto.

---

# 1. Estados vazios

Padronizar empty states.

## Estrutura recomendada

```text
Título claro
Descrição útil
Ação principal, quando existir
Ação secundária, se fizer sentido
```

## Exemplos

### Serviços

```text
Nenhum serviço cadastrado
Cadastre seus serviços para que clientes possam escolher o que desejam agendar pelo link público ou WhatsApp.
Novo serviço
```

### Categorias

```text
Nenhuma categoria cadastrada
Organize seus serviços em grupos para facilitar a escolha do cliente.
Nova categoria
```

### Clientes

```text
Nenhum cliente encontrado
Clientes aparecem aqui quando você cria um agendamento manual ou quando eles usam seu link público.
Novo cliente
```

### Agendamentos

```text
Nenhum agendamento encontrado
Quando houver agendamentos pelo painel, link público ou WhatsApp, eles aparecerão aqui.
Novo agendamento
```

### Horários

```text
Nenhum horário cadastrado
Cadastre seus horários de atendimento para liberar opções de agenda no link público e WhatsApp.
Novo horário
```

### Bloqueios

```text
Nenhum bloqueio cadastrado
Bloqueios servem para fechar períodos específicos da agenda, como folgas, feriados ou compromissos.
Novo bloqueio
```

### Admin tenants

```text
Nenhum prestador cadastrado
Cadastre o primeiro prestador para liberar painel, serviços e link público.
Novo prestador
```

### Audit logs

```text
Nenhum registro encontrado
Os eventos administrativos e operacionais aparecerão aqui conforme a plataforma for utilizada.
```

---

# 2. Estados de erro

Padronizar mensagens de erro por contexto.

## Login

Credencial inválida:

```text
E-mail ou senha inválidos.
```

Não usar:

```text
Usuário não encontrado.
Senha incorreta.
```

## Permissão

```text
Sua conta não tem permissão para abrir esta área.
```

## Agendamento público

Horário indisponível:

```text
Este horário não está mais disponível. Escolha outro horário para continuar.
```

Cliente não autenticado:

```text
Para confirmar o horário, entre ou crie sua conta.
```

Conta administrativa no fluxo público:

```text
Contas administrativas não podem confirmar agendamentos públicos. Entre com uma conta de cliente para continuar.
```

## Agendamento manual

Conflito:

```text
Já existe um agendamento nesse horário. Escolha outro período ou ajuste a duração.
```

Fora da disponibilidade:

```text
Este horário está fora da disponibilidade cadastrada. Marque a opção de exceção se quiser criar mesmo assim.
```

Bloqueio:

```text
Este período está bloqueado na agenda. Remova o bloqueio ou escolha outro horário.
```

## Typebot/Admin

Token copy-once:

```text
Copie este token agora. Por segurança, ele não será exibido novamente.
```

Token revogado:

```text
Este token foi revogado e não poderá mais autenticar chamadas do Typebot.
```

---

# 3. Estados de sucesso

Padronizar mensagens de sucesso.

Exemplos:

```text
Alterações salvas com sucesso.
Serviço cadastrado com sucesso.
Categoria atualizada com sucesso.
Cliente cadastrado com sucesso.
Agendamento criado com sucesso.
Agendamento cancelado pelo prestador.
Atendimento finalizado.
Pagamento registrado.
Vencimento atualizado.
Template aplicado com sucesso.
Token criado com sucesso. Copie antes de sair desta tela.
```

Evitar mensagens genéricas:

```text
Salvo.
OK.
Sucesso.
Operação realizada.
```

---

# 4. Confirmações e ações perigosas

Revisar ações que alteram estado crítico.

Ações críticas:

```text
- suspender tenant
- reativar tenant
- cancelar tenant
- cancelar assinatura
- revogar token Typebot
- cancelar agendamento
- inativar serviço
- inativar categoria
- inativar cliente
```

## Regras

* Destructive apenas para ação perigosa.
* Copy deve explicar consequência.
* Não usar "Excluir" se a ação for inativar.
* Não dizer "deletar" quando há soft delete/inativação.

## Exemplos

Inativar serviço:

```text
Inativar serviço
Este serviço deixará de aparecer para novos agendamentos, mas os agendamentos existentes serão preservados.
```

Revogar token:

```text
Revogar token
Chamadas do Typebot usando este token deixarão de funcionar imediatamente.
```

Cancelar agendamento:

```text
Cancelar agendamento
Este horário será liberado conforme as regras atuais da agenda.
```

Suspender prestador:

```text
Suspender prestador
O prestador perderá acesso operacional e os canais externos poderão ser bloqueados conforme a política da plataforma.
```

---

# 5. Labels humanos para enums

Garantir que enums não apareçam crus na UI.

## AppointmentOrigin

```text
MANUAL_PANEL = Painel
PUBLIC_LINK = Link público
WHATSAPP = WhatsApp
```

## BookingMode

```text
DIRECT = Confirmação imediata
REQUIRES_CONFIRMATION = Aguarda confirmação
INFORMATIONAL = Apenas informativo
```

## PriceType

```text
FIXED = Preço fixo
STARTING_AT = A partir de
ON_REQUEST = Sob consulta
HIDDEN = Não mostrar preço
```

## AppointmentStatus

```text
REQUESTED = Solicitado
CONFIRMED = Confirmado
WAITING_INFO = Aguardando informações
RESCHEDULED = Reagendado
CANCELED_BY_CUSTOMER = Cancelado pelo cliente
CANCELED_BY_PROVIDER = Cancelado pelo prestador
NO_SHOW = Não compareceu
IN_PROGRESS = Em atendimento
FINISHED = Finalizado
```

## TenantStatus

```text
ACTIVE = Ativo
SUSPENDED = Suspenso
CANCELED = Cancelado
```

## SubscriptionStatus

```text
ACTIVE = Ativa
PAST_DUE = Vencida
CANCELED = Cancelada
TRIAL = Teste
```

Centralizar labels em helpers existentes, se já houver:

```text
src/lib/status.ts
src/lib/labels.ts
```

Não duplicar mapas em várias telas se puder evitar.

---

# 6. Public unavailable

Garantir que mensagens públicas não revelem dados internos.

Mensagem base:

```text
O agendamento online está temporariamente indisponível.
Entre em contato diretamente com o estabelecimento para combinar um horário.
```

Não usar:

```text
Assinatura vencida.
Plano sem link público.
Tenant suspenso.
Subscription blocked.
```

---

# 7. Subscription enforcement

Diferenciar mensagens internas e públicas.

## Prestador/Admin

Pode ser explícito:

```text
A assinatura está vencida e novos agendamentos externos estão temporariamente bloqueados.
```

## Cliente final

Genérico:

```text
O agendamento online está temporariamente indisponível.
```

## Typebot API

Manter resposta segura e consistente com docs.

Não quebrar contrato de erro dos endpoints.

---

# 8. Form feedback

Revisar formulários principais:

```text
login
tenant
plan
subscription
service
category
customer
appointment
availability
schedule block
settings
onboarding
public customer auth
public booking
```

## Regras

* Erros próximos aos campos.
* Mensagem geral apenas quando necessário.
* Labels claros.
* Helper text em campos difíceis.
* Obrigatório indicado com moderação.
* Não exagerar em texto dentro do formulário.

---

# 9. Loading/pending states

Revisar botões que executam ações.

Exemplos:

```text
Entrando...
Salvando...
Criando...
Atualizando...
Aplicando template...
Gerando token...
Revogando...
Confirmando horário...
```

Evitar:

```text
Loading...
Processando...
Aguarde...
```

---

# 10. Not found states

Padronizar páginas/estados de não encontrado.

Exemplos:

```text
Prestador não encontrado
Não encontramos este prestador. Verifique o link ou volte para a lista.

Serviço não encontrado
Este serviço não existe ou não está mais disponível.

Agendamento não encontrado
Não encontramos este agendamento. Ele pode ter sido removido ou você pode não ter acesso a ele.
```

Não expor se recurso existe em outro tenant.

---

# 11. Documentação

Criar:

```text
/docs/design/microcopy-empty-error-states.md
```

Atualizar:

```text
/docs/design/design-system-foundation.md
README.md
```

Documentar:

```text
- princípios de microcopy
- padrão de empty state
- padrão de erro
- padrão de sucesso
- padrão de confirmação destrutiva
- labels humanos para enums
- diferença entre mensagens públicas e internas
- limitações
```

---

# 12. Testes

Rodar:

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

Ajustar testes existentes se textos esperados forem validados.

Se existirem testes que dependem de mensagens antigas, atualizar para a nova copy quando fizer sentido.

---

# 13. Validação funcional obrigatória

Validar manualmente:

## Auth

```text
1. Login inválido mostra mensagem segura.
2. Access denied mostra mensagem clara.
3. CUSTOMER não acessa /app.
4. USER não acessa /admin.
```

## Público

```text
1. Link público indisponível não revela assinatura/plano.
2. Horário indisponível mostra mensagem clara.
3. Visitante anônimo entende que precisa entrar/criar conta para confirmar.
4. Confirmação de agendamento tem mensagem clara.
```

## Prestador

```text
1. Empty state de serviços aparece corretamente.
2. Empty state de clientes aparece corretamente.
3. Empty state de agendamentos aparece corretamente.
4. Erro de conflito de horário continua funcionando.
5. Erro de bloqueio continua funcionando.
6. Ações de status continuam com labels humanos.
7. Loading states dos botões aparecem quando aplicável.
```

## Admin

```text
1. Empty state de tenants aparece corretamente.
2. Audit logs vazios têm mensagem útil.
3. Revogar token tem copy clara.
4. Template aplicado mostra sucesso claro.
5. Registrar pagamento mostra sucesso claro.
6. Alterar vencimento mostra sucesso claro.
```

## Segurança

```text
1. Mensagens não revelam dados de outro tenant.
2. Mensagens públicas não revelam assinatura vencida.
3. Erros de login não revelam se e-mail existe.
```

---

# Fora do escopo

Não implementar:

```text
- toast system novo, se não existir
- notificações em tempo real
- e-mail
- WhatsApp real
- recuperação de senha
- internacionalização
- múltiplos idiomas
- novo design system completo
- alteração de regras de negócio
- alteração de Prisma
- migrations
- novos endpoints
- nova máquina de status
```

---

# Critérios de aceite

* Mensagens genéricas principais substituídas por copy contextual.
* Empty states padronizados e úteis.
* Erros de login continuam seguros.
* Erros públicos não revelam detalhes internos.
* Erros de agendamento são compreensíveis.
* Mensagens de sucesso são claras.
* Ações destrutivas têm copy adequada.
* Enums não aparecem crus na UI.
* Labels humanos centralizados quando possível.
* Loading states mais claros.
* Not found states padronizados.
* Nenhuma regra de negócio alterada.
* Nenhuma migration criada.
* Auth, tenant isolation e permissions preservados.
* Link público continua funcionando.
* Typebot API continua funcionando.
* Documentação criada/atualizada.
* `pnpm typecheck`, `pnpm lint`, `pnpm test` e `pnpm build` passam.

---

# Instruções para o DeepSeek

Implemente somente a Phase 23 Microcopy, Empty States & Error States.

Antes de alterar código, leia:

```text
.ai/PROJECT_RULES.md
.ai/skills/frontend-design.md
diagnostico-frontend-2026-06-26.md
inventario-telas-2026-06-26.md
/docs/design/visual-identity.md
/docs/design/design-system-foundation.md
/docs/design/public-booking-experience.md
/docs/design/provider-dashboard-experience.md
/docs/design/data-tables-responsive-lists.md
/docs/design/provider-operations-ux.md
```

Revisar:

```text
- microcopy
- empty states
- error states
- success states
- confirmation copy
- destructive action copy
- enum labels
- loading states
- not found states
```

Preservar:

```text
- auth
- roles
- permissions
- tenant isolation
- subscription enforcement
- onboarding
- server actions
- validations
- public booking
- Typebot API
- admin flows
- provider flows
```

Não implementar:

```text
- toast system novo
- notificações em tempo real
- e-mail
- WhatsApp real
- recuperação de senha
- internacionalização
- alteração de regras de negócio
- alterações Prisma
- migrations
- novos endpoints
```

Ao finalizar, informe:

```text
- arquivos criados
- arquivos alterados
- telas revisadas
- componentes/helpers criados
- exemplos de microcopy alterada
- regras preservadas
- validações executadas
- pendências conhecidas
```
