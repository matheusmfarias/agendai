# Task - Phase 02 Admin Platform

## Objetivo

Implementar a primeira versão funcional do painel administrativo global da plataforma.

Esta fase deve permitir que o Super Admin gerencie prestadores, planos, assinaturas manuais e logs administrativos sem depender de banco de dados, seed, script ou chamada direta de API.

## Dependências

Esta task depende da conclusão da Phase 01 Foundation.

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
```

## Escopo

Implementar no painel `/admin`:

1. Dashboard administrativo
2. CRUD de prestadores
3. CRUD de planos
4. Controle manual de assinaturas
5. Registro manual de pagamento
6. Alteração de vencimento de assinatura
7. Suspensão e reativação de prestador
8. Consulta de audit logs
9. Validações com Zod
10. Audit log para ações sensíveis

---

# 1. Dashboard Admin

## Rota

```text
/admin/dashboard
```

## Deve exibir

Cards com:

```text
Total de prestadores
Prestadores ativos
Prestadores suspensos
Prestadores cancelados
Assinaturas em trial
Assinaturas ativas
Assinaturas vencidas
Assinaturas suspensas
Receita mensal prevista
Planos ativos
```

## Regras

* Métricas devem vir do banco.
* Receita mensal prevista pode ser calculada com base em assinaturas ativas e valor cadastrado na assinatura.
* Não usar dados mockados.

---

# 2. CRUD de Prestadores

## Rotas sugeridas

```text
/admin/tenants
/admin/tenants/new
/admin/tenants/[id]
/admin/tenants/[id]/edit
```

## Lista de prestadores

Exibir tabela com:

```text
Nome do negócio
Slug
Responsável
WhatsApp
Segmento
Cidade/UF
Status
Plano atual
Status da assinatura
Vencimento
Criado em
Ações
```

## Ações

```text
Ver detalhes
Editar
Suspender
Reativar
Cancelar
```

## Criar prestador

Campos:

```text
Nome do negócio
Slug
Nome do responsável
E-mail
WhatsApp
Segmento
Cidade
Estado
Status
Plano inicial
Ciclo de cobrança
Data de vencimento
```

## Regras

* Slug deve ser único.
* E-mail deve ser válido.
* WhatsApp deve ser obrigatório.
* Ao criar prestador, criar também assinatura inicial.
* Se plano inicial for informado, vincular assinatura ao plano.
* Criar audit log ao criar prestador.
* Criar audit log ao editar prestador.
* Criar audit log ao suspender, reativar ou cancelar.

## Status do tenant

```text
ACTIVE
SUSPENDED
CANCELED
```

---

# 3. Detalhe do Prestador

## Rota

```text
/admin/tenants/[id]
```

## Exibir

```text
Dados do negócio
Dados do responsável
Slug/link público
WhatsApp
Segmento
Cidade/UF
Status do tenant
Plano atual
Status da assinatura
Data de vencimento
Data de criação
Última atualização
Agendamentos recentes, se existirem futuramente
Logs recentes desse tenant
```

Nesta fase, se ainda não houver agendamentos, mostrar estado vazio.

## Ações no detalhe

```text
Editar prestador
Alterar assinatura
Registrar pagamento
Suspender/Reativar
Ver logs
```

---

# 4. CRUD de Planos

## Rotas sugeridas

```text
/admin/plans
/admin/plans/new
/admin/plans/[id]/edit
```

## Campos

```text
Nome
Descrição
Valor mensal
Valor anual
WhatsApp habilitado
Link público habilitado
Ativo/Inativo
```

## Regras

* Nome obrigatório.
* Valor mensal e anual não podem ser negativos.
* Plano inativo não deve aparecer como opção para novas assinaturas.
* Não excluir fisicamente plano que já tenha assinatura vinculada.
* Preferir inativar em vez de excluir.
* Criar audit log para criação e alteração de plano.

---

# 5. Assinaturas

## Rotas sugeridas

```text
/admin/subscriptions
/admin/subscriptions/[id]
/admin/subscriptions/[id]/edit
```

## Lista de assinaturas

Tabela com:

```text
Prestador
Plano
Status
Ciclo
Valor
Data de início
Data de vencimento
Último pagamento
Forma de pagamento
Ações
```

## Status

```text
TRIAL
ACTIVE
PAST_DUE
SUSPENDED
CANCELED
```

## Ciclo

```text
MONTHLY
ANNUAL
```

## Ações

```text
Ver detalhes
Editar assinatura
Registrar pagamento
Estender vencimento
Suspender
Reativar
Cancelar
```

---

# 6. Registrar pagamento manual

## Objetivo

Permitir que o Super Admin registre pagamento feito fora da plataforma, por exemplo Pix manual.

## Campos

```text
Data do pagamento
Forma de pagamento
Valor pago
Novo vencimento
Observação interna
```

## Regras

* Atualizar `last_payment_at`.
* Atualizar `expires_at`.
* Atualizar `status` para ACTIVE, se aplicável.
* Registrar audit log.
* Não integrar gateway de pagamento nesta fase.

---

# 7. Alterar vencimento

## Objetivo

Permitir ajuste manual de vencimento de assinatura.

## Campos

```text
Nova data de vencimento
Motivo/observação interna
```

## Regras

* Atualizar `expires_at`.
* Registrar audit log com data anterior e nova data.
* Não permitir data inválida.
* Não apagar histórico.

---

# 8. Suspensão/Reativação

## Suspender prestador

Ao suspender tenant:

```text
tenant.status = SUSPENDED
```

Se necessário, assinatura pode permanecer com status próprio.

## Reativar prestador

Ao reativar tenant:

```text
tenant.status = ACTIVE
```

## Regras

* Suspensão deve gerar audit log.
* Reativação deve gerar audit log.
* Prestador suspenso não deve acessar funcionalidades operacionais futuramente.
* Link público e Typebot serão bloqueados em fases futuras com base nesse status.

---

# 9. Audit Logs

## Rota

```text
/admin/audit-logs
```

## Exibir tabela com

```text
Data/hora
Evento
Ator
Tenant
Descrição
IP
Ações
```

## Filtros

```text
Tenant
Tipo de evento
Data inicial
Data final
Ator
```

## Detalhe do log

Mostrar:

```text
event_type
description
actor_type
actor_id
tenant_id
metadata
ip_address
created_at
```

## Regras

* Metadata pode ser exibido como JSON formatado.
* Não permitir edição de audit log.
* Não permitir exclusão de audit log na interface.

---

# 10. Validações

Usar Zod em todos os formulários e actions/endpoints.

Validações mínimas:

* E-mail válido
* Slug obrigatório e único
* Nome obrigatório
* WhatsApp obrigatório
* Valores monetários não negativos
* Datas válidas
* Status dentro dos enums permitidos
* Plano existente e ativo ao criar nova assinatura

---

# 11. UI

Usar shadcn/ui e Tailwind.

Componentes esperados:

```text
Cards de métrica
Tabelas
Formulários
Botões de ação
Modal ou página para ações sensíveis
Toast ou feedback visual
Estados vazios
Estados de carregamento
Mensagens de erro
```

---

# 12. Segurança e permissões

Todas as rotas `/admin/*` devem exigir Super Admin.

Todas as actions administrativas devem validar permissão no servidor.

Não confiar apenas na UI.

---

# Fora do escopo desta fase

Não implementar:

```text
Painel operacional completo do prestador
Serviços do prestador
Agenda
Clientes
Link público
Typebot
WhatsApp
Templates funcionais
Gateway de pagamento
Pagamento online
Emissão fiscal
```

---

# Critérios de aceite

* Super Admin consegue acessar dashboard admin.
* Dashboard mostra métricas reais do banco.
* Super Admin consegue criar prestador pelo painel.
* Ao criar prestador, uma assinatura inicial pode ser criada.
* Super Admin consegue editar prestador.
* Super Admin consegue suspender, reativar e cancelar prestador.
* Super Admin consegue criar e editar planos.
* Super Admin consegue inativar plano.
* Super Admin consegue listar assinaturas.
* Super Admin consegue registrar pagamento manual.
* Super Admin consegue alterar vencimento de assinatura.
* Super Admin consegue suspender, reativar e cancelar assinatura.
* Audit logs são registrados para ações sensíveis.
* Audit logs podem ser consultados pela interface.
* Usuário não Super Admin não acessa nenhuma rota admin.
* Não existe necessidade de alterar banco manualmente para manutenção administrativa coberta por esta fase.

---

# Instruções para o Codex

Implemente somente a Phase 02 Admin Platform.

Não implemente funcionalidades fora do escopo.

Não altere a documentação, exceto se encontrar erro claro e justificar.

Ao finalizar, informe:

```text
- Arquivos criados
- Arquivos alterados
- Como testar
- Variáveis novas, se houver
- Migrations criadas
- Validações executadas
- Pendências conhecidas
```
