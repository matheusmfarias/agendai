# Task - Phase 22 Provider Operations UX

## Objetivo

Melhorar a experiência operacional do prestador dentro do painel do AgendaZap.

As fases anteriores elevaram a identidade visual, login, link público, dashboard do prestador, listagens responsivas e admin. Agora o foco deve ir para as telas que o prestador usa para operar o negócio no dia a dia.

Esta fase deve deixar mais claros e fluídos os fluxos de:

```text
- serviços
- categorias
- clientes
- agendamentos
- horários de atendimento
- bloqueios de agenda
- configurações do negócio
```

O objetivo é reduzir a sensação de CRUD técnico e transformar essas telas em rotinas guiadas de operação.

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
/docs/technical/provider-onboarding.md
/docs/technical/subscription-enforcement.md
/docs/technical/padroes-codigo.md
README.md
```

---

# Escopo

Refinar UX e apresentação das telas do prestador:

```text
/app/settings
/app/services
/app/services/new
/app/services/[id]
/app/services/[id]/edit
/app/services/categories
/app/services/categories/new
/app/services/categories/[id]/edit
/app/customers
/app/customers/new
/app/customers/[id]
/app/customers/[id]/edit
/app/appointments
/app/appointments/new
/app/appointments/[id]
/app/appointments/[id]/edit
/app/availability
/app/availability/blocks
```

Esta fase pode ajustar componentes em:

```text
src/features/services/...
src/features/customers/...
src/features/appointments/...
src/features/availability/...
src/features/settings/...
src/components/forms/...
```

Se necessário, criar componentes reutilizáveis:

```text
src/features/provider-operations/operation-page-shell.tsx
src/features/provider-operations/operation-form-section.tsx
src/features/provider-operations/operation-summary-card.tsx
src/features/provider-operations/help-callout.tsx
src/features/provider-operations/status-explanation.tsx
```

---

# Regras críticas

Preservar integralmente:

```text
- autenticação do prestador
- isolamento multi-tenant
- permissões OWNER/ADMIN/MEMBER conforme regra atual
- subscription enforcement
- onboarding
- validações Zod
- server actions existentes
- criação/edição/inativação de serviços
- criação/edição/inativação de categorias
- criação/edição/inativação de clientes
- criação/edição/status/cancelamento/finalização de agendamentos
- regras de disponibilidade
- regras de bloqueios
- conflitos de agendamento
- custom fields
- bookingMode
- priceType
- origem do agendamento
```

Não alterar:

```text
- Prisma schema
- migrations
- endpoints Typebot
- fluxo público
- auth
- roles
- cookies
- política de assinatura
- modelagem de agendamento
```

---

# Problema atual

Mesmo após o redesign visual e tabelas melhores, algumas telas do prestador ainda podem parecer operacionais demais ou técnicas demais.

Problemas esperados:

```text
- formulários longos sem contexto
- campos técnicos pouco explicados
- diferença entre DIRECT, REQUIRES_CONFIRMATION e INFORMATIONAL pouco clara
- priceType pouco intuitivo
- custom fields poderem parecer recurso técnico
- horários de atendimento parecerem configuração de sistema
- bloqueios de agenda sem orientação prática
- detalhe de agendamento com pouca prioridade visual
- ações de status de agendamento sem explicação suficiente
- settings do negócio sem sensação de "perfil público"
```

---

# Direção de UX

O painel do prestador deve falar a linguagem do cotidiano do negócio:

```text
- "O que você atende?"
- "Quando você atende?"
- "Quem são seus clientes?"
- "Quem está agendado?"
- "O que precisa ser confirmado?"
- "O que vai aparecer para o cliente?"
```

Evitar linguagem excessivamente técnica:

```text
- bookingMode
- priceType
- custom fields
- metadata
- origin
- tenant
```

Esses conceitos podem existir no código, mas a UI deve usar microcopy humana.

---

# 1. Settings do negócio

Tela:

```text
/app/settings
```

## Objetivo

Deixar claro que esta tela controla a apresentação do negócio para o cliente e a operação interna.

## Melhorias

Organizar em seções:

```text
1. Identidade do negócio
2. Contato e localização
3. Descrição pública
4. Dados operacionais
```

## Microcopy sugerida

Título:

```text
Dados do negócio
```

Subtexto:

```text
Essas informações ajudam seus clientes a reconhecerem seu negócio no link público e nos agendamentos.
```

Para descrição:

```text
Conte rapidamente o que você atende, como trabalha e o que o cliente precisa saber antes de agendar.
```

## Regras

* Não permitir edição de slug/status/plano/vencimento se não existir hoje.
* Não alterar regras de tenant.
* Não alterar validação.

---

# 2. Serviços

Telas:

```text
/app/services
/app/services/new
/app/services/[id]
/app/services/[id]/edit
```

## Objetivo

Transformar a gestão de serviços em uma experiência clara para o prestador.

## Melhorias na listagem

A Phase 20 já melhorou tabela/lista. Agora adicionar contexto operacional:

```text
- explicar que serviços aparecem no link público e WhatsApp
- destacar serviços ativos vs inativos
- CTA "Novo serviço"
- empty state com orientação
```

## Melhorias no formulário

Organizar em seções:

```text
1. Identificação do serviço
2. Tempo e preço
3. Como o cliente agenda
4. Informações adicionais
5. Campos que o cliente deve preencher
```

## Microcopy para bookingMode

Usar labels humanos:

```text
DIRECT = Confirmação imediata
REQUIRES_CONFIRMATION = Precisa de confirmação
INFORMATIONAL = Apenas informativo
```

Explicações:

```text
Confirmação imediata:
O cliente escolhe um horário disponível e o agendamento já entra na agenda.

