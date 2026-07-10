# Task - Phase 04 Customers and Appointments Core

## Objetivo

Implementar o núcleo operacional de clientes e agendamentos dentro do painel do prestador.

Esta fase deve permitir que o prestador cadastre clientes, crie agendamentos manualmente, visualize a agenda, atualize status de agendamentos e registre histórico operacional.

Esta fase ainda não deve implementar link público, Typebot, WhatsApp ou criação de agendamento pelo cliente final.

## Dependências

Esta task depende da conclusão e validação das fases:

```text
/docs/tasks/phase-01-foundation.md
/docs/tasks/phase-02-admin-platform.md
/docs/tasks/phase-02-1-provider-login-access.md
/docs/tasks/phase-03-provider-panel.md
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
```

## Escopo

Implementar no painel `/app`:

1. CRUD lógico de clientes
2. Criação manual de agendamentos
3. Listagem de agendamentos
4. Detalhe do agendamento
5. Atualização de status
6. Cancelamento pelo prestador
7. Finalização de atendimento
8. Validação de conflito de agenda
9. Aplicação de bloqueios de agenda
10. Registro de eventos do agendamento
11. Audit logs para ações sensíveis
12. Isolamento por tenant

---

# 1. Clientes

## Rotas sugeridas

```text
/app/customers
/app/customers/new
/app/customers/[id]
/app/customers/[id]/edit
```

## Campos

```text
Nome
Telefone
E-mail
Observações internas
Ativo/Inativo
```

## Regras

* Cliente pertence ao tenant atual.
* Nome obrigatório.
* Telefone obrigatório.
* E-mail opcional, mas se preenchido deve ser válido.
* O mesmo telefone pode existir em tenants diferentes.
* Não permitir acesso a cliente de outro tenant.
* Não excluir fisicamente cliente nesta fase; usar ativo/inativo.
* Cliente inativo não deve aparecer como opção padrão em novos agendamentos.
* Criar audit log ao criar, editar, ativar ou inativar.

---

# 2. Agendamentos

## Rotas sugeridas

```text
/app/appointments
/app/appointments/new
/app/appointments/[id]
/app/appointments/[id]/edit
```

## Lista de agendamentos

Exibir tabela com:

```text
Data/hora
Cliente
Telefone
Serviço
Origem
Status
Valor estimado
Criado em
Ações
```

## Filtros

```text
Data inicial
Data final
Status
Serviço
Cliente
Origem
```

## Campos do agendamento manual

```text
Cliente
Serviço
Data e hora de início
Data e hora de fim, calculada pela duração do serviço
Observações do cliente
Observações internas
Valor estimado
```

## Regras

* Agendamento pertence ao tenant atual.
* Cliente deve pertencer ao mesmo tenant.
* Serviço deve pertencer ao mesmo tenant.
* Serviço deve estar ativo.
* Categoria inativa não impede agendamento manual, mas deve gerar aviso visual se o serviço estiver vinculado a categoria inativa.
* Data/hora de início obrigatória.
* Data/hora de fim deve ser calculada com base em `duration_minutes` do serviço.
* Permitir ajuste manual de fim somente se já existir padrão no projeto; se não existir, manter automático.
* Origem de agendamento manual deve ser `MANUAL_PANEL`.
* Agendamento criado manualmente deve iniciar como `CONFIRMED`, salvo se o usuário escolher outro status permitido.
* Criar evento de histórico `CREATED`.
* Criar audit log.

---

# 3. Status de agendamento

## Status permitidos

Usar ou criar enum compatível com:

```text
REQUESTED
CONFIRMED
WAITING_INFO
RESCHEDULED
CANCELED_BY_CUSTOMER
CANCELED_BY_PROVIDER
NO_SHOW
IN_PROGRESS
FINISHED
```

## Transições mínimas permitidas nesta fase

```text
CONFIRMED -> IN_PROGRESS
CONFIRMED -> CANCELED_BY_PROVIDER
CONFIRMED -> NO_SHOW
IN_PROGRESS -> FINISHED
REQUESTED -> CONFIRMED
REQUESTED -> CANCELED_BY_PROVIDER
WAITING_INFO -> CONFIRMED
WAITING_INFO -> CANCELED_BY_PROVIDER
```

## Regras

* Toda alteração de status deve criar `appointment_event`.
* Toda alteração sensível deve criar audit log.
* Não permitir finalizar agendamento cancelado.
* Não permitir iniciar agendamento cancelado.
* Não permitir cancelar agendamento já finalizado.
* Não permitir editar data/hora de agendamento finalizado ou cancelado nesta fase.

---

# 4. Validação de conflito

## Objetivo

Evitar dois agendamentos conflitantes no mesmo tenant.

## Regra

Ao criar ou reagendar agendamento, verificar se existe conflito com outro agendamento do mesmo tenant.

Considerar como bloqueadores os status:

```text
REQUESTED
CONFIRMED
WAITING_INFO
RESCHEDULED
IN_PROGRESS
```

Não considerar como bloqueadores:

```text
CANCELED_BY_CUSTOMER
CANCELED_BY_PROVIDER
NO_SHOW
FINISHED
```

## Conflito

Existe conflito se os intervalos se sobrepõem:

```text
novo_inicio < existente_fim
novo_fim > existente_inicio
```

## Regras

* Não permitir criar agendamento em horário conflitante.
* Não permitir criar agendamento dentro de bloqueio de agenda.
* Não permitir criar agendamento fora dos horários de atendimento recorrentes, exceto se houver opção explícita “permitir encaixe manual”.
* Para esta fase, incluir campo no formulário:

  * `Permitir encaixe fora da disponibilidade`
