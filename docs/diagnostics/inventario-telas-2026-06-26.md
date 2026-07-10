# Inventário de Telas — AgendaZap

**Data:** 2026-06-26
**Total de telas:** 49 (excluindo redirecionamentos automáticos)

---

## Admin (17 telas)

### Dashboard

| Campo | Valor |
|---|---|
| **Rota** | `/admin/dashboard` |
| **Objetivo** | Visão geral da plataforma com indicadores quantitativos (prestadores, assinaturas, receita, planos) |
| **Público** | SUPER_ADMIN |
| **Problemas UX/UI** | 10 métricas com peso visual idêntico — sem hierarquia entre primárias e secundárias. Nenhum gráfico, tendência ou comparativo temporal. Cards são genéricos (ícone + número). |
| **Prioridade redesign** | Média |
| **Risco de quebrar regra de negócio** | Baixo — é tela informativa, sem mutations |

### Plans — listagem

| Campo | Valor |
|---|---|
| **Rota** | `/admin/plans` |
| **Objetivo** | Listar, visualizar e acessar edição/criação de planos comerciais |
| **Público** | SUPER_ADMIN |
| **Problemas UX/UI** | Tabela sem paginação/busca/ordenacão. Sem wrapper responsivo. Botão "Novo plano" no topo. |
| **Prioridade redesign** | Média |
| **Risco de quebrar regra de negócio** | Baixo — UI de listagem, mutations em páginas separadas |

### Plans — novo

| Campo | Valor |
|---|---|
| **Rota** | `/admin/plans/new` |
| **Objetivo** | Criar novo plano comercial |
| **Público** | SUPER_ADMIN |
| **Problemas UX/UI** | Formulário sem indicação de campos obrigatórios. Sem helper text nos campos de preço. |
| **Prioridade redesign** | Baixa |
| **Risco de quebrar regra de negócio** | Médio — formulário de criação, validação de preços e flags (whatsappEnabled, publicLinkEnabled) |

### Plans — edição

| Campo | Valor |
|---|---|
| **Rota** | `/admin/plans/[id]/edit` |
| **Objetivo** | Editar plano existente |
| **Público** | SUPER_ADMIN |
| **Problemas UX/UI** | Mesmos problemas do formulário de criação. Sem confirmação antes de salvar alterações que afetam prestadores existentes. |
| **Prioridade redesign** | Baixa |
| **Risco de quebrar regra de negócio** | Alto — alteração de plano afeta todas as assinaturas vinculadas |

### Tenants — listagem

| Campo | Valor |
|---|---|
| **Rota** | `/admin/tenants` |
| **Objetivo** | Listar todos os prestadores com status, assinatura, localização |
| **Público** | SUPER_ADMIN |
| **Problemas UX/UI** | 12 colunas sem wrapper responsivo. Sem paginação/busca/filtro. Tabela TanStack sem features. Link para criar na action bar. |
| **Prioridade redesign** | Alta |
| **Risco de quebrar regra de negócio** | Baixo — mutations via server actions separadas |

### Tenants — novo

| Campo | Valor |
|---|---|
| **Rota** | `/admin/tenants/new` |
| **Objetivo** | Criar novo prestador com dados do negócio, acesso do responsável e assinatura inicial |
| **Público** | SUPER_ADMIN |
| **Problemas UX/UI** | Formulário longo com 3 seções sem indicador de progresso. Campos obrigatórios não sinalizados. Input de data nativo para vencimento. Sem validação inline de slug. |
| **Prioridade redesign** | Média |
| **Risco de quebrar regra de negócio** | Alto — cria tenant + tenant_user + subscription. Isolamento multi-tenant e permissões críticos. |

### Tenants — detalhe

| Campo | Valor |
|---|---|
| **Rota** | `/admin/tenants/[id]` |
| **Objetivo** | Visualizar dados completos do prestador, ações de status, usuário responsável, assinatura, logs |
| **Público** | SUPER_ADMIN |
| **Problemas UX/UI** | 6 cards em grid 3-col assimétrico. Card "Agendamentos recentes" é stub vazio ocupando 2/3 de linha. 5 botões outline de igual peso no header. `window.confirm()` para suspender/cancelar. Logs sem paginação. Sem breadcrumb. |
| **Prioridade redesign** | Alta |
| **Risco de quebrar regra de negócio** | Alto — ações de status (suspender/cancelar/reativar), links para reset de senha e criação de acesso |

