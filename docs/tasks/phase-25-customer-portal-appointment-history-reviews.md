# Task - Phase 25 Customer Portal, Appointment History & Reviews

## Objetivo

Implementar uma área logada para o cliente final do AgendaZap.

Hoje o cliente final consegue criar conta, fazer login e confirmar agendamentos pelo link público, mas não possui uma área própria para acompanhar o que agendou, verificar histórico, atualizar dados pessoais, colocar foto de perfil ou avaliar serviços realizados.

Esta fase deve transformar o CUSTOMER em um usuário com experiência própria, permitindo que ele consulte seus agendamentos e registre avaliações após atendimentos finalizados.

---

# Contexto do produto

O AgendaZap possui três grandes públicos:

```text id="bx5uxc"
- SUPER_ADMIN: administra a plataforma
- USER: prestador/equipe do tenant
- CUSTOMER: cliente final que agenda serviços
```

Até agora, o CUSTOMER é usado principalmente no fluxo público:

```text id="r8s6lf"
- entra ou cria conta
- escolhe serviço
- escolhe horário
- confirma agendamento
```

A partir desta fase, o CUSTOMER também terá uma área própria:

```text id="q1q6mj"
/cliente
```

ou rota equivalente definida na implementação.

---

# Dependências

Esta task depende da conclusão e validação das fases:

```text id="k661mh"
/docs/tasks/phase-01-foundation.md
/docs/tasks/phase-02-admin-platform.md
/docs/tasks/phase-02-1-provider-login-access.md
/docs/tasks/phase-03-provider-panel.md
/docs/tasks/phase-04-customers-appointments-core.md
/docs/tasks/phase-05-public-booking-link.md
/docs/tasks/phase-05-1-public-customer-auth.md
/docs/tasks/phase-05-2-public-routing-refactor.md
/docs/tasks/phase-05-2-public-routing-refactor.md
/docs/tasks/phase-06-typebot-api.md
/docs/tasks/phase-07-typebot-flow-blueprint.md
/docs/tasks/phase-08-typebot-service-details-custom-fields.md
/docs/tasks/phase-09-typebot-flow-simulator.md
/docs/tasks/phase-10-typebot-real-setup-guide.md
/docs/tasks/phase-11-typebot-tenant-credentials.md
/docs/tasks/phase-12-typebot-production-readiness.md
/docs/tasks/phase-13-subscription-enforcement.md
/docs/tasks/phase-14-segment-templates.md
/docs/tasks/phase-15-provider-onboarding-wizard.md
/docs/tasks/phase-16-visual-identity-design-system-foundation.md
/docs/tasks/phase-17-login-auth-experience-redesign.md
/docs/tasks/phase-18-public-booking-experience-redesign.md
/docs/tasks/phase-19-provider-dashboard-app-shell-redesign.md
/docs/tasks/phase-20-data-tables-responsive-lists.md
/docs/tasks/phase-21-admin-experience-redesign.md
/docs/tasks/phase-22-provider-operations-ux.md
/docs/tasks/phase-23-microcopy-empty-error-states.md
/docs/tasks/phase-24-accessibility-mobile-qa-pass.md
/docs/tasks/phase-25-public-experience-conversion-redesign.md
```

Antes de implementar, leia obrigatoriamente:

```text id="tdg6co"
.ai/PROJECT_RULES.md
.ai/skills/frontend-design.md
docs/specs/00-visao-produto.md
docs/specs/01-usuarios-permissoes.md
docs/technical/auth-permissoes.md
docs/technical/padroes-codigo.md
docs/design/visual-identity.md
docs/design/design-system-foundation.md
docs/design/public-booking-experience.md
docs/design/public-experience-conversion-redesign.md
docs/design/microcopy-empty-error-states.md
README.md
```

---

# Escopo principal

Implementar:

```text id="xz0csp"
1. Portal do cliente final
2. Perfil do cliente
3. Foto/avatar do cliente
4. Lista de próximos agendamentos
5. Histórico de agendamentos
6. Detalhe do agendamento
7. Avaliação de atendimento finalizado
8. Visualização de avaliações no painel do prestador
```

---

# Rotas sugeridas

Criar área CUSTOMER:

```text id="yjf65h"
/cliente
/cliente/perfil
/cliente/agendamentos
/cliente/agendamentos/[id]
```

Alternativa aceitável:

```text id="i4xff3"
/account
/account/profile
/account/appointments
/account/appointments/[id]
```

## Recomendação

