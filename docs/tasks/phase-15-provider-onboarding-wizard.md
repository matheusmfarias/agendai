# Task - Phase 15 Provider Onboarding Wizard

## Objetivo

Implementar um wizard de onboarding para o prestador configurar o negócio de forma guiada após o primeiro acesso ao painel.

Até a Phase 14, o Super Admin já consegue criar tenants, usuários responsáveis, planos, assinaturas, aplicar templates por segmento e habilitar os canais de agendamento.

Esta fase deve melhorar a experiência do prestador, guiando-o por uma sequência de configuração inicial para deixar o tenant operacional sem depender de instruções manuais.

O wizard deve ajudar o prestador a revisar e completar:

```text
- dados do negócio
- segmento
- serviços/categorias
- horários de atendimento
- link público
- status dos canais
- checklist de prontidão
```

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
```

Antes de implementar, leia obrigatoriamente:

```text
/docs/specs/00-visao-produto.md
/docs/specs/01-usuarios-permissoes.md
/docs/specs/02-admin-plataforma.md
/docs/technical/banco-dados.md
/docs/technical/auth-permissoes.md
/docs/technical/padroes-codigo.md
/docs/technical/subscription-enforcement.md
/docs/technical/segment-templates.md
README.md
```

---

# Escopo

Implementar:

```text
1. Estado de onboarding por tenant
2. Wizard no painel do prestador
3. Checklist de prontidão operacional
4. Etapas guiadas de configuração
5. Integração com templates existentes, se possível
6. Avisos no dashboard enquanto onboarding estiver incompleto
7. Marcação de onboarding concluído
8. Possibilidade de pular/retomar onboarding
9. Documentação
10. Testes automatizados
```

Não implementar cobrança automática, marketplace, integração WhatsApp real, editor avançado de templates, IA gerando configuração ou onboarding administrado pelo cliente final.

---

# 1. Modelo de dados

Adicionar campos em `Tenant` ou criar model próprio.

## Recomendação MVP

Adicionar campos no model `Tenant`:

```prisma
onboardingStatus       OnboardingStatus @default(NOT_STARTED) @map("onboarding_status")
onboardingCompletedAt  DateTime?        @map("onboarding_completed_at") @db.Timestamptz(3)
onboardingSkippedAt    DateTime?        @map("onboarding_skipped_at") @db.Timestamptz(3)
```

Criar enum:

```prisma
enum OnboardingStatus {
  NOT_STARTED
  IN_PROGRESS
  COMPLETED
  SKIPPED
}
```

## Observação

Se preferir evitar enum, pode usar string. Mas enum é recomendado pela consistência do schema atual.

## Migration

Criar migration:

```text
add_tenant_onboarding_status
```

---

# 2. Rotas

Criar rotas no painel do prestador:

```text
/app/onboarding
/app/onboarding/business
/app/onboarding/services
/app/onboarding/availability
/app/onboarding/public-link
/app/onboarding/review
```

Ou uma única rota com wizard client-side:

```text
/app/onboarding
```

## Recomendação

Usar uma única rota:

```text
/app/onboarding
```

Com etapas internas.

Motivos:

```text
- menor complexidade de roteamento
- facilita controle de estado
- wizard simples para MVP
```

---

# 3. Acesso e permissões

## Quem pode acessar

Prestadores vinculados ao tenant:

```text
OWNER
ADMIN
```

## Bloquear ou limitar

```text
MEMBER
CUSTOMER
SUPER_ADMIN fora do contexto de tenant
visitante anônimo
```

Se o projeto ainda não diferencia edição por MEMBER, seguir a regra atual de manutenção do painel.

## Regras

* Onboarding pertence ao tenant atual.
* Nunca permitir acessar onboarding de outro tenant.
* Aplicar isolamento multi-tenant em todas as queries/actions.
* Usar permissões já existentes do painel prestador.

---

# 4. Entrada no onboarding

## Dashboard do prestador

Atualizar:

```text
/app/dashboard
```

Se onboarding não estiver concluído, mostrar card:

```text
Complete a configuração inicial do seu negócio
```

Com botão:

```text
Continuar configuração
```

## Regras

Exibir card quando:

```text
onboardingStatus = NOT_STARTED
onboardingStatus = IN_PROGRESS
onboardingStatus = SKIPPED, opcionalmente com texto menor
```

Não exibir card principal quando:

```text
onboardingStatus = COMPLETED
```

Se `SKIPPED`, pode mostrar opção discreta:

```text
Retomar configuração inicial
```

---

# 5. Etapas do wizard

O wizard deve conter pelo menos 5 etapas.

## Etapa 1 - Dados do negócio

Campos:

```text
Nome do negócio
Nome do responsável
E-mail
WhatsApp
Segmento
Cidade
Estado
Endereço
Descrição
```

## Regras

* Reutilizar schemas/actions existentes de `/app/settings`, se possível.
* Não permitir alterar slug nesta etapa.
* Validar WhatsApp.
* Validar e-mail.
* Segmento pode sugerir template, mas não deve obrigar.

---

## Etapa 2 - Serviços

Objetivo: garantir que o tenant tenha pelo menos uma categoria ativa e um serviço ativo.

Exibir:

```text
- total de categorias ativas
- total de serviços ativos
- lista resumida de serviços atuais
```

Ações:

```text
- Ir para serviços
- Criar serviço manualmente
- Aplicar template sugerido, se possível
```

## Integração com templates

Se o tenant ainda não tiver serviços ou categorias relevantes, permitir aplicar template baseado no segmento.

### Regra importante

Prestador pode aplicar template nesta fase?

## Decisão para esta fase

Permitir que `OWNER` aplique template no próprio tenant durante onboarding, usando os templates versionados existentes, mas com restrições:

```text
- somente no próprio tenant
- somente durante onboarding
- aplicação idempotente
- não sobrescreve dados existentes
- não expõe tela admin de templates
- não permite editar template
```

`ADMIN` pode aplicar template se já tiver permissão de manutenção conforme padrão do projeto. Se houver dúvida, restringir a `OWNER`.

## Ação sugerida

No wizard, mostrar:

```text
Aplicar template sugerido para o segmento: Mecânica
```

Também permitir escolher outro template:

```text
Barbearia
Manicure
Estética
Assistência técnica
Clínica/consultório
```

Com preview resumido:

```text
X categorias
Y serviços
Z campos personalizados
```

---

## Etapa 3 - Horários de atendimento

Objetivo: garantir que o tenant tenha pelo menos uma regra ativa de disponibilidade.

Exibir:

```text
- dias/horários configurados
- aviso se não houver horários
```

Ações:

```text
- Ir para horários
- Criar horários sugeridos
```

## Horários sugeridos

Permitir aplicar horários padrão, usando os mesmos horários dos templates ou regra padrão:

```text
Segunda a sexta:
08:00 - 12:00
13:30 - 18:00

