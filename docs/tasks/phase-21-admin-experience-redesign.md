# Task - Phase 21 Admin Experience Redesign

## Objetivo

Redesenhar a experiência administrativa do AgendaZap para o Super Admin.

Até agora, o produto evoluiu visualmente nas áreas mais visíveis:

```text
- identidade visual base
- login
- link público
- dashboard do prestador
- tabelas/listagens responsivas
```

Agora o painel administrativo precisa deixar de parecer apenas um conjunto de CRUDs e passar a funcionar como um cockpit de operação da plataforma.

O Super Admin usa o painel para responder perguntas como:

```text
- Quantos prestadores estão ativos?
- Quais tenants estão com assinatura vencida?
- Quem está bloqueado ou em risco?
- Quais planos existem?
- Quais canais estão habilitados?
- O que aconteceu recentemente no sistema?
- Onde preciso agir agora?
```

Esta fase deve redesenhar a experiência administrativa, sem alterar regras de negócio.

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
```

Antes de implementar, leia obrigatoriamente:

```text
.ai/PROJECT_RULES.md
.ai/skills/frontend-design.md
diagnostico-frontend-2026-06-26.md
inventario-telas-2026-06-26.md
/docs/design/visual-identity.md
/docs/design/design-system-foundation.md
/docs/design/provider-dashboard-experience.md
/docs/design/data-tables-responsive-lists.md
/docs/specs/00-visao-produto.md
/docs/specs/01-usuarios-permissoes.md
/docs/specs/02-admin-plataforma.md
/docs/technical/subscription-enforcement.md
/docs/technical/typebot-api.md
/docs/technical/segment-templates.md
/docs/technical/padroes-codigo.md
README.md
```

---

# Escopo

Redesenhar principalmente:

```text
/admin/dashboard
```

Refinar, sem reescrever regras:

```text
/admin/tenants
/admin/tenants/[id]
/admin/plans
/admin/subscriptions
/admin/audit-logs
/admin/typebot-simulator
/admin/tenants/[id]/typebot-credentials
/admin/tenants/[id]/templates
```

Também pode revisar visualmente:

```text
src/app/(admin)/admin/layout.tsx
src/components/layout/dashboard-shell.tsx
src/components/layout/dashboard-sidebar.tsx
src/components/layout/dashboard-header.tsx
src/components/layout/page-heading.tsx
```

Mas cuidado: se componentes forem compartilhados com o painel do prestador, não quebrar a Phase 19.

---

# Regras críticas

Preservar integralmente:

```text
- autenticação SUPER_ADMIN
- bloqueio de USER/CUSTOMER no admin
- permissões administrativas
- CRUD de tenants
- CRUD de planos
- controle manual de assinatura
- registro manual de pagamento
- alteração manual de vencimento
- suspensão/reativação/cancelamento
- audit logs
- Typebot credentials
- templates por segmento
- simulator Typebot
- server actions existentes
- validações Zod
- isolamento e segurança das rotas
```

Não alterar:

```text
- Prisma schema
- migrations
- regras de negócio
- endpoints Typebot
- auth
- roles
- cookies
- subscription enforcement
- provider onboarding
- fluxo público
```

---

# Problemas atuais

Mesmo depois da Phase 20, o admin ainda tende a parecer CRUD técnico.

Problemas esperados:

```text
- dashboard administrativo com métricas de mesmo peso
- pouca priorização de tenants que precisam de atenção
- assinaturas vencidas não aparecem como fila operacional clara
- tela de detalhe de tenant pode parecer coleção de cards técnicos
- audit logs úteis, mas pouco conectados à operação
- simulator Typebot é funcional, mas visualmente isolado
- credentials/templates aparecem como ferramentas separadas, sem contexto operacional
```

---

# Direção de UX

O admin deve parecer um cockpit de SaaS multiempresa.

Ele deve priorizar:

```text
1. Situação da base de prestadores
2. Risco financeiro/assinaturas vencidas
3. Tenants bloqueados/suspensos
4. Atividade recente
5. Ações rápidas por tenant
6. Ferramentas operacionais como Typebot e templates
```

Evitar:

```text
- estética de planilha
- dashboard genérico de BI
- métricas decorativas
- gráficos falsos sem utilidade
- inventar dados que não existem
```

---

# 1. Redesign de `/admin/dashboard`

## Objetivo

Transformar o dashboard admin em uma central de operação da plataforma.

## Layout recomendado

```text
Hero administrativo
- título contextual
- resumo da plataforma
- CTA principal: Novo prestador