* Mesmo com encaixe manual, não permitir conflito com outro agendamento nem bloqueio.

---

# 5. Disponibilidade recorrente

Ao criar agendamento manual sem encaixe, validar:

* dia da semana possui regra ativa
* horário de início e fim cabem dentro de alguma faixa ativa
* serviço cabe integralmente na faixa
* respeita bloqueios de agenda
* respeita conflitos com outros agendamentos

Exemplo:

Se o tenant atende segunda 08:00-12:00 e o serviço dura 60 minutos:

```text
11:00 permitido
11:30 não permitido
```

---

# 6. Bloqueios de agenda

Agendamento não pode cruzar bloqueio existente.

Exemplo:

Bloqueio:

```text
10:00 - 11:00
```

Agendamento:

```text
09:30 - 10:30
```

Resultado:

```text
Bloquear criação por conflito com bloqueio.
```

---

# 7. Appointment Events

Criar entidade `appointment_events`.

## Campos mínimos

```text
id
tenant_id
appointment_id
actor_type
actor_id
event_type
description
metadata
created_at
```

## Eventos mínimos

```text
CREATED
STATUS_CHANGED
CANCELED
STARTED
FINISHED
NO_SHOW
NOTE_ADDED
```

## Regras

* Todo agendamento criado deve gerar evento `CREATED`.
* Toda mudança de status deve gerar evento.
* O detalhe do agendamento deve mostrar histórico cronológico.
* Metadata pode armazenar status anterior e novo status.

---

# 8. Banco de Dados

Criar migration para adicionar:

```text
customers
appointments
appointment_events
```

## customers

Campos mínimos:

```text
id
tenant_id
name
phone
email
notes
is_active
created_at
updated_at
```

## appointments

Campos mínimos:

```text
id
tenant_id
customer_id
service_id
origin
status
starts_at
ends_at
customer_notes
internal_notes
estimated_price
final_price
created_by_user_id
created_at
updated_at
```

## appointment_events

Campos mínimos:

```text
id
tenant_id
appointment_id
actor_type
actor_id
event_type
description
metadata
created_at
```

## Índices recomendados

```text
customers.tenant_id
customers.phone
appointments.tenant_id
appointments.customer_id
appointments.service_id
appointments.starts_at
appointments.status
appointments.origin
appointment_events.tenant_id
appointment_events.appointment_id
```

---

# 9. Dashboard do prestador

Atualizar `/app/dashboard` para incluir:

```text
Agendamentos de hoje
Agendamentos futuros
Agendamentos cancelados nos últimos 7 dias
Clientes ativos
Próximos 5 agendamentos
```

---

# 10. Audit Logs

Registrar audit log para:

```text
CUSTOMER_CREATED
CUSTOMER_UPDATED
CUSTOMER_STATUS_CHANGED
APPOINTMENT_CREATED
APPOINTMENT_UPDATED
APPOINTMENT_STATUS_CHANGED
APPOINTMENT_CANCELED
APPOINTMENT_FINISHED
APPOINTMENT_NO_SHOW
```

---

# 11. Permissões

Todas as rotas `/app/*` devem exigir:

```text
usuário autenticado
vínculo ativo com tenant
tenant ativo
```

Usuário de um tenant não pode acessar dados de outro tenant.

OWNER e ADMIN podem criar, editar e alterar status.

OPERATOR, se já suportado, pode criar agendamento e alterar status, mas não editar configurações do negócio.

---

# 12. UI

Usar shadcn/ui, Tailwind, React Hook Form, Zod e TanStack Table.

Componentes esperados:

```text
Tabelas
Formulários
Cards
Filtros
Badges de status
Estados vazios
Feedback de erro/sucesso
Detalhe com histórico
Confirmações para ações destrutivas/sensíveis
```

---

# Fora do escopo desta fase

Não implementar:

```text
Link público funcional
Agendamento pelo cliente final
Typebot
WhatsApp
Lembretes automáticos
Pagamento
Nota fiscal
Múltiplos profissionais
Google Agenda
Reagendamento avançado
Cancelamento pelo cliente final
Campos personalizados preenchidos no agendamento
```

Campos personalizados já existem, mas o preenchimento dinâmico deles pelo cliente final será implementado em fase futura.

---

# Critérios de aceite

* Prestador consegue criar, editar, ativar e inativar clientes.
* Prestador consegue criar agendamento manual.
* Sistema calcula fim do agendamento com base na duração do serviço.
* Sistema impede conflito com outro agendamento ativo.
* Sistema impede agendamento dentro de bloqueio.
* Sistema impede agendamento fora da disponibilidade, salvo encaixe manual.
* Sistema registra origem `MANUAL_PANEL`.
* Sistema registra eventos do agendamento.
* Prestador consegue alterar status conforme transições permitidas.
* Prestador consegue cancelar agendamento.
* Prestador consegue finalizar agendamento.
* Detalhe do agendamento mostra histórico.
* Dashboard do prestador mostra métricas reais de clientes e agendamentos.
* Audit logs são criados para ações sensíveis.
* Usuário de um tenant não acessa clientes/agendamentos de outro tenant.
* Não há necessidade de mexer no banco manualmente para operar clientes e agendamentos.

---

# Instruções para o Codex

Implemente somente a Phase 04 Customers and Appointments Core.

Não implemente funcionalidades fora do escopo.

Não implemente link público, Typebot, WhatsApp, lembretes automáticos ou pagamento.

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