Precisa de confirmação:
O cliente solicita um horário e você confirma antes de considerar o atendimento definitivo.

Apenas informativo:
O serviço aparece para consulta, mas não permite agendamento direto.
```

## Microcopy para priceType

```text
FIXED = Preço fixo
STARTING_AT = A partir de
ON_REQUEST = Sob consulta
HIDDEN = Não mostrar preço
```

Explicações:

```text
Preço fixo:
Use quando o valor do serviço não muda.

A partir de:
Use quando o valor pode variar conforme o caso.

Sob consulta:
Use quando prefere combinar o valor com o cliente.

Não mostrar preço:
Use quando não deseja exibir valor no link público.
```

## Custom fields

Renomear visualmente para algo humano:

```text
Informações que o cliente deve preencher
```

Subtexto:

```text
Use esses campos para pedir dados importantes antes do atendimento, como modelo do veículo, preferência de horário ou observações.
```

## Regras

* Não alterar schema de custom fields.
* Não alterar payload.
* Não alterar keys existentes.
* Não alterar validações.
* Não esconder recurso de custom fields.

---

# 3. Categorias

Telas:

```text
/app/services/categories
/app/services/categories/new
/app/services/categories/[id]/edit
```

## Objetivo

Mostrar categorias como organização do catálogo.

## Microcopy

Título:

```text
Categorias de serviços
```

Subtexto:

```text
Agrupe serviços parecidos para facilitar a escolha do cliente no link público.
```

Empty state:

```text
Crie categorias como "Manutenção", "Estética", "Consultas" ou qualquer divisão que faça sentido para seu atendimento.
```

## Regras

* Não alterar ordenação.
* Não alterar active/inactive.
* Não excluir fisicamente.
* Não alterar vínculo com serviços.

---

# 4. Clientes

Telas:

```text
/app/customers
/app/customers/new
/app/customers/[id]
/app/customers/[id]/edit
```

## Objetivo

Fazer a área de clientes parecer uma base de relacionamento, não só cadastro.

## Melhorias

No detalhe do cliente, priorizar:

```text
- nome
- telefone
- email
- status
- observações
- histórico de agendamentos, se já existir disponível
```

Se não existir histórico na query, não criar lógica complexa nesta fase. Pode deixar link ou estado futuro.

## Microcopy

Título listagem:

```text
Clientes
```

Subtexto:

```text
Clientes aparecem aqui quando você cria agendamentos ou quando eles usam seu link público.
```

Notas:

```text
Use observações internas para registrar preferências ou informações importantes do atendimento.
```

## Regras

* Não alterar criação/reutilização de customer.
* Não alterar vínculo customer/user.
* Não alterar telefone/email.
* Não alterar active/inactive.

---

# 5. Agendamentos

Telas:

```text
/app/appointments
/app/appointments/new
/app/appointments/[id]
/app/appointments/[id]/edit
```

## Objetivo

Melhorar a operação diária de agendamentos.

## Listagem

A Phase 20 cuidou da lista. Nesta fase, melhorar contexto:

```text
- filtros mais orientados por operação
- status com labels humanos
- origem com labels humanos
- empty state útil
```

## Novo agendamento manual

Organizar em seções:

```text
1. Cliente
2. Serviço
3. Data e horário
4. Observações
5. Revisão
```

## Microcopy

Para `allowOutsideAvailability`:

```text
Permitir fora do horário cadastrado
```

Explicação:

```text
Use apenas em exceções, quando quiser criar um agendamento mesmo fora da disponibilidade padrão.
```

Para estimatedPrice:

```text
Valor estimado
```

Explicação:

```text
Use quando quiser registrar uma previsão de valor para este atendimento.
```

## Detalhe do agendamento

Dar prioridade visual:

```text
- status atual
- data/hora
- cliente
- serviço
- origem
- observações
- campos personalizados
- histórico/eventos
- ações possíveis
```

## Ações de status

Melhorar labels e agrupamento sem alterar transições:

```text
- Confirmar
- Iniciar atendimento
- Finalizar
- Marcar como não compareceu
- Cancelar pelo prestador
```

## Regras

* Não alterar máquina de estados.
* Não permitir transição nova.
* Não remover transição existente.
* Não alterar conflito/disponibilidade.
* Não alterar event logging.
* Não alterar origin.
* Não alterar createdByUserId.

---

# 6. Horários de atendimento

Tela:

```text
/app/availability
```

## Objetivo

Fazer a configuração de horários parecer uma agenda semanal simples.

## Melhorias

```text
- agrupar por dia da semana
- explicar que esses horários liberam slots para link público e WhatsApp
- destacar dias ativos/inativos
- mostrar intervalo e duração de slot com clareza
```

## Microcopy

Título:

```text
Horários de atendimento
```

Subtexto:

```text
Defina quando seus clientes podem encontrar horários disponíveis no link público e WhatsApp.
```

Slot interval:

```text
Intervalo entre horários disponíveis
```

Explicação:

```text
Exemplo: com intervalo de 30 minutos, o cliente verá opções como 09:00, 09:30 e 10:00.
```

## Regras

* Não alterar cálculo de disponibilidade.
* Não alterar conflitos.
* Não alterar bloqueios.
* Não alterar weekday.
* Não alterar formato salvo.

---

# 7. Bloqueios de agenda

Tela:

```text
/app/availability/blocks
```

## Objetivo

Explicar bloqueios como exceções de agenda.

## Microcopy

Título:

```text
Bloqueios de agenda
```

Subtexto:

```text
Use bloqueios para impedir agendamentos em períodos específicos, como folgas, feriados, manutenção ou compromissos.
```

Reason:

```text
Motivo do bloqueio
```

Empty state:

```text
Nenhum bloqueio cadastrado
```

Descrição:

```text
Quando precisar fechar um período específico da agenda, crie um bloqueio aqui.
```

## Regras

* Não alterar bloqueio de availability.
* Não alterar validação starts_at/ends_at.
* Não alterar impacto nos slots.
* Não alterar conflitos.

---

# 8. Form sections

Padronizar formulários longos com seções visuais.

Criar componente, se fizer sentido:

```text
OperationFormSection
```

Props sugeridas:

```ts
type OperationFormSectionProps = {
  title: string;
  description?: string;
  children: React.ReactNode;
};
```

Uso:

```text
- serviço
- cliente
- agendamento
- settings
- availability
```

## Regras

* Não transformar tudo em Client Component sem necessidade.
* Não passar ícone React de Server para Client.
* Se precisar de ícone, usar string serializável ou deixar sem ícone.

---

# 9. Help callouts

Criar pequenos blocos de ajuda contextual.

Exemplos:

```text
Este serviço aparece no link público quando estiver ativo e tiver uma categoria ativa.