Linha de saúde da plataforma
- tenants ativos
- tenants suspensos
- assinaturas vencidas
- vencimentos próximos

Área principal
- Prestadores que exigem atenção
- Atividade recente

Área secundária
- planos
- canais
- templates
- Typebot
```

## Título sugerido

Evitar:

```text
Dashboard
```

Usar:

```text
Operação da plataforma
```

Subtexto:

```text
Acompanhe prestadores, assinaturas e eventos críticos do AgendaZap.
```

## Hero

Exibir:

```text
- total de prestadores
- status geral curto
- CTA Novo prestador
```

Status geral pode ser textual, baseado em dados já existentes:

```text
Tudo em ordem
Há assinaturas exigindo atenção
Há tenants bloqueados
```

Não criar regra nova de negócio complexa. Apenas derivar de métricas já disponíveis.

---

# 2. Métricas administrativas

Reorganizar métricas em níveis.

## Primárias

```text
- Prestadores ativos
- Assinaturas vencidas
- Tenants suspensos/bloqueados
- Vencimentos próximos
```

## Secundárias

```text
- total de planos
- total de tenants
- trials, se existir
- logs recentes
```

## Regras

* Não mostrar 10 cards iguais.
* Métricas críticas devem ter mais peso.
* Warning/destructive apenas para atenção real.
* Botões principais continuam verde escuro.
* Terracota apenas acento controlado.

---

# 3. Prestadores que exigem atenção

Criar uma seção no dashboard admin para tenants que precisam de ação.

Exemplos de atenção:

```text
- assinatura vencida
- tenant suspenso
- tenant cancelado
- vencimento próximo
- sem plano
```

## Regras

* Usar dados existentes.
* Se query atual não trouxer tudo, pode ajustar repository sem alterar regra.
* Não criar tabela nova.
* Não alterar política de assinatura.
* Limitar a lista para não poluir, por exemplo 5 ou 10 itens.
* Linkar para detalhe do tenant.

## Estado vazio

Título:

```text
Nenhum prestador exigindo atenção
```

Descrição:

```text
Quando houver assinaturas vencidas, suspensões ou pendências operacionais, elas aparecerão aqui.
```

---

# 4. Atividade recente

Melhorar visual da área de audit logs recentes.

## Exibir

```text
- evento
- ator, quando houver
- tenant, quando houver
- data/hora
- severidade visual quando aplicável
```

## Regras

* Não expor metadata extensa no dashboard.
* Linkar para `/admin/audit-logs`.
* Manter detalhe completo apenas na tela de audit logs.
* Não alterar audit logs.

## Estado vazio

```text
Nenhum evento recente
```

Subtexto:

```text
As ações administrativas e operacionais aparecerão aqui conforme a plataforma for utilizada.
```

---

# 5. Refinar `/admin/tenants`

A Phase 20 já melhorou listagens. Aqui o foco é contexto administrativo.

## Melhorias permitidas

```text
- header mais claro
- resumo curto da base
- filtros mais orientados por operação
- destacar status de assinatura/tenant
- CTA Novo prestador bem posicionado
```

## Regras

* Não alterar criação de tenant.
* Não alterar criação de usuário responsável.
* Não alterar assinatura inicial.
* Não alterar filtros funcionais.

---

# 6. Refinar `/admin/tenants/[id]`

A tela de detalhe do tenant deve virar uma visão operacional do prestador.

## Estrutura sugerida

```text
Header do prestador
- nome
- responsável
- status tenant
- status assinatura
- plano
- vencimento

Ações rápidas
- editar prestador
- acesso do responsável
- redefinir senha
- Typebot credentials
- aplicar template
- alterar assinatura
- registrar pagamento

