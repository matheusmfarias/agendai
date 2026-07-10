# Task - Phase 12 Typebot Production Readiness

## Objetivo

Preparar a API Typebot do AgendaZap para uso real em produção, adicionando proteções operacionais, observabilidade, healthcheck, troubleshooting e testes automatizados específicos dos endpoints Typebot.

Até a Phase 11, a API Typebot já possui:

```text
- endpoints funcionais
- tokens por tenant
- validação multi-tenant
- typebot_sessions
- criação de agendamento WHATSAPP
- custom fields
- simulador interno
- documentação real de setup
```

Agora esta fase deve endurecer a operação antes de qualquer integração real com WhatsApp Cloud API, webhook, envio ativo de mensagens ou uso em clientes reais.

---

# Dependências

Esta task depende da conclusão e validação das fases:

```text
/docs/tasks/phase-06-typebot-api.md
/docs/tasks/phase-07-typebot-flow-blueprint.md
/docs/tasks/phase-08-typebot-service-details-custom-fields.md
/docs/tasks/phase-09-typebot-flow-simulator.md
/docs/tasks/phase-10-typebot-real-setup-guide.md
/docs/tasks/phase-11-typebot-tenant-credentials.md
```

Também depende das fases anteriores:

```text
/docs/tasks/phase-01-foundation.md
/docs/tasks/phase-02-admin-platform.md
/docs/tasks/phase-02-1-provider-login-access.md
/docs/tasks/phase-03-provider-panel.md
/docs/tasks/phase-04-customers-appointments-core.md
/docs/tasks/phase-05-public-booking-link.md
/docs/tasks/phase-05-1-public-customer-auth.md
/docs/tasks/phase-05-2-public-routing-refactor.md
```

Antes de implementar, leia obrigatoriamente:

```text
/docs/technical/typebot-api.md
/docs/typebot/real-setup-guide.md
/docs/typebot/real-http-blocks.md
/docs/typebot/real-validation-checklist.md
/docs/typebot/simulator.md
/docs/technical/arquitetura.md
/docs/technical/banco-dados.md
/docs/technical/padroes-codigo.md
/docs/technical/auth-permissoes.md
README.md
```

---

# Escopo

Implementar:

```text
1. Rate limit básico nos endpoints Typebot
2. Healthcheck/status da integração Typebot por tenant
3. Logs operacionais seguros
4. Padronização de erros e troubleshooting
5. Testes automatizados dos endpoints Typebot
6. Documentação de operação
7. Atualização do README
```

Não implementar WhatsApp real, webhook, envio ativo, painel visual de bot, OAuth, HMAC, fila, workers, lembretes ou automações externas.

---

# 1. Rate limit básico

## Objetivo

Evitar abuso simples dos endpoints `/api/typebot/...`, especialmente tentativas repetidas com token inválido, chamadas excessivas de slots e spam de criação de agendamentos.

## Implementação MVP

Implementar rate limit simples, local/in-memory, adequado para desenvolvimento e MVP inicial.

Sugestão:

```text
src/features/typebot/typebot-rate-limit.ts
```

## Regras

Aplicar rate limit em todos os endpoints:

```text
/api/typebot/[tenantSlug]/business
/api/typebot/[tenantSlug]/services
/api/typebot/[tenantSlug]/services/[serviceId]
/api/typebot/[tenantSlug]/services/[serviceId]/slots
/api/typebot/[tenantSlug]/customers/identify
/api/typebot/[tenantSlug]/appointments
/api/typebot/[tenantSlug]/appointments/[appointmentId]
```

## Chave do rate limit

Usar combinação segura:

```text
tenantSlug + tokenPrefix ou tokenHash parcial seguro + endpoint group + IP quando disponível
```

Se a chamada não tiver token válido, usar:

```text
tenantSlug + IP + endpoint group + "unauthenticated"
```

Não armazenar token puro na memória nem em logs.

## Limites sugeridos

Para MVP:

```text
business: 60 req/min por tenant/token
services: 60 req/min por tenant/token
service detail: 120 req/min por tenant/token
slots: 60 req/min por tenant/token
identify: 30 req/min por tenant/token
appointments: 15 req/min por tenant/token
appointment detail: 60 req/min por tenant/token
auth failed: 20 req/min por tenant/IP
```

Pode simplificar para limites gerais se ficar mais limpo:

```text
read endpoints: 120 req/min
write endpoints: 30 req/min
auth failures: 20 req/min
```

## Resposta em caso de limite

Retornar HTTP 429:

```json
{
  "ok": false,
  "code": "RATE_LIMITED",
  "message": "Muitas tentativas em pouco tempo. Tente novamente em instantes."
}
```

## Headers recomendados

Se simples de implementar:

```text
Retry-After
X-RateLimit-Limit
X-RateLimit-Remaining
```

