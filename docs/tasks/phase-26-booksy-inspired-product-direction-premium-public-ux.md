# Task - Phase 26 Booksy-Inspired Product Direction & Premium Public UX

## Objetivo

Reposicionar a direção de produto e experiência visual do AgendaZap usando o Booksy como principal benchmark conceitual.

O AgendaZap já possui MVP funcional, painel admin, painel do prestador, link público, Typebot API, portal do cliente, avaliações e uma camada visual revisada. Porém, a percepção atual ainda está aquém da régua desejada: algumas telas continuam com aparência genérica, excessivamente polida e com sensação de interface feita por IA/template.

A partir desta fase, a régua de produto e design deve subir.

O objetivo é alinhar o AgendaZap para ser:

```text id="qpe2jy"
Booksy-like, mas mais simples, WhatsApp-first e melhor adaptado ao prestador local brasileiro.
```

A experiência deve ser:

```text id="efn3b8"
- extremamente simples para o cliente final
- completa e operacional para o prestador
- visualmente agradável
- mobile-first
- fluida
- confiável
- menos genérica
- menos “dashboard SaaS padrão”
- menos “feito por IA”
```

Esta fase deve documentar a nova direção, revisar criticamente a experiência pública e aplicar uma nova rodada de redesign focada principalmente na parte que o cliente final vê.

---

# Contexto estratégico

O Booksy é a referência principal porque resolve uma dualidade importante:

```text id="f91ce6"
Cliente final:
quer encontrar, entender, agendar, acompanhar e avaliar com o mínimo de esforço.

Prestador:
quer controlar agenda, clientes, serviços, equipe, reputação, métricas e relacionamento.
```

O AgendaZap não deve copiar o Booksy diretamente. O objetivo é absorver princípios:

```text id="k57ahb"
- agendamento simples
- perfil público confiável
- conta do cliente clara
- histórico e recorrência
- avaliações como prova de confiança
- prestador com operação completa
- experiência mobile-first
```

Diferença estratégica do AgendaZap:

```text id="ip5z9r"
- foco inicial em link próprio do prestador, não marketplace
- WhatsApp como canal natural
- templates por segmento
- simplicidade para pequenos negócios
- preço e operação mais acessíveis
- suporte a segmentos além de beleza
```

---

# Dependências

Esta task depende da conclusão e validação das fases:

```text id="kegtkm"
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
/docs/tasks/phase-23-microcopy-empty-error-states.md
/docs/tasks/phase-24-accessibility-mobile-qa-pass.md
/docs/tasks/phase-25-public-experience-conversion-redesign.md
/docs/tasks/phase-26-customer-portal-appointment-history-reviews.md
```

Antes de implementar, leia obrigatoriamente:

```text id="v2klc7"
.ai/PROJECT_RULES.md
.ai/skills/frontend-design.md
docs/specs/00-visao-produto.md
docs/specs/01-usuarios-permissoes.md
docs/specs/02-admin-plataforma.md
docs/technical/auth-permissoes.md
docs/technical/padroes-codigo.md
docs/design/visual-identity.md
docs/design/design-system-foundation.md
docs/design/public-booking-experience.md
docs/design/public-experience-conversion-redesign.md
docs/design/customer-portal-experience.md
docs/design/microcopy-empty-error-states.md
README.md
```

---

# Escopo principal

Esta fase tem dois objetivos:

```text id="q078zb"
1. Documentar a nova direção Booksy-inspired do AgendaZap.
2. Aplicar uma nova rodada de UX/UI premium na experiência pública e cliente final.
```

Foco principal de redesign:

```text id="z5r5zj"
/[tenantSlug]
/[tenantSlug]/services
/[tenantSlug]/book
/[tenantSlug]/book/confirm
/cliente
/cliente/perfil
/cliente/agendamentos
/cliente/agendamentos/[id]
```

Refinar com cuidado:

```text id="on60tz"
src/features/public-booking/*
src/features/customer/*
src/components/ui/*
src/components/layout/*
```

---

# Princípios obrigatórios de design

## 1. Menos template, mais produto real

Evitar:

```text id="u36ied"
- cards brancos repetidos em excesso
- layout matemático demais
- hero genérico
- badges decorativas demais
- grids previsíveis demais
- blocos com mesma altura e mesmo peso
- estética de dashboard SaaS
- cara de página montada por IA
```

Aplicar:

```text id="rzkl0q"
- ritmo visual
- contraste entre seções
- hierarquia editorial
- blocos com propósito claro
- espaçamento mais natural
- CTAs mais fortes
- microinterações sutis
- transições suaves
- mobile-first real
```

## 2. Cliente final não deve perceber complexidade

A experiência do cliente deve seguir:

```text id="m138j7"
abrir link → entender prestador → escolher serviço → escolher horário → confirmar → acompanhar depois
```

Não expor:

```text id="pdiiab"
- tenant
- subscription
- Typebot
- bookingMode
- priceType
- origin
- status técnico
- IDs internos
```

## 3. O perfil público deve parecer vitrine do prestador

O link público deve parecer:

```text id="qpiij8"
perfil comercial confiável de um negócio local
```

E não:

```text id="xn806h"
renderização de registros de banco de dados
```

## 4. Mobile-first

O público principal acessará pelo celular.

Obrigatório:

```text id="v80i6x"
- CTA visível rápido
- cards tocáveis
- navegação simples
- header limpo
- fluxo sem esforço
- sem overflow
- sem menus complexos desnecessários
```

## 5. Smooth, mas sem exagero

Aplicar fluidez visual com moderação:

```text id="sjvwfn"
- hover suave
- focus claro
- transições curtas
- feedback visual em botões
- alteração de estado sem tranco visual
```

Não implementar animações pesadas, dependências novas ou motion complexa.

---

# Nova direção de produto

Criar documentação:

```text id="jz6eq7"
/docs/product/booksy-inspired-direction.md
```

Este documento deve conter:

```text id="q38jci"
- o que o AgendaZap absorve do Booksy
- o que o AgendaZap não vai copiar agora
- posicionamento do AgendaZap
- diferença entre SaaS próprio e marketplace
- visão para cliente final
- visão para prestador
- visão para admin
- próximos módulos futuros
```

## Posicionamento recomendado

```text id="x0p39x"
AgendaZap é uma plataforma de agendamento e relacionamento para prestadores locais que atendem por horário, com link público simples para o cliente e painel completo para o negócio.
```

## Diferenciação

```text id="d983b3"
AgendaZap não será marketplace no início.
AgendaZap será primeiro a agenda online própria do prestador.
AgendaZap será WhatsApp-first.
AgendaZap será mais simples que plataformas grandes.
AgendaZap será adaptado ao pequeno prestador brasileiro.
```

---

# Roadmap Booksy-inspired

Criar documentação:

```text id="b8gdwp"
/docs/product/booksy-inspired-roadmap.md
```

Organizar próximos módulos em ordem sugerida:

```text id="x84n1k"
1. Customer portal descobrível no link público
2. Rebooking / agendar novamente
3. Avaliações públicas no perfil do prestador
4. Calendário visual do prestador
5. Profissionais/equipe
6. Portfólio/fotos do trabalho
7. Ferramentas de divulgação WhatsApp
8. QR Code do link público
9. Relatórios de conversão e recorrência
10. Pagamento/sinal online
11. Marketplace/diretório, somente se fizer sentido no futuro
```

---

# 1. Public header com conta do cliente

Garantir que o link público tenha entrada clara para conta do cliente.

Rotas:

```text id="jhf5gq"
/[tenantSlug]
/[tenantSlug]/services
/[tenantSlug]/book
/[tenantSlug]/book/confirm
```

## Visitante anônimo

Mostrar:

```text id="witmb9"
Entrar
```

ou:

```text id="k59dhm"
Minha conta
```

Link:

```text id="yj2fke"
/login?redirectTo=/cliente
```

No fluxo de booking, preservar redirectTo para voltar ao booking quando apropriado.

## CUSTOMER logado

Mostrar:

```text id="limsb2"
Meus agendamentos
```

ou:

```text id="gy7a2u"
Minha conta
```

Link:

```text id="rk7o69"
/cliente
```

ou:

```text id="jnk7cc"
/cliente/agendamentos
```

## USER/SUPER_ADMIN logado

Não tratar como cliente final.

Regras:

```text id="aeetb3"
- não mostrar “Meus agendamentos” para admin/prestador
- não redirecionar admin/prestador para /cliente
- manter bloqueio quando tentarem confirmar como cliente
```

---

# 2. Redesign premium da home pública

Rota:

```text id="ojyukd"
/[tenantSlug]
```

## Objetivo

Transformar a home pública em uma vitrine bonita, simples e confiável.