### Tenants — edição

| Campo | Valor |
|---|---|
| **Rota** | `/admin/tenants/[id]/edit` |
| **Objetivo** | Editar dados cadastrais do prestador |
| **Público** | SUPER_ADMIN |
| **Problemas UX/UI** | Mesmo formulário do "novo" mas sem seções de acesso e assinatura. Sem indicação do que é editável vs. somente leitura. |
| **Prioridade redesign** | Baixa |
| **Risco de quebrar regra de negócio** | Médio — alteração de slug quebra link público |

### Tenants — acesso

| Campo | Valor |
|---|---|
| **Rota** | `/admin/tenants/[id]/access` |
| **Objetivo** | Criar usuário responsável para tenant existente |
| **Público** | SUPER_ADMIN |
| **Problemas UX/UI** | Não lido em detalhe — provável formulário simples com name, email, password, role |
| **Prioridade redesign** | Baixa |
| **Risco de quebrar regra de negócio** | Médio — cria usuário + vínculo tenant_user |

### Tenants — reset de senha

| Campo | Valor |
|---|---|
| **Rota** | `/admin/tenants/[id]/reset-password` |
| **Objetivo** | Redefinir senha do usuário responsável |
| **Público** | SUPER_ADMIN |
| **Problemas UX/UI** | Não lido em detalhe — provável formulário simples com campo de nova senha |
| **Prioridade redesign** | Baixa |
| **Risco de quebrar regra de negócio** | Médio — alteração de credencial de acesso |

### Tenants — templates

| Campo | Valor |
|---|---|
| **Rota** | `/admin/tenants/[id]/templates` |
| **Objetivo** | Visualizar e aplicar templates de segmento (mecânica, barbearia, etc.) ao tenant |
| **Público** | SUPER_ADMIN |
| **Problemas UX/UI** | Página rica (preview, badges "já existe"/"será criado", resumo pós-aplicação). Melhor tela do produto em UX. Checkbox de horários sugeridos não responde sem template selecionado. Preview completo sem progressive disclosure. |
| **Prioridade redesign** | Baixa |
| **Risco de quebrar regra de negócio** | Médio — aplicação idempotente de categorias, serviços, campos e horários |

### Tenants — credenciais Typebot

| Campo | Valor |
|---|---|
| **Rota** | `/admin/tenants/[id]/typebot-credentials` |
| **Objetivo** | Gerenciar credenciais Typebot do tenant: visualizar status de integração, gerar token, revogar |
| **Público** | SUPER_ADMIN |
| **Problemas UX/UI** | Token reveal é excelente (código em alert verde + botão copiar + aviso "não será exibido novamente"). Tabela de credenciais sem wrapper responsivo (7 colunas). Input de nome do token sem validação de tamanho ou charset. Loading states são texto ("Carregando..."). |
| **Prioridade redesign** | Baixa |
| **Risco de quebrar regra de negócio** | Alto — geração/revogação de token Typebot afeta integração WhatsApp |

### Subscriptions — listagem

| Campo | Valor |
|---|---|
| **Rota** | `/admin/subscriptions` |
| **Objetivo** | Listar todas as assinaturas com status, plano, ciclo, valores e datas |
| **Público** | SUPER_ADMIN |
| **Problemas UX/UI** | 10 colunas sem wrapper responsivo. Sem paginação/busca/filtro. Sem botão de criar (assinaturas são criadas junto com tenant). |
| **Prioridade redesign** | Alta |
| **Risco de quebrar regra de negócio** | Baixo — UI de listagem |

### Subscriptions — detalhe

| Campo | Valor |
|---|---|
| **Rota** | `/admin/subscriptions/[id]` |
| **Objetivo** | Visualizar dados da assinatura, ações de status, dados do prestador vinculado |
| **Público** | SUPER_ADMIN |
| **Problemas UX/UI** | Grid 3-col com 4 cards (dados, status, prestador, observações). 3 botões outline de igual peso (editar, pagamento, vencimento). `window.confirm()` para suspender/cancelar. Observações sem edição inline. |
| **Prioridade redesign** | Média |
| **Risco de quebrar regra de negócio** | Alto — ações de status afetam acesso do prestador |

