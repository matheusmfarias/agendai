# Technical - Stack

## Objetivo

Definir a stack oficial do projeto e orientar o Codex a não substituir tecnologias sem autorização explícita.

## Stack oficial

| Camada              | Tecnologia                                         |
| ------------------- | -------------------------------------------------- |
| Framework fullstack | Next.js 16 com App Router                          |
| Linguagem           | TypeScript                                         |
| Runtime             | Node.js LTS                                        |
| Banco de dados      | PostgreSQL                                         |
| ORM                 | Prisma ORM                                         |
| UI                  | shadcn/ui                                          |
| Estilização         | Tailwind CSS                                       |
| Validação           | Zod                                                |
| Formulários         | React Hook Form + Zod                              |
| Tabelas             | TanStack Table                                     |
| Datas               | date-fns                                           |
| Autenticação        | Auth.js ou implementação própria baseada em sessão |
| Testes unitários    | Vitest                                             |
| Testes E2E          | Playwright, futuramente                            |
| WhatsApp            | Typebot + endpoints próprios                       |
| Deploy inicial      | Docker Compose em VPS ou EC2                       |

## Decisão principal

O projeto será um monolito modular fullstack.

Não haverá separação inicial entre frontend e backend.

A aplicação Next.js será responsável por:

* Painel Admin da plataforma
* Painel do prestador
* Link público do prestador
* API interna
* API pública para Typebot
* Autenticação
* Controle de permissões
* Acesso ao banco via Prisma

## Justificativa

Next.js com App Router é adequado para aplicações fullstack modernas, com suporte a layouts, rotas, Server Components e estrutura modular. Prisma ORM será usado pela integração type-safe com PostgreSQL. shadcn/ui e Tailwind CSS serão usados para acelerar a criação de interfaces administrativas consistentes.

## Gerenciador de pacotes

Preferência:

```bash
pnpm
```

O projeto deve usar um único gerenciador de pacotes.

Não misturar npm, yarn e pnpm.

## Convenções obrigatórias

* Todo código novo deve ser TypeScript.
* Não usar JavaScript puro em arquivos de aplicação.
* Não criar endpoints sem validação de entrada.
* Usar Zod para validação de payloads.
* Usar Prisma para acesso ao banco.
* Não acessar banco diretamente fora da camada definida.
* Não duplicar regra de negócio entre painel, link público e Typebot.
* Regras críticas devem ficar em services/server functions reutilizáveis.
* Todo dado operacional multiempresa deve respeitar tenant_id.
* Toda manutenção recorrente deve ter interface administrativa.

## Dependências principais previstas

```text
next
react
react-dom
typescript
prisma
@prisma/client
zod
react-hook-form
@hookform/resolvers
tailwindcss
shadcn/ui
date-fns
@tanstack/react-table
vitest
```

Dependências de autenticação serão fechadas na implementação da fase foundation.

## Fora do escopo técnico inicial

Não implementar no MVP:

* Microsserviços
* Fila distribuída
* Kubernetes
* App mobile nativo
* Gateway de pagamento
* Websocket/chat próprio
* IA conversacional avançada
* Integração Google Agenda
* Emissão fiscal
* Marketplace público

## Critérios de aceite

* Projeto iniciado com Next.js, TypeScript e App Router.
* Banco PostgreSQL configurado.
* Prisma configurado e versionado.
* shadcn/ui e Tailwind configurados.
* Zod disponível para validação.
* Estrutura preparada para painel admin, painel prestador, link público e endpoints Typebot.
* README deve indicar como rodar o projeto localmente.
