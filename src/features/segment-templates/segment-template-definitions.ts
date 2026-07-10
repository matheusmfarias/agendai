/**
 * Segment Template Definitions.
 *
 * Each template is a const object keyed by SegmentTemplateKey.
 * Templates are pure data — no database access.
 */

import type { SegmentTemplateDefinition } from "@/features/segment-templates/segment-template-types";

// ---------------------------------------------------------------------------
// Default availability (Mon–Fri 08–12 / 13:30–18, Sat 08–12)
// ---------------------------------------------------------------------------

export const DEFAULT_AVAILABILITY = [
  { weekday: 1, startTime: "08:00", endTime: "12:00", slotIntervalMinutes: 30 },
  { weekday: 1, startTime: "13:30", endTime: "18:00", slotIntervalMinutes: 30 },
  { weekday: 2, startTime: "08:00", endTime: "12:00", slotIntervalMinutes: 30 },
  { weekday: 2, startTime: "13:30", endTime: "18:00", slotIntervalMinutes: 30 },
  { weekday: 3, startTime: "08:00", endTime: "12:00", slotIntervalMinutes: 30 },
  { weekday: 3, startTime: "13:30", endTime: "18:00", slotIntervalMinutes: 30 },
  { weekday: 4, startTime: "08:00", endTime: "12:00", slotIntervalMinutes: 30 },
  { weekday: 4, startTime: "13:30", endTime: "18:00", slotIntervalMinutes: 30 },
  { weekday: 5, startTime: "08:00", endTime: "12:00", slotIntervalMinutes: 30 },
  { weekday: 5, startTime: "13:30", endTime: "18:00", slotIntervalMinutes: 30 },
  { weekday: 6, startTime: "08:00", endTime: "12:00", slotIntervalMinutes: 30 },
];

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

