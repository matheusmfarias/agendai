import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { typebotAppointmentBodySchema } from "@/features/typebot/typebot-appointment-schema";

type BlueprintBlock = {
  id: string;
  type: string;
  outgoingEdgeId?: string;
  items?: {
    id: string;
    content?: string | Record<string, unknown>;
    outgoingEdgeId?: string;
  }[];
  options?: {
    isCustomBody?: boolean;
    variableId?: string;
    expressionToEvaluate?: string;
    isCode?: boolean;
    responseVariableMapping?: { variableId?: string; bodyPath?: string }[];
    webhook?: {
      url?: string;
      headers?: { key?: string; value?: string }[];
      body?: string;
    };
  };
  content?: { richText?: { children?: { text?: string }[] }[] };
};

type Blueprint = {
  version: string;
  events: { id: string }[];
  groups: { id: string; blocks: BlueprintBlock[] }[];
  edges: {
    id: string;
    from: { eventId?: string; blockId?: string; itemId?: string };
    to: { groupId: string; blockId?: string };
  }[];
  variables: { id: string; name: string; value?: string }[];
};

function loadBlueprint() {
  const path = join(
    process.cwd(),
    "docs",
    "typebot",
    "agendai-mvp.typebot.json",
  );
  return JSON.parse(readFileSync(path, "utf8")) as Blueprint;
}