### Subscriptions — edição

| Campo | Valor |
|---|---|
| **Rota** | `/admin/subscriptions/[id]/edit` |
| **Objetivo** | Editar plano e dados da assinatura |
| **Público** | SUPER_ADMIN |
| **Problemas UX/UI** | Não lido em detalhe |
| **Prioridade redesign** | Baixa |
| **Risco de quebrar regra de negócio** | Médio — alteração de plano afeta capacidades do prestador |

### Subscriptions — pagamento

| Campo | Valor |
|---|---|
| **Rota** | `/admin/subscriptions/[id]/payment` |
| **Objetivo** | Registrar pagamento manual |
| **Público** | SUPER_ADMIN |
| **Problemas UX/UI** | Não lido em detalhe |
| **Prioridade redesign** | Baixa |
| **Risco de quebrar regra de negócio** | Médio — registro financeiro manual |

### Subscriptions — vencimento

| Campo | Valor |
|---|---|
| **Rota** | `/admin/subscriptions/[id]/expiration` |
| **Objetivo** | Alterar data de vencimento manualmente |
| **Público** | SUPER_ADMIN |
| **Problemas UX/UI** | Não lido em detalhe |
| **Prioridade redesign** | Baixa |
| **Risco de quebrar regra de negócio** | Alto — alteração de vencimento afeta política de subscription enforcement |

### Audit logs — listagem

| Campo | Valor |
|---|---|
| **Rota** | `/admin/audit-logs` |
| **Objetivo** | Consultar eventos de auditoria com filtros por tenant, tipo de evento e data |
| **Público** | SUPER_ADMIN |
| **Problemas UX/UI** | Filtro funcional com persistência em search params. 7 colunas sem wrapper responsivo. Sem paginação (pode chegar a milhares). Descrição truncada com `max-w-md` sem tooltip. |
| **Prioridade redesign** | Média |
| **Risco de quebrar regra de negócio** | Baixo — consulta imutável, sem mutations |

### Audit logs — detalhe

| Campo | Valor |
|---|---|
| **Rota** | `/admin/audit-logs/[id]` |
| **Objetivo** | Visualizar detalhes de um evento de auditoria |
| **Público** | SUPER_ADMIN |
| **Problemas UX/UI** | Não lido em detalhe |
| **Prioridade redesign** | Baixa |
| **Risco de quebrar regra de negócio** | Baixo — visualização imutável |

### Typebot simulator

| Campo | Valor |
|---|---|
| **Rota** | `/admin/typebot-simulator` |
| **Objetivo** | Simular fluxo conversacional Typebot sem WhatsApp real |
| **Público** | SUPER_ADMIN |
| **Problemas UX/UI** | Componente delegado a `TypebotSimulator` client component — não inspecionado em detalhe. |
| **Prioridade redesign** | Baixa |
| **Risco de quebrar regra de negócio** | Médio — cria agendamentos com `origin = WHATSAPP` |

### Templates (global)

| Campo | Valor |
|---|---|
| **Rota** | `/admin/templates` |
| **Objetivo** | Área reservada para templates globais |
| **Público** | SUPER_ADMIN |
| **Problemas UX/UI** | **Stub.** Renderiza `FoundationPlaceholder`. Acessível via sidebar mas sem funcionalidade. |
| **Prioridade redesign** | Baixa (remover da sidebar até existir) |
| **Risco de quebrar regra de negócio** | Nenhum — não implementado |

### Appointments (admin)

| Campo | Valor |
|---|---|
| **Rota** | `/admin/appointments` |
| **Objetivo** | Consulta administrativa de agendamentos |
| **Público** | SUPER_ADMIN |
| **Problemas UX/UI** | **Stub.** Renderiza `FoundationPlaceholder`. |
| **Prioridade redesign** | Baixa |
| **Risco de quebrar regra de negócio** | Nenhum — não implementado |

### Customers (admin)

| Campo | Valor |
|---|---|
| **Rota** | `/admin/customers` |
| **Objetivo** | Suporte a clientes por tenant |
| **Público** | SUPER_ADMIN |
| **Problemas UX/UI** | **Stub.** Renderiza `FoundationPlaceholder`. |
| **Prioridade redesign** | Baixa |
| **Risco de quebrar regra de negócio** | Nenhum — não implementado |

