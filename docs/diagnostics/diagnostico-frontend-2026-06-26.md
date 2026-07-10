# Diagnóstico de Frontend — AgendaZap

**Data:** 2026-06-26
**Escopo:** Todas as rotas renderizadas (admin, provider, public), componentes compartilhados, formulários e tokens de design.
**Método:** Leitura completa de 54 arquivos de frontend (layouts, páginas server/client, formulários, componentes UI, CSS global) e comparação com as regras de design do projeto (`.ai/skills/frontend-design.md`) e especificações de produto.

---

## Sumário executivo

O frontend do AgendaZap é **funcional e consistente**, entrega todas as rotas previstas nas fases 1–15 com navegação clara e isolamento multi-tenant correto. A base técnica (Tailwind + CVA + React Hook Form + Zod) é sólida e os componentes seguem convenções internas previsíveis.

Porém, o produto **não tem identidade visual própria**. A interface atual é indistinguível de dezenas de milhares de dashboards SaaS genéricos: mesma paleta verde-cinza, mesma tipografia Inter, mesma estrutura de sidebar + cards + tabelas, zero elementos de assinatura. A tela de login, o dashboard do prestador e o link público — as três superfícies de maior exposição — são visualmente intercambiáveis com qualquer outro produto.

O diagnóstico está organizado em 8 seções: (1) identidade visual, (2) UX estrutural, (3) hierarquia da informação, (4) inconsistências de componentes, (5) responsividade, (6) microcopy, (7) telas críticas para redesign prioritário, (8) proposta de direção visual.

---

## 1. Identidade visual

### 1.1 Paleta de cores

A paleta atual é definida em `globals.css` via tokens OKLCH:

| Token | Cor | Uso |
|---|---|---|
| `--primary` | `oklch(0.52 0.17 151)` — verde médio | Botões principais, links, sidebar icon |
| `--secondary` | `oklch(0.955 0.012 155)` — verde muito claro | Backgrounds sutis, avatar no header |
| `--accent` | `oklch(0.94 0.025 151)` — verde pastel | Hover states |
| `--sidebar` | `oklch(0.22 0.035 155)` — verde escuro | Sidebar background |
| `--destructive` | `oklch(0.58 0.22 27)` — vermelho | Erros, ações destrutivas |
| `--muted` | `oklch(0.96 0.006 260)` — cinza azulado | Backgrounds secundários |
| `--border` | `oklch(0.9 0.01 260)` — cinza claro | Bordas |

**Problemas:**

1. **Paleta monocromática sem contraste de temperatura.** Verde como única cor de destaque torna toda a interface plana. Nenhuma cor quente contrabalança — o produto parece um dashboard de infraestrutura, não uma ferramenta para prestadores de serviços locais (barbearias, mecânicas, clínicas).

2. **Sidebar escura desconectada do resto da UI.** O `--sidebar` é um verde escuro (`oklch(0.22 0.035 155)`) que não ecoa em nenhum outro lugar da interface. É um bloco escuro isolado — não cria sistema.

3. **Os badges de status são o único lugar onde outras cores aparecem** (`amber-100`, `emerald-100`, `amber-800`, `emerald-800`). Essas cores são definidas inline com classes Tailwind fixas, não tokens — ou seja, não fazem parte do design system.

4. **Nenhuma diferenciação cromática entre admin e provider.** O Super Admin e o prestador veem exatamente a mesma paleta. O contexto é indicado apenas pelo label textual no header.

5. **Zero suporte a dark mode.** Nenhum seletor `dark:` existe no código.

### 1.2 Tipografia

O projeto usa exclusivamente **Inter** como fonte (definida em `layout.tsx` via `next/font/google` com `variable: "--font-inter"`). A fonte é carregada mas **nunca aplicada ao body** — o `globals.css` define `font-family: Arial, Helvetica, sans-serif` no body, efetivamente ignorando a Inter.

**Problemas:**

1. **A fonte definida (Inter) não é a fonte renderizada (Arial).** A variável CSS `--font-inter` é injetada no `<body className>`, mas a regra `body { font-family: Arial }` em `globals.css` sobrescreve. Resultado: o produto renderiza com Arial.

2. **Falta hierarquia tipográfica.** A escala é binária: títulos (`text-2xl font-semibold`) e corpo (`text-sm`). Não há display, não há weights contrastantes, não há variação de largura ou letter-spacing intencional além do `tracking-tight` no PageHeading.

