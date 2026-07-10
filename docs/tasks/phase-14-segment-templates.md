# Task - Phase 14 Segment Templates

## Objetivo

Implementar templates por segmento para acelerar o onboarding de prestadores no AgendaZap.

Até agora, ao criar um tenant/prestador, o sistema cria a estrutura base, mas categorias, serviços, campos personalizados, horários e configurações operacionais precisam ser cadastrados manualmente.

Esta fase deve permitir que o Super Admin aplique um template de segmento em um tenant, criando automaticamente uma estrutura inicial de operação.

Exemplos de segmentos:

```text
- Mecânica
- Barbearia
- Manicure
- Estética
- Assistência técnica
- Clínica/consultório simples
```

Cada template pode criar:

```text
- categorias de serviço
- serviços
- duração padrão
- tipo de preço
- valor sugerido
- modo de agendamento
- campos personalizados por serviço
- horários sugeridos, se aplicável
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
```

Antes de implementar, leia obrigatoriamente:

```text
/docs/specs/00-visao-produto.md
/docs/specs/01-usuarios-permissoes.md
/docs/specs/02-admin-plataforma.md
/docs/technical/banco-dados.md
/docs/technical/padroes-codigo.md
/docs/technical/typebot-api.md
/docs/technical/subscription-enforcement.md
README.md
```

---

# Escopo

Implementar:

```text
1. Modelo/estrutura de templates por segmento
2. Templates iniciais versionados no código
3. Tela admin para aplicar template em tenant
4. Preview antes de aplicar
5. Aplicação idempotente/segura
6. Criação de categorias, serviços e custom fields
7. Opcionalmente criação de horários sugeridos
8. Audit logs
9. Documentação
10. Testes automatizados
```

Não implementar marketplace de templates, editor visual avançado, template criado pelo prestador, importação/exportação externa ou IA gerando templates.

---

# 1. Estratégia recomendada

Para MVP, os templates devem ser versionados em código, não no banco.

Criar estrutura:

```text
src/features/segment-templates/
```

Arquivos sugeridos:

```text
src/features/segment-templates/segment-template-types.ts
src/features/segment-templates/segment-template-definitions.ts
src/features/segment-templates/segment-template-service.ts
src/features/segment-templates/segment-template-actions.ts
src/features/segment-templates/segment-template-preview.tsx
```

## Motivo

Templates em código são mais seguros e simples nesta fase:

```text
- versionáveis no Git
- fáceis de revisar
- não exigem CRUD complexo
- evitam editor administrativo prematuro
- reduzem risco de template malformado
```

---

# 2. Tipos dos templates

Criar tipos para representar template:

```ts
export type SegmentTemplateKey =
  | "mechanic"
  | "barbershop"
  | "manicure"
  | "beauty"
  | "technical_assistance"
  | "clinic_simple";

export type SegmentTemplateDefinition = {
  key: SegmentTemplateKey;
  name: string;
  description: string;
  segment: string;
  categories: SegmentTemplateCategory[];
  availability?: SegmentTemplateAvailabilityRule[];
};

export type SegmentTemplateCategory = {
  name: string;
  description?: string;
  order: number;
  services: SegmentTemplateService[];
};

export type SegmentTemplateService = {
  name: string;
  description?: string;
  durationMinutes: number;
  priceType: "FIXED" | "STARTING_AT" | "ON_REQUEST" | "HIDDEN";
  priceValue?: number | null;
  bookingMode: "DIRECT" | "REQUIRES_CONFIRMATION" | "INFORMATIONAL";
  requiresManualConfirmation?: boolean;
  internalNotes?: string;
  order: number;
  customFields?: SegmentTemplateCustomField[];
};

export type SegmentTemplateCustomField = {
  label: string;
  key: string;
  type: "TEXT" | "TEXTAREA" | "NUMBER" | "DATE" | "BOOLEAN" | "SELECT";
  required: boolean;
  options?: string[];
  order: number;
};

export type SegmentTemplateAvailabilityRule = {
  weekday: number;
  startTime: string;
  endTime: string;
  slotIntervalMinutes: number;
  active: boolean;
};
```

Ajustar os nomes conforme os enums reais do projeto.

---

# 3. Templates iniciais

Criar pelo menos 6 templates:

```text
Mecânica
Barbearia
Manicure
Estética
Assistência técnica
Clínica/consultório simples
```

## 3.1 Mecânica

Categorias sugeridas:

```text
Diagnóstico
Manutenção
Serviços rápidos
```

Serviços sugeridos:

```text
Diagnóstico veicular
Troca de óleo
Revisão preventiva
Freios
Suspensão
Alinhamento e balanceamento
```

Campos personalizados sugeridos:

```text
Placa do veículo
Modelo do veículo
Ano do veículo
Descrição do problema
Tipo de combustível
```

Booking mode recomendado:

```text
REQUIRES_CONFIRMATION
```

Preço:

