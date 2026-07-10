# Task - Phase 18 Public Booking Experience Redesign

## Objetivo

Redesenhar a experiência pública de agendamento do AgendaZap.

O link público é a principal superfície comercial do produto: é o que o prestador compartilha com seus clientes e, na prática, é uma das partes mais visíveis do valor pago pelo SaaS.

Até agora, o link público funciona corretamente, respeita assinatura, serviços, disponibilidade, autenticação do cliente e criação de agendamentos. Porém, visualmente ainda parece uma listagem genérica de serviços, sem personalidade, sem hierarquia forte e sem experiência guiada.

Esta fase deve redesenhar as rotas públicas do prestador, mantendo todas as regras de negócio intactas.

---

# Dependências

Esta task depende da conclusão e validação das fases:

```text id="j4an1f"
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
```

Antes de implementar, leia obrigatoriamente:

```text id="owupiq"
.ai/PROJECT_RULES.md
.ai/skills/frontend-design.md
diagnostico-frontend-2026-06-26.md
inventario-telas-2026-06-26.md
/docs/design/visual-identity.md
/docs/design/design-system-foundation.md
/docs/specs/00-visao-produto.md
/docs/technical/padroes-codigo.md
/docs/technical/subscription-enforcement.md
README.md
```

---

# Escopo

Redesenhar as rotas públicas:

```text id="wkjiv6"
/[tenantSlug]
/[tenantSlug]/services
/[tenantSlug]/book
/[tenantSlug]/book/confirm
```

Também podem ser ajustados componentes relacionados:

```text id="ngv3qr"
src/features/public-booking/public-booking-form.tsx
src/features/public-booking/public-unavailable.tsx
src/features/public-booking/...
```

Criar componentes visuais específicos se fizer sentido:

```text id="bjwiho"
src/features/public-booking/public-shell.tsx
src/features/public-booking/public-hero.tsx
src/features/public-booking/service-card.tsx
src/features/public-booking/booking-stepper.tsx
src/features/public-booking/booking-confirmation-card.tsx
```

---

# Regras críticas

Preservar integralmente:

```text id="bse9x4"
- isolamento por tenantSlug
- subscription enforcement
- publicLinkEnabled
- criação de CUSTOMER
- login CUSTOMER
- redirectTo
- bloqueio de SUPER_ADMIN/USER no fluxo público quando aplicável
- criação de agendamento origin PUBLIC_LINK
- createdByUserId = null no agendamento público
- custom fields
- disponibilidade
- bloqueios
- conflitos
- bookingMode
- mensagens públicas genéricas quando assinatura/canal bloqueado
```

Não alterar Prisma, migrations, endpoints Typebot, regras de assinatura ou auth.

---

# Problemas atuais

O diagnóstico identificou que o link público:

```text id="q613l6"
- parece uma listagem genérica de API
- não transmite a identidade do negócio
- não diferencia segmentos
- não guia bem o cliente pelo processo
- usa cards genéricos e botões sem hierarquia forte
- não usa o elemento de assinatura criado na Phase 16
```

A página `/[tenantSlug]/book` também precisa de melhoria de UX:

```text id="r83eox"
- não tem step indicator claro
- slots usam select nativo
- form e autenticação aparecem de forma pouco guiada
- botão "Enviar agendamento" é vago
- estados de login/anônimo/admin são bons, mas podem ter melhor apresentação
```

---

# Direção visual

Usar a identidade aprovada:

```text id="p5grpk"
Agenda física elevada a digital.
```

O link público deve parecer:

```text id="b3g32g"
- profissional
- simples
- confiável
- local
- direto para agendar
```

E não deve parecer:

```text id="ihm1w2"
- dashboard administrativo
- catálogo genérico
- landing page SaaS
- marketplace
- página institucional longa
```

---

# 1. Redesign de `/[tenantSlug]`

## Objetivo

Transformar a página inicial pública do prestador em uma vitrine curta e objetiva para agendamento.

## Layout sugerido

