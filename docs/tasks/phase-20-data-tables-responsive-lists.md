# Task - Phase 20 Data Tables & Responsive Lists

## Objetivo

Melhorar a experiência visual e responsiva das tabelas e listagens do AgendaZap.

As fases 16 a 19 elevaram a identidade visual, login, link público e dashboard do prestador. Agora o sistema ainda precisa corrigir uma camada operacional importante: as telas com listas, tabelas, filtros, ações e estados vazios.

Hoje várias telas funcionam corretamente, mas ainda têm problemas típicos de painel administrativo:

```text
- tabelas largas quebrando no mobile
- ações por linha pouco confortáveis
- filtros com hierarquia fraca
- empty states genéricos
- badges/status inconsistentes
- excesso de informação com o mesmo peso visual
- listagens que parecem CRUD técnico
```

Esta fase deve tornar as listagens mais usáveis e consistentes, sem alterar regras de negócio.

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
/docs/specs/00-visao-produto.md
/docs/specs/01-usuarios-permissoes.md
/docs/specs/02-admin-plataforma.md
/docs/technical/padroes-codigo.md
README.md
```

---

# Escopo

Melhorar tabelas e listagens em telas já existentes.

## Admin

Revisar, se existirem e estiverem implementadas:

```text
/admin/tenants
/admin/plans
/admin/subscriptions
/admin/audit-logs
/admin/typebot-simulator
/admin/tenants/[id]/typebot-credentials
/admin/tenants/[id]/templates
```

## Prestador

Revisar:

```text
/app/services
/app/services/categories
/app/customers
/app/appointments
/app/availability
/app/availability/blocks
```

## Público

Não redesenhar novamente as rotas públicas nesta fase, salvo pequenos ajustes causados por componentes compartilhados.

---

# Regras críticas

Preservar integralmente:

```text
- autenticação
- permissões
- isolamento multi-tenant
- subscription enforcement
- onboarding
- Typebot API
- fluxo público
- criação/edição/inativação de entidades
- filtros existentes
- paginação existente, se houver
- server actions existentes
- validações Zod
```

Não alterar:

```text
- Prisma schema
- migrations
- regras de negócio
- endpoints
- queries sensíveis
- auth
- redirects
- roles
```

Esta fase é visual/UX. Pode refatorar componentes de apresentação, mas não mudar semântica funcional.

---

# Problemas atuais

O inventário e o diagnóstico apontaram que as listagens ainda sofrem com:

```text
- tabelas sem bom comportamento em telas pequenas
- ausência de wrapper responsivo padronizado
- filtros pouco destacados
- ações de linha espremidas
- empty states pobres
- status visuais inconsistentes
- tabelas muito densas
- mobile dependente de scroll horizontal em excesso
```

A Phase 16 criou:

```text
src/components/ui/table-container.tsx
```

Agora este componente deve ser aplicado onde fizer sentido.

---

# Estratégia da fase

Esta fase deve ser feita em camadas:

```text
1. Criar ou ajustar componentes reutilizáveis de lista.
2. Aplicar TableContainer nas tabelas existentes.
3. Melhorar empty states.
4. Melhorar filtros e headers de listagem.
5. Criar versão mobile em cards para telas críticas.
6. Padronizar ações por linha.
7. Padronizar badges/status.
```

Não tentar redesenhar todas as páginas de uma vez de forma radical. Priorizar telas com maior impacto operacional.

---

# 1. Componentes base de listagem

Criar componentes reutilizáveis se fizer sentido:

```text
src/components/ui/list-page-shell.tsx
src/components/ui/list-toolbar.tsx
src/components/ui/empty-state.tsx
src/components/ui/row-actions.tsx
src/components/ui/mobile-card-list.tsx
src/components/ui/status-badge.tsx
```

## ListPageShell

Objetivo:

```text
Padronizar título, descrição, ação principal e área de filtros/listagem.
```

Props sugeridas:

```ts
type ListPageShellProps = {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
};
```

## ListToolbar

Objetivo:

```text
Padronizar filtros, busca e botões de ação secundária.
```

Regras:

```text
- não alterar filtros existentes
- apenas melhorar layout visual
- mobile deve empilhar filtros corretamente
```

## EmptyState

Objetivo:

```text
Substituir mensagens genéricas por estados vazios úteis.
```

Props sugeridas:

```ts
type EmptyStateProps = {
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: string;
};
```

Atenção: se o componente for Client Component, não passar ícone React como prop a partir de Server Component. Usar string serializável e mapear internamente, conforme correção da Phase 19.

## RowActions

Objetivo:

```text
Padronizar ações por linha: Ver, Editar, Inativar, Reativar, Excluir, Detalhes.
```

Regras:

```text
- não esconder ações críticas
- destructive só em ação realmente destrutiva
- em mobile, ações devem ser fáceis de tocar
```

---

# 2. TableContainer

Aplicar:

```text
src/components/ui/table-container.tsx
```

Nas tabelas onde houver risco de overflow.

## Regras

```text
- preservar tabela existente
- envolver com TableContainer
- não quebrar TanStack Table
- não duplicar borda se o componente já renderiza card externo
- garantir overflow-x-auto
- manter cabeçalho legível
```

Telas prioritárias:

```text
/admin/tenants
/admin/subscriptions
/admin/audit-logs
/app/appointments
/app/customers
/app/services
```

---

# 3. Mobile: tabela ou cards

Nem toda tabela precisa virar card. Porém, telas críticas devem ter melhor experiência mobile.

## Recomendação

Para desktop/tablet:

```text
Manter tabela.
```

Para mobile:

```text
Usar cards empilhados em listagens críticas.
```

Telas prioritárias para cards mobile:

```text
/app/appointments
/app/customers
/app/services
/admin/tenants
/admin/audit-logs
```

## Regra prática

```text
- desktop: md:block table
- mobile: md:hidden card list
```

Ou equivalente.

## Card mobile deve mostrar

```text
- título principal
- subtítulo
- status
- principais metadados
- ações principais
```

Exemplo para agendamento:

```text
Cliente
Serviço
Data/horário
Status
Origem
Ações
```

Exemplo para serviço:

```text
Nome do serviço
Categoria
Duração/preço
Status
Ações
```

---

# 4. Filtros

Melhorar visual dos filtros existentes.

## Regras

```text
- não remover filtro existente
- não alterar query params sem necessidade
- não alterar nomes internos
- não quebrar server actions
- filtros devem empilhar no mobile
```

## Visual

```text
- agrupar filtros em card/toolbar
- labels claros
- botão "Filtrar" verde
- botão "Limpar filtros" outline/secondary quando existir
- evitar filtros soltos diretamente na página
```

## Microcopy

Evitar:

```text
Buscar
Submit
Enviar
```

Preferir conforme contexto:

```text
Filtrar
Limpar filtros
Buscar cliente
Buscar serviço
Buscar agendamento
```

---

# 5. Empty states

Criar estados vazios úteis.

## Serviços

Título:

```text
Nenhum serviço cadastrado
```

Descrição:

```text
Cadastre seus serviços para que clientes possam escolher o que desejam agendar.
```

Ação:

```text
Novo serviço
```

## Categorias

Título:

```text
Nenhuma categoria cadastrada
```

Descrição:

```text
Use categorias para organizar seus serviços por tipo de atendimento.
```

Ação:

```text
Nova categoria
```

## Clientes

Título:

```text
Nenhum cliente encontrado
```

Descrição:

```text
Clientes aparecem aqui quando você cria um agendamento manual ou quando eles agendam pelo link público.
```

Ação:

```text
Novo cliente
```

## Agendamentos

Título:

```text
Nenhum agendamento encontrado
```

Descrição:

```text
Quando houver agendamentos pelo painel, link público ou WhatsApp, eles aparecerão aqui.
```

Ação:

```text
Novo agendamento
```

## Admin prestadores

Título:

```text
Nenhum prestador cadastrado
```

Descrição:

```text
Cadastre o primeiro prestador para liberar o painel, serviços e link público.
```

Ação:

```text
Novo prestador
```

## Audit logs

Título:

```text
Nenhum registro encontrado
```

Descrição:

```text
Os eventos administrativos e operacionais aparecerão aqui conforme o sistema for utilizado.
```

Sem CTA obrigatório.

---

# 6. Badges e status

Padronizar status visuais usando tokens semânticos.

## Regras

```text
- status positivo: success
- status de atenção: warning
- status bloqueado/cancelado/destrutivo: destructive
- status neutro: secondary/outline
- status informativo: info
```

Não usar classes hardcoded como:

```text
bg-red-100
text-green-800
bg-yellow-100
```

Usar variantes do `Badge`.

Se necessário, centralizar mapeamentos em:

```text
src/lib/status.ts
```

ou criar helpers específicos:

```text
src/lib/badge-variants.ts
```

---

# 7. Ações por linha

Padronizar ações.

## Regras

```text
- ação principal de navegação: "Ver"
- ação de edição: "Editar"
- ação de ativar/inativar: "Ativar" / "Inativar"
- ação destrutiva: variant destructive apenas quando houver exclusão/cancelamento/suspensão
```

Evitar muitas ações primárias lado a lado.

Em mobile:

```text
- ações podem ir em linha quebrável
- ou dropdown/menu, se já houver componente
- não criar menu complexo se aumentar muito escopo
```

---

# 8. Densidade visual

Reduzir aparência de CRUD técnico.

## Aplicar

```text
- mais espaçamento em headers
- tabelas com altura de linha confortável
- texto secundário com muted-foreground
- datas em formato legível
- IDs internos com  e baixa prioridade, ou ocultos quando não necessários
```

Não esconder informação essencial.

---

# 9. Responsividade

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
- sem overflow horizontal no body
- tabelas com overflow interno quando necessário
- ações clicáveis no mobile
- filtros empilhados no mobile
- cards mobile legíveis
- botões não espremidos
```

