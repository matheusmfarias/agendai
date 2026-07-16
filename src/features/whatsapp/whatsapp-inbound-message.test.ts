import { describe, expect, it } from "vitest";

import {
  parseEvolutionInboundMessage,
  resolveEvolutionSenderPhone,
} from "@/features/whatsapp/whatsapp-inbound-message";

describe("Evolution inbound message parser", () => {
  it("resolve telefone pelo remoteJidAlt quando o remoteJid é LID", () => {
    expect(resolveEvolutionSenderPhone({
      remoteJid: "123456789@lid",
      remoteJidAlt: "5511987654321@s.whatsapp.net",
    })).toBe("11987654321");
  });

  it("remove identificador de dispositivo de um JID telefônico alternativo", () => {
    expect(resolveEvolutionSenderPhone({
      remoteJid: "123456789@lid",
      remoteJidAlt: "5511987654321:17@s.whatsapp.net",
    })).toBe("11987654321");
  });

  it("aceita conversation real com LID e JID telefônico alternativo", () => {
    expect(parseEvolutionInboundMessage({
      data: {
        key: {
          id: "message-lid",
          remoteJid: "123456789@lid",
          remoteJidAlt: "5511987654321@s.whatsapp.net",
          fromMe: false,
        },
        message: { conversation: "Olá" },
      },
    })).toEqual({
      accepted: true,
      messageId: "message-lid",
      senderPhone: "11987654321",
      text: "Olá",
    });
  });

  it("não trata LID sem JID telefônico alternativo como telefone", () => {
    expect(parseEvolutionInboundMessage({
      data: {
        key: { id: "message-lid", remoteJid: "123456789@lid", fromMe: false },
        message: { conversation: "Olá" },
      },
    })).toEqual({ accepted: false, reason: "invalid_phone" });
  });

  it("rejeita JID alternativo cujo identificador não seja telefônico", () => {
    expect(parseEvolutionInboundMessage({
      data: {
        key: {
          id: "message-invalid-jid",
          remoteJid: "123456789@lid",
          remoteJidAlt: "contato@s.whatsapp.net",
          fromMe: false,
        },
        message: { conversation: "Olá" },
      },
    })).toEqual({ accepted: false, reason: "invalid_phone" });
  });

  it.each([
    ["grupo", { id: "group", remoteJid: "120363@g.us", fromMe: false }, "group"],
    ["fromMe", { id: "own", remoteJid: "5511987654321@s.whatsapp.net", fromMe: true }, "from_me"],
  ])("continua ignorando %s", (_label, key, reason) => {
    expect(parseEvolutionInboundMessage({
      data: { key, message: { conversation: "Texto" } },
    })).toEqual({ accepted: false, reason });
  });

  it("mantém compatibilidade com remoteJid telefônico normal", () => {
    expect(parseEvolutionInboundMessage({
      data: {
        key: {
          id: "message-phone",
          remoteJid: "5511987654321@s.whatsapp.net",
          fromMe: false,
        },
        message: { extendedTextMessage: { text: "Continuar" } },
      },
    })).toEqual({
      accepted: true,
      messageId: "message-phone",
      senderPhone: "11987654321",
      text: "Continuar",
    });
  });

  it("preserva o identificador de uma resposta de botão", () => {
    expect(parseEvolutionInboundMessage({
      data: {
        key: {
          id: "message-button",
          remoteJid: "5511987654321@s.whatsapp.net",
          fromMe: false,
        },
        message: {
          buttonsResponseMessage: {
            selectedButtonId: "schedule",
            selectedDisplayText: "Agendar um horário",
          },
        },
      },
    })).toMatchObject({ accepted: true, text: "schedule" });
  });

  it("preserva o identificador de uma resposta de lista", () => {
    expect(parseEvolutionInboundMessage({
      data: {
        key: {
          id: "message-list",
          remoteJid: "5511987654321@s.whatsapp.net",
          fromMe: false,
        },
        message: {
          listResponseMessage: {
            title: "Opção exibida",
            singleSelectReply: { selectedRowId: "option-value" },
          },
        },
      },
    })).toMatchObject({ accepted: true, text: "option-value" });
  });

  it("normaliza o telefone de 10 dígitos do payload real para formato nacional", () => {
    expect(parseEvolutionInboundMessage({
      data: {
        key: {
          id: "message-real",
          remoteJid: "123456789@lid",
          remoteJidAlt: "555591884991@s.whatsapp.net",
          fromMe: false,
        },
        message: { conversation: "Olá" },
      },
    })).toEqual({
      accepted: true,
      messageId: "message-real",
      senderPhone: "5591884991",
      text: "Olá",
    });
  });
});