```text id="yt7lv9"
Hero do negócio
- Nome do prestador
- Segmento/cidade
- Descrição curta
- WhatsApp, se disponível
- CTA principal: Agendar horário
- CTA secundário: Ver serviços

Resumo de operação
- serviços disponíveis
- tipo de atendimento
- status de agendamento

Serviços em destaque
- primeiras categorias/serviços ativos
- link para ver todos
```

## Visual

Usar:

```text id="77z5kp"
- fundo off-white
- card principal com superfície branca
- título com Lora/font-display
- badges com tokens semânticos
- CTA principal verde escuro
- terracota apenas como detalhe pequeno, não botão dominante
```

## Regras

* Não exibir motivo administrativo de indisponibilidade.
* Se link público estiver bloqueado, usar mensagem genérica.
* Não revelar assinatura vencida.
* Não mostrar IDs internos.
* Não transformar em marketplace.

---

# 2. Redesign de `/[tenantSlug]/services`

## Objetivo

Criar uma listagem de serviços clara, escaneável e confiável.

## Layout sugerido

```text id="rd5u9e"
Header compacto do prestador
Categorias com tratamento visual claro
Cards de serviço com:
- nome
- descrição
- duração
- preço
- modo de agendamento
- CTA "Agendar"
```

## Melhorias

```text id="axipzf"
- cards com melhor hierarquia
- categoria com divisores ou cabeçalho visual mais claro
- preço e duração em linha fácil de ler
- modo de agendamento com microcopy compreensível
- botão principal verde
```

## Microcopy

Evitar linguagem técnica como:

```text id="otat6r"
REQUIRES_CONFIRMATION
INFORMATIONAL
DIRECT
```

Usar labels humanos já existentes ou melhorar:

```text id="j1sgy0"
Confirmação imediata
Aguarda confirmação
Contato para combinar
```

---

# 3. Redesign de `/[tenantSlug]/book`

## Objetivo

Transformar o agendamento público em um fluxo guiado.

## Etapas visuais

Mesmo que tecnicamente continue em uma página, mostrar progresso visual:

```text id="gfmt0i"
1. Serviço
2. Horário
3. Dados
4. Confirmar
```

Ou usar labels sem números se ficar melhor:

```text id="8n8zdz"
Serviço → Horário → Dados → Confirmar
```

## Regras

* Não alterar a lógica de criação.
* Não alterar validações.
* Não alterar auth CUSTOMER.
* Visitante pode ver serviços e horários.
* Visitante precisa logar/cadastrar para confirmar, conforme regra atual.
* SUPER_ADMIN/USER não devem ser tratados como CUSTOMER.
* CUSTOMER logado deve ter fluxo mais direto.

## Melhorias visuais

```text id="65xf7a"
- substituir sensação de formulário longo por seções guiadas
- destacar serviço selecionado
- melhorar escolha de horário
- melhorar apresentação de custom fields
- melhorar banners de estado de autenticação
- melhorar botão final
```

## Botão final

Substituir microcopy vaga:

```text id="onhsdc"
Enviar agendamento
```

Por uma destas, conforme bookingMode:

```text id="a7xnpd"
Confirmar agendamento
Solicitar agendamento
Enviar solicitação
```

Se for complexo condicionar por bookingMode nesta fase, usar:

```text id="iu9jln"
Confirmar horário
```

---

# 4. Escolha de horários

Se hoje os horários usam select nativo, melhorar visualmente.

Opções permitidas:

```text id="5d9woz"
- manter select, mas com melhor hierarquia
- ou criar lista de botões/cards de horário
```

Recomendação:

```text id="gc4a8n"
Criar cards/botões de horário quando houver poucos slots.
Manter select ou lista compacta quando houver muitos slots.
```

Para MVP, pode usar lista/grid simples de botões de slot.

## Regras

* O valor enviado deve continuar sendo o `startsAt` retornado pelo backend.
* Não calcular horário no client.
* Não permitir slot manual.
* Continuar respeitando bloqueios/conflitos/disponibilidade.

---

# 5. Custom fields