---

# 10. Acessibilidade

Obrigatório:

```text
- botões com texto claro
- ações por linha acessíveis por teclado
- contraste adequado
- foco visível
- labels em filtros
- status não comunicado apenas por cor
- empty states com texto claro
```

---

# 11. Documentação

Criar:

```text
/docs/design/data-tables-responsive-lists.md
```

Atualizar:

```text
/docs/design/design-system-foundation.md
README.md
```

Documentar:

```text
- componentes criados
- telas revisadas
- padrão de tabela desktop
- padrão de cards mobile
- padrão de filtros
- padrão de empty states
- padrão de ações por linha
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

Ajustar testes existentes se necessário.

Não precisa criar testes pesados para mudanças visuais, mas todos os testes atuais devem continuar passando.

---

# 13. Validação funcional obrigatória

## Admin

Validar:

```text
/admin/tenants
/admin/plans
/admin/subscriptions
/admin/audit-logs
/admin/tenants/[id]/typebot-credentials
/admin/tenants/[id]/templates
```

Checklist:

```text
- tabela/lista abre
- filtros funcionam
- ações por linha funcionam
- status continuam corretos
- mobile não quebra
- nenhum dado administrativo some indevidamente
```

## Prestador

Validar:

```text
/app/services
/app/services/categories
/app/customers
/app/appointments
/app/availability
/app/availability/blocks
```

Checklist:

```text
- listagens abrem
- filtros funcionam
- criar novo item continua funcionando
- editar continua funcionando
- inativar/reativar continua funcionando
- status continuam corretos
- mobile não quebra
- ações por linha continuam navegando para rotas corretas
```

## Segurança

Validar:

```text
- CUSTOMER não acessa listagens /app
- prestador não acessa listagens /admin
- tenant A não vê dados do tenant B
```

---

# Fora do escopo

Não implementar:

```text
- nova paginação se não existir
- busca global
- ordenação complexa
- exportação CSV/PDF
- bulk actions
- seleção múltipla
- drag and drop
- calendário visual
- gráficos
- alteração de queries de negócio
- alteração de Prisma
- migrations
- novos endpoints
- refactor total de TanStack Table
```

---

# Critérios de aceite

* TableContainer aplicado nas tabelas prioritárias.
* Tabelas não quebram o layout no mobile.
* Telas críticas têm experiência mobile aceitável.
* Empty states úteis implementados.
* Filtros visualmente organizados.
* Ações por linha padronizadas.
* Badges/status usam variantes semânticas.
* Botões principais continuam verdes.
* Destructive reservado para ação perigosa.
* Nenhuma regra de negócio alterada.
* Nenhuma migration criada.
* Auth, tenant isolation e permissions preservados.
* Link público continua funcionando.
* Typebot API continua funcionando.
* Dashboard do prestador continua funcionando.
* Documentação criada/atualizada.
* `pnpm typecheck`, `pnpm lint`, `pnpm test` e `pnpm build` passam.

---

# Instruções para o DeepSeek

Implemente somente a Phase 20 Data Tables & Responsive Lists.

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
```

Melhore tabelas/listagens/filtros/empty states principalmente em:

```text
/admin/tenants
/admin/subscriptions
/admin/audit-logs
/app/services
/app/services/categories
/app/customers
/app/appointments
/app/availability
/app/availability/blocks
```

Aplicar:

```text
- TableContainer onde fizer sentido
- cards mobile nas listagens críticas
- empty states úteis
- filtros organizados
- ações por linha padronizadas
- badges/status semânticos
- mobile sem overflow
```

Preservar:

```text
- auth
- tenant isolation
- permissions
- subscription enforcement
- onboarding
- Typebot API
- public booking
- server actions
- queries
- validações
```

Não implementar:

```text
- exportação
- bulk actions
- seleção múltipla
- nova paginação
- busca global
- calendário visual
- drag and drop
- alterações Prisma
- migrations
- novos endpoints
- refactor total de TanStack Table
```

Ao finalizar, informe:

```text
- arquivos criados
- arquivos alterados
- telas revisadas
- componentes criados
- regras preservadas
- validações executadas
- pendências conhecidas
```
