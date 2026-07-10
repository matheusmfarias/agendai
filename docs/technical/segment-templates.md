# Segment Templates

## Objetivo

Templates de segmento aceleram o onboarding de prestadores, criando automaticamente a estrutura inicial de operação (categorias, serviços, campos personalizados e horários) com base no segmento do negócio.

## Templates disponíveis

| Chave                  | Nome                      | Segmento            | Categorias | Serviços | Campos customizados |
| ---------------------- | ------------------------- | ------------------- | ---------- | -------- | ------------------- |
| `mechanic`             | Mecânica                  | Oficina             | 3          | 6        | 14                  |
| `barbershop`           | Barbearia                 | Barbearia           | 3          | 5        | 3                   |
| `manicure`             | Manicure                  | Manicure            | 4          | 6        | 5                   |
| `beauty`               | Estética                  | Estética            | 4          | 5        | 10                  |
| `technical_assistance` | Assistência técnica       | Assistência Técnica | 3          | 6        | 11                  |
| `clinic_simple`        | Clínica/consultório simples | Clínica           | 3          | 4        | 6                   |

## O que cada template cria

Cada template define:

- **Categorias de serviço** com nome, descrição e ordem
- **Serviços** com nome, duração, tipo de preço, valor sugerido, modo de agendamento e ordem
- **Campos personalizados** com label, key, tipo, obrigatoriedade e opções (para SELECT)
- **Horários sugeridos** (opcional): segunda a sexta 08:00–12:00 e 13:30–18:00, sábado 08:00–12:00, com intervalos de 30 minutos

## Template Mechanics (Mecânica)

### Categorias

- **Diagnóstico** — Serviços de avaliação e identificação de problemas
- **Manutenção** — Serviços de manutenção preventiva e corretiva
- **Serviços rápidos** — Serviços de execução rápida

### Serviços principais

| Serviço                    | Duração | Preço        | Modo                    |
| -------------------------- | ------- | ------------ | ----------------------- |
| Diagnóstico veicular       | 60 min  | A partir de  | Requer confirmação      |
| Troca de óleo              | 30 min  | A partir de  | Agendamento direto      |
| Revisão preventiva         | 90 min  | A partir de  | Requer confirmação      |
| Freios                     | 60 min  | A partir de  | Requer confirmação      |
| Suspensão                  | 90 min  | A partir de  | Requer confirmação      |
| Alinhamento e balanceamento | 45 min  | Preço fixo    | Agendamento direto      |

### Campos personalizados

Placa do veículo, modelo do veículo, ano do veículo, descrição do problema, tipo de combustível (select), quilometragem, sintomas de freio.

## Template Barbershop (Barbearia)

### Serviços

| Serviço        | Duração | Preço     | Modo               |
| -------------- | ------- | --------- | ------------------ |
| Corte masculino | 30 min  | Preço fixo | Agendamento direto |
| Corte infantil  | 30 min  | Preço fixo | Agendamento direto |
| Sobrancelha     | 15 min  | Preço fixo | Agendamento direto |
| Barba           | 20 min  | Preço fixo | Agendamento direto |
| Corte + barba   | 45 min  | Preço fixo | Agendamento direto |

Característica: todos os serviços são DIRECT e FIXED.

## Template Manicure

### Categorias

Mãos, Pés, Combos, Alongamento

### Especificidades

- Alongamento de unhas usa REQUIRES_CONFIRMATION e STARTING_AT
- Demais serviços são DIRECT e FIXED

## Template Beauty (Estética)

### Categorias

Facial, Corporal, Depilação, Avaliação

### Especificidades

- Avaliação estética tem preço HIDDEN
- Procedimento corporal e avaliação requerem confirmação
- Todos os serviços perguntam sobre alergias e gestação

## Template Technical Assistance (Assistência Técnica)

### Categorias

Celulares, Computadores, Orçamentos

### Especificidades

- Diagnóstico técnico é ON_REQUEST
- Orçamento de reparo é HIDDEN
- A maioria dos serviços usa REQUIRES_CONFIRMATION

## Template Clinic Simple (Clínica/Consultório)

### Categorias

Consultas, Avaliações, Retornos

### Especificidades

- Primeira consulta e avaliação requerem confirmação
- Teleatendimento tem campo personalizado SELECT para preferência de contato

## Regras de idempotência

A aplicação do template é idempotente — pode ser executada múltiplas vezes sem efeitos colaterais:

1. **Categorias**: não duplica categorias com mesmo nome
2. **Serviços**: não duplica serviços com mesmo nome dentro da mesma categoria
3. **Campos personalizados**: não duplica campos com mesma key dentro do mesmo serviço (constraint `@@unique([serviceId, key])` no banco)
4. **Horários**: não duplica regras com mesmo weekday + startTime + endTime
5. **Dados existentes**: não sobrescreve nenhum dado existente

Isso significa que o prestador pode ter seus próprios dados coexistindo com os dados do template — o template apenas preenche lacunas.

## Permissões

- **SUPER_ADMIN**: única role que pode aplicar templates nesta fase
- **TENANT_USER / CUSTOMER / visitante**: acesso bloqueado

O prestador pode editar ou complementar os dados depois pelo painel `/app`.

## Como aplicar

1. Acesse `/admin/tenants/[id]` (detalhe do prestador)
2. Clique em **Aplicar template**
3. Selecione o template desejado
4. Marque/desmarque "Incluir horários sugeridos" conforme necessário
5. Revise o preview do que será criado
6. Clique em **Aplicar template**
7. Confira o resumo de itens criados e ignorados

## Como validar

### Link público

Após aplicar o template, os serviços criados ficam ativos e aparecem no link público de agendamento, desde que o plano/assinatura permita.

### Typebot

Os serviços e campos personalizados criados pelo template aparecem automaticamente na API Typebot, desde que o plano inclua `whatsappEnabled`.

### Painel do prestador

O prestador pode ver e editar as categorias, serviços, campos personalizados e horários criados pelo template no painel `/app`.

## Limitações

- Templates são versionados em código, não no banco — não há CRUD visual
- Não há marketplace de templates
- Prestadores não podem criar seus próprios templates
- Não há editor visual
- Não há IA gerando templates
- Apenas o Super Admin aplica templates
- A aplicação não sobrescreve dados existentes — para atualizar serviços existentes é necessário fazer manualmente
- Não há versionamento de template aplicado (não é possível "desaplicar" ou reverter)
- Templates não gerenciam planos de assinatura, apenas estrutura operacional

## Arquivos relevantes

```
src/features/segment-templates/
  segment-template-types.ts        — Tipos TypeScript
  segment-template-definitions.ts  — Definições dos 6 templates
  segment-template-service.ts      — Lógica de aplicação idempotente
  segment-template-actions.ts      — Server actions (Super Admin only)
  segment-template-service.test.ts — Testes unitários

src/app/(admin)/admin/tenants/[id]/templates/
  page.tsx   — Página server (carrega dados)
  client.tsx — Componente interativo (seleção, preview, aplicação)
```
