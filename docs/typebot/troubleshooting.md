# Typebot Troubleshooting

Guia de diagnóstico e resolução para problemas comuns na integração Typebot ↔ AgendaZap.

---

## 401 UNAUTHORIZED

**Sintoma:** Todas as chamadas HTTP do Typebot retornam `401` com `UNAUTHORIZED`.

**Causas prováveis:**
- Token não foi configurado no header `x-typebot-api-key`
- Token foi revogado no painel administrativo
- Token pertence a outro tenant (slug da URL diferente do tenant do token)
- Token copiado incorretamente (incompleto ou com espaços extras)
- Em dev, tenant já possui credenciais próprias — a chave global `TYPEBOT_API_KEY` não funciona mais

**Como verificar:**
1. No painel admin, acesse `/admin/tenants/[id]/typebot-credentials`
2. Confira se a credencial está com status **Ativa** (verde)
3. Confira se o `tenantSlug` configurado no Typebot corresponde exatamente ao slug do prestador
4. Verifique se o token foi copiado completamente (inclui o prefixo `agz_tb_`)

**Como resolver:**
1. Se o token foi revogado, gere uma nova credencial e atualize o `{{typebotApiKey}}` no Typebot
2. Se o slug está errado, corrija a variável `{{tenantSlug}}` no bloco **Set variable** do Typebot
3. Certifique-se de que o header está configurado exatamente como `x-typebot-api-key: {{typebotApiKey}}`

---

## 429 RATE_LIMITED

**Sintoma:** Chamadas retornam `429` com `RATE_LIMITED` e mensagem _"Muitas tentativas em pouco tempo."_

**Causa provável:**
- O fluxo do Typebot está fazendo muitas chamadas repetidas em curto intervalo
- Alguém está testando manualmente com curl/Postman em alta frequência
- O Typebot entrou em loop de retry

**Como verificar:**
1. Verifique os logs de auditoria no painel admin (`/admin/audit-logs`) filtrando por `TYPEBOT_RATE_LIMITED`
2. Revise o fluxo do Typebot para identificar chamadas redundantes ou loops

**Como resolver:**
1. Aguarde 1 minuto — o rate limit é por janela de 60 segundos
2. Adicione delays entre chamadas no fluxo do Typebot (bloco **Wait**)
3. Verifique se não há blocos HTTP em loop sem condição de saída

**Limites atuais:**
| Grupo | Limite |
|---|---|
| Leitura (business, services, service-detail, slots, appointment-detail) | 120 req/min |
| Escrita (identify, appointments) | 30 req/min |
| Autenticação falha | 20 req/min |

**Observação:** O rate limit é local/in-memory. Em produção com múltiplas instâncias, os limites se aplicam por instância. Para escala horizontal, substituir por Redis.

---

## BUSINESS_UNAVAILABLE

**Sintoma:** Resposta `400` com `BUSINESS_UNAVAILABLE` e mensagem _"Este atendimento está temporariamente indisponível."_

**Causas prováveis:**
- Prestador não existe (slug errado)
- Prestador está suspenso ou cancelado
- Plano não inclui WhatsApp (`whatsappEnabled = false`)
- Assinatura vencida ou cancelada

**Como verificar:**
1. No painel admin, acesse o detalhe do prestador (`/admin/tenants/[id]`)
2. Confira o **Status** do prestador — deve estar **Ativo**
3. Em **Assinatura atual**, confira se está **Active** ou **Trial**
4. Verifique se o plano do prestador tem WhatsApp habilitado
5. Consulte o **Status da integração Typebot** em `/admin/tenants/[id]/typebot-credentials`

**Como resolver:**
1. Reative o prestador se estiver suspenso
2. Atualize a assinatura ou registre novo pagamento
3. Altere o plano para um que inclua WhatsApp

---

## SERVICE_NOT_FOUND

**Sintoma:** `GET /services/{id}` ou `GET /slots` retorna `SERVICE_NOT_FOUND`.

**Causas prováveis:**
- Serviço foi inativado ou removido
- Categoria do serviço foi inativada
- `serviceId` inválido (erro no mapeamento número → ID no Typebot)

**Como verificar:**
1. No painel do prestador (`/app/services`), confira se o serviço está ativo
2. Em `/app/services/categories`, confira se a categoria está ativa
3. Verifique o mapeamento no Typebot: o número digitado pelo cliente deve corresponder ao índice do array `servicesJson` (índice = número - 1)

**Como resolver:**
1. Reative o serviço ou categoria no painel do prestador
2. Se o cliente escolheu um serviço que foi removido enquanto navegava, redirecione para `GET /services` para obter a lista atualizada

---

## NO_SLOTS_AVAILABLE