Melhorar apresentação dos campos personalizados:

```text id="5rrsto"
- agrupar como "Informações para o atendimento"
- mostrar obrigatórios com clareza
- SELECT com opções claras
- BOOLEAN com Sim/Não compreensível
- erros próximos aos campos
```

Não alterar formato de payload.

---

# 6. Estados de autenticação

Preservar os 3 estados existentes:

```text id="34hd3a"
- CUSTOMER logado
- visitante anônimo
- admin/provider logado
```

Melhorar visual:

## CUSTOMER logado

```text id="3ip587"
Você está agendando como [nome]
```

CTA/ação:

```text id="z6ozfz"
Continuar com esta conta
```

## Visitante anônimo

```text id="bxfp66"
Você poderá escolher serviço e horário. Para confirmar, entre ou crie sua conta.
```

## Admin/provider logado

```text id="khwp3l"
Contas administrativas não podem confirmar agendamentos públicos.
```

Manter mensagem segura e clara.

---

# 7. Redesign de `/[tenantSlug]/book/confirm`

## Objetivo

Criar um desfecho memorável e claro após a criação do agendamento.

## Usar ConfirmationStamp

Aplicar:

```text id="jdvcxq"
src/components/brand/confirmation-stamp.tsx
```

Com moderação.

## Layout

```text id="p3qpld"
Carimbo/estado
Título contextual
Resumo do agendamento
Próximos passos
Botão voltar ao prestador
```

## Mensagens por status/bookingMode

Preservar mensagens já existentes, mas melhorar apresentação:

```text id="n2f488"
Confirmado
Solicitação enviada
Aguardando contato
```

## Regras

* Não adicionar cancelamento nesta fase.
* Não alterar permissões.
* Não alterar consulta do agendamento.
* Não expor dados internos.

---

# 8. Public unavailable

Atualizar `public-unavailable` para combinar com a nova identidade.

Mensagem pública deve continuar genérica:

```text id="nyoi6x"
Este serviço de agendamento está temporariamente indisponível. Entre em contato diretamente com o estabelecimento.
```

Não informar:

```text id="1pfs0p"
- assinatura vencida
- plano sem link público
- tenant suspenso
- dias de atraso
```

---

# 9. Responsividade

Validar em:

```text id="s6nrgi"
320px
375px
768px
1024px
1440px
```

Regras:

```text id="i2cd7f"
- sem overflow horizontal
- CTA visível rapidamente no mobile
- cards empilham corretamente
- horários clicáveis com área de toque adequada
- formulário não fica estreito demais
```

---

# 10. Acessibilidade

Obrigatório:

```text id="glwzzc"
- labels em todos os inputs
- botões de horário acessíveis
- foco visível
- contraste adequado
- erros associados aos campos
- navegação por teclado funcional
- nenhum botão icon-only sem label
```

---

# 11. Documentação

Criar:

```text id="sxyt1j"
/docs/design/public-booking-experience.md
```

Atualizar:

```text id="c4n5em"
/docs/design/design-system-foundation.md
README.md
```

Documentar:

```text id="oo6yd5"
- objetivo do redesign público
- telas alteradas
- regras preservadas
- decisões de UX
- estados de auth
- uso do ConfirmationStamp
- limitações
```

---

# 12. Testes

Rodar:

```bash id="ctq0qc"
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

Ajustar testes existentes se necessário.

Não criar testes pesados se só houver mudança visual, mas não quebrar testes atuais.

---

# 13. Validação funcional obrigatória

Validar manualmente:

## Link público disponível

```text id="emrtfs"
1. Acessar /[tenantSlug]
2. Ver dados do prestador
3. Ver serviços
4. Clicar em Agendar horário
```

## Lista de serviços

```text id="4tn945"
1. Acessar /[tenantSlug]/services
2. Conferir categorias
3. Conferir serviços ativos
4. Conferir preço/duração/bookingMode
5. Clicar em Agendar
```

## Booking anônimo

```text id="fp0u4e"
1. Acessar /[tenantSlug]/book
2. Selecionar serviço
3. Selecionar horário
4. Ver aviso de login/cadastro antes de confirmar
```

## Booking CUSTOMER

```text id="0qv7lv"
1. Logar como CUSTOMER
2. Acessar /[tenantSlug]/book
3. Selecionar serviço
4. Selecionar horário
5. Preencher custom fields
6. Confirmar
7. Esperado: cria appointment PUBLIC_LINK
```

## Admin/provider logado

```text id="9w2j7i"
1. Logar como Super Admin ou prestador
2. Acessar /[tenantSlug]/book
3. Esperado: não conseguir confirmar como cliente final
```

## Subscription enforcement

```text id="1t72p7"
1. Tenant vencido 8 a 15 dias
2. Página pode abrir
3. Criação deve ser bloqueada com mensagem genérica

4. Tenant vencido acima de 15 dias
5. Página pública indisponível com mensagem genérica
```

## Confirmação

```text id="ssytra"
1. Criar agendamento
2. Ver /[tenantSlug]/book/confirm
3. Ver ConfirmationStamp
4. Ver dados corretos
```

---

# Fora do escopo

Não implementar:

```text id="nbvn7x"
- customização visual por tenant
- upload de logo
- imagens/fotos do prestador
- domínio próprio
- pagamento
- cancelamento pelo cliente
- remarcação pelo cliente
- avaliações
- marketplace
- busca global de prestadores
- WhatsApp Cloud API
- animações complexas
- dark mode
```

---

# Critérios de aceite

* `/[tenantSlug]` redesenhada.
* `/[tenantSlug]/services` redesenhada.
* `/[tenantSlug]/book` redesenhada.
* `/[tenantSlug]/book/confirm` redesenhada.
* `public-unavailable` visualmente coerente.
* Nova identidade visual aplicada sem parecer dashboard admin.
* Botões principais usam verde escuro.
* Terracota usado apenas como acento controlado/carimbo.
* ConfirmationStamp usado na confirmação.
* Fluxo anônimo continua funcionando até escolha de serviço/horário.
* CUSTOMER precisa estar autenticado para confirmar.
* CUSTOMER com redirectTo continua funcionando.
* SUPER_ADMIN/USER não confirmam agendamento público.
* Appointment PUBLIC_LINK continua sendo criado corretamente.
* Custom fields continuam funcionando.
* Subscription enforcement continua funcionando.
* Mensagens públicas não revelam inadimplência.
* Mobile sem overflow horizontal.
* Documentação criada/atualizada.
* Nenhuma migration criada.
* Nenhuma regra de negócio alterada.
* Nenhum endpoint Typebot alterado.
* `pnpm typecheck`, `pnpm lint`, `pnpm test` e `pnpm build` passam.

---

# Instruções para o DeepSeek

Implemente somente a Phase 18 Public Booking Experience Redesign.

Antes de alterar código, leia:

```text id="fcybqr"
.ai/PROJECT_RULES.md
.ai/skills/frontend-design.md
diagnostico-frontend-2026-06-26.md
inventario-telas-2026-06-26.md
/docs/design/visual-identity.md
/docs/design/design-system-foundation.md
```

Redesenhe somente as rotas públicas:

```text id="zyt3r6"
/[tenantSlug]
/[tenantSlug]/services
/[tenantSlug]/book
/[tenantSlug]/book/confirm
```

Preserve integralmente:

```text id="j2lgop"
- tenantSlug
- isolamento multi-tenant
- subscription enforcement
- publicLinkEnabled
- customer auth
- redirectTo
- custom fields
- availability
- blocks
- conflicts
- bookingMode
- criação de appointment PUBLIC_LINK
```

Não implemente upload de logo, domínio próprio, pagamento, cancelamento, remarcação, marketplace, WhatsApp real, dark mode ou personalização visual por tenant.

Ao finalizar, informe:

```text id="sp9bq3"
- arquivos criados
- arquivos alterados
- telas redesenhadas
- regras preservadas
- validações executadas
- pendências conhecidas
```