## Observação

Como rate limit in-memory não funciona bem em múltiplas instâncias, documentar limitação:

```text
O rate limit desta fase é local/in-memory. Em produção horizontal, usar Redis ou serviço equivalente.
```

---

# 2. Healthcheck Typebot por tenant

## Objetivo

Criar endpoint administrativo seguro para verificar se um tenant está pronto para uso com Typebot.

## Rota recomendada

```text
/admin/tenants/[id]/typebot-health
```

ou seção dentro:

```text
/admin/tenants/[id]/typebot-credentials
```

## Recomendação

Adicionar seção de “Status da integração Typebot” na própria página:

```text
/admin/tenants/[id]/typebot-credentials
```

## Exibir checks

```text
Tenant existe
Tenant ativo
Plano com whatsappEnabled = true
Assinatura ativa
Existe pelo menos uma credencial Typebot ativa
Categorias ativas existem
Serviços ativos existem
Availability rules configuradas
Timezone configurado ou fallback válido
Último uso de credencial
Último agendamento WHATSAPP
Última sessão Typebot
```

## Status final

Exibir status consolidado:

```text
READY
WARNING
BLOCKED
```

Regras sugeridas:

```text
READY:
- tenant ativo
- plano/assinatura WhatsApp OK
- credencial ativa
- serviço ativo
- availability rule ativa

WARNING:
- sem último uso
- sem último agendamento
- sem sessões
- poucos serviços
- sem campos personalizados não é problema

BLOCKED:
- tenant inativo/suspenso
- assinatura bloqueada/cancelada
- whatsappEnabled false
- sem credencial ativa
- sem serviço ativo
- sem disponibilidade configurada
```

## Segurança

Apenas SUPER_ADMIN acessa.

Não expor token completo nem hash.

---

# 3. Logs operacionais seguros

## Objetivo

Melhorar rastreabilidade de falhas sem expor dados sensíveis.

## Implementar helper

Sugestão:

```text
src/features/typebot/typebot-operational-log.ts
```

Ou reutilizar audit log existente para eventos relevantes.

## Eventos operacionais recomendados

Não criar audit log para cada request de sucesso, para evitar volume excessivo.

Criar log/audit para:

```text
TYPEBOT_RATE_LIMITED
TYPEBOT_AUTH_FAILED
TYPEBOT_BUSINESS_UNAVAILABLE
TYPEBOT_APPOINTMENT_REJECTED
TYPEBOT_APPOINTMENT_CREATED
```

Se já existem alguns eventos, reutilizar.

## Metadata permitida

```json
{
  "tenantSlug": "logica",
  "tenantId": "uuid quando conhecido",
  "endpoint": "appointments",
  "code": "SLOT_UNAVAILABLE",
  "credentialId": "uuid quando conhecido",
  "tokenPrefix": "agz_tb_xxxx quando conhecido",
  "ipHash": "hash opcional do IP"
}
```

## Nunca registrar

```text
token completo
token hash
x-typebot-api-key
headers completos
cookies
password_hash
dados sensíveis desnecessários
stack trace em audit log
```

---

# 4. Padronização de erros

## Objetivo

Garantir que todos endpoints Typebot respondam JSON padronizado.

## Formato obrigatório

Sucesso:

```json
{
  "ok": true
}
```

Erro:

```json
{
  "ok": false,
  "code": "ERROR_CODE",
  "message": "Mensagem segura."
}
```

## Códigos mínimos

Confirmar suporte a:

```text
UNAUTHORIZED
RATE_LIMITED
BUSINESS_UNAVAILABLE
SERVICE_NOT_FOUND
SERVICE_UNAVAILABLE
NO_SLOTS_AVAILABLE
CUSTOMER_REQUIRED
SESSION_NOT_FOUND
INVALID_SLOT
SLOT_UNAVAILABLE
CUSTOM_FIELD_REQUIRED
CUSTOM_FIELD_INVALID
APPOINTMENT_NOT_FOUND
VALIDATION_ERROR
INTERNAL_ERROR
```

## Regras

* Nunca retornar stack trace.
* Nunca retornar erro bruto do Prisma.
* Nunca revelar assinatura vencida em mensagem pública.
* Nunca revelar se token existe, foi revogado ou pertence a outro tenant.
* Todos endpoints Typebot devem retornar `application/json; charset=utf-8`.

---

# 5. Testes automatizados

## Objetivo

Adicionar testes para os endpoints Typebot e autenticação por tenant.

Criar testes em estrutura existente.

Sugestão:

```text
tests/typebot/typebot-auth.test.ts
tests/typebot/typebot-endpoints.test.ts
tests/typebot/typebot-rate-limit.test.ts
```

ou conforme padrão atual do projeto.

## Casos obrigatórios

### Auth