Resumo operacional
- serviços
- horários
- clientes/agendamentos, se já disponível
- canais habilitados pelo plano

Histórico/auditoria
- link para logs filtrados, se já existir filtro
```

## Regras

* Não criar tabs complexas se aumentar escopo.
* Não ocultar ações administrativas importantes.
* Não alterar actions existentes.
* Não implementar cobrança automática.

---

# 7. Refinar `/admin/subscriptions`

Objetivo:

```text
Transformar a tela de assinaturas em uma lista de controle financeiro-operacional.
```

Melhorias:

```text
- destacar vencidas
- destacar próximas do vencimento
- badges por situação
- ações manuais mais claras
- empty state útil
```

Regras:

```text
- não alterar política de vencimento
- não criar cobrança
- não criar gateway
- não enviar notificações
```

---

# 8. Refinar `/admin/plans`

Objetivo:

```text
Deixar claro que planos controlam capacidades da plataforma.
```

Mostrar melhor:

```text
- nome
- preço
- periodicidade
- publicLinkEnabled
- whatsappEnabled
- status ativo/inativo
```

Microcopy:

```text
Link público
WhatsApp/Typebot
```

Não alterar regra de planos.

---

# 9. Refinar ferramentas Typebot/templates

Telas:

```text
/admin/typebot-simulator
/admin/tenants/[id]/typebot-credentials
/admin/tenants/[id]/templates
```

Objetivo:

```text
Dar contexto operacional para ferramentas que hoje podem parecer técnicas.
```

Melhorias:

```text
- explicar para que serve
- mostrar estado atual quando houver
- ações principais claras
- warnings sobre token copy-once
- templates como acelerador de configuração
```

Regras:

```text
- não expor token salvo
- não permitir prestador gerar token
- não alterar endpoints Typebot
- não alterar aplicação idempotente de templates
```

---

# 10. Admin app shell

Revisar o shell admin com cuidado.

## Objetivo

Diferenciar levemente o contexto admin do contexto provider, sem criar dois sistemas visuais desconectados.

Possíveis ajustes:

```text
- subtitle do shell: Administração da plataforma
- header contextual
- sidebar com seção "Plataforma"
- active item mais legível
```

## Regras

* Não quebrar shell do provider.
* Se os componentes forem compartilhados, usar props.
* Não alterar rotas.
* Não remover itens da navegação existentes.

---

# 11. Responsividade

Validar em:

```text
320px
375px
768px
1024px
1440px
```

Obrigatório:

```text
- admin dashboard sem overflow horizontal
- cards empilhando bem no mobile
- ações administrativas não ficam inacessíveis
- tabelas/listas continuam com comportamento da Phase 20
```

---

# 12. Acessibilidade

Obrigatório:

```text
- foco visível
- contraste adequado
- botões com texto claro
- status não depender apenas de cor
- links de ação com nomes compreensíveis
- cards clicáveis acessíveis por teclado, se existirem
```

---

# 13. Documentação

Criar:

```text
/docs/design/admin-experience.md
```

Atualizar:

```text
/docs/design/design-system-foundation.md
README.md
```

Documentar:

```text
- objetivo do redesign admin
- hierarquia do dashboard
- telas revisadas
- componentes criados
- regras preservadas
- limitações
```

---

# 14. Testes

Rodar:

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

Ajustar testes se necessário.

Não precisa criar testes pesados se a mudança for visual, mas todos os testes atuais devem continuar passando.

---

# 15. Validação funcional obrigatória

## Acesso

```text
1. Acessar /admin/dashboard sem login
   Esperado: bloqueia/redireciona conforme regra atual.

2. Acessar /admin/dashboard como USER prestador
   Esperado: bloqueado.

3. Acessar /admin/dashboard como CUSTOMER
   Esperado: bloqueado.

4. Acessar como SUPER_ADMIN
   Esperado: abre dashboard admin.
