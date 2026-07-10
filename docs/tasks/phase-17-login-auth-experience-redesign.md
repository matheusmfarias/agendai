# Task - Phase 17 Login & Auth Experience Redesign

## Objetivo

Redesenhar a experiência de login e acesso negado do AgendaZap usando a nova fundação visual criada na Phase 16.

A tela `/login` é a primeira impressão de 100% dos usuários: Super Admin, prestador e cliente final. Atualmente ela funciona corretamente, mas visualmente ainda parece um login SaaS genérico: card centralizado, ícone em caixa, fundo neutro e pouca identidade do produto.

Esta fase deve transformar a tela de autenticação em uma entrada visualmente mais forte e coerente com a identidade do AgendaZap, sem alterar regras de autenticação, redirecionamento, sessão ou autorização.

---

# Dependências

Esta task depende da conclusão e validação das fases:

```text id="s5ac1a"
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
```

Antes de implementar, leia obrigatoriamente:

```text id="mpf16j"
.ai/PROJECT_RULES.md
.ai/skills/frontend-design.md
diagnostico-frontend-2026-06-26.md
inventario-telas-2026-06-26.md
/docs/design/visual-identity.md
/docs/design/design-system-foundation.md
/docs/specs/00-visao-produto.md
/docs/specs/01-usuarios-permissoes.md
/docs/technical/auth-permissoes.md
/docs/technical/padroes-codigo.md
README.md
```

---

# Escopo

Redesenhar:

```text id="xakm82"
/login
/access-denied
```

Também pode ajustar componentes diretamente relacionados:

```text id="f05msi"
src/components/forms/login-form.tsx
```

E criar componentes visuais específicos de auth, se fizer sentido:

```text id="btkh1w"
src/features/auth/auth-shell.tsx
src/features/auth/auth-brand-panel.tsx
src/features/auth/auth-status-card.tsx
```

Não alterar autenticação, cookies, sessão, permissões, roles ou redirecionamentos.

---

# Problema atual

O diagnóstico identificou que a tela de login:

```text id="yyd0bv"
- não tem identidade visual
- é um card branco centralizado genérico
- usa logo genérico com CalendarCheck2 dentro de quadrado
- não diferencia os públicos do produto
- não explica o valor do AgendaZap
- não usa a nova direção visual de forma intencional
```

Além disso, a tela de login é de risco alto porque concentra:

```text id="d9bnnk"
- login de SUPER_ADMIN
- login de USER prestador
- login de CUSTOMER
- redirecionamento por papel
- redirectTo em fluxos públicos
- estado de CUSTOMER já logado
- redirecionamento pós-login
```

---

# Direção visual

Usar a identidade aprovada na Phase 16:

```text id="ikn9vb"
Conceito: Agenda física elevada a digital.
```

A tela deve transmitir:

```text id="z0ydmd"
- organização
- confiança
- proximidade
- serviço local
- clareza de acesso
- sensação de produto profissional, não template
```

Usar os tokens e fontes já implementados:

```text id="z5zptj"
- fundo off-white
- terracota para ação principal
- verde escuro como profundidade/confiança
- mostarda para detalhes pontuais
- Inter para corpo
- Lora para título/display com restrição
- JetBrains Mono apenas para tokens/dados pequenos, se necessário
```

---

# Conceito da tela

## Layout recomendado

Criar uma tela em duas áreas:

```text id="0e7sx9"
Esquerda: painel de marca/valor do produto
Direita: card de autenticação
```

Em desktop:

```text id="8c34r5"
┌──────────────────────────────────────┬───────────────────────────────┐
│ Painel visual do AgendaZap           │ Card de login                  │
│                                      │                               │
│ "Sua agenda deixa de depender        │ Entrar no AgendaZap            │
│  de conversas soltas."               │ email                          │
│                                      │ senha                          │
│ Mini fluxo visual:                   │ botão Entrar                   │
│ Serviço → Horário → Confirmação      │ mensagens/estado               │
│                                      │                               │
└──────────────────────────────────────┴───────────────────────────────┘
```

Em mobile:

```text id="am30sm"
┌───────────────────────────────┐
│ Marca + frase curta           │
├───────────────────────────────┤
│ Card de login                 │
└───────────────────────────────┘
```

## Evitar

```text id="2b5yas"
- hero exagerado
- mockup falso de dashboard
- gradiente SaaS genérico
- ilustração stock
- excesso de ícones
- animação complexa
```

---

# Copy sugerida

## Título principal do painel visual

```text id="eoe1t4"
Agendamentos organizados sem perder o jeito do atendimento local.
```

Alternativa mais curta:

```text id="f8iznr"
Sua agenda deixa de depender de conversas soltas.
```

## Subtexto

```text id="oze9z3"
Catálogo, horários e confirmações em um só lugar para prestadores que atendem pelo link público e WhatsApp.
```

