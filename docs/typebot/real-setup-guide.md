# Typebot Real Setup Guide

Guia prático para montar o fluxo conversacional completo no Typebot usando a API
do AgendaZap.

## Objetivo

Este guia transforma o [blueprint do fluxo](./flow-blueprint.md), o
[simulador](./simulator.md) e a [documentação da API](../technical/typebot-api.md)
em um roteiro passo a passo para configurar o Typebot real.

Ao final da configuração, o bot estará pronto para:
- Receber o cliente via WhatsApp
- Identificar/criar cliente no AgendaZap
- Listar serviços ativos
- Exibir detalhes e campos personalizados
- Mostrar horários disponíveis
- Criar agendamentos com `origin = WHATSAPP`

## Pré-requisitos

### No AgendaZap

- [ ] Aplicação rodando (local ou publicada) com URL acessível pelo Typebot
- [ ] Credencial Typebot gerada para o tenant (painel admin → detalhe do prestador → Credenciais Typebot)
- [ ] Pelo menos um tenant ativo com:
  - [ ] Plano com `whatsappEnabled = true`
  - [ ] Assinatura `ACTIVE` ou `TRIAL`
  - [ ] Categoria ativa com pelo menos um serviço ativo
  - [ ] `availability_rules` configuradas (horários de atendimento)
- [ ] Serviço com `bookingMode` definido (`DIRECT`, `REQUIRES_CONFIRMATION` ou `INFORMATIONAL`)
- [ ] (Opcional) Campos personalizados configurados no serviço

### No Typebot