```text
ON_REQUEST ou STARTING_AT
```

---

## 3.2 Barbearia

Categorias sugeridas:

```text
Cortes
Barba
Combos
```

Serviços sugeridos:

```text
Corte masculino
Barba
Corte + barba
Corte infantil
Sobrancelha
```

Campos personalizados sugeridos:

```text
Preferência de profissional, se aplicável
Observações
```

Booking mode recomendado:

```text
DIRECT
```

Preço:

```text
FIXED
```

---

## 3.3 Manicure

Categorias sugeridas:

```text
Mãos
Pés
Combos
Alongamento
```

Serviços sugeridos:

```text
Manicure
Pedicure
Manicure + pedicure
Esmaltação em gel
Alongamento de unhas
Manutenção de alongamento
```

Campos personalizados sugeridos:

```text
Possui alongamento atualmente?
Deseja remover esmalte anterior?
Observações
```

Booking mode recomendado:

```text
DIRECT ou REQUIRES_CONFIRMATION para alongamento
```

---

## 3.4 Estética

Categorias sugeridas:

```text
Facial
Corporal
Depilação
Avaliação
```

Serviços sugeridos:

```text
Limpeza de pele
Design de sobrancelhas
Depilação
Massagem relaxante
Avaliação estética
Procedimento corporal
```

Campos personalizados sugeridos:

```text
Já realizou esse procedimento antes?
Possui alergias?
Está gestante?
Observações importantes
```

Booking mode recomendado:

```text
REQUIRES_CONFIRMATION para procedimentos sensíveis
DIRECT para serviços simples
```

---

## 3.5 Assistência técnica

Categorias sugeridas:

```text
Celulares
Computadores
Orçamentos
```

Serviços sugeridos:

```text
Diagnóstico técnico
Troca de tela
Troca de bateria
Formatação de computador
Limpeza preventiva
Orçamento de reparo
```

Campos personalizados sugeridos:

```text
Marca do aparelho
Modelo do aparelho
Problema apresentado
Aparelho liga?
Possui senha de acesso?
```

Booking mode recomendado:

```text
REQUIRES_CONFIRMATION
```

Preço:

```text
ON_REQUEST
```

---

## 3.6 Clínica/consultório simples

Categorias sugeridas:

```text
Consultas
Avaliações
Retornos
```

Serviços sugeridos:

```text
Primeira consulta
Consulta de retorno
Avaliação inicial
Teleatendimento
```

Campos personalizados sugeridos:

```text
Motivo da consulta
É primeira consulta?
Possui encaminhamento?
Observações
```

Booking mode recomendado:

```text
REQUIRES_CONFIRMATION
```

Observação:

Não implementar regras médicas, prontuário, dados sensíveis avançados ou LGPD específica nesta fase. Apenas template operacional simples.

---

# 4. Horários sugeridos

Opcionalmente, templates podem incluir disponibilidade inicial.

Sugestão padrão:

```text
Segunda a sexta:
08:00 - 12:00
13:30 - 18:00

Sábado:
08:00 - 12:00
```

## Regras

* A aplicação do template deve perguntar se deseja criar horários sugeridos.
* Se o tenant já possui availability_rules, não sobrescrever automaticamente.
* Se criar horários, deve criar apenas quando o tenant não tiver horários ou quando o admin confirmar.

---

# 5. Tela admin

Criar rota:

```text
/admin/tenants/[id]/templates
```

Acesso:

```text
SUPER_ADMIN
```

Adicionar link no detalhe do tenant:

```text
Aplicar template de segmento
```

## Tela deve exibir

```text
- dados do tenant
- status atual
- template atual sugerido pelo campo segment, se houver
- lista de templates disponíveis
- preview do template selecionado
- resumo do que será criado
- opção de incluir horários sugeridos
- botão aplicar template
```

## Preview deve mostrar

```text
- categorias
- serviços por categoria
- duração
- preço
- bookingMode
- campos personalizados
- horários sugeridos
```

---

# 6. Aplicação do template

## Regras fundamentais

A aplicação deve ser segura e previsível.

### Não duplicar dados

Se uma categoria com mesmo nome já existir no tenant:

```text
- reutilizar categoria existente
- não criar duplicada
```

Se um serviço com mesmo nome na mesma categoria já existir:

```text
- não criar duplicado
- opcionalmente atualizar apenas se o admin selecionar modo de atualização
```

Para esta fase, recomendação:

```text
- modo padrão: criar apenas itens ausentes
- não sobrescrever dados existentes
```

### Campos personalizados

Se um serviço já existe:

```text
- criar apenas custom fields ausentes pelo key
- não duplicar key
- não sobrescrever campo existente
```

### Horários

Se incluir horários sugeridos:

```text
- criar apenas se não houver regra igual
- não duplicar mesmo weekday/start/end
```

## Resultado da aplicação

Mostrar resumo:

```text
Template aplicado com sucesso.

Criado:
- X categorias
- Y serviços
- Z campos personalizados
- W regras de horário

Ignorado por já existir:
- A categorias
- B serviços
- C campos
- D horários
```

---

# 7. Audit logs

Criar evento:

```text
SEGMENT_TEMPLATE_APPLIED
```

Metadata segura:

```json
{
  "tenantId": "uuid",
  "templateKey": "mechanic",
  "templateName": "Mecânica",
  "createdCategories": 3,
  "createdServices": 6,
  "createdCustomFields": 12,
  "createdAvailabilityRules": 10,
  "skippedCategories": 1,
  "skippedServices": 2,
  "skippedCustomFields": 4,
  "skippedAvailabilityRules": 0
}
```

Não logar dados sensíveis desnecessários.

---

# 8. Permissões

Somente Super Admin pode aplicar template nesta fase.

Bloquear:

```text
- USER prestador
- CUSTOMER
- visitante anônimo
```

Prestador poderá editar os dados depois pelo painel `/app`.

---

# 9. Impacto no Typebot e link público

Após aplicar template:

```text
- serviços ativos devem aparecer no link público
- serviços ativos devem aparecer na API Typebot
- custom fields devem aparecer no detalhe do serviço
- slots devem funcionar se horários forem criados
```

Não alterar endpoints Typebot nesta fase, salvo ajuste necessário para compatibilidade.

---

# 10. Testes automatizados

Criar testes para o service de templates.

Sugestão:

```text
src/features/segment-templates/segment-template-service.test.ts
```

Casos mínimos:

```text
- lista templates disponíveis
- template mechanic existe
- template barbershop existe
- template manicure existe
- template beauty existe
- template technical_assistance existe
- template clinic_simple existe
- aplicar template cria categorias
- aplicar template cria serviços
- aplicar template cria custom fields
- aplicar template não duplica categoria existente
- aplicar template não duplica serviço existente
- aplicar template não duplica custom field existente
- aplicar template com horários cria availability rules
- aplicar template sem horários não cria availability rules
- aplicar template inválido retorna erro
```

Se o service depender de Prisma, usar padrão de testes já existente no projeto. Se ficar pesado, separar funções puras de preview/definitions para teste unitário e testar service principal de forma integration se possível.

---

# 11. Documentação

Criar:

```text
/docs/technical/segment-templates.md
```

Documentar:

```text
- objetivo dos templates
- templates disponíveis
- o que cada template cria
- regras de idempotência
- permissões
- como aplicar
- como validar no link público
- como validar no Typebot
- limitações
```

Atualizar:

```text
README.md
```

Adicionar:

```text
Phase 14 - Segment Templates
```

---

# 12. Fora do escopo

Não implementar:

```text
- editor visual de templates
- CRUD de templates no banco
- marketplace de templates
- templates criados pelo prestador
- importação/exportação de templates
- IA gerando templates
- versionamento avançado de template aplicado
- sobrescrita automática de serviços existentes
- criação automática de tenant a partir de template
- onboarding wizard completo
- cobrança por template
```

---

# Critérios de aceite

* Rota `/admin/tenants/[id]/templates` criada.
* Apenas SUPER_ADMIN acessa.
* Lista de templates disponíveis aparece.
* Preview do template aparece antes de aplicar.
* Super Admin consegue aplicar template em tenant.
* Aplicação cria categorias.
* Aplicação cria serviços.
* Aplicação cria custom fields.
* Opcionalmente cria horários sugeridos.
* Aplicação não duplica categorias existentes.
* Aplicação não duplica serviços existentes.
* Aplicação não duplica custom fields existentes.
* Aplicação não sobrescreve dados existentes.
* Resultado mostra criados/ignorados.
* Audit log `SEGMENT_TEMPLATE_APPLIED` criado.
* Serviços criados aparecem no painel do prestador.
* Serviços criados aparecem no link público quando plano/assinatura permitir.
* Serviços criados aparecem na API Typebot quando plano/assinatura permitir.
* Custom fields aparecem no detalhe do serviço.
* Documentação criada.
* README atualizado.
* `pnpm typecheck`, `pnpm lint`, `pnpm test` e `pnpm build` passam.

---

# Instruções para o DeepSeek

Implemente somente a Phase 14 Segment Templates.

Crie templates versionados em código para:

```text
- Mecânica
- Barbearia
- Manicure
- Estética
- Assistência técnica
- Clínica/consultório simples
```

Implemente tela admin:

```text
/admin/tenants/[id]/templates
```

Permita preview e aplicação segura do template.

A aplicação deve criar apenas itens ausentes e não sobrescrever dados existentes.

Não implemente editor visual, CRUD de templates, marketplace, IA, import/export ou onboarding wizard completo.

Ao finalizar, informe:

```text
- arquivos criados
- arquivos alterados
- se houve migration
- templates disponíveis
- rota admin criada
- como aplicar template
- testes adicionados
- validações executadas
- pendências conhecidas
```
