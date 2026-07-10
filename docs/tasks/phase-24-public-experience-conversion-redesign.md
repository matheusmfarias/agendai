# Task - Phase 24 Public Experience Conversion Redesign

## Objetivo

Redesenhar novamente a experiência pública do AgendaZap com foco em conversão, confiança e percepção de negócio real.

As fases anteriores deixaram o link público funcional, responsivo, acessível e visualmente limpo. Porém, a experiência ainda está com aparência excessivamente genérica e “polida demais”, parecendo um template SaaS ou uma interface feita por IA.

Esta fase deve transformar o link público de uma simples listagem de serviços em uma pequena vitrine de agendamento local, capaz de transmitir:

```text
- confiança
- clareza
- personalidade do negócio
- orientação para escolha do serviço
- sensação de atendimento real
- facilidade para agendar
```

A página pública é a superfície que o cliente final vê. Ela precisa vender a confiança do prestador e a praticidade do agendamento.

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
/docs/tasks/phase-23-microcopy-empty-error-states.md
/docs/tasks/phase-24-accessibility-mobile-qa-pass.md
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
/docs/design/microcopy-empty-error-states.md
/docs/design/accessibility-mobile-qa.md
/docs/specs/00-visao-produto.md
/docs/technical/subscription-enforcement.md
/docs/technical/padroes-codigo.md
README.md
```

---

# Escopo

Redesenhar com profundidade a experiência pública:

```text
/[tenantSlug]
/[tenantSlug]/services
```

Refinar com cuidado, se necessário:

```text
/[tenantSlug]/book
/[tenantSlug]/book/confirm
src/features/public-booking/*
```

Esta fase deve focar principalmente em:

```text
- hero público
- descoberta de serviços
- categorias
- cards de serviço
- CTAs
- blocos de confiança
- como funciona
- footer público
- ritmo visual da página
```

---

# Fora do escopo funcional

Não implementar:

```text
- upload de logo
- upload de foto/capa
- tema por tenant
- cor personalizada por tenant
- avaliações
- depoimentos reais
- mapa
- pagamento
- domínio próprio
- cancelamento pelo cliente
- remarcação pelo cliente
- WhatsApp Cloud API
- notificações
- novo cadastro de prestador
- marketplace
- busca global
```

Se precisar simular elementos visuais, usar apenas dados reais existentes ou textos genéricos seguros. Não inventar avaliações, número de clientes, nota, tempo de mercado ou promessas não cadastradas.

---

# Regras críticas

Preservar integralmente:

```text
- tenantSlug
- isolamento multi-tenant
- publicLinkEnabled
- subscription enforcement
- bloqueios públicos genéricos
- CUSTOMER auth
- redirectTo
- disponibilidade
- bloqueios
- conflitos
- custom fields
- bookingMode
- priceType
- criação de appointment PUBLIC_LINK
- createdByUserId = null no fluxo público
- Typebot API
```

Não alterar:

```text
- Prisma schema
- migrations
- endpoints
- server actions de negócio
- política de assinatura
- máquina de status
- auth
- roles
- cookies
- payloads
```

Esta fase é de UX/UI e apresentação. Não mudar regra funcional.

---

# Problema atual

A experiência pública atual está funcional, limpa e responsiva, mas ainda passa uma sensação genérica.

Problemas observados:

```text
- layout muito matemático e previsível
- hero grande, mas pouco persuasivo
- página parece renderização de cadastro, não vitrine de negócio
- cards de serviço repetitivos
- categorias frias e muito parecidas
- ausência de bloco "como funciona"
- pouca orientação para cliente escolher serviço
- pouca sensação de negócio local real
- pouca diferenciação por segmento
- footer/assinatura pública pouco contextual
- ritmo visual plano
```

O link público precisa deixar de parecer:

```text
catálogo SaaS genérico
```

E passar a parecer:

```text
vitrine confiável de um negócio local que aceita agendamento online
```

---

# Direção visual

Manter a identidade do AgendaZap:

```text
Agenda física elevada a digital
```

Mas aplicar de forma menos “sistema” e mais “serviço local”.

A página deve transmitir:

```text
- confiança
- proximidade
- clareza
- praticidade
- organização
- atendimento real
```

Evitar:

```text
- visual corporativo demais
- landing page SaaS genérica
- hero vazio
- cards perfeitamente repetidos sem ritmo
- excesso de bordas iguais
- fake dashboard
- fake reviews
- ícones decorativos em excesso
- promessas não suportadas por dados reais
```

---

# 1. Nova estrutura da home pública `/[tenantSlug]`

A rota `/[tenantSlug]` deve virar uma página curta de conversão, não uma listagem plana.

## Estrutura recomendada

```text
1. Hero de confiança
2. Como funciona
3. Serviços mais procurados / serviços em destaque
4. Todos os serviços por categoria
5. Bloco de contato/rodapé público
```

## Regras

* Usar apenas dados reais do tenant e serviços.
* Se não houver descrição do tenant, usar microcopy genérica segura.
* Se não houver WhatsApp, não exibir bloco de WhatsApp.
* Se não houver cidade/UF, não forçar.
* Se houver poucos serviços, adaptar layout sem parecer vazio.
* Se houver muitos serviços, priorizar descoberta e escaneabilidade.

---

# 2. Hero de confiança

O hero atual deve ser substituído por um bloco mais humano e persuasivo.

## Conteúdo mínimo

```text
- nome do negócio
- segmento/cidade quando disponível
- descrição curta
- CTA principal
- CTA secundário
- informações rápidas de confiança
```

## Exemplo de estrutura

```text
Mecânica Wcar

Agende serviços automotivos com horário marcado e acompanhamento pelo canal de atendimento.

Panambi/RS
Atendimento por WhatsApp
Serviços com confirmação online

[Agendar um serviço] [Ver serviços]
```

## CTA principal

Trocar:

```text
Agendar horário
```

Por:

```text
Agendar um serviço
```

ou:

```text
Escolher serviço
```

## CTA secundário

Usar conforme dados disponíveis:

```text
Ver serviços
Falar no WhatsApp
```

Se houver WhatsApp válido, o CTA secundário pode abrir link de WhatsApp. Se não houver função existente, manter apenas como informação ou link seguro.

## Visual

O hero deve ter mais personalidade:

```text
- título com Lora
- layout menos vazio
- card lateral ou bloco de informações
- fundo off-white com superfície branca
- verde escuro como base de confiança
- terracota apenas como detalhe pequeno
- badge/etiquetas com aparência menos genérica
```

## Evitar

```text
- caixa enorme com pouco conteúdo
- hero que parece formulário de cadastro
- centralização excessiva
- excesso de badges pequenas sem contexto
```

---

# 3. Bloco “Como funciona”

Adicionar um bloco simples para reduzir insegurança do cliente.

## Conteúdo sugerido

```text
Como funciona

1. Escolha o serviço
Veja os atendimentos disponíveis e selecione o que você precisa.

2. Escolha um horário
O sistema mostra opções conforme a agenda do estabelecimento.

3. Confirme seus dados
Entre ou crie sua conta para finalizar o agendamento.

4. Acompanhe a confirmação
Alguns serviços são confirmados na hora. Outros aguardam análise do estabelecimento.
```

## Regras

* Não prometer notificação automática por WhatsApp se não existir.
* Não dizer que todos os serviços são confirmados automaticamente.
* Não dizer que pagamento é feito pelo sistema.
* Não mencionar Typebot para cliente final.
* Manter curto.

## Visual

```text
- usar 3 ou 4 passos
- pode ser uma faixa horizontal no desktop
- cards compactos no mobile
- usar numeração/etiqueta discreta
- não parecer tutorial longo
```

---

# 4. Serviços mais procurados / destaques

Antes de listar todas as categorias, criar uma seção de destaque.

## Objetivo

Ajudar o cliente a escolher mais rápido.

## Regra de seleção

Como ainda não há métrica real de popularidade, selecionar de forma segura:

```text
- primeiros serviços ativos por order
- limitar a 3 ou 4 serviços
- respeitar categoria ativa
- não inventar "mais procurado" se não houver dado real
```

Por isso, o título deve ser:

```text
Serviços em destaque
```

E não:

```text
Mais procurados
```

a menos que exista métrica real.

## Layout

```text
- 3 ou 4 cards mais fortes
- cards podem ter tratamento visual diferente dos cards comuns
- CTA claro: Agendar este serviço
```

## Regras

* Não duplicar confusamente com a lista completa.
* Se houver poucos serviços, esta seção pode ser omitida.
* Se houver apenas 1 ou 2 serviços, mostrar como “Serviços disponíveis”.

---

# 5. Todos os serviços por categoria

A lista por categoria deve continuar, mas com ritmo melhor.

## Melhorias

```text
- categorias com título mais humano
- subtítulo da categoria quando houver descrição
- divisores mais elegantes
- grid menos monótono
- cards com hierarquia melhor
- CTA por card mais contextual
```

## Categoria

Em vez de categoria parecer só um rótulo técnico em caixa alta, usar estrutura:

```text
Diagnóstico
Avaliações para entender o problema antes do reparo.
```

Se a categoria não tiver descrição:

```text
Diagnóstico
```

## Cards de serviço

Cada card deve mostrar:

```text
- nome
- descrição curta
- duração
- preço
- modo de agendamento
- CTA
```

Opcionalmente, se couber:

```text
- “Ideal para...” usando descrição existente, sem inventar dados
```

Não gerar texto falso com IA no runtime.

---

# 6. Melhorar cards de serviço

Os cards atuais estão corretos, mas repetitivos.

## Objetivo

Deixar o card mais próximo de uma decisão de compra/agendamento.

## CTA por bookingMode

Se possível, variar o CTA:

```text
DIRECT = Escolher horário
REQUIRES_CONFIRMATION = Solicitar agendamento
INFORMATIONAL = Ver detalhes
```

Se isso aumentar escopo, usar padrão:

```text
Agendar este serviço
```

## Labels de bookingMode

Revisar labels públicos:

```text
DIRECT = Confirma na hora
REQUIRES_CONFIRMATION = Aguarda confirmação
INFORMATIONAL = Atendimento sob consulta
```

ou manter os labels atuais se forem mais consistentes, mas evitar parecer enum técnico.

## Visual

```text
- badge menor e mais integrada
- preço/duração em área de metadados
- botão menos grudado no rodapé
- hover/focus acessível
- card não deve parecer tabela dentro de card
```

---

# 7. Página `/[tenantSlug]/services`

A rota de todos os serviços deve ser refinada para funcionar como catálogo completo.

## Estrutura recomendada

```text
- header compacto do negócio
- CTA para voltar/agendar
- intro curta
- todos os serviços por categoria
- footer público
```

## Regras

* Não repetir hero enorme da home.
* Não criar outra landing completa.
* Deve ser uma página de navegação mais direta.
* Deve manter os mesmos componentes de serviço da home quando possível.

---

# 8. Booking flow `/[tenantSlug]/book`

Refinar apenas o necessário para manter coerência com a nova experiência.

## Melhorias permitidas

```text
- título mais contextual
- resumo do serviço selecionado mais forte
- stepper menos genérico, se necessário
- CTA final alinhado com bookingMode
- mensagens de auth claras
```

## Não fazer

```text
- reescrever lógica de booking
- criar várias páginas novas
- alterar payload
- alterar slots
- alterar auth CUSTOMER
```

---

# 9. Confirmação `/[tenantSlug]/book/confirm`

Refinar apenas se necessário.

## Objetivo

A confirmação deve parecer o fechamento natural da experiência pública.

## Garantir

```text
- ConfirmationStamp usado com moderação
- resumo do agendamento claro
- próximo passo claro
- botão para voltar ao prestador ou ver serviços
```

Não prometer notificação inexistente.

---

# 10. Footer público

Adicionar ou melhorar rodapé público.

## Conteúdo

```text
- nome do negócio
- cidade/UF quando disponível
- WhatsApp quando disponível
- link para serviços/agendamento
- assinatura discreta: Agendamento online via AgendaZap
```

## Regras

* Não colocar logo flutuante isolado no canto sem contexto.
* Se existir marca/monograma solto no canto inferior esquerdo, remover ou transformar em footer contextual.
* Não deixar elemento flutuante parecendo extensão/debug/widget.

````

O rodapé deve parecer parte da página, não uma marca aleatória flutuante.

---

# 11. Remover sensação de template/IA

Aplicar estes ajustes de direção:

```text
- variar ritmo entre hero, passos, destaque e lista
- reduzir repetição de cards idênticos
- usar texto mais humano
- criar blocos com propósito claro
- usar menos “caixa branca em fundo off-white” repetidamente
- adicionar contexto de negócio local
- dar mais peso ao CTA principal
- evitar decoração sem função
````

Não confundir isso com adicionar enfeites. A página deve ficar mais humana, não mais poluída.

---

# 12. Segmento e conteúdo contextual

Usar dados já existentes:

```text
- tenant.segment
- tenant.description
- tenant.city
- tenant.state
- tenant.whatsapp
- service categories
- service descriptions
```

## Regras

* Não gerar textos por segmento automaticamente se isso puder inventar promessa.
* Pode usar microcopy genérica segura baseada no segmento.
* Exemplo seguro:

  * “Serviços disponíveis para agendamento online.”
  * “Escolha um atendimento e veja os horários disponíveis.”
* Evitar:

  * “A melhor oficina da região”
  * “Atendimento garantido”
  * “Mais de 500 clientes”

````

---

# 13. Responsividade

Validar em:

```text
320px
375px
430px
768px
1024px
1440px
````

## Regras

* Hero não pode ocupar tela inteira no mobile.
* CTA principal deve aparecer rapidamente.
* Cards de destaque devem empilhar bem.
* “Como funciona” deve ficar legível.
* Serviços por categoria não podem gerar overflow.
* Botões devem ter área de toque adequada.
* Footer deve ficar compacto.

---

# 14. Acessibilidade

Obrigatório:

```text
- foco visível
- cards clicáveis acessíveis por teclado
- botões com texto claro
- headings em hierarquia lógica
- ícones decorativos com aria-hidden
- textos de status não dependem só de cor
- contraste adequado
```

Não passar ícones React de Server Component para Client Component. Se necessário, usar strings serializáveis e mapear no client.

---

# 15. Documentação

Criar:

```text
/docs/design/public-experience-conversion-redesign.md
```

Atualizar:

```text
/docs/design/public-booking-experience.md
/docs/design/design-system-foundation.md
README.md
```

Documentar:

```text
- problemas encontrados
- nova estrutura da página pública
- decisões de hero
- seção como funciona
- serviços em destaque
- todos os serviços
- footer público
- regras preservadas
- limitações
```

---

# 16. Testes

Rodar:

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

Ajustar testes se necessário.

Não criar testes pesados se for mudança visual, mas os testes existentes devem continuar passando.

---

# 17. Validação funcional obrigatória

## Home pública

```text
1. Acessar /[tenantSlug]
2. Ver hero com informações reais do prestador
3. Ver CTA principal
4. Ver bloco Como funciona
5. Ver serviços em destaque, se houver serviços suficientes
6. Ver todos os serviços por categoria
7. Ver footer público
8. Clicar em Agendar um serviço
```

## Página de serviços

```text
1. Acessar /[tenantSlug]/services
2. Ver header compacto
3. Ver todos os serviços ativos por categoria
4. Clicar em Agendar este serviço
```

## Booking

```text
1. Acessar /[tenantSlug]/book
2. Selecionar serviço
3. Selecionar horário
4. Visitante anônimo vê auth gate
5. CUSTOMER consegue confirmar
6. Appointment PUBLIC_LINK é criado
```

## Estados

```text
1. Tenant sem link público habilitado mostra indisponível genérico
2. Tenant vencido bloqueado mostra indisponível genérico
3. Serviço informativo não cria agendamento direto se essa já for a regra atual
4. Serviço inativo não aparece
5. Categoria inativa não aparece
```

## Segurança

```text
1. Não exibe dados internos de assinatura
2. Não exibe plano do tenant para cliente final
3. Não exibe IDs internos
4. Não revela motivo administrativo de bloqueio público
```

---

# Fora do escopo

Não implementar:

```text
- upload de logo
- imagens/capa
- personalização por tenant
- avaliações
- depoimentos
- mapa
- pagamento
- notificações
- WhatsApp Cloud API
- cancelamento pelo cliente
- remarcação pelo cliente
- marketplace
- domínio próprio
- alterações Prisma
- migrations
- novos endpoints
```

---

# Critérios de aceite

* `/[tenantSlug]` deixa de parecer listagem genérica.
* Hero público transmite melhor confiança e contexto.
* Página apresenta melhor o negócio local.
* Existe bloco “Como funciona”.
* Existe seção de serviços em destaque quando fizer sentido.
* Todos os serviços continuam disponíveis por categoria.
* Cards de serviço têm melhor hierarquia e CTA.
* Footer público contextual substitui qualquer marca flutuante estranha.
* `/[tenantSlug]/services` fica mais clara e consistente.
* Booking flow continua funcionando.
* Link público indisponível continua genérico e seguro.
* Botões principais continuam verdes.
* Terracota continua acento controlado.
* Mobile sem overflow.
* Acessibilidade básica preservada.
* Nenhuma regra de negócio alterada.
* Nenhuma migration criada.
* Typebot API preservada.
* Subscription enforcement preservado.
* Documentação criada/atualizada.
* `pnpm typecheck`, `pnpm lint`, `pnpm test` e `pnpm build` passam.

---

# Instruções para o DeepSeek

Implemente somente a Phase 25 Public Experience Conversion Redesign.

Antes de alterar código, leia:

```text
.ai/PROJECT_RULES.md
.ai/skills/frontend-design.md
diagnostico-frontend-2026-06-26.md
inventario-telas-2026-06-26.md
/docs/design/visual-identity.md
/docs/design/design-system-foundation.md
/docs/design/public-booking-experience.md
/docs/design/microcopy-empty-error-states.md
/docs/design/accessibility-mobile-qa.md
```

Foco principal:

```text
/[tenantSlug]
/[tenantSlug]/services
```

Refinar apenas se necessário:

```text
/[tenantSlug]/book
/[tenantSlug]/book/confirm
```

Objetivo:
Transformar a página pública de uma listagem genérica em uma vitrine confiável de negócio local com foco em conversão.

Aplicar:

```text
- hero mais humano e persuasivo
- bloco Como funciona
- serviços em destaque
- todos os serviços por categoria
- cards de serviço menos genéricos
- CTAs mais contextuais
- footer público contextual
- menos sensação de template/IA
- mais ritmo visual e contexto de negócio local
```

Preservar:

```text
- tenantSlug
- isolamento multi-tenant
- publicLinkEnabled
- subscription enforcement
- CUSTOMER auth
- redirectTo
- disponibilidade
- bloqueios
- conflitos
- custom fields
- bookingMode
- priceType
- criação de appointment PUBLIC_LINK
- Typebot API
```

Não implementar:

```text
- upload de logo
- imagens/capa
- personalização por tenant
- avaliações
- depoimentos
- mapa
- pagamento
- notificações
- WhatsApp Cloud API
- cancelamento pelo cliente
- remarcação pelo cliente
- marketplace
- domínio próprio
- alterações Prisma
- migrations
- novos endpoints
```

Ao finalizar, informe:

```text
- arquivos criados
- arquivos alterados
- telas redesenhadas
- componentes criados/ajustados
- decisões de UX
- regras preservadas
- validações executadas
- pendências conhecidas
```
