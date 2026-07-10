# 02 - Admin da Plataforma

## Objetivo

Definir o painel administrativo global usado pelo dono da plataforma para operar o SaaS sem depender de banco de dados, seeds, scripts ou chamadas diretas de API.

O painel admin deve ser tratado como parte central do produto.

## Princípio obrigatório

Nenhum dado operacional essencial do SaaS deve depender exclusivamente de inserção manual via banco, seed ou chamada direta de API.

Toda manutenção recorrente deve possuir interface administrativa protegida por permissão.

---

## Usuário autorizado

Apenas usuários com papel Super Admin podem acessar o painel administrativo da plataforma.

---

## Módulos do painel admin

O MVP deve possuir os seguintes módulos:

1. Dashboard
2. Prestadores
3. Planos
4. Assinaturas
5. Templates
6. Agendamentos
7. Clientes
8. Logs/Eventos
9. Configurações

---

# 1. Dashboard

## Objetivo

Exibir visão geral da operação do SaaS.

## Métricas mínimas

* Total de prestadores
* Prestadores ativos
* Prestadores em trial
* Prestadores vencidos
* Prestadores suspensos
* Agendamentos de hoje
* Agendamentos dos últimos 7 dias
* Agendamentos por origem
* Receita mensal prevista
* Assinaturas próximas do vencimento
* Novos prestadores no mês

## Critérios de aceite

* O Super Admin visualiza os principais indicadores em uma tela inicial.
* Métricas devem considerar apenas dados reais do banco.
* Métricas financeiras podem ser baseadas no valor configurado das assinaturas, sem gateway.

---

# 2. Prestadores

## Objetivo

Permitir gerenciamento completo dos tenants da plataforma.

## Lista de prestadores

Campos mínimos:

* Nome do negócio
* Responsável
* Segmento
* Cidade
* Status da conta
* Status da assinatura
* Plano
* Vencimento
* Data de cadastro
* Último acesso
* Ações

## Ações

O Super Admin pode:

* Criar prestador
* Editar prestador
* Ver detalhes
* Ativar conta
* Suspender conta
* Cancelar conta
* Alterar plano
* Alterar vencimento
* Ver serviços
* Ver agenda
* Ver agendamentos
* Ver logs do prestador

## Detalhe do prestador

Deve exibir:

* Dados do negócio
* Dados do responsável
* Slug/link público
* WhatsApp
* Segmento
* Plano
* Status da assinatura
* Data de vencimento
* Serviços cadastrados
* Agendamentos recentes
* Histórico administrativo
* Observações internas

## Regras

* O slug deve ser único.
* Prestador suspenso não deve receber novos agendamentos pelo link público ou WhatsApp.
* Prestador vencido pode entrar em período de tolerância conforme regra de assinatura.
* Alterações sensíveis geram audit log.

---

# 3. Planos

## Objetivo

Permitir configuração dos planos comerciais da plataforma.

## Campos do plano

* Nome
* Descrição
* Valor mensal
* Valor anual
* Limite de serviços
* Limite de usuários
* Limite de agendamentos, se houver
* WhatsApp habilitado
* Link público habilitado
* Status ativo/inativo

## Ações

* Criar plano
* Editar plano
* Ativar/inativar plano
* Ver prestadores vinculados

## Regras

* Planos inativos não podem ser escolhidos para novas assinaturas.
* Prestadores já vinculados a um plano inativo continuam com o plano até alteração manual.
* O MVP pode iniciar com apenas um plano ativo.

---

# 4. Assinaturas

## Objetivo

Controlar o pagamento do prestador para a plataforma.

No MVP, a assinatura será controlada manualmente pelo Super Admin, sem gateway de pagamento.

## Campos da assinatura

* Prestador
* Plano
* Ciclo: mensal ou anual
* Valor
* Status
* Data de início
* Data de vencimento
* Data do último pagamento
* Forma de pagamento
* Observações internas

## Status

* trial
* active
* past_due
* suspended
* canceled

## Ações