Preferir `/cliente`, por ser mais claro no contexto brasileiro.

## Atenção com slugs

Como já existe rota pública dinâmica:

```text id="a81xrh"
/[tenantSlug]
```

garantir que `/cliente` não seja tratado como tenantSlug.

Se ainda não existir validação de slugs reservados, adicionar proteção ao criar/editar tenant.

Slugs reservados mínimos:

```text id="ymqd0k"
admin
app
api
login
access-denied
cliente
conta
account
me
```

Se adicionar lista de slugs reservados, garantir que não quebre tenants existentes.

---

# Regras críticas

Preservar integralmente:

```text id="agck2y"
- autenticação existente
- sessão via cookie httpOnly
- roles
- SUPER_ADMIN acessa admin
- USER acessa app
- CUSTOMER acessa área do cliente
- CUSTOMER não acessa /app
- USER não acessa /admin
- USER não é tratado como CUSTOMER
- CUSTOMER auth no fluxo público
- redirectTo
- criação de appointment PUBLIC_LINK
- createdByUserId = null no fluxo público
- vínculo users ↔ customers
- isolamento multi-tenant
- Typebot API
- subscription enforcement
```

Não alterar:

```text id="vtf6zq"
- regras de disponibilidade
- regras de bloqueio
- regras de conflito
- máquina de status de agendamento
- criação pública de agendamento
- endpoints Typebot
- cookies
- roles existentes
```

---

# 1. Modelagem de dados

Esta fase pode criar migration.

## Foto/avatar do cliente

Adicionar no model `User`, pois o perfil é global do cliente final:

```text id="xu0avj"
avatarUrl String?
avatarFileKey String?
```

Ou nomes equivalentes conforme padrão do projeto.

## Regras de avatar

```text id="mpgppo"
- avatar pertence ao User
- usado somente para CUSTOMER nesta fase
- não obrigatório
- não deve afetar prestador/admin
```

## Avaliação de atendimento

Criar model novo, por exemplo:

```prisma id="a8j2ny"
model AppointmentReview {
  id             String   @id @default(cuid())
  tenantId       String
  appointmentId  String   @unique
  customerUserId String
  rating         Int
  comment        String?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  tenant         Tenant      @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  appointment    Appointment @relation(fields: [appointmentId], references: [id], onDelete: Cascade)
  customerUser   User        @relation(fields: [customerUserId], references: [id], onDelete: Cascade)

  @@index([tenantId])
  @@index([customerUserId])
}
```

A implementação pode ajustar nomes e relações conforme o schema atual.

## Regras de avaliação

```text id="mres3m"
- apenas CUSTOMER autenticado pode avaliar
- CUSTOMER só pode avaliar agendamento dele
- agendamento precisa estar FINISHED
- uma avaliação por agendamento
- rating obrigatório entre 1 e 5
- comment opcional
- avaliação não deve alterar status do agendamento
- prestador pode visualizar avaliação recebida
- avaliação não será exibida publicamente nesta fase
```

---

# 2. Portal do cliente `/cliente`

## Objetivo

Criar uma página inicial para o cliente final.

## Conteúdo

```text id="hz02a4"
- saudação com nome do cliente
- foto/avatar ou iniciais
- próximo agendamento, se existir
- resumo de histórico
- CTA para ver agendamentos
- CTA para editar perfil
```

## Estado sem agendamentos

Título:

```text id="v08j2p"
Você ainda não tem agendamentos
```

Descrição:

```text id="m9f5gh"
Quando você agendar um serviço pelo link público de um prestador, ele aparecerá aqui.
```

Não criar busca global de prestadores nesta fase.

---

# 3. Perfil do cliente `/cliente/perfil`

## Objetivo

Permitir que o cliente final veja e atualize seus dados básicos.

## Campos editáveis

```text id="dcy6ly"
- nome
- telefone
- foto/avatar
```

Campos apenas leitura ou editáveis conforme regra atual:

```text id="sdpyck"
- e-mail
```

Recomendação:

```text id="pih2e4"
Manter e-mail como somente leitura nesta fase, para evitar complexidade de verificação/troca de login.
```

## Foto de perfil

Implementar upload simples de avatar.

## Regras de upload

```text id="l8rszd"
- aceitar apenas image/jpeg, image/png, image/webp
- tamanho máximo: 2 MB
- salvar com nome seguro, sem usar nome original diretamente
- validar extensão e mimetype
- se salvar em disco local, documentar que em produção precisa volume persistente ou storage externo
- não aceitar SVG nesta fase
- não processar EXIF avançado nesta fase
```