const mechanic: SegmentTemplateDefinition = {
  key: "mechanic",
  name: "Mecânica",
  description:
    "Template para oficinas mecânicas com categorias de diagnóstico, manutenção e serviços rápidos.",
  segment: "Oficina",
  categories: [
    {
      name: "Diagnóstico",
      description: "Serviços de diagnóstico veicular",
      order: 0,
      services: [
        {
          name: "Diagnóstico veicular",
          description: "Avaliação completa dos sistemas do veículo com scanner automotivo.",
          durationMinutes: 60,
          priceType: "STARTING_AT",
          priceValue: 80,
          bookingMode: "REQUIRES_CONFIRMATION",
          order: 0,
          customFields: [
            { label: "Placa do veículo", key: "placa_veiculo", fieldType: "TEXT", isRequired: true, order: 0 },
            { label: "Modelo do veículo", key: "modelo_veiculo", fieldType: "TEXT", isRequired: true, order: 1 },
            { label: "Ano do veículo", key: "ano_veiculo", fieldType: "NUMBER", isRequired: true, order: 2 },
            { label: "Descrição do problema", key: "descricao_problema", fieldType: "TEXTAREA", isRequired: true, order: 3 },
            { label: "Tipo de combustível", key: "tipo_combustivel", fieldType: "SELECT", isRequired: false, options: ["Gasolina", "Etanol", "Flex", "Diesel", "GNV", "Elétrico"], order: 4 },
          ],
        },
      ],
    },
    {
      name: "Manutenção",
      description: "Serviços de manutenção preventiva e corretiva",
      order: 1,
      services: [
        {
          name: "Troca de óleo",
          description: "Troca de óleo do motor e filtro de óleo.",
          durationMinutes: 30,
          priceType: "STARTING_AT",
          priceValue: 120,
          bookingMode: "DIRECT",
          order: 0,
          customFields: [
            { label: "Placa do veículo", key: "placa_veiculo", fieldType: "TEXT", isRequired: true, order: 0 },
            { label: "Modelo do veículo", key: "modelo_veiculo", fieldType: "TEXT", isRequired: true, order: 1 },
          ],
        },
        {
          name: "Revisão preventiva",
          description: "Revisão completa dos principais sistemas do veículo conforme manual.",
          durationMinutes: 90,
          priceType: "STARTING_AT",
          priceValue: 250,
          bookingMode: "REQUIRES_CONFIRMATION",
          order: 1,
          customFields: [
            { label: "Placa do veículo", key: "placa_veiculo", fieldType: "TEXT", isRequired: true, order: 0 },
            { label: "Modelo do veículo", key: "modelo_veiculo", fieldType: "TEXT", isRequired: true, order: 1 },
            { label: "Quilometragem atual", key: "quilometragem", fieldType: "NUMBER", isRequired: false, order: 2 },
          ],
        },
        {
          name: "Freios",
          description: "Inspeção e substituição de pastilhas, discos e fluido de freio.",
          durationMinutes: 60,
          priceType: "STARTING_AT",
          priceValue: 150,
          bookingMode: "REQUIRES_CONFIRMATION",
          order: 2,
          customFields: [
            { label: "Placa do veículo", key: "placa_veiculo", fieldType: "TEXT", isRequired: true, order: 0 },
            { label: "Modelo do veículo", key: "modelo_veiculo", fieldType: "TEXT", isRequired: true, order: 1 },
            { label: "Sintoma percebido", key: "sintoma_freio", fieldType: "TEXTAREA", isRequired: false, order: 2 },
          ],
        },
        {
          name: "Suspensão",
          description: "Diagnóstico e reparo do sistema de suspensão.",
          durationMinutes: 90,
          priceType: "STARTING_AT",
          priceValue: 180,
          bookingMode: "REQUIRES_CONFIRMATION",
          order: 3,
          customFields: [
            { label: "Placa do veículo", key: "placa_veiculo", fieldType: "TEXT", isRequired: true, order: 0 },
            { label: "Descrição do problema", key: "descricao_problema", fieldType: "TEXTAREA", isRequired: true, order: 1 },
          ],
        },
      ],
    },
    {
      name: "Serviços rápidos",
      description: "Serviços de execução rápida sem necessidade de agendamento prolongado",
      order: 2,
      services: [
        {
          name: "Alinhamento e balanceamento",
          description: "Alinhamento da direção e balanceamento das rodas.",
          durationMinutes: 45,
          priceType: "FIXED",
          priceValue: 140,
          bookingMode: "DIRECT",
          order: 0,
          customFields: [
            { label: "Placa do veículo", key: "placa_veiculo", fieldType: "TEXT", isRequired: true, order: 0 },
          ],
        },
      ],
    },
  ],
  availability: DEFAULT_AVAILABILITY,
};

const barbershop: SegmentTemplateDefinition = {
  key: "barbershop",
  name: "Barbearia",
  description:
    "Template para barbearias com categorias de cortes, barba e combos.",
  segment: "Barbearia",
  categories: [
    {
      name: "Cortes",
      order: 0,
      services: [
        {
          name: "Corte masculino",
          description: "Corte de cabelo masculino com tesoura e máquina.",
          durationMinutes: 30,
          priceType: "FIXED",
          priceValue: 45,
          bookingMode: "DIRECT",
          order: 0,
          customFields: [
            { label: "Preferência de profissional", key: "preferencia_profissional", fieldType: "TEXT", isRequired: false, order: 0 },
            { label: "Observações", key: "observacoes", fieldType: "TEXTAREA", isRequired: false, order: 1 },
          ],
        },
        {
          name: "Corte infantil",
          description: "Corte para crianças até 12 anos.",
          durationMinutes: 30,
          priceType: "FIXED",
          priceValue: 35,
          bookingMode: "DIRECT",
          order: 1,
          customFields: [
            { label: "Idade da criança", key: "idade_crianca", fieldType: "NUMBER", isRequired: false, order: 0 },
          ],
        },
        {
          name: "Sobrancelha",
          description: "Design de sobrancelha com navalha ou pinça.",
          durationMinutes: 15,
          priceType: "FIXED",
          priceValue: 20,
          bookingMode: "DIRECT",
          order: 2,
        },
      ],
    },
    {
      name: "Barba",
      order: 1,
      services: [
        {
          name: "Barba",
          description: "Aparação e desenho de barba com navalha.",
          durationMinutes: 20,
          priceType: "FIXED",
          priceValue: 30,
          bookingMode: "DIRECT",
          order: 0,
        },
      ],
    },
    {
      name: "Combos",
      order: 2,
      services: [
        {
          name: "Corte + barba",
          description: "Combo de corte masculino e barba completa.",
          durationMinutes: 45,
          priceType: "FIXED",
          priceValue: 65,
          bookingMode: "DIRECT",
          order: 0,
          customFields: [
            { label: "Preferência de profissional", key: "preferencia_profissional", fieldType: "TEXT", isRequired: false, order: 0 },
          ],
        },
      ],
    },
  ],
  availability: DEFAULT_AVAILABILITY,
};

