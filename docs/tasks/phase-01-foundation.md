# Task - Phase 01 Foundation

## Objetivo

Criar a fundação técnica do SaaS com Next.js, TypeScript, PostgreSQL, Prisma, autenticação inicial, estrutura multiempresa e base para painel admin.

Esta fase não deve implementar agenda, WhatsApp, link público completo ou painel do prestador avançado.

## Stack obrigatória

* Next.js 16 com App Router
* TypeScript
* PostgreSQL
* Prisma ORM
* Tailwind CSS
* shadcn/ui
* Zod
* pnpm

## Escopo

Implementar:

1. Setup do projeto
2. Configuração visual base
3. Configuração Prisma/PostgreSQL
4. Schema inicial do banco
5. Seed inicial
6. Autenticação básica
7. Proteção de rotas
8. Layout admin inicial
9. Layout app inicial
10. Audit log básico

---

# 1. Setup do projeto

Criar projeto Next.js com:

```text id="j1dxlh"
TypeScript
App Router
Tailwind CSS
src directory
ESLint
pnpm
```

Configurar shadcn/ui.

Criar estrutura:

```text id="qojh99"
/src
  /app
    /(admin)
    /(provider)
    /(public)
    /api

  /components
    /ui
    /layout
    /forms
    /tables

  /features
    /auth
    /tenants
    /plans
    /subscriptions
    /templates
    /services
    /availability
    /customers
    /appointments
    /typebot
    /audit

  /lib
  /server
  /types

/docs
```

---

# 2. Prisma e banco

Configurar Prisma com PostgreSQL.

Criar schema inicial com as entidades:

```text id="dh6v0n"
users
tenants
tenant_users
plans
subscriptions
audit_logs
```

As demais entidades podem ser criadas em fases futuras, mas o schema deve permitir expansão.

## users

Campos mínimos:

```text id="zv38lu"
id
name
email
password_hash
global_role
is_active
last_login_at
created_at
updated_at
```

## tenants

Campos mínimos:

```text id="wndmqv"
id
name
slug
responsible_name
email
whatsapp
segment
city
state
status
created_at
updated_at
```

## tenant_users

Campos mínimos:

```text id="5zk3vx"
id
tenant_id
user_id
role
is_active
created_at
updated_at
```

## plans

Campos mínimos:

```text id="9kprpu"
id
name
description
monthly_price
annual_price
whatsapp_enabled
public_link_enabled
is_active
created_at
updated_at
```

## subscriptions

Campos mínimos:

```text id="zzn6bd"
id
tenant_id
plan_id
status
billing_cycle
price
starts_at
expires_at
last_payment_at
payment_method
internal_notes
created_at
updated_at
```

## audit_logs

Campos mínimos:

```text id="43il1e"
id
tenant_id
actor_type
actor_id
event_type
description
metadata
ip_address
created_at
```

---

# 3. Seed inicial

Criar seed para:

## Super Admin

```text id="70j47a"
Nome: Super Admin
E-mail: admin@example.com
Senha: definida por variável de ambiente ou valor documentado apenas para desenvolvimento
global_role: SUPER_ADMIN
```

## Plano inicial

```text id="w8jbvd"
Nome: Inicial
Valor mensal: 49.90
Valor anual: 499.00
WhatsApp habilitado: true
Link público habilitado: true
Ativo: true
```

Seed não deve ser usada para manutenção recorrente.

---

# 4. Autenticação

Implementar autenticação básica com:

* login por e-mail e senha
* logout
* sessão segura
* proteção de rotas
* hash de senha

Rotas mínimas:

```text id="0fmj5s"
/login
/logout ou action equivalente
/admin
/app
```

## Regras

* Super Admin acessa `/admin`
* Usuário sem global_role SUPER_ADMIN não acessa `/admin`
* Usuário autenticado vinculado a tenant acessa `/app`
* Usuário não autenticado é redirecionado para `/login`

---

# 5. Layouts

Criar layout base para:

## Admin

```text id="tk6u44"
/admin
```

Deve conter:

* sidebar
* header
* identificação do usuário
* navegação inicial

Itens de menu:

```text id="k65e4o"
Dashboard
Prestadores
Planos
Assinaturas
Templates
Agendamentos
Clientes
Logs
Configurações
```

## Provider App

```text id="mupwfk"
/app
```

Itens de menu:

```text id="d922wa"
Dashboard
Agenda
Serviços
Clientes
Horários
Configurações
Assinatura
```

Nesta fase, as páginas podem ser placeholders protegidos.

---

# 6. Audit log básico

Implementar serviço central:

```text id="pe4kg5"
createAuditLog(input)
```

Deve permitir registrar:

* actor_type
* actor_id
* tenant_id opcional
* event_type
* description
* metadata
* ip_address opcional

Registrar no mínimo:

```text id="18vgm5"
LOGIN_SUCCESS
LOGIN_FAILED
ADMIN_ACCESS_DENIED
TENANT_ACCESS_DENIED
```

---

# 7. Páginas mínimas

Criar páginas protegidas:

```text id="sfauns"
/admin/dashboard
/admin/tenants
/admin/plans
/admin/subscriptions
/admin/audit-logs

/app/dashboard
```

Nesta fase, podem exibir dados básicos ou placeholders, desde que respeitem autenticação e layout.

---

# Fora do escopo desta fase

Não implementar ainda:

* CRUD completo de prestadores
* CRUD completo de planos
* controle de assinatura por interface
* serviços
* agenda
* clientes
* link público
* Typebot
* WhatsApp
* templates completos
* pagamento online
* app mobile
* marketplace

---

# Critérios de aceite

* Projeto roda localmente com pnpm.
* Next.js, TypeScript, Tailwind e shadcn/ui configurados.
* Prisma conectado ao PostgreSQL.
* Migrations criam tabelas iniciais.
* Seed cria Super Admin e Plano Inicial.
* Login funciona.
* Logout funciona.
* `/admin` exige Super Admin.
* `/app` exige usuário autenticado vinculado a tenant.
* Layout admin existe.
* Layout provider existe.
* Audit log básico existe.
* README explica como configurar `.env`, rodar migrations, seed e iniciar o projeto.

---

# Instruções para o Codex

Antes de implementar, leia:

```text id="mrk4p9"
/docs/specs/00-visao-produto.md
/docs/specs/01-usuarios-permissoes.md
/docs/specs/02-admin-plataforma.md
/docs/technical/stack.md
/docs/technical/arquitetura.md
/docs/technical/banco-dados.md
/docs/technical/auth-permissoes.md
/docs/technical/padroes-codigo.md
```

Não implemente funcionalidades fora do escopo.

Não crie dados administrativos que dependam exclusivamente de seed, banco ou API manual para manutenção recorrente.

Ao finalizar, informe:

```text id="r4fa58"
- Arquivos criados
- Arquivos alterados
- Como rodar localmente
- Variáveis de ambiente necessárias
- Pendências conhecidas
```