Horários cadastrados aqui são usados para calcular slots livres no link público e no WhatsApp.

Campos personalizados ajudam a coletar informações antes do atendimento.
```

## Regras

* Não poluir tela.
* Usar em pontos de decisão.
* Não transformar em documentação longa dentro da UI.

---

# 10. Microcopy e labels

Padronizar termos visíveis:

```text
Prestador → usar apenas se estiver falando do painel/admin
Cliente → cliente final
Agendamento → compromisso/horário reservado
Serviço → atendimento ofertado
Bloqueio → período indisponível
Link público → página de agendamento
WhatsApp/Typebot → canal WhatsApp quando fizer sentido para usuário comum
```

Evitar em UI:

```text
tenant
bookingMode
priceType
customValues
origin
metadata
PUBLIC_LINK
MANUAL_PANEL
WHATSAPP
```

Substituir por labels humanos.

---

# 11. Responsividade

Validar:

```text
320px
375px
768px
1024px
1440px
```

Obrigatório:

```text
- formulários sem overflow horizontal
- seções empilhadas no mobile
- botões confortáveis para toque
- detalhes de agendamento legíveis no mobile
- campos personalizados não quebram layout
```

---

# 12. Acessibilidade

Obrigatório:

```text
- labels associados aos inputs
- textos de ajuda claros
- erros próximos aos campos
- contraste adequado
- foco visível
- botões com nomes claros
- status não depende só de cor
```

---

# 13. Documentação

Criar:

```text
/docs/design/provider-operations-ux.md
```

Atualizar:

```text
/docs/design/design-system-foundation.md
README.md
```

Documentar:

```text
- telas revisadas
- microcopy adotada
- padrões de formulário
- padrões de ajuda contextual
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

