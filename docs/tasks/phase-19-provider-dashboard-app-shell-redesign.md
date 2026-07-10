# Task - Phase 19 Provider Dashboard & App Shell Redesign

## Objetivo

Redesenhar o dashboard e a estrutura visual principal do painel do prestador no AgendaZap.

Até agora, o painel do prestador funciona corretamente e concentra informações reais do tenant: assinatura, onboarding, serviços, categorias, horários, bloqueios, clientes e próximos agendamentos. Porém, visualmente o dashboard ainda parece uma página administrativa genérica, com muitas métricas de mesmo peso, pouca hierarquia e alertas competindo entre si.

Esta fase deve transformar o painel do prestador em uma central de operação diária mais clara, útil e confiável.

O foco é:

```text
- redesenhar /app/dashboard
- melhorar a hierarquia das métricas
- destacar agenda de hoje e próximos agendamentos
- melhorar avisos de assinatura
- melhorar card de onboarding
- revisar o app shell do prestador
- revisar sidebar/header do prestador
- aplicar a identidade visual das fases 16–18
```

Esta fase não deve redesenhar todas as tabelas do sistema. A responsividade e evolução das tabelas entram em fase própria.

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
/docs/specs/00-visao-produto.md
/docs/specs/01-usuarios-permissoes.md
/docs/technical/subscription-enforcement.md
/docs/technical/provider-onboarding.md
/docs/technical/padroes-codigo.md
README.md
```

---

# Escopo

Redesenhar:

```text
/app/dashboard
```

Revisar visualmente, sem alterar regras de negócio:

```text
src/app/(provider)/app/layout.tsx
src/components/layout/dashboard-shell.tsx
src/components/layout/dashboard-sidebar.tsx
src/components/layout/dashboard-header.tsx
src/components/layout/page-heading.tsx
```

Criar componentes específicos do dashboard, se fizer sentido:

```text
src/features/provider-dashboard/provider-dashboard-hero.tsx
src/features/provider-dashboard/provider-today-card.tsx
src/features/provider-dashboard/provider-readiness-card.tsx
src/features/provider-dashboard/provider-metric-card.tsx
src/features/provider-dashboard/provider-next-appointments.tsx
src/features/provider-dashboard/provider-channel-status.tsx
```

---

# Regras críticas

Preservar integralmente:

```text
- autenticação do painel do prestador
- isolamento multi-tenant
- permissões OWNER/ADMIN/MEMBER conforme regra atual
- subscription enforcement
- onboarding status
- dados reais do dashboard
- links para serviços, horários, clientes e agendamentos
- lógica de logout
- redirecionamentos existentes
```

Não alterar:

```text
- Prisma schema
- migrations
- endpoints Typebot
- regras de assinatura
- regras de onboarding
- criação de agendamentos
- link público
- fluxo CUSTOMER
```

---

# Problemas atuais

O diagnóstico identificou que o dashboard do prestador:

```text
- mostra muitas métricas com o mesmo peso visual
- não prioriza a agenda de hoje
- mistura onboarding, assinatura e operação sem hierarquia clara
- usa título genérico "Dashboard"
- usa subtítulo com linguagem de sistema
- possui alertas que competem visualmente
- usa tabela de próximos agendamentos com tratamento genérico
- ainda parece um dashboard SaaS administrativo
```

---

# Direção de UX

O prestador não entra no painel para ver “métricas”. Ele entra para responder perguntas práticas:

```text
- Tenho agendamentos hoje?
- Meu link público está pronto?
- Tem algo bloqueando novos agendamentos?
- Meus serviços e horários estão configurados?
- O que preciso fazer agora?
```

O novo dashboard deve organizar a tela por prioridade operacional.

---

# Layout recomendado

## Estrutura geral

```text
Hero operacional
- Saudação/nome do negócio
- status da operação
- CTA principal contextual

Linha de status
- assinatura
- onboarding
- link público
- Typebot/WhatsApp, se aplicável

Área principal
- Agenda de hoje / próximos agendamentos
- Checklist ou prontidão operacional