### Settings (admin)

| Campo | Valor |
|---|---|
| **Rota** | `/admin/settings` |
| **Objetivo** | Configurações globais da plataforma |
| **Público** | SUPER_ADMIN |
| **Problemas UX/UI** | **Stub.** Renderiza `FoundationPlaceholder`. |
| **Prioridade redesign** | Baixa |
| **Risco de quebrar regra de negócio** | Nenhum — não implementado |

### Admin redirect

| Campo | Valor |
|---|---|
| **Rota** | `/admin` |
| **Objetivo** | Redirecionar para `/admin/dashboard` |
| **Público** | SUPER_ADMIN |
| **Problemas UX/UI** | Redirecionamento automático — não é uma tela |
| **Prioridade redesign** | — |
| **Risco de quebrar regra de negócio** | Nenhum |

---

## Prestador (21 telas)

### Dashboard

| Campo | Valor |
|---|---|
| **Rota** | `/app/dashboard` |
| **Objetivo** | Visão geral do negócio: status, métricas, avisos de assinatura, onboarding e próximos agendamentos |
| **Público** | OWNER, ADMIN |
| **Problemas UX/UI** | 12 métricas com peso visual idêntico. Alertas de assinatura e onboarding competem visualmente. Tabela de próximos agendamentos sem wrapper responsivo. Título "configurações operacionais" é linguagem de sistema. Card de onboarding tímido visualmente (borda `primary/40`, bg `primary/5`). |
| **Prioridade redesign** | Alta |
| **Risco de quebrar regra de negócio** | Médio — exibe avisos de subscription enforcement que afetam comportamento do prestador |

### Onboarding

| Campo | Valor |
|---|---|
| **Rota** | `/app/onboarding` |
| **Objetivo** | Wizard de configuração inicial em 5 etapas: dados do negócio, serviços, horários, link público, revisão |
| **Público** | OWNER, ADMIN |
| **Problemas UX/UI** | Stepper horizontal sem labels nas etapas (só ícones). Serviços e horários mostram estado atual + opção de aplicar templates. Formulário da etapa 1 sem React Hook Form (usa action nativa). Sem indicador de progresso explícito ("Etapa 2 de 5"). Template sugerido aparece mesmo sem segmento definido. Preview do link público não é clicável. |
| **Prioridade redesign** | Média |
| **Risco de quebrar regra de negócio** | Alto — atualiza dados do tenant, aplica templates, altera onboardingStatus. Integração com subscription enforcement. |

### Settings

| Campo | Valor |
|---|---|
| **Rota** | `/app/settings` |
| **Objetivo** | Manter dados do negócio: nome, responsável, contato, endereço, descrição |
| **Público** | OWNER, ADMIN |
| **Problemas UX/UI** | 8 campos + textarea em loop `map()` sem agrupamento semântico (identidade vs. contato vs. localização). Sem indicação de campos obrigatórios. Sem helper text. Aviso sobre slug/status/plano gerenciados pela plataforma é bom. |
| **Prioridade redesign** | Média |
| **Risco de quebrar regra de negócio** | Médio — alteração de nome, WhatsApp e endereço visíveis no link público |

### Services — listagem

| Campo | Valor |
|---|---|
| **Rota** | `/app/services` |
| **Objetivo** | Listar serviços do catálogo com status, preço, modo de agendamento |
| **Público** | OWNER, ADMIN |
| **Problemas UX/UI** | 9 colunas sem wrapper responsivo. Sem busca/filtro. Ações por linha com 3 botões icon-only (olho, lápis, toggle) dependentes de `title` para acessibilidade. Labels de preço e modo de agendamento mapeados corretamente. |
| **Prioridade redesign** | Alta |
| **Risco de quebrar regra de negócio** | Médio — toggle de status (ativo/inativo) afeta link público e Typebot |

### Services — detalhe