3. **Inter como escolha-padrão.** Inter é a fonte mais usada em dashboards SaaS em 2024–2026. Para um produto que atende prestadores de serviços locais, não carrega personalidade nenhuma — é a escolha que qualquer template faz.

### 1.3 Elemento de assinatura

O produto **não tem elemento de assinatura**. A regra de design do projeto é explícita: *"Spend your boldness in one place. Let the signature element be the one memorable thing."*

O ícone `CalendarCheck2` aparece no logo da sidebar e na tela de login como um quadrado verde com o ícone dentro — mas isso é um tratamento genérico (ícone dentro de caixa arredondada com sombra), não um elemento de assinatura.

### 1.4 Ausência de ilustração, textura ou profundidade

Toda a interface é composta por cards brancos com `shadow-sm`, bordas `border`, e fundo `bg-background` (oklch quase branco). Não há:

- Ilustrações ou elementos gráficos
- Texturas, padrões ou gradientes sutis
- Variação de profundidade (shadows são uniformemente `shadow-sm`)
- Elementos decorativos ancorados no universo dos prestadores de serviço

---

## 2. UX estrutural

### 2.1 Tabelas sem proteção responsiva (CRÍTICO)

**14+ páginas** usam tabelas sem wrapper `overflow-x-auto`. Em viewport mobile (375px), tabelas com 7–10 colunas transbordam horizontalmente sem scroll, cortando dados e quebrando o layout.

| Página | Colunas | Wrapper responsivo? |
|---|---|---|
| Admin tenants | 12 | Não |
| Admin plans | 6+ | Não |
| Admin subscriptions | 8+ | Não |
| Admin audit logs | 7 | Não |
| Provider services | 9 | Não |
| Provider availability | 6 | Não |
| Provider appointments | 9 | Não |
| Provider customers | 7 | Não |
| Provider schedule blocks | 5 | Não |
| Typebot credentials | 7 | **Sim** (única exceção) |

**Recomendação:** Adicionar `overflow-x-auto` com `min-width: 0` em todos os wrappers de tabela como correção imediata. Para médio prazo, implementar estratégia de colunas responsivas (esconder colunas secundárias abaixo de `md`, usar `display: contents` em mobile para transformar rows em cards).

### 2.2 Tabelas sem paginação, busca ou ordenação

Nenhuma tabela no produto (exceto TanStack Table que tem sorting estrutural mas nenhum controle visível) oferece paginação, busca textual ou ordenação por clique no header. Para listas com mais de 20 itens, a experiência degrada rapidamente.

O TanStack Table é usado como wrapper estrutural (`tenant-table`, `plan-table`, `subscription-table`, `appointment-table`, `customer-table`) mas **sem features de interação habilitadas** — é essencialmente uma `<table>` com mais código.

### 2.3 Componentes essenciais ausentes

Comparado com o ecossistema shadcn/ui completo, o projeto implementa apenas 10 dos ~40+ componentes disponíveis:

**Presentes (10):** Alert, Badge, Button (4 variants), Card (4 sub-components), Checkbox, Input, Label, Select, Table, Textarea

**Ausentes (críticos para UX madura):**
- **Dialog/Modal** — Sem ele, ações como "aplicar template", "cancelar prestador" ou "excluir campo personalizado" não têm modal de confirmação. O projeto usa `window.confirm()` que é inacessível, não estilizável e quebra a experiência.
- **Tooltip** — Botões icon-only (Eye, Pencil, toggle) dependem do atributo `title` para acessibilidade. `title` não é exposto a leitores de tela, não aparece em touch, e tem comportamento inconsistente entre navegadores.
- **Skeleton** — Todos os estados de carregamento são texto puro ("Carregando...", "Carregando preview..."). Nenhum skeleton screen.
- **DropdownMenu** — Ações agrupadas em botões visíveis (ex: 5 botões outline na tela de detalhe do tenant) poluem a interface. Um dropdown "Ações" agruparia sem perder discoverability.
- **Separator** — Nenhum divisor visual entre seções de formulário ou cards. A separação depende exclusivamente de `gap` e `space-y`.
- **Tabs** — Páginas como detalhe do tenant poderiam usar tabs (Dados / Assinatura / Logs) em vez de um grid de 6 cards.
- **Toast** — Feedback de ações bem-sucedidas depende exclusivamente de `SuccessAlert` inline (query param `?success=`). Isso polui a URL e não funciona bem com ações client-side.