```text
sem token -> 401
token inválido -> 401
token revogado -> 401
token de tenant A em tenant B -> 401
token válido -> ok
```

### Business/services

```text
tenant ativo e token válido -> ok
tenant suspenso -> BUSINESS_UNAVAILABLE
plano sem whatsappEnabled -> BUSINESS_UNAVAILABLE
serviço inativo não aparece
categoria inativa não aparece
```

### Service detail

```text
retorna customFields ativos
não retorna customFields inativos
SELECT retorna options
serviço de outro tenant -> SERVICE_NOT_FOUND
```

### Slots

```text
retorna slots dentro da disponibilidade
não retorna slot em conflito
não retorna slot em bloqueio
não retorna horário passado
```

### Identify

```text
cria customer
reutiliza customer por telefone
cria/reutiliza typebot_session
não cria user CUSTOMER
```

### Appointment

```text
cria origin WHATSAPP
createdByUserId null
respeita bookingMode
bloqueia conflito
bloqueia bloqueio
valida custom fields obrigatórios
valida SELECT inválido
```

### Rate limit

```text
excesso de requests -> 429 RATE_LIMITED
```

## Observação

Se testes E2E completos forem pesados, criar testes unitários/integration sobre services/helpers, mas garantir cobertura mínima da lógica crítica.

---

# 6. Troubleshooting doc

Criar:

```text
/docs/typebot/troubleshooting.md
```

Documentar problemas comuns:

```text
401 UNAUTHORIZED
429 RATE_LIMITED
BUSINESS_UNAVAILABLE
SERVICE_NOT_FOUND
NO_SLOTS_AVAILABLE
SLOT_UNAVAILABLE
CUSTOM_FIELD_REQUIRED
CUSTOM_FIELD_INVALID
INTERNAL_ERROR
Mojibake/encoding
Typebot não acessa localhost
Token revogado
Token de tenant errado
Plano sem WhatsApp habilitado
Sem disponibilidade configurada
```

Para cada problema:

```text
sintoma
causa provável
como verificar
como resolver
```

---

# 7. Atualizar documentação existente

Atualizar:

```text
/docs/technical/typebot-api.md
/docs/typebot/real-setup-guide.md
/docs/typebot/real-validation-checklist.md
/docs/typebot/simulator.md
README.md
```

Incluir:

```text
rate limit
health/status da integração
troubleshooting
tokens por tenant
erros 429
limitação do rate limit in-memory
```

---

# 8. Simulador

O simulador deve continuar funcionando.

## Regras

* Não deve exigir token Typebot.
* Não deve expor token.
* Deve continuar usando server actions/services internos.
* Se healthcheck for implementado na tela de credenciais, o simulador não precisa mudar.

---

# 9. Fora do escopo

Não implementar:

```text
WhatsApp Cloud API
webhook WhatsApp
envio ativo de mensagens
fila/worker
Redis rate limit
painel visual de bot
integração automática com Typebot
OAuth
HMAC por payload
área do cliente
cancelamento/remarcação via WhatsApp
pagamento
lembretes
alertas por e-mail/Slack
observabilidade externa
```

---

# Critérios de aceite

* Rate limit aplicado aos endpoints Typebot.
* Excesso retorna HTTP 429 com `RATE_LIMITED`.
* Rate limit não armazena token puro.
* Health/status Typebot por tenant visível no admin.
* Health/status mostra READY/WARNING/BLOCKED.
* Health/status não expõe token/hash.
* Erros Typebot padronizados.
* Todos endpoints Typebot retornam JSON UTF-8.
* Logs/audit seguros para falhas relevantes.
* Testes automatizados adicionados para auth por tenant.
* Testes automatizados adicionados para pelo menos parte dos endpoints Typebot.
* Teste de rate limit criado.
* `/docs/typebot/troubleshooting.md` criado.
* Documentação existente atualizada.
* README atualizado.
* Simulador continua funcionando.
* Link público web continua funcionando.
* Painel do prestador continua funcionando.
* Nenhuma regra de negócio crítica quebrada.
* `pnpm typecheck`, `pnpm lint`, `pnpm test` e `pnpm build` passam.

---

# Instruções para o DeepSeek

Implemente somente a Phase 12 Typebot Production Readiness.

Não implemente WhatsApp real, webhook, envio ativo, fila, Redis, observabilidade externa, painel visual de bot, OAuth, HMAC, área do cliente, pagamento ou lembretes.

Não exponha token completo, hash, header de autenticação ou segredos em logs, UI ou respostas.

Preserve a API Typebot, o simulador, o link público web e o painel do prestador.

Ao finalizar, informe:

```text
- arquivos criados
- arquivos alterados
- se houve migration
- rate limit implementado
- health/status implementado
- testes adicionados
- como validar
- validações executadas
- pendências conhecidas
```