| Campo | Valor |
|---|---|
| **Rota** | `/app/services/[id]` |
| **Objetivo** | Visualizar detalhes do serviço, estatísticas e gerenciar campos personalizados |
| **Público** | OWNER, ADMIN |
| **Problemas UX/UI** | 3 stat cards sem estrutura Detail (valor sem label). Card "Preço" mostra número sem indicar moeda ou tipo. Tabela de custom fields sem wrapper responsivo. Botão "Voltar" no header. Grid com `gap-4` (inconsistente com `gap-6` do admin). |
| **Prioridade redesign** | Média |
| **Risco de quebrar regra de negócio** | Alto — custom fields afetam formulário de agendamento público e Typebot |

### Services — novo

| Campo | Valor |
|---|---|
| **Rota** | `/app/services/new` |
| **Objetivo** | Criar novo serviço |
| **Público** | OWNER, ADMIN |
| **Problemas UX/UI** | Formulário com checkbox estilizado como card (`rounded-lg border p-4`) para confirmação manual. Campo preço desabilitado condicionalmente (ON_REQUEST/HIDDEN). Sem indicação de campos obrigatórios. |
| **Prioridade redesign** | Baixa |
| **Risco de quebrar regra de negócio** | Médio — criação de serviço visível no link público e Typebot |

### Services — edição

| Campo | Valor |
|---|---|
| **Rota** | `/app/services/[id]/edit` |
| **Objetivo** | Editar serviço existente |
| **Público** | OWNER, ADMIN |
| **Problemas UX/UI** | Mesmo formulário de criação. Sem alerta sobre impacto em agendamentos existentes. |
| **Prioridade redesign** | Baixa |
| **Risco de quebrar regra de negócio** | Alto — alteração de duração, preço e campos afeta agendamentos existentes e futuros |

### Services — custom fields — novo

| Campo | Valor |
|---|---|
| **Rota** | `/app/services/[id]/fields/new` |
| **Objetivo** | Adicionar campo personalizado ao serviço |
| **Público** | OWNER, ADMIN |
| **Problemas UX/UI** | Não lido em detalhe |
| **Prioridade redesign** | Baixa |
| **Risco de quebrar regra de negócio** | Médio — campo aparece no formulário de agendamento público e Typebot |

### Services — custom fields — edição

| Campo | Valor |
|---|---|
| **Rota** | `/app/services/[id]/fields/[fieldId]/edit` |
| **Objetivo** | Editar campo personalizado |
| **Público** | OWNER, ADMIN |
| **Problemas UX/UI** | Não lido em detalhe |
| **Prioridade redesign** | Baixa |
| **Risco de quebrar regra de negócio** | Médio — alteração de opções de SELECT quebra valores existentes |

### Categories — listagem

| Campo | Valor |
|---|---|
| **Rota** | `/app/services/categories` |
| **Objetivo** | Listar categorias de serviço |
| **Público** | OWNER, ADMIN |
| **Problemas UX/UI** | Não lido em detalhe — provável tabela simples com nome, descrição, status, ações |
| **Prioridade redesign** | Baixa |
| **Risco de quebrar regra de negócio** | Baixo — categorias são agrupamento visual no link público |

### Categories — nova

| Campo | Valor |
|---|---|
| **Rota** | `/app/services/categories/new` |
| **Objetivo** | Criar nova categoria |
| **Público** | OWNER, ADMIN |
| **Problemas UX/UI** | Não lido em detalhe |
| **Prioridade redesign** | Baixa |
| **Risco de quebrar regra de negócio** | Baixo |

### Categories — edição

| Campo | Valor |
|---|---|
| **Rota** | `/app/services/categories/[id]/edit` |
| **Objetivo** | Editar categoria existente |
| **Público** | OWNER, ADMIN |
| **Problemas UX/UI** | Não lido em detalhe |
| **Prioridade redesign** | Baixa |
| **Risco de quebrar regra de negócio** | Baixo |

### Availability — listagem

| Campo | Valor |
|---|---|
| **Rota** | `/app/availability` |
| **Objetivo** | Listar regras de horário semanal recorrente |
| **Público** | OWNER, ADMIN |
| **Problemas UX/UI** | 6 colunas sem wrapper responsivo. Ícones icon-only para editar/toggle. Sem indicação visual de conflitos ou gaps na semana. |
| **Prioridade redesign** | Média |
| **Risco de quebrar regra de negócio** | Médio — toggle de regra afeta slots disponíveis no link público e Typebot |

### Availability — nova

