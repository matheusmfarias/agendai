# Agendaí — instruções permanentes para agentes

## Produto e fontes de verdade

Agendaí é o nome atual e definitivo do produto. `AgendaZap` é um nome legado ainda presente em documentação histórica, no caminho local do repositório e em identificadores persistidos. Use `Agendaí` em todo conteúdo novo. Não renomeie cookies, bancos, volumes, credenciais, URLs ou outros identificadores persistidos apenas por consistência de marca; trate essa troca como migração de compatibilidade e planeje-a explicitamente.

Antes de trabalhar, leia somente as fontes relevantes para a entrega:

- `README.md`: setup, rotas, comandos e estado funcional;
- `docs/technical/arquitetura.md`: monólito modular e limites de camadas;
- `docs/technical/auth-permissoes.md`: autenticação, autorização e isolamento;
- `docs/technical/banco-dados.md`: modelo de dados e migrations;
- `docs/technical/padroes-codigo.md`: convenções de implementação;
- `docs/specs/`: regras e limites do produto;
- `docs/design/` e os tokens/componentes atuais: direção de UI/UX.

O código executável, `package.json`, `prisma/schema.prisma` e as configurações atuais prevalecem quando documentação histórica divergir. Registre e corrija a divergência na mesma entrega quando estiver dentro do escopo. Para UI, confira especialmente `src/app/globals.css`, `src/config/brand.ts`, `components.json` e `src/components/ui`; documentos antigos ainda podem descrever a identidade AgendaZap anterior.

## Arquitetura real

Este repositório é um monólito full-stack modular com Next.js 16 App Router, React 19, TypeScript estrito, PostgreSQL 17 e Prisma 7. O gerenciador é pnpm 10.26.2 e o Node.js mínimo é 20.19.0.

- `src/app`: páginas, layouts, route groups e route handlers;
- `src/components`: primitives de UI, layout, formulários, tabelas e marca;
- `src/features`: regras, schemas e UI organizados por domínio;
- `src/server/actions`: Server Actions e adaptação de entradas;
- `src/server/services`: regras de negócio e coordenação de casos de uso;
- `src/server/repositories`: consultas e persistência via Prisma;
- `src/lib`: infraestrutura e utilitários compartilhados;
- `prisma/schema.prisma`, `prisma/migrations` e `prisma/seed.ts`: banco, histórico e bootstrap;
- `docs`: especificações, decisões técnicas, design e histórico de entregas.

As superfícies principais são `/admin` para Super Admin, `/app` para o prestador, `/cliente` para o cliente autenticado, `/[tenantSlug]` para agendamento público e `/api/typebot/[tenantSlug]` para a integração conversacional.

## Orquestração obrigatória

A sessão raiz é o agente orquestrador. Ela mantém contexto, resolve dependências, escolhe os especialistas e responde pelo resultado final. Para toda mudança não trivial, siga esta ordem:

1. Delegue a `agendai_explorer` a exploração do código existente.
2. Identifique regras de negócio, contratos, dados, superfícies e impactos.
3. Delegue a `agendai_architect` a arquitetura e o plano; use `PLANS.md` quando a entrega for extensa.
4. Pergunte ao usuário apenas por decisões materiais ainda não resolvidas pelas fontes do repositório.
5. Designe `agendai_builder` como único escritor principal da entrega e implemente o plano aprovado.
6. Delegue a `agendai_qa` a criação ou atualização de testes e recursos de teste.
7. Execute `pnpm lint`, `pnpm typecheck`, `pnpm build` e `pnpm test`.
8. Delegue a `agendai_reviewer` a revisão completa do diff.
9. Delegue a `agendai_security` à auditoria de segurança.
10. Faça o escritor principal corrigir todos os achados bloqueadores de revisão, segurança e QA.
11. Repita os testes afetados e os quatro checks completos.
12. Atualize a documentação que descreve o comportamento alterado.
13. Prepare resumo de entrega, riscos, evidências dos checks e texto do pull request.

Exploração inicial pode ocorrer em paralelo com levantamentos independentes. Depois da implementação, `agendai_reviewer` e `agendai_security` devem trabalhar em paralelo quando possível. O orquestrador evita dois agentes editando o mesmo arquivo e mantém apenas um escritor principal; o QA é um escritor secundário estritamente confinado a testes.

O `sandbox_mode` do perfil é uma proteção local, mas permissões vivas escolhidas na sessão raiz podem prevalecer. O orquestrador não eleva agentes read-only nem os autoriza a mutar serviços externos. O Codex não oferece neste formato uma allowlist de caminhos para o QA: sua limitação a testes é comportamental e deve ser fiscalizada por coordenação, `git diff` e revisão antes de aceitar o trabalho.

Não use a equipe completa para mudanças triviais como correções ortográficas isoladas. Ainda assim, respeite as regras permanentes e faça validação proporcional ao risco.

## Decisões e autonomia

Considere material e pergunte ao usuário antes de executar quando houver:

- mudança relevante de UX;
- nova regra comercial;
- mudança de planos, preços ou pagamentos;
- alteração destrutiva de dados;
- dependência externa paga;
- mudança de infraestrutura com custo;
- redução de segurança;
- ação irreversível;
- duas opções plausíveis com efeitos diferentes no produto.

Decisões técnicas locais, reversíveis e coerentes com a arquitetura existente devem ser tomadas autonomamente. Registre-as no plano, documentação ou resumo da entrega, conforme a relevância. Falta de preferência estética ou detalhe de implementação não é motivo para interromper o trabalho quando os padrões existentes oferecem uma resposta segura.