**Sintoma:** `GET /services/{id}/slots` retorna `NO_SLOTS_AVAILABLE`.

**Causas prováveis:**
- Não há horários disponíveis nos próximos 7 dias
- `availability_rules` não configuradas ou inativas
- Bloqueios (`schedule_blocks`) cobrindo todo o período
- Serviço sem `durationMinutes` configurado
- Todos os horários já estão ocupados
- Timezone não configurado ou inválido

**Como verificar:**
1. Em `/app/availability`, confira se há regras ativas de horário
2. Em `/app/availability/blocks`, confira se não há bloqueios cobrindo todo o período
3. Verifique a duração do serviço em `/app/services/[id]`
4. No **Status da integração Typebot**, confira "Disponibilidade configurada"
5. Verifique se o timezone do prestador está configurado em `/app/settings`

**Como resolver:**
1. Crie regras de disponibilidade com horários de atendimento
2. Ajuste a duração do serviço para um valor positivo
3. Remova bloqueios desnecessários
4. Configure o timezone em `/app/settings`

---

## SLOT_UNAVAILABLE

**Sintoma:** `POST /appointments` retorna `SLOT_UNAVAILABLE`.

**Causa provável:**
- O horário escolhido foi ocupado por outro agendamento entre a listagem de slots e a confirmação

**Como verificar:**
- Este é um cenário de concorrência normal — o horário estava livre na listagem mas foi ocupado antes da confirmação

**Como resolver:**
1. O Typebot deve capturar este erro e redirecionar para buscar slots atualizados
2. Exiba mensagem: _"Este horário acabou de ser preenchido. Vou mostrar os horários disponíveis novamente."_
3. Chame `GET /slots` novamente e exiba a lista atualizada

---

## CUSTOM_FIELD_REQUIRED / CUSTOM_FIELD_INVALID

**Sintoma:** `POST /appointments` retorna `CUSTOM_FIELD_REQUIRED` ou `CUSTOM_FIELD_INVALID`.

**Causas prováveis:**
- `CUSTOM_FIELD_REQUIRED`: um campo marcado como obrigatório não foi enviado em `customValues`
- `CUSTOM_FIELD_INVALID`: valor de campo SELECT não está entre as opções permitidas, ou tipo de dado inválido

**Como verificar:**
1. Confira os campos personalizados do serviço em `/app/services/[id]`
2. Verifique se o Typebot está montando `customValuesJson` com `customFieldId` (UUID) e `value` (string) para cada campo
3. Para SELECT, verifique se o valor enviado está exatamente igual a uma das opções (case-sensitive)

**Como resolver:**
1. O Typebot deve capturar este erro e voltar para a coleta do campo problemático
2. Certifique-se de que o `customFieldId` usado é o `id` do campo no array `customFieldsJson` (UUID), não o `key` nem o número

---

## INTERNAL_ERROR

**Sintoma:** Resposta `500` com `INTERNAL_ERROR`.

**Causas prováveis:**
- Erro inesperado no servidor do AgendaZap
- Problema de conexão com banco de dados
- Bug no processamento da requisição

**Como verificar:**
1. Verifique os logs do servidor do AgendaZap
2. Confira se o banco de dados está acessível
3. Tente a mesma requisição via curl para isolar o problema

**Como resolver:**
- Este erro requer investigação no servidor. O Typebot deve exibir mensagem genérica:
  _"Tive um problema ao processar sua solicitação. Tente novamente em instantes."_

---

## Encoding / Mojibake (caracteres corrompidos)

**Sintoma:** Resposta `400` com `VALIDATION_ERROR` e mensagem sobre caracteres inválidos. Nomes com acentos (João, José, etc.) são rejeitados.

**Causa provável:**
- O cliente (Typebot, curl, PowerShell) está enviando o corpo da requisição em encoding diferente de UTF-8

**Como verificar:**
- Se estiver testando com PowerShell: `Invoke-RestMethod` usa Windows-1252 por padrão, o que corrompe caracteres acentuados

**Como resolver:**
1. No Typebot: certifique-se de que o header `Content-Type: application/json; charset=utf-8` está configurado nos blocos HTTP POST
2. Via curl (bash): use `-H "Content-Type: application/json; charset=utf-8"`
3. Via PowerShell: converta o corpo para bytes UTF-8 explicitamente (veja exemplos em [typebot-api.md](../technical/typebot-api.md))

---

## Typebot não acessa localhost

**Sintoma:** O Typebot hospedado externamente não consegue chamar `http://localhost:3000/...`.

**Causa:**
- O Typebot cloud/self-hosted está em outro servidor e não tem acesso à sua máquina local