| Campo | Valor |
|---|---|
| **Rota** | `/app/availability/new` |
| **Objetivo** | Criar nova regra de horário |
| **Público** | OWNER, ADMIN |
| **Problemas UX/UI** | Não lido em detalhe — formulário com weekday, startTime, endTime, slotInterval |
| **Prioridade redesign** | Baixa |
| **Risco de quebrar regra de negócio** | Médio — regras definem slots de agendamento |

### Availability — edição

| Campo | Valor |
|---|---|
| **Rota** | `/app/availability/[id]/edit` |
| **Objetivo** | Editar regra de horário existente |
| **Público** | OWNER, ADMIN |
| **Problemas UX/UI** | Não lido em detalhe |
| **Prioridade redesign** | Baixa |
| **Risco de quebrar regra de negócio** | Médio |

### Blocks — listagem + criação

| Campo | Valor |
|---|---|
| **Rota** | `/app/availability/blocks` |
| **Objetivo** | Criar bloqueios de agenda e listar bloqueios existentes |
| **Público** | OWNER, ADMIN |
| **Problemas UX/UI** | Criação inline no topo + tabela abaixo separada por `mt-6`. Sem separador visual entre os cards. Delete via `ProviderStatusForm` com `destructive` sem modal de confirmação adicional. Aviso "não valida conflitos com agendamentos" é bom. 5 colunas. |
| **Prioridade redesign** | Média |
| **Risco de quebrar regra de negócio** | Alto — bloqueios removem slots de agendamento, podem invalidar agendamentos existentes |

### Appointments — listagem

| Campo | Valor |
|---|---|
| **Rota** | `/app/appointments` |
| **Objetivo** | Listar agendamentos com filtro por período, status, serviço, cliente e origem |
| **Público** | OWNER, ADMIN, MEMBER |
| **Problemas UX/UI** | Filtro funcional com search params. Tabela TanStack sem wrapper responsivo. Status badges com colorização inline (string matching). Coluna "Valor estimado" mostra "—" para muitos registros. |
| **Prioridade redesign** | Média |
| **Risco de quebrar regra de negócio** | Médio — ações de status alteram agendamento |

### Appointments — detalhe

| Campo | Valor |
|---|---|
| **Rota** | `/app/appointments/[id]` |
| **Objetivo** | Visualizar detalhes do agendamento e alterar status |
| **Público** | OWNER, ADMIN, MEMBER |
| **Problemas UX/UI** | Não lido em detalhe |
| **Prioridade redesign** | Baixa |
| **Risco de quebrar regra de negócio** | Alto — mudança de status do agendamento |

### Appointments — edição

| Campo | Valor |
|---|---|
| **Rota** | `/app/appointments/[id]/edit` |
| **Objetivo** | Editar agendamento existente |
| **Público** | OWNER, ADMIN, MEMBER |
| **Problemas UX/UI** | Não lido em detalhe |
| **Prioridade redesign** | Baixa |
| **Risco de quebrar regra de negócio** | Alto — alteração de horário, serviço, cliente |

### Appointments — novo

| Campo | Valor |
|---|---|
| **Rota** | `/app/appointments/new` |
| **Objetivo** | Criar agendamento manual |
| **Público** | OWNER, ADMIN, MEMBER |
| **Problemas UX/UI** | Formulário com datetime-local nativo (UX pobre). Dropdown de serviço mostra "nome · duração min". Dropdown de cliente mostra "nome · telefone". Fim calculado em campo read-only (bom). Alerta amber quando categoria inativa (bom). Checkbox "encaixe fora da disponibilidade". |
| **Prioridade redesign** | Média |
| **Risco de quebrar regra de negócio** | Alto — cria agendamento que consome slot. Subscription enforcement pode bloquear. |

### Customers — listagem

| Campo | Valor |
|---|---|
| **Rota** | `/app/customers` |
| **Objetivo** | Listar clientes com nome, telefone, email, total de agendamentos e status |
| **Público** | OWNER, ADMIN, MEMBER |
| **Problemas UX/UI** | 7 colunas sem wrapper responsivo. Sem busca/filtro (crítico para lista de clientes). Tabela TanStack sem features. |
| **Prioridade redesign** | Alta |
| **Risco de quebrar regra de negócio** | Baixo — listagem |