## Estrutura recomendada

```text id="jipli7"
1. Header público com conta
2. Hero forte e compacto
3. Bloco de confiança/funcionamento
4. Serviços em destaque
5. Todos os serviços por categoria
6. Avaliações/resumo, se já houver dados e for seguro exibir
7. Footer público contextual
```

## Hero

Deve responder rapidamente:

```text id="pbps2q"
- que negócio é esse?
- o que ele atende?
- onde fica?
- como agendar?
- posso confiar?
```

Usar dados reais:

```text id="ocwwxt"
tenant.name
tenant.description
tenant.segment
tenant.city
tenant.state
tenant.whatsapp
services ativos
reviews se já existirem
```

Não inventar:

```text id="h4hbqe"
- número de clientes
- nota média se não houver avaliação
- tempo de mercado
- avaliações fictícias
- promessa de atendimento garantido
```

---

# 3. Avaliações no perfil público

Se a Phase 26 já criou reviews, implementar exibição pública com cuidado.

## Regras

Exibir somente:

```text id="pd65gx"
- avaliações de appointments FINISHED
- avaliações com rating válido
- avaliações do próprio tenant
```

Exibir:

```text id="ufd5ag"
- média geral
- quantidade de avaliações
- comentários recentes, se existirem
```

Não exibir:

```text id="gzummf"
- dados sensíveis do cliente
- e-mail
- telefone
- internal notes
- appointment ID
```

Nome do cliente:

```text id="rbxgfh"
- exibir primeiro nome + inicial, ou apenas iniciais
- exemplo: Matheus F.
```

Se não houver avaliações:

```text id="x03wsx"
- não mostrar seção grande vazia
- ou mostrar mensagem discreta: “As avaliações aparecerão aqui após atendimentos finalizados.”
```

## Importante

Se a publicação de avaliações exigir decisão de privacidade ainda não implementada, documentar como pendência e não exibir comentários públicos nesta fase. Nesse caso, pode exibir apenas média agregada interna ou não exibir nada.

---

# 4. Customer portal mais descobrível e bonito

Rotas:

```text id="xsffh2"
/cliente
/cliente/perfil
/cliente/agendamentos
/cliente/agendamentos/[id]
```

## Objetivo

O portal do cliente deve parecer continuação natural da experiência pública, não painel administrativo.

Aplicar:

```text id="nzj0dr"
- header simples
- navegação mínima
- cards limpos
- foco em próximos agendamentos
- histórico claro
- botão “Agendar novamente”, se possível sem quebrar regras
```

## Visual

```text id="u5v4vi"
- mais leve que painel do prestador
- sem sidebar
- mobile-first
- avatar/iniciais
- cartões de agendamento bonitos
- status com linguagem humana
```

---

# 5. Rebooking / Agendar novamente

Implementar se for simples e seguro.

## Objetivo

Permitir que o cliente repita um serviço já realizado.

No detalhe de um agendamento finalizado ou histórico:

```text id="je3rn1"
Agendar novamente
```

Deve levar para:

```text id="ybi8v6"
/[tenantSlug]/book?serviceId=<serviceId>
```

## Regras

```text id="zzj8o1"
- só exibir se service ainda estiver ativo
- só exibir se category ativa
- respeitar tenant ativo e assinatura
- não criar agendamento automaticamente
- apenas levar para escolha de horário
```

Se o serviço não estiver mais disponível:

```text id="m1jcwz"
Este serviço não está disponível para novo agendamento no momento.
```

---

# 6. Cards de serviço menos genéricos

Revisar:

```text id="dr9f9l"
src/features/public-booking/service-card.tsx
```

Objetivo:

```text id="sv8nw0"
menos card SaaS
mais card de decisão de serviço
```

Aplicar:

```text id="w0p87d"
- CTA contextual
- metadados bem organizados
- badge integrada
- descrição mais legível
- hover/focus suave
- menos sensação de card repetido
```

CTA sugerido:

```text id="e45ox6"
DIRECT = Escolher horário
REQUIRES_CONFIRMATION = Solicitar horário
INFORMATIONAL = Ver detalhes
```

Preservar regra funcional.

---

# 7. Booking flow mais fluido

Rota:

```text id="ofdj3j"
/[tenantSlug]/book
```

Refinar:

```text id="buu1dy"
- escolha de serviço
- escolha de horário
- auth gate
- confirmação
```

