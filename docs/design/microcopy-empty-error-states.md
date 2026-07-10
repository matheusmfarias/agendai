# Microcopy, Empty States & Error States

Documentação da camada de linguagem e feedback do AgendaZap, implementada na
**Phase 23 — Microcopy, Empty States & Error States**.

---

## Princípios de microcopy

1. **Dizer o que aconteceu** — toda mensagem de feedback deve ser descritiva e
   contextual, não genérica.
2. **Dizer o que o usuário pode fazer** — sempre que possível, incluir o
   próximo passo ou ação corretiva.
3. **Não expor detalhe técnico** — evitar mensagens como "Foreign key constraint
   failed", "Tenant not found", "Subscription policy blocked". Usar linguagem
   humana e segura.
4. **Diferenciar público interno e público externo** — prestador/admin pode
   receber mais detalhes; cliente final nunca vê assinatura, plano ou status
   interno.
5. **Não prometer recurso que não existe** — evitar "Você receberá uma
   notificação por WhatsApp" a menos que o recurso exista no produto.

---

## Estados vazios

### Estrutura

```
Título claro
Descrição útil
Ação principal, quando existir
```

Utilizar o componente `EmptyState` com ícone apropriado.

### Mapeamento por página

| Página | Ícone | Título | Descrição | Ação |
| --- | --- | --- | --- | --- |
| Serviços | `boxes` | Nenhum serviço cadastrado | Cadastre seus serviços para que clientes possam escolher o que desejam agendar pelo link público ou WhatsApp. | Novo serviço |
| Categorias | `folder` | Nenhuma categoria cadastrada | Crie categorias como "Manutenção", "Estética" ou "Consultas" — qualquer divisão que faça sentido para seu atendimento. | Nova categoria |
| Clientes | `users` | Nenhum cliente encontrado | Clientes aparecem aqui quando você cria um agendamento manual ou quando eles usam seu link público. | Novo cliente |
| Agendamentos | `calendar` | Nenhum agendamento encontrado | Quando houver agendamentos pelo painel, link público ou WhatsApp, eles aparecerão aqui. | Novo agendamento |
| Horários | `clock` | Nenhum horário configurado | Cadastre seus horários de atendimento para liberar opções de agenda no link público e WhatsApp. | Novo horário |
| Bloqueios | `calendar` | Nenhum bloqueio cadastrado | Bloqueios servem para fechar períodos específicos da agenda, como folgas, feriados ou compromissos. | — |
| Prestadores (admin) | `users` | Nenhum prestador cadastrado | Cadastre o primeiro prestador para liberar painel, serviços e link público. | Novo prestador |
| Audit logs | `scroll` | Nenhum registro encontrado | Os eventos administrativos e operacionais aparecerão aqui conforme a plataforma for utilizada. | — |

---

## Estados de sucesso

Mensagens de sucesso são padronizadas no componente `SuccessAlert`
(`src/components/layout/success-alert.tsx`).

### Contexto

O `SuccessAlert` aceita uma prop `context` opcional que diferencia o mesmo
código (`created`, `updated`, `status`) para páginas diferentes:

```tsx
<SuccessAlert code={success} context="service" />
// "created" + "service" → "Serviço cadastrado com sucesso."
// "updated" + "service" → "Serviço atualizado com sucesso."
```

### Contextos disponíveis

`tenant`, `plan`, `service`, `category`, `availability`, `block`, `customer`,
`appointment`, `subscription`, `settings`, `field`, `user`

### Fallback

Códigos genéricos sem contexto mantêm mensagens padrão:
- `created` → "Registro criado com sucesso."
- `updated` → "Alterações salvas com sucesso."
- `status` → "Status atualizado com sucesso."

### Códigos específicos

| Código | Mensagem |
| --- | --- |
| `payment` | Pagamento registrado com sucesso. |
| `expiration` | Vencimento alterado com sucesso. |
| `owner-created` | Acesso do responsável criado com sucesso. |
| `password-reset` | Senha do responsável redefinida com sucesso. |
| `field-created` | Campo personalizado criado com sucesso. |
| `field-updated` | Campo personalizado atualizado com sucesso. |
| `field-status` | Status do campo personalizado atualizado. |
| `block-created` | Bloqueio de agenda criado com sucesso. |
| `block-deleted` | Bloqueio de agenda removido com sucesso. |

### Evitar

- "Salvo." / "OK." / "Sucesso." / "Operação realizada."

---

## Estados de carregamento (loading)

Botões de formulário mostram texto contextual durante o envio:

| Ação | Normal | Carregando |
| --- | --- | --- |
| Login | Entrar | Entrando... |
| Criar serviço | Cadastrar serviço | Cadastrando serviço... |
| Editar serviço | Salvar alterações | Salvando serviço... |
| Criar categoria | Criar categoria | Criando categoria... |
| Criar cliente | Cadastrar cliente | Cadastrando cliente... |
| Criar agendamento | Criar agendamento | Criando agendamento... |
| Criar horário | Criar horário | Criando horário... |
| Criar bloqueio | Criar bloqueio | Criando bloqueio... |
| Salvar campo | Salvar campo | Salvando campo... |
| Criar prestador | Salvar prestador | Salvando prestador... |
| Criar plano | Salvar plano | Salvando plano... |
| Editar assinatura | Salvar assinatura | Salvando assinatura... |
| Configurações | Salvar configurações | Salvando configurações... |
| Pagamento | Registrar pagamento | Registrando... |
| Vencimento | Alterar vencimento | Alterando... |
| Criar acesso | Criar acesso do responsável | Criando... |
| Redefinir senha | Redefinir senha | Redefinindo... |
| Agendamento público | Confirmar horário | Confirmando... |

