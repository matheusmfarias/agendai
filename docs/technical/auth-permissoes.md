# Technical - Auth e Permissões

## Objetivo

Definir autenticação, papéis, autorização e isolamento multiempresa do SaaS.

## Modelo de autenticação

A aplicação deve usar autenticação baseada em sessão segura.

A implementação poderá usar Auth.js ou solução própria baseada em cookies httpOnly, desde que cumpra os requisitos deste documento.

## Requisitos obrigatórios

* Senhas nunca devem ser armazenadas em texto puro.
* Usar hash seguro para senhas.
* Sessão deve usar cookie httpOnly.
* Rotas administrativas devem exigir autenticação.
* Rotas do painel do prestador devem exigir autenticação.
* Rotas do portal do cliente (`/cliente/*`) devem exigir autenticação com role CUSTOMER.
* Rotas públicas do cliente final não exigem login.
* Endpoints Typebot devem usar validação própria e proteção por token ou segredo.
* Toda ação sensível deve validar permissão no servidor.

## Tipos de usuário

## Super Admin

Usuário global da plataforma.

Pode acessar:

```text id="3wf1m7"
/admin/*
```

Permissões:

* Gerenciar prestadores
* Gerenciar planos
* Gerenciar assinaturas
* Gerenciar templates
* Consultar agendamentos globais
* Consultar clientes por tenant
* Consultar audit logs
* Alterar configurações globais

## Tenant User

Usuário vinculado a um prestador.

Pode acessar:

```text id="buskkk"
/app/*
```

Permissões dependem do papel dentro do tenant.

Papéis:

```text id="6z57l7"
OWNER
ADMIN
OPERATOR
```

## OWNER

Dono do tenant.

Pode:

* Editar dados do negócio
* Gerenciar serviços
* Gerenciar agenda
* Gerenciar clientes
* Gerenciar agendamentos
* Ver assinatura
* Gerenciar usuários do tenant futuramente

## ADMIN

Administrador operacional do tenant.

Pode:

* Gerenciar serviços
* Gerenciar agenda
* Gerenciar clientes
* Gerenciar agendamentos
* Ver configurações operacionais

Não pode:

* Alterar assinatura
* Alterar dono do tenant
* Excluir tenant

## OPERATOR

Operador operacional.

Pode:

* Ver agenda
* Criar agendamento manual
* Atualizar status de agendamento
* Ver clientes
* Registrar observações

Não pode:

* Alterar configurações críticas
* Alterar serviços, salvo permissão futura
* Alterar assinatura
* Gerenciar usuários

## Cliente Final

Possui cadastro com login opcional para agendamento público. Uma vez autenticado,
tem acesso ao portal do cliente em `/cliente`.

Acessa:

```text id="87me0h"
/[tenantSlug]
/[tenantSlug]/book
/cliente
/cliente/perfil
/cliente/agendamentos
/cliente/agendamentos/[id]
```

### Permissões

Pode:

* Ver serviços públicos de qualquer prestador ativo
* Criar conta ou fazer login pelo formulário de agendamento
* Criar agendamento com campos personalizados e observações
* Ver seus próprios agendamentos (histórico completo)
* Ver detalhes de seus agendamentos (sem dados internos)
* Editar nome, telefone e foto de perfil
* Avaliar serviços concluídos (1 a 5 estrelas + comentário)

### Restrições

Não pode:

* Acessar painel administrativo (`/admin`)
* Acessar painel do prestador (`/app`)
* Ver agenda completa do prestador
* Ver clientes
* Ver agendamentos de outros clientes
* Ver observações internas, eventos de auditoria ou metadados
* Ver dados administrativos
* Avaliar agendamentos não concluídos

### Ownership de agendamentos do cliente

`Appointment.customerUserId` é a fonte autoritativa para o portal do cliente e
para a confirmação do link público. Leituras com contexto de tenant combinam
owner e tenant; a exceção é a listagem agregada global do portal, que consulta
somente por `customerUserId` e não aceita tenant controlado pelo cliente. A
confirmação também exige origem `PUBLIC_LINK`.

`Customer` continua sendo o cadastro operacional mantido pelo tenant. Seu
`userId` pode registrar um vínculo explícito de perfil, mas não autoriza acesso
a agendamentos e nunca transfere histórico automaticamente. Uma correspondência
por telefone não comprova identidade: um Customer legado sem proprietário pode
ser reutilizado operacionalmente em um novo agendamento, cujo ownership fica
somente em `Appointment.customerUserId`; se o Customer já estiver vinculado a
outra pessoa, cria-se um cadastro operacional separado sem alterar o existente.

