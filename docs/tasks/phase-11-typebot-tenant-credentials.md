# Task - Phase 11 Typebot Tenant Credentials

## Objetivo

Evoluir a autenticação da API Typebot para suportar credenciais próprias por tenant.

Até a Phase 10, os endpoints `/api/typebot/...` usam uma chave global via variável de ambiente:

```env
TYPEBOT_API_KEY=...
```

Isso é suficiente para desenvolvimento e validação inicial, mas não é adequado para produção multiempresa, pois todos os prestadores/bots compartilhariam o mesmo segredo.

Esta fase deve implementar tokens Typebot por tenant, permitindo que cada prestador tenha sua própria credencial de integração. O backend deve validar que o token apresentado pertence exatamente ao tenant da URL.

---

# Dependências

Esta task depende da conclusão e validação das fases:

```text
/docs/tasks/phase-06-typebot-api.md
/docs/tasks/phase-07-typebot-flow-blueprint.md
/docs/tasks/phase-08-typebot-service-details-custom-fields.md
/docs/tasks/phase-09-typebot-flow-simulator.md
/docs/tasks/phase-10-typebot-real-setup-guide.md
```

Também depende das fases anteriores:

```text
/docs/tasks/phase-01-foundation.md
/docs/tasks/phase-02-admin-platform.md
/docs/tasks/phase-02-1-provider-login-access.md
/docs/tasks/phase-03-provider-panel.md
/docs/tasks/phase-04-customers-appointments-core.md
/docs/tasks/phase-05-public-booking-link.md
/docs/tasks/phase-05-1-public-customer-auth.md
/docs/tasks/phase-05-2-public-routing-refactor.md
```

Antes de implementar, leia obrigatoriamente:

```text
/docs/technical/typebot-api.md
/docs/typebot/real-setup-guide.md
/docs/typebot/real-http-blocks.md
/docs/typebot/real-variable-mapping.md
/docs/typebot/real-validation-checklist.md
/docs/technical/auth-permissoes.md
/docs/technical/banco-dados.md
/docs/technical/padroes-codigo.md
README.md
```

---

# Escopo

Implementar:

```text
1. Modelo de credenciais Typebot por tenant
2. Geração de token seguro
3. Armazenamento somente do hash do token
4. Validação do token por tenantSlug
5. Tela admin para visualizar/gerar/revogar token
6. Atualização dos endpoints Typebot para aceitar token por tenant
7. Fallback temporário para TYPEBOT_API_KEY global em ambiente dev, se necessário
8. Audit logs para geração/revogação/uso inválido
9. Atualização da documentação Typebot
```

---

# 1. Banco de dados

Criar model Prisma:

```prisma
model TypebotCredential {
  id            String    @id @default(uuid()) @db.Uuid
  tenantId      String    @map("tenant_id") @db.Uuid
  name          String
  tokenHash     String    @map("token_hash")
  tokenPrefix   String    @map("token_prefix")
  isActive      Boolean   @default(true) @map("is_active")
  lastUsedAt    DateTime? @map("last_used_at") @db.Timestamptz(3)
  revokedAt     DateTime? @map("revoked_at") @db.Timestamptz(3)
  createdAt     DateTime  @default(now()) @map("created_at") @db.Timestamptz(3)
  updatedAt     DateTime  @updatedAt @map("updated_at") @db.Timestamptz(3)

  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@index([tenantId])
  @@index([tokenPrefix])
  @@map("typebot_credentials")
}
```

Adicionar relação em `Tenant`:

```prisma
typebotCredentials TypebotCredential[]
```

## Regras

* Nunca armazenar token em texto puro.
* Armazenar apenas hash.
* Armazenar prefixo visível para identificação.
* Token completo só aparece uma vez, imediatamente após geração.
* Se o operador perder o token, deve revogar e gerar outro.
* Um tenant pode ter múltiplas credenciais, mas apenas ativas devem autenticar.
* Credenciais revogadas não podem autenticar.

---

# 2. Formato do token

Gerar token com prefixo identificável:

```text
agz_tb_<random_secret>
```

Exemplo:

```text
agz_tb_9f2QmM3rP7xA... 
```

## Regras

* O segredo deve ser criptograficamente seguro.
* Usar `crypto.randomBytes` ou equivalente.
* Tamanho recomendado: pelo menos 32 bytes aleatórios.
* O token completo deve ser mostrado apenas no momento da geração.
* `tokenPrefix` pode ser algo como os primeiros 12 a 16 caracteres do token.