```

## Dashboard

```text
1. Métricas carregam com dados reais.
2. Prestadores que exigem atenção aparecem quando há pendência.
3. Estado vazio aparece quando não há pendência.
4. Atividade recente aparece.
5. Link para tenants funciona.
6. Link para audit logs funciona.
```

## Tenants

```text
1. /admin/tenants abre.
2. Criar prestador continua funcionando.
3. Detalhe do tenant abre.
4. Editar prestador continua funcionando.
5. Acesso do responsável continua funcionando.
6. Redefinir senha continua funcionando.
7. Suspender/reativar/cancelar continua funcionando.
```

## Assinaturas

```text
1. /admin/subscriptions abre.
2. Registrar pagamento continua funcionando.
3. Alterar vencimento continua funcionando.
4. Status visuais correspondem ao estado real.
```

## Planos

```text
1. /admin/plans abre.
2. Criar plano continua funcionando.
3. Editar plano continua funcionando.
4. Ativar/inativar continua funcionando.
```

## Typebot/templates

```text
1. /admin/typebot-simulator abre.
2. Simulação continua funcionando.
3. /admin/tenants/[id]/typebot-credentials abre.
4. Gerar token continua funcionando.
5. Revogar token continua funcionando.
6. /admin/tenants/[id]/templates abre.
7. Aplicar template continua funcionando.
```

---

# Fora do escopo

Não implementar:

```text
- cobrança automática
- gateway de pagamento
- envio de notificações
- relatórios financeiros complexos
- gráficos avançados
- exportação
- bulk actions
- nova política de assinatura
- nova modelagem de planos
- alteração de Prisma
- migrations
- novos endpoints Typebot
- permissões granulares além das atuais
- impersonate/login como tenant
- suporte multi-admin avançado
```

---

# Critérios de aceite

* `/admin/dashboard` redesenhado como cockpit operacional.
* Métricas administrativas têm hierarquia.
* Prestadores que exigem atenção aparecem em área própria.
* Atividade recente aparece de forma mais útil.
* `/admin/tenants` refinado sem quebrar fluxo.
* `/admin/tenants/[id]` refinado sem ocultar ações.
* `/admin/subscriptions` refinado como controle operacional.
* `/admin/plans` comunica capacidades dos planos.
* Ferramentas Typebot/templates ganham contexto visual.
* Admin shell/header/sidebar refinados sem quebrar provider shell.
* Mobile sem overflow.
* Nenhuma regra de negócio alterada.
* Nenhuma migration criada.
* Auth/roles preservados.
* Subscription enforcement preservado.
* Typebot API preservada.
* Templates preservados.
* Documentação criada/atualizada.
* `pnpm typecheck`, `pnpm lint`, `pnpm test` e `pnpm build` passam.

---

# Instruções para o DeepSeek

Implemente somente a Phase 21 Admin Experience Redesign.

Antes de alterar código, leia:

```text
.ai/PROJECT_RULES.md
.ai/skills/frontend-design.md
diagnostico-frontend-2026-06-26.md
inventario-telas-2026-06-26.md
/docs/design/visual-identity.md
/docs/design/design-system-foundation.md
/docs/design/data-tables-responsive-lists.md
/docs/specs/02-admin-plataforma.md
```

Redesenhe principalmente:

```text
/admin/dashboard
```

Refine com cuidado:

```text
/admin/tenants
/admin/tenants/[id]
/admin/plans
/admin/subscriptions
/admin/audit-logs
/admin/typebot-simulator
/admin/tenants/[id]/typebot-credentials
/admin/tenants/[id]/templates
admin shell/header/sidebar
```

Aplicar:

```text
- cockpit operacional para Super Admin
- melhor hierarquia de métricas
- seção de prestadores que exigem atenção
- atividade recente mais clara
- ações administrativas mais contextualizadas
- visual consistente com fases 16–20
```

Preservar:

```text
- auth SUPER_ADMIN
- bloqueio USER/CUSTOMER
- CRUD tenants
- CRUD planos
- assinaturas manuais
- pagamentos manuais
- alteração de vencimento
- audit logs
- Typebot credentials
- templates
- simulator
- server actions
- validações
```

Não implementar:

```text
- cobrança automática
- gateway
- notificações
- relatórios complexos
- gráficos avançados
- exportação
- bulk actions
- nova política de assinatura
- alterações Prisma
- migrations
- novos endpoints
- impersonate
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