## Regras permanentes de engenharia

### Multi-tenancy e autorização

- Todo dado operacional pertence a um tenant. Derive o escopo do contexto autenticado ou do tenant resolvido pelo slug; nunca confie em `tenantId` ou ID de recurso fornecido pelo cliente sem validar o vínculo.
- Toda leitura, escrita, relação e verificação de existência operacional deve incluir o filtro de tenant. Um ID único não substitui o isolamento.
- O banco não possui Row-Level Security; o isolamento na aplicação é obrigatório e deve ter testes proporcionais ao risco.
- Proteja páginas nos layouts e aplique autorização real no servidor com os helpers de `src/features/auth/permissions.ts`. A presença do cookie no `src/proxy.ts` não substitui autorização.
- Preserve os papéis globais `SUPER_ADMIN`, `USER`, `CUSTOMER` e os papéis de tenant `OWNER`, `ADMIN`, `OPERATOR`.
- Proteja route handlers, Server Actions, uploads, exports e endpoints Typebot. Ações sensíveis devem manter auditoria adequada.

### TypeScript, entradas e erros

- Mantenha `strict: true`. Não use `any`, casts amplos ou supressões para ocultar erros de tipo. Investigue e modele a causa.
- Valide toda entrada externa no boundary com Zod: formulários, FormData, parâmetros, query strings, JSON, APIs e integrações.
- Centralize regra de negócio reutilizável em services ou policies; não a duplique em páginas, componentes, actions e endpoints.
- Use Prisma para persistência. SQL bruto exige necessidade demonstrada, parametrização e documentação.
- Preserve contratos de erro consistentes, mensagens úteis e logs seguros. Não exponha stack traces, tokens, hashes, segredos ou dados de outro tenant.
- Não silencie erros de lint, tipo, build, teste ou runtime sem investigar e registrar a causa.
- Mocks, stubs e dados falsos ficam restritos a testes, histórias ou simuladores explicitamente identificados. Fluxos de produção usam dados e integrações reais ou falham de forma explícita.

### UI/UX

- Implemente mobile-first e valide breakpoints relevantes. Tabelas devem conservar o padrão responsivo existente de cards no mobile e tabela em telas maiores quando aplicável.
- Reutilize tokens, primitives e padrões atuais de `src/components/ui`, `src/components/layout`, `src/components/forms` e `src/components/tables` antes de criar variantes.
- Preserve acessibilidade: HTML semântico, navegação por teclado, foco visível, labels, nomes acessíveis, contraste, mensagens com `aria-live` quando necessário e respeito a movimento reduzido.
- Não faça redesign incidental. Mudança relevante de UX é decisão material.

### Banco e migrations

- Toda mudança de schema precisa de migration Prisma versionada e revisão do SQL gerado.
- Prefira mudanças aditivas, compatíveis e reversíveis. Planeje backfill e rollout quando houver dados existentes.
- Não execute `pnpm db:migrate`, `pnpm db:deploy`, seed ou SQL contra banco compartilhado/produção como parte dos checks normais.
- Não aplique migration destrutiva sem autorização explícita do usuário e plano de recuperação.

### Testes e qualidade

- Os testes Vitest são co-localizados em `src` como `*.test.ts`; não existe hoje suíte E2E, Playwright nem script de coverage.
- Cubra regras e regressões proporcionalmente ao risco, priorizando isolamento por tenant, autorização, conflitos de agenda, assinatura, financeiro, dados de clientes e Typebot.
- Não remova, enfraqueça ou pule teste existente apenas para fazer a suíte passar.
- Não altere expectativas corretas para acomodar uma regressão. Corrija a causa.
- Uma tarefa não está pronta enquanto qualquer check obrigatório falhar. Se houver falha preexistente comprovada, reporte-a claramente e não declare sucesso integral.

## Comandos reais

Instalação e execução local:

```bash
pnpm install
pnpm dev
```

Checks obrigatórios para entrega não trivial:

```bash
pnpm lint
pnpm typecheck
pnpm build
pnpm test
```

Comandos Prisma disponíveis, somente quando o escopo exigir e o ambiente estiver confirmado:

```bash
pnpm db:generate
pnpm db:migrate
pnpm db:deploy
pnpm db:seed
pnpm db:studio
```

Não invente comandos `npm`, `yarn`, Playwright, E2E ou coverage que o `package.json` não fornece.

## Limites operacionais

- Não altere `.env` e não exponha valores de ambiente ou segredos. `.env.example` só pode mudar quando a entrega adicionar ou remover uma variável pública de configuração.
- Não execute deploy.
- Não faça push, merge, force-push ou publicação sem autorização explícita.
- Commits só podem ser criados quando solicitados ou autorizados; não inclua alterações preexistentes do usuário.
- Preparar um pull request significa produzir título, corpo e checklist. Criá-lo remotamente exige autorização explícita e branch publicada.
- Preserve arquivos e mudanças não relacionados, inclusive em worktree sujo.

## Critério de bloqueio e entrega

Achados bloqueadores incluem falha funcional ou de contrato, vazamento entre tenants, bypass de autorização, entrada não validada em superfície sensível, segredo exposto, migration insegura, regressão de acessibilidade crítica e falha nos checks obrigatórios. O orquestrador não conclui a entrega até corrigi-los e repetir as validações.

O resumo final deve informar: escopo implementado, decisões técnicas, arquivos principais, migrations ou variáveis (se houver), testes adicionados, resultado exato dos checks, achados de revisão/segurança resolvidos, riscos restantes e texto preparado para o pull request.
