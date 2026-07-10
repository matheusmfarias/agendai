# Task - Phase 16 Visual Identity & Design System Foundation

## Objetivo

Criar a fundação visual do AgendaZap antes de redesenhar telas específicas.

O diagnóstico de frontend mostrou que o produto é funcional, mas ainda não possui identidade visual própria. A interface atual parece um dashboard SaaS genérico, com paleta verde-cinza, estrutura repetitiva de cards/tabelas, tipografia sem personalidade e ausência de elemento de assinatura.

Esta fase deve criar uma base visual consistente para as próximas fases de redesign, sem alterar regras de negócio críticas.

O foco é:

```text
- tokens de cor
- tipografia
- escala visual
- componentes base
- estados visuais
- documentação do design system
- correção da fonte atual
- preparação para redesign das telas críticas
```

Esta fase não deve redesenhar o link público, dashboard do prestador, admin completo, tabelas complexas ou fluxo de agendamento. Essas mudanças virão em fases próprias.

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
```

Antes de implementar, leia obrigatoriamente:

```text
.ai/PROJECT_RULES.md
.ai/skills/frontend-design.md
diagnostico-frontend-2026-06-26.md
inventario-telas-2026-06-26.md
/docs/specs/00-visao-produto.md
/docs/specs/01-usuarios-permissoes.md
/docs/specs/02-admin-plataforma.md
/docs/technical/padroes-codigo.md
README.md
```

---

# Diagnóstico base

Usar como base os achados do diagnóstico:

```text
- produto funcional, mas sem identidade visual própria
- interface parecida com dashboard SaaS genérico
- paleta atual verde-cinza sem contraste de temperatura
- Inter carregada mas body renderizando Arial
- ausência de hierarquia tipográfica
- ausência de elemento de assinatura
- cards e tabelas genéricos
- badges e alerts com cores fixas fora dos tokens
- componentes essenciais ausentes
- tabelas sem proteção responsiva
- microcopy inconsistente em alguns fluxos
```

Nesta fase, resolver somente o que pertence à fundação visual.

---

# Direção visual aprovada para esta fase

Implementar a direção visual baseada no universo dos prestadores locais.

## Conceito

```text
Agenda física elevada a digital.
```

A interface deve transmitir:

```text
- organização
- confiança
- proximidade
- serviço local
- rotina simples
- confirmação clara
```

Evitar:

```text
- dashboard corporativo frio
- visual genérico verde/azul de SaaS
- excesso de gradientes
- excesso de animações
- textura literal de papel
- visual artesanal caricato
```

---

# 1. Tokens de cor

Atualizar tokens globais em:

```text
src/app/globals.css
```

## Paleta base

Usar a direção:

```text
Fundo:          #FAF9F6
Superfície:     #FFFFFF
Texto:          #1C1C1C
Texto secund.:  #6B6B6B
Borda:          #E5E3DF

Acento 1:       #D44E2B
Acento 2:       #2B5C4A
Acento 3:       #F4B84A
```

## Regras

* Traduzir a paleta para tokens compatíveis com Tailwind/shadcn.
* Manter compatibilidade com os nomes existentes:

  * `--background`
  * `--foreground`
  * `--card`
  * `--card-foreground`
  * `--primary`
  * `--primary-foreground`
  * `--secondary`
  * `--secondary-foreground`
  * `--muted`
  * `--muted-foreground`
  * `--accent`
  * `--accent-foreground`
  * `--destructive`
  * `--border`
  * `--input`
  * `--ring`
  * `--sidebar`
  * `--sidebar-foreground`
  * `--sidebar-primary`
  * `--sidebar-primary-foreground`
  * `--sidebar-accent`
  * `--sidebar-accent-foreground`
  * `--sidebar-border`
  * `--sidebar-ring`
* Não remover tokens exigidos pelos componentes existentes.
* Evitar classes Tailwind fixas como `amber-100`, `emerald-100`, `green-700` em novos componentes.
* Quando possível, substituir hardcoded colors nos componentes base por tokens.

## Cores semânticas

Criar ou padronizar tokens/classes para:

```text
success
warning
danger/destructive
info
neutral
```

Se Tailwind v4 já estiver usando tokens via CSS variables, implementar de forma compatível com o padrão atual do projeto.

---

# 2. Tipografia

Atualizar:

```text
src/app/layout.tsx
src/app/globals.css
```

## Fontes

Usar:

```text
Display: Lora
Body: Inter
Utility/Data: JetBrains Mono
```

## Regras

* Carregar as fontes via `next/font/google`.
* Corrigir o bug atual em que o body renderiza Arial.
* Body deve usar Inter.
* Títulos de alto impacto podem usar Lora.
* Dados técnicos, tokens, IDs curtos e códigos podem usar JetBrains Mono.
* Não aplicar Lora em todo o sistema. Usar com restrição.

## Classes utilitárias sugeridas

Criar classes globais ou utilitários consistentes:

```text
.font-display
.font-body
.font-utility