* Criar assinatura
* Registrar pagamento
* Estender vencimento
* Alterar plano
* Suspender assinatura
* Reativar assinatura
* Cancelar assinatura
* Adicionar observação interna

## Regras de vencimento

Regra inicial sugerida:

* Até 3 dias vencido: conta funciona com aviso interno.
* Após 7 dias vencido: bloquear novos agendamentos via link e WhatsApp.
* Após 15 dias vencido: suspender link público e fluxo WhatsApp.
* Dados não devem ser apagados automaticamente.

Mensagem pública em caso de indisponibilidade:

"Este serviço de agendamento está temporariamente indisponível. Entre em contato diretamente com o estabelecimento."

Nunca informar publicamente que o prestador está inadimplente.

---

# 5. Templates

## Objetivo

Permitir criação de modelos globais por segmento para acelerar onboarding de prestadores.

## Exemplos de templates

* Mecânica
* Manicure
* Barbearia
* Cabeleireiro
* Estética
* Assistência técnica
* Genérico

## Cada template pode conter

* Categorias sugeridas
* Serviços sugeridos
* Campos personalizados sugeridos
* Mensagens padrão
* Regras iniciais de agenda
* Fluxo WhatsApp sugerido

## Regras

* Ao criar um prestador, o template pode ser aplicado como base inicial.
* O template é copiado para o tenant.
* Alterações posteriores no template global não alteram automaticamente tenants existentes.
* Reaplicar template em tenant existente deve ser ação explícita e registrada em audit log.

---

# 6. Agendamentos

## Objetivo

Permitir consulta global de agendamentos para suporte.

## Filtros

* Prestador
* Cliente
* Data
* Serviço
* Status
* Origem

## Origem

* link_publico
* whatsapp
* painel_manual
* admin

## Ações

* Ver detalhes
* Ver histórico
* Corrigir status, se necessário

## Regras

* Alterações feitas pelo Super Admin em agendamentos devem gerar audit log.
* O admin não deve operar agenda do prestador como rotina normal.
* Acesso global existe para suporte e auditoria.

---

# 7. Clientes

## Objetivo

Permitir consulta de clientes finais para suporte.

## Filtros

* Nome
* Telefone
* Prestador
* Cidade
* Último agendamento

## Regras

* O cliente final pertence ao contexto de um prestador.
* O histórico do cliente é separado por tenant.
* A plataforma não deve tratar clientes finais como leads globais comerciais.
* Consulta administrativa deve gerar log quando envolver detalhe sensível.

---

# 8. Logs/Eventos

## Objetivo

Registrar eventos importantes do sistema para suporte, auditoria e diagnóstico.

## Campos mínimos

* id
* actor_type
* actor_id
* tenant_id
* event_type
* description
* metadata
* ip
* created_at

## Eventos obrigatórios

* Criação de prestador
* Edição de prestador
* Ativação de prestador
* Suspensão de prestador
* Alteração de plano
* Registro de pagamento
* Alteração de vencimento
* Criação de serviço
* Edição de serviço
* Criação de agendamento
* Cancelamento
* Reagendamento
* Login administrativo
* Erro de integração Typebot
* Falha em endpoint público

---

# 9. Configurações

## Objetivo

Centralizar configurações globais da plataforma.

## Configurações iniciais

* Nome da plataforma
* E-mail de suporte
* WhatsApp de suporte
* Dias de tolerância de vencimento
* Mensagem padrão de suspensão pública
* Configurações gerais de trial
* Status de manutenção, futuramente

---

## Critérios gerais de aceite

* Super Admin consegue operar o SaaS sem acessar banco manualmente.
* É possível criar um prestador completo pelo painel admin.
* É possível controlar assinatura manualmente pelo painel admin.
* É possível registrar pagamento manual.
* É possível alterar vencimento de assinatura.
* É possível suspender e reativar prestador.
* É possível consultar agendamentos por prestador.
* É possível consultar logs de eventos.
* Toda ação sensível gera audit log.
* Prestador suspenso ou bloqueado não recebe novos agendamentos pelo link público ou WhatsApp.