const manicure: SegmentTemplateDefinition = {
  key: "manicure",
  name: "Manicure",
  description:
    "Template para serviços de manicure e pedicure com opções de alongamento.",
  segment: "Manicure",
  categories: [
    {
      name: "Mãos",
      order: 0,
      services: [
        {
          name: "Manicure",
          description: "Cutilagem e esmaltação tradicional.",
          durationMinutes: 45,
          priceType: "FIXED",
          priceValue: 40,
          bookingMode: "DIRECT",
          order: 0,
          customFields: [
            { label: "Deseja remover esmalte anterior?", key: "remover_esmalte", fieldType: "BOOLEAN", isRequired: false, order: 0 },
          ],
        },
        {
          name: "Esmaltação em gel",
          description: "Esmaltação com esmalte em gel de longa duração.",
          durationMinutes: 60,
          priceType: "FIXED",
          priceValue: 65,
          bookingMode: "DIRECT",
          order: 1,
          customFields: [
            { label: "Deseja remover esmalte anterior?", key: "remover_esmalte", fieldType: "BOOLEAN", isRequired: false, order: 0 },
          ],
        },
      ],
    },
    {
      name: "Pés",
      order: 1,
      services: [
        {
          name: "Pedicure",
          description: "Cutilagem e esmaltação dos pés.",
          durationMinutes: 50,
          priceType: "FIXED",
          priceValue: 45,
          bookingMode: "DIRECT",
          order: 0,
        },
      ],
    },
    {
      name: "Combos",
      order: 2,
      services: [
        {
          name: "Manicure + pedicure",
          description: "Combo completo de mãos e pés.",
          durationMinutes: 80,
          priceType: "FIXED",
          priceValue: 70,
          bookingMode: "DIRECT",
          order: 0,
        },
      ],
    },
    {
      name: "Alongamento",
      order: 3,
      services: [
        {
          name: "Alongamento de unhas",
          description: "Aplicação de alongamento com material escolhido.",
          durationMinutes: 120,
          priceType: "STARTING_AT",
          priceValue: 120,
          bookingMode: "REQUIRES_CONFIRMATION",
          order: 0,
          customFields: [
            { label: "Possui alongamento atualmente?", key: "possui_alongamento", fieldType: "BOOLEAN", isRequired: true, order: 0 },
            { label: "Tipo de alongamento desejado", key: "tipo_alongamento", fieldType: "SELECT", isRequired: false, options: ["Gel", "Acrílico", "Fibra de vidro", "Polygel"], order: 1 },
            { label: "Observações", key: "observacoes", fieldType: "TEXTAREA", isRequired: false, order: 2 },
          ],
        },
        {
          name: "Manutenção de alongamento",
          description: "Manutenção periódica do alongamento existente.",
          durationMinutes: 90,
          priceType: "FIXED",
          priceValue: 80,
          bookingMode: "DIRECT",
          order: 1,
        },
      ],
    },
  ],
  availability: DEFAULT_AVAILABILITY,
};

