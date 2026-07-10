# 01 - Usuários e Permissões

## Objetivo

Definir os tipos de usuário do sistema, seus papéis, permissões e restrições de acesso.

## Papéis principais

O sistema terá quatro papéis principais:

1. Super Admin
2. Admin do Prestador
3. Operador do Prestador
4. Cliente Final

O Cliente Final possui cadastro com login opcional para agendamento público e
área logada com portal do cliente (`/cliente`) para consulta de histórico e
avaliação de serviços.

---

## Super Admin

Usuário interno da plataforma.

Representa o dono ou operador administrativo do SaaS.

### Permissões

Pode:

* Acessar o painel administrativo da plataforma
* Criar prestadores
* Editar prestadores
* Ativar prestadores
* Suspender prestadores
* Cancelar prestadores
* Criar e editar planos
* Controlar assinaturas manualmente
* Registrar pagamento manual
* Alterar vencimento de assinatura
* Alterar plano de um prestador
* Ver agendamentos de qualquer prestador para suporte
* Ver clientes vinculados a qualquer prestador para suporte
* Gerenciar templates globais
* Ver logs administrativos
* Ver métricas globais
* Configurar dados gerais da plataforma

### Restrições

O Super Admin não deve operar a agenda do prestador como rotina normal.

Quando alterar dados operacionais de um prestador, o sistema deve registrar audit log.

---

## Admin do Prestador

Usuário responsável por um negócio dentro da plataforma.

Exemplos:

* Dono da mecânica
* Manicure autônoma
* Dono da barbearia
* Responsável da assistência técnica

### Permissões

Pode, dentro do próprio tenant:

* Acessar painel do prestador
* Editar dados do negócio
* Configurar link público
* Cadastrar categorias de serviço
* Cadastrar serviços
* Editar serviços
* Ativar ou inativar serviços
* Configurar campos personalizados
* Configurar horários de atendimento
* Criar bloqueios de agenda
* Ver clientes
* Ver histórico de clientes
* Ver agendamentos
* Criar agendamento manual
* Confirmar agendamento
* Cancelar agendamento
* Reagendar atendimento
* Finalizar atendimento
* Ver status da assinatura
* Editar mensagens básicas do atendimento
* Consultar solicitações vindas do WhatsApp ou link público

### Restrições

Não pode:

* Alterar plano diretamente
* Alterar vencimento da assinatura
* Ver dados de outros prestadores
* Acessar painel administrativo global
* Criar outro tenant diretamente
* Manipular dados globais da plataforma

---

## Operador do Prestador

Usuário operacional de um prestador.

Pode ser usado futuramente para atendente, recepcionista, funcionário ou mecânico.

### Permissões

Pode, dentro do próprio tenant:

* Ver agenda
* Criar agendamento manual
* Ver clientes
* Criar cliente
* Atualizar status de agendamento
* Ver solicitações
* Registrar observações internas

### Restrições

Não pode:

* Editar assinatura
* Editar plano
* Editar dados críticos do negócio
* Excluir serviços
* Alterar configuração global de horários
* Gerenciar usuários
* Ver dados de outros prestadores

## Observação sobre MVP

O papel Operador pode ser modelado desde o início, mas não precisa ter interface completa na primeira versão.

---

## Cliente Final

Pessoa que agenda ou solicita serviço.

### Autenticação

O Cliente Final pode criar conta e fazer login diretamente pelo formulário de
agendamento público ou pela página `/login`. Uma vez autenticado, tem acesso ao
portal do cliente em `/cliente`.

### Acesso

Pode acessar:

* Link público do prestador (`/[tenantSlug]`)
* Portal do cliente (`/cliente`) — dashboard pessoal
* Perfil (`/cliente/perfil`) — edição de nome, telefone e foto
* Histórico de agendamentos (`/cliente/agendamentos`)
* Detalhe do agendamento (`/cliente/agendamentos/[id]`)
* Página de confirmação de agendamento (`/[tenantSlug]/book/confirm`)
* Fluxo de WhatsApp (via Typebot)

### Pode

* Ver serviços ativos
* Ver informações públicas do prestador
* Escolher serviço
* Informar dados básicos
* Escolher horário disponível
* Criar agendamento ou solicitação
* Consultar agendamento pelo telefone, se disponível
* Ver seus próprios agendamentos (histórico completo)
* Ver detalhes de seus agendamentos (sem dados internos do prestador)
* Editar nome, telefone e foto de perfil
* Avaliar serviços concluídos (nota de 1 a 5 estrelas + comentário opcional)

### Não pode

* Acessar painel administrativo (`/admin`)
* Acessar painel do prestador (`/app`)
* Ver agenda completa do prestador
* Ver clientes
* Ver outros agendamentos (apenas os próprios)
* Ver dados internos (observações internas, eventos de auditoria)
* Ver informações administrativas
* Avaliar agendamentos não concluídos

---

## Isolamento multiempresa

Todo dado operacional deve estar vinculado a um tenant.

Entidades que devem possuir tenant_id:

* Usuários vinculados ao prestador
* Categorias
* Serviços
* Campos personalizados
* Regras de disponibilidade
* Bloqueios
* Clientes
* Agendamentos
* Sessões Typebot
* Eventos de agendamento
* Logs operacionais

Regra obrigatória:

Um usuário de um tenant nunca pode acessar dados de outro tenant, exceto Super Admin em contexto administrativo.

---

## Audit log

Toda ação sensível deve gerar log.

Eventos obrigatórios:

* Login de Super Admin
* Criação de prestador
* Edição de prestador
* Ativação de prestador
* Suspensão de prestador
* Alteração de plano
* Registro de pagamento
* Alteração de vencimento
* Criação de serviço
* Alteração de serviço
* Criação de agendamento
* Cancelamento de agendamento
* Reagendamento
* Alteração manual feita por Super Admin em dados de tenant
* Erro em fluxo Typebot
* Falha em endpoint público

## Critérios de aceite

* Super Admin acessa todos os tenants via painel admin.
* Admin do Prestador acessa apenas seu próprio tenant.
* Operador, quando implementado, possui permissões reduzidas.
* Cliente Final pode agendar sem conta (visitante) ou com conta (login).
* Cliente Final autenticado acessa portal em `/cliente` com dashboard,
  perfil, histórico de agendamentos e avaliação de serviços.
* Cliente Final vê apenas seus próprios agendamentos, sem dados internos
  do prestador.
* Toda consulta operacional respeita tenant_id.
* Ações sensíveis geram audit log.
* Não existe manutenção recorrente dependente exclusivamente de banco ou API manual.