Métricas secundárias
- clientes
- serviços
- categorias
- bloqueios
```

## Desktop

```text
┌────────────────────────────────────────────────────────────┐
│ Hero do negócio                                            │
│ "Hoje na agenda" + status operacional                      │
├──────────────────────────────┬─────────────────────────────┤
│ Agenda de hoje/próximos      │ Prontidão / canais          │
│ agendamentos                 │                             │
├──────────────────────────────┴─────────────────────────────┤
│ Métricas secundárias                                        │
└────────────────────────────────────────────────────────────┘
```

## Mobile

```text
┌──────────────────────────────┐
│ Hero compacto                │
├──────────────────────────────┤
│ Avisos prioritários          │
├──────────────────────────────┤
│ Agenda de hoje               │
├──────────────────────────────┤
│ Prontidão                    │
├──────────────────────────────┤
│ Métricas                     │
└──────────────────────────────┘
```

---

# 1. Redesign de `/app/dashboard`

Atualizar:

```text
src/app/(provider)/app/dashboard/page.tsx
```

## Título e copy

Evitar título genérico:

```text
Dashboard
```

Usar algo mais operacional:

```text
Hoje no seu negócio
```

Subtexto:

```text
Acompanhe agendamentos, canais e pendências para manter sua agenda funcionando.
```

Se possível, usar o nome do tenant:

```text
Hoje na agenda da Mecânica Wcar
```

## Regras

* Não criar dados fictícios.
* Usar apenas dados reais já carregados.
* Se algum dado ainda não existir, mostrar estado vazio útil.
* Não esconder alertas críticos de assinatura.

---

# 2. Hero operacional

Criar um card principal com:

```text
- nome do negócio
- cidade/UF, se disponível
- status operacional resumido
- CTA principal contextual
```

## CTA contextual

Se onboarding não concluído:

```text
Continuar configuração
```

Se assinatura bloqueia canais:

```text
Ver situação da assinatura
```

Se tudo estiver pronto:

```text
Novo agendamento
```

Ou:

```text
Ver agenda
```

## Regras

* CTA deve respeitar permissões.
* Não criar rota inexistente.
* Se `/app/subscription` ainda for stub, não mandar o usuário para lá como ação principal. Nesse caso, usar copy informativa ou link para dashboard/admin conforme já existente.
* Não prometer resolver pagamento, pois cobrança automática ainda não existe.

---

# 3. Avisos de assinatura

A Phase 13 adicionou avisos de assinatura. Redesenhar visualmente, sem mudar política.

## Estados

```text
WARNING
CRITICAL
BLOCKED
```

## Regras

* Aviso BLOCKED deve ter maior prioridade visual.
* Aviso WARNING não deve ocupar a tela inteira.
* A copy deve continuar clara e interna ao prestador.
* Pode informar motivo de assinatura para o prestador.
* Não alterar mensagens públicas do link público.

## Visual

Usar `Alert` com variantes semânticas:

```text
warning
destructive
info
```

Se necessário, criar um componente:

```text
ProviderSubscriptionNotice
```

---

# 4. Card de onboarding

A Phase 15 criou onboarding. Redesenhar o card do dashboard.

## Estados

```text
NOT_STARTED
IN_PROGRESS
SKIPPED
COMPLETED
```

## Regras

* Se não concluído, mostrar como tarefa prioritária.
* Se SKIPPED, mostrar opção discreta para retomar.
* Se COMPLETED, não exibir card grande.
* Não bloquear o painel inteiro.

## Copy sugerida

```text
Complete a configuração inicial
```

Subtexto:

```text
Revise serviços, horários e link público para começar a receber agendamentos.
```

CTA:

```text
Continuar configuração
```

Para SKIPPED:

```text
Retomar configuração inicial
```

---

# 5. Agenda de hoje / próximos agendamentos

Melhorar a área de próximos agendamentos.

## Objetivo

Transformar a tabela genérica em uma lista operacional mais escaneável.

## Regras

* Não alterar queries de negócio se não for necessário.
* Se os dados atuais só trazem próximos agendamentos, usar esses dados.
* Se houver agendamentos de hoje, destacar visualmente.
* Se não houver, mostrar estado vazio com ação.

## Estado vazio

```text
Nenhum agendamento próximo
```

Subtexto:

```text
Quando um cliente agendar pelo link público, WhatsApp ou painel, ele aparecerá aqui.
```

CTA possível:

```text
Criar agendamento manual
```

## Item de agendamento

Exibir:

```text
- horário/data
- cliente
- serviço
- origem
- status
```

Usar badges com variantes semânticas coerentes.

---

# 6. Status dos canais

Criar uma área de canais:

```text
Link público
WhatsApp/Typebot
Painel manual
```

Para cada canal, mostrar:

```text
- pronto
- pendente
- bloqueado
```

## Regras

* Reutilizar subscription policy/checklist se possível.
* Não duplicar regra de assinatura.
* Não expor token Typebot.
* Não permitir gerar token Typebot pelo prestador.
* Typebot pode ser informativo: “configurado pela plataforma”.

## Copy

Link público pronto:

```text
Seu link público pode receber agendamentos.
```

Link público pendente:

```text
Configure serviços e horários para liberar o agendamento online.
```

WhatsApp/Typebot:

```text
Canal configurado pela plataforma.
```

ou:

```text
Ainda não configurado pela plataforma.
```

---

# 7. Métricas secundárias

Reduzir peso das métricas secundárias.

Métricas possíveis:

```text
- serviços ativos
- categorias
- clientes
- bloqueios futuros
- agendamentos do período
```

## Regras

* Não mostrar 12 cards iguais.
* Separar métricas primárias e secundárias.
* Dados críticos devem aparecer antes.
* Métricas secundárias podem ficar em uma linha compacta.

---

# 8. App shell do prestador

Revisar visualmente:

```text
src/app/(provider)/app/layout.tsx
src/components/layout/dashboard-shell.tsx
src/components/layout/dashboard-sidebar.tsx
src/components/layout/dashboard-header.tsx
```

## Objetivo

Melhorar a sensação do painel do prestador sem redesenhar o admin.

## Regras

* A revisão deve ser compatível também com admin se os componentes forem compartilhados.
* Se o componente for compartilhado, evitar mudança que prejudique admin.
* Pode usar variações por área se já existir prop/contexto.
* Não quebrar navegação mobile.
* Não adicionar rotas novas.

## Melhorias possíveis

```text
- sidebar com hierarquia visual mais clara
- header menos genérico
- active item mais legível
- reduzir sensação de dashboard template
- manter contraste
```

## Cuidado

Como shell é compartilhado, mudanças precisam ser pequenas e seguras. Se a alteração for grande, criar prop ou variação específica do provider.

---

# 9. PageHeading

Revisar `PageHeading` somente se necessário.

## Regras

* Pode aplicar Lora/font-display com moderação em títulos principais.
* Não deixar todos os títulos serifados se ficar pesado.
* Não quebrar admin.
* Não alterar API do componente sem atualizar chamadas.

---

# 10. Responsividade

Validar:

```text
320px
375px
768px
1024px
1440px
```

## Regras

* Dashboard mobile não deve ter overflow horizontal.
* Hero não deve ocupar altura excessiva.
* Cards devem empilhar corretamente.
* Agenda deve ser legível em mobile.
* Ações devem ter área de toque adequada.

---

# 11. Acessibilidade

Obrigatório:

```text
- foco visível
- contraste adequado
- landmarks/estrutura semântica
- botões com texto claro
- badges não podem ser a única forma de comunicar status
- cards clicáveis, se existirem, devem ser acessíveis por teclado
```

---

# 12. Documentação

Criar:

```text
/docs/design/provider-dashboard-experience.md
```

Atualizar:

```text
/docs/design/design-system-foundation.md
README.md
```

Documentar:

```text
- objetivo do redesign
- hierarquia da nova tela
- componentes criados
- decisões de UX
- regras preservadas
- limitações
```

---

# 13. Testes

Rodar:

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

Ajustar testes se necessário.

Não criar testes pesados se a mudança for visual, mas não quebrar os existentes.

---

# 14. Validação funcional obrigatória

## Acesso

```text
1. Acessar /app/dashboard sem login
   Esperado: redireciona/bloqueia conforme regra atual.