const beauty: SegmentTemplateDefinition = {
  key: "beauty",
  name: "Estética",
  description:
    "Template para clínicas de estética com categorias facial, corporal e depilação.",
  segment: "Estética",
  categories: [
    {
      name: "Facial",
      order: 0,
      services: [
        {
          name: "Limpeza de pele",
          description: "Limpeza de pele profunda com vaporização e extração.",
          durationMinutes: 60,
          priceType: "FIXED",
          priceValue: 120,
          bookingMode: "DIRECT",
          order: 0,
          customFields: [
            { label: "Já realizou limpeza de pele antes?", key: "ja_realizou_antes", fieldType: "BOOLEAN", isRequired: false, order: 0 },
            { label: "Possui alergias?", key: "possui_alergias", fieldType: "TEXTAREA", isRequired: true, order: 1 },
            { label: "Está gestante?", key: "esta_gestante", fieldType: "BOOLEAN", isRequired: false, order: 2 },
          ],
        },
        {
          name: "Design de sobrancelhas",
          description: "Design de sobrancelhas com pinça e/ou linha.",
          durationMinutes: 30,
          priceType: "FIXED",
          priceValue: 35,
          bookingMode: "DIRECT",
          order: 1,
        },
      ],
    },
    {
      name: "Corporal",
      order: 1,
      services: [
        {
          name: "Massagem relaxante",
          description: "Massagem corporal relaxante com óleos essenciais.",
          durationMinutes: 60,
          priceType: "FIXED",
          priceValue: 130,
          bookingMode: "DIRECT",
          order: 0,
          customFields: [
            { label: "Possui alergias?", key: "possui_alergias", fieldType: "TEXTAREA", isRequired: true, order: 0 },
            { label: "Está gestante?", key: "esta_gestante", fieldType: "BOOLEAN", isRequired: false, order: 1 },
          ],
        },
        {
          name: "Procedimento corporal",
          description: "Procedimento estético corporal (conforme avaliação).",
          durationMinutes: 90,
          priceType: "STARTING_AT",
          priceValue: 200,
          bookingMode: "REQUIRES_CONFIRMATION",
          order: 1,
          customFields: [
            { label: "Já realizou esse procedimento antes?", key: "ja_realizou_antes", fieldType: "BOOLEAN", isRequired: false, order: 0 },
            { label: "Possui alergias?", key: "possui_alergias", fieldType: "TEXTAREA", isRequired: true, order: 1 },
            { label: "Está gestante?", key: "esta_gestante", fieldType: "BOOLEAN", isRequired: false, order: 2 },
            { label: "Observações importantes", key: "observacoes", fieldType: "TEXTAREA", isRequired: false, order: 3 },
          ],
        },
      ],
    },
    {
      name: "Depilação",
      order: 2,
      services: [
        {
          name: "Depilação",
          description: "Depilação com cera (consultar regiões disponíveis).",
          durationMinutes: 45,
          priceType: "STARTING_AT",
          priceValue: 50,
          bookingMode: "DIRECT",
          order: 0,
          customFields: [
            { label: "Região desejada", key: "regiao_depilacao", fieldType: "TEXT", isRequired: true, order: 0 },
            { label: "Possui alergias?", key: "possui_alergias", fieldType: "TEXTAREA", isRequired: false, order: 1 },
          ],
        },
      ],
    },
    {
      name: "Avaliação",
      order: 3,
      services: [
        {
          name: "Avaliação estética",
          description: "Avaliação inicial para definição do tratamento adequado.",
          durationMinutes: 30,
          priceType: "HIDDEN",
          bookingMode: "REQUIRES_CONFIRMATION",
          order: 0,
          customFields: [
            { label: "Principal preocupação estética", key: "preocupacao_estetica", fieldType: "TEXTAREA", isRequired: true, order: 0 },
            { label: "Possui alergias?", key: "possui_alergias", fieldType: "TEXTAREA", isRequired: true, order: 1 },
            { label: "Está gestante?", key: "esta_gestante", fieldType: "BOOLEAN", isRequired: false, order: 2 },
          ],
        },
      ],
    },
  ],
  availability: DEFAULT_AVAILABILITY,
};