Objetivo:

```text id="y1y0vu"
o cliente deve sentir que está avançando naturalmente, não preenchendo um sistema.
```

Melhorias permitidas:

```text id="jc4dj6"
- stepper mais leve
- resumo do serviço selecionado mais bonito
- slots como botões mais agradáveis
- login gate mais claro
- CTA final mais contextual
```

Não alterar regras.

---

# 8. Visual smooth

Aplicar microinterações leves:

```text id="uap4y1"
- transition-colors
- transition-shadow
- hover de cards
- active/focus states
- botões com feedback claro
```

Não adicionar dependência de animação.

Não implementar framer-motion nesta fase.

---

# 9. Design review obrigatório antes de codar muito

Antes de alterar muitos arquivos, o Codex deve fazer uma etapa curta de diagnóstico.

Entregar no próprio output:

```text id="wpjbbq"
- quais telas públicas parecem genéricas hoje
- quais componentes causam sensação de IA/template
- plano de redesign visual em 5 a 8 bullets
- arquivos que serão alterados
```

Depois implementar.

---

# 10. Documentação de design

Criar:

```text id="rjh664"
/docs/design/booksy-inspired-public-ux.md
```

Documentar:

```text id="a3md34"
- nova direção visual
- princípios de simplicidade para cliente
- diferenças em relação ao Booksy
- decisões de hero
- decisões de cards
- decisão sobre avaliações públicas
- decisão sobre rebooking
- limitações conhecidas
```

Atualizar:

```text id="l74lal"
README.md
/docs/design/public-experience-conversion-redesign.md
/docs/design/customer-portal-experience.md
```

---

# 11. Segurança e privacidade

Preservar:

```text id="rw6l61"
- CUSTOMER só vê próprios agendamentos
- prestador só vê reviews do próprio tenant
- público não vê dados sensíveis de cliente
- público não vê dados administrativos do tenant
- não expor assinatura/plano/status interno
- não expor internalNotes
```

Avaliações públicas:

```text id="q6y1v5"
- se exibir comentário, mascarar nome do cliente
- não exibir telefone/e-mail
- não exibir dados do agendamento
```

---

# 12. Responsividade

Validar:

```text id="sindb2"
320px
375px
430px
768px
1024px
1440px
```

Obrigatório:

```text id="ounnva"
- hero não ocupa tela inteira no mobile
- CTA aparece rápido
- header público não quebra
- conta do cliente acessível no mobile
- cards sem overflow
- portal do cliente sem sensação de admin
- booking continua usável no celular
```

---

# 13. Acessibilidade

Obrigatório:

```text id="zzeabz"
- foco visível
- botões com texto claro
- cards clicáveis acessíveis por teclado
- imagens/avatar com alt adequado ou decorativo
- ícones decorativos com aria-hidden
- headings coerentes
- status não dependem só de cor
```

---

# 14. Testes

Rodar:

```bash id="h6vxq2"
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

Ajustar testes se textos ou rotas forem afetados.

---

# 15. Validação funcional obrigatória

## Link público

```text id="nx07pu"
1. Visitante anônimo acessa /[tenantSlug].
2. Vê opção Entrar/Minha conta.
3. Clica e vai para /login?redirectTo=/cliente.
4. CUSTOMER logado acessa /[tenantSlug].
5. Vê Meus agendamentos/Minha conta.
6. Clica e acessa /cliente.
7. USER/SUPER_ADMIN não aparecem como cliente final.
```

## Booking

```text id="srnhb6"
1. Visitante escolhe serviço e horário.
2. Visitante precisa logar para confirmar.
3. CUSTOMER confirma agendamento.
4. Appointment PUBLIC_LINK continua correto.
5. Serviço inativo não aparece.
6. Tenant bloqueado não revela motivo interno.
```

## Portal cliente

```text id="eo2mtm"
1. CUSTOMER acessa /cliente.
2. Vê próximos agendamentos.
3. Vê histórico.
4. Abre detalhe.
5. Usa Agendar novamente se disponível.
6. Não vê dados de outro cliente.
```

## Avaliações

```text id="alebna"
1. Review de appointment FINISHED continua funcionando.
2. Review não vaza dados sensíveis.
3. Se avaliação pública for exibida, nome do cliente é mascarado.
4. Prestador continua vendo avaliação no detalhe do appointment.
```

## Visual

```text id="nj25xp"
1. Página pública parece menos template/IA.
2. Hero parece vitrine de negócio local.
3. Cards de serviço têm ritmo e CTA melhores.
4. Mobile 375px sem overflow.
5. Botões principais verdes.
6. Terracota apenas como acento.
```

---

# Fora do escopo

Não implementar:

```text id="vhg94a"
- marketplace
- busca global de prestadores
- pagamento
- notificações
- WhatsApp Cloud API
- app nativo
- PWA
- equipe/profissionais
- portfólio/fotos
- upload de capa/logo
- tema por tenant
- calendário visual
- remarcação/cancelamento pelo cliente
- resposta do prestador à review
- moderação avançada
- nova política de privacidade
- alterações Prisma, salvo se estritamente necessário e justificado
- migrations, salvo se estritamente necessário e justificado
```

---

# Critérios de aceite

* Direção Booksy-inspired documentada.
* Roadmap Booksy-inspired documentado.
* Link público possui entrada clara para conta do cliente.
* CUSTOMER logado acessa portal a partir do link público.
* Visitante anônimo consegue entrar a partir do link público.
* Home pública parece mais humana, bonita e menos genérica.
* Serviços têm cards mais agradáveis e CTAs melhores.
* Portal do cliente parece extensão da experiência pública, não admin.
* Rebooking existe se for seguro e simples.
* Avaliações públicas são tratadas com privacidade ou documentadas como pendência.
* Booking público continua funcionando.
* Typebot API continua funcionando.
* Nenhuma regra de negócio crítica alterada.
* Mobile sem overflow.
* Acessibilidade básica preservada.
* `pnpm typecheck`, `pnpm lint`, `pnpm test` e `pnpm build` passam.

---

# Instruções para o Codex

Implemente somente a Phase 27 Booksy-Inspired Product Direction & Premium Public UX.

Antes de alterar código, leia:

```text id="q6yq26"
.ai/PROJECT_RULES.md
.ai/skills/frontend-design.md
docs/specs/00-visao-produto.md
docs/specs/01-usuarios-permissoes.md
docs/specs/02-admin-plataforma.md
docs/technical/auth-permissoes.md
docs/technical/padroes-codigo.md
docs/design/visual-identity.md
docs/design/design-system-foundation.md
docs/design/public-booking-experience.md
docs/design/public-experience-conversion-redesign.md
docs/design/customer-portal-experience.md
docs/design/microcopy-empty-error-states.md
README.md
```

Atenção:
A prioridade desta fase é design e experiência. O resultado atual ainda parece polido demais e genérico. A nova experiência pública precisa parecer agradável, fluida, humana, mobile-first e menos “feito por IA”.

Antes de implementar, faça uma análise curta no output:

* quais telas públicas parecem genéricas hoje
* quais componentes causam sensação de IA/template
* plano de redesign visual em 5 a 8 bullets
* arquivos que serão alterados

Depois implemente.

Foco principal:

* /[tenantSlug]
* /[tenantSlug]/services
* /[tenantSlug]/book
* /[tenantSlug]/book/confirm
* /cliente
* /cliente/perfil
* /cliente/agendamentos
* /cliente/agendamentos/[id]

Aplicar:

* direção Booksy-inspired
* cliente final simples
* prestador com percepção profissional
* public header com Entrar/Minha conta/Meus agendamentos
* portal do cliente descobrível a partir do link público
* hero público mais bonito e convincente
* cards de serviço menos genéricos
* CTAs mais contextuais
* rebooking se simples e seguro
* avaliação pública apenas se privacidade estiver segura
* microinterações leves com CSS
* mobile-first real

Preservar:

* auth
* roles
* permissions
* tenant isolation
* CUSTOMER auth
* public booking
* redirectTo
* subscription enforcement
* availability
* blocks
* conflicts
* appointment status machine
* Typebot API
* provider/admin flows

Não implementar:

* marketplace
* busca global
* pagamento
* notificações
* WhatsApp Cloud API
* app nativo
* PWA
* equipe/profissionais
* portfólio/fotos
* upload de capa/logo
* tema por tenant
* calendário visual
* remarcação/cancelamento pelo cliente
* resposta do prestador à review
* moderação avançada

Ao finalizar, informe:

* análise inicial feita
* arquivos criados
* arquivos alterados
* telas redesenhadas
* decisões de design
* regras preservadas
* validações executadas
* pendências conhecidas

```
```