### Evitar

- "Loading..." / "Processando..." / "Aguarde..." / "Salvando..." (genérico)

---

## Diálogos de confirmação

Ações destrutivas ou sensíveis devem explicar a consequência:

### Prestadores

| Ação | Confirmação |
| --- | --- |
| Suspender | Suspender este prestador? O prestador perderá acesso operacional e os canais externos poderão ser bloqueados. |
| Reativar | Reativar este prestador? O prestador voltará a ter acesso operacional. |
| Cancelar | Cancelar este prestador? O prestador será permanentemente cancelado. Esta ação não pode ser desfeita. |

### Assinaturas

| Ação | Confirmação |
| --- | --- |
| Suspender | Suspender esta assinatura? Agendamentos externos poderão ser bloqueados. |
| Reativar | Reativar esta assinatura? Os bloqueios por vencimento serão removidos. |
| Cancelar | Cancelar esta assinatura? Esta ação não pode ser desfeita. |

### Agendamentos

| Ação | Confirmação |
| --- | --- |
| Cancelar | Cancelar este agendamento? O horário será liberado na agenda. |

### Bloqueios

| Ação | Confirmação |
| --- | --- |
| Remover | Remover este bloqueio? O período ficará disponível para novos agendamentos. |

### Credenciais Typebot

| Ação | Confirmação |
| --- | --- |
| Revogar | Revogar esta credencial? Chamadas do Typebot usando este token deixarão de funcionar imediatamente. |

### Inativar vs Excluir

- Usar "Inativar" quando há soft delete/inativação (serviços, categorias,
  clientes, campos personalizados, horários).
- Usar "Remover" apenas quando a ação é realmente destrutiva (bloqueios de
  agenda).
- Não usar "Excluir" se a ação for inativar.
- Não dizer "deletar" quando há soft delete.

---

## Mensagens de erro

### Login

```
E-mail ou senha inválidos.
```

Nunca diferenciar "usuário não encontrado" de "senha incorreta" — isso
revelaria se o e-mail existe na base.

### Permissão

```
Sua conta não tem permissão para abrir esta área.
```

### Agendamento público

```
Para confirmar o horário, entre ou crie sua conta.
```

```
Contas administrativas não podem confirmar agendamentos públicos.
```

### Indisponibilidade pública

```
Este serviço de agendamento está temporariamente indisponível.
Entre em contato diretamente com o estabelecimento.
```

Esta mensagem é **intencionalmente genérica** — nunca revela status de
assinatura, plano ou dias de vencimento.

---

## Labels humanos para enums

Centralizados em:

- `src/features/appointments/appointment-constants.ts` — origin e status de
  agendamento
- `src/features/provider-operations/shared-label-constants.ts` — bookingMode,
  priceType, origin (provider) e status (provider)
- `src/lib/status.ts` — tenant e subscription status
- `src/features/provider-dashboard/provider-constants.ts` — badges e labels do
  dashboard

Nenhum enum deve aparecer cru na UI (ex.: `MANUAL_PANEL`, `PUBLIC_LINK`,
`WHATSAPP`, `DIRECT`, `REQUIRES_CONFIRMATION`, etc.).

---

## Mensagens internas vs. públicas

### Prestador/Admin (pode ser explícito)

```
A assinatura está vencida e novos agendamentos externos estão temporariamente bloqueados.
```

### Cliente final (genérico, seguro)

```
O agendamento online está temporariamente indisponível.
Entre em contato diretamente com o estabelecimento.
```

Nunca revelar ao cliente: status de assinatura, dias de vencimento, status do
plano, status do tenant.

---

## Componentes e helpers criados

- `src/components/layout/success-alert.tsx` — `SuccessAlert` com suporte a
  `context` para mensagens contextuais
- `src/features/provider-operations/shared-label-constants.ts` — labels humanos
  centralizados (`BOOKING_MODE_LABELS`, `PRICE_TYPE_LABELS`, etc.)
- `src/features/provider-operations/operation-form-section.tsx` — wrapper
  `<fieldset>` para seções visuais de formulários
- `src/features/provider-operations/help-callout.tsx` — bloco de ajuda
  contextual azul

---

## Regras preservadas

- Autenticação, roles, permissões
- Isolamento multi-tenant
- Subscription enforcement
- Onboarding
- Server actions e validações Zod
- Link público e Typebot API
- Fluxos de admin e provider
- Nenhuma alteração de Prisma, migration ou endpoint

---

## Limitações

- Não existe sistema de toast — mensagens de sucesso aparecem como alertas no
  topo da página via redirect com `?success=`.
- Não há internacionalização — todo o conteúdo está em português brasileiro.
- Não há recuperação de senha — a redefinição é feita administrativamente.
- Confirmações usam `window.confirm()` — não há modal customizado de
  confirmação.