2. Acessar como CUSTOMER
   Esperado: bloqueado.

3. Acessar como OWNER/ADMIN
   Esperado: dashboard abre.

4. Acessar como MEMBER, se permitido atualmente
   Esperado: comportamento igual ao atual.
```

## Onboarding

```text
1. Tenant com onboarding NOT_STARTED
   Esperado: card de onboarding aparece.

2. Tenant com onboarding IN_PROGRESS
   Esperado: continuar configuração aparece.

3. Tenant com onboarding SKIPPED
   Esperado: opção discreta de retomar.

4. Tenant com onboarding COMPLETED
   Esperado: card grande não aparece.
```

## Assinatura

```text
1. Assinatura válida
   Esperado: dashboard sem alerta crítico.

2. Vencida 1 a 7 dias
   Esperado: aviso warning/critical conforme política.

3. Vencida 8 a 15 dias
   Esperado: canais externos indicam bloqueio de criação.

4. Vencida acima de 15 dias
   Esperado: aviso forte de bloqueio operacional.
```

## Operação

```text
1. Tenant com próximos agendamentos
   Esperado: aparecem na área principal.

2. Tenant sem próximos agendamentos
   Esperado: estado vazio útil.

3. Clicar em novo agendamento/ver agenda
   Esperado: navega para rota correta.