### 2.4 Navegação sem breadcrumbs

Nenhuma rota de detalhe ou edição mostra breadcrumbs. O usuário que navega para `/admin/tenants/[id]/edit` ou `/app/services/[id]/fields/new` perde o contexto de onde está na hierarquia. Algumas páginas oferecem botão "Voltar" explícito (serviço do provider), outras não (tenant detail do admin).

### 2.5 Feedback de ações

O padrão de feedback é **query param `?success=`** lido por `SuccessAlert`. Isso significa:
- A URL fica poluída após ações bem-sucedidas
- O alerta persiste em reloads e bookmarks
- Ações client-side não conseguem usar esse mecanismo
- Não há feedback para ações que falham sem erro de validação (ex: timeout de rede)

### 2.6 Estados vazios e de erro

**Estados vazios** são consistentemente cobertos com mensagens em texto (`text-sm text-muted-foreground`). São funcionais mas sem ilustração ou call-to-action visual que transforme o vazio em oportunidade.

**Exceção positiva:** O estado "sem usuário responsável" no detalhe do tenant inclui um botão CTA ("Criar acesso do responsável"). Isso deveria ser o padrão, não a exceção.

**Estados de erro** são tratados via `FormFeedback` (server-level) e `FieldError` (field-level) nos formulários, mas páginas de listagem não têm tratamento de erro — se `findAllTenants()` falhar, a página quebra sem boundary.

### 2.7 Placeholders de funcionalidade

4 rotas renderizam `FoundationPlaceholder` (admin appointments, admin customers, admin settings, provider subscription). O componente é bem desenhado (ícone em caixa com bg-secondary, texto explicativo), mas:

- Não indica se a funcionalidade está em desenvolvimento ativo ou é backlog distante
- Ocupa uma rota navegável sem oferecer valor — seria melhor não listar no sidebar até existir

---

## 3. Hierarquia da informação

### 3.1 Dashboards sem priorização visual

**Admin Dashboard:** 10 cards de métricas em grid 4-col, todos com exatamente o mesmo peso visual (mesmo tamanho, mesma tipografia, mesmo ícone `text-muted-foreground`). Não há distinção entre métricas primárias (receita mensal, prestadores ativos) e secundárias (planos ativos).

**Provider Dashboard:** 12 cards de métricas + tabela de próximos agendamentos. Mesmo problema: todos os cards têm o mesmo tratamento. "Nome do negócio" e "Agendamentos de hoje" têm o mesmo peso que "Bloqueios futuros".

### 3.2 Páginas de detalhe com grids sobrecarregados

O tenant detail (`admin/tenants/[id]`) renderiza **6 cards** em um grid 3-col assimétrico:
- Dados do negócio (2 col)
- Ações de status (1 col)
- Usuário responsável (2 col)
- Assinatura atual (1 col)
- Agendamentos recentes (2 col — **stub vazio**)
- Logs recentes (3 col)

O card "Agendamentos recentes" ocupa 2/3 de uma linha do grid apenas para mostrar um ícone e texto "A agenda ainda não faz parte desta fase." — informação redundante.

### 3.3 Ações sem prioridade visual

O PageHeading do tenant detail renderiza **5 botões outline** lado a lado: Editar, Aplicar template, Credenciais Typebot, Ver logs, Assinatura. Todos com o mesmo peso visual (`variant="outline"`), mesma hierarquia. O usuário não tem indicação de qual ação é primária ou mais frequente.

### 3.4 Formulários sem agrupamento semântico

O `ProviderSettingsForm` renderiza 8 campos + textarea em um loop `map()` sobre `[name, label]`. Não há fieldset, legend, ou separação entre grupos lógicos (identidade do negócio vs. contato vs. localização).

O `TenantForm` é uma exceção positiva: usa `<fieldset>` com `<legend>` e borda para agrupar "Acesso do responsável" e "Assinatura inicial".

---

## 4. Inconsistências de componentes

### 4.1 Duas estratégias de tabela