### Customers — detalhe

| Campo | Valor |
|---|---|
| **Rota** | `/app/customers/[id]` |
| **Objetivo** | Visualizar cliente e histórico de agendamentos |
| **Público** | OWNER, ADMIN, MEMBER |
| **Problemas UX/UI** | Não lido em detalhe |
| **Prioridade redesign** | Baixa |
| **Risco de quebrar regra de negócio** | Baixo |

### Customers — novo

| Campo | Valor |
|---|---|
| **Rota** | `/app/customers/new` |
| **Objetivo** | Cadastrar novo cliente |
| **Público** | OWNER, ADMIN, MEMBER |
| **Problemas UX/UI** | Não lido em detalhe |
| **Prioridade redesign** | Baixa |
| **Risco de quebrar regra de negócio** | Baixo |

### Customers — edição

| Campo | Valor |
|---|---|
| **Rota** | `/app/customers/[id]/edit` |
| **Objetivo** | Editar dados do cliente |
| **Público** | OWNER, ADMIN, MEMBER |
| **Problemas UX/UI** | Não lido em detalhe |
| **Prioridade redesign** | Baixa |
| **Risco de quebrar regra de negócio** | Baixo |

### Subscription (prestador)

| Campo | Valor |
|---|---|
| **Rota** | `/app/subscription` |
| **Objetivo** | Consulta da assinatura do tenant |
| **Público** | OWNER, ADMIN |
| **Problemas UX/UI** | **Stub.** Renderiza `FoundationPlaceholder`. Acessível via sidebar mas sem funcionalidade. |
| **Prioridade redesign** | Baixa (remover da sidebar até existir) |
| **Risco de quebrar regra de negócio** | Nenhum — não implementado |

### Provider redirect

| Campo | Valor |
|---|---|
| **Rota** | `/app` |
| **Objetivo** | Redirecionar para `/app/dashboard` |
| **Público** | OWNER, ADMIN, MEMBER |
| **Problemas UX/UI** | Redirecionamento automático — não é uma tela |
| **Prioridade redesign** | — |
| **Risco de quebrar regra de negócio** | Nenhum |

---

## Público (6 telas)

### Login

| Campo | Valor |
|---|---|
| **Rota** | `/login` |
| **Objetivo** | Autenticar usuários (SUPER_ADMIN, provider, CUSTOMER) |
| **Público** | Visitantes, CUSTOMER já logado |
| **Problemas UX/UI** | Tela sem identidade visual — card branco centralizado com dois inputs e botão verde. Logo é ícone CalendarCheck2 em quadrado verde (genérico). Três públicos diferentes veem a mesma tela. Background é `bg-background` sem textura ou cor. Placeholder "voce@empresa.com" é amigável. Tratamento de CUSTOMER já logado com card "Você já está logado" é bom. |
| **Prioridade redesign** | Alta |
| **Risco de quebrar regra de negócio** | Alto — autenticação é porta de entrada do sistema. Redirecionamento por role (CUSTOMER → redirectTo, SUPER_ADMIN → /admin/dashboard, provider → /app/dashboard). |

### Access denied

| Campo | Valor |
|---|---|
| **Rota** | `/access-denied` |
| **Objetivo** | Informar que o usuário não tem permissão para acessar a área |
| **Público** | Usuários autenticados sem permissão |
| **Problemas UX/UI** | Card centrado com ícone ShieldX em círculo vermelho. Mensagem clara. Botão "Voltar ao login" que faz logout. Sem indicação de qual área foi negada ou por quê. |
| **Prioridade redesign** | Baixa |
| **Risco de quebrar regra de negócio** | Baixo — tela informativa |

### Tenant public page (landing)

| Campo | Valor |
|---|---|
| **Rota** | `/[tenantSlug]` |
| **Objetivo** | Página pública do prestador: apresentar o negócio, serviços e link para agendamento |
| **Público** | Visitantes e CUSTOMERs |
| **Problemas UX/UI** | Layout genérico: header com badges + cards de categoria com serviços em grid. Sem identidade visual por segmento (barbearia e clínica idênticas). Nome do prestador é o único elemento distintivo. Badges de cidade/WhatsApp são puramente informativos. Botões "Agendar agora" e "Ver serviços" sem distinção clara de ação primária. Card "Nenhum serviço disponível" é só texto. |
| **Prioridade redesign** | Alta |
| **Risco de quebrar regra de negócio** | Alto — link público é o produto que o prestador compra. Isolamento multi-tenant depende do slug. Exibição condicional por subscription enforcement (publicLinkEnabled, status). |