## Mini fluxo visual

Usar três passos reais do produto:

```text id="6y6g04"
1. Serviço escolhido
2. Horário reservado
3. Confirmação enviada
```

Mas não usar marcadores genéricos 01/02/03 se parecer decoração. Pode usar labels em formato de ficha, como:

```text id="zb7rmo"
Serviço
Horário
Confirmação
```

## Título do card de login

```text id="iwpqin"
Entrar no AgendaZap
```

## Subtexto do card

```text id="upt7kt"
Acesse sua área para administrar agendas, serviços e atendimentos.
```

Para CUSTOMER já logado:

```text id="aa2z2d"
Você já está conectado
```

Subtexto:

```text id="pbrvec"
Continue para finalizar seu agendamento ou saia para entrar com outra conta.
```

---

# 1. Redesign da rota `/login`

Atualizar:

```text id="qypkeu"
src/app/(public)/login/page.tsx
src/components/forms/login-form.tsx
```

Ou criar componentes específicos e manter a page fina.

## Regras obrigatórias

Preservar completamente:

```text id="v5zokt"
- leitura de searchParams
- redirectTo
- comportamento de CUSTOMER já logado
- comportamento de SUPER_ADMIN já logado
- comportamento de USER prestador já logado
- login por email/senha
- mensagens de erro existentes
- logout quando aplicável
- não permitir SUPER_ADMIN/CUSTOMER acessar áreas erradas
```

## Visual

Implementar:

```text id="9ogk5z"
- layout responsivo em duas colunas no desktop
- painel de marca com a nova identidade
- card de login com nova hierarquia tipográfica
- título usando Lora/font-display com restrição
- botão primário terracota via Button default
- estados de erro usando Alert destructive
- estado de sucesso/info usando Alert info/success quando necessário
- foco de teclado visível
```

## Elementos visuais sugeridos

Criar um pequeno “cartão de agenda” visual no painel da esquerda, sem dados reais:

```text id="6s0a0e"
Hoje
09:00  Corte masculino
10:30  Revisão preventiva
14:00  Limpeza de pele
```

Regras:

```text id="n8ao1i"
- usar dados fictícios genéricos
- não parecer dashboard mockado demais
- não usar clientes reais
- usar JetBrains Mono somente nos horários, se fizer sentido
```

## Identidade

Pode manter o nome AgendaZap, mas melhorar o tratamento:

```text id="zbs2w5"
AgendaZap
Organize serviços, horários e confirmações.
```

Não precisa alterar logo global ainda.

---

# 2. Estado de usuário já logado

A tela atual já trata CUSTOMER logado com um card. Redesenhar sem alterar lógica.

## Regras

Se CUSTOMER estiver logado e houver `redirectTo` público:

```text id="uhuqbf"
- mostrar opção para continuar
- mostrar opção para sair
```

Se SUPER_ADMIN estiver logado:

```text id="1zb6yz"
- redirecionar para /admin/dashboard conforme regra atual
```

Se USER prestador estiver logado:

```text id="fowjic"
- redirecionar para /app/dashboard conforme regra atual
```

Se houver comportamento atual específico, preservar.

---

# 3. Login form

Atualizar visual do formulário sem alterar action/API.

## Melhorias

```text id="mqwfbl"
- labels claros
- helper text curto, se necessário
- campos com autocomplete correto
- botão com estado pending se já existir
- largura confortável
- mensagens de erro mais bem posicionadas
```

## Microcopy

Usar:

```text id="y1f3o6"
E-mail
Senha
Entrar
```

Evitar:

```text id="s7ll0v"
Submit
Enviar
Acessar sistema
```

---

# 4. Redesign da rota `/access-denied`

Atualizar:

```text id="jidw46"
src/app/(public)/access-denied/page.tsx
```

## Objetivo

Deixar coerente com a nova experiência de auth.

## Copy sugerida

Título:

```text id="jo64xc"
Acesso não permitido
```

Texto:

```text id="p4tvsg"
Sua conta não tem permissão para abrir esta área.
```

Ação principal:

```text id="cm9u9l"
Voltar ao login
```

Ação secundária opcional:

```text id="7jxgrs"
Sair da conta atual
```

## Regras

* Não revelar detalhes sensíveis de permissão.
* Não explicar estrutura interna de roles.
* Preservar logout/redirecionamento atual.

---

# 5. Componentes reutilizáveis

Se criar componentes novos, manter baixo acoplamento.

Sugestão:

```text id="321zdo"
src/features/auth/auth-layout.tsx
src/features/auth/auth-brand-panel.tsx
src/features/auth/auth-card.tsx
```

## Regras

* Não misturar server action com componente puramente visual.
* Não transformar login em client component se não for necessário.
* Não quebrar progressive enhancement do form.
* Não duplicar lógica de sessão.

---

# 6. Acessibilidade

Obrigatório:

