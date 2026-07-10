# 00 - Visão do Produto

## Nome provisório

AgendaZap SaaS

## Definição

Plataforma SaaS multiempresa para prestadores de serviço criarem um catálogo digital de serviços, receberem agendamentos por link público e WhatsApp, organizarem clientes, agenda e histórico operacional.

A plataforma é monetizada por mensalidade ou anuidade paga pelo prestador. Não haverá intermediação de pagamento entre cliente final e prestador no MVP.

## Problema

Pequenos prestadores locais dependem fortemente do WhatsApp para responder perguntas repetitivas sobre serviços, preços, horários, disponibilidade e agendamentos.

Isso gera perda de tempo, desorganização, conflitos de agenda, esquecimento de atendimentos e dificuldade de visualizar a operação do negócio.

## Público-alvo

Prestadores locais e pequenos negócios de serviço, como:

* Mecânicas
* Manicures
* Cabeleireiros
* Barbearias
* Estéticas
* Assistências técnicas
* Instaladores
* Eletricistas
* Pet shops
* Lavações automotivas
* Outros serviços agendáveis

## Proposta de valor

Transformar o WhatsApp e o link público do prestador em uma agenda organizada, permitindo que clientes vejam serviços, valores, disponibilidade e solicitem ou confirmem horários sem depender de atendimento manual para cada interação.

## Canais de entrada

O sistema deve aceitar agendamentos e solicitações por:

* Link público/cardápio digital
* WhatsApp integrado via Typebot
* Cadastro manual pelo painel do prestador

Todos os canais devem gravar no mesmo banco de dados e seguir as mesmas regras de negócio.

## Monetização

A plataforma cobra do prestador por:

* Plano mensal
* Plano anual

No MVP, a cobrança pode ser registrada manualmente pelo Super Admin, sem integração com gateway de pagamento.

## O que a plataforma faz

* Cadastro de prestadores
* Catálogo de serviços
* Agenda
* Agendamentos
* Solicitações
* Histórico de clientes
* Integração com WhatsApp via Typebot
* Link público para clientes finais
* Controle de assinatura do prestador
* Painel administrativo da plataforma
* Painel operacional do prestador

## O que a plataforma não faz no MVP

* Não intermedia pagamento entre cliente final e prestador
* Não emite nota fiscal
* Não garante a execução do serviço
* Não faz marketplace público de prestadores
* Não ranqueia prestadores
* Não resolve disputa entre cliente e prestador
* Não possui app mobile nativo
* Não possui IA avançada no atendimento inicial
* Não possui integração obrigatória com Google Agenda
* Não possui controle financeiro completo do prestador
* Não possui estoque
* Não possui ordem de serviço completa

## Princípios do produto

1. O WhatsApp é canal de entrada, não sistema separado.
2. O link público e o WhatsApp usam o mesmo banco e as mesmas regras.
3. O cliente final não precisa criar conta no MVP.
4. O prestador deve conseguir operar o sistema sem depender do suporte.
5. O Super Admin deve conseguir manter o SaaS por interface administrativa, sem depender de banco, seed ou API manual.
6. Toda manutenção recorrente deve possuir tela administrativa.
7. Templates por segmento devem acelerar configuração, mas não limitar customização.
8. O MVP deve priorizar agenda, catálogo, WhatsApp e assinatura.
9. Pagamento cliente final → prestador fica fora do escopo.
10. O produto deve nascer multiempresa desde o início.

## Critérios de aceite

* O sistema permite múltiplos prestadores isolados entre si.
* Cada prestador possui catálogo, agenda, clientes e agendamentos próprios.
* O Super Admin consegue gerenciar prestadores e assinaturas por interface.
* O prestador consegue configurar serviços e horários por interface.
* O cliente final consegue solicitar ou criar agendamento sem login.
* O WhatsApp, via Typebot, consegue consultar serviços e criar agendamentos pela API.
* O sistema registra a origem do agendamento.
* O sistema impede conflitos de agenda.
* O sistema não contém fluxo de pagamento entre cliente final e prestador.
