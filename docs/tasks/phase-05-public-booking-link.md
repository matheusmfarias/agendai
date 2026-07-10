# Task - Phase 05 Public Booking Link

## Objetivo

Implementar o link público de agendamento do prestador.

Esta fase deve permitir que o cliente final acesse uma página pública do prestador, visualize serviços ativos, escolha um serviço, veja horários disponíveis, informe seus dados e crie uma solicitação/agendamento sem login.

Esta fase ainda não deve implementar Typebot, WhatsApp, pagamento, lembretes automáticos ou área logada do cliente final.

## Dependências

Esta task depende da conclusão e validação das fases:

```text
/docs/tasks/phase-01-foundation.md
/docs/tasks/phase-02-admin-platform.md
/docs/tasks/phase-02-1-provider-login-access.md
/docs/tasks/phase-03-provider-panel.md
/docs/tasks/phase-04-customers-appointments-core.md
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

Implementar:

1. Página pública do prestador por slug
2. Listagem pública de categorias e serviços ativos
3. Detalhe público do serviço
4. Seleção de data e horário disponível
5. Formulário público de dados do cliente
6. Criação ou reutilização de cliente por telefone dentro do tenant
7. Criação de agendamento pelo link público
8. Preenchimento dos campos personalizados do serviço
9. Página de confirmação
10. Validação de disponibilidade, conflitos e bloqueios
11. Registro de origem `PUBLIC_LINK`
12. Registro de eventos do agendamento
13. Audit log para criação pública de agendamento

---

# 1. Rotas públicas

Implementar rotas públicas sem login:

```text
/[tenantSlug]
/[tenantSlug]/services
/[tenantSlug]/book
/[tenantSlug]/book/confirm
```

Também é aceitável usar estrutura equivalente, desde que o fluxo público esteja claro.

## Regras gerais

* Não exigir login do cliente final.
* Validar se o tenant existe.
* Validar se o tenant está `ACTIVE`.
* Validar se a assinatura permite novos agendamentos.
* Validar se o plano possui link público habilitado.
* Não expor dados administrativos.
* Não expor agenda interna completa.
* Não expor clientes ou outros agendamentos.

---

# 2. Página pública do prestador

## Rota

```text
/[tenantSlug]
```

## Exibir

```text
Nome do negócio
Descrição
Cidade/UF
Endereço, se informado
WhatsApp, se informado
Categorias ativas
Serviços ativos
Botão para agendar
```

## Regras

* Mostrar apenas categorias ativas.
* Mostrar apenas serviços ativos.
* Serviços de categorias inativas não devem aparecer.
* Se tenant estiver suspenso, cancelado ou com link público bloqueado, mostrar mensagem pública genérica.

Mensagem sugerida:

```text
Este serviço de agendamento está temporariamente indisponível. Entre em contato diretamente com o estabelecimento.
```

Nunca informar publicamente que o prestador está inadimplente.

---

# 3. Serviços públicos

## Exibição de serviços

Cada serviço deve mostrar:

```text
Nome
Descrição
Duração estimada
Tipo de preço
Valor, quando aplicável
Modo de agendamento
```

## price_type

Regras de exibição:

```text
FIXED: mostrar valor fixo
STARTING_AT: mostrar "A partir de R$ X"
ON_REQUEST: mostrar "Sob avaliação"
HIDDEN: não mostrar preço
```

## booking_mode

Regras:

```text
DIRECT: cliente pode escolher horário e confirmar agendamento
REQUIRES_CONFIRMATION: cliente escolhe horário, mas status inicial deve ser REQUESTED
INFORMATIONAL: cliente pode enviar solicitação, mas não deve gerar confirmação automática
```

Para esta fase, `INFORMATIONAL` pode criar uma solicitação com status `WAITING_INFO` ou `REQUESTED`, desde que fique claro na mensagem final que depende de retorno do prestador.

---

# 4. Seleção de data e horário

## Objetivo

Permitir que o cliente final escolha um horário disponível para o serviço.

## Regras

* Horários devem ser calculados com base nas `availability_rules`.
* Considerar duração do serviço.
* Considerar `schedule_blocks`.
* Considerar conflitos com agendamentos ativos.
* Não mostrar horários no passado.
* Não mostrar horários fora da disponibilidade.
* Não mostrar horários bloqueados.
* Não mostrar horários conflitantes.

## Status que bloqueiam horário

Devem bloquear disponibilidade:

```text
REQUESTED
CONFIRMED
WAITING_INFO
RESCHEDULED
IN_PROGRESS
```

Não devem bloquear:

```text
CANCELED_BY_CUSTOMER
CANCELED_BY_PROVIDER
NO_SHOW
FINISHED
```

## Janela de busca

Implementar uma janela simples de horários futuros.

Sugestão para MVP:

```text
Próximos 14 dias
```

Se não houver horários disponíveis, mostrar:

```text
Nenhum horário disponível para este serviço nos próximos dias.
```

## Slots

Usar `slot_interval_minutes` das regras de disponibilidade.

Exemplo:

Faixa:

```text
08:00 - 12:00
slot: 30 minutos
serviço: 60 minutos
```

Horários possíveis:

```text
08:00
08:30
09:00
09:30
10:00
10:30
11:00
```

Não permitir 11:30, pois terminaria 12:30.

---

# 5. Dados do cliente final

## Formulário público

Campos mínimos:

```text
Nome
Telefone/WhatsApp
E-mail, opcional
Observações do cliente
Campos personalizados do serviço
```

## Regras

* Nome obrigatório.
* Telefone obrigatório.
* E-mail opcional, mas se preenchido deve ser válido.
* Campos personalizados obrigatórios devem ser preenchidos.
* Cliente final não precisa criar senha.
* Cliente final não precisa fazer login.

---

# 6. Cliente existente por telefone

Ao criar agendamento público:

* Buscar cliente pelo `tenant_id` e telefone.
* Se existir, atualizar nome/e-mail se necessário.
* Se não existir, criar novo cliente.
* O mesmo telefone pode existir em tenants diferentes.
* Não buscar cliente global fora do tenant.

---

# 7. Criação de agendamento público

## Regras

Ao finalizar o fluxo público:

1. Validar tenant ativo.
2. Validar assinatura/plano.
3. Validar serviço ativo.
4. Validar categoria ativa.
5. Validar campos obrigatórios.
6. Validar disponibilidade.
7. Validar bloqueios.
8. Validar conflito.
9. Criar ou atualizar cliente.
10. Criar agendamento.
11. Criar valores dos campos personalizados.
12. Criar `appointment_event`.
13. Criar audit log.

## Origem

Todo agendamento criado via link público deve ter:

```text
origin = PUBLIC_LINK
```

## Status inicial

Regra:

```text
booking_mode DIRECT -> CONFIRMED
booking_mode REQUIRES_CONFIRMATION -> REQUESTED
booking_mode INFORMATIONAL -> WAITING_INFO ou REQUESTED
```

## Mensagem final

Para `DIRECT`:

```text
Agendamento confirmado com sucesso.
```

Para `REQUIRES_CONFIRMATION`:

```text
Sua solicitação foi enviada e aguarda confirmação do prestador.
```

Para `INFORMATIONAL`:

```text
Sua solicitação foi enviada. O prestador entrará em contato para dar continuidade.
```

---

# 8. Campos personalizados no agendamento

Criar ou usar entidade para armazenar respostas dos campos personalizados.

Se ainda não existir, criar:

```text
appointment_custom_values
```

## Campos mínimos

```text
id
appointment_id
custom_field_id
value
created_at
updated_at
```

## Regras

* Resposta pertence ao agendamento.
* Campo personalizado deve pertencer ao serviço do agendamento.
* Campo inativo não deve ser exigido.
* Campo obrigatório ativo deve ser exigido.
* SELECT deve aceitar apenas opções válidas.

---

# 9. Página de confirmação

## Rota

```text
/[tenantSlug]/book/confirm
```

Pode receber identificador seguro do agendamento ou exibir confirmação logo após submit.

## Exibir

```text
Nome do prestador
Serviço
Data e hora
Status/mensagem
Nome do cliente
Observações, se aplicável
```

## Segurança

* Não expor IDs sequenciais se isso permitir consulta indevida.
* Não permitir listar outros agendamentos.
* Não expor dados internos.

---

# 10. Painel do prestador

Atualizar `/app/appointments` para exibir também agendamentos com origem:

```text
PUBLIC_LINK
```

No detalhe do agendamento, mostrar:

```text
Origem: Link público
Respostas dos campos personalizados
```

---

# 11. Banco de Dados

Criar migration se necessário para:

```text
appointment_custom_values
```

Se a tabela já existir, apenas reutilizar.

## Índices recomendados

```text
appointment_custom_values.appointment_id
appointment_custom_values.custom_field_id
```

---

# 12. Audit logs e eventos

Criar eventos de agendamento:

```text
CREATED
PUBLIC_BOOKING_CREATED
```

Criar audit log:

```text
PUBLIC_APPOINTMENT_CREATED
```

Metadata sugerida:

```json
{
  "tenantId": "id do tenant",
  "appointmentId": "id do agendamento",
  "customerId": "id do cliente",
  "serviceId": "id do serviço",
  "origin": "PUBLIC_LINK"
}
```

Não registrar dados sensíveis desnecessários.

---

# 13. Permissões

Rotas públicas não exigem login.

Porém devem validar:

```text
tenant existe
tenant ativo
assinatura permite novos agendamentos
plano permite link público
serviço ativo
categoria ativa
horário disponível
```

Actions públicas devem validar tudo no servidor.

Não confiar em dados vindos do client.

---

# 14. UI

Usar shadcn/ui e Tailwind.

Componentes esperados:

```text
Página pública do prestador
Cards/lista de serviços
Formulário de agendamento
Seleção de data/horário
Campos personalizados dinâmicos
Página/estado de confirmação
Estados vazios
Mensagens de erro
```

A interface pública deve ser simples, responsiva e adequada para celular.

---

# Fora do escopo desta fase

Não implementar:

```text
Typebot
WhatsApp
Pagamento
Lembretes automáticos
Login do cliente final
Área do cliente final
Cancelamento pelo cliente final
Reagendamento pelo cliente final
Google Agenda
Múltiplos profissionais
Marketplace público
Avaliações
```

---

# Critérios de aceite

* Cliente final acessa página pública por slug.
* Página pública mostra dados do prestador.
* Página pública mostra apenas categorias e serviços ativos.
* Cliente final consegue selecionar serviço ativo.
* Cliente final consegue ver horários disponíveis.
* Sistema não mostra horários conflitantes.
* Sistema não mostra horários bloqueados.
* Sistema não mostra horários fora da disponibilidade.
* Cliente final consegue preencher dados e criar agendamento sem login.
* Cliente existente é reutilizado por telefone dentro do tenant.
* Campos personalizados obrigatórios são exigidos.
* SELECT aceita apenas opções válidas.
* Agendamento público recebe origem `PUBLIC_LINK`.
* Status inicial respeita `booking_mode`.
* Painel do prestador mostra agendamento criado pelo link público.
* Detalhe do agendamento mostra respostas dos campos personalizados.
* Audit log é criado.
* Evento do agendamento é criado.
* Tenant suspenso/cancelado não permite agendamento público.
* Plano sem link público habilitado não permite agendamento público.
* Não há necessidade de mexer no banco manualmente para operar o fluxo público.

---

# Instruções para o Codex

Implemente somente a Phase 05 Public Booking Link.

Não implemente funcionalidades fora do escopo.

Não implemente Typebot, WhatsApp, pagamento, lembretes automáticos, área do cliente ou cancelamento pelo cliente final.

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