```text id="cn7ar1"
- labels associados aos inputs
- foco visível
- contraste adequado
- navegação por teclado funcional
- mensagens de erro perceptíveis
- layout mobile sem overflow horizontal
- nenhum botão icon-only sem label
```

---

# 7. Responsividade

Validar:

```text id="tuyf6r"
320px
375px
768px
1024px
1440px
```

## Regras

* Em mobile, o painel de marca deve reduzir sem empurrar o formulário para longe.
* O card de login deve aparecer rapidamente.
* Não criar hero gigante em mobile.
* Não ter overflow horizontal.
* Botões devem ter área de toque adequada.

---

# 8. Testes

Não precisa criar muitos testes se a lógica não mudar, mas ajustar testes existentes se snapshots/classes forem afetados.

Rodar:

```bash id="b9lw09"
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

Manual:

```text id="u5e65e"
/login
/login?redirectTo=/logica/book
/access-denied
```

---

# 9. Validação funcional obrigatória

Validar manualmente:

## Login Super Admin

```text id="lf74rq"
1. Abrir /login
2. Entrar como Super Admin
3. Esperado: redireciona para /admin/dashboard
```

## Login prestador

```text id="q1r1ee"
1. Abrir /login
2. Entrar como usuário OWNER/ADMIN de tenant
3. Esperado: redireciona para /app/dashboard
```

## Login cliente com redirectTo

```text id="qybt08"
1. Abrir /login?redirectTo=/logica/book
2. Entrar como CUSTOMER
3. Esperado: redireciona para /logica/book ou rota pública correta
```

## CUSTOMER já logado

```text id="tfkrm5"
1. Logar como CUSTOMER
2. Abrir /login
3. Esperado: não jogar para /admin nem /app
4. Mostrar estado de usuário conectado ou opção segura equivalente
```

## Credencial inválida

```text id="n8uth5"
1. Informar email/senha errados
2. Esperado: erro visual claro
3. Não revelar se email existe
```

## Access denied

```text id="aw0w3t"
1. Forçar acesso sem permissão
2. Esperado: /access-denied visualmente coerente
3. Logout/voltar ao login funciona
```

---

# 10. Documentação

Atualizar:

```text id="sq7ayw"
/docs/design/design-system-foundation.md
README.md
```

Criar ou atualizar, se fizer sentido:

```text id="oq66yr"
/docs/design/auth-experience.md
```

Documentar:

```text id="sy5en7"
- objetivo da nova tela de login
- decisões visuais
- estados tratados
- o que não foi alterado
- próximos passos
```

---

# Fora do escopo

Não implementar:

```text id="dylq39"
- recuperação de senha
- cadastro público novo fora do fluxo existente
- OAuth
- login social
- 2FA
- magic link
- alteração de sessão/cookies
- alteração de redirect rules
- alteração de roles
- redesign do link público
- redesign do dashboard
- redesign da sidebar
- animações complexas
- dark mode
```

---

# Critérios de aceite

* `/login` redesenhado visualmente.
* `/access-denied` redesenhado visualmente.
* Nova identidade visual aplicada à experiência de auth.
* Lora usada com restrição em título/display.
* Inter continua como body.
* Layout desktop em duas áreas.
* Layout mobile sem overflow.
* Login Super Admin continua redirecionando para `/admin/dashboard`.
* Login prestador continua redirecionando para `/app/dashboard`.
* Login CUSTOMER com `redirectTo` continua funcionando.
* CUSTOMER já logado não é enviado indevidamente para admin/provider.
* Erro de credencial inválida continua seguro.
* Access denied continua funcionando.
* Nenhuma regra de auth alterada.
* Nenhuma migration criada.
* Nenhum endpoint alterado.
* Documentação atualizada/criada.
* `pnpm typecheck`, `pnpm lint`, `pnpm test` e `pnpm build` passam.

---

# Instruções para o DeepSeek

Implemente somente a Phase 17 Login & Auth Experience Redesign.

Antes de alterar código, leia:

```text id="p62rp7"
.ai/PROJECT_RULES.md
.ai/skills/frontend-design.md
diagnostico-frontend-2026-06-26.md
inventario-telas-2026-06-26.md
/docs/design/visual-identity.md
/docs/design/design-system-foundation.md
```

Redesenhe somente:

```text id="fr56o6"
/login
/access-denied
```

Preserve integralmente:

```text id="b6zysf"
- autenticação
- sessão
- cookies
- roles
- redirectTo
- redirects por papel
- CUSTOMER já logado
- access denied behavior
```

Não implemente recuperação de senha, OAuth, 2FA, magic link, cadastro novo, dark mode, redesign do link público ou dashboard.

Ao finalizar, informe:

```text id="q0mp9t"
- arquivos criados
- arquivos alterados
- se houve migration
- o que mudou visualmente
- o que foi preservado na auth
- validações executadas
- pendências conhecidas
```