Sábado:
08:00 - 12:00
```

Regras:

```text
- não duplicar horários existentes
- se já houver disponibilidade, perguntar antes
- não sobrescrever horários existentes
```

---

## Etapa 4 - Link público

Objetivo: mostrar ao prestador o link público e status do canal.

Exibir:

```text
URL pública
Status do tenant
Status da assinatura
Plano permite link público?
Serviços ativos?
Horários configurados?
Link pronto para uso?
```

Ações:

```text
- Copiar link
- Abrir link público
- Ir para serviços
- Ir para horários
```

## Mensagem

Se pronto:

```text
Seu link público já pode ser compartilhado com clientes.
```

Se não pronto:

```text
Complete os itens pendentes para liberar o agendamento pelo link público.
```

---

## Etapa 5 - Revisão e conclusão

Exibir checklist final:

```text
Dados do negócio preenchidos
Pelo menos 1 serviço ativo
Pelo menos 1 categoria ativa
Horários configurados
Assinatura permite link público
Assinatura permite Typebot/WhatsApp
Link público pronto
Typebot pronto, se aplicável
```

Botões:

```text
Concluir onboarding
Pular por enquanto
Voltar ao dashboard
```

## Regras para concluir

Permitir concluir se os requisitos mínimos estiverem OK:

```text
- dados básicos preenchidos
- pelo menos 1 serviço ativo
- pelo menos 1 horário ativo
```

Não exigir Typebot pronto para concluir, pois WhatsApp/Typebot pode ser configurado posteriormente pelo admin.

Não exigir link público habilitado se o plano não permitir link público. Nesse caso, mostrar como não disponível pelo plano.

---

# 6. Checklist de prontidão

Criar service centralizado:

```text
src/features/onboarding/onboarding-checklist-service.ts
```

Função sugerida:

```ts
getProviderOnboardingChecklist(tenantId): Promise<OnboardingChecklist>
```

Checklist deve retornar:

```ts
type OnboardingChecklist = {
  businessInfoComplete: boolean;
  hasActiveCategory: boolean;
  hasActiveService: boolean;
  hasAvailability: boolean;
  publicLinkAllowed: boolean;
  publicBookingReady: boolean;
  typebotAllowed: boolean;
  typebotReady: boolean;
  canCompleteOnboarding: boolean;
  items: OnboardingChecklistItem[];
};
```

Cada item:

```ts
type OnboardingChecklistItem = {
  key: string;
  label: string;
  status: "DONE" | "WARNING" | "BLOCKED" | "OPTIONAL";
  description?: string;
  actionHref?: string;
  actionLabel?: string;
};
```

Reutilizar:

```text
subscription-policy.ts
typebot-health-service.ts
tenant-policy.ts
```

quando fizer sentido, sem duplicar regra.

---

# 7. Actions

Criar:

```text
src/features/onboarding/onboarding-actions.ts
```

Actions sugeridas:

```ts
startOnboarding()
updateBusinessInfoFromOnboarding()
applySegmentTemplateFromOnboarding()
applySuggestedAvailabilityFromOnboarding()
completeOnboarding()
skipOnboarding()
resumeOnboarding()
```

## Regras

* Todas actions exigem tenant ativo e usuário autorizado.
* Todas actions aplicam isolamento tenant.
* `completeOnboarding()` só conclui se checklist mínimo estiver OK.
* `skipOnboarding()` marca status como SKIPPED.
* `resumeOnboarding()` volta para IN_PROGRESS.
* `startOnboarding()` muda NOT_STARTED para IN_PROGRESS.
* Criar audit logs.

---

# 8. Audit logs

Criar eventos:

```text
PROVIDER_ONBOARDING_STARTED
PROVIDER_ONBOARDING_SKIPPED
PROVIDER_ONBOARDING_RESUMED
PROVIDER_ONBOARDING_COMPLETED
PROVIDER_ONBOARDING_TEMPLATE_APPLIED
PROVIDER_ONBOARDING_AVAILABILITY_APPLIED
```

Metadata segura:

```json
{
  "tenantId": "uuid",
  "userId": "uuid",
  "templateKey": "mechanic",
  "createdServices": 6,
  "createdAvailabilityRules": 10
}
```

Não registrar dados sensíveis desnecessários.

---

# 9. UI/UX

## Layout

Usar componentes existentes do dashboard.

Sugestão visual:

```text
- título: Configuração inicial
- subtítulo: Complete os passos para começar a receber agendamentos
- stepper horizontal ou vertical
- cards por etapa
- checklist lateral ou final
```

## Etapas

Mostrar progresso:

```text
Etapa 1 de 5
```

Ou:

```text
Dados do negócio → Serviços → Horários → Link público → Revisão
```

## Botões

```text
Próximo
Voltar
Salvar e continuar
Pular por enquanto
Concluir
```

## Regra

Evitar wizard que bloqueia completamente o painel. O prestador deve poder sair e voltar.

---

# 10. Integração com templates

Reutilizar:

```text
src/features/segment-templates/segment-template-definitions.ts
src/features/segment-templates/segment-template-service.ts
```

Se necessário, adaptar service para receber contexto de usuário prestador, mas preservar segurança.

## Regras

* Super Admin continua podendo aplicar templates pela tela admin.
* Prestador só pode aplicar template no próprio tenant durante onboarding.
* Audit log deve diferenciar:

  * `SEGMENT_TEMPLATE_APPLIED` pelo admin
  * `PROVIDER_ONBOARDING_TEMPLATE_APPLIED` pelo prestador

---

# 11. Integração com assinatura

Onboarding deve respeitar subscription enforcement.

## Regras

* Se assinatura estiver vencida/bloqueada, ainda permitir configurar negócio, serviços e horários.
* Não permitir concluir como “pronto para receber agendamentos” se política bloquear canais.
* Checklist deve mostrar bloqueio de assinatura.
* Mensagem interna pode informar motivo administrativo para o prestador.

Exemplo:

```text
Sua assinatura precisa estar regular para receber novos agendamentos pelo link público.
```

---

# 12. Typebot/WhatsApp no onboarding

Não configurar Typebot pelo prestador nesta fase.

Apenas mostrar status informativo:

```text
WhatsApp/Typebot: configuração realizada pela plataforma
```

Se plano permitir e credencial existir:

```text
Canal WhatsApp/Typebot pronto para integração.
```

Se não existir credencial:

```text
Canal WhatsApp/Typebot ainda não configurado pela plataforma.
```

Não mostrar token para o prestador.

Não permitir gerar token pelo prestador.

---

# 13. Testes automatizados

Criar testes para checklist e actions puras.

Sugestão:

```text
src/features/onboarding/onboarding-checklist-service.test.ts
src/features/onboarding/onboarding-actions.test.ts
```

Casos mínimos:

```text
checklist sem dados do negócio
checklist sem serviços
checklist sem horários
checklist com assinatura bloqueada
checklist com tudo pronto
canCompleteOnboarding false sem serviço
canCompleteOnboarding false sem horário
canCompleteOnboarding true com dados mínimos
startOnboarding muda NOT_STARTED para IN_PROGRESS
skipOnboarding muda para SKIPPED
resumeOnboarding muda para IN_PROGRESS
completeOnboarding só conclui quando checklist mínimo OK
template aplicado no onboarding não duplica dados
horários sugeridos não duplicam regras
```

Se actions forem difíceis de testar por dependência de auth/contexto, testar services puros e helpers centrais.

---

# 14. Documentação

Criar:

```text
/docs/technical/provider-onboarding.md
```

Documentar:

```text
- objetivo do onboarding
- etapas
- permissões
- checklist
- integração com templates
- integração com assinatura
- Typebot no onboarding
- como testar
- limitações
```

Atualizar:

```text
README.md
/docs/technical/segment-templates.md
/docs/technical/subscription-enforcement.md
```

---

# 15. Fora do escopo

Não implementar:

```text
- onboarding do Super Admin
- criação automática de tenant via wizard
- pagamento/cobrança automática
- integração Pix/boleto/cartão
- WhatsApp Cloud API real
- configuração Typebot pelo prestador
- geração de token Typebot pelo prestador
- editor visual de templates
- IA para gerar serviços
- marketplace de templates
- upload de logo/fotos
- domínio próprio
- integração Google Agenda
- importação de clientes
- mensagens automáticas
- lembretes
```

---

# Critérios de aceite

* Migration de onboarding criada.
* Tenant possui `onboardingStatus`.
* `/app/onboarding` criada.
* OWNER/ADMIN conseguem acessar.
* Usuário sem permissão não acessa.
* Dashboard do prestador mostra card de onboarding incompleto.
* Wizard possui etapas de dados, serviços, horários, link público e revisão.
* Dados do negócio podem ser atualizados pelo wizard.
* Prestador pode aplicar template no próprio tenant durante onboarding.
* Aplicação de template pelo onboarding é idempotente.
* Prestador pode aplicar horários sugeridos sem duplicar regras.
* Checklist mostra pendências reais.
* Checklist respeita assinatura/plano.
* Typebot aparece apenas como status informativo.
* Token Typebot não é exposto.
* Prestador pode pular onboarding.
* Prestador pode retomar onboarding.
* Prestador só consegue concluir se requisitos mínimos estiverem OK.
* Conclusão grava `onboardingCompletedAt`.
* Audit logs são criados para eventos do onboarding.
* Documentação criada.
* README atualizado.
* Painel do prestador continua funcionando.
* Link público continua funcionando.
* Typebot API continua funcionando.
* Templates admin continuam funcionando.
* `pnpm typecheck`, `pnpm lint`, `pnpm test` e `pnpm build` passam.

---

# Instruções para o DeepSeek

Implemente somente a Phase 15 Provider Onboarding Wizard.

Crie um wizard em `/app/onboarding` para o prestador completar a configuração inicial do negócio.

O wizard deve incluir:

```text
- dados do negócio
- serviços/templates
- horários
- link público
- revisão/checklist
```

Reutilize templates da Phase 14, mas permita que o prestador aplique template apenas no próprio tenant e apenas durante onboarding.

Não exponha token Typebot.

Não permita o prestador gerar credencial Typebot.

Não implemente cobrança automática, WhatsApp real, pagamento, Pix, boleto, upload de logo, domínio próprio, Google Agenda, IA, editor de templates ou marketplace.

Ao finalizar, informe:

```text
- arquivos criados
- arquivos alterados
- migration criada
- rota criada
- etapas implementadas
- testes adicionados
- como validar
- validações executadas
- pendências conhecidas
```
