# Typebot Flow Blueprint

Fluxo conversacional do Typebot para atendimento e agendamento via WhatsApp usando a API do AgendaZap (Phase 06).

## Responsabilidades

### O Typebot faz (camada conversacional)

- Cumprimentar o cliente
- Coletar nome, telefone, e-mail opcional
- Listar serviços (texto recebido da API)
- Apresentar horários (texto recebido da API)
- Receber escolha numérica do cliente
- Chamar APIs REST do AgendaZap
- Exibir confirmação ou mensagem de erro seguro

### O Typebot NÃO faz

- Calcular disponibilidade sozinho
- Decidir conflito de agenda
- Confirmar horário sem chamar API
- Criar cliente fora do AgendaZap
- Criar agendamento sem validação do AgendaZap
- Expor motivo administrativo de bloqueio
- Expor dados internos (inadimplência, assinatura vencida, stack traces)

**Toda regra crítica fica no AgendaZap.** O Typebot é apenas a interface conversacional.

---

## Fluxo principal — caminho feliz

```
1. INÍCIO DA CONVERSA
   Cliente envia primeira mensagem no WhatsApp.
   Typebot chama GET /api/typebot/{tenantSlug}/business.
   → Exibe mensagem de abertura com nome do prestador.

2. MENU INICIAL
   Typebot exibe opções:
   "1 - Agendar um serviço"
   "2 - Ver serviços disponíveis"
   "3 - Falar com atendimento"
   Cliente digita "1".

3. CAPTURAR NOME
   Typebot pergunta: "Qual o seu nome?"
   Cliente responde: "João Silva".
   Typebot armazena em customerName.

4. CAPTURAR TELEFONE
   Opção A: Typebot captura número do WhatsApp automaticamente.
   Opção B: Se o canal não fornecer, Typebot pergunta:
           "Qual o seu telefone com DDD?"
   Cliente responde: "55999999999".
   Typebot armazena em customerPhone.

5. IDENTIFICAR CLIENTE
   Typebot chama POST /api/typebot/{tenantSlug}/customers/identify.
   Body: { phone, name, email (opcional) }.
   → Salva customerId e sessionId.

6. LISTAR SERVIÇOS
   Typebot chama GET /api/typebot/{tenantSlug}/services.
   → Exibe servicesText como lista numerada.
   "Escolha um serviço digitando o número:"

7. CLIENTE ESCOLHE SERVIÇO
   Cliente digita "1".
   Typebot mapeia: selectedServiceId = services[0].id.

8. DETALHE DO SERVIÇO
   Typebot chama GET /api/typebot/{tenantSlug}/services/{selectedServiceId}.
   → Obtém dados do serviço (duração, preço, bookingMode) e campos personalizados ativos.
   → Salva selectedServiceDetailsJson, customFieldsJson, customFieldsText.
   → Exibe resumo do serviço escolhido ao cliente.

9. BUSCAR HORÁRIOS
   Typebot chama GET /api/typebot/{tenantSlug}/services/{selectedServiceId}/slots?days=7.
   → Exibe slotsText como lista numerada.
   "Estes são os próximos horários disponíveis. Digite o número desejado."

10. CLIENTE ESCOLHE HORÁRIO
    Cliente digita "1".
    Typebot mapeia: selectedSlotStartsAt = slots[0].startsAt.

11. CAMPOS PERSONALIZADOS (se customFields não estiver vazio)
    Typebot usa customFieldsText para perguntar os campos.
    Cliente responde cada campo, um por vez.
    Typebot monta array customValues com customFieldId e value de cada resposta.

12. CONFIRMAR RESUMO
    Typebot exibe resumo:
    "Confirmar agendamento?
     Serviço: Troca de óleo
     Data/hora: 29/06/2026 14:00
     Nome: João Silva
     {{#if customValues}}Placa: ABC-1234{{/if}}
     
     Digite 1 para confirmar ou 2 para cancelar."

13. CRIAR AGENDAMENTO
    Cliente digita "1".
    Typebot chama POST /api/typebot/{tenantSlug}/appointments.
    Body: { sessionId, customerId, serviceId, startsAt, customValues, customerNotes }.
    → Salva appointmentId, appointmentStatus, appointmentMessage.

14. EXIBIR CONFIRMAÇÃO
    Typebot consulta GET /api/typebot/{tenantSlug}/appointments/{appointmentId}
         para montar mensagem final com dados completos.
    Exibe appointmentMessage conforme status (CONFIRMED/REQUESTED/WAITING_INFO).
```

