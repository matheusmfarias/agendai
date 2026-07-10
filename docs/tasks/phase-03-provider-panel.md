# Task - Phase 03 Provider Panel

## Objetivo

Implementar a primeira versão funcional do painel operacional do prestador.

Esta fase deve permitir que um prestador configure dados do próprio negócio, categorias de serviço, serviços, campos personalizados, horários de atendimento e bloqueios de agenda.

Esta fase ainda não deve implementar criação completa de agendamentos, link público, Typebot ou WhatsApp.

## Dependências

Esta task depende da conclusão da:

```text
/docs/tasks/phase-01-foundation.md
/docs/tasks/phase-02-admin-platform.md
/docs/tasks/phase-02-1-provider-login-access.md
```

Antes de implementar, leia obrigatoriamente:

```text
/docs/specs/00-visao-produto.md
/docs/specs/01-usuarios-permissoes.md
/docs/specs/02-admin-plataforma.md
/docs/technical/stack.md
/docs/technical/arquitetura.md
/docs/technical/banco-dados.md
/docs/technical/auth-permissoes.md
/docs/technical/padroes-codigo.md
/docs/tasks/phase-01-foundation.md
/docs/tasks/phase-02-admin-platform.md
/docs/tasks/phase-02-1-provider-login-access.md
```

## Escopo

Implementar no painel `/app`:

1. Dashboard básico do prestador
2. Edição dos dados do negócio
3. CRUD de categorias de serviço
4. CRUD de serviços
5. CRUD de campos personalizados por serviço
6. Configuração de horários de atendimento
7. Criação, listagem e remoção de bloqueios de agenda
8. Validações com Zod
9. Audit log para ações sensíveis
10. Proteção por tenant ativo

---

# 1. Dashboard do Prestador

## Rota

```text
/app/dashboard
```

## Deve exibir

Cards com:

```text
Nome do negócio
Status do tenant
Status da assinatura
Plano atual
Data de vencimento
Total de categorias ativas
Total de serviços ativos
Total de bloqueios futuros
```

## Regras

* Dados devem vir do tenant vinculado ao usuário autenticado.
* Usuário não pode visualizar dados de outro tenant.
* Caso o tenant esteja suspenso ou cancelado, exibir aviso claro no painel.
* Não usar dados mockados.

---

# 2. Configurações do Negócio

## Rota sugerida

```text
/app/settings
```

## Campos editáveis

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

* O prestador não pode alterar o slug nesta fase.
* O prestador não pode alterar status do tenant.
* O prestador não pode alterar plano ou vencimento.
* Alterações devem gerar audit log.
* Validar e-mail, WhatsApp e campos obrigatórios.
* Todas as alterações devem respeitar o tenant do usuário logado.

---

# 3. Categorias de Serviço

## Rotas sugeridas

```text
/app/services/categories
/app/services/categories/new
/app/services/categories/[id]/edit
```

Também é aceitável implementar categorias dentro da área:

```text
/app/services
```

desde que a interface fique clara.

## Campos

```text
Nome
Descrição
Ordem de exibição
Ativo/Inativo
```

## Regras

* Categoria pertence ao tenant atual.
* Nome obrigatório.
* Ordem deve ser número inteiro.
* Categoria inativa não deve aparecer futuramente no link público ou Typebot.
* Não permitir acesso, edição ou ação em categoria de outro tenant.
* Criar audit log ao criar, editar, ativar ou inativar.
* Não excluir fisicamente categorias nesta fase; usar ativar/inativar.

---

# 4. Serviços

## Rotas sugeridas

```text
/app/services
/app/services/new
/app/services/[id]
/app/services/[id]/edit
```

## Lista de serviços

Exibir tabela com:

```text
Nome
Categoria
Duração
Tipo de preço
Valor
Modo de agendamento
Confirmação manual
Status
Ordem
Ações
```

## Campos do serviço