describe("Typebot production importable blueprint", () => {
  it("has a connected Typebot v6 graph", () => {
    const blueprint = loadBlueprint();
    const eventIds = new Set(blueprint.events.map((event) => event.id));
    const groupIds = new Set(blueprint.groups.map((group) => group.id));
    const blockIds = new Set(
      blueprint.groups.flatMap((group) =>
        group.blocks.map((block) => block.id),
      ),
    );
    const edgeIds = new Set(blueprint.edges.map((edge) => edge.id));

    expect(blueprint.version).toBe("6.1");
    expect(blueprint.groups.length).toBeGreaterThanOrEqual(30);
    for (const edge of blueprint.edges) {
      expect(groupIds.has(edge.to.groupId)).toBe(true);
      if (edge.to.blockId) expect(blockIds.has(edge.to.blockId)).toBe(true);
      if (edge.from.eventId) expect(eventIds.has(edge.from.eventId)).toBe(true);
      if (edge.from.blockId) expect(blockIds.has(edge.from.blockId)).toBe(true);
    }
    for (const block of blueprint.groups.flatMap((group) => group.blocks)) {
      const outgoingEdgeId = block.outgoingEdgeId;
      if (outgoingEdgeId) expect(edgeIds.has(outgoingEdgeId)).toBe(true);
      for (const item of block.items ?? []) {
        if (item.outgoingEdgeId) {
          expect(edgeIds.has(item.outgoingEdgeId)).toBe(true);
        }
      }
    }
  });

  it("keeps tenant configuration empty and all API calls parameterized", () => {
    const blueprint = loadBlueprint();
    const serialized = JSON.stringify(blueprint);
    const channelPhone = blueprint.variables.find(
      (variable) => variable.name === "phone",
    );
    const phoneInput = blueprint.groups
      .flatMap((group) => group.blocks)
      .find((block) => block.id === "b_phone_input");

    expect(channelPhone?.id).toBe("v_phone");
    expect(phoneInput?.options?.variableId).toBe("v_phone");
    expect(serialized).not.toContain("customerPhone");
    const configuration = Object.fromEntries(
      blueprint.variables
        .filter((variable) =>
          ["apiBaseUrl", "tenantSlug", "typebotApiKey"].includes(
            variable.name,
          ),
        )
        .map((variable) => [variable.name, variable.value]),
    );
    const httpBlocks = blueprint.groups
      .flatMap((group) => group.blocks)
      .filter((block) => block.type === "Webhook");
    const configurationVariableIds = new Set(
      blueprint.variables
        .filter((variable) =>
          ["apiBaseUrl", "tenantSlug", "typebotApiKey"].includes(variable.name),
        )
        .map((variable) => variable.id),
    );
    const configurationSetBlocks = blueprint.groups
      .flatMap((group) => group.blocks)
      .filter(
        (block) =>
          block.type === "Set variable" &&
          Boolean(block.options?.variableId) &&
          configurationVariableIds.has(block.options?.variableId ?? ""),
      );

    expect(configuration).toEqual({
      apiBaseUrl: "",
      tenantSlug: "",
      typebotApiKey: "",
    });
    expect(serialized).not.toMatch(/https?:\/\//);
    expect(serialized).not.toContain("agz_tb_");
    expect(configurationSetBlocks).toHaveLength(0);
    expect(httpBlocks).toHaveLength(11);
    for (const block of httpBlocks) {
      expect(block.options?.webhook?.url).toContain("{{apiBaseUrl}}");
      expect(block.options?.webhook?.url).toContain("{{tenantSlug}}");
      expect(block.options?.webhook?.headers).toContainEqual(
        expect.objectContaining({
          key: "x-typebot-api-key",
          value: "{{typebotApiKey}}",
        }),
      );
    }
  });

  it("contains the required endpoints and final status messages", () => {
    const blueprint = loadBlueprint();
    const blocks = blueprint.groups.flatMap((group) => group.blocks);
    const serialized = JSON.stringify(blueprint);
    const visibleText = blocks
      .flatMap((block) => block.content?.richText ?? [])
      .flatMap((paragraph) => paragraph.children ?? [])
      .map((child) => child.text ?? "")
      .join("\n");

    expect(serialized).toContain("/business");
    expect(serialized).toContain("/services");
    expect(serialized).toContain(
      "/available-dates?startDate={{nextStartDate}}&days=14",
    );
    expect(serialized).toContain("/available-periods?date={{selectedDate}}");
    expect(serialized).toContain(
      "/services/{{selectedServiceId}}/custom-fields",
    );
    expect(serialized).toContain(
      "/slots?date={{selectedDate}}&days=1&period={{selectedPeriod}}",
    );
    expect(serialized).toContain("/customers/identify");
    expect(serialized).toContain("/appointments");
    expect(visibleText).toContain("Agendamento confirmado! ✅");
    expect(visibleText).toContain("Solicitação enviada! ✅");
    expect(visibleText).toContain(
      "O estabelecimento ainda precisa confirmar o horário. Avisaremos você por aqui assim que houver uma resposta.",
    );
    expect(visibleText).not.toContain("{{apiErrorCode}}");
    expect(visibleText).not.toContain("{{httpStatus}}");
  });

  it("uses the WhatsApp phone first and confirms an unequivocal customer", () => {
    const blueprint = loadBlueprint();
    const serialized = JSON.stringify(blueprint);

    expect(serialized).toContain('\\"action\\": \\"LOOKUP\\"');
    expect(serialized).toContain('\\"action\\": \\"CONFIRM\\"');
    expect(serialized).toContain('\\"action\\": \\"CREATE\\"');
    expect(serialized).toContain(
      "Encontrei um cadastro em nome de {{matchedCustomerName}}.",
    );
    expect(serialized).toContain("Posso usar esses dados?");
    expect(serialized).toContain("Sim, continuar");
    expect(serialized).toContain("Não sou eu");
    expect(serialized).toContain("Informe seu telefone com DDD.");
    expect(serialized).toContain('\\"phone\\": \\"{{phone}}\\"');
  });

  it("selects a backend-provided period", () => {
    const blueprint = loadBlueprint();
    const serialized = JSON.stringify(blueprint);

    expect(serialized).toContain("data.periods.flatMap(item => item.value)");
  });

  it("starts with three intents and uses terminal handoff and ending copy", () => {
    const blueprint = loadBlueprint();
    const serialized = JSON.stringify(blueprint);
    const handoff = blueprint.groups.find((group) => group.id === "g_handoff");
    const handoffBlockIds = new Set(
      handoff?.blocks.map((block) => block.id) ?? [],
    );

    expect(serialized).toContain("Olá! 👋");
    expect(serialized).toContain(
      "Como posso ajudar você na {{tenantName}}?",
    );
    expect(serialized).toContain("Agendar um horário");
    expect(serialized).toContain("Falar com atendente");
    expect(serialized).toContain("Encerrar atendimento");
    expect(serialized).toContain("/categories");
    expect(serialized).toContain("/services?categoryId={{selectedCategoryId}}");
    expect(serialized).toContain(
      "Certo! Vou deixar a conversa com o estabelecimento.",
    );
    expect(serialized).toContain(
      "Assim que possível, alguém continuará o atendimento por aqui.",
    );
    expect(serialized).toContain(
      "Atendimento encerrado.",
    );
    expect(serialized).toContain(
      "Quando precisar, é só mandar uma nova mensagem por aqui.",
    );
    expect(JSON.stringify(handoff)).not.toContain("tenantWhatsappUrl");
    expect(
      blueprint.edges.some(
        (edge) =>
          edge.from.blockId && handoffBlockIds.has(edge.from.blockId),
      ),
    ).toBe(false);
  });

  it("omits counts, skips a single period and resets dependent selections", () => {
    const blueprint = loadBlueprint();
    const serialized = JSON.stringify(blueprint);

    expect(serialized).toContain("data.dates.flatMap(item => item.label)");
    expect(serialized).toContain("data.periods.flatMap(item => item.label)");
    expect(serialized).not.toContain("item.label + ' · ' + item.slotCount");
    expect(serialized).toContain("i_periods_single");
    expect(serialized).toContain("e_periods_single");
    expect(serialized).toContain("b_reset_appointment_for_service");
    expect(serialized).toContain("b_reset_period_for_date");
    expect(serialized).not.toContain("Voltar aos turnos");
    expect(serialized).not.toContain("Voltar às datas");
    expect(serialized).not.toContain("Informar telefone");
    expect(serialized).not.toContain("Voltar ao horário");
  });

  it("offers at most one standardized back option per interactive step", () => {
    const blueprint = loadBlueprint();
    const choiceBlocks = blueprint.groups
      .flatMap((group) => group.blocks)
      .filter((block) => block.type === "choice input");
    const dynamicMappings = blueprint.groups
      .flatMap((group) => group.blocks)
      .flatMap((block) => block.options?.responseVariableMapping ?? [])
      .map((mapping) => mapping.bodyPath ?? "")
      .filter((bodyPath) => bodyPath.includes("Voltar"));

    for (const block of choiceBlocks) {
      expect(
        (block.items ?? []).filter((item) => item.content === "Voltar").length,
      ).toBeLessThanOrEqual(1);
    }
    for (const bodyPath of dynamicMappings) {
      expect(bodyPath.match(/Voltar/g) ?? []).toHaveLength(1);
      expect(bodyPath).not.toMatch(/Voltar (aos|às|ao)/);
    }
  });

  it("routes Voltar to the immediately preceding visible step", () => {
    const blueprint = loadBlueprint();
    const destination = (edgeId: string) =>
      blueprint.edges.find((edge) => edge.id === edgeId)?.to.groupId;

    expect(destination("e_category_back")).toBe("g_intent");
    expect(destination("e_service_back")).toBe("g_choose_category");
    expect(destination("e_date_back")).toBe("g_choose_service");
    expect(destination("e_period_back")).toBe("g_choose_date");
    expect(destination("e_slot_back_period")).toBe("g_choose_period");
    expect(destination("e_customer_match_back")).toBe(
      "g_identification_back",
    );
    expect(destination("e_customer_new_back")).toBe("g_customer_match");
    expect(destination("e_summary_back")).toBe("g_customer_entry");
  });

  it("returns slots to dates when the period choice was skipped", () => {
    const blueprint = loadBlueprint();
    const blocks = blueprint.groups.flatMap((group) => group.blocks);
    const slotNavigation = blocks.find(
      (block) => block.id === "b_slot_navigation",
    );
    const serializedNavigation = JSON.stringify(slotNavigation);

    expect(serializedNavigation).toContain("c_slot_back_period_count");
    expect(serializedNavigation).toContain('"comparisonOperator":"Greater than"');
    expect(serializedNavigation).toContain("c_slot_back_date_count");
    expect(serializedNavigation).toContain('"comparisonOperator":"Equal to"');
    expect(
      blueprint.edges.find((edge) => edge.id === "e_slot_back_date")?.to
        .groupId,
    ).toBe("g_choose_date");
  });

  it("opens the phone input directly only when the channel phone is empty", () => {
    const blueprint = loadBlueprint();
    const serialized = JSON.stringify(blueprint);
    const destination = (edgeId: string) =>
      blueprint.edges.find((edge) => edge.id === edgeId)?.to.groupId;
    const phoneInput = blueprint.groups
      .flatMap((group) => group.blocks)
      .find((block) => block.id === "b_phone_input");

    expect(serialized).not.toContain("Informar telefone");
    expect(phoneInput?.type).toBe("phone number input");
    expect(destination("e_customer_phone_fallback")).toBe("g_customer");
    expect(destination("e_customer_phone_lookup")).toBe("g_identify");
  });

  it("never clears phone while navigating services or custom fields", () => {
    const blueprint = loadBlueprint();
    const phoneWriters = blueprint.groups
      .flatMap((group) => group.blocks)
      .filter((block) => block.options?.variableId === "v_phone");
    const identify = blueprint.groups
      .flatMap((group) => group.blocks)
      .find((block) => block.id === "b_identify");

    expect(phoneWriters.map((block) => block.id)).toEqual(["b_phone_input"]);
    expect(identify?.options?.webhook?.body).toContain('"phone": "{{phone}}"');
    expect(JSON.stringify(blueprint)).not.toContain("customerPhone");
  });

  it("maps lookup status and sends NOT_FOUND directly to the full name input", () => {
    const blueprint = loadBlueprint();
    const blocks = blueprint.groups.flatMap((group) => group.blocks);
    const identify = blocks.find((block) => block.id === "b_identify");
    const identifyCondition = blocks.find(
      (block) => block.id === "b_identify_condition",
    );
    const newCustomerPrompt = blocks.find(
      (block) => block.id === "b_new_name_prompt",
    );
    const lookupStatusMapping = identify?.options?.responseVariableMapping?.find(
      (mapping) => mapping.variableId === "v_customerLookupStatus",
    );
    const lookupStatusVariable = blueprint.variables.find(
      (variable) => variable.id === "v_customerLookupStatus",
    );
    const newCustomerEdge = blueprint.edges.find(
      (edge) => edge.id === "e_customer_new_required",
    );

    expect(lookupStatusVariable?.name).toBe("customerLookupStatus");
    expect(lookupStatusMapping?.bodyPath).toBe("data.lookup.status");
    expect(JSON.stringify(identifyCondition)).toContain("NOT_FOUND");
    expect(newCustomerEdge?.to.groupId).toBe("g_customer_new");
    expect(JSON.stringify(newCustomerPrompt)).toContain(
      "Ainda não encontrei seus dados por aqui.",
    );
    expect(JSON.stringify(newCustomerPrompt)).toContain(
      "Qual é o seu nome completo?",
    );
  });

  it("asks for the corrected name directly after Não sou eu", () => {
    const blueprint = loadBlueprint();
    const serialized = JSON.stringify(blueprint);
    const group = blueprint.groups.find(
      (item) => item.id === "g_customer_rejected_name",
    );
    const input = group?.blocks.find(
      (block) => block.id === "b_customer_rejected_name_input",
    );
    const condition = group?.blocks.find(
      (block) => block.id === "b_customer_rejected_name_condition",
    );
    const destination = (edgeId: string) => blueprint.edges.find(
      (edge) => edge.id === edgeId,
    )?.to;

    expect(blueprint.groups.some(
      (item) => item.id === "g_customer_new_choice",
    )).toBe(false);
    expect(serialized).not.toContain("Informar meu nome");
    expect(serialized).toContain("Qual é o seu nome completo?");
    expect(serialized).toContain(
      "Digite sua resposta ou ‘Voltar’ para usar o cadastro encontrado.",
    );
    expect(input?.type).toBe("text input");
    expect(input?.options?.variableId).toBe("v_customerName");
    expect(JSON.stringify(condition)).toContain('"value":"Voltar"');
    expect(destination("e_customer_new")?.groupId).toBe(
      "g_customer_rejected_name",
    );
    expect(destination("e_customer_new_continue")).toMatchObject({
      groupId: "g_customer_new",
      blockId: "b_customer_create",
    });
    expect(destination("e_customer_new_back")?.groupId).toBe(
      "g_customer_match",
    );
  });

  it("keeps response mappings aligned with Typebot's statusCode and data contract", () => {
    const blueprint = loadBlueprint();
    const blocks = blueprint.groups.flatMap((group) => group.blocks);
    const mappings = (blockId: string): Record<string, string | undefined> => Object.fromEntries(
      (blocks.find((block) => block.id === blockId)?.options
        ?.responseVariableMapping ?? []).map((mapping) => [
        mapping.variableId,
        mapping.bodyPath,
      ]),
    );

    expect(mappings("b_identify")).toMatchObject({
      v_httpStatus: "statusCode",
      v_customerLookupStatus: "data.lookup.status",
      v_matchedCustomerName: "data.lookup.customerName",
      v_sessionId: "data.session.id",
    });
    expect(mappings("b_customer_confirm")).toMatchObject({
      v_httpStatus: "statusCode",
      v_customerId: "data.customer.id",
      v_customerName: "data.customer.name",
    });
    expect(mappings("b_customer_create")).toMatchObject({
      v_httpStatus: "statusCode",
      v_customerId: "data.customer.id",
      v_customerName: "data.customer.name",
    });
    expect(mappings("b_create")).toMatchObject({
      v_httpStatus: "statusCode",
      v_appointmentId: "data.appointment.id",
      v_appointmentStatus: "data.appointment.status",
    });

    for (const blockId of [
      "b_business",
      "b_categories",
      "b_services",
      "b_available_dates",
      "b_periods",
      "b_slots",
      "b_custom_fields",
    ]) {
      const values = Object.values(mappings(blockId));
      expect(values).toContain("statusCode");
      expect(
        values.filter((value) => value !== "statusCode").every(
          (value) => typeof value === "string" && value.startsWith("data."),
        ),
      ).toBe(true);
    }
  });

  it("uses concise customer-facing copy and time-only slot labels", () => {
    const blueprint = loadBlueprint();
    const serialized = JSON.stringify(blueprint);

    for (const text of [
      "Qual tipo de serviço você procura?",
      "Agora escolha o serviço:",
      "Qual data fica melhor para você?",
      "Qual turno você prefere?",
      "Qual horário fica melhor?",
      "Confira os dados do seu agendamento:",
      "Está tudo certo?",
    ]) {
      expect(serialized).toContain(text);
    }
    expect(serialized).toContain(
      "(item.required ? 'Digite sua resposta ou ' : 'Digite sua resposta, envie “Pular” para continuar ou ') + '“Voltar” para retornar.'",
    );
    expect(serialized).toContain("label.charAt(0).toUpperCase() + label.slice(1) + '?'");
    expect(serialized).toContain(
      "data.slots.flatMap(item => item.label.slice(-5)).concat(['Voltar'])",
    );
    expect(serialized).not.toMatch(/neste mvp/i);
    expect(serialized).not.toContain("Obrigatória");
    expect(serialized).not.toContain(
      "Para voltar, responda Voltar. Em perguntas opcionais",
    );
  });

  it("formats the summary date as dd/MM/yyyy without parsing a Date", () => {
    const blueprint = loadBlueprint();
    const blocks = blueprint.groups.flatMap((group) => group.blocks);
    const formatter = blocks.find(
      (block) => block.id === "b_format_summary_date",
    );
    const summary = blocks.find((block) => block.id === "b_summary");

    expect(formatter?.options?.variableId).toBe("v_selectedDateFormatted");
    expect(formatter?.options?.expressionToEvaluate).toContain(
      "parts[2] + '/' + parts[1] + '/' + parts[0]",
    );
    expect(formatter?.options?.expressionToEvaluate).not.toContain("new Date");
    expect(JSON.stringify(summary)).toContain(
      "Data: {{selectedDateFormatted}}",
    );
    expect(JSON.stringify(summary)).not.toContain("Data: {{selectedDate}}");
  });

  it("shows customer notes in the summary only when they are present", () => {
    const blueprint = loadBlueprint();
    const blocks = blueprint.groups.flatMap((group) => group.blocks);
    const formatter = blocks.find(
      (block) => block.id === "b_format_summary_notes",
    );
    const summary = blocks.find((block) => block.id === "b_summary");

    expect(formatter?.options?.variableId).toBe("v_customerNotesSummary");
    expect(formatter?.options?.expressionToEvaluate).toContain(
      "return value ? 'Observação: ' + value : ''",
    );
    expect(JSON.stringify(summary)).toContain("{{customerNotesSummary}}");
  });

  it("uses only backend-provided dates and paginates with nextStartDate", () => {
    const blueprint = loadBlueprint();
    const blocks = blueprint.groups.flatMap((group) => group.blocks);
    const serialized = JSON.stringify(blueprint);
    const availableDates = blocks.find(
      (block) => block.id === "b_available_dates",
    );
    const dateChoice = blocks.find((block) => block.id === "b_date_choice");
    const availableDateUrls = blocks
      .map((block) => block.options?.webhook?.url)
      .filter(
        (url): url is string => url?.includes("/available-dates") ?? false,
      );
    const nextStartDateMapping = availableDates?.options
      ?.responseVariableMapping?.find(
        (mapping) => mapping.variableId === "v_nextStartDate",
      );
    const labelsMapping = availableDates?.options?.responseVariableMapping?.find(
      (mapping) => mapping.variableId === "v_availableDateLabels",
    );
    const moreDatesEdge = blueprint.edges.find(
      (edge) => edge.id === "e_date_more",
    );

    expect(availableDateUrls).toEqual([
      expect.stringContaining("startDate={{nextStartDate}}"),
    ]);
    expect(availableDateUrls.every((url) => !url.includes("v_nextStartDate"))).toBe(
      true,
    );
    expect(nextStartDateMapping?.bodyPath).toBe("data.nextStartDate");
    expect(labelsMapping?.bodyPath).toContain(
      "data.nextStartDate ? ['Ver mais datas'] : []",
    );
    expect(moreDatesEdge?.to.groupId).toBe("g_available_dates");
    expect(serialized).toContain("data.dates.flatMap(item => item.date)");
    expect(serialized).toContain("data.nextStartDate");
    expect(serialized).toContain("Ver mais datas");
    expect(serialized).toContain('"targetListVariableId":"v_availableDateValues"');
    expect(dateChoice?.type).toBe("choice input");
  });

  it("guards duplicate confirmation before the appointment POST", () => {
    const blueprint = loadBlueprint();
    const blocks = blueprint.groups.flatMap((group) => group.blocks);
    const guard = blocks.find((block) => block.id === "b_create_guard");
    const create = blocks.find((block) => block.id === "b_create");
    const identify = blocks.find((block) => block.id === "b_identify");

    expect(guard?.type).toBe("Condition");
    expect(identify?.options?.isCustomBody).toBe(true);
    expect(create?.options?.isCustomBody).toBe(true);
    const buildBody = blocks.find(
      (block) => block.id === "b_build_appointment_request_body",
    );

    expect(buildBody?.type).toBe("Set variable");
    expect(buildBody?.options?.variableId).toBe("v_appointmentRequestBody");
    expect(buildBody?.options?.expressionToEvaluate).toContain(
      "const customValues = JSON.parse({{customValuesJson}} || '[]')",
    );
    expect(buildBody?.options?.expressionToEvaluate).toContain(
      "return JSON.stringify({ sessionId:",
    );
    expect(buildBody?.options?.expressionToEvaluate).toContain(
      "customerNotes",
    );
    expect(create?.options?.webhook?.body).toBe(
      "{{appointmentRequestBody}}",
    );
  });

  it("builds one custom value as an array accepted by the appointment schema", () => {
    const ids = {
      sessionId: "00000000-0000-4000-8000-000000000001",
      customerId: "00000000-0000-4000-8000-000000000002",
      serviceId: "00000000-0000-4000-8000-000000000003",
      textField: "00000000-0000-4000-8000-000000000004",
    };
    const customValues = [
      { customFieldId: ids.textField, value: "Onix 2020" },
    ];
    const serializedBody = JSON.stringify({
      sessionId: ids.sessionId,
      customerId: ids.customerId,
      serviceId: ids.serviceId,
      startsAt: "2026-07-16T12:00:00.000Z",
      customerNotes: "Deixar o veículo no pátio.",
      customValues,
    });
    const payload: unknown = JSON.parse(serializedBody);

    expect(typebotAppointmentBodySchema.safeParse(payload).success).toBe(true);
    expect(payload).toMatchObject({
      customerNotes: "Deixar o veículo no pátio.",
      customValues,
    });
    expect(Array.isArray((payload as { customValues: unknown }).customValues)).toBe(
      true,
    );
  });

  it("preserves multiple typed answers and safely escapes quotes", () => {
    const ids = {
      sessionId: "00000000-0000-4000-8000-000000000001",
      customerId: "00000000-0000-4000-8000-000000000002",
      serviceId: "00000000-0000-4000-8000-000000000003",
      textField: "00000000-0000-4000-8000-000000000004",
      numberField: "00000000-0000-4000-8000-000000000005",
      booleanField: "00000000-0000-4000-8000-000000000006",
    };
    const customValues = [
      {
        customFieldId: ids.textField,
        value: 'Onix "Premier" 2020',
      },
      { customFieldId: ids.numberField, value: "2" },
      { customFieldId: ids.booleanField, value: "Sim" },
    ];
    const serializedBody = JSON.stringify({
      sessionId: ids.sessionId,
      customerId: ids.customerId,
      serviceId: ids.serviceId,
      startsAt: "2026-07-16T12:00:00.000Z",
      customValues,
    });
    const payload: unknown = JSON.parse(serializedBody);
    const parsed = typebotAppointmentBodySchema.safeParse(payload);

    expect(parsed.success).toBe(true);
    expect(payload).toMatchObject({ customValues });
    expect(Array.isArray((payload as { customValues: unknown }).customValues)).toBe(
      true,
    );
    expect(serializedBody).toContain('Onix \\"Premier\\" 2020');
    expect(serializedBody).not.toContain('\\\\\"customFieldId\\\\\"');
  });

  it("collects configured service questions before customer identification", () => {
    const blueprint = loadBlueprint();
    const blocks = blueprint.groups.flatMap((group) => group.blocks);
    const serialized = JSON.stringify(blueprint);
    const destination = (edgeId: string) =>
      blueprint.edges.find((edge) => edge.id === edgeId)?.to.groupId;

    expect(destination("e_slot_customer_entry")).toBe("g_custom_fields");
    expect(destination("e_custom_fields_empty")).toBe("g_customer_notes");
    expect(destination("e_custom_fields_complete")).toBe("g_customer_notes");
    expect(destination("e_custom_skip_complete")).toBe("g_customer_notes");
    expect(destination("e_custom_fields_available")).toBe(
      "g_custom_field_prepare",
    );
    expect(
      blocks.find((block) => block.id === "b_custom_fields")?.options?.webhook
        ?.url,
    ).toContain("/custom-fields");
    expect(serialized).toContain("data.fields.map(item => item.id)");
    expect(serialized).toContain("data.fields.map(item => item.type)");
    expect(serialized).toContain("data.fields.length");
  });

  it("collects an optional customer note before identification", () => {
    const blueprint = loadBlueprint();
    const blocks = blueprint.groups.flatMap((group) => group.blocks);
    const serialized = JSON.stringify(blueprint);
    const destination = (edgeId: string) => blueprint.edges.find(
      (edge) => edge.id === edgeId,
    )?.to;
    const notesInput = blocks.find(
      (block) => block.id === "b_customer_notes_input",
    );

    expect(serialized).toContain("Deseja adicionar alguma observação?");
    expect(serialized).toContain(
      "Digite sua resposta, envie “Pular” para continuar ou “Voltar” para retornar.",
    );
    expect(notesInput?.type).toBe("text input");
    expect(notesInput?.options?.variableId).toBe("v_customerNotes");
    expect(destination("e_customer_notes_continue")?.groupId).toBe(
      "g_customer_entry",
    );
    expect(destination("e_customer_notes_skip")?.groupId).toBe(
      "g_customer_notes_skip",
    );
    expect(destination("e_customer_notes_back_custom_field")?.groupId).toBe(
      "g_custom_field_last",
    );
    expect(destination("e_customer_notes_back_slot")?.groupId).toBe(
      "g_choose_slot",
    );
  });

  it("branches through every custom field type supported by the public form", () => {
    const blueprint = loadBlueprint();
    const blocks = blueprint.groups.flatMap((group) => group.blocks);
    const serialized = JSON.stringify(blueprint);
    const destination = (edgeId: string) =>
      blueprint.edges.find((edge) => edge.id === edgeId)?.to.groupId;

    expect(serialized).toContain('"value":"TEXT"');
    expect(serialized).toContain('"value":"TEXTAREA"');
    expect(serialized).toContain('"value":"NUMBER"');
    expect(serialized).toContain('"value":"DATE"');
    expect(serialized).toContain('"value":"BOOLEAN"');
    expect(serialized).toContain('"value":"SELECT"');
    expect(blocks.find((block) => block.id === "b_custom_input_text")?.type).toBe(
      "text input",
    );
    expect(
      blocks.find((block) => block.id === "b_custom_input_textarea")?.type,
    ).toBe("text input");
    expect(
      blocks.find((block) => block.id === "b_custom_input_number")?.type,
    ).toBe("number input");
    expect(
      blocks.find((block) => block.id === "b_custom_input_date")?.type,
    ).toBe("date input");
    expect(serialized).toContain("v_currentCustomFieldOptions");
    expect(destination("e_custom_field_prompt_type")).toBe("g_custom_field_type");
    for (const edgeId of [
      "e_custom_answer_save",
      "e_custom_answer_save_textarea",
      "e_custom_answer_save_number",
      "e_custom_answer_save_date",
      "e_custom_answer_save_boolean",
      "e_custom_answer_save_select",
    ]) {
      expect(destination(edgeId)).toBe("g_custom_answer_route");
    }
  });

  it("supports optional skip, previous question and service answer reset", () => {
    const blueprint = loadBlueprint();
    const serialized = JSON.stringify(blueprint);
    const destination = (edgeId: string) =>
      blueprint.edges.find((edge) => edge.id === edgeId)?.to.groupId;

    expect(serialized).toContain("i_custom_answer_skip");
    expect(serialized).toContain("c_custom_answer_skip_optional");
    expect(serialized).toContain("b_custom_value_skip");
    expect(destination("e_custom_answer_route_skip")).toBe(
      "g_custom_field_skip",
    );
    expect(destination("e_custom_answer_route_back")).toBe(
      "g_custom_field_back",
    );
    expect(serialized).toContain("b_custom_answer_normalize_navigation");
    expect(serialized).toContain("-9007199254740991");
    expect(serialized).toContain("1000-01-01");
    expect(destination("e_custom_answer_required_retry")).toBe(
      "g_custom_field_prepare",
    );
    expect(destination("e_custom_back_previous")).toBe(
      "g_custom_field_previous",
    );
    expect(destination("e_custom_back_slot")).toBe("g_choose_slot");
    expect(serialized).toContain("b_reset_custom_values_for_service");
    expect(serialized).toContain("b_reset_custom_summary_for_service");
  });

  it("collects custom fields directly without an intermediate answer option", () => {
    const blueprint = loadBlueprint();
    const blocks = blueprint.groups.flatMap((group) => group.blocks);
    const serialized = JSON.stringify(blueprint);
    const booleanInput = blocks.find((block) => block.id === "b_custom_input_boolean");
    const selectInput = blocks.find((block) => block.id === "b_custom_input_select");
    const optionBuilder = blocks.find(
      (block) => block.id === "b_current_custom_field_options",
    );

    expect(serialized).not.toContain('"content":"Responder"');
    expect(blocks.some((block) => block.id === "b_custom_field_prompt_choice")).toBe(false);
    expect(booleanInput?.items?.map((item) => item.content)).toEqual([
      "Sim",
      "Não",
      "Pular",
      "Voltar",
    ]);
    expect(selectInput?.options?.variableId).toBe("v_currentCustomFieldAnswer");
    expect(optionBuilder?.options?.expressionToEvaluate).toContain(
      "options.concat(String({{currentCustomFieldRequired}}) === 'false' ? ['Pular'] : []).concat(['Voltar'])",
    );
  });

  it("routes Modelo do carro = Onix 2020 through save before appointment creation", () => {
    const blueprint = loadBlueprint();
    const blocks = blueprint.groups.flatMap((group) => group.blocks);
    const destination = (edgeId: string) =>
      blueprint.edges.find((edge) => edge.id === edgeId)?.to.groupId;
    const save = blocks.find((block) => block.id === "b_custom_value_save");

    expect(destination("e_custom_answer_route_save")).toBe("g_custom_field_save");
    expect(save?.options?.expressionToEvaluate).toContain(
      "value: String({{currentCustomFieldAnswer}})",
    );
    const values = [{ customFieldId: crypto.randomUUID(), value: "Onix 2020" }];
    expect(typebotAppointmentBodySchema.safeParse({
      sessionId: crypto.randomUUID(),
      customerId: crypto.randomUUID(),
      serviceId: crypto.randomUUID(),
      startsAt: "2026-07-16T12:00:00.000Z",
      customValues: values,
    }).success).toBe(true);
  });

  it("renders only answered custom fields in the summary", () => {
    const blueprint = loadBlueprint();
    const serialized = JSON.stringify(blueprint);

    expect(serialized).toContain("Dados adicionais:\\\\n");
    expect(serialized).toContain("String(answer.value).trim()");
    expect(serialized).toContain("{{customValuesSummarySection}}");
  });

  it("mantém a mensagem de repetição do menu inicial em português", () => {
    const blueprint = loadBlueprint();
    const intent = blueprint.groups
      .flatMap((group) => group.blocks)
      .find((block) => block.id === "b_intent_choice");
    const serialized = JSON.stringify(blueprint);

    expect(JSON.stringify(intent)).toContain(
      "Opção inválida. Escolha uma das opções disponíveis.",
    );
    expect(serialized).not.toContain("Invalid message. Please, try again.");
    expect(serialized).not.toContain("This field is required.");
    expect(serialized).not.toContain("Please enter a valid value.");
  });
});