**Como resolver:**
1. Use um túnel HTTPS para expor seu servidor local temporariamente
2. Publique o AgendaZap em um ambiente de homologação com URL pública
3. Atualize `{{apiBaseUrl}}` no Typebot com a URL pública

---

## Token revogado acidentalmente

**Sintoma:** Token que funcionava parou de funcionar (401). A credencial aparece como "Revogada" na tabela.

**Causa:**
- Alguém clicou em "Revogar" no painel de credenciais

**Como verificar:**
- Acesse `/admin/tenants/[id]/typebot-credentials` e verifique a tabela de credenciais

**Como resolver:**
1. Gere uma nova credencial
2. Copie o novo token imediatamente
3. Atualize `{{typebotApiKey}}` no Typebot
4. O token antigo não pode ser recuperado

---

## Token de tenant errado

**Sintoma:** `401 UNAUTHORIZED`. O Typebot está configurado com o slug do tenant A mas o token é do tenant B.

**Causa:**
- Tokens são vinculados ao tenant — um token do tenant A não funciona para o tenant B

**Como verificar:**
1. No painel admin, acesse as credenciais de cada tenant
2. Confira qual token foi copiado para qual bot do Typebot

**Como resolver:**
1. Gere credenciais separadas para cada tenant
2. Cada bot do Typebot deve usar seu próprio `{{tenantSlug}}` e `{{typebotApiKey}}`

---

## Plano sem WhatsApp habilitado

**Sintoma:** `BUSINESS_UNAVAILABLE` mesmo com prestador ativo e assinatura ativa.

**Causa:**
- O plano contratado pelo prestador não inclui WhatsApp (`whatsappEnabled = false`)

**Como verificar:**
1. Acesse `/admin/plans` e confira o plano do prestador
2. No **Status da integração Typebot** em `/admin/tenants/[id]/typebot-credentials`, verifique o check "WhatsApp habilitado no plano"

**Como resolver:**
1. Edite o plano para habilitar WhatsApp, ou
2. Migre o prestador para um plano com WhatsApp

---

## Sem disponibilidade configurada

**Sintoma:** `NO_SLOTS_AVAILABLE` em todas as consultas de slots. O **Status da integração Typebot** mostra "Disponibilidade configurada" como ✗.

**Causa:**
- O prestador não configurou horários de atendimento em `/app/availability`

**Como resolver:**
1. Acesse o painel do prestador (`/app/availability`)
2. Crie pelo menos uma regra de disponibilidade (ex: Seg-Sex 08:00-18:00)

---

## Status da integração Typebot

Para diagnóstico rápido, acesse a página de credenciais do prestador:

```
/admin/tenants/[id]/typebot-credentials
```

O card **Status da integração Typebot** exibe:

- **READY** (verde): todos os checks passaram — o prestador está pronto
- **WARNING** (amarelo): checks essenciais passaram, mas há pontos de atenção (sem uso recente, poucos serviços)
- **BLOCKED** (vermelho): há bloqueios que impedem o funcionamento — resolva os itens marcados com ✗

Checks exibidos:
- Prestador ativo, Assinatura ativa, WhatsApp habilitado no plano
- Credencial Typebot ativa, Categorias ativas, Serviços ativos
- Disponibilidade configurada
- Política de assinatura (status, dias vencidos, canais permitidos)
- Último uso de credencial, Último agendamento WhatsApp, Última sessão Typebot

---

## Assinatura vencida — Bloqueio de canais

**Sintoma:** Typebot retorna `BUSINESS_UNAVAILABLE` para criação de agendamento (POST /appointments) mas consultas (business, services, slots) ainda funcionam. Ou todos os endpoints retornam `BUSINESS_UNAVAILABLE`.

**Causa:**
- A assinatura do prestador está vencida, acionando a política de enforcement:
  - **8–15 dias vencido:** apenas criação de agendamento é bloqueada; consultas continuam funcionando
  - **>15 dias vencido:** todos os endpoints Typebot são bloqueados
  - A assinatura também pode estar `SUSPENDED`, `CANCELED` ou inexistente

**Como verificar:**
1. Acesse `/admin/tenants/[id]/typebot-credentials`
2. No card **Status da integração Typebot**, verifique os checks de política:
   - "Política de assinatura" — mostra status e dias vencidos
   - "Criação via Typebot" — mostra se está permitida ou bloqueada
3. No simulador (`/admin/typebot-simulator`), selecione o tenant e veja o status da política

**Como resolver:**
1. Acesse `/admin/subscriptions/[id]` e ajuste o vencimento ou registre um pagamento
2. Se a assinatura estiver `SUSPENDED` ou `CANCELED`, reative-a conforme apropriado
3. Consulte [`subscription-enforcement.md`](../technical/subscription-enforcement.md) para a política completa