const technicalAssistance: SegmentTemplateDefinition = {
  key: "technical_assistance",
  name: "Assistência técnica",
  description:
    "Template para assistências técnicas de eletrônicos com foco em celulares e computadores.",
  segment: "Assistência Técnica",
  categories: [
    {
      name: "Celulares",
      order: 0,
      services: [
        {
          name: "Troca de tela",
          description: "Substituição de tela de celular.",
          durationMinutes: 90,
          priceType: "STARTING_AT",
          priceValue: 200,
          bookingMode: "REQUIRES_CONFIRMATION",
          order: 0,
          customFields: [
            { label: "Marca do aparelho", key: "marca_aparelho", fieldType: "TEXT", isRequired: true, order: 0 },
            { label: "Modelo do aparelho", key: "modelo_aparelho", fieldType: "TEXT", isRequired: true, order: 1 },
          ],
        },
        {
          name: "Troca de bateria",
          description: "Substituição de bateria de celular.",
          durationMinutes: 60,
          priceType: "STARTING_AT",
          priceValue: 150,
          bookingMode: "DIRECT",
          order: 1,
          customFields: [
            { label: "Marca do aparelho", key: "marca_aparelho", fieldType: "TEXT", isRequired: true, order: 0 },
            { label: "Modelo do aparelho", key: "modelo_aparelho", fieldType: "TEXT", isRequired: true, order: 1 },
          ],
        },
      ],
    },
    {
      name: "Computadores",
      order: 1,
      services: [
        {
          name: "Formatação de computador",
          description: "Formatação e reinstalação do sistema operacional.",
          durationMinutes: 120,
          priceType: "FIXED",
          priceValue: 120,
          bookingMode: "DIRECT",
          order: 0,
          customFields: [
            { label: "Marca do aparelho", key: "marca_aparelho", fieldType: "TEXT", isRequired: true, order: 0 },
            { label: "Modelo do aparelho", key: "modelo_aparelho", fieldType: "TEXT", isRequired: true, order: 1 },
            { label: "Sistema operacional atual", key: "sistema_operacional", fieldType: "SELECT", isRequired: false, options: ["Windows", "macOS", "Linux", "Não sei"], order: 2 },
          ],
        },
        {
          name: "Limpeza preventiva",
          description: "Limpeza interna e troca de pasta térmica.",
          durationMinutes: 60,
          priceType: "FIXED",
          priceValue: 90,
          bookingMode: "DIRECT",
          order: 1,
          customFields: [
            { label: "Computador liga normalmente?", key: "aparelho_liga", fieldType: "BOOLEAN", isRequired: true, order: 0 },
          ],
        },
      ],
    },
    {
      name: "Orçamentos",
      order: 2,
      services: [
        {
          name: "Diagnóstico técnico",
          description: "Avaliação técnica para identificar o problema do aparelho.",
          durationMinutes: 30,
          priceType: "ON_REQUEST",
          bookingMode: "REQUIRES_CONFIRMATION",
          order: 0,
          customFields: [
            { label: "Marca do aparelho", key: "marca_aparelho", fieldType: "TEXT", isRequired: true, order: 0 },
            { label: "Modelo do aparelho", key: "modelo_aparelho", fieldType: "TEXT", isRequired: true, order: 1 },
            { label: "Problema apresentado", key: "problema_apresentado", fieldType: "TEXTAREA", isRequired: true, order: 2 },
            { label: "Aparelho liga?", key: "aparelho_liga", fieldType: "BOOLEAN", isRequired: false, order: 3 },
            { label: "Possui senha de acesso?", key: "possui_senha", fieldType: "BOOLEAN", isRequired: false, order: 4 },
          ],
        },
        {
          name: "Orçamento de reparo",
          description: "Elaboração de orçamento para reparo após diagnóstico.",
          durationMinutes: 15,
          priceType: "HIDDEN",
          bookingMode: "REQUIRES_CONFIRMATION",
          order: 1,
        },
      ],
    },
  ],
  availability: DEFAULT_AVAILABILITY,
};

