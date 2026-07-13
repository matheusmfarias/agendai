# Planos de execução do Agendaí

Use um plano de execução para mudanças não triviais que atravessem múltiplos domínios, alterem contratos, incluam migrations, tenham rollout em etapas ou não caibam com segurança em uma única sessão curta. O plano é um artefato vivo: deve permitir que outro agente continue o trabalho apenas com o repositório e este documento.

Planos específicos podem ser criados em `docs/tasks/` quando fizer sentido manter histórico da entrega. Não crie um plano separado para correções pequenas e autocontidas.

## Regras do plano

- Escreva para uma pessoa que ainda não conhece a tarefa, usando caminhos e símbolos reais.
- Separe fatos observados, hipóteses e decisões.
- Registre a regra de negócio e o comportamento visível, não apenas uma lista de arquivos.
- Declare o escopo de tenant, papéis autorizados, entradas não confiáveis e dados sensíveis.
- Inclua riscos de compatibilidade e recuperação para mudanças de dados.
- Use somente comandos existentes no `package.json`.
- Mantenha um único escritor principal. Identifique claramente o que o QA pode editar.
- Atualize progresso e decisões conforme o trabalho avança; não reescreva o histórico para parecer linear.

## Modelo

```markdown
# <resultado observável da entrega>

## Contexto

Estado atual, problema e evidências com caminhos/símbolos.

## Escopo

Incluído, explicitamente não incluído e compatibilidade esperada.

## Regras e contratos

Regras de negócio, invariantes multi-tenant, papéis, entradas, saídas e erros.

## Decisões

- Decisão técnica local: escolha, motivo e alternativa descartada.
- Decisão material: estado (pendente/aprovada) e resposta do usuário.

## Plano de implementação

1. Etapa verificável com arquivos prováveis.
2. Etapa seguinte e dependências.

## Estratégia de testes

Casos positivos, negativos, cross-tenant e regressões; arquivos de teste previstos.

## Dados e rollout

Migration, backfill, compatibilidade, rollback e autorização necessária. Use “não se aplica” quando correto.

## Documentação

Documentos que precisam refletir o novo comportamento.

## Validação

- `pnpm lint`
- `pnpm typecheck`
- `pnpm build`
- `pnpm test`

## Progresso

- [ ] Exploração concluída.
- [ ] Arquitetura e decisões concluídas.
- [ ] Implementação concluída pelo escritor principal.
- [ ] Testes concluídos pelo QA.
- [ ] Checks completos aprovados.
- [ ] Revisão e segurança sem bloqueadores.
- [ ] Documentação e pacote de PR preparados.

## Achados e acompanhamento

Achados de QA/revisão/segurança, correções e riscos residuais.
```

## Conclusão

Ao concluir, preserve no plano apenas informações úteis para manutenção: decisões, resultado dos checks, migrations/rollout, achados resolvidos e riscos restantes. O resumo da entrega e o texto do pull request devem ser derivados dessas evidências. Preparar o PR não autoriza push, criação remota, merge ou deploy.
