# Typebot Flow Simulator

## Objetivo

Ferramenta técnica para Super Admin simular o fluxo completo de agendamento
Typebot sem depender do Typebot real, WhatsApp Cloud API ou canal externo.

## Rota

```
/admin/typebot-simulator
```

## Permissões

Apenas `SUPER_ADMIN` pode acessar.

- O layout administrativo (`/admin`) exige `requireSuperAdmin()` no servidor.
- Cada server action do simulador também chama `requireSuperAdmin()`.
- USER (prestador), CUSTOMER e visitantes anônimos são bloqueados.

## Fluxo

O simulador conduz o operador pelas etapas do fluxo Typebot:

1. **Selecionar tenant** — lista tenants com status, plano, assinatura e
   indicação de WhatsApp habilitado.
2. **Identificar cliente** — informa telefone, nome e e-mail opcional; cria
   ou reutiliza cliente e typebot_session.
3. **Listar serviços** — exibe serviços ativos do tenant.
4. **Detalhe do serviço** — exibe nome, categoria, duração, preço, modo e
   campos personalizados ativos.
5. **Horários disponíveis** — busca slots para o serviço nos próximos 7 dias.
6. **Campos personalizados** — renderiza inputs conforme o tipo de cada campo
   (TEXT, TEXTAREA, NUMBER, DATE, BOOLEAN, SELECT).
7. **Confirmar** — exibe resumo do agendamento e campo de observações.
8. **Resultado** — exibe ID, status, origin, horário e mensagem de
   confirmação.

O painel de log exibe cada requisição/resposta com timestamp para debug.

## Como funciona

O simulador **não faz chamadas HTTP** para a API Typebot. Ele chama
diretamente os mesmos services internos usados pelos endpoints
`/api/typebot/...` via server actions (`"use server"`).

Isso garante:

- Nenhuma exposição de tokens de credencial (`agz_tb_`) no client.
- O simulador **não requer credenciais Typebot** — ele autentica via sessão
  de Super Admin, não via `x-typebot-api-key`.
- Mesmo comportamento dos endpoints Typebot reais (validações, conflitos,
  booking mode, etc.).
- Execução server-side com acesso direto ao Prisma e regras de negócio.

## Características do agendamento criado

- `origin = WHATSAPP`
- `createdByUserId = null`
- Status conforme `bookingMode`:
  - `DIRECT` → `CONFIRMED`
  - `REQUIRES_CONFIRMATION` → `REQUESTED`
  - `INFORMATIONAL` → `WAITING_INFO` ou `REQUESTED`
- Cria `appointment_event` e `audit_log`.
- Atualiza `typebot_session`.
- Valida conflitos de horário no momento da criação.

## Tratamento de erros

Erros seguem os mesmos códigos da API Typebot:

- `BUSINESS_UNAVAILABLE` — tenant não está apto
- `SERVICE_NOT_FOUND` — serviço não encontrado ou inativo
- `NO_SLOTS_AVAILABLE` — sem horários disponíveis
- `CUSTOMER_REQUIRED` — cliente não identificado
- `SESSION_NOT_FOUND` — sessão expirada ou inválida
- `INVALID_SLOT` — horário inválido
- `SLOT_UNAVAILABLE` — horário já ocupado
- `CUSTOM_FIELD_REQUIRED` — campo obrigatório não preenchido
- `CUSTOM_FIELD_INVALID` — valor de campo inválido
- `VALIDATION_ERROR` — erro de validação genérico
- `INTERNAL_ERROR` — erro interno do servidor

Erros são exibidos de forma segura, sem stack trace, segredos, API keys ou
erros brutos de banco.

## Limitações

- Não envia mensagens (sem WhatsApp Cloud API).
- Não substitui o Typebot real.
- Não faz webhook ou disparo ativo.
- Apenas SUPER_ADMIN pode usar.
- Agendamentos criados via simulador não notificam prestador ou cliente.
- Não valida credenciais Typebot (`agz_tb_`) — usa sessão de Super Admin.
  Para testar autenticação com tokens, use os endpoints da API diretamente
  via curl ou ferramenta HTTP.
- Não é afetado pelo rate limit — o rate limit se aplica apenas aos endpoints
  `/api/typebot/...`, não às server actions internas usadas pelo simulador.

## Como testar

1. Entre em `/login` com `SEED_ADMIN_EMAIL` e `SEED_ADMIN_PASSWORD`.
2. Acesse `/admin/typebot-simulator`.
3. Selecione um tenant com WhatsApp habilitado.
4. Informe telefone e nome do cliente.
5. Escolha um serviço.
6. Verifique o detalhe e campos personalizados.
7. Escolha um horário disponível.
8. Preencha campos personalizados (se houver).
9. Confirme e crie o agendamento.
10. Verifique o resultado e confira o agendamento no painel.

Após criar, o agendamento deve aparecer em:

- `/admin/appointments` (painel administrativo)
- `/app/appointments` (painel do prestador, se o tenant tiver prestador)

Confirme que `origin = WHATSAPP` e `createdByUserId = null` no registro.

## Estrutura de arquivos

```
src/app/(admin)/admin/typebot-simulator/page.tsx      — página (server component)
src/features/typebot-simulator/simulator.tsx           — wizard UI (client component)
src/features/typebot-simulator/simulator-actions.ts    — server actions
src/features/typebot-simulator/simulator-types.ts      — tipos e estado inicial
```