## Hash

Usar hash seguro determinístico para comparação:

```text
sha256(token)
```

ou HMAC com segredo de aplicação, se já houver padrão no projeto.

Recomendação para MVP:

```text
sha256(token)
```

Não usar bcrypt para token de API se a validação for frequente em endpoint público, pois bcrypt pode pesar desnecessariamente.

---

# 3. Validação dos endpoints Typebot

Hoje os endpoints Typebot validam:

```text
x-typebot-api-key == TYPEBOT_API_KEY
```

Atualizar para:

```text
x-typebot-api-key = token do tenant
```

## Regra principal

Para uma chamada:

```http
GET /api/typebot/mecanica-silva/services
x-typebot-api-key: agz_tb_xxxxx
```

O backend deve validar:

```text
1. Header existe
2. Token tem formato esperado
3. Hash do token existe em typebot_credentials
4. Credencial está ativa
5. Credencial não está revogada
6. Credencial pertence ao tenant do tenantSlug da URL
7. Tenant está ativo
8. Plano/assinatura permite WhatsApp/Typebot
```

Se o token existir, mas pertencer a outro tenant, retornar:

```json
{
  "ok": false,
  "code": "UNAUTHORIZED",
  "message": "Não autorizado."
}
```

Não revelar:

```text
- token pertence a outro tenant
- token existe
- token foi revogado
- tenant correto
```

## Atualizar `lastUsedAt`

Quando uma credencial válida for usada, atualizar:

```text
lastUsedAt = now()
```

A atualização pode ocorrer nos endpoints ou em helper centralizado.

---

# 4. Fallback para TYPEBOT_API_KEY global

Para não quebrar desenvolvimento imediatamente, permitir fallback controlado.

## Regra recomendada

Se existir pelo menos uma credencial Typebot ativa para o tenant:

```text
- exigir token por tenant
- não aceitar TYPEBOT_API_KEY global para aquele tenant
```

Se não existir credencial ativa para o tenant:

```text
- em ambiente development, aceitar TYPEBOT_API_KEY global se configurada
- em produção, não aceitar fallback global
```

## Variável opcional

Pode criar variável:

```env
TYPEBOT_ALLOW_GLOBAL_KEY_FALLBACK=true
```

Regras:

```text
- default false em produção
- pode ser true em desenvolvimento
- se false, somente credencial por tenant autentica
```

Se implementar essa variável, documentar claramente.

---

# 5. Tela admin de credenciais

Criar tela no admin:

```text
/admin/tenants/[id]/typebot-credentials
```

Ou adicionar seção no detalhe do tenant:

```text
/admin/tenants/[id]
```

## Recomendação

Criar rota dedicada:

```text
/admin/tenants/[id]/typebot-credentials
```

## Acesso

Somente:

```text
SUPER_ADMIN
```

## Exibir

Tabela com credenciais do tenant:

```text
Nome
Prefixo
Status
Criado em
Último uso
Revogado em
Ações
```

## Ações

```text
Gerar nova credencial
Revogar credencial
```

## Gerar credencial

Campos:

```text
Nome da credencial
```

Exemplo:

```text
Typebot produção
Typebot homologação
Bot principal
```

Ao gerar:

```text
1. Criar token
2. Salvar hash/prefixo
3. Exibir token completo uma única vez
4. Mostrar aviso: "Copie este token agora. Ele não será exibido novamente."
5. Criar audit log
```

## Revogar

Ao revogar:

```text
1. set isActive = false
2. set revokedAt = now()
3. criar audit log
```

Não deletar fisicamente.

---

# 6. Audit logs

Criar eventos:

```text
TYPEBOT_CREDENTIAL_CREATED
TYPEBOT_CREDENTIAL_REVOKED
TYPEBOT_CREDENTIAL_AUTH_FAILED
```

Opcional:

```text
TYPEBOT_CREDENTIAL_USED
```

Cuidado: logar uso em toda requisição pode gerar volume alto. Para MVP, não é necessário logar cada uso bem-sucedido se `lastUsedAt` já for atualizado.

## Metadata permitida

```json
{
  "tenantId": "tenant_id",
  "credentialId": "credential_id",
  "tokenPrefix": "agz_tb_xxxx"
}
```

## Nunca registrar

```text
token completo
token hash
x-typebot-api-key
headers completos
cookies
segredos
```

---

# 7. Atualização da API Typebot

Atualizar helper atual de autenticação, provavelmente:

```text
src/features/typebot/typebot-api-key.ts
```