- [ ] Conta no [Typebot](https://typebot.io) (cloud ou self-hosted)
- [ ] Bot criado com canal WhatsApp configurado
- [ ] (Para testes locais) URL do AgendaZap acessível publicamente

### Observação sobre localhost

Se o AgendaZap estiver rodando em `localhost`, o Typebot hospedado externamente
**não conseguirá acessá-lo**. Para testes locais:

- Use um túnel HTTPS para expor o servidor local temporariamente, **ou**
- Publique o AgendaZap em um ambiente de homologação com URL pública

Não é necessário indicar uma ferramenta específica — qualquer túnel HTTPS
funciona, desde que a URL base seja acessível pelo Typebot.

---

## Visão geral da montagem

A configuração do Typebot segue esta sequência:

1. **Variáveis** — criar todas as variáveis do bot
2. **Bloco Start** — início do fluxo
3. **Blocos HTTP** — 6 chamadas à API do AgendaZap
4. **Blocos de mensagem** — textos exibidos ao cliente
5. **Blocos de input** — captura de dados do cliente
6. **Blocos de lógica** — mapeamento de número → ID, validações, condicionais
7. **Tratamento de erros** — fallback para cada chamada HTTP

Cada aspecto é detalhado nos documentos específicos:
- [Variáveis e mapeamento](./real-variable-mapping.md)
- [Passo a passo dos blocos](./real-flow-steps.md)
- [Blocos HTTP](./real-http-blocks.md)
- [Checklist de validação](./real-validation-checklist.md)
- [Troubleshooting](./troubleshooting.md)

---

## Configuração inicial

### 1. Criar variáveis no Typebot

Acesse a aba **Variables** do seu bot e crie as variáveis listadas em
[real-variable-mapping.md](./real-variable-mapping.md).

As três variáveis de configuração devem ser preenchidas no início do fluxo:

| Variável | Valor | Observação |
|---|---|---|
| `apiBaseUrl` | URL base do AgendaZap | Ex: `https://agenda.seudominio.com`. Sem barra no final. |
| `tenantSlug` | Slug do prestador | Fixo por bot. Ex: `mecanica-silva` |
| `typebotApiKey` | Token da credencial do tenant | Gerado no painel admin. Prefixo `agz_tb_`. **Secreta** — nunca exibir em mensagem |

As demais variáveis são preenchidas durante a conversa (pelo cliente ou pelas
respostas da API).

### 2. Configurar header de autenticação

Toda chamada HTTP ao AgendaZap exige o header com o token da credencial do tenant:

```
x-typebot-api-key: {{typebotApiKey}}
```

O valor de `{{typebotApiKey}}` deve ser o token gerado no painel administrativo
(`/admin/tenants/[id]/typebot-credentials`). O token tem o prefixo `agz_tb_` e é
exibido apenas uma vez — copie-o no momento da geração.

Configure isso no bloco HTTP do Typebot, na seção de headers. Para requisições
`POST`, adicione também:

```
Content-Type: application/json; charset=utf-8
```

---

## Sequência geral de blocos

A ordem recomendada dos blocos no Typebot (fluxo principal, caminho feliz):

```
1. [Start]
2. [Set variable] apiBaseUrl, tenantSlug, typebotApiKey
3. [HTTP] GET /business
4. [Message] Boas-vindas com {{tenantName}}
5. [Message] Menu inicial (1-Agendar, 2-Serviços, 3-Atendimento)
6. [Choice/Input] Cliente digita 1
7. [Input] Capturar nome → {{customerName}}
8. [Se WhatsApp não fornecer telefone] [Input] Capturar telefone → {{customerPhone}}
9. [Input] Capturar e-mail (opcional) → {{customerEmail}}
10. [HTTP] POST /customers/identify
11. [HTTP] GET /services
12. [Message] Exibir {{servicesText}}
13. [Input] Cliente digita número do serviço
14. [Logic] Mapear número → selectedServiceId, selectedServiceName
15. [HTTP] GET /services/{{selectedServiceId}}
16. [Message] Exibir resumo do serviço
17. [Conditional] Se customFields não vazio → coletar campos
18. [HTTP] GET /services/{{selectedServiceId}}/slots?days=7
19. [Message] Exibir {{slotsText}}
20. [Input] Cliente digita número do horário
21. [Logic] Mapear número → selectedSlotStartsAt, selectedSlotLabel
22. [Message] Resumo para confirmação
23. [Input/Choice] Confirmar (1) ou Cancelar (2)
24. [HTTP] POST /appointments
25. [HTTP] GET /appointments/{{appointmentId}} (opcional, para dados completos)
26. [Message] Mensagem final conforme {{appointmentStatus}}
27. [End]
```

Detalhes de cada bloco e seus branches de erro em
[real-flow-steps.md](./real-flow-steps.md).

---

## Regras fundamentais

Estas regras devem ser seguidas em toda a configuração:

1. **O Typebot NÃO calcula disponibilidade** — sempre chama a API de slots
2. **O Typebot NÃO monta `startsAt` manualmente** — usa o valor exato retornado
3. **O Typebot NÃO confia em texto livre para `serviceId`** — mapeia número → ID do array
4. **O Typebot NÃO decide conflito** — a API valida e retorna `SLOT_UNAVAILABLE` se o horário foi ocupado
5. **O Typebot NÃO expõe dados internos** — mensagens de erro são genéricas
6. **Toda regra de negócio fica no AgendaZap** — o Typebot é apenas a interface conversacional

---

## Como testar

### Em ambiente local/dev

1. Suba o AgendaZap localmente com `pnpm dev`
2. Exponha com túnel HTTPS (para o Typebot acessar)
3. Atualize `apiBaseUrl` no Typebot com a URL do túnel
4. Use o [simulador](./simulator.md) do AgendaZap para validar o fluxo antes de testar no Typebot
5. Inicie uma conversa no canal de teste do Typebot
6. Siga o fluxo completo e verifique as chamadas HTTP no painel do Typebot

### Em ambiente publicado

1. Gere uma credencial Typebot para o tenant no painel administrativo
2. Configure `apiBaseUrl` com a URL real do AgendaZap
3. Configure `typebotApiKey` com o token da credencial (prefixo `agz_tb_`)
4. Teste o fluxo completo via WhatsApp de teste
5. Verifique os agendamentos criados no painel administrativo

### Validação pós-teste

Consulte o [checklist de validação](./real-validation-checklist.md) para
confirmar todos os itens.

---

## Limitações desta fase

- **WhatsApp Cloud API própria**: o AgendaZap **não** possui integração direta
  com WhatsApp Cloud API. O WhatsApp é gerenciado exclusivamente pelo Typebot.
- **Webhook**: o AgendaZap **não** recebe webhooks do WhatsApp ou do Typebot.
- **Envio ativo de mensagens**: o AgendaZap **não** envia mensagens proativamente
  (lembretes, confirmações, etc.).
- **Configuração manual**: todo o fluxo deve ser montado manualmente no Typebot.
  Não há export automático ou sincronização.
- **Um bot por prestador**: cada tenant precisa de seu próprio bot no Typebot
  com `tenantSlug` específico e seu próprio token de credencial (`agz_tb_`).
- **Sem painel de bot no AgendaZap**: a configuração e monitoramento do bot são
  feitos diretamente na plataforma Typebot.
- **Tokens exibidos apenas uma vez**: ao gerar uma credencial no painel admin,
  copie o token imediatamente. Ele não poderá ser recuperado depois.
- **Rate limit**: os endpoints Typebot têm limites por minuto (120 leitura,
  30 escrita, 20 auth). Evite loops sem delay no Typebot. Consulte
  [troubleshooting.md](./troubleshooting.md) para o erro 429.

---

## Referências

- [Variáveis e mapeamento](./real-variable-mapping.md)
- [Passo a passo dos blocos](./real-flow-steps.md)
- [Blocos HTTP](./real-http-blocks.md)
- [Checklist de validação](./real-validation-checklist.md)
- [Troubleshooting](./troubleshooting.md)
- [Blueprint do fluxo](./flow-blueprint.md)
- [Simulador](./simulator.md)
- [Documentação da API Typebot](../technical/typebot-api.md)
