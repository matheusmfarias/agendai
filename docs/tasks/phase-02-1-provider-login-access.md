# Task - Phase 02.1 Provider Login Access

## Objetivo

Corrigir uma lacuna operacional da Phase 02 Admin Platform.

Atualmente, o painel admin permite criar um prestador/tenant, mas não permite criar o usuário responsável pelo prestador com senha. Como o painel `/app` exige usuário autenticado vinculado a um tenant ativo, não existe forma operacional de o prestador fazer login após ser criado.

Esta fase deve permitir que o Super Admin crie e mantenha o acesso inicial do prestador ao painel `/app`.

## Dependências

Esta task depende da conclusão da:

```text
/docs/tasks/phase-01-foundation.md
/docs/tasks/phase-02-admin-platform.md
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
```

## Problema

A Phase 02 permite criar:

* tenant/prestador
* assinatura inicial
* plano vinculado
* status administrativo

Mas não cria:

* usuário responsável pelo tenant
* senha inicial
* vínculo `tenant_users` com role `OWNER`
* ação administrativa para redefinir senha do responsável

Sem isso, o prestador não consegue acessar `/app`.

## Escopo

Implementar:

1. Criação de usuário responsável ao criar prestador
2. Vínculo do usuário ao tenant com role `OWNER`
3. Exibição do responsável no detalhe do prestador
4. Redefinição administrativa de senha do responsável
5. Validações com Zod
6. Audit logs para ações sensíveis
7. Garantia de acesso ao `/app`
8. Garantia de bloqueio ao `/admin` para usuário do prestador

---

# 1. Criação do responsável no cadastro de prestador

## Local

```text
/admin/tenants/new
```

## Adicionar campos

```text
Nome do usuário responsável
E-mail de login do responsável
Senha inicial
Confirmar senha
```

## Regras

Ao criar um prestador, o sistema deve:

1. Criar o tenant.
2. Criar o usuário responsável.
3. Definir `global_role = USER`.
4. Gerar `password_hash` seguro.
5. Criar vínculo em `tenant_users`.
6. Definir role do vínculo como `OWNER`.
7. Definir `tenant_users.is_active = true`.
8. Criar assinatura inicial conforme fluxo já implementado.
9. Registrar audit logs.

## Validações

Usar Zod.

Validações mínimas:

```text
Nome do responsável obrigatório
E-mail válido
E-mail único no MVP
Senha mínima de 8 caracteres
Confirmação de senha obrigatória
Confirmação de senha igual à senha inicial
```

## Regra para e-mail já existente

No MVP, bloquear criação se já existir usuário com o mesmo e-mail.

Mensagem sugerida:

```text
Já existe um usuário com este e-mail.
```

Não implementar vínculo de usuário existente nesta fase.

---

# 2. Vínculo tenant_users

Ao criar o prestador, criar registro em `tenant_users`:

```text
tenant_id = tenant criado
user_id = usuário responsável criado
role = OWNER
is_active = true
```

## Regras

* O vínculo deve ser criado na mesma transação do tenant, usuário e assinatura.
* Se alguma etapa falhar, a transação inteira deve ser revertida.
* O usuário responsável deve conseguir fazer login e acessar `/app`.

---

# 3. Detalhe do prestador

## Local

```text
/admin/tenants/[id]
```

## Exibir seção

```text
Usuário responsável
```

Campos:

```text
Nome
E-mail de login
Role no tenant
Status do usuário
Status do vínculo
Criado em
```

## Ações

Disponibilizar ação:

```text
Redefinir senha
```

---

# 4. Redefinir senha do responsável

## Local sugerido

Pode ser uma rota, modal ou página dedicada.

Exemplos aceitos:

```text
/admin/tenants/[id]/reset-password
```

ou ação dentro do detalhe:

```text
/admin/tenants/[id]
```

## Campos

```text
Nova senha
Confirmar nova senha
```

## Validações

```text
Senha mínima de 8 caracteres
Confirmação obrigatória
Confirmação igual à nova senha
```

## Regras

* Apenas Super Admin pode redefinir senha.
* Atualizar `password_hash`.
* Não exibir senha atual.
* Não registrar a senha em audit log.
* Registrar audit log informando que a senha foi redefinida.
* Após redefinir, o usuário deve conseguir login com a nova senha.

---

# 5. Permissões

## Usuário responsável do prestador

Deve conseguir:

```text
/login
/app
/app/dashboard
```

Não deve conseguir:

```text
/admin
/admin/*
```

## Condições para acessar `/app`

O acesso deve ser permitido somente se:

```text
user.is_active = true
tenant_users.is_active = true
tenant.status = ACTIVE
```

Se o tenant estiver `SUSPENDED` ou `CANCELED`, o acesso operacional deve ser bloqueado ou redirecionado conforme regra já existente.

---

# 6. Audit Logs

Registrar audit log para:

```text
TENANT_OWNER_USER_CREATED
TENANT_OWNER_LINKED
TENANT_OWNER_PASSWORD_RESET
```

Se preferir reaproveitar eventos existentes, garantir que a descrição e metadata sejam claras.

## Metadata sugerida

Para criação do usuário:

```json
{
  "tenantId": "id do tenant",
  "userId": "id do usuário",
  "email": "email do responsável",
  "role": "OWNER"
}
```

Para reset de senha:

```json
{
  "tenantId": "id do tenant",
  "userId": "id do usuário",
  "email": "email do responsável"
}
```

Não registrar senha nem hash no metadata.

---

# 7. Segurança

Regras obrigatórias:

* Não retornar `password_hash` em telas, APIs ou logs.
* Não registrar senha em audit log.
* Validar permissão Super Admin no servidor.
* Não confiar apenas na UI.
* Criar/alterar senha apenas com hash seguro.
* Transações devem evitar tenant sem owner ou owner sem tenant.

---

# Fora do escopo

Não implementar nesta fase:

```text
Painel operacional completo do prestador
Serviços
Agenda
Clientes
Link público
Typebot
WhatsApp
Templates
Múltiplos usuários por tenant
Convite por e-mail
Esqueci minha senha
Vínculo de usuário existente
Troca de senha pelo próprio prestador
```

---

# Critérios de aceite

* Super Admin consegue criar um prestador com usuário responsável e senha inicial.
* O usuário responsável é criado com `global_role = USER`.
* O usuário responsável é vinculado ao tenant com role `OWNER`.
* O usuário responsável consegue fazer login.
* O usuário responsável consegue acessar `/app`.
* O usuário responsável não consegue acessar `/admin`.
* O detalhe do prestador mostra o usuário responsável.
* Super Admin consegue redefinir a senha do responsável.
* A nova senha funciona no login.
* A senha antiga deixa de funcionar após redefinição.
* A criação de tenant, usuário, vínculo e assinatura ocorre em transação.
* Ações sensíveis geram audit log.
* Nenhuma senha ou hash aparece em logs, telas ou responses.
* Não é necessário mexer no banco manualmente para liberar acesso ao prestador.

---

# Instruções para o Codex

Implemente somente a Phase 02.1 Provider Login Access.

Não implemente funcionalidades fora do escopo.

Não implemente serviços, agenda, clientes, link público, Typebot ou WhatsApp.

Não altere documentação existente, exceto se encontrar erro claro e justificar.

Ao finalizar, informe:

```text
- Arquivos criados
- Arquivos alterados
- Migrations criadas, se houver
- Como testar
- Validações executadas
- Pendências conhecidas
```