ou equivalente.

## Regras

* O helper deve receber `tenantSlug` ou `tenantId`.
* Deve retornar sucesso/falha de autenticação.
* Deve ser usado por todos os endpoints Typebot:

  * business
  * services
  * service detail
  * slots
  * customers/identify
  * appointments
  * appointment detail
* Evitar duplicar validação por endpoint.

---

# 8. Atualizar documentação

Atualizar:

```text
/docs/technical/typebot-api.md
/docs/typebot/real-setup-guide.md
/docs/typebot/real-http-blocks.md
/docs/typebot/real-variable-mapping.md
/docs/typebot/real-validation-checklist.md
/docs/typebot/simulator.md
README.md
```

Documentar:

```text
- como gerar token por tenant
- onde copiar o token
- como configurar `typebotApiKey` no Typebot real
- como testar token válido
- como revogar token
- como testar token revogado
- diferença entre token global dev e token por tenant
```

---

# 9. Simulador Typebot

O simulador interno não deve expor tokens nem depender deles no client.

## Regras

* O simulador em `/admin/typebot-simulator` deve continuar funcionando.
* Ele usa services internos/server actions.
* Não deve exigir o token Typebot.
* Não deve mostrar token Typebot.
* Não deve enviar `x-typebot-api-key` no client.
* Se precisar simular uma chamada externa, fazer server-side e nunca expor token.

---

# 10. Segurança

## Obrigatório

* Não retornar token completo em listagens.
* Não retornar token hash nunca.
* Não logar token.
* Não aceitar token de outro tenant.
* Não permitir USER/CUSTOMER gerar credenciais.
* Não permitir prestador gerar credenciais nesta fase.
* Não permitir revogar fisicamente deletando do banco.
* Não usar token em query string.
* Usar somente header:

```text
x-typebot-api-key
```

## Resposta de erro padrão

```json
{
  "ok": false,
  "code": "UNAUTHORIZED",
  "message": "Não autorizado."
}
```

---

# 11. README

Atualizar README com:

```text
Phase 11 - Typebot Tenant Credentials
```

Informar:

```text
- API Typebot agora usa credencial por tenant
- token é gerado no admin
- token completo só aparece uma vez
- simulador interno não expõe token
- fallback global é apenas dev/opcional, se implementado
```

---

# Fora do escopo

Não implementar:

```text
WhatsApp Cloud API
webhook WhatsApp
envio ativo de mensagens
integração automática com Typebot
painel de bot visual
tokens gerenciados pelo prestador
OAuth
HMAC por payload
rotação automática de token
expiração automática de token
múltiplos ambientes avançados
área do cliente
cancelamento/remarcação via WhatsApp
pagamento
lembretes
```

---

# Critérios de aceite

* Model `TypebotCredential` criado.
* Migration criada.
* Tenant possui relação com `typebotCredentials`.
* Token seguro é gerado com prefixo `agz_tb_`.
* Token completo aparece somente uma vez.
* Apenas hash é salvo.
* Prefixo é salvo para identificação.
* Tela admin permite gerar credencial por tenant.
* Tela admin permite revogar credencial.
* Credencial revogada não autentica.
* Token de tenant A não autentica tenant B.
* Endpoints Typebot aceitam token válido do tenant.
* Endpoints Typebot rejeitam ausência de token.
* Endpoints Typebot rejeitam token inválido.
* Endpoints Typebot rejeitam token revogado.
* `lastUsedAt` é atualizado no uso válido.
* Audit log é criado para geração.
* Audit log é criado para revogação.
* Token completo/hash/header não aparece em audit logs.
* Simulador Typebot continua funcionando.
* Link público web continua funcionando.
* Painel prestador continua funcionando.
* Documentação atualizada.
* README atualizado.
* `pnpm typecheck`, `pnpm lint`, `pnpm test` e `pnpm build` passam.

---

# Instruções para o DeepSeek

Implemente somente a Phase 11 Typebot Tenant Credentials.

Não implemente WhatsApp real, webhook, envio ativo, painel visual de bot, OAuth, HMAC, expiração automática, área do cliente, cancelamento, remarcação, pagamento ou lembretes.

Não exponha token completo em listagens, logs, respostas futuras ou UI após a criação.

Não armazene token em texto puro.

Ao finalizar, informe:

```text
- arquivos criados
- arquivos alterados
- migration criada
- rota admin criada
- como gerar token
- como testar endpoints com token por tenant
- validações executadas
- pendências conhecidas
```
