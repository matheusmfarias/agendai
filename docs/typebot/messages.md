# Mensagens ao Cliente

Catálogo de mensagens que o Typebot envia ao cliente final durante o fluxo conversacional.

---

## Princípios

- Mensagens curtas e diretas, adequadas ao WhatsApp.
- Nunca expor dados internos (inadimplência, assinatura vencida, stack traces, IDs).
- Sempre oferecer caminho de saída ("falar com atendimento").
- Usar emojis com moderação.
- Formatar listas com um item por linha.

---

## Mensagem de abertura

Após chamar `GET /business` com sucesso:

```
Olá! Eu sou o assistente virtual de {{tenantName}}.

Vou te ajudar a escolher um serviço e verificar os horários disponíveis.
```

---

## Menu inicial

```
Digite uma opção:

1 - Agendar um serviço
2 - Ver serviços disponíveis
3 - Falar com atendimento
```

---

## Coleta de dados do cliente

### Perguntar nome

```
Para começar, qual o seu nome?
```

### Perguntar telefone (se WhatsApp não fornecer)

```
Qual o seu telefone com DDD?

Exemplo: 55999999999
```

### Perguntar e-mail (opcional)

```
Se quiser, pode me informar seu e-mail para confirmarmos o agendamento.

Ou digite *pular* para continuar sem e-mail.
```

---

## Serviços

### Exibir lista de serviços

```
{{tenantName}} oferece estes serviços:

{{servicesText}}

Digite o número do serviço que você deseja agendar.
```

### Serviço escolhido

Após chamar `GET /services/{id}`:

```
Você escolheu: *{{selectedServiceDetailsJson.name}}*

⏱️ Duração: {{selectedServiceDetailsJson.durationMinutes}} minutos
💰 Valor: {{selectedServiceDetailsJson.priceText}}

{{#if customFieldsText}}{{customFieldsText}}{{/if}}

Vou buscar os próximos horários disponíveis...
```

---

## Horários

### Exibir lista de horários

```
Estes são os próximos horários disponíveis para *{{selectedServiceName}}*:

{{slotsText}}

Digite o número do horário desejado.
```

### Nenhum horário disponível

```
No momento não encontrei horários disponíveis para *{{selectedServiceName}}* nos próximos dias.

Você pode:

1 - Escolher outro serviço
2 - Falar com atendimento

Digite a opção desejada.
```

### Horário escolhido

```
Você escolheu: *{{selectedSlotLabel}}*
```

---

## Campos personalizados

### Perguntar campo de texto

```
Para continuar com *{{selectedServiceName}}*, preciso de mais uma informação:

{{customFieldLabel}}
```

### Perguntar campo SELECT

```
{{customFieldLabel}}

Opções:
{{optionsText}}

Digite o número da opção.
```

---

## Confirmação do resumo

Antes de criar o agendamento, exibir resumo e pedir confirmação:

```
Confirme os dados do agendamento:

📋 Serviço: {{selectedServiceName}}
📅 Data e horário: {{selectedSlotLabel}}
👤 Nome: {{customerName}}
{{#if customerNotes}}📝 Observação: {{customerNotes}}{{/if}}

Digite:
1 - Confirmar agendamento
2 - Cancelar
```

---

## Resultado do agendamento

### CONFIRMED (DIRECT)

```
✅ Agendamento confirmado com sucesso!

📋 Serviço: {{selectedServiceName}}
📅 Data e horário: {{selectedSlotLabel}}
👤 Nome: {{customerName}}
{{#if priceText}}💰 Valor: {{priceText}}{{/if}}

Obrigado por agendar com {{tenantName}}!
```

### REQUESTED (REQUIRES_CONFIRMATION)

```
📩 Sua solicitação foi enviada e aguarda confirmação.

📋 Serviço: {{selectedServiceName}}
📅 Data e horário solicitado: {{selectedSlotLabel}}
👤 Nome: {{customerName}}

{{tenantName}} vai analisar sua solicitação e confirmar em breve.

Qualquer dúvida, entre em contato: {{tenantWhatsapp}}
```

### WAITING_INFO (INFORMATIONAL)

```
📩 Sua solicitação foi enviada com sucesso.

📋 Serviço: {{selectedServiceName}}
👤 Nome: {{customerName}}

{{tenantName}} entrará em contato para dar continuidade ao seu atendimento.

📞 WhatsApp: {{tenantWhatsapp}}
📍 {{tenantCity}}/{{tenantState}}
```

---

## Falar com atendimento

### Opção 3 do menu

```
Você pode entrar em contato diretamente com {{tenantName}}:

📞 WhatsApp: {{tenantWhatsapp}}
📍 {{tenantCity}}/{{tenantState}}

Estamos à disposição!
```

---

## Mensagens de erro

### Erro genérico (fallback)

```
Tive um problema ao processar sua solicitação.

Tente novamente em alguns instantes ou entre em contato diretamente pelo WhatsApp: {{tenantWhatsapp}}
```

### Opção inválida

```
Não encontrei essa opção. Por favor, digite um dos números da lista.
```

### Serviço indisponível

```
Esse serviço não está disponível no momento.

Vou te mostrar a lista atualizada de serviços.
```

### Horário ocupado

```
Esse horário acabou de ficar indisponível.

Vou buscar os horários atualizados para você.
```

### Sessão expirada

```
Seu atendimento foi interrompido por inatividade.

Vamos começar novamente.
```

### Campo personalizado obrigatório

```
Preciso de mais uma informação para continuar com seu agendamento.
```

### Campo personalizado inválido

```
A informação enviada não parece válida. Vamos tentar novamente.
```

### Dados incorretos

```
Alguma informação não está correta. Vamos revisar os dados.
```

### Negócio indisponível

```
Este atendimento está temporariamente indisponível.

Entre em contato diretamente com o estabelecimento.
```

---

## Mensagens de encerramento

### Agendamento concluído

```
Obrigado por agendar com {{tenantName}}!

Se precisar de mais alguma coisa, é só chamar.
```

### Cliente desiste no meio do fluxo

```
Tudo bem! Se precisar agendar outro horário, é só me chamar.

{{tenantName}} está à disposição! 👋
```

---

## Referências

- [Fluxo conversacional](./flow-blueprint.md)
- [Tratamento de erros](./error-handling.md)
- [Chamadas HTTP](./http-requests.md)
