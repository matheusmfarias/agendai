# Booksy-inspired Public UX — AgendaZap

## Direção visual

A experiência pública passa a se comportar mais como uma vitrine de negócio local e menos como uma listagem de registros. A referência Booksy é conceitual: perfil confiável, agendamento simples, avaliações e conta do cliente descobrível.

## Princípios

- Cliente final vê poucos caminhos e sempre entende o próximo passo.
- CTAs ficam próximos da decisão: agendar agora, escolher horário, solicitar horário.
- Cards de serviço são tocáveis e têm metadados úteis.
- O portal `/cliente` é continuação da experiência pública, não painel administrativo.
- Microinterações são leves: hover, focus, shadow e pequenos deslocamentos.

## Diferenças em relação ao Booksy

AgendaZap não implementa marketplace, busca global, equipe/profissionais, portfólio/fotos ou pagamento nesta fase. O foco segue em link próprio do prestador e WhatsApp-first.

## Hero

O hero usa dados reais do tenant: nome, segmento, cidade/UF, descrição, WhatsApp, quantidade de serviços e avaliação agregada quando existir. Nenhum número é inventado.

## Cards de serviço

Os cards viraram cartões de decisão: área inteira clicável, CTA contextual, duração/preço em chips e badge integrada ao modo de agendamento.

## Avaliações públicas

Avaliações públicas são exibidas apenas quando vêm de appointments `FINISHED`, pertencem ao tenant, têm rating válido e não expõem e-mail, telefone, ID ou dados internos. O nome do cliente é mascarado como primeiro nome + inicial.

## Rebooking

“Agendar novamente” aparece no histórico/detalhe do cliente quando o appointment foi finalizado e o serviço/categoria continuam ativos. O botão apenas leva para `/{tenantSlug}/book?serviceId=...`; não cria agendamento automaticamente.

## Limitações conhecidas

- Sem preferências avançadas de privacidade para reviews.
- Sem cancelamento/remarcação pelo cliente.
- Sem calendário visual, profissionais, portfólio ou pagamento.