| Estratégia | Onde é usada |
|---|---|
| TanStack Table com wrapper dedicado | Admin tenants, plans, subscriptions; Provider appointments, customers |
| HTML `<Table>` shadcn direto | Admin audit logs; Provider services, availability, schedule blocks, service fields; Public pages |

As duas estratégias têm comportamentos diferentes (TanStack tem sorting estrutural, HTML não), mas visualmente são idênticas. Não há critério claro de quando usar cada uma.

### 4.2 Campo checkbox com duas implementações

- `src/components/ui/checkbox.tsx` — componente baseado em Radix (não usa `onChange`, usa `onCheckedChange`)
- `public-booking-form.tsx` — usa `<input type="checkbox">` nativo com `value="Sim"` e label estilizado como card
- `service-form.tsx` — usa labels estilizadas como `rounded-lg border p-4` cards

Três implementações diferentes para o mesmo controle.

### 4.3 Componente FieldError duplicado

`FieldError` está definido em `src/components/forms/form-feedback.tsx` e **redefinido localmente** em `src/features/public-booking/public-booking-form.tsx` com a mesma implementação.

### 4.4 Espaçamento inconsistente entre páginas

- Admin tenant detail: grid com `gap-6`
- Provider service detail: grid com `gap-4`
- Provider schedule blocks: espaçamento entre cards com `mt-6` em vez de grid
- Cards internos: `CardContent` com `px-6` mas padding vertical vem do `Card` base (`py-6`)

### 4.5 Variantes de Alert definidas mas subutilizadas

O componente `Alert` define variantes `default`, `success` e `destructive`. Mas a tela de booking público define um alerta amber inline (`border-amber-200 bg-amber-50 text-amber-800`) sem usar o componente Alert — ou seja, há uma variante `warning` que não existe no design system mas é necessária na prática.

### 4.6 Badge com variantes além do design system

O `Badge` define `default`, `secondary`, `outline`, `destructive`, `warning`, e `success`. Mas `warning` usa `bg-amber-100 text-amber-800` e `success` usa `bg-emerald-100 text-emerald-800` — cores fixas que não respondem a dark mode e não são tokens do `:root`.

---

## 5. Responsividade

### 5.1 O que funciona

- Grids de formulário colapsam de 2 colunas para 1 (`md:grid-cols-2`)
- Grids de detalhe colapsam de 3 colunas (`lg:grid-cols-3`)
- PageHeading empilha verticalmente em mobile (`flex-col sm:flex-row`)
- Sidebar colapsa para navegação horizontal em mobile (`overflow-x-auto lg:block`)
- Header esconde nome/email em mobile (`hidden sm:block`)

### 5.2 O que não funciona

- **Tabelas:** Nenhuma tem scroll horizontal. Em 375px, uma tabela de 10 colunas corta metade dos dados.
- **Botões de ação em mobile:** 5 botões outline no PageHeading do tenant detail quebram em múltiplas linhas sem distinção de prioridade.
- **Formulários longos:** Sem accordion ou step navigation em mobile, formulários como o de criação de tenant ocupam múltiplas telas de scroll sem indicadores de progresso.
- **Card de onboarding no dashboard:** O layout `flex items-center justify-between` não colapsa em mobile — texto e botão dividem a mesma linha até quebrarem.

### 5.3 Breakpoints usados

Apenas `sm` (640px), `md` (768px), `lg` (1024px), e `xl` (1280px) são usados. Não há ajustes para telas muito pequenas (320–374px) ou telas muito grandes (> 1536px com `2xl`).

---

## 6. Microcopy

### 6.1 O que está bom

O microcopy em português é natural, claro e sem jargão técnico desnecessário. Exemplos:

- "A aplicação é segura: itens já existentes não são duplicados."
- "Ele não será exibido novamente."
- "O bloqueio não valida conflitos com agendamentos nesta fase."
- "Contas administrativas não podem realizar agendamentos públicos."

As mensagens de estado vazio são consistentes ("Nenhum prestador cadastrado.", "Nenhum agendamento encontrado.").

### 6.2 Problemas

1. **Botão genérico "Enviar agendamento".** O usuário não sabe o que "enviar" significa — o agendamento é criado? Enviado para aprovação? Notificado ao prestador? "Confirmar agendamento" ou "Agendar horário" seria mais preciso.

2. **Botão "Enviar" vs "Salvar".** Há um mix inconsistente: login diz "Entrar", formulários dizem "Salvar prestador" / "Salvar serviço", booking diz "Enviar agendamento". O padrão deveria ser verbo + objeto consistente.