Ajustar testes existentes se necessário.

Não precisa criar testes pesados se a mudança for visual/microcopy, mas todos os testes atuais devem continuar passando.

---

# 15. Validação funcional obrigatória

## Settings

```text
1. Acessar /app/settings
2. Editar dados permitidos
3. Salvar
4. Confirmar que link público reflete dados públicos quando aplicável
```

## Serviços

```text
1. Criar serviço DIRECT
2. Criar serviço REQUIRES_CONFIRMATION
3. Criar serviço INFORMATIONAL
4. Criar serviço com preço FIXED
5. Criar serviço com preço STARTING_AT
6. Criar serviço com preço ON_REQUEST
7. Criar serviço com preço HIDDEN
8. Criar custom fields TEXT, SELECT e BOOLEAN
9. Editar serviço
10. Inativar/reativar serviço
```

## Categorias

```text
1. Criar categoria
2. Editar categoria
3. Inativar/reativar categoria
4. Confirmar que serviços continuam vinculados
```

## Clientes

```text
1. Criar cliente
2. Editar cliente
3. Inativar/reativar cliente
4. Abrir detalhe do cliente
```

## Agendamentos

```text
1. Criar agendamento manual dentro da disponibilidade
2. Tentar criar conflito
3. Criar com allowOutsideAvailability quando permitido
4. Alterar status conforme transições atuais
5. Cancelar pelo prestador
6. Finalizar atendimento
7. Conferir appointment events
```