.text-page-title
.text-section-title
.text-card-title
.text-data
.text-caption
```

Se preferir não criar classes globais, documentar no design system como usar Tailwind classes equivalentes.

---

# 3. Escala visual

Definir escala base de:

```text
- border radius
- shadows
- spacing
- typography
- cards
- forms
- tables
```

## Direção

A metáfora é “agenda/ficha organizada”, mas sem textura literal.

Implementar:

```text
- superfícies claras
- sombra sutil assimétrica
- bordas bege/cinza quente
- divisores finos
- cards com aparência menos genérica
- foco visível e acessível
```

## Regras

* Não criar sombras pesadas.
* Não usar textura de papel.
* Não usar cantos dobrados.
* Não transformar tudo em visual vintage.
* O produto deve continuar parecendo software profissional.

---

# 4. Componentes base

Atualizar componentes base existentes sem quebrar API pública dos componentes.

Arquivos prováveis:

```text
src/components/ui/button.tsx
src/components/ui/card.tsx
src/components/ui/badge.tsx
src/components/ui/alert.tsx
src/components/ui/input.tsx
src/components/ui/select.tsx
src/components/ui/textarea.tsx
src/components/ui/table.tsx
src/components/ui/checkbox.tsx
src/components/forms/form-feedback.tsx
```

## Button

Revisar variantes:

```text
default
secondary
outline
ghost
destructive
```

Adicionar se fizer sentido:

```text
quiet
```

Regras:

```text
- default usa acento principal terracota
- foco visível
- disabled claro
- hover não deve parecer genérico verde/azul
```

## Card

Revisar:

```text
- borda
- radius
- sombra
- padding
- header/title hierarchy
```

Não quebrar layout atual.

## Badge

Padronizar variantes:

```text
default
secondary
outline
destructive
warning
success
info
```

Regras:

```text
- warning usa token mostarda/âmbar
- success usa verde escuro/suave
- destructive usa vermelho seguro
- remover hardcoded Tailwind colors quando possível
```

## Alert

Adicionar ou revisar variante:

```text
warning
info
success
destructive
```

Muitas telas já precisam de warning e hoje usam classes inline.

## Inputs

Revisar:

```text
- borda
- foco
- disabled
- helper/error compatibility
```

## Table

Fazer correção de segurança visual sem mudar comportamento:

```text
- adicionar classe/estrutura que facilite overflow-x-auto
- não transformar todas as tabelas nesta fase
- preparar `TableContainer` se fizer sentido
```

Criar componente opcional:

```text
src/components/ui/table-container.tsx
```

Com:

```tsx
<div className="w-full overflow-x-auto rounded-... border ...">
  {children}
