# Technical - Padrões de Código

## Objetivo

Definir padrões obrigatórios de desenvolvimento para manter o projeto consistente, seguro e adequado ao uso com Codex.

## Linguagem

Todo código de aplicação deve ser escrito em TypeScript.

Não criar arquivos `.js` para lógica de aplicação, exceto arquivos de configuração quando inevitável.

## Organização

Estrutura base recomendada:

```text id="cguoet"
/src
  /app
  /components
  /features
  /lib
  /server
  /types
```

## Regra de domínio

Regra de negócio não deve ficar duplicada em páginas, componentes ou endpoints.

Criar serviços reutilizáveis para regras como:

* validação de assinatura
* validação de disponibilidade
* criação de agendamento
* cancelamento
* geração de menu Typebot
* registro de audit log
* aplicação de template

## Validação

Toda entrada externa deve ser validada com Zod.

Entradas externas incluem:

* formulários
* API routes
* endpoints Typebot
* parâmetros de URL
* server actions
* dados vindos de integrações

Exemplo de padrão:

```text id="nlhyhv"
schema.parse(input)
```

ou

```text id="amxme7"
const result = schema.safeParse(input)
```

## Banco de dados

Acesso ao banco deve ser feito via Prisma.

Não usar SQL bruto, exceto quando estritamente necessário e documentado.

Toda consulta operacional deve respeitar tenant_id.

Não retornar password_hash em nenhuma resposta.

## Nomenclatura

## Arquivos

Usar kebab-case para arquivos de UI e utilitários.

Exemplos:

```text id="yoemcy"
tenant-form.tsx
subscription-table.tsx
appointment-service.ts
```

## Componentes React

Usar PascalCase.

Exemplos:

```text id="j6ei3y"
TenantForm
SubscriptionTable
AppointmentCalendar
```

## Funções

Usar camelCase.

Exemplos:

```text id="esrwna"
createTenant
validateAvailability
registerManualPayment
```

## Constantes

Usar UPPER_SNAKE_CASE para constantes globais.

Exemplo:

```text id="xu18cy"
DEFAULT_TRIAL_DAYS
```

## Erros

Endpoints devem retornar erros previsíveis.

Formato sugerido:

```json id="q2sb3u"
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "Dados inválidos."
}
```

Não expor stack trace para:

* cliente final
* Typebot
* usuários do prestador

## Logs

Criar logs de auditoria para ações sensíveis.

Não confundir audit log com console.log.

Evitar console.log em produção.

## UI

Usar shadcn/ui como base visual.

Padrões:

* páginas administrativas com título, descrição e ações principais
* tabelas com filtros e ações
* formulários com validação visível
* feedback de sucesso/erro
* loading states
* empty states

## Forms

Usar React Hook Form com Zod.

Todo formulário deve ter:

* validação
* mensagens de erro
* estado de carregamento
* confirmação visual ao salvar
* tratamento de erro

## Datas

Usar date-fns para formatação e manipulação simples.

Armazenar datas no banco em formato timestamp adequado.

Considerar timezone do tenant futuramente.

No MVP, o timezone padrão pode ser `America/Sao_Paulo`.

## Segurança

Obrigatório:

* validar permissões no servidor
* não confiar apenas em bloqueio visual
* não expor IDs sensíveis desnecessariamente
* não aceitar tenant_id arbitrário sem validar acesso
* proteger endpoints Typebot
* sanitizar dados exibidos quando necessário

## Seeds

Seeds podem criar:

* Super Admin inicial
* Plano inicial
* Templates iniciais

Seeds não devem ser usadas para manutenção recorrente.

Toda manutenção recorrente deve ter interface administrativa.

## Comentários

Comentários devem explicar decisões de negócio ou técnicas relevantes.

Não comentar obviedades.

## Testes

No MVP, priorizar testes para regras críticas:

* isolamento por tenant
* validação de conflito de agenda
* criação de agendamento
* bloqueio por assinatura
* permissões admin/prestador
* endpoints Typebot

## Critérios de aceite

* Código novo segue TypeScript.
* Entradas externas usam Zod.
* Prisma é usado como camada de acesso ao banco.
* Regras de negócio ficam em services.
* Rotas sensíveis validam permissão no servidor.
* Telas administrativas usam componentes consistentes.
* Não existem manutenções recorrentes dependentes apenas de seed/API manual.