## Horários

```text
1. Criar/editar faixa de atendimento
2. Ativar/inativar dia/faixa
3. Confirmar que link público mostra slots
4. Confirmar que Typebot slots continuam funcionando
```

## Bloqueios

```text
1. Criar bloqueio
2. Confirmar que link público não mostra slot bloqueado
3. Confirmar que Typebot não mostra slot bloqueado
4. Remover/editar bloqueio conforme regra atual
```

## Segurança

```text
1. CUSTOMER não acessa /app
2. Prestador não acessa /admin
3. Tenant A não vê dados do tenant B
```

---

# Fora do escopo

Não implementar:

```text
- calendário visual
- drag and drop
- remarcação pelo cliente
- cancelamento pelo cliente
- pagamento
- cobrança
- notificações
- integração Google Agenda
- upload de logo
- temas por tenant
- novas permissões
- alterações de Prisma
- migrations
- novos endpoints
- nova máquina de status
- alteração de disponibilidade
```

---

# Critérios de aceite

* Settings do negócio com seções e microcopy melhores.
* Serviços com formulário mais guiado.
* bookingMode explicado em linguagem humana.
* priceType explicado em linguagem humana.
* Custom fields apresentados como informações que o cliente preenche.
* Categorias explicadas como organização do catálogo.
* Clientes apresentados como base de relacionamento.
* Agendamentos com detalhe e ações mais claros.
* Horários de atendimento mais compreensíveis.
* Bloqueios explicados como exceções de agenda.
* Formulários longos organizados em seções.
* Help callouts aplicados com moderação.
* Nenhuma regra de negócio alterada.
* Nenhuma migration criada.
* Auth, tenant isolation e permissions preservados.
* Link público continua funcionando.
* Typebot API continua funcionando.
* Documentação criada/atualizada.
* `pnpm typecheck`, `pnpm lint`, `pnpm test` e `pnpm build` passam.

---

# Instruções para o DeepSeek

Implemente somente a Phase 22 Provider Operations UX.

Antes de alterar código, leia:

```text
.ai/PROJECT_RULES.md
.ai/skills/frontend-design.md
diagnostico-frontend-2026-06-26.md
inventario-telas-2026-06-26.md
/docs/design/visual-identity.md
/docs/design/design-system-foundation.md
/docs/design/provider-dashboard-experience.md
/docs/design/data-tables-responsive-lists.md
```

Melhore UX, microcopy e organização visual das telas:

```text
/app/settings
/app/services
/app/services/new
/app/services/[id]
/app/services/[id]/edit
/app/services/categories
/app/services/categories/new
/app/services/categories/[id]/edit
/app/customers
/app/customers/new
/app/customers/[id]
/app/customers/[id]/edit
/app/appointments
/app/appointments/new
/app/appointments/[id]
/app/appointments/[id]/edit
/app/availability
/app/availability/blocks
```

Aplicar:

```text
- formulários em seções
- microcopy humana
- help callouts moderados
- labels humanos para bookingMode, priceType, origin e status
- melhor detalhe de agendamento
- melhor explicação de horários e bloqueios
- visual consistente com fases 16–21
```

Preservar:

```text
- auth
- tenant isolation
- permissions
- subscription enforcement
- onboarding
- server actions
- validations
- custom fields
- availability
- blocks
- conflicts
- appointment status transitions
- public booking
- Typebot API
```

Não implementar:

```text
- calendário visual
- drag and drop
- remarcação pelo cliente
- cancelamento pelo cliente
- pagamento
- cobrança
- notificações
- Google Agenda
- upload de logo
- temas por tenant
- novas permissões
- alterações Prisma
- migrations
- novos endpoints
- nova máquina de status
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
