# Evolution API local para o Agendaí

Ambiente isolado da aplicação: Evolution API 2.3.6, PostgreSQL próprio e Redis. A Evolution não recebe acesso ao banco canônico do Agendaí. Esta integração é não oficial, baseada em WhatsApp Web e destinada apenas a um beta transacional controlado.

## Preparação

No PowerShell:

```powershell
Copy-Item .env.example .env
[Convert]::ToHexString([Security.Cryptography.RandomNumberGenerator]::GetBytes(32)).ToLower()
```

Copie o segredo gerado para `AUTHENTICATION_API_KEY`. O `.env` local não deve ser versionado. Para ambientes compartilhados, troque também as credenciais locais do PostgreSQL.

## Operação

Execute dentro de `infra/whatsapp`:

```bash
docker compose config
docker compose up -d
docker compose ps
docker compose logs -f evolution-api
```

No Windows, use Docker Desktop com containers Linux. Em Linux, Docker Engine com Compose v2. O health check da Evolution pode levar alguns minutos na primeira inicialização.

A criação da instância, obtenção do QR e envio de teste devem ser feitos pela aba **Configurações > WhatsApp** do Agendaí, pois ela registra a associação tenant-safe e configura o webhook por instância. Para diagnóstico da API, use a documentação da versão fixada e a `AUTHENTICATION_API_KEY` somente no terminal local; nunca cole a chave em issues ou logs.

Para validar persistência da sessão: conecte um número de teste, confirme o estado conectado, reinicie somente `evolution-api` e confirme novamente pela tela. Os volumes `evolution_instances_data`, `evolution_postgres_data` e `evolution_redis_data` preservam o estado.

```bash
docker compose restart evolution-api
docker compose down
```

`docker compose down` preserva os volumes. Não use `down -v` sem uma decisão explícita de descarte, pois isso remove a sessão e o banco da Evolution.

## Limites e segurança

- Apenas `QRCODE_UPDATED` e `CONNECTION_UPDATE` estão habilitados.
- Contatos, chats, mensagens recebidas e histórico não são persistidos.
- Não use números de clientes ou envie mensagens reais durante setup.
- Não use esta infraestrutura para campanhas, grupos, spam ou atendimento conversacional.
- A versão está fixada em 2.3.6; valide changelog e compatibilidade antes de atualizar.