---

## Fluxo alternativo — só consultar serviços

```
1. Cliente digita "2 - Ver serviços disponíveis" no menu inicial.
2. Typebot chama GET /api/typebot/{tenantSlug}/services.
3. Exibe servicesText.
4. Pergunta: "Digite o número do serviço para ver horários ou 0 para voltar."
5. Se cliente digitar número → vai para passo 8 do fluxo principal.
6. Se digitar 0 → volta ao menu inicial.
```

---

## Fluxo alternativo — falar com atendimento

```
1. Cliente digita "3 - Falar com atendimento" no menu inicial.
2. Typebot exibe:
   "Você pode entrar em contato diretamente:
    📞 {tenant.whatsapp}
    📍 {tenant.city}/{tenant.state}"
3. Encerra o fluxo automatizado.
```

---

## Diagrama de sequência

```
Cliente          Typebot                 AgendaZap API
  │                 │                        │
  ├─ "oi" ─────────►│                        │
  │                 ├─ GET /business ────────►│
  │                 │◄─── { tenant } ────────┤
  │◄─ "Olá! Bem-vindo à Mecânica Silva." ───┤
  │                 │                        │
  │◄─ menu inicial ─┤                        │
  ├─ "1" ──────────►│                        │
  │                 │                        │
  │◄─ "Qual seu nome?"                       │
  ├─ "João" ───────►│                        │
  │                 │                        │
  │◄─ "Qual seu telefone?"                   │
  ├─ "55999999999"─►│                        │
  │                 ├─ POST /identify ───────►│
  │                 │◄── { customer, session }│
  │                 │                        │
  │                 ├─ GET /services ────────►│
  │                 │◄── { services, text } ──┤
  │◄─ "1 - Troca de óleo | 30 min" ─────────┤
  │                 │                        │
  ├─ "1" ──────────►│                        │
  │                 ├─ GET /slots ───────────►│
  │                 │◄── { slots, text } ─────┤
  │◄─ "1 - 29/06 14:00" ──────────────────────┤
  │                 │                        │
  ├─ "1" ──────────►│                        │
  │                 │                        │
  │◄─ "Confirmar?" ─┤                        │
  ├─ "1" ──────────►│                        │
  │                 ├─ POST /appointments ───►│
  │                 │◄── { appointment } ─────┤
  │                 │                        │
  │                 ├─ GET /appointments/{id}─►│
  │                 │◄── { appointment } ─────┤
  │◄─ "Confirmado! 29/06 às 14:00." ────────┤
```

---

## Booking modes e resultado

O status final do agendamento depende do `bookingMode` do serviço:

| Booking mode | Status | Significado |
|---|---|---|
| `DIRECT` | `CONFIRMED` | Horário confirmado automaticamente |
| `REQUIRES_CONFIRMATION` | `REQUESTED` | Aguarda confirmação do prestador |
| `INFORMATIONAL` | `WAITING_INFO` | Prestador entrará em contato |

O Typebot deve exibir a mensagem apropriada conforme o `message` retornado pela API no campo `appointmentMessage`.

---

## Referências

- [Variáveis do Typebot](./variables.md)
- [Chamadas HTTP](./http-requests.md)
- [Mensagens ao cliente](./messages.md)
- [Tratamento de erros](./error-handling.md)
- [Guia de teste manual](./testing-guide.md)
- [Documentação da API Typebot](../technical/typebot-api.md)