</div>
```

Não aplicar em todas as telas nesta fase, exceto se for simples e seguro.

---

# 5. Elemento de assinatura

Criar componente visual reutilizável:

```text
src/components/brand/confirmation-stamp.tsx
```

## Objetivo

Representar o “carimbo de confirmação”.

## Regras

* Implementar com CSS puro.
* Usar com moderação.
* Não aplicar em telas ainda nesta fase, exceto em uma página de demonstração/design system se criada.
* Não usar em todos os badges.
* Não virar decoração genérica.

## Props sugeridas

```ts
type ConfirmationStampProps = {
  children?: React.ReactNode;
  tone?: "confirmed" | "received" | "completed";
  className?: string;
};
```

Texto padrão:

```text
Confirmado
```

Visual:

```text
- cor terracota
- borda tipo carimbo
- rotação sutil
- tipografia forte
- respeitar prefers-reduced-motion, se houver animação
```

---

# 6. Documentação do design system

Criar:

```text
/docs/design/visual-identity.md
/docs/design/design-system-foundation.md
```

## visual-identity.md

Documentar:

```text
- conceito visual
- personalidade do produto
- paleta
- tipografia
- elemento de assinatura
- o que evitar
```

## design-system-foundation.md

Documentar:

```text
- tokens
- componentes base
- variantes de Button, Badge, Alert
- uso de tipografia
- uso de sombra/borda
- acessibilidade mínima
- como aplicar nas próximas fases
```

---

# 7. Página interna opcional de referência

Opcional, mas recomendado se for simples:

```text
/admin/design-system
```

Acesso:

```text
SUPER_ADMIN
```

Exibir:

```text
- cores
- tipografia
- botões
- badges
- alerts
- cards
- inputs
- confirmation stamp
```

Se criar essa rota, ela deve ficar fora da sidebar principal ou em item discreto de desenvolvimento/admin.

Se isso aumentar muito o escopo, não criar rota e apenas documentar.

---

# 8. Restrições importantes

Esta fase não deve:

```text
- redesenhar completamente /login
- redesenhar /[tenantSlug]
- redesenhar /[tenantSlug]/book
- redesenhar /app/dashboard
- redesenhar tabelas principais
- alterar regras de negócio
- alterar validações Zod
- alterar Prisma schema
- alterar endpoints Typebot
- alterar subscription enforcement
- alterar onboarding logic
- alterar auth redirects
```

Pequenas alterações visuais globais inevitavelmente afetarão todas as telas, mas não deve haver reestruturação funcional.

---

# 9. Testes e validações

Rodar:

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

Também validar manualmente:

```text
/login
/admin/dashboard
/admin/tenants
/app/dashboard
/app/services
/[tenantSlug]
/[tenantSlug]/book
```

Objetivo da validação manual:

```text
- fontes renderizam corretamente
- body não usa mais Arial
- contraste legível
- botões continuam visíveis
- badges continuam legíveis
- alerts continuam legíveis
- cards não quebraram layout
- formulários continuam usáveis
- tabelas não pioraram
- foco de teclado visível
```

---

# 10. Fora do escopo

Não implementar:

```text
- dark mode
- redesign completo do login
- redesign completo do link público
- redesign completo do painel do prestador
- redesign completo do admin
- paginação/busca/ordenação de tabelas
- Dialog/Tooltip/Toast/Skeleton completos
- mobile card tables
- animações avançadas
- customização visual por segmento
- upload de logo
- temas por tenant
```

---

# Critérios de aceite

* Paleta global atualizada.
* Inter passa a ser a fonte real do body.
* Lora carregada e disponível para display.
* JetBrains Mono carregada e disponível para utility/data.
* Tokens compatíveis com shadcn/Tailwind preservados.
* Componentes base atualizados com a nova direção visual.
* Badge possui variantes semânticas coerentes.
* Alert possui variante warning/info/success/destructive.
* Inputs, buttons e cards têm foco/hover/disabled coerentes.
* `ConfirmationStamp` criado.
* Documentação em `/docs/design/visual-identity.md` criada.
* Documentação em `/docs/design/design-system-foundation.md` criada.
* Nenhuma migration criada.
* Nenhuma regra de negócio alterada.
* Auth continua funcionando.
* Link público continua funcionando.
* Typebot API continua funcionando.
* Onboarding continua funcionando.
* Subscription enforcement continua funcionando.
* `pnpm typecheck`, `pnpm lint`, `pnpm test` e `pnpm build` passam.

---

# Instruções para o DeepSeek

Implemente somente a Phase 16 Visual Identity & Design System Foundation.

Antes de alterar código, leia:

```text
.ai/PROJECT_RULES.md
.ai/skills/frontend-design.md
diagnostico-frontend-2026-06-26.md
inventario-telas-2026-06-26.md
```

Não redesenhe telas específicas nesta fase.

Crie a fundação visual:

```text
- tokens globais
- fontes
- escala tipográfica
- componentes base
- variantes semânticas
- confirmation stamp
- documentação de design
```

Não altere regras de negócio, rotas, Prisma, endpoints, auth, subscription enforcement, onboarding ou Typebot.

Ao finalizar, informe:

```text
- arquivos criados
- arquivos alterados
- se houve migration
- tokens implementados
- fontes implementadas
- componentes alterados
- documentação criada
- validações executadas
- pendências conhecidas
```
