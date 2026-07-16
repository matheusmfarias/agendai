"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { CheckCircle2, LoaderCircle, MessageCircle, QrCode, RefreshCw, Unplug } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import type { WhatsAppConnectionView } from "@/features/whatsapp/whatsapp-types";

const STATUS_LABEL: Record<WhatsAppConnectionView["status"], string> = {
  DISCONNECTED: "Desconectado", CONNECTING: "Conectando", AWAITING_QR: "Aguardando leitura do QR Code",
  CONNECTED: "Conectado", DEGRADED: "Conexão instável", ERROR: "Erro de conexão",
};

export function WhatsAppSettingsPanel({ allowed }: { allowed: boolean }) {
  const [connection, setConnection] = useState<WhatsAppConnectionView | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [testPhone, setTestPhone] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const loadConnection = useCallback(async () => {
    const response = await fetch("/api/provider/whatsapp/connection", { cache: "no-store" });
    if (!response.ok) throw new Error("Não foi possível consultar a conexão.");
    const body = (await response.json()) as { connection: WhatsAppConnectionView | null };
    setConnection(body.connection);
  }, []);
  useEffect(() => {
    if (!allowed) return;
    let active = true;
    void fetch("/api/provider/whatsapp/connection", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Não foi possível consultar a conexão.");
        return (await response.json()) as { connection: WhatsAppConnectionView | null };
      })
      .then((body) => { if (active) setConnection(body.connection); })
      .catch((error: unknown) => { if (active) setFeedback(error instanceof Error ? error.message : "Falha ao consultar conexão."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [allowed]);
  useEffect(() => {
    if (connection?.status !== "AWAITING_QR" && connection?.status !== "CONNECTING") return;
    const timer = window.setInterval(() => void loadConnection().catch(() => undefined), 5_000);
    return () => window.clearInterval(timer);
  }, [connection?.status, loadConnection]);
  async function request(path: string, init: RequestInit = {}) {
    setBusy(true); setFeedback(null);
    try {
      const response = await fetch(path, init);
      const body = (await response.json().catch(() => ({}))) as { message?: string; connection?: WhatsAppConnectionView; base64?: string };
      if (!response.ok) throw new Error(body.message ?? "Não foi possível concluir a operação.");
      if (body.connection !== undefined) setConnection(body.connection ?? null);
      if (body.base64) setQrCode(body.base64);
      if (body.message) setFeedback(body.message);
      return body;
    } finally { setBusy(false); }
  }
  async function connect() {
    try {
      await request("/api/provider/whatsapp/connection", { method: "POST" });
      await request("/api/provider/whatsapp/connection/qr", { method: "POST" });
    } catch (error) { setFeedback(error instanceof Error ? error.message : "Falha ao iniciar conexão."); }
  }
  async function updatePreference(values: Record<string, boolean>) {
    try {
      await request("/api/provider/whatsapp/preferences", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(values) });
    } catch (error) { setFeedback(error instanceof Error ? error.message : "Falha ao salvar preferência."); }
  }
  if (!allowed) return <Card><CardContent className="space-y-2 p-5"><h2 className="text-lg font-semibold">WhatsApp</h2><p className="text-sm text-muted-foreground">A integração transacional não está disponível no plano atual.</p></CardContent></Card>;
  return (
    <Card className="border-border/70 bg-card/95 shadow-sm"><CardContent className="space-y-6 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-lg font-semibold">WhatsApp</h2><p className="text-sm text-muted-foreground">Conecte um número para enviar confirmações transacionais de agendamento.</p><p className="mt-1 text-xs text-muted-foreground">As mensagens seguem modelos padronizados do Agendaí para garantir informações claras e consistentes aos clientes.</p><p className="mt-1 text-xs text-muted-foreground">Beta baseado em WhatsApp Web: a conexão pode exigir uma nova leitura do QR Code.</p></div>{connection ? <Badge variant={connection.status === "CONNECTED" ? "success" : "outline"}>{STATUS_LABEL[connection.status]}</Badge> : null}</div>
      {loading ? <div className="flex items-center gap-2 text-sm text-muted-foreground"><LoaderCircle className="size-4 animate-spin" />Consultando conexão…</div> : null}
      {!loading && !connection ? <div className="rounded-xl border border-dashed border-border p-5"><MessageCircle className="size-6 text-primary" /><p className="mt-3 font-semibold">Nenhum número conectado</p><p className="mt-1 text-sm text-muted-foreground">A leitura do QR Code vincula uma instância exclusiva a este prestador.</p><Button type="button" className="mt-4" disabled={busy} onClick={connect}>{busy ? <LoaderCircle className="size-4 animate-spin" /> : <QrCode className="size-4" />}Conectar WhatsApp</Button></div> : null}
      {connection && connection.status !== "CONNECTED" ? <div className="grid gap-5 rounded-xl border border-border p-4 md:grid-cols-[minmax(0,15rem)_1fr] md:items-center"><div className="grid aspect-square place-items-center rounded-xl bg-white p-3">{qrCode ? <Image unoptimized src={qrCode} alt="QR Code para conectar o WhatsApp" width={220} height={220} className="size-full object-contain" /> : <QrCode className="size-16 text-slate-300" />}</div><div><p className="font-semibold">Leia o QR Code pelo WhatsApp</p><p className="mt-1 text-sm text-muted-foreground">No WhatsApp Business, abra Aparelhos conectados e escolha Conectar aparelho. O QR expira em cerca de 45 segundos.</p><div className="mt-4 flex flex-wrap gap-2"><Button type="button" disabled={busy} onClick={() => void request("/api/provider/whatsapp/connection/qr", { method: "POST" }).catch((error: unknown) => setFeedback(error instanceof Error ? error.message : "Falha ao renovar QR Code."))}><RefreshCw className="size-4" />Gerar novo QR</Button><Button type="button" variant="outline" disabled={busy} onClick={() => void loadConnection()}><RefreshCw className="size-4" />Atualizar status</Button></div></div></div> : null}
      {connection?.status === "CONNECTED" ? <div className="space-y-5"><div className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4"><CheckCircle2 className="size-5 text-emerald-600" /><div><p className="font-semibold">Número conectado</p><p className="text-sm text-muted-foreground">{connection.phoneNumber ?? "Número protegido"}</p><p className="text-xs text-muted-foreground">Última verificação: {connection.lastHealthyAt ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(connection.lastHealthyAt)) : "aguardando"}</p></div></div>
        <label className="flex items-start gap-3 rounded-xl border border-border p-4"><Checkbox checked={connection.enabled} onChange={(event) => void updatePreference({ enabled: event.target.checked })} /><span><span className="block font-semibold">Integração ativa</span><span className="text-sm text-muted-foreground">Permite que o worker processe mensagens transacionais.</span></span></label>
        <label className="flex items-start gap-3 rounded-xl border border-border p-4"><Checkbox checked={connection.sendAppointmentConfirmation} onChange={(event) => void updatePreference({ sendAppointmentConfirmation: event.target.checked })} /><span><span className="block font-semibold">Enviar confirmação de agendamento</span><span className="text-sm text-muted-foreground">Cria uma mensagem idempotente quando o agendamento é confirmado.</span></span></label>
        <label className="flex items-start gap-3 rounded-xl border border-border p-4"><Checkbox checked={connection.sendAppointmentRequested} onChange={(event) => void updatePreference({ sendAppointmentRequested: event.target.checked })} /><span><span className="block font-semibold">Avisar quando uma solicitação de agendamento for recebida</span><span className="text-sm text-muted-foreground">Informa ao cliente que o horário ainda aguarda confirmação do estabelecimento.</span></span></label>
        <label className="flex items-start gap-3 rounded-xl border border-border p-4"><Checkbox checked={connection.sendAppointmentCompleted} onChange={(event) => void updatePreference({ sendAppointmentCompleted: event.target.checked })} /><span><span className="block font-semibold">Avisar quando um atendimento for concluído</span><span className="text-sm text-muted-foreground">Envia uma mensagem após a conclusão manual do atendimento.</span></span></label>
        <div className="rounded-xl border border-border p-4"><p className="font-semibold">Mensagem de teste</p><p className="mt-1 text-sm text-muted-foreground">Limitado a três envios a cada dez minutos por usuário.</p><div className="mt-3 flex flex-col gap-2 sm:flex-row"><Input value={testPhone} onChange={(event) => setTestPhone(event.target.value)} placeholder="(11) 99999-9999" aria-label="Telefone para mensagem de teste" /><Button type="button" variant="outline" disabled={busy || !connection.enabled} onClick={() => void request("/api/provider/whatsapp/test-message", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ phone: testPhone }) }).catch((error: unknown) => setFeedback(error instanceof Error ? error.message : "Falha no teste."))}>Enviar teste</Button></div></div>
        <Button type="button" variant="outline" disabled={busy} onClick={() => void request("/api/provider/whatsapp/connection/disconnect", { method: "POST" }).then(() => setQrCode(null)).catch((error: unknown) => setFeedback(error instanceof Error ? error.message : "Falha ao desconectar."))}><Unplug className="size-4" />Desconectar</Button></div> : null}
      <p className="text-sm text-muted-foreground" aria-live="polite">{feedback}</p>
    </CardContent></Card>
  );
}
