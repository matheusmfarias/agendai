# Tratamento de Erros no Typebot

> **Documento histórico.** O blueprint importável usa branches seguros por
> status HTTP e nunca mostra `code` ou `message` ao cliente. Consulte
> [`flow-blueprint.md`](./flow-blueprint.md).

Como o Typebot deve tratar cada código de erro retornado pela API do Agendaí.

---

## Estrutura da resposta de erro

Todo erro da API segue este formato:

```json
{
  "ok": false,
  "code": "CODIGO_DO_ERRO",
  "message": "Mensagem amigável (não necessariamente para o cliente final)"
}
```

O Typebot deve usar `code` para decidir a ação e `message` como fallback interno. **Nunca** expor `message` diretamente ao cliente sem avaliar o código — algumas mensagens contêm contexto técnico.

---

## Tabela de tratamento

| Código | Causa provável | Mensagem ao cliente | Ação do Typebot |
|---|---|---|---|
| `UNAUTHORIZED` | API key ausente ou inválida | "Não foi possível iniciar o atendimento agora. Tente novamente mais tarde." | Logar erro internamente. Não repetir chamada. |
| `BUSINESS_UNAVAILABLE` | Prestador inativo/suspenso | "Este atendimento está temporariamente indisponível. Entre em contato diretamente com o estabelecimento." | Encerrar fluxo. |
| `SERVICE_NOT_FOUND` | Serviço não encontrado | "Esse serviço não está disponível no momento. Vou te mostrar a lista atualizada de serviços." | Chamar `GET /services` novamente. |
| `SERVICE_UNAVAILABLE` | Serviço inativo | "Esse serviço não está disponível no momento. Vou te mostrar a lista atualizada de serviços." | Chamar `GET /services` novamente. |
| `NO_SLOTS_AVAILABLE` | Sem horários nos próximos dias | "Não encontrei horários disponíveis para esse serviço nos próximos dias." | Oferecer: 1-escolher outro serviço, 2-falar com atendimento. |
| `CUSTOMER_REQUIRED` | Cliente não encontrado | "Não consegui identificar seu cadastro. Vamos começar novamente." | Voltar ao passo de capturar nome/telefone. Chamar `POST /identify` novamente. |
| `SESSION_NOT_FOUND` | Sessão expirada ou inválida | "Seu atendimento foi interrompido por inatividade. Vamos começar novamente." | Voltar ao passo de capturar nome/telefone. Chamar `POST /identify` novamente. |
| `INVALID_SLOT` | Horário no passado ou inválido | "Esse horário não é válido. Vou buscar os horários atualizados." | Chamar `GET /slots` novamente. |
| `SLOT_UNAVAILABLE` | Horário acabou de ser ocupado/bloqueado | "Esse horário acabou de ficar indisponível. Vou buscar os horários atualizados para você." | Chamar `GET /slots` novamente. |
| `CUSTOM_FIELD_REQUIRED` | Campo personalizado obrigatório não enviado | "Preciso de mais uma informação para continuar." | Perguntar o campo faltante novamente. Reenviar `POST /appointments` com o valor preenchido. |
| `CUSTOM_FIELD_INVALID` | Valor inválido em campo SELECT ou outro | "A informação enviada não parece válida. Vamos tentar novamente." | Perguntar o campo novamente, mostrando opções válidas se for SELECT. |
| `APPOINTMENT_NOT_FOUND` | Agendamento não encontrado | "Não encontrei os dados do seu agendamento." | Apenas informar. Não repetir chamada. |
| `VALIDATION_ERROR` | Payload malformado, encoding incorreto, ou campo inválido | "Alguma informação não está correta. Vamos revisar os dados." | Voltar ao passo de revisão dos dados. Se for mojibake, pedir para digitar novamente sem caracteres especiais. |
| `INTERNAL_ERROR` | Erro inesperado no servidor | "Tive um problema ao processar sua solicitação. Tente novamente em alguns instantes ou fale com o atendimento." | Aguardar ~2 segundos e tentar novamente uma única vez. Se falhar de novo, encerrar com mensagem de fallback. |

