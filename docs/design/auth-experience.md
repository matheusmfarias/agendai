# Auth Experience — AgendaZap

**Phase 17 — Login & Auth Experience Redesign**
**Date:** 2026-06-29

---

## Objective

Redesenhar a experiência de autenticação do AgendaZap (`/login` e `/access-denied`) com a nova identidade visual da Phase 16, mantendo todas as regras de autenticação, sessão, roles e redirecionamentos intactas.

---

## Design decisions

### Layout: two-column split

A tela de login adota um layout de duas áreas em desktop (lg+):

- **Esquerda:** painel de marca com fundo deep green (`--sidebar`), exibindo o nome do produto em Lora, a proposta de valor e um mini cartão de agenda com dados fictícios.
- **Direita:** área de autenticação com fundo off-white (`--background`) e card branco (`--card`) centralizado.

Em mobile, o layout empilha verticalmente: marca compacta no topo e card de login abaixo.

### Why deep green on the left panel

O deep green (`#2B5C4A`) é o token `--sidebar` e representa profundidade e confiança na identidade visual. Usá-lo no painel de marca cria continuidade com a sidebar do produto e ancora a tela de login na mesma linguagem visual do resto da aplicação — sem recorrer a gradientes genéricos ou cores "SaaS".

### Typography

- **Lora (`font-display`):** usada com restrição apenas no nome do produto ("AgendaZap") no painel de marca e no header mobile.
- **Inter (`font-sans`):** corpo do texto, labels, inputs, botões e card de login.
- **JetBrains Mono (``):** usado apenas nos horários do mini cartão de agenda (`tabular-nums`).

### Mini agenda card

O painel de marca inclui um pequeno cartão visual com três entradas fictícias de agenda ("Hoje"):

```
09:00  Corte masculino
10:30  Revisão preventiva
14:00  Limpeza de pele
```

Os dados são fictícios e genéricos, representando diferentes segmentos (barbearia, mecânica, estética) para mostrar a versatilidade do produto sem parecer um dashboard mockado.

### Color usage

- **Botão primário:** terracota (`--primary`) — ação principal "Entrar"
- **Erros:** Alert `destructive` com borda e fundo sutis
- **Card:** branco (`--card`) com shadow assimétrico (`--shadow-card`)
- **Background da página:** off-white (`--background`)

---

## States handled

### 1. Visitante (não autenticado)

Exibe o formulário de login padrão com campos de e-mail e senha.

### 2. SUPER_ADMIN já autenticado

Redireciona automaticamente para `/admin/dashboard`. Comportamento preservado da implementação anterior.

### 3. Usuário prestador (OWNER/ADMIN/OPERATOR) já autenticado

Redireciona automaticamente para `/app/dashboard`. Comportamento preservado.

### 4. CUSTOMER com `redirectTo`

Redireciona para a rota segura especificada em `redirectTo`. Comportamento preservado.

### 5. CUSTOMER sem `redirectTo`

Exibe o card "Você já está conectado" com descrição e botão "Sair". Redesenhado visualmente mas com a mesma lógica de `logoutAction`.

### 6. Credenciais inválidas

Exibe mensagem de erro via `Alert variant="destructive"`: "E-mail ou senha inválidos." Não revela se o e-mail existe ou se a senha está errada.

### 7. Acesso negado (`/access-denied`)

Card centrado com ícone ShieldX, título "Acesso não permitido", descrição e botão "Voltar ao login" que executa logout.

---

## What was NOT changed

- Lógica de autenticação (`auth-service.ts`, `auth-actions.ts`)
- Sessão e cookies (`session.ts`)
- Validação de schema (`auth-schemas.ts`)
- Verificação de permissões (`permissions.ts`)
- Redirecionamentos por role
- Comportamento de `redirectTo`
- Comportamento de CUSTOMER já logado
- `logoutAction`
- Nenhuma migration foi criada
- Nenhum endpoint foi alterado

---

## Components created

| Component | Path | Purpose |
|---|---|---|
| `AuthLayout` | `src/features/auth/auth-layout.tsx` | Two-column responsive shell for auth pages |
| `AuthBrandPanel` | `src/features/auth/auth-brand-panel.tsx` | Desktop brand panel (left side) |
| `AuthMobileBrand` | `src/features/auth/auth-brand-panel.tsx` | Compact mobile brand header |
| `AuthCard` | `src/features/auth/auth-card.tsx` | Standard card wrapper for auth forms |

## Components modified

| Component | Path | Changes |
|---|---|---|
| `LoginForm` | `src/components/forms/login-form.tsx` | Error messages use `Alert` component instead of inline div; updated placeholder text |
| `LoginPage` | `src/app/(public)/login/page.tsx` | Uses `AuthLayout` + `AuthBrandPanel` + `AuthCard`; preserves all auth logic |
| `AccessDeniedPage` | `src/app/(public)/access-denied/page.tsx` | Visual redesign; better copy; preserves logout behavior |

---

## What's out of scope

- Recuperação de senha
- OAuth / login social
- 2FA / magic link
- Cadastro público novo
- Dark mode
- Redesign do link público
- Redesign do dashboard

---

## Next steps

- Implementar recuperação de senha (fase futura)
- Adicionar suporte a dark mode na experiência de auth
- Considerar tela de "esqueci minha senha" integrada ao fluxo de login

---

## Related

- [Visual Identity](./visual-identity.md)
- [Design System Foundation](./design-system-foundation.md)
- [Auth & Permissions (technical)](../technical/auth-permissoes.md)