```text
Categoria
Nome
Descrição
Duração em minutos
Tipo de preço
Valor
Modo de agendamento
Exige confirmação manual
Observações internas
Ordem de exibição
Ativo/Inativo
```

## price_type

```text
FIXED
STARTING_AT
ON_REQUEST
HIDDEN
```

## booking_mode

```text
DIRECT
REQUIRES_CONFIRMATION
INFORMATIONAL
```

## Regras

* Serviço pertence ao tenant atual.
* Serviço deve estar vinculado a uma categoria do mesmo tenant.
* Nome obrigatório.
* Duração deve ser maior que zero.
* Valor não pode ser negativo.
* Se `price_type` for `ON_REQUEST` ou `HIDDEN`, valor pode ser nulo.
* Se `booking_mode` for `REQUIRES_CONFIRMATION`, o sistema deve tratar futuramente como solicitação pendente.
* Se `booking_mode` for `INFORMATIONAL`, futuramente não deve confirmar horário automaticamente.
* Criar audit log ao criar, editar, ativar ou inativar.
* Não excluir fisicamente serviços nesta fase; usar ativar/inativar.

---

# 5. Campos Personalizados

## Objetivo

Permitir que cada serviço tenha campos próprios para coletar informações do cliente final futuramente.

## Local

Implementar dentro do detalhe do serviço:

```text
/app/services/[id]
```

ou dentro da edição:

```text
/app/services/[id]/edit
```

## Campos

```text
Rótulo
Chave
Tipo
Opções
Obrigatório
Ordem
Ativo/Inativo
```

## field_type

```text
TEXT
TEXTAREA
NUMBER
DATE
BOOLEAN
SELECT
```

## Regras

* Campo personalizado pertence ao tenant e a um serviço do mesmo tenant.
* Label obrigatório.
* Key deve ser gerada automaticamente a partir do label ou informada com validação.
* Key deve ser única dentro do serviço.
* SELECT deve permitir opções em formato lista.
* Campo inativo não deve ser exibido futuramente no link público ou Typebot.
* Criar audit log ao criar, editar, ativar ou inativar.
* Não excluir fisicamente campos personalizados nesta fase; usar ativar/inativar.

---

# 6. Horários de Atendimento

## Rota sugerida

```text
/app/availability
```

## Objetivo

Permitir configurar disponibilidade semanal recorrente.

## Campos

```text
Dia da semana
Hora inicial
Hora final
Intervalo de slot em minutos
Ativo/Inativo
```

## Regras

* `weekday` deve seguir:

  * 0 domingo
  * 1 segunda
  * 2 terça
  * 3 quarta
  * 4 quinta
  * 5 sexta
  * 6 sábado
* Hora final deve ser maior que hora inicial.
* Intervalo de slot deve ser maior que zero.
* Permitir múltiplas faixas por dia.
* Exemplo: segunda 08:00-12:00 e segunda 13:30-18:00.
* Regra pertence ao tenant atual.
* Criar audit log ao criar, editar, ativar ou inativar.
* Não calcular horários disponíveis para cliente final nesta fase.

---

# 7. Bloqueios de Agenda

## Rota sugerida

```text
/app/availability/blocks
```

Ou seção dentro de:

```text
/app/availability
```

## Campos

```text
Início
Fim
Motivo
```

## Regras

* Data/hora final deve ser maior que data/hora inicial.
* Bloqueio pertence ao tenant atual.
* Bloqueios futuros devem aparecer no dashboard.
* Criar audit log ao criar ou remover bloqueio.
* Não precisa validar conflito com agendamentos nesta fase, pois agenda ainda não existe.

---

# 8. Banco de Dados

Criar migration para adicionar as entidades:

```text
service_categories
services
custom_fields
availability_rules
schedule_blocks
```

## service_categories

Campos mínimos:

```text
id
tenant_id
name
description
position
is_active
created_at
updated_at
```

## services

Campos mínimos:

```text
id
tenant_id
category_id
name
description
duration_minutes
price_type
price_value
booking_mode
requires_manual_confirmation
is_active
position
internal_notes
created_at
updated_at
```

## custom_fields

Campos mínimos:

```text
id
tenant_id
service_id
label
key
field_type
options
is_required
position
is_active
created_at
updated_at
```

## availability_rules

Campos mínimos:

```text
id
tenant_id
weekday
start_time
end_time
slot_interval_minutes
is_active
created_at
updated_at
```

## schedule_blocks

Campos mínimos:

```text
id
tenant_id
starts_at
ends_at
reason
created_by_user_id
created_at
updated_at
```

---

# 9. Permissões

Todas as rotas `/app/*` devem exigir:

```text
usuário autenticado
vínculo ativo com tenant
tenant ativo
```

Usuário de um tenant não pode acessar dados de outro tenant.

Todas as actions do painel do prestador devem validar o tenant no servidor.

Não confiar apenas na UI.

Usuário do prestador não pode acessar `/admin`.

---

# 10. UI

Usar shadcn/ui, Tailwind, React Hook Form, Zod e TanStack Table quando aplicável.

Componentes esperados:

```text
Cards de resumo
Tabelas
Formulários
Selects
Checkboxes
Textarea
Botões de ação
Estados vazios
Feedback de erro/sucesso
```

---

# 11. Audit Logs

Registrar audit log para:

```text
TENANT_SETTINGS_UPDATED
SERVICE_CATEGORY_CREATED
SERVICE_CATEGORY_UPDATED
SERVICE_CATEGORY_STATUS_CHANGED
SERVICE_CREATED
SERVICE_UPDATED
SERVICE_STATUS_CHANGED
CUSTOM_FIELD_CREATED
CUSTOM_FIELD_UPDATED
CUSTOM_FIELD_STATUS_CHANGED
AVAILABILITY_RULE_CREATED
AVAILABILITY_RULE_UPDATED
AVAILABILITY_RULE_STATUS_CHANGED
SCHEDULE_BLOCK_CREATED
SCHEDULE_BLOCK_DELETED
```

Audit log deve incluir `tenant_id`.

---

# Fora do escopo desta fase

Não implementar:

```text
Criação de agendamento
Validação final de disponibilidade para agendamento
Clientes
Link público funcional
Typebot
WhatsApp
Templates funcionais
Múltiplos profissionais
Pagamentos
Nota fiscal
Marketplace
```

---

# Critérios de aceite

* Admin do Prestador consegue acessar `/app/dashboard`.
* Dashboard mostra dados reais do tenant.
* Prestador consegue editar dados básicos do negócio.
* Prestador consegue criar, editar, ativar e inativar categorias.
* Prestador consegue criar, editar, ativar e inativar serviços.
* Prestador consegue criar, editar, ativar e inativar campos personalizados por serviço.
* Prestador consegue configurar horários de atendimento.
* Prestador consegue criar e remover bloqueios de agenda.
* Usuário não autenticado não acessa `/app`.
* Usuário sem vínculo ativo com tenant não acessa `/app`.
* Usuário de um tenant não acessa dados de outro tenant.
* Usuário do prestador não acessa `/admin`.
* Ações sensíveis geram audit log.
* Validações usam Zod.
* Formulários usam React Hook Form quando aplicável.
* Não há necessidade de mexer no banco manualmente para operar as funcionalidades desta fase.

---

# Instruções para o Codex

Implemente somente a Phase 03 Provider Panel.

Não implemente funcionalidades fora do escopo.

Não implemente link público, Typebot, WhatsApp ou criação de agendamentos nesta fase.

Não altere documentação existente, exceto se encontrar erro claro e justificar.

Ao finalizar, informe:

```text
- Arquivos criados
- Arquivos alterados
- Migrations criadas
- Como testar
- Validações executadas
- Pendências conhecidas
```