const clinicSimple: SegmentTemplateDefinition = {
  key: "clinic_simple",
  name: "Clínica/consultório simples",
  description:
    "Template para clínicas e consultórios com foco em consultas e retornos. Não inclui funcionalidades médicas avançadas.",
  segment: "Clínica",
  categories: [
    {
      name: "Consultas",
      order: 0,
      services: [
        {
          name: "Primeira consulta",
          description: "Consulta inicial para avaliação do paciente.",
          durationMinutes: 50,
          priceType: "FIXED",
          priceValue: 200,
          bookingMode: "REQUIRES_CONFIRMATION",
          order: 0,
          customFields: [
            { label: "Motivo da consulta", key: "motivo_consulta", fieldType: "TEXTAREA", isRequired: true, order: 0 },
            { label: "É primeira consulta?", key: "primeira_consulta", fieldType: "BOOLEAN", isRequired: true, order: 1 },
            { label: "Possui encaminhamento?", key: "possui_encaminhamento", fieldType: "BOOLEAN", isRequired: false, order: 2 },
          ],
        },
        {
          name: "Consulta de retorno",
          description: "Consulta de acompanhamento para pacientes já avaliados.",
          durationMinutes: 30,
          priceType: "FIXED",
          priceValue: 120,
          bookingMode: "DIRECT",
          order: 1,
          customFields: [
            { label: "Observações", key: "observacoes", fieldType: "TEXTAREA", isRequired: false, order: 0 },
          ],
        },
      ],
    },
    {
      name: "Avaliações",
      order: 1,
      services: [
        {
          name: "Avaliação inicial",
          description: "Avaliação inicial detalhada para novos pacientes.",
          durationMinutes: 60,
          priceType: "FIXED",
          priceValue: 250,
          bookingMode: "REQUIRES_CONFIRMATION",
          order: 0,
          customFields: [
            { label: "Motivo da consulta", key: "motivo_consulta", fieldType: "TEXTAREA", isRequired: true, order: 0 },
            { label: "Possui encaminhamento?", key: "possui_encaminhamento", fieldType: "BOOLEAN", isRequired: false, order: 1 },
            { label: "Observações", key: "observacoes", fieldType: "TEXTAREA", isRequired: false, order: 2 },
          ],
        },
      ],
    },
    {
      name: "Retornos",
      order: 2,
      services: [
        {
          name: "Teleatendimento",
          description: "Atendimento remoto por videochamada ou telefone.",
          durationMinutes: 30,
          priceType: "FIXED",
          priceValue: 100,
          bookingMode: "REQUIRES_CONFIRMATION",
          order: 0,
          customFields: [
            { label: "Preferência de contato", key: "preferencia_contato", fieldType: "SELECT", isRequired: false, options: ["Videochamada", "Telefone", "WhatsApp"], order: 0 },
          ],
        },
      ],
    },
  ],
  availability: DEFAULT_AVAILABILITY,
};

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

export const SEGMENT_TEMPLATES: Record<
  string,
  SegmentTemplateDefinition
> = {
  mechanic,
  barbershop,
  manicure,
  beauty,
  technical_assistance: technicalAssistance,
  clinic_simple: clinicSimple,
};

export const SEGMENT_TEMPLATE_LIST: SegmentTemplateDefinition[] =
  Object.values(SEGMENT_TEMPLATES);

export function getTemplateByKey(
  key: string,
): SegmentTemplateDefinition | undefined {
  return SEGMENT_TEMPLATES[key];
}
