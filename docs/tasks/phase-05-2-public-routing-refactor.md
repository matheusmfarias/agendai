# Task - Phase 05.2 Public Routing Refactor

## Objetivo

Refatorar o roteamento público do AgendaZap para transformar as rotas públicas em páginas reais do Next.js App Router, removendo o acoplamento atual entre link público e página `/login`.

Esta fase não deve implementar funcionalidades novas. O comportamento funcional já existente das fases 05 e 05.1 deve ser preservado.

## Contexto

Hoje as rotas públicas funcionam via `src/proxy.ts`, que reescreve URLs como:

```text
/[tenantSlug]
/[tenantSlug]/services
/[tenantSlug]/book
/[tenantSlug]/book/confirm
```

para:

```text
/login?__public=...&tenantSlug=...
```

A página `src/app/(public)/login/page.tsx` detecta esses parâmetros e renderiza componentes públicos como `PublicHome`, `PublicServices`, `PublicBook` e `PublicConfirm`.

Isso funciona, mas é uma arquitetura frágil porque:

```text
- rotas públicas não existem como arquivos page.tsx reais
- a página de login acumula responsabilidades de login, home pública, serviços, agendamento e confirmação
- serviceId e appointmentId dependem da preservação indireta de query params pelo proxy
- fica mais difícil adicionar layouts públicos, SEO, loading/error states e manutenção futura
- as próximas fases de Typebot/WhatsApp vão aumentar a complexidade se isso não for corrigido agora
```

## Dependências

Esta task depende da conclusão funcional de:

```text
/docs/tasks/phase-05-public-booking-link.md
/docs/tasks/phase-05-1-public-customer-auth.md
```

Também devem continuar válidas as fases anteriores:

```text
/docs/tasks/phase-01-foundation.md
/docs/tasks/phase-02-admin-platform.md
/docs/tasks/phase-02-1-provider-login-access.md
/docs/tasks/phase-03-provider-panel.md
/docs/tasks/phase-04-customers-appointments-core.md
```

## Escopo

Implementar somente refatoração estrutural.

### 1. Criar rotas públicas reais

Criar páginas reais no App Router para:

```text
src/app/(public)/[tenantSlug]/page.tsx
src/app/(public)/[tenantSlug]/services/page.tsx
src/app/(public)/[tenantSlug]/book/page.tsx
src/app/(public)/[tenantSlug]/book/confirm/page.tsx
```

Se for útil, criar também:

```text
src/app/(public)/[tenantSlug]/layout.tsx
```

## Regras

As URLs finais devem continuar sendo:

```text
/[tenantSlug]
/[tenantSlug]/services
/[tenantSlug]/book?serviceId=...
/[tenantSlug]/book/confirm?appointmentId=...
```

Não mudar a URL pública do usuário.

---

# 2. Desacoplar login das páginas públicas

A página:

```text
src/app/(public)/login/page.tsx
```

deve voltar a ser somente a página de login global do sistema, usada por:

```text
/admin
/app
```

e outros fluxos administrativos/prestador.

Ela não deve mais renderizar:

```text
PublicHome
PublicServices
PublicBook
PublicConfirm
```

A lógica pública deve sair da página de login e ir para as páginas reais do tenant público.

---

# 3. Ajustar `src/proxy.ts`

O `src/proxy.ts` deve continuar protegendo:

```text
/admin
/app
```

e deve continuar redirecionando usuário sem sessão para `/login` quando tentar acessar áreas protegidas.

Mas não deve mais reescrever rotas públicas para `/login`.

## Regras esperadas

```text
/admin/* sem sessão -> /login
/app/* sem sessão -> /login
/ -> /login ou comportamento atual definido
/[tenantSlug] -> deixar passar para rota real
/[tenantSlug]/services -> deixar passar para rota real
/[tenantSlug]/book -> deixar passar para rota real
/[tenantSlug]/book/confirm -> deixar passar para rota real
```

## Importante

Não recriar `middleware.ts`.

O projeto deve continuar usando somente:

```text
src/proxy.ts
```

Não pode existir simultaneamente:

```text
src/middleware.ts
src/proxy.ts
```

---

# 4. Reorganizar arquivos fora da raiz de `src`

Os arquivos públicos atualmente na raiz de `src` devem ser movidos para estrutura compatível com a arquitetura documentada.

Mover ou reorganizar:

```text
src/public-booking-service.ts
src/public-booking-action.ts
src/public-booking-form.tsx
src/public-booking-schemas.ts
src/public-customer-auth.ts
src/public-customer-auth-forms.tsx
```

Sugestão de destino:

```text
src/features/public-booking/public-booking-service.ts
src/features/public-booking/public-booking-action.ts
src/features/public-booking/public-booking-form.tsx
src/features/public-booking/public-booking-schemas.ts
src/features/public-booking/public-customer-auth.ts
src/features/public-booking/public-customer-auth-forms.tsx
```

Alternativa aceitável:

```text
src/server/services/public-booking-service.ts
src/server/actions/public-booking-action.ts
src/features/public-booking/components/public-booking-form.tsx
src/features/public-booking/schemas.ts
src/features/public-booking/customer-auth-actions.ts
src/features/public-booking/customer-auth-forms.tsx
```