3. **Falta de texto auxiliar nos campos.** Nenhum campo de formulário tem texto de ajuda (helper text) explicando formato esperado. Ex: WhatsApp deveria mostrar "(XX) XXXXX-XXXX", slug deveria mostrar "usado na URL pública: agendazap.app/seu-slug".

4. **Campos obrigatórios não sinalizados.** Nenhum formulário (exceto o PublicBookingForm) indica visualmente quais campos são obrigatórios com asterisco ou texto "(obrigatório)".

5. **Placeholders inconsistentes.** Login tem `placeholder="voce@empresa.com"` no email, mas a maioria dos campos não tem placeholder nenhum.

6. **Títulos de página no Admin vs Provider.** O admin dashboard diz "Dashboard" e "Indicadores reais da operação administrativa da plataforma." — bom. O provider dashboard diz "Dashboard" e "Visão geral do seu negócio e configurações operacionais." — "configurações operacionais" é linguagem de sistema, não de negócio.

---

## 7. Telas críticas para redesign prioritário

### Prioridade 1 — Tela de login (`/login`)

**Por que é crítica:** É a primeira impressão de 100% dos usuários (admin, prestador, cliente). Atualmente é um card branco centralizado com dois inputs e um botão verde. É indistinguível de qualquer outro SaaS.

**Problemas específicos:**
- Nenhuma imagem, ilustração ou elemento visual ancorado no produto
- O logo é um quadrado verde com ícone CalendarCheck2 — genérico
- Nenhuma diferenciação visual entre os três públicos que usam a mesma tela
- Background é `bg-background` (quase branco) — sem textura, gradiente ou cor

### Prioridade 2 — Link público do prestador (`/[tenantSlug]`)

**Por que é crítica:** É a página que os clientes finais dos prestadores veem. É o produto que o prestador está efetivamente "comprando". Precisa transmitir confiança e profissionalismo.

**Problemas específicos:**
- Layout genérico: header com badges + cards de categoria com serviços em grid
- A página do prestador não tem cara de "negócio real" — parece uma listagem de API
- Nenhuma customização visual por segmento (uma barbearia e uma clínica têm a mesma aparência)
- O nome do prestador é o único elemento distintivo

### Prioridade 3 — Dashboard do prestador (`/app/dashboard`)

**Por que é crítica:** É a tela mais visitada do painel operacional. Define se o prestador confia no produto.

**Problemas específicos:**
- 12 métricas com peso visual idêntico — não conta uma história
- O card de onboarding é funcional mas visualmente tímido (borda verde clara + bg 5% opacity)
- A tabela de "Próximos agendamentos" usa o mesmo tratamento de tabela genérica

### Prioridade 4 — Páginas de listagem com tabelas (admin tenants, provider services)

**Por que são críticas:** São as páginas de trabalho diário. Tabelas sem paginação/busca e sem responsividade degradam rapidamente com volume de dados.

---

## 8. Proposta de direção visual

Esta proposta segue o processo em duas passadas do `frontend-design.md`: primeiro uma direção fundamentada no assunto, depois uma auto-crítica para remover escolhas genéricas.

### 8.1 O assunto

O AgendaZap é uma ferramenta para **prestadores de serviços locais** — mecânicos, barbeiros, manicures, esteticistas, técnicos de assistência, clínicas simples. O universo visual desses ofícios é rico:

- **Materiais:** aço escovado, couro, madeira, azulejos, fórmica, alumínio
- **Instrumentos:** ferramentas manuais, tesouras, alicates, pincéis, espátulas
- **Vernacular:** placas de fachada, cartões de visita, anotações em agenda de papel, recibos
- **Ciclo:** o horário marcado, a confirmação, o serviço prestado

A interface do AgendaZap deveria evocar **organização, confiabilidade e proximidade** — não frieza corporativa.

### 8.2 Sistema de tokens proposto

#### Cor

```
Fundo:         #FAF9F6 — off-white quente (papel), não branco frio
Superfície:    #FFFFFF — cards e elementos elevados
Texto:         #1C1C1C — quase preto, não cinza
Texto secund.: #6B6B6B — cinza médio quente
Borda:         #E5E3DF — bege acinzentado

Acento 1:      #D44E2B — terracota (ação primária, links, destaque)
Acento 2:      #2B5C4A — verde escuro (confirmação, sidebar, profundidade)
Acento 3:      #F4B84A — mostarda/âmbar (avisos, atenção, calor)
```