4. Link público pronto
   Esperado: canal aparece como pronto.

5. Sem serviço ou sem horário
   Esperado: dashboard mostra pendência.
```

---

# Fora do escopo

Não implementar:

```text
- redesign das tabelas em massa
- paginação/busca/ordenação
- calendário visual
- drag and drop de agenda
- gráficos avançados
- integração Google Agenda
- WhatsApp real
- notificações
- cobrança automática
- alteração de regras de assinatura
- alteração de onboarding
- upload de logo
- temas por tenant
- dark mode
```

---

# Critérios de aceite

* `/app/dashboard` redesenhado.
* Dashboard deixa de mostrar métricas todas com o mesmo peso.
* Agenda de hoje/próximos agendamentos ganha destaque.
* Avisos de assinatura ficam visualmente hierarquizados.
* Card de onboarding fica mais claro e acionável.
* Status dos canais aparece de forma compreensível.
* Métricas secundárias ficam menos dominantes.
* App shell/sidebar/header do prestador recebe refinamento visual seguro.
* Nenhuma regra de negócio alterada.
* Subscription enforcement preservado.
* Onboarding preservado.
* Isolamento multi-tenant preservado.
* Link público continua funcionando.
* Typebot API continua funcionando.
* Mobile sem overflow.
* Documentação criada/atualizada.
* Nenhuma migration criada.
* `pnpm typecheck`, `pnpm lint`, `pnpm test` e `pnpm build` passam.

---

# Instruções para o DeepSeek

Implemente somente a Phase 19 Provider Dashboard & App Shell Redesign.

Antes de alterar código, leia:

```text
.ai/PROJECT_RULES.md
.ai/skills/frontend-design.md
diagnostico-frontend-2026-06-26.md
inventario-telas-2026-06-26.md
/docs/design/visual-identity.md
/docs/design/design-system-foundation.md
/docs/design/public-booking-experience.md
```

Redesenhe principalmente:

```text
/app/dashboard
```

E refine com cuidado:

```text
provider app shell
provider sidebar
provider header
```

Preserve integralmente:

```text
auth
tenant isolation
subscription enforcement
onboarding
permissions
logout
links existentes
dados reais do dashboard
```

Não implemente:

```text
redesign das tabelas em massa
paginação
busca
ordenação
calendário visual
drag and drop
Google Agenda
WhatsApp real
cobrança automática
upload de logo
temas por tenant
dark mode
```

Ao finalizar, informe:

```text
- arquivos criados
- arquivos alterados
- telas redesenhadas
- componentes criados
- regras preservadas
- validações executadas
- pendências conhecidas
```