---

## Como implementar no Typebot

### Bloco condicional por código de erro

Em cada bloco HTTP do Typebot, após a chamada, verificar:

```
SE response.ok == true:
  → Seguir fluxo normal (salvar variáveis, exibir mensagem, próximo passo)

SENÃO:
  → Avaliar response.code:

  "BUSINESS_UNAVAILABLE":
    → Exibir mensagem de indisponibilidade
    → Encerrar fluxo

  "SERVICE_NOT_FOUND":
  "SERVICE_UNAVAILABLE":
    → Exibir: "Esse serviço não está disponível no momento. Vou te mostrar a lista atualizada de serviços."
    → Chamar GET /services novamente

  "NO_SLOTS_AVAILABLE":
    → Exibir mensagem de sem horários
    → Oferecer opções (outro serviço / falar com atendimento)

  "SLOT_UNAVAILABLE":
    → Exibir mensagem de horário indisponível
    → Chamar GET /slots novamente
    → Voltar para captura de número do slot

  "SESSION_NOT_FOUND":
    → Exibir mensagem de sessão expirada
    → Voltar para captura de nome/telefone

  "VALIDATION_ERROR":
    → Exibir mensagem genérica de revisão
    → Voltar para revisão dos dados

  "INTERNAL_ERROR":
    → Exibir mensagem de erro
    → (Opcional) tentar novamente uma vez
    → Se falhar novamente, encerrar com fallback

  Qualquer outro código:
    → Exibir mensagem de fallback:
      "Tive um problema ao processar sua solicitação. Tente novamente em alguns instantes."
```

---

### Tratamento de erros HTTP (antes de checar `ok`)

O Typebot também deve tratar falhas na própria chamada HTTP:

| Erro HTTP | Significado | Ação |
|---|---|---|
| Timeout | API não respondeu a tempo | "Não consegui processar agora. Tente novamente em alguns instantes." Tentar 1×. |
| 5xx (500, 502, 503) | Erro do servidor | "Tive um problema ao processar sua solicitação. Tente novamente em alguns instantes." Tentar 1×. |
| Resposta não-JSON | Erro de infra/proxy | "Tive um problema ao processar sua solicitação. Tente novamente em alguns instantes." |
| 401 | API key inválida | Não expor ao cliente. Logar internamente. |

---

## Fallback global

Se o Typebot não conseguir identificar o erro específico, usar a mensagem de fallback:

```
Tive um problema ao processar sua solicitação.

Tente novamente em alguns instantes ou entre em contato diretamente pelo WhatsApp: {{tenantWhatsapp}}
```

---

## Limite de tentativas

Para evitar loops infinitos, limitar tentativas:

| Situação | Máximo de tentativas |
|---|---|
| Reenvio de appointment | 2 |
| Reenvio de identify | 2 |
| Reconsulta de slots | 2 |
| Reconsulta de services | 2 |
| Campo personalizado inválido | 3 (depois encerrar) |
| Opção numérica inválida | 3 (depois oferecer atendimento) |
| Erro `INTERNAL_ERROR` | 2 (depois encerrar com fallback) |

Após estourar o limite de tentativas, exibir mensagem de fallback e encerrar o fluxo automatizado, oferecendo contato direto com o prestador.

---

## Segurança

- **Nunca** expor `code` ou `message` da API diretamente ao cliente.
- **Nunca** expor stack traces, queries SQL, ou dados de infraestrutura.
- **Nunca** revelar que o prestador está inadimplente ou com assinatura vencida.
- Mensagens de erro devem ser genéricas e seguras para cliente final.
- `typebotApiKey` nunca deve aparecer em logs, mensagens de erro ou telas.

---

## Referências

- [Fluxo conversacional](./flow-blueprint.md)
- [Mensagens ao cliente](./messages.md)
- [Chamadas HTTP](./http-requests.md)
- [Documentação da API Typebot](../technical/typebot-api.md)
