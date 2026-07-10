# Task - Phase 05.1 Public Customer Auth

## Objetivo

Ajustar o fluxo público de agendamento para exigir autenticação do cliente final antes de confirmar um agendamento pelo link público.

A página pública do prestador continuará aberta para consulta de serviços, preços e horários. Porém, para concluir o agendamento, o cliente final deverá criar conta ou fazer login com e-mail e senha.

Esta task também deve corrigir o erro atual do Prisma no agendamento público:

```text
Argument `createdBy` is missing.
```

## Dependências

Esta task depende da conclusão da:

```text
/docs/tasks/phase-01-foundation.md
/docs/tasks/phase-02-admin-platform.md
/docs/tasks/phase-02-1-provider-login-access.md
/docs/tasks/phase-03-provider-panel.md
/docs/tasks/phase-04-customers-appointments-core.md
/docs/tasks/phase-05-public-booking-link.md
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

## Decisão de regra de negócio

A partir desta task:

```text
Visitante anônimo pode:
- acessar a página pública do prestador
- visualizar dados públicos do prestador
- visualizar categorias e serviços ativos
- visualizar preços
- visualizar horários disponíveis

Visitante anônimo não pode:
- confirmar agendamento

Cliente final autenticado pode:
- confirmar agendamento pelo link público
- reaproveitar seus dados de cadastro
- gerar ou atualizar um customer dentro do tenant
```

## Escopo

Implementar:

1. Papel de usuário para cliente final
2. Cadastro público de cliente final
3. Login de cliente final
4. Logout compatível com cliente final
5. Proteção da etapa final de confirmação de agendamento
6. Associação entre usuário cliente e customer do tenant
7. Criação de agendamento público somente com cliente autenticado
8. Correção de `Appointment.createdBy` opcional
9. Ajuste de mensagens públicas
10. Audit logs e appointment events compatíveis com cliente autenticado

---

# 1. Papel de usuário cliente final

## Objetivo

Permitir que usuários da tabela `users` também representem clientes finais da plataforma.

## Regra

Adicionar ou utilizar um papel global:

```text
CUSTOMER
```

Se o projeto já usa `global_role = USER` para usuários comuns/prestadores, avaliar a abordagem mais segura:

Opção preferida:

```text
SUPER_ADMIN
USER
CUSTOMER
```

Onde:

```text
SUPER_ADMIN = dono da plataforma
USER = usuário interno vinculado a tenant
CUSTOMER = cliente final que agenda pelo link público
```

## Regras

* Usuário `CUSTOMER` não pode acessar `/admin`.
* Usuário `CUSTOMER` não pode acessar `/app`.
* Usuário `CUSTOMER` pode acessar rotas públicas e concluir agendamento.
* Usuário `CUSTOMER` não precisa estar vinculado a `tenant_users`.
* Usuário `CUSTOMER` usa login com e-mail e senha.

---

# 2. Cadastro público do cliente final

## Rotas sugeridas

```text
/[tenantSlug]/register
```

ou rota global com redirect de retorno:

```text
/customer/register?tenantSlug=...
```

A implementação pode escolher a melhor estrutura, desde que preserve o retorno para o fluxo de agendamento.

## Campos

```text
Nome
Sobrenome
E-mail
Telefone/WhatsApp
Senha
Confirmar senha
```

## Validações

Usar Zod.

Regras mínimas:

```text
Nome obrigatório
Sobrenome obrigatório
E-mail obrigatório e válido
Telefone obrigatório
Senha mínima de 8 caracteres
Confirmação de senha obrigatória
Confirmação igual à senha
E-mail único em users
```

## Regras de criação

Ao cadastrar cliente final:

1. Criar `user`.
2. Definir `global_role = CUSTOMER`.
3. Gerar `password_hash` seguro.
4. Definir `is_active = true`.
5. Criar sessão/logar automaticamente ou redirecionar para login.

Preferência para MVP:

```text
Após cadastro bem-sucedido, autenticar automaticamente e retornar ao fluxo de agendamento.
```

## Segurança

* Nunca armazenar senha em texto puro.
* Nunca exibir `password_hash`.
* Nunca registrar senha ou hash em audit log.

---

# 3. Login público do cliente final

## Rotas sugeridas

```text
/[tenantSlug]/login
```

ou rota global:

```text
/customer/login?tenantSlug=...
```

## Campos

```text
E-mail
Senha
```

## Regras

* Validar credenciais.
* Permitir login de usuário `CUSTOMER`.
* Não permitir que `CUSTOMER` acesse `/admin` ou `/app`.
* Após login, retornar ao fluxo público de agendamento, quando houver redirect.
* Se um usuário `SUPER_ADMIN` ou `USER` acessar o login público, não deve quebrar o fluxo, mas não deve ser tratado como cliente final para confirmar agendamento.

Regra recomendada:

```text
Apenas global_role CUSTOMER pode confirmar agendamento público como cliente final.
```

---

# 4. Sessão e identificação do cliente final

## Objetivo

A sessão deve permitir identificar o usuário cliente autenticado.

Campos esperados na sessão, conforme padrão existente:

```text
user_id
email
global_role
```

## Regras

* Se `global_role = CUSTOMER`, permitir concluir fluxo público.
* Se não houver sessão, exigir login/cadastro antes da confirmação.
* Se houver sessão de prestador ou Super Admin, não criar agendamento como cliente final automaticamente.

Mensagem sugerida:

```text
Para concluir o agendamento, entre com uma conta de cliente.
```

---

# 5. Associação com customer do tenant

## Objetivo

Ao confirmar agendamento público, criar ou atualizar o registro `customers` no contexto do tenant.

## Ajuste de banco

Adicionar vínculo opcional em `customers`:

```text
user_id
```

ou equivalente:

```prisma
userId String?
user   User? @relation(fields: [userId], references: [id])
```

## Regras

Ao confirmar agendamento:

1. Obter o usuário cliente autenticado.
2. Buscar `customer` por:

   * `tenant_id`
   * `user_id`
3. Se não existir, buscar por:

   * `tenant_id`
   * telefone informado
4. Se existir, atualizar `user_id`, nome, telefone e e-mail se necessário.
5. Se não existir, criar `customer`.
6. O mesmo usuário cliente pode ter `customers` em vários tenants.
7. O mesmo telefone pode existir em tenants diferentes.

## Campos do customer

Preencher ou atualizar:

```text
name = nome + sobrenome
phone = telefone
email = e-mail do usuário ou informado
user_id = usuário cliente autenticado
```

---

# 6. Correção de Appointment.createdBy

## Problema atual

O agendamento público falha com:

```text
Argument `createdBy` is missing.
```

## Causa

O relacionamento `Appointment.createdBy` está obrigatório no Prisma, mas agendamento público não é criado por usuário interno do prestador.

## Correção obrigatória

Alterar model `Appointment`:

```prisma
createdByUserId String?
createdBy       User? @relation(fields: [createdByUserId], references: [id])
```

## Regras

* Agendamento manual pelo painel `/app` continua preenchendo `createdByUserId` com o usuário interno autenticado.
* Agendamento público não preenche `createdByUserId`.
* Cliente final autenticado fica representado por `customer.user_id`, não por `createdByUserId`.

---

# 7. Criação de agendamento público autenticado

## Regras

Para confirmar agendamento público, validar:

```text
tenant existe
tenant ativo
assinatura/plano permitem link público
serviço ativo
categoria ativa
cliente final autenticado como CUSTOMER
horário disponível
sem conflito com agendamento ativo
sem conflito com bloqueio
campos personalizados obrigatórios preenchidos
```

## Origem

Todo agendamento público criado deve ter:

```text
origin = PUBLIC_LINK
```

## Status inicial

Agora que existe autenticação do cliente final, respeitar `booking_mode`:

```text
DIRECT -> CONFIRMED
REQUIRES_CONFIRMATION -> REQUESTED
INFORMATIONAL -> WAITING_INFO ou REQUESTED
```

## Relacionamentos Prisma

Criar appointment usando relações obrigatórias via `connect`:

```ts
tenant: { connect: { id: tenant.id } }
customer: { connect: { id: customer.id } }
service: { connect: { id: service.id } }
```

Não enviar `createdBy` no fluxo público.

---

# 8. Fluxo público esperado

## Visitante anônimo

```text
Acessa /[tenantSlug]
↓
Vê serviços e horários
↓
Escolhe serviço e horário
↓
Clica para confirmar
↓
Sistema solicita login ou cadastro
```

## Cadastro

```text
Cliente informa nome, sobrenome, e-mail, telefone, senha e confirmação
↓
Sistema cria user CUSTOMER
↓
Sistema autentica
↓
Sistema retorna ao fluxo
↓
Cliente confirma agendamento
```

## Login

```text
Cliente informa e-mail e senha
↓
Sistema autentica
↓
Sistema retorna ao fluxo
↓
Cliente confirma agendamento
```

---

# 9. Mensagens públicas

## Quando não autenticado

```text
Para concluir o agendamento, faça login ou crie sua conta.
```

## Cadastro realizado

```text
Conta criada com sucesso. Agora você pode confirmar seu agendamento.
```

## Login realizado

```text
Login realizado com sucesso. Continue seu agendamento.
```

## Agendamento DIRECT

```text
Agendamento confirmado com sucesso.
```

## Agendamento REQUIRES_CONFIRMATION

```text
Sua solicitação foi enviada e aguarda confirmação do prestador.
```

## Agendamento INFORMATIONAL

```text
Sua solicitação foi enviada. O prestador entrará em contato para dar continuidade.
```

---

# 10. Audit logs

Registrar audit log para:

```text
CUSTOMER_USER_REGISTERED
PUBLIC_APPOINTMENT_CREATED
```

Se houver login auditado de forma global, registrar login do customer também com evento existente ou específico:

```text
CUSTOMER_LOGIN_SUCCESS
CUSTOMER_LOGIN_FAILED
```

## Segurança

Não registrar:

```text
senha
password_hash
tokens
cookies
```

---

# 11. Appointment events

Ao criar agendamento público, registrar evento:

```text
PUBLIC_BOOKING_CREATED
```

ou `CREATED`, desde que a metadata indique:

```json
{
  "origin": "PUBLIC_LINK",
  "customerUserId": "id do usuário cliente",
  "customerId": "id do customer"
}
```

Não exigir `actor_id` como usuário interno do tenant.

---

# 12. UI

## Página pública

Adicionar no fluxo:

```text
Já tem conta? Entrar
Ainda não tem conta? Criar conta
```

## Formulário de cadastro

Campos:

```text
Nome
Sobrenome
E-mail
Telefone/WhatsApp
Senha
Confirmar senha
```

## Formulário de login

Campos:

```text
E-mail
Senha
```

## Estado autenticado

Quando o cliente estiver logado, mostrar algo simples:

```text
Agendando como: nome@email.com
```

E opção:

```text
Sair
```

---

# 13. Permissões

## CUSTOMER

Pode:

```text
Acessar rotas públicas
Criar agendamento público
```

Não pode:

```text
Acessar /admin
Acessar /app
Ver clientes de outros usuários
Ver agenda interna
Ver audit logs
Ver dados administrativos
```

## USER de prestador

Não deve ser tratado como CUSTOMER no fluxo público.

## SUPER_ADMIN

Não deve ser tratado como CUSTOMER no fluxo público.

---

# 14. Banco de Dados

Criar migration para:

```text
Adicionar global_role CUSTOMER, se enum for usado.
Adicionar customers.user_id opcional, se ainda não existir.
Tornar appointments.created_by_user_id opcional.
Ajustar relação Appointment.createdBy para opcional.
```

Se o schema já permitir parte disso, criar apenas alterações necessárias.

## Índices recomendados

```text
customers.user_id
customers.tenant_id + customers.user_id
users.email
```

---

# Fora do escopo

Não implementar nesta task:

```text
Área do cliente final
Listagem de agendamentos do cliente
Cancelamento pelo cliente final
Remarcação pelo cliente final
Reset de senha por e-mail
Verificação de e-mail
Verificação por WhatsApp
Typebot
WhatsApp
Pagamento
Lembretes automáticos
Marketplace
Avaliações
```

---

# Critérios de aceite

* Visitante anônimo acessa página pública e vê serviços/horários.
* Visitante anônimo não consegue confirmar agendamento sem login.
* Cliente final consegue criar conta com nome, sobrenome, e-mail, telefone e senha.
* Cliente final consegue fazer login com e-mail e senha.
* Cliente final autenticado consegue confirmar agendamento.
* Usuário CUSTOMER não acessa `/admin`.
* Usuário CUSTOMER não acessa `/app`.
* Usuário de prestador não é tratado automaticamente como cliente final no agendamento público.
* Super Admin não é tratado automaticamente como cliente final no agendamento público.
* Agendamento público cria ou atualiza `customer` no tenant.
* `customer.user_id` fica vinculado ao usuário cliente autenticado.
* Agendamento público fica com `origin = PUBLIC_LINK`.
* Status inicial respeita `booking_mode`.
* `Appointment.createdBy` é opcional.
* Agendamento manual pelo painel continua preenchendo `createdByUserId`.
* Agendamento público não exige `createdBy`.
* Campos personalizados continuam funcionando.
* Conflitos e bloqueios continuam funcionando.
* Audit logs são gerados.
* Appointment events são gerados.
* Nenhuma senha ou hash aparece em logs, telas ou respostas.
* Typecheck, lint, tests e build passam.

---

# Instruções para o Codex

Implemente somente a Phase 05.1 Public Customer Auth.

Não implemente funcionalidades fora do escopo.

Não implemente área do cliente, cancelamento pelo cliente, remarcação, reset de senha, Typebot, WhatsApp, pagamento ou lembretes.

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