Agendamentos administrativos, Typebot e legados sem proprietário comprovado
podem manter `customerUserId` nulo. A remoção do User aplica `SET NULL`,
preservando o histórico operacional e removendo o acesso autenticado.

### Regras de autorização

A função `requireCustomer()` em `src/features/auth/permissions.ts` protege
todas as rotas `/cliente`:

```text id="customer-guard"
Usuário não autenticado → redirect /login?redirectTo=/cliente
Usuário autenticado sem role CUSTOMER → redirect /access-denied
Usuário CUSTOMER → retorna dados da sessão
```

As consultas do repositório (`customer-portal-repository.ts`) são isoladas por
`Appointment.customerUserId`. O vínculo opcional `Customer.userId` não participa
da autorização. A listagem agregada do portal pode consultar globalmente por
`customerUserId`, pois não aceita um tenant fornecido pelo cliente; detalhes,
mutações, confirmação pública e superfícies do prestador com contexto de tenant
sempre combinam ownership ou ID do recurso com o tenant resolvido no servidor.

---

# Isolamento por tenant

Toda consulta operacional deve filtrar por tenant_id.

Regra obrigatória:

```text id="s7nv78"
Usuário de tenant não pode acessar dados de outro tenant.
```

Exceção:

```text id="g8tjmq"
Super Admin pode acessar dados de qualquer tenant no contexto administrativo.
```

## Funções utilitárias obrigatórias

Criar camada de permissões com funções como:

```text id="quq8ga"
requireAuth()
requireSuperAdmin()
requireCustomer()
requireTenantAccess(tenantId)
requireTenantRole(tenantId, roles[])
getCurrentUser()
getCurrentTenantContext()
```

## Proteção de rotas

## Rotas admin

Todas as rotas `/admin/*` devem exigir:

```text id="2oivqq"
global_role = SUPER_ADMIN
```

## Rotas app

Todas as rotas `/app/*` devem exigir usuário autenticado vinculado a pelo menos um tenant ativo.

Caso o usuário esteja vinculado a múltiplos tenants, o sistema deve possuir forma de selecionar tenant ativo futuramente.

No MVP, pode assumir um tenant principal por usuário, desde que a modelagem permita múltiplos.

## Rotas cliente

Todas as rotas `/cliente/*` devem exigir:

```text id="customer-routes"
requireCustomer() → redirect /login se não autenticado, /access-denied se não for CUSTOMER
```

## Rotas públicas

Rotas públicas não exigem autenticação, mas devem validar:

* tenant existe
* tenant está ativo
* assinatura permite novos agendamentos
* serviço está ativo
* horário está disponível

## Endpoints Typebot

Endpoints Typebot devem validar:

* tenantSlug válido
* token/segredo de integração, quando configurado
* payload via Zod
* assinatura do tenant permite uso do WhatsApp
* serviço e horário pertencem ao tenant

Não confiar em dados enviados pelo Typebot sem validação.

---

# Sessão

Campos mínimos esperados em sessão:

```text id="fs8w3x"
user_id
email
global_role
active_tenant_id, quando aplicável
```

Não armazenar dados sensíveis desnecessários na sessão.

---

# Senhas

Regras:

* Senha mínima de 8 caracteres
* Hash seguro
* Não retornar password_hash em APIs ou objetos de sessão
* Futuramente permitir reset de senha

Reset de senha pode ficar fora do MVP inicial.

---

# Audit log

Eventos obrigatórios relacionados à autenticação:

```text id="gm2kie"
LOGIN_SUCCESS
LOGIN_FAILED
LOGOUT
ADMIN_ACCESS
TENANT_ACCESS_DENIED
ADMIN_ACCESS_DENIED
```

Eventos sensíveis devem registrar:

* actor_type
* actor_id
* tenant_id, se houver
* event_type
* descrição
* metadata
* ip_address
* created_at

---

# Critérios de aceite

* Super Admin consegue acessar `/admin`.
* Usuário comum não consegue acessar `/admin`.
* Admin do Prestador consegue acessar `/app`.
* Usuário de um tenant não acessa dados de outro tenant.
* Cliente final consegue acessar link público sem login.
* Cliente final autenticado acessa portal `/cliente` e vê apenas seus
  próprios agendamentos.
* Cliente final não acessa `/admin`, `/app` ou dados internos.
* Cliente final avalia apenas agendamentos concluídos (FINISHED).
* Endpoints Typebot validam tenant e payload.
* Dados sensíveis não vazam em respostas.
* Ações sensíveis verificam permissão no servidor.