## Armazenamento recomendado para MVP

Se o projeto ainda não tiver storage externo:

```text id="x3hf54"
storage/uploads/customer-avatars
```

Ou caminho equivalente fora do código fonte.

Servir via rota controlada, por exemplo:

```text id="l8zg1l"
/api/customer/avatar/[fileKey]
```

Evitar depender de arquivo salvo diretamente em `/public` se isso não for adequado ao deploy.

## Fora do escopo do avatar

```text id="m3fa2i"
- crop
- resize avançado
- CDN
- S3/R2
- remoção automática de arquivo antigo complexa
```

Se implementar remoção do avatar antigo for simples, fazer. Se não, documentar como pendência.

---

# 4. Agendamentos do cliente `/cliente/agendamentos`

## Objetivo

Permitir que o cliente consulte seus próprios agendamentos.

## Listas

Separar visualmente:

```text id="iyslmp"
- Próximos
- Histórico
- Cancelados
```

Pode usar tabs, filtros ou seções.

## Dados exibidos

```text id="xn3hpw"
- prestador
- serviço
- data e hora
- status
- origem, se fizer sentido
- indicação se pode avaliar
```

## Regras

```text id="u43fby"
- CUSTOMER só vê appointments vinculados ao seu user através de customers.user_id
- não mostrar appointments de outro CUSTOMER
- não mostrar internalNotes
- não mostrar audit logs
- não mostrar dados administrativos do tenant
- não permitir editar agendamento nesta fase
- não permitir cancelar/remarcar nesta fase
```

---

# 5. Detalhe do agendamento `/cliente/agendamentos/[id]`

## Objetivo

Mostrar ao cliente um resumo claro do atendimento.

## Exibir

```text id="ua69r9"
- prestador
- serviço
- data/hora
- status
- preço estimado, se existir e for seguro exibir
- observações do cliente
- campos personalizados preenchidos pelo cliente
- mensagem de próximo passo conforme status
- avaliação, se já existir
- formulário de avaliação, se elegível
```

## Não exibir

```text id="o2mun1"
- internalNotes
- metadata técnica
- appointment_events completos
- audit logs
- IDs internos
- dados de assinatura/plano
```

---

# 6. Avaliação de serviço

## Elegibilidade

O cliente pode avaliar quando:

```text id="e1dcjk"
- está autenticado como CUSTOMER
- o appointment pertence ao customer user
- appointment.status = FINISHED
- ainda não existe review para esse appointment
```

## Formulário

Campos:

```text id="ckg2up"
rating: 1 a 5
comment: opcional, até 1000 caracteres
```

## Microcopy

Título:

```text id="n1z3my"
Como foi o atendimento?
```

Subtexto:

```text id="uxje8g"
Sua avaliação ajuda o prestador a acompanhar a qualidade dos serviços realizados.
```

Botão:

```text id="qv0igc"
Enviar avaliação
```

Mensagem após avaliar:

```text id="sm5g2o"
Avaliação enviada. Obrigado pelo retorno.
```

## Regras

```text id="d4e8z8"
- não permitir editar avaliação nesta fase, salvo se for simples e seguro
- não permitir excluir avaliação nesta fase
- não tornar avaliação pública nesta fase
- não calcular média pública nesta fase
```

---

# 7. Painel do prestador: visualização de avaliações

## Objetivo

Permitir que o prestador veja avaliações recebidas.

## Onde mostrar

Adicionar no detalhe do agendamento:

```text id="rvc8e8"
/app/appointments/[id]
```

Se o agendamento tiver review:

```text id="dw2url"
- nota
- comentário
- data da avaliação
```

Também pode adicionar indicação na listagem:

```text id="psqw71"
Avaliado
```

Se aumentar muito o escopo, priorizar apenas detalhe do agendamento.

## Regras

```text id="kp6omi"
- prestador só vê reviews de appointments do próprio tenant
- não permitir prestador editar review
- não permitir prestador responder review nesta fase
- não exibir review no link público nesta fase
```

---

# 8. Admin: visibilidade mínima

Opcional, se couber sem aumentar muito escopo:

```text id="qjqh7s"
- mostrar avaliação no detalhe do tenant ou em detalhe de appointment admin, se existir
```

Se não houver tela admin de agendamento consolidada, deixar fora.

---

# 9. Navegação

Adicionar entrada para CUSTOMER logado.

## No fluxo público

Quando CUSTOMER estiver logado, oferecer link discreto:

```text id="ufb6gk"
Meus agendamentos
```

Ou:

```text id="arl5tv"
Minha conta
```

Em locais como:

```text id="2nosbw"
/[tenantSlug]
/[tenantSlug]/book
/[tenantSlug]/book/confirm
```

## No login

Se CUSTOMER já estiver logado e acessar `/login`, oferecer:

```text id="f4ljlu"
Ir para meus agendamentos
```

Além de manter comportamento seguro com redirectTo.

## Regras

```text id="tvmhbk"
- não redirecionar CUSTOMER automaticamente para /app
- não redirecionar CUSTOMER para /admin
- manter redirectTo público quando existir
```

---

# 10. Autorização

Criar helper específico se necessário:

```text id="btulwf"
requireCustomerAccess()
```

## Regras

```text id="lce84k"
- se não logado, redirecionar para /login?redirectTo=/cliente...
- se logado mas não CUSTOMER, bloquear ou enviar para access-denied
- SUPER_ADMIN e USER não acessam portal do cliente
```

---

# 11. Design/UX

A área do cliente deve seguir a identidade pública, não o painel administrativo.

## Direção visual

```text id="x4kh6j"
- mais próxima do link público
- simples
- clara
- mobile-first
- sem sidebar administrativa
- header compacto
- foco nos agendamentos
```

## Layout sugerido

```text id="ritsvy"
Header simples:
- AgendaZap
- Meus agendamentos
- Perfil
- Sair

Main:
- card de perfil/resumo
- próximos agendamentos
- histórico
```

## Não usar

```text id="ilohun"
- DashboardShell administrativo
- sidebar de admin/provider
- linguagem técnica
```

---

# 12. Segurança e privacidade

Obrigatório:

```text id="x816i1"
- CUSTOMER não vê dados de outro CUSTOMER
- CUSTOMER não vê internalNotes
- CUSTOMER não vê audit logs
- CUSTOMER não vê dados de assinatura
- CUSTOMER não vê credenciais Typebot
- upload de avatar valida tipo/tamanho
- nome do arquivo não deve usar input bruto do usuário
- rota de arquivo não deve permitir path traversal
```

---

# 13. Documentação

Criar:

```text id="n6kjxs"
/docs/technical/customer-portal.md
/docs/design/customer-portal-experience.md
```

Atualizar:

```text id="7mmdcf"
README.md
docs/specs/01-usuarios-permissoes.md
docs/technical/auth-permissoes.md
```

Documentar:

```text id="yv2z2n"
- rotas do cliente
- regras de acesso CUSTOMER
- histórico de agendamentos
- regras de avaliação
- upload de avatar
- limitações
- o que ficou fora do escopo
```

---

# 14. Testes

Adicionar testes unitários/integrados onde fizer sentido:

```text id="uih21i"
- eligibility de review
- CUSTOMER só vê agendamentos próprios
- só appointment FINISHED pode receber review
- uma review por appointment
- rating entre 1 e 5
- SUPER_ADMIN/USER não acessam portal cliente
```

Rodar:

```bash id="ye1duy"
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

---

# 15. Validação funcional obrigatória

## Portal

```text id="z51hc9"
1. CUSTOMER logado acessa /cliente.
2. CUSTOMER vê próximos agendamentos.
3. CUSTOMER vê histórico.
4. CUSTOMER abre detalhe de agendamento próprio.
5. CUSTOMER não vê internalNotes.
```

## Auth

```text id="a5i7jp"
1. Usuário anônimo acessa /cliente.
   Esperado: redireciona para /login?redirectTo=/cliente.

2. SUPER_ADMIN acessa /cliente.
   Esperado: bloqueado ou access denied.

3. USER prestador acessa /cliente.
   Esperado: bloqueado ou access denied.
```

## Perfil

```text id="zd0226"
1. CUSTOMER abre /cliente/perfil.
2. Atualiza nome.
3. Atualiza telefone.
4. Faz upload de avatar válido.
5. Tenta upload inválido.
6. Tenta upload maior que o limite.
```

## Histórico

```text id="wqiw12"
1. Criar agendamento público como CUSTOMER.
2. Ver agendamento em /cliente/agendamentos.
3. Finalizar agendamento pelo painel do prestador.
4. Ver agendamento migrar/ficar disponível no histórico.
```

## Avaliação

```text id="f76yew"
1. CUSTOMER tenta avaliar appointment não finalizado.
   Esperado: bloqueado.