### Tenant services page

| Campo | Valor |
|---|---|
| **Rota** | `/[tenantSlug]/services` |
| **Objetivo** | Listar todos os serviços do prestador organizados por categoria |
| **Público** | Visitantes e CUSTOMERs |
| **Problemas UX/UI** | Cards de categoria com serviços em grid 2-col. Cada serviço em card com border, nome, descrição, duração, preço e badge de modo de agendamento. Badge `BOOKING_MODE_LABELS` é informativo. Botão "Agendar" em cada serviço. Layout limpo mas sem personalidade visual. |
| **Prioridade redesign** | Média |
| **Risco de quebrar regra de negócio** | Médio — exibe services com bookingMode, preço. Isolamento por tenant. |

### Booking page

| Campo | Valor |
|---|---|
| **Rota** | `/[tenantSlug]/book` |
| **Objetivo** | Formulário de agendamento: selecionar serviço, horário, preencher custom fields, autenticar |
| **Público** | Visitantes e CUSTOMERs |
| **Problemas UX/UI** | Boa diferenciação por estado de auth (3 banners distintos: customer logado, admin logado, anônimo). Sem step indicator (selecionar serviço → escolher slot → preencher campos → autenticar → confirmar). Formulário sempre visível para todos (não-customers veem warning mas podem interagir). Slots em `<select>` nativo com "Selecione". Boolean como checkbox nativo inconsistente com `Checkbox` do design system. `FieldError` duplicado localmente. Botão "Enviar agendamento" é vago. Sem loading skeleton para slots. |
| **Prioridade redesign** | Alta |
| **Risco de quebrar regra de negócio** | Alto — criação de agendamento com `origin = PUBLIC`. Autenticação/criação de CUSTOMER inline. Subscription enforcement bloqueia se vencido > 8 dias. |

### Booking confirmation

| Campo | Valor |
|---|---|
| **Rota** | `/[tenantSlug]/book/confirm` |
| **Objetivo** | Confirmar que o agendamento foi recebido e exibir detalhes |
| **Público** | CUSTOMERs |
| **Problemas UX/UI** | Card único com dados do agendamento (prestador, serviço, data/hora, status, cliente, observações, custom fields). Mensagem contextual por `bookingMode` (DIRECT: confirmação imediata, REQUIRES_CONFIRMATION: aguarda, INFORMATIONAL: solicitação). Sem elemento visual memorável (oportunidade para o "carimbo de confirmação"). Botão "Voltar ao prestador". Sem opção de desfazer ou cancelar. |
| **Prioridade redesign** | Média |
| **Risco de quebrar regra de negócio** | Médio — exibe dados de agendamento recém-criado. Isolamento por tenant + appointmentId. |

---

## Resumo

| Área | Total telas | Implementadas | Stubs | Prioridade alta | Prioridade média | Prioridade baixa |
|---|---|---|---|---|---|---|
| Admin | 20 | 16 | 4 | 3 | 4 | 9 |
| Prestador | 23 | 22 | 1 | 4 | 8 | 11 |
| Público | 6 | 6 | 0 | 3 | 2 | 1 |
| **Total** | **49** | **44** | **5** | **10** | **14** | **21** |

**Stubs (FoundationPlaceholder):** Admin templates (global), admin appointments, admin customers, admin settings, provider subscription.

**Telas com risco alto de quebrar regra de negócio:** 15 telas — maioria de formulários de criação/edição e ações de status.

**Telas que mais impactam a percepção do produto:**
1. Login (`/login`) — primeira impressão de todos os usuários
2. Tenant public page (`/[tenantSlug]`) — o "produto" que o prestador compra
3. Booking page (`/[tenantSlug]/book`) — onde o agendamento acontece
4. Provider dashboard (`/app/dashboard`) — tela mais visitada do painel
5. Booking confirmation (`/[tenantSlug]/book/confirm`) — desfecho da experiência do cliente