**Justificativa:** Terracota como acento principal ancora o produto no mundo material (barro, couro, ferramenta) e diferencia de todo SaaS verde-azul. O verde escuro mantém uma âncora de confiabilidade sem ser o verde genérico de dashboard. O mostarda traz calor e atenção sem o vermelho de erro.

Esta paleta **não** é cream+terracotta genérica (um dos três clichês identificados pelo frontend-design.md) porque o cream aqui é off-white papel (#FAF9F6, mais frio e sutil), e o terracota não é o tom laranja-terroso padrão — é puxado para o vermelho (D44E2B), mais próximo de um vermelho-ferrugem.

#### Tipografia

| Papel | Família | Peso | Uso |
|---|---|---|---|
| Display | **Lora** (serif) | 600, 700 | Títulos de página, nome do prestador no link público, tela de login |
| Body | **Inter** (sans) | 400, 500, 600 | Corpo de texto, labels, dados, tabelas |
| Utility | **JetBrains Mono** (mono) | 400 | Tokens, códigos, dados tabulares |

**Justificativa:** Lora é uma serif contemporânea com personalidade mas sem ser decorativa — evoca confiança editorial. Usada com moderação (apenas títulos grandes e o nome do prestador), cria distinção imediata. Inter permanece para corpo porque é excelente para leitura de dados. JetBrains Mono para tokens e códigos (já usado no token reveal).

**Auto-crítica da tipografia:** Serif + sans + mono poderia ser excessivo. A alternativa seria usar apenas Inter com weights contrastantes (200 para dados, 800 para display). Mas perderíamos a oportunidade de diferenciar o nome do prestador no link público — o elemento mais importante do produto para o cliente final. A escolha da Lora é justificada porque ela atua como elemento de assinatura, não como fonte de corpo.

#### Layout

**Conceito:** "Agenda física elevada a digital." Usar elementos que remetem a uma agenda de papel ou fichário sem ser literal:

- Cards com borda sutil e sombra assimétrica (sombra mais pronunciada à direita/baixo, como uma folha de papel)
- Divisores horizontais finos (hairline rules) entre seções, como pauta de caderno
- Números e dados tabulares com tratamento de "ficha" — borda inferior pontilhada ou sutil nos dados importantes
- Sidebar laterais com background de profundidade (tom mais escuro), como a capa de um fichário

**Auto-crítica do layout:** "Ficha de papel" como metáfora pode cair no literal. Refinamento: não usar textura de papel visível, não usar cantos dobrados ou sombras de profundidade real. Apenas a assimetria sutil de sombra e o uso de divisores finos bastam para evocar sem caricaturar.

#### Elemento de assinatura

**Proposta: O "carimbo de confirmação".** Quando um agendamento é criado, concluído ou confirmado, um elemento visual de "carimbo" aparece como indicador de estado. Não é uma badge genérica — é um tratamento tipográfico com rotação sutil (~3°), cor terracota, e uma borda irregular simulando um carimbo de tinta.

Este elemento:
- Só aparece em estados de confirmação (booking confirmado, onboarding completo)
- É memorável e distinto
- Está ancorado no universo do assunto (carimbos de agenda, recibos carimbados)
- Não atrapalha a usabilidade
- Pode ser implementado com CSS puro (transform: rotate, border-radius irregular com box-shadow)

**Auto-crítica do carimbo:** Há o risco de parecer forçado se usado em excesso. Regra: o carimbo aparece **apenas** na tela de confirmação de agendamento (`/book/confirm`) e no marco de conclusão do onboarding. Dois touchpoints no produto inteiro. Suficiente para ser lembrado, insuficiente para cansar.

### 8.3 Plano de implementação visual sugerido

A direção acima deve ser implementada em 3 ondas:

**Onda 1 — Fundação (tokens + tipografia + login):**
1. Substituir tokens de cor em `globals.css`
2. Corrigir `font-family` do body para usar Inter
3. Adicionar Lora como fonte display
4. Redesenhar a tela de login com a nova paleta e tipografia
5. Atualizar variantes de Button, Badge e Alert para usar novos tokens

**Onda 2 — Superfícies de exposição (link público + dashboard provider):**
1. Redesenhar `/[tenantSlug]` com tratamento visual distinto por segmento
2. Redesenhar dashboard do prestador com hierarquia de métricas
3. Implementar sidebar com nova profundidade
4. Adicionar elemento de carimbo na confirmação de booking

**Onda 3 — Sistema (componentes + responsividade):**
1. Implementar Dialog, Tooltip, Skeleton, DropdownMenu
2. Adicionar wrapper responsivo em todas as tabelas
3. Implementar paginação/busca nas tabelas principais
4. Unificar estratégia de tabelas (remover TanStack ou implementá-lo completo)
5. Adicionar breadcrumbs nas rotas de detalhe
6. Substituir `window.confirm()` por Dialog estilizado
7. Adicionar Toast para feedback de ações
8. Suporte a dark mode

---

## Apêndice: Lista completa de arquivos analisados

### Layouts (4)
- `src/app/layout.tsx`
- `src/app/(admin)/admin/layout.tsx`
- `src/app/(provider)/app/layout.tsx`
- `src/app/(public)/[tenantSlug]/layout.tsx`

### Componentes de layout (4)
- `src/components/layout/dashboard-shell.tsx`
- `src/components/layout/dashboard-sidebar.tsx`
- `src/components/layout/dashboard-header.tsx`
- `src/components/layout/page-heading.tsx`

### Componentes UI (10)
- `src/components/ui/button.tsx`
- `src/components/ui/card.tsx`
- `src/components/ui/badge.tsx`
- `src/components/ui/alert.tsx`
- `src/components/ui/input.tsx`
- `src/components/ui/label.tsx`
- `src/components/ui/select.tsx`
- `src/components/ui/checkbox.tsx`
- `src/components/ui/table.tsx`
- `src/components/ui/textarea.tsx`

### Formulários (4 de 21 lidos em detalhe)
- `src/components/forms/login-form.tsx`
- `src/components/forms/tenant-form.tsx`
- `src/components/forms/service-form.tsx`
- `src/components/forms/appointment-form.tsx`

### Páginas admin (16)
- `src/app/(admin)/admin/dashboard/page.tsx`
- `src/app/(admin)/admin/tenants/page.tsx`
- `src/app/(admin)/admin/tenants/[id]/page.tsx`
- `src/app/(admin)/admin/tenants/new/page.tsx`
- `src/app/(admin)/admin/tenants/[id]/templates/client.tsx`
- `src/app/(admin)/admin/tenants/[id]/typebot-credentials/client.tsx`
- `src/app/(admin)/admin/plans/page.tsx`
- `src/app/(admin)/admin/subscriptions/page.tsx`
- `src/app/(admin)/admin/subscriptions/[id]/page.tsx`
- `src/app/(admin)/admin/audit-logs/page.tsx`
- `src/app/(admin)/admin/appointments/page.tsx`
- `src/app/(admin)/admin/customers/page.tsx`
- `src/app/(admin)/admin/settings/page.tsx`

### Páginas provider (12)
- `src/app/(provider)/app/dashboard/page.tsx`
- `src/app/(provider)/app/services/page.tsx`
- `src/app/(provider)/app/services/[id]/page.tsx`
- `src/app/(provider)/app/availability/page.tsx`
- `src/app/(provider)/app/availability/blocks/page.tsx`
- `src/app/(provider)/app/appointments/page.tsx`
- `src/app/(provider)/app/customers/page.tsx`
- `src/app/(provider)/app/settings/page.tsx`
- `src/app/(provider)/app/subscription/page.tsx`
- `src/app/(provider)/app/onboarding/client.tsx`

### Páginas públicas (5)
- `src/app/(public)/login/page.tsx`
- `src/app/(public)/[tenantSlug]/page.tsx`
- `src/app/(public)/[tenantSlug]/services/page.tsx`
- `src/app/(public)/[tenantSlug]/book/page.tsx`
- `src/app/(public)/access-denied/page.tsx`

### Features (2)
- `src/features/public-booking/public-booking-form.tsx`
- `src/features/public-booking/public-unavailable.tsx`

### CSS (1)
- `src/app/globals.css`

### Diretrizes de design (1)
- `.ai/skills/frontend-design.md`

**Total: 54 arquivos**
