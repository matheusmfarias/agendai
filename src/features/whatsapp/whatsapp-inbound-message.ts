import { normalizeBrazilianCustomerPhone } from "@/features/booking-core/phone";

type EvolutionInboundData = {
  key?: {
    id: string;
    remoteJid?: string;
    remoteJidAlt?: string;
    fromMe?: boolean;
  };
  message?: Record<string, unknown>;
};

export type EvolutionInboundMessage =
  | { accepted: false; reason: "from_me" | "group" | "unsupported" | "invalid_phone" }
  | { accepted: true; messageId: string; senderPhone: string; text: string };

type EvolutionSenderKey = NonNullable<EvolutionInboundData["key"]>;

const PHONE_JID_SUFFIX = "@s.whatsapp.net";
const LID_JID_SUFFIX = "@lid";

function phoneFromJid(value: string | undefined) {
  if (!value?.toLowerCase().endsWith(PHONE_JID_SUFFIX)) return null;
  const localPart = value.slice(0, -PHONE_JID_SUFFIX.length);
  const [phonePart] = localPart.split(":", 1);
  if (!phonePart || !/^\d+$/.test(phonePart)) return null;
  return normalizeBrazilianCustomerPhone(phonePart);
}

export function resolveEvolutionSenderPhone(
  key: Pick<EvolutionSenderKey, "remoteJid" | "remoteJidAlt">,
  sender?: string,
) {
  if (key.remoteJid?.toLowerCase().endsWith(PHONE_JID_SUFFIX)) {
    return phoneFromJid(key.remoteJid);
  }
  if (key.remoteJid?.toLowerCase().endsWith(LID_JID_SUFFIX)) {
    return phoneFromJid(key.remoteJidAlt);
  }
  return phoneFromJid(key.remoteJidAlt) ?? phoneFromJid(sender);
}

export function parseEvolutionOwnMessage(input: {
  data: EvolutionInboundData | undefined;
  sender?: string;
}) {
  const key = input.data?.key;
  if (!key?.fromMe || !key.id) return null;
  if (key.remoteJid?.endsWith("@g.us")) return null;
  const recipientPhone = resolveEvolutionSenderPhone(key, input.sender);
  if (!recipientPhone) return null;
  return { messageId: key.id, recipientPhone };
}

function nestedText(value: unknown, keys: string[]) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return "";
  const record = value as Record<string, unknown>;
  for (const key of keys) {
    if (typeof record[key] === "string" && record[key].trim()) {
      return record[key].trim();
    }
  }
  return "";
}

function extractText(message: Record<string, unknown> | undefined) {
  if (!message) return "";
  if (typeof message.conversation === "string") return message.conversation.trim();
  return (
    nestedText(message.extendedTextMessage, ["text"]) ||
    nestedText(message.buttonsResponseMessage, ["selectedButtonId", "selectedDisplayText"]) ||
    nestedText(message.templateButtonReplyMessage, ["selectedId", "selectedDisplayText"]) ||
    nestedText(
      message.listResponseMessage && typeof message.listResponseMessage === "object"
        ? (message.listResponseMessage as Record<string, unknown>).singleSelectReply
        : undefined,
      ["selectedRowId", "title"],
    ) ||
    nestedText(message.listResponseMessage, ["title", "description"])
  );
}

export function parseEvolutionInboundMessage(input: {
  data: EvolutionInboundData | undefined;
  sender?: string;
}): EvolutionInboundMessage {
  const key = input.data?.key;
  if (!key) return { accepted: false, reason: "unsupported" };
  if (key.fromMe) return { accepted: false, reason: "from_me" };
  if (key.remoteJid?.endsWith("@g.us")) {
    return { accepted: false, reason: "group" };
  }
  const phone = resolveEvolutionSenderPhone(key, input.sender);
  if (!phone) return { accepted: false, reason: "invalid_phone" };
  const text = extractText(input.data?.message);
  if (!text) return { accepted: false, reason: "unsupported" };
  return { accepted: true, messageId: key.id, senderPhone: phone, text };
}