Escolha a estrutura mais coerente com o padrão atual do projeto.

## Regras

* Atualizar todos os imports.
* Não deixar arquivos públicos soltos na raiz de `src`.
* Não usar barrel export se isso causar problema com Server Components/Client Components.
* Separar corretamente arquivos com `"use client"` dos arquivos server-only.

---

# 5. Preservar comportamento funcional

Depois da refatoração, tudo que já funcionava precisa continuar funcionando.

## Página pública

```text
/[tenantSlug]
```

Deve continuar exibindo:

```text
nome do negócio
descrição
cidade/UF
endereço, se informado
WhatsApp, se informado
categorias ativas
serviços ativos
botões de agendamento
```

## Serviços públicos

```text
/[tenantSlug]/services
```

Deve continuar exibindo:

```text
categorias ativas
serviços ativos
preço conforme price_type
modo de agendamento conforme booking_mode
```

## Agendamento público

```text
/[tenantSlug]/book?serviceId=...
```

Deve continuar:

```text
mostrando horários disponíveis
respeitando availability_rules
respeitando schedule_blocks
respeitando conflitos
exigindo CUSTOMER autenticado para confirmar
mostrando login/cadastro de CUSTOMER quando não autenticado
```

## Confirmação

```text
/[tenantSlug]/book/confirm?appointmentId=...
```

Deve continuar exibindo os dados do agendamento criado, sem expor dados indevidos.

---

# 6. Não alterar regras de negócio

Não mudar:

```text
booking_mode
price_type
validação de conflito
validação de bloqueio
validação de disponibilidade
CUSTOMER obrigatório para confirmar agendamento
origin = PUBLIC_LINK
createdByUserId null no agendamento público
createdByUserId preenchido no agendamento manual
customer.userId vinculado ao CUSTOMER autenticado
appointment_custom_values
audit logs
appointment events
```

---

# 7. Não mexer em schema/migrations

Esta task é de refatoração de rota e organização de código.

Não criar migration.

Não alterar `prisma/schema.prisma`, exceto se houver import quebrado ou tipo gerado incorreto sem relação com banco.

---

# 8. README e documentação

Atualizar o README para refletir que o link público e a autenticação de cliente final já existem.

Adicionar rotas principais:

```text
/[tenantSlug]
/[tenantSlug]/services
/[tenantSlug]/book
/[tenantSlug]/book/confirm
```

Adicionar resumo do comportamento:

```text
- visitantes anônimos podem consultar serviços e horários
- confirmação de agendamento exige conta CUSTOMER
- CUSTOMER não acessa /admin nem /app
```

Não documentar funcionalidades ainda inexistentes como Typebot, WhatsApp, cancelamento pelo cliente ou área do cliente.

---

# Fora do escopo

Não implementar:

```text
Typebot
WhatsApp
Área do cliente final
Listagem de agendamentos do cliente
Cancelamento pelo cliente
Remarcação pelo cliente
Reset de senha por e-mail
Verificação de e-mail
Verificação por WhatsApp
Pagamento
Lembretes automáticos
Templates funcionais
Marketplace
```

---

# Critérios de aceite

* `/[tenantSlug]` existe como rota real do App Router.
* `/[tenantSlug]/services` existe como rota real do App Router.
* `/[tenantSlug]/book` existe como rota real do App Router.
* `/[tenantSlug]/book/confirm` existe como rota real do App Router.
* `src/app/(public)/login/page.tsx` não renderiza mais páginas públicas de tenant.
* `src/proxy.ts` não reescreve mais rotas públicas para `/login`.
* `/admin` e `/app` continuam protegidas.
* Usuário sem sessão em `/admin` ou `/app` continua indo para `/login`.
* Visitante anônimo continua acessando página pública.
* Visitante anônimo não consegue confirmar agendamento sem CUSTOMER.
* Cadastro/login CUSTOMER continuam funcionando.
* CUSTOMER continua bloqueado em `/admin` e `/app`.
* USER/SUPER_ADMIN não são tratados como CUSTOMER no fluxo público.
* Agendamento público continua criando `origin = PUBLIC_LINK`.
* Agendamento público continua com `createdByUserId = null`.
* Agendamento manual continua com `createdByUserId` preenchido.
* Campos personalizados continuam sendo salvos.
* Audit logs e appointment events continuam sendo criados.
* Arquivos `public-booking-*` e `public-customer-auth-*` não ficam mais soltos na raiz de `src`.
* README atualizado.
* `pnpm typecheck`, `pnpm lint`, `pnpm test` e `pnpm build` passam.

---

# Instruções para o DeepSeek

Implemente somente a Phase 05.2 Public Routing Refactor.

Esta é uma refatoração estrutural. Não implemente funcionalidades novas.

O objetivo é transformar as rotas públicas em páginas reais do Next.js App Router e remover o acoplamento atual entre link público e `/login`.

Preserve o comportamento já implementado nas fases 05 e 05.1.

Ao finalizar, informe:

```text
- arquivos criados
- arquivos movidos
- arquivos alterados
- se alguma regra de negócio foi tocada
- como o proxy.ts ficou
- como testar
- validações executadas
- pendências conhecidas
```