2. CUSTOMER avalia appointment FINISHED.
   Esperado: review criada.

3. CUSTOMER tenta avaliar o mesmo appointment novamente.
   Esperado: bloqueado.

4. Outro CUSTOMER tenta acessar/avaliar appointment alheio.
   Esperado: bloqueado.

5. Prestador abre detalhe do appointment.
   Esperado: vê nota/comentário da avaliação.
```

## Segurança

```text id="dn4x89"
1. CUSTOMER A não vê appointments do CUSTOMER B.
2. CUSTOMER não vê appointments desvinculados do seu user_id.
3. CUSTOMER não vê dados internos do tenant.
4. Avatar não permite path traversal.
```

---

# Fora do escopo

Não implementar nesta fase:

```text id="vdr3b2"
- cancelamento pelo cliente
- remarcação pelo cliente
- chat
- notificações
- e-mail
- WhatsApp ativo
- avaliação pública na vitrine
- resposta do prestador à avaliação
- moderação de avaliação
- denúncia de avaliação
- média pública de notas
- dashboard avançado do cliente
- múltiplos perfis por cliente
- exclusão de conta
- LGPD completa de exportação/remoção
- S3/R2/CDN obrigatório
- crop/resize avançado de avatar
```

---

# Critérios de aceite

* CUSTOMER possui área `/cliente` ou equivalente.
* CUSTOMER consegue ver próximos agendamentos.
* CUSTOMER consegue ver histórico de agendamentos.
* CUSTOMER consegue abrir detalhe de agendamento próprio.
* CUSTOMER não vê agendamento de outro cliente.
* CUSTOMER consegue atualizar nome/telefone.
* CUSTOMER consegue colocar foto/avatar.
* Upload valida tipo e tamanho.
* CUSTOMER consegue avaliar appointment FINISHED.
* CUSTOMER não consegue avaliar appointment não finalizado.
* CUSTOMER não consegue avaliar appointment alheio.
* Uma avaliação por appointment.
* Prestador consegue ver avaliação no detalhe do agendamento.
* Avaliação não aparece publicamente no link público.
* SUPER_ADMIN/USER não acessam portal do cliente.
* Fluxo público de booking continua funcionando.
* Typebot API continua funcionando.
* Nenhuma regra de agendamento alterada.
* Migration criada e documentada.
* Documentação criada/atualizada.
* `pnpm typecheck`, `pnpm lint`, `pnpm test` e `pnpm build` passam.

---

# Instruções para o DeepSeek

Implemente somente a Phase 26 Customer Portal, Appointment History & Reviews.

Antes de alterar código, leia:

```text id="q49zrh"
.ai/PROJECT_RULES.md
.ai/skills/frontend-design.md
docs/specs/00-visao-produto.md
docs/specs/01-usuarios-permissoes.md
docs/technical/auth-permissoes.md
docs/technical/padroes-codigo.md
docs/design/visual-identity.md
docs/design/design-system-foundation.md
docs/design/public-booking-experience.md
docs/design/public-experience-conversion-redesign.md
docs/design/microcopy-empty-error-states.md
README.md
```

Implementar:

```text id="lt40y4"
- portal do cliente CUSTOMER
- /cliente
- /cliente/perfil
- /cliente/agendamentos
- /cliente/agendamentos/[id]
- perfil com nome, telefone e avatar
- próximos agendamentos
- histórico de agendamentos
- detalhe do agendamento
- avaliação de serviço finalizado
- visualização da avaliação no detalhe do agendamento do prestador
```

Pode criar migration para:

```text id="brehq6"
- avatar no User
- AppointmentReview
```

Preservar:

```text id="lhzmce"
- auth existente
- roles
- tenant isolation
- public booking
- Typebot API
- subscription enforcement
- availability
- blocks
- conflicts
- appointment status machine
- createdByUserId = null no fluxo público
```

Não implementar:

```text id="ngcf4x"
- cancelamento pelo cliente
- remarcação pelo cliente
- chat
- notificações
- e-mail
- WhatsApp ativo
- avaliação pública na vitrine
- resposta do prestador
- moderação de avaliação
- média pública de notas
- exclusão de conta
- LGPD completa
- S3/R2/CDN obrigatório
- crop/resize avançado de avatar
```

Ao finalizar, informe:

```text id="fofd7x"
- arquivos criados
- arquivos alterados
- migration criada
- rotas criadas
- regras de autorização
- regras de avaliação
- estratégia de avatar
- validações executadas
- pendências conhecidas
```
